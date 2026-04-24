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

  if (!user && email) {
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

function listUsers() {
  const user = requireRole_(['administrador', 'superuser']);

  const rows = getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS)
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

  const row = {
    user_id: existing && existing.user_id ? existing.user_id : nextId_('usuario', 'USR'),
    email: payload.email,
    nombre_visible: payload.nombre_visible || payload.email,
    perfil: payload.perfil || (existing && existing.perfil) || 'operador',
    activo_flag: toBool_(payload.activo_flag),
    superuser_flag: toBool_(payload.superuser_flag),
    fecha_alta: existing && existing.fecha_alta ? existing.fecha_alta : new Date(),
    fecha_ultima_actividad: existing && existing.fecha_ultima_actividad ? existing.fecha_ultima_actividad : ''
  };

  if (GO_PES_V2.SUPERUSERS.map(normalizeText_).includes(normalizedEmail)) {
    row.superuser_flag = true;
    row.perfil = 'superuser';
    row.activo_flag = true;
  }

  upsertByKey_(GO_PES_V2.SHEETS.DIM_USUARIOS, 'email', row, true);
  logUserAction_('UPDATE_USER', 'usuario', payload.email, 'OK', { actor: actor.email, payload: row });

  return { ok: true, user: decorateUser_(row) };
}

function seedSuperUsers_() {
  ensureSheetsSubset_([GO_PES_V2.SHEETS.DIM_USUARIOS]);

  GO_PES_V2.SUPERUSERS.forEach(email => {
    upsertByKey_(GO_PES_V2.SHEETS.DIM_USUARIOS, 'email', {
      user_id: nextIdIfMissing_('usuario', 'USR', GO_PES_V2.SHEETS.DIM_USUARIOS, 'user_id', 'email', email),
      email: email,
      nombre_visible: email,
      perfil: 'superuser',
      activo_flag: true,
      superuser_flag: true,
      fecha_alta: new Date(),
      fecha_ultima_actividad: ''
    }, true);
  });
}

function syncCurrentUser_() {
  const email = getCurrentUserEmail_();
  if (!email) return null;

  const isSuper = GO_PES_V2.SUPERUSERS.map(normalizeText_).includes(normalizeText_(email));
  const trustedDomain = GO_PES_V2.TRUSTED_DOMAINS.some(d => email.toLowerCase().endsWith('@' + d));
  const active = isSuper || (GO_PES_V2.TRUSTED_DOMAIN_AUTO_ACTIVE && trustedDomain);
  const profile = isSuper ? 'superuser' : (trustedDomain ? 'operador' : 'operador');

  const row = {
    user_id: nextIdIfMissing_('usuario', 'USR', GO_PES_V2.SHEETS.DIM_USUARIOS, 'user_id', 'email', email),
    email: email,
    nombre_visible: email,
    perfil: profile,
    activo_flag: active,
    superuser_flag: isSuper,
    fecha_alta: new Date(),
    fecha_ultima_actividad: new Date()
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
  const active = toBool_(row.activo_flag);
  const superFlag = toBool_(row.superuser_flag) || GO_PES_V2.SUPERUSERS.map(normalizeText_).includes(normalizeText_(row.email));
  const profile = superFlag ? 'superuser' : (row.perfil || 'operador');

  return {
    user_id: row.user_id || '',
    email: row.email || '',
    nombre_visible: row.nombre_visible || row.email || '',
    perfil: profile,
    activo_flag: active,
    superuser_flag: superFlag,
    fecha_alta: row.fecha_alta || '',
    fecha_ultima_actividad: row.fecha_ultima_actividad || '',
    canAccess: active,
    roleLabel: profile
  };
}

function buildPermissionMap_(user) {
  const role = (user && user.perfil) || 'operador';
  const isSuper = !!(user && user.superuser_flag);

  return {
    canOpenSearch: true,
    canCreateIngreso: user && user.canAccess,
    canCreateSeguimiento: user && user.canAccess,
    canEditOrganizacion: user && user.canAccess,
    canEditInstrumento: user && user.canAccess,
    canEditRequisito: user && user.canAccess,
    canImportSocios: user && user.canAccess,
    canViewHistorial: user && user.canAccess,
    canManageUsers: isSuper || role === 'administrador',
    canAdmin: isSuper || role === 'administrador'
  };
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
    if (effective && GO_PES_V2.SUPERUSERS.map(normalizeText_).includes(normalizeText_(effective))) {
      return effective;
    }
  } catch (err) {}

  return '';
}
