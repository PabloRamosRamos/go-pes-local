/**
 * Autenticación, autorización y auditoría funcional.
 * Evita side effects en getters y concentra escrituras de actividad.
 */
function getUsuarioActual() {
  if (GO_PES_RUNTIME.currentUser) {
    return Object.assign({}, GO_PES_RUNTIME.currentUser);
  }

  ensureSheetsSubset_([GO_PES_V2.SHEETS.DIM_USUARIOS]);

  const email = getCurrentUserEmail_();
  const users = getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS);
  let user = users.find(r => normalizeText_(r.email) === normalizeText_(email));

  if (!user && email && isConfiguredSuperUserEmail_(email)) {
    user = syncCurrentUser_();
  }

  if (!user) {
    const anonymous = {
      user_id: '',
      email: email || '',
      nombre_visible: email || 'Usuario sin identificar',
      perfil: 'operador',
      activo_flag: false,
      superuser_flag: false,
      canAccess: false,
      reason: 'Usuario no registrado o sin correo disponible.'
    };
    GO_PES_RUNTIME.currentUser = anonymous;
    GO_PES_RUNTIME.currentUserEmail = email || '';
    return Object.assign({}, anonymous);
  }

  const decorated = decorateUser_(user);
  GO_PES_RUNTIME.currentUser = decorated;
  GO_PES_RUNTIME.currentUserEmail = email || decorated.email || '';
  return Object.assign({}, decorated);
}

function requireRole_(allowedRoles) {
  const user = getUsuarioActual();

  if (!user) {
    throw new Error('No se pudo identificar al usuario actual.');
  }

  if (!user.canAccess) {
    throw new Error(user.reason || 'Usuario sin acceso al sistema.');
  }

  const allowed = (allowedRoles || []).map(r => normalizeText_(r));
  const perfil = normalizeText_(user.perfil || 'operador');
  const isSuper = !!user.superuser_flag;

  if (!allowed.length) {
    touchUserLastActivity_(user.email);
    return user;
  }

  if (isSuper) {
    touchUserLastActivity_(user.email);
    return user;
  }

  if (allowed.includes(perfil)) {
    touchUserLastActivity_(user.email);
    return user;
  }

  throw new Error(`No tienes permisos para ejecutar esta acción. Perfil actual: ${user.perfil || 'sin perfil'}.`);
}

function requireModuleAccess_(moduleKey, allowedRoles) {
  const user = requireRole_(allowedRoles || ['operador', 'coordinador', 'administrador', 'superuser']);
  if (!user.superuser_flag && !userModuleAllowed_(user, moduleKey)) {
    throw new Error('No tienes permisos para acceder a este módulo.');
  }
  return user;
}

function requireAnyModuleAccess_(moduleKeys, allowedRoles) {
  const user = requireRole_(allowedRoles || ['operador', 'coordinador', 'administrador', 'superuser']);
  const keys = Array.isArray(moduleKeys) ? moduleKeys : [moduleKeys];
  const allowed = user.superuser_flag || keys.some(function(key) {
    return userModuleAllowed_(user, key);
  });
  if (!allowed) throw new Error('No tienes permisos para acceder a este módulo.');
  return user;
}

function listUsers() {
  const user = requireRole_(['superuser']);

  ensureSheetsSubset_([GO_PES_V2.SHEETS.DIM_USUARIOS]);

  const rows = (getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS) || [])
    .filter(function(row) { return !!row.email; })
    .map(decorateUser_)
    .sort((a, b) => String(a.nombre_visible).localeCompare(String(b.nombre_visible)));

  logUserAction_('LIST_USERS', 'usuario', user.email, 'OK', { total: rows.length });
  return rows;
}

