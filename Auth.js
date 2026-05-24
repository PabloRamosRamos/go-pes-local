/**
 * Autenticación, autorización y auditoría funcional.
 * Evita side effects en getters y concentra escrituras de actividad.
 */
function getUsuarioActual() {
  if (GO_PES_RUNTIME.currentUser) {
    return Object.assign({}, GO_PES_RUNTIME.currentUser);
  }

  const email = getCurrentUserEmail_();
  const normalizedEmail = normalizeEmail_(email);
  const usersResult = readDimUsuariosUsers_();
  const users = usersResult.users;
  let user = users.find(function(row) {
    return normalizeEmail_(row.email) === normalizedEmail;
  });

  if (!user && normalizedEmail && isConfiguredSuperUserEmail_(normalizedEmail)) {
    user = syncCurrentUser_();
  }

  if (!user || !isAllowedNativeIdentityEmail_(normalizedEmail)) {
    const reason = !normalizedEmail
      ? 'Correo no disponible en el entorno Apps Script.'
      : (!isAllowedNativeIdentityEmail_(normalizedEmail)
        ? 'Dominio no autorizado.'
        : 'Usuario no registrado en DIM_Usuarios.');
    const denied = buildDeniedUser_(normalizedEmail, reason);
    logAccess_('ACCESS_DENIED', {
      resolved_email: normalizedEmail,
      reason: reason,
      dim_usuarios_headers: usersResult.headers || [],
      dim_usuarios_total_rows: usersResult.totalRows || 0
    });
    GO_PES_RUNTIME.currentUser = denied;
    GO_PES_RUNTIME.currentUserEmail = normalizedEmail;
    return Object.assign({}, denied);
  }

  const decorated = decorateUser_(user);
  decorated.detected_email = normalizedEmail;
  if (!decorated.canAccess) {
    decorated.reason = 'Usuario registrado pero inactivo en DIM_Usuarios.';
    logAccess_('ACCESS_DENIED', {
      resolved_email: normalizedEmail,
      reason: decorated.reason,
      dim_usuarios_headers: usersResult.headers || [],
      dim_usuarios_total_rows: usersResult.totalRows || 0
    });
  }

  GO_PES_RUNTIME.currentUser = decorated;
  GO_PES_RUNTIME.currentUserEmail = normalizedEmail;
  return Object.assign({}, decorated);
}

function buildDeniedUser_(email, reason) {
  return {
    user_id: '',
    email: email || '',
    detected_email: email || '',
    nombre_visible: email || 'Usuario sin identificar',
    perfil: 'operador',
    activo_flag: false,
    superuser_flag: false,
    canAccess: false,
    reason: reason || 'Acceso denegado.'
  };
}

function normalizeRoleForAccess_(value) {
  const normalized = normalizeText_(value || 'operador');
  if (normalized === 'superuser') return 'superuser';
  if (normalized === 'visor') return 'visor';
  if (normalized === 'coordinador' || normalized === 'administrador') return 'coordinador';
  return 'operador';
}

function requireRole_(allowedRoles) {
  const user = getUsuarioActual();

  if (!user) {
    throw new Error('No se pudo identificar al usuario actual.');
  }

  if (!user.canAccess) {
    throw new Error(user.reason || 'Usuario sin acceso al sistema.');
  }

  const allowed = (allowedRoles || []).map(normalizeRoleForAccess_);
  const perfil = normalizeRoleForAccess_(user.perfil || 'operador');
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
  const key = normalizeModuleKey_(moduleKey);
  const user = requireRole_(allowedRoles || ['operador', 'coordinador', 'superuser']);
  if (!key || !userModuleAllowed_(user, key)) {
    throw new Error('No tienes permisos para acceder a este módulo.');
  }
  return user;
}

function requireAnyModuleAccess_(moduleKeys, allowedRoles) {
  const user = requireRole_(allowedRoles || ['operador', 'coordinador', 'superuser']);
  const keys = uniqueNonBlank_((Array.isArray(moduleKeys) ? moduleKeys : [moduleKeys]).map(normalizeModuleKey_));
  const allowed = keys.some(function(key) {
    return userModuleAllowed_(user, key);
  });
  if (!allowed) throw new Error('No tienes permisos para acceder a este módulo.');
  return user;
}

