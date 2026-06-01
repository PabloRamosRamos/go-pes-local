/**
 * Gestión centralizada de PINs de seguridad con separación por contexto.
 *
 * Arquitectura:
 * - Credenciales almacenadas en PropertiesService (no en código fuente)
 * - Separación por contexto (admin_reset, user_deactivate, evento_abierto)
 * - Rate limiting básico via CacheService (3 intentos/usuario/hora)
 * - Logs de intentos fallidos para auditoría
 *
 * Setup inicial (ejecutar una sola vez después de deploy):
 *   goPesConfigurePinDeSeguridad('admin_reset', '1234')
 *   goPesConfigurePinDeSeguridad('user_deactivate', '5678')
 *   goPesConfigurePinDeSeguridad('evento_abierto', '9012')
 */

const GO_PES_PIN_CONTEXTS = {
  ADMIN_RESET: 'admin_reset',
  USER_DEACTIVATE: 'user_deactivate',
  EVENTO_ABIERTO: 'evento_abierto'
};

const GO_PES_PIN_RATE_LIMIT_MAX_ATTEMPTS = 3;
const GO_PES_PIN_RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hora

/**
 * Configura o actualiza el PIN para un contexto específico.
 * Solo superusers pueden ejecutar esta función.
 *
 * @param {string} context - Uno de: 'admin_reset', 'user_deactivate', 'evento_abierto'
 * @param {string} pin - El PIN en texto plano (se almacenará hasheado)
 */
function goPesConfigurePinDeSeguridad(context, pin) {
  const user = requireRole_(['superuser']);

  if (!context || !Object.values(GO_PES_PIN_CONTEXTS).includes(context)) {
    throw new Error('Contexto invalido. Debe ser: admin_reset, user_deactivate o evento_abierto');
  }

  const pinStr = String(pin || '').trim();
  if (!pinStr || pinStr.length < 4) {
    throw new Error('El PIN debe tener al menos 4 caracteres.');
  }

  const credentials = goPesHashPin_(context, pinStr);
  const props = PropertiesService.getScriptProperties();
  const key = 'GO_PES_PIN_' + context.toUpperCase();

  props.setProperty(key, JSON.stringify(credentials));

  logProcessing_('INFO', 'goPesConfigurePinDeSeguridad', 'security_pin', context, user.email, 'OK', {
    context: context,
    action: 'configured'
  });

  return { ok: true, context: context, message: 'PIN configurado correctamente' };
}

/**
 * Valida un PIN para un contexto específico.
 * Implementa rate limiting y logging de intentos fallidos.
 *
 * @param {string} context - Contexto del PIN
 * @param {string} pin - PIN a validar
 * @param {string} actorEmail - Email del usuario que intenta validar
 * @throws {Error} Si el PIN es inválido o se excede el rate limit
 */
function goPesValidatePin_(context, pin, actorEmail) {
  const email = String(actorEmail || '').trim();
  const rateLimitKey = 'pin_attempts_' + context + '_' + email;

  // Verificar rate limit
  const cache = CacheService.getScriptCache();
  const attemptsStr = cache.get(rateLimitKey);
  const attempts = Number(attemptsStr || '0');

  if (attempts >= GO_PES_PIN_RATE_LIMIT_MAX_ATTEMPTS) {
    logProcessing_('WARN', 'goPesValidatePin', 'security_pin', context, email, 'RATE_LIMIT', {
      context: context,
      attempts: attempts
    });
    throw new Error('Demasiados intentos fallidos. Intenta nuevamente en 1 hora.');
  }

  // Obtener credenciales del contexto
  const credentials = goPesGetPinCredentials_(context);
  if (!credentials || !credentials.hash || !credentials.salt) {
    logProcessing_('ERROR', 'goPesValidatePin', 'security_pin', context, email, 'NOT_CONFIGURED', {
      context: context
    });
    throw new Error('PIN no configurado para este contexto. Contacta al administrador del sistema.');
  }

  // Validar PIN
  const candidate = goPesComputePinHash_(credentials.salt, pin);
  const isValid = candidate === credentials.hash;

  if (!isValid) {
    // Incrementar contador de intentos fallidos
    cache.put(rateLimitKey, String(attempts + 1), GO_PES_PIN_RATE_LIMIT_WINDOW_SECONDS);

    logProcessing_('WARN', 'goPesValidatePin', 'security_pin', context, email, 'INVALID_PIN', {
      context: context,
      attempts: attempts + 1,
      remaining: GO_PES_PIN_RATE_LIMIT_MAX_ATTEMPTS - attempts - 1
    });

    throw new Error('PIN invalido. Intentos restantes: ' + (GO_PES_PIN_RATE_LIMIT_MAX_ATTEMPTS - attempts - 1));
  }

  // PIN válido: resetear contador
  cache.remove(rateLimitKey);

  logProcessing_('INFO', 'goPesValidatePin', 'security_pin', context, email, 'OK', {
    context: context
  });

  return true;
}

/**
 * Obtiene las credenciales (hash + salt) de un contexto desde PropertiesService.
 * @private
 */
function goPesGetPinCredentials_(context) {
  const props = PropertiesService.getScriptProperties();
  const key = 'GO_PES_PIN_' + context.toUpperCase();
  const value = props.getProperty(key);

  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

/**
 * Genera hash y salt para un PIN en un contexto específico.
 * @private
 */
function goPesHashPin_(context, pin) {
  const salt = 'GO_PES_PIN_' + context.toUpperCase() + '_V1_' + new Date().getTime();
  const hash = goPesComputePinHash_(salt, pin);
  return { salt: salt, hash: hash };
}

/**
 * Computa el hash SHA-256 de un PIN con un salt específico.
 * @private
 */
function goPesComputePinHash_(salt, pin) {
  const raw = String(salt || '') + ':' + String(pin || '').trim();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}

/**
 * Función de utilidad para verificar si un contexto tiene PIN configurado.
 */
function goPesIsPinConfigured(context) {
  requireRole_(['superuser']);
  const credentials = goPesGetPinCredentials_(context);
  return { context: context, configured: !!(credentials && credentials.hash) };
}

/**
 * Función de utilidad para resetear el rate limit de un usuario en un contexto.
 * Solo para emergencias / soporte.
 */
function goPesResetPinRateLimit(context, email) {
  const user = requireRole_(['superuser']);
  const rateLimitKey = 'pin_attempts_' + context + '_' + String(email || '').trim();
  CacheService.getScriptCache().remove(rateLimitKey);

  logProcessing_('INFO', 'goPesResetPinRateLimit', 'security_pin', context, user.email, 'OK', {
    context: context,
    target_user: email
  });

  return { ok: true, message: 'Rate limit reseteado para ' + email };
}