function updateUser(payload) {
  const actor = requireRole_(['superuser']);

  if (!payload || !payload.email) {
    throw new Error('Falta email del usuario a actualizar.');
  }

  const normalizedEmail = normalizeText_(payload.email);
  const existing = getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS)
    .find(r => normalizeText_(r.email) === normalizedEmail);
  const isConfiguredSuper = isConfiguredSuperUserEmail_(payload.email);
  const activeNext = isConfiguredSuper ? true : toBool_(payload.activo_flag);
  const superNext = isConfiguredSuper;

  if (existing && toBool_(existing.superuser_flag) && !superNext) {
    ensureAtLeastOneOtherActiveSuperUser_(normalizedEmail);
  }
  if (existing && toBool_(existing.superuser_flag) && !activeNext) {
    ensureAtLeastOneOtherActiveSuperUser_(normalizedEmail);
  }

  const row = {
    user_id: existing && existing.user_id ? existing.user_id : nextId_('usuario', 'USR'),
    email: payload.email,
    nombre_visible: payload.nombre_visible || payload.email,
    perfil: payload.perfil || (existing && existing.perfil) || 'operador',
    activo_flag: activeNext,
    superuser_flag: superNext,
    modulos_permitidos: superNext ? '*' : normalizeModulePermissionsInput_(payload.modulos_permitidos),
    fecha_alta: existing && existing.fecha_alta ? existing.fecha_alta : new Date(),
    fecha_ultima_actividad: existing && existing.fecha_ultima_actividad ? existing.fecha_ultima_actividad : '',
    updated_at: new Date(),
    updated_by: actor.email
  };

  if (isConfiguredSuper) {
    row.superuser_flag = true;
    row.perfil = 'superuser';
    row.activo_flag = true;
    row.modulos_permitidos = '*';
  }

  upsertByKey_(GO_PES_V2.SHEETS.DIM_USUARIOS, 'email', row, true);
  logUserAction_('UPDATE_USER', 'usuario', payload.email, 'OK', { actor: actor.email, payload: row });

  return { ok: true, user: decorateUser_(row) };
}

function deactivateUser(payload) {
  const actor = requireRole_(['superuser']);
  payload = payload || {};

  if (!payload.email) {
    throw new Error('Falta email del usuario a desactivar.');
  }
  if (!payload.pin) {
    throw new Error('Debes ingresar la clave de SUPERUSER.');
  }
  if (typeof goPesValidateAdminResetPin_ !== 'function') {
    throw new Error('No esta disponible la validacion de clave de SUPERUSER.');
  }

  goPesValidateAdminResetPin_(payload.pin);

  const normalizedEmail = normalizeText_(payload.email);
  const existing = getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS)
    .find(function(r) { return normalizeText_(r.email) === normalizedEmail; });

  if (!existing) {
    throw new Error('Usuario no encontrado.');
  }

  if (isConfiguredSuperUserEmail_(existing.email)) {
    throw new Error('No se puede desactivar un SUPERUSER configurado.');
  }

  if (toBool_(existing.superuser_flag)) {
    ensureAtLeastOneOtherActiveSuperUser_(normalizedEmail);
  }

  const row = Object.assign({}, existing, {
    activo_flag: false,
    superuser_flag: false,
    modulos_permitidos: normalizeModulePermissionsInput_(existing.modulos_permitidos),
    updated_at: new Date(),
    updated_by: actor.email
  });

  upsertByKey_(GO_PES_V2.SHEETS.DIM_USUARIOS, 'email', row, true);
  logUserAction_('DEACTIVATE_USER', 'usuario', existing.email, 'OK', { actor: actor.email });

  return { ok: true, user: decorateUser_(row) };
}

function seedSuperUsers_() {
  ensureSheetsSubset_([GO_PES_V2.SHEETS.DIM_USUARIOS]);

  getConfiguredSuperUsers_().forEach(email => {
    upsertByKey_(GO_PES_V2.SHEETS.DIM_USUARIOS, 'email', {
      user_id: nextIdIfMissing_('usuario', 'USR', GO_PES_V2.SHEETS.DIM_USUARIOS, 'user_id', 'email', email),
      email: email,
      nombre_visible: email,
      perfil: 'superuser',
      activo_flag: true,
      superuser_flag: true,
      modulos_permitidos: '*',
      fecha_alta: new Date(),
      fecha_ultima_actividad: '',
      updated_at: new Date(),
      updated_by: 'system'
    }, true);
  });
}

function syncCurrentUser_() {
  const email = getCurrentUserEmail_();
  if (!email) return null;

  const isSuper = isConfiguredSuperUserEmail_(email);
  if (!isSuper) return null;

  const row = {
    user_id: nextIdIfMissing_('usuario', 'USR', GO_PES_V2.SHEETS.DIM_USUARIOS, 'user_id', 'email', email),
    email: email,
    nombre_visible: email,
    perfil: 'superuser',
    activo_flag: true,
    superuser_flag: isSuper,
    modulos_permitidos: '*',
    fecha_alta: new Date(),
    fecha_ultima_actividad: new Date(),
    updated_at: new Date(),
    updated_by: 'system'
  };

  upsertByKey_(GO_PES_V2.SHEETS.DIM_USUARIOS, 'email', row, true);
  return row;
}