function listUsers() {
  const user = requireRole_(['superuser']);

  const result = readDimUsuariosUsers_();
  const rows = result.users
    .map(decorateUser_)
    .map(serializeUserForClient_)
    .sort((a, b) => String(a.nombre_visible).localeCompare(String(b.nombre_visible)));

  logUserAction_('LIST_USERS', 'usuario', user.email, 'OK', {
    total: rows.length,
    totalRows: result.totalRows,
    headers: result.headers
  });
  return {
    users: rows,
    headers: result.headers,
    totalRows: result.totalRows
  };
}

function updateUser(payload) {
  const actor = requireRole_(['superuser']);

  if (!payload || !payload.email) {
    throw new Error('Falta email del usuario a actualizar.');
  }

  const normalizedEmail = normalizeEmail_(payload.email);
  const existing = readDimUsuariosUsers_().users
    .find(r => normalizeEmail_(r.email) === normalizedEmail);
  const isConfiguredSuper = isConfiguredSuperUserEmail_(payload.email);
  if (!existing && !isConfiguredSuper && !isAllowedNativeIdentityEmail_(normalizedEmail)) {
    throw new Error(`Solo se permiten usuarios con correo @${getConfiguredAllowedDomains_()[0] || 'providencia.cl'}.`);
  }
  const activeNext = isConfiguredSuper ? true : toBool_(payload.activo_flag);
  const superNext = isConfiguredSuper;

  if (existing && toBool_(existing.superuser_flag) && !superNext) {
    ensureAtLeastOneOtherActiveSuperUser_(normalizedEmail);
  }
  if (existing && toBool_(existing.superuser_flag) && !activeNext) {
    ensureAtLeastOneOtherActiveSuperUser_(normalizedEmail);
  }

  const normalizedProfile = normalizeManagedUserProfile_(payload.perfil || (existing && existing.perfil) || 'operador');

  const row = {
    user_id: existing && existing.user_id ? existing.user_id : nextId_('usuario', 'USR'),
    email: payload.email,
    nombre_visible: payload.nombre_visible || payload.email,
    perfil: normalizedProfile,
    activo_flag: activeNext,
    superuser_flag: superNext,
    modulos_permitidos: superNext ? '*' : normalizeModulePermissionsInput_(payload.modulos_permitidos, normalizedProfile),
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

  upsertDimUsuarioByEmail_(row);
  logUserAction_('UPDATE_USER', 'usuario', payload.email, 'OK', { actor: actor.email, payload: row });

  return { ok: true, user: serializeUserForClient_(decorateUser_(row)) };
}

function readDimUsuariosUsers_() {
  const sheetName = GO_PES_V2.SHEETS.DIM_USUARIOS;
  let sh = getSheet_(sheetName);
  if (!sh) {
    sh = ensureSheetWithHeaders_(sheetName, buildSheetDefinitions_()[sheetName]);
  }
  if (!sh || sh.getLastRow() < 2 || !sh.getLastColumn()) {
    return { users: [], headers: [], totalRows: 0 };
  }

  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h || '').trim();
  });
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues();
  const users = values
    .filter(function(row) {
      return row.join('').trim() !== '';
    })
    .map(function(row) {
      return normalizeDimUsuarioRow_(headers, row);
    })
    .filter(function(row) {
      return !!row.email;
    });

  return {
    users: users,
    headers: headers,
    totalRows: values.length
  };
}

function serializeUserForClient_(user) {
  user = user || {};
  return {
    user_id: user.user_id || '',
    email: user.email || '',
    detected_email: user.detected_email || user.email || '',
    nombre_visible: user.nombre_visible || '',
    perfil: user.perfil || '',
    activo_flag: !!user.activo_flag,
    superuser_flag: !!user.superuser_flag,
    modulos_permitidos: user.modulos_permitidos || '',
    modules: Array.isArray(user.modules) ? user.modules.slice() : [],
    fecha_alta: serializeDateForClient_(user.fecha_alta),
    fecha_ultima_actividad: serializeDateForClient_(user.fecha_ultima_actividad),
    updated_at: serializeDateForClient_(user.updated_at),
    updated_by: user.updated_by || '',
    canAccess: !!user.canAccess,
    roleLabel: user.roleLabel || getUserRoleLabel_(user.perfil) || user.perfil || ''
  };
}

