var CAL_PATRONES_  = ['Reunion CS', 'Ministro de fe'];
var CAL_MESES_ES_  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var CAL_PROP_KEY_  = 'goPesCalEventos';

function normalizeCalText_(s) {
  return normalizeText_(String(s || ''))
    .replace(/[\/\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Google Calendar almacena descripciones como HTML en la UI moderna.
// Convierte <br> y </p> en saltos de línea, decodifica entidades y elimina el resto de tags.
function stripCalHtml_(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi,      '\n')
    .replace(/<\/div>/gi,    '\n')
    .replace(/<[^>]+>/g,     '')
    .replace(/&nbsp;/g,      ' ')
    .replace(/&amp;/g,       '&')
    .replace(/&lt;/g,        '<')
    .replace(/&gt;/g,        '>')
    .replace(/&quot;/g,      '"')
    .replace(/&#39;/g,       "'");
}

function getCalendarioEventos(payload) {
  requireModuleAccess_('inicio', ['visor', 'operador', 'coordinador', 'superuser']);

  var filters      = payload || {};
  var diasAdelante = Math.min(Number(filters.diasAdelante || 60), 365);
  var tz           = Session.getScriptTimeZone();

  var email = '';
  try { email = Session.getActiveUser().getEmail().toLowerCase(); } catch (e) {}
  if (!email || email.indexOf('@providencia.cl') === -1) {
    return serializeForClient_({
      ok: true, eventos: [], calendarName: '',
      nota: 'Solo disponible para cuentas @providencia.cl'
    });
  }

  // Leer eventos ya procesados por este usuario
  var procesados = {};
  try {
    procesados = JSON.parse(PropertiesService.getUserProperties().getProperty(CAL_PROP_KEY_) || '{}');
  } catch (e) {}

  var patronesNorm = CAL_PATRONES_.map(normalizeCalText_);
  var ahora        = new Date();
  var hasta        = new Date(ahora.getTime() + diasAdelante * 24 * 60 * 60 * 1000);
  var calendar     = CalendarApp.getDefaultCalendar();
  var raw          = calendar.getEvents(ahora, hasta);

  var eventos = raw
    .filter(function(ev) {
      if (procesados[ev.getId()]) return false;           // ya procesado
      var tNorm = normalizeCalText_(ev.getTitle());
      return patronesNorm.some(function(p) { return tNorm.indexOf(p) !== -1; });
    })
    .map(function(ev) {
      var start  = ev.getStartTime();
      var end    = ev.getEndTime();
      var allDay = ev.isAllDayEvent();
      var titulo = ev.getTitle() || '';
      var tNorm  = normalizeCalText_(titulo);
      var m      = start.getMonth();
      var d      = start.getDate();
      return {
        id:          ev.getId(),
        titulo:      titulo,
        fecha:       Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
        fechaLabel:  d + ' de ' + CAL_MESES_ES_[m],
        diaSemana:   ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][start.getDay()],
        horaInicio:  allDay ? '' : Utilities.formatDate(start, tz, 'HH:mm'),
        horaFin:     allDay ? '' : Utilities.formatDate(end,   tz, 'HH:mm'),
        lugar:       (ev.getLocation()    || '').trim(),
        descripcion: stripCalHtml_(ev.getDescription()).trim(),
        allDay:      allDay,
        tipo:        tNorm.indexOf(normalizeCalText_('Reunion CS')) !== -1 ? 'reunion' : 'ministro'
      };
    })
    .sort(function(a, b) { return a.fecha.localeCompare(b.fecha); });

  return serializeForClient_({
    ok:           true,
    eventos:      eventos,
    calendarName: calendar.getName(),
    fetchedAt:    Utilities.formatDate(ahora, tz, 'dd/MM/yyyy HH:mm')
  });
}

function registrarEventoCalendario(payload) {
  requireModuleAccess_('inicio', ['visor', 'operador', 'coordinador', 'superuser']);

  var eventId    = String(payload && payload.eventId    || '').trim();
  var realizado  = !!(payload && payload.realizado);
  var asistentes = Math.max(0, Number(payload && payload.asistentes || 0));
  var titulo     = String(payload && payload.titulo     || '').trim();
  var fecha      = String(payload && payload.fecha      || '').trim();

  if (!eventId) throw new Error('ID de evento requerido.');

  var props = PropertiesService.getUserProperties();
  var stored = {};
  try { stored = JSON.parse(props.getProperty(CAL_PROP_KEY_) || '{}'); } catch (e) {}

  stored[eventId] = {
    realizado:  realizado,
    asistentes: asistentes,
    titulo:     titulo,
    fecha:      fecha,
    ts:         Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss")
  };

  props.setProperty(CAL_PROP_KEY_, JSON.stringify(stored));

  logUserAction_('REGISTRO_EVENTO_CALENDARIO', 'calendario', eventId,
    realizado ? 'REALIZADO' : 'NO_REALIZADO',
    { realizado: realizado, asistentes: asistentes, titulo: titulo, fecha: fecha }
  );

  return serializeForClient_({ ok: true });
}