function updateUserLastActivity_(email) {
  touchUserLastActivity_(email, true);
}

function touchUserLastActivity_(email, forceWrite) {
  if (!email) return;

  const normalizedEmail = normalizeText_(email);
  if (!forceWrite && GO_PES_RUNTIME.activityTouchedByEmail[normalizedEmail]) return;

  const existing = findByField_(GO_PES_V2.SHEETS.DIM_USUARIOS, 'email', email, true);
  if (!existing) return;

  const lastActivity = asDateOrBlank_(existing.fecha_ultima_actividad);
  const now = new Date();
  if (!forceWrite && lastActivity && (now.getTime() - lastActivity.getTime()) < (15 * 60 * 1000)) {
    GO_PES_RUNTIME.activityTouchedByEmail[normalizedEmail] = true;
    return;
  }

  existing.fecha_ultima_actividad = now;
  upsertByKey_(GO_PES_V2.SHEETS.DIM_USUARIOS, 'email', existing, true);
  GO_PES_RUNTIME.activityTouchedByEmail[normalizedEmail] = true;

  if (GO_PES_RUNTIME.currentUser && normalizeText_(GO_PES_RUNTIME.currentUser.email) === normalizedEmail) {
    GO_PES_RUNTIME.currentUser.fecha_ultima_actividad = now;
  }
}

function decorateUser_(row) {
  row = row || {};
  const active = toBool_(row.activo_flag);
  const superFlag = toBool_(row.superuser_flag) || isConfiguredSuperUserEmail_(row.email);
  const profile = superFlag ? 'superuser' : (row.perfil || 'operador');
  const modules = superFlag
    ? safeModuleDefinitions_().map(function(m) { return m.key; })
    : parseUserModules_(row.modulos_permitidos, profile);

  return {
    user_id: row.user_id || '',
    email: row.email || '',
    nombre_visible: row.nombre_visible || row.email || '',
    perfil: profile,
    activo_flag: active,
    superuser_flag: superFlag,
    modulos_permitidos: superFlag ? '*' : modules.join(','),
    modules: modules,
    fecha_alta: row.fecha_alta || '',
    fecha_ultima_actividad: row.fecha_ultima_actividad || '',
    updated_at: row.updated_at || '',
    updated_by: row.updated_by || '',
    canAccess: active,
    roleLabel: profile
  };
}

function buildPermissionMap_(user) {
  const role = (user && user.perfil) || 'operador';
  const isSuper = !!(user && user.superuser_flag);
  const canAccess = !!(user && user.canAccess);
  const can = function(moduleKey) {
    return canAccess && (isSuper || userModuleAllowed_(user, moduleKey));
  };

  return {
    canOpenSearch: can('buscar'),
    canCreateIngreso: can('nuevo-ingreso'),
    canCreateSeguimiento: can('seguimiento'),
    canEditOrganizacion: can('organizacion'),
    canEditInstrumento: can('instrumento'),
    canEditRequisito: can('requisito'),
    canImportSocios: can('socios'),
    canViewHistorial: can('historial'),
    canManageUsers: isSuper,
    canResetData: isSuper,
    canAdmin: isSuper || role === 'administrador',
    modules: buildUserModulePermissionMap_(user)
  };
}

function getModuleDefinitions_() {
  return [
    { key: 'inicio', label: 'Inicio', view: 'inicio' },
    { key: 'nuevo-ingreso', label: 'Nuevo ingreso', view: 'nuevo-ingreso' },
    { key: 'buscar', label: 'Buscar vecino', view: 'buscar' },
    { key: 'ficha', label: 'Ficha', view: 'ficha' },
    { key: 'seguimiento', label: 'Registrar avance', view: 'seguimiento' },
    { key: 'organizacion', label: 'Organizaciones', view: 'organizacion' },
    { key: 'socios', label: 'Socios', view: 'socios' },
    { key: 'instrumento', label: 'Gestionar instrumentos', view: 'instrumento' },
    { key: 'requisito', label: 'Registrar requisitos', view: 'requisito' },
    { key: 'historial', label: 'Historial', view: 'historial' },
    { key: 'usuarios', label: 'Gestión de usuarios', view: 'usuarios', superOnly: true }
  ];
}