function serializeDateForClient_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  }
  return String(value);
}

function normalizeDimUsuarioRow_(headers, row) {
  const byHeader = {};
  (headers || []).forEach(function(header, index) {
    byHeader[normalizeHeaderKey_(header)] = row[index];
  });

  const get = function(aliases, fallbackIndex) {
    for (let i = 0; i < aliases.length; i++) {
      const key = normalizeHeaderKey_(aliases[i]);
      if (byHeader[key] !== undefined && byHeader[key] !== '') return byHeader[key];
    }
    return fallbackIndex >= 0 && row[fallbackIndex] !== undefined ? row[fallbackIndex] : '';
  };

  const col0 = String(row[0] || '');
  const col1 = String(row[1] || '');
  const firstEmailIndex = row.findIndex(function(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  });
  const canonicalEmail = get(['email', 'e_mail', 'correo', 'correo_electronico', 'correo electronico', 'mail', 'usuario', 'user_email'], firstEmailIndex);
  const userIdFallback = firstEmailIndex === 0 ? '' : col0;
  const nameFallbackIndex = firstEmailIndex === 0 ? 1 : 2;

  return {
    user_id: get(['user_id', 'id_usuario', 'usuario_id'], -1) || userIdFallback,
    email: normalizeEmail_(canonicalEmail),
    nombre_visible: get(['nombre_visible', 'nombre visible', 'nombre', 'name', 'display_name'], nameFallbackIndex),
    perfil: get(['perfil', 'rol', 'role'], 3) || 'operador',
    activo_flag: normalizeUserBoolLike_(get(['activo_flag', 'activo', 'estado', 'active'], 4), true),
    superuser_flag: normalizeUserBoolLike_(get(['superuser_flag', 'superuser', 'is_superuser'], 5), false),
    fecha_alta: get(['fecha_alta', 'created_at', 'fecha_creacion'], 6),
    fecha_ultima_actividad: get(['fecha_ultima_actividad', 'ultima_actividad', 'last_activity'], 7),
    modulos_permitidos: normalizeUserModuleKeys_(get(['modulos_permitidos', 'modulos visibles', 'modulos', 'modules', 'permisos'], 8)),
    updated_at: get(['updated_at', 'fecha_actualizacion'], 9),
    updated_by: get(['updated_by', 'actualizado_por'], 10)
  };
}