function defaultModulesForRole_(role) {
  return ['inicio'];
}

function parseUserModules_(value, role) {
  const raw = String(value || '').trim();
  if (!raw) return defaultModulesForRole_(role);
  if (raw === '*') return safeModuleDefinitions_().map(function(m) { return m.key; });
  const allowedKeys = safeModuleDefinitions_().map(function(m) { return m.key; });
  return uniqueNonBlank_(raw.split(',').map(function(x) { return String(x || '').trim(); }))
    .filter(function(key) { return allowedKeys.indexOf(key) !== -1; });
}

function normalizeModulePermissionsInput_(value) {
  const modules = Array.isArray(value) ? value : String(value || '').split(',');
  const allowedKeys = safeModuleDefinitions_()
    .filter(function(m) { return !m.superOnly; })
    .map(function(m) { return m.key; });
  const normalized = uniqueNonBlank_(modules.map(function(x) { return String(x || '').trim(); }))
    .filter(function(key) { return allowedKeys.indexOf(key) !== -1; });
  if (normalized.indexOf('inicio') === -1) normalized.unshift('inicio');
  if (normalized.indexOf('ficha') === -1) normalized.push('ficha');
  return normalized.join(',');
}

function userModuleAllowed_(user, moduleKey) {
  if (!user || !user.canAccess) return false;
  if (user.superuser_flag) return true;
  const key = String(moduleKey || '').trim();
  if (!key) return false;
  const moduleDef = safeModuleDefinitions_().find(function(m) { return m.key === key; });
  if (moduleDef && moduleDef.superOnly) return false;
  const modules = Array.isArray(user.modules)
    ? user.modules
    : parseUserModules_(user.modulos_permitidos, user.perfil);
  return modules.indexOf(key) !== -1;
}

function buildUserModulePermissionMap_(user) {
  const map = {};
  safeModuleDefinitions_().forEach(function(module) {
    map[module.key] = userModuleAllowed_(user, module.key);
  });
  return map;
}

function isConfiguredSuperUserEmail_(email) {
  return getConfiguredSuperUsers_().map(normalizeText_).indexOf(normalizeText_(email)) !== -1;
}

function getConfiguredSuperUsers_() {
  return Array.isArray(GO_PES_V2.SUPERUSERS) ? GO_PES_V2.SUPERUSERS : [];
}

function safeModuleDefinitions_() {
  const defs = getModuleDefinitions_();
  return Array.isArray(defs) ? defs : [];
}

function ensureAtLeastOneOtherActiveSuperUser_(normalizedEmail) {
  const rows = getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS);
  const others = rows.filter(function(row) {
    return normalizeText_(row.email) !== normalizedEmail &&
      (toBool_(row.superuser_flag) || isConfiguredSuperUserEmail_(row.email)) &&
      toBool_(row.activo_flag);
  });
  if (!others.length) {
    throw new Error('No se puede dejar el sistema sin otro SUPERUSER activo.');
  }
}

function logAccess_(event, payload) {
  const email = getCurrentUserEmail_();

  appendRowObject_(GO_PES_V2.SHEETS.LOG_ACCESOS, {
    timestamp: new Date(),
    event: event,
    email: email || '',
    payload_json: payload ? JSON.stringify(payload) : ''
  });
}

function logUserAction_(action, entityType, entityId, result, detail) {
  const email = getCurrentUserEmail_();

  appendRowObject_(GO_PES_V2.SHEETS.LOG_ACCIONES, {
    timestamp: new Date(),
    email: email || '',
    action: action,
    entity_type: entityType,
    entity_id: entityId || '',
    result: result || 'OK',
    detail_json: detail ? JSON.stringify(detail) : ''
  });
}

function getCurrentUserEmail_() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (email) return email;
  } catch (err) {}

  try {
    const devEmail = PropertiesService.getScriptProperties().getProperty('GO_PES_DEV_EMAIL');
    if (devEmail) return devEmail;
  } catch (err) {}

  try {
    const effective = Session.getEffectiveUser().getEmail();
    if (effective && getConfiguredSuperUsers_().map(normalizeText_).includes(normalizeText_(effective))) {
      return effective;
    }
  } catch (err) {}

  return '';
}