function normalizeHeaderKey_(value) {
  return normalizeText_(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeManagedUserProfile_(value) {
  const normalized = normalizeText_(value || 'operador');
  if (normalized === 'visor') return 'visor';
  if (normalized === 'coordinador' || normalized === 'administrador' || normalized === 'superuser') return 'coordinador';
  return 'operador';
}

function getUserRoleLabel_(value) {
  const normalized = normalizeManagedUserProfile_(value);
  if (normalized === 'visor') return 'Visor';
  if (normalized === 'coordinador') return 'Coordinador';
  return 'Operador';
}

function normalizeUserBoolLike_(value, defaultValue) {
  if (value === true || value === false) return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;

  const normalized = normalizeText_(value);
  if (!normalized) return defaultValue;
  if (['si', 'sí', 'true', '1', 'activo', 'activa', 'active'].indexOf(normalized) !== -1) return true;
  if (['no', 'false', '0', 'inactivo', 'inactiva', 'inactive'].indexOf(normalized) !== -1) return false;
  return value;
}

function normalizeUserModuleKeys_(value) {
  if (Array.isArray(value)) value = value.join(',');
  const allowedKeys = safeModuleDefinitions_().map(function(m) { return m.key; });
  const normalized = uniqueNonBlank_(String(value || '').split(',').map(function(item) {
    const mapped = normalizeModuleKey_(item);
    return allowedKeys.indexOf(mapped) !== -1 ? mapped : '';
  }));
  return normalized.join(',');
}

function upsertDimUsuarioByEmail_(row) {
  const sheetName = GO_PES_V2.SHEETS.DIM_USUARIOS;
  const headers = buildSheetDefinitions_()[sheetName];
  const sh = ensureSheetWithHeaders_(sheetName, headers);
  const normalizedEmail = normalizeEmail_(row.email);
  let rowIndex = -1;

  if (sh.getLastRow() >= 2) {
    const values = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    for (let i = 0; i < values.length; i++) {
      const hasEmail = values[i].some(function(value) {
        return normalizeEmail_(value) === normalizedEmail;
      });
      if (hasEmail) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  const valuesToWrite = headers.map(function(header) {
    return row[header] !== undefined ? row[header] : '';
  });

  if (rowIndex === -1) {
    sh.appendRow(valuesToWrite);
  } else {
    sh.getRange(rowIndex, 1, 1, headers.length).setValues([valuesToWrite]);
  }
  invalidateSheetRuntimeCache_(sheetName);
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

  const normalizedEmail = normalizeEmail_(payload.email);
  const existing = readDimUsuariosUsers_().users
    .find(function(r) { return normalizeEmail_(r.email) === normalizedEmail; });

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

  upsertDimUsuarioByEmail_(row);
  const persisted = readDimUsuariosUsers_().users
    .find(function(r) { return normalizeEmail_(r.email) === normalizedEmail; });

  if (!persisted || toBool_(persisted.activo_flag)) {
    throw new Error('No se pudo confirmar la desactivacion del usuario en DIM_Usuarios.');
  }

  logUserAction_('DEACTIVATE_USER', 'usuario', existing.email, 'OK', { actor: actor.email });

  return { ok: true, user: serializeUserForClient_(decorateUser_(persisted)) };
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

  const normalizedEmail = normalizeEmail_(email);
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

  if (GO_PES_RUNTIME.currentUser && normalizeEmail_(GO_PES_RUNTIME.currentUser.email) === normalizedEmail) {
    GO_PES_RUNTIME.currentUser.fecha_ultima_actividad = now;
  }
}

function decorateUser_(row) {
  row = row || {};
  const active = toBool_(row.activo_flag);
  const superFlag = active && isConfiguredSuperUserEmail_(row.email);
  const profile = superFlag ? 'superuser' : normalizeManagedUserProfile_(row.perfil || 'operador');
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
    roleLabel: superFlag ? 'superuser' : getUserRoleLabel_(profile)
  };
}

function buildPermissionMap_(user) {
  const role = (user && user.perfil) || 'operador';
  const isSuper = !!(user && user.superuser_flag && isConfiguredSuperUserEmail_(user.email));
  const canAccess = !!(user && user.canAccess);
  const can = function(moduleKey) {
    return canAccess && userModuleAllowed_(user, moduleKey);
  };

  return {
    canOpenSearch: can('buscar'),
    canCreateIngreso: can('nuevo-ingreso'),
    canCreateSeguimiento: can('seguimiento'),
    canEditOrganizacion: can('organizacion'),
    canEditInstrumento: can('instrumento'),
    canImportSocios: can('socios'),
    canViewHistorial: can('historial'),
    canManageUsers: can('usuarios'),
    canManageConfig: can('configuracion'),
    canResetData: canAccess && isSuper && canShowResetDataButton_(),
    canAdmin: isSuper || role === 'coordinador',
    modules: buildUserModulePermissionMap_(user)
  };
}

function isAllowedNativeIdentityEmail_(email) {
  const normalized = normalizeEmail_(email);
  if (isConfiguredSuperUserEmail_(normalized)) return true;
  return getConfiguredAllowedDomains_().some(function(domain) {
    return normalized.endsWith('@' + String(domain || '').trim().toLowerCase());
  });
}

function getModuleDefinitionsLegacyUnused_() {
  return [
    { key: 'inicio', label: 'Inicio', view: 'inicio', required: true },
    { key: 'nuevo-ingreso', label: 'Nuevo ingreso', view: 'nuevo-ingreso' },
    { key: 'buscar', label: 'Buscar vecino', view: 'buscar' },
    { key: 'ficha', label: 'Ficha', view: 'ficha', assignable: false },
    { key: 'seguimiento', label: 'Registrar avance', view: 'seguimiento' },
    { key: 'organizacion', label: 'Organizaciones', view: 'organizacion' },
    { key: 'socios', label: 'Socios', view: 'socios' },
    { key: 'instrumento', label: 'Beneficios', view: 'instrumento' },
    { key: 'historial', label: 'Historial', view: 'historial' },
    { key: 'usuarios', label: 'Gestión de usuarios', view: 'usuarios', superOnly: true, assignable: false }
  ];
}

function defaultModulesForRole_(role) {
  if (normalizeManagedUserProfile_(role) === 'visor') return ['inicio'];
  return ['inicio'];
}

function parseUserModulesLegacyUnused_(value, role) {
  if (normalizeManagedUserProfile_(role) === 'visor') return ['inicio'];
  const raw = String(value || '').trim();
  if (!raw) return defaultModulesForRole_(role);
  if (raw === '*') return safeModuleDefinitions_().map(function(m) { return m.key; });
  const allowedKeys = safeModuleDefinitions_().map(function(m) { return m.key; });
  return uniqueNonBlank_(raw.split(',').map(function(x) { return String(x || '').trim(); }))
    .filter(function(key) { return allowedKeys.indexOf(key) !== -1; });
}

function normalizeModulePermissionsInputLegacyUnused_(value, role) {
  const normalizedRole = normalizeManagedUserProfile_(role);
  if (normalizedRole === 'visor') return 'inicio';
  const modules = Array.isArray(value) ? value : String(value || '').split(',');
  const defs = safeModuleDefinitions_();
  const allowedKeys = defs
    .filter(function(m) { return !m.superOnly && m.assignable !== false; })
    .map(function(m) { return m.key; });
  const requiredKeys = defs
    .filter(function(m) { return m.required; })
    .map(function(m) { return m.key; });
  const normalized = uniqueNonBlank_(modules.map(function(x) { return String(x || '').trim(); }))
    .filter(function(key) { return allowedKeys.indexOf(key) !== -1; });
  requiredKeys.slice().reverse().forEach(function(key) {
    if (normalized.indexOf(key) === -1) normalized.unshift(key);
  });
  if (normalizedRole !== 'visor' && normalized.indexOf('ficha') === -1) normalized.push('ficha');
  return normalized.join(',');
}

function userModuleAllowedLegacyUnused_(user, moduleKey) {
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
  return getConfiguredSuperUsers_().map(normalizeEmail_).indexOf(normalizeEmail_(email)) !== -1;
}

function getConfiguredSuperUsersLegacyUnused_() {
  return Array.isArray(GO_PES_V2.SUPERUSERS) ? GO_PES_V2.SUPERUSERS : [];
}

function getModuleDefinitionsLegacyConfigUnused_() {
  const baseDefs = getBaseModuleDefinitions_();
  const config = getRuntimeSystemConfig_();
  const moduleConfigMap = ((config.accessModules && config.accessModules.modules) || []).reduce(function(acc, row) {
    acc[row.key] = row;
    return acc;
  }, {});
  const alwaysVisible = getConfiguredAlwaysVisibleModules_();

  return baseDefs.map(function(base) {
    const configured = moduleConfigMap[base.key] || {};
    return Object.assign({}, base, {
      label: configured.label || base.label,
      order: Number(configured.order || base.order || 0),
      state: configured.state || base.state || 'active',
      required: !!base.required || alwaysVisible.indexOf(base.key) !== -1
    });
  }).sort(function(a, b) {
    return Number(a.order || 0) - Number(b.order || 0);
  });
}

function parseUserModules_(value, role) {
  if (normalizeManagedUserProfile_(role) === 'visor') return ['inicio'];
  const defs = safeModuleDefinitions_().filter(function(module) {
    return !module.superOnly && module.enabled !== false;
  });
  const allowedKeys = defs.map(function(module) { return module.key; });
  const raw = String(value || '').trim();
  const normalized = raw === '*'
    ? allowedKeys.slice()
    : uniqueNonBlank_(String(value || '').split(',').map(normalizeModuleKey_))
      .filter(function(key) { return allowedKeys.indexOf(key) !== -1; });
  const resolved = normalized.length ? normalized : defaultModulesForRole_(role);
  const requiredKeys = defs
    .filter(function(module) { return module.required; })
    .map(function(module) { return module.key; });
  requiredKeys.slice().reverse().forEach(function(key) {
    if (resolved.indexOf(key) === -1) resolved.unshift(key);
  });
  if (normalizedRoleAllowsFicha_(role, resolved) && resolved.indexOf('ficha') === -1) {
    resolved.push('ficha');
  }
  return resolved;
}

function normalizeModulePermissionsInput_(value, role) {
  const normalizedRole = normalizeManagedUserProfile_(role);
  if (normalizedRole === 'visor') return 'inicio';
  const modules = Array.isArray(value) ? value : String(value || '').split(',');
  const defs = safeModuleDefinitions_();
  const allowedKeys = defs
    .filter(function(m) { return !m.superOnly && m.assignable !== false && m.enabled !== false; })
    .map(function(m) { return m.key; });
  const requiredKeys = defs
    .filter(function(m) { return m.required; })
    .map(function(m) { return m.key; });
  const normalized = uniqueNonBlank_(modules.map(normalizeModuleKey_))
    .filter(function(key) { return allowedKeys.indexOf(key) !== -1; });
  requiredKeys.slice().reverse().forEach(function(key) {
    if (normalized.indexOf(key) === -1) normalized.unshift(key);
  });
  if (normalizedRoleAllowsFicha_(normalizedRole, normalized) && normalized.indexOf('ficha') === -1) normalized.push('ficha');
  return normalized.join(',');
}

function userModuleAllowed_(user, moduleKey) {
  if (!user || !user.canAccess) return false;
  const key = normalizeModuleKey_(moduleKey);
  if (!key) return false;
  const moduleDef = safeModuleDefinitions_().find(function(m) { return m.key === key; });
  if (!moduleDef || moduleDef.enabled === false) return false;
  if (user.superuser_flag) return true;
  if (moduleDef.superOnly) return false;
  const modules = Array.isArray(user.modules)
    ? user.modules
    : parseUserModules_(user.modulos_permitidos, user.perfil);
  return modules.indexOf(key) !== -1;
}

function getConfiguredSuperUsers_() {
  const canonical = normalizeEmail_(
    getConfiguredPrimarySuperuserEmail_ ? getConfiguredPrimarySuperuserEmail_() : ''
  );
  return canonical ? [canonical] : [];
}

function normalizedRoleAllowsFicha_(role, modules) {
  if (normalizeManagedUserProfile_(role) === 'visor') return false;
  return (modules || []).some(function(key) {
    return ['nuevo-ingreso', 'buscar', 'seguimiento', 'organizacion', 'instrumento', 'socios'].indexOf(key) !== -1;
  });
}

function safeModuleDefinitions_() {
  const defs = getModuleDefinitions_();
  return Array.isArray(defs) ? defs : [];
}

function normalizeEmail_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function ensureAtLeastOneOtherActiveSuperUser_(normalizedEmail) {
  const rows = readDimUsuariosUsers_().users;
  const others = rows.filter(function(row) {
    return normalizeEmail_(row.email) !== normalizedEmail &&
      (toBool_(row.superuser_flag) || isConfiguredSuperUserEmail_(row.email)) &&
      toBool_(row.activo_flag);
  });
  if (!others.length) {
    throw new Error('No se puede dejar el sistema sin otro SUPERUSER activo.');
  }
}

function logAccess_(event, payload) {
  const email = GO_PES_RUNTIME.currentUserEmail || getCurrentUserEmail_();

  appendRowObject_(GO_PES_V2.SHEETS.LOG_ACCESOS, {
    timestamp: new Date(),
    event: event,
    email: email || '',
    payload_json: payload ? JSON.stringify(payload) : ''
  });
}

function logUserAction_(action, entityType, entityId, result, detail) {
  const email = GO_PES_RUNTIME.currentUserEmail || getCurrentUserEmail_();

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
    if (email) return String(email || '').trim();
  } catch (err) {}

  return '';
}
