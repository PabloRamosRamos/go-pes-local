var CAL_PATRONES_  = ['Reunion CS', 'Ministro de fe'];
var CAL_MESES_ES_  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// Normaliza texto para comparacion: sin acentos, minusculas, / y - tratados como espacio.
function normalizeCalText_(s) {
  return normalizeText_(String(s || ''))   // quita acentos + lowercase (helper de Validators.js)
    .replace(/[\/\-]+/g, ' ')             // / y - equivalen a espacio
    .replace(/\s+/g, ' ')                 // colapsa espacios multiples
    .trim();
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

  var patronesNorm = CAL_PATRONES_.map(normalizeCalText_);

  var ahora    = new Date();
  var hasta    = new Date(ahora.getTime() + diasAdelante * 24 * 60 * 60 * 1000);
  var calendar = CalendarApp.getDefaultCalendar();
  var raw      = calendar.getEvents(ahora, hasta);

  var eventos = raw
    .filter(function(ev) {
      var tNorm = normalizeCalText_(ev.getTitle());
      return patronesNorm.some(function(p) { return tNorm.indexOf(p) !== -1; });
    })
    .map(function(ev) {
      var start   = ev.getStartTime();
      var end     = ev.getEndTime();
      var allDay  = ev.isAllDayEvent();
      var titulo  = ev.getTitle() || '';
      var tNorm   = normalizeCalText_(titulo);
      var m       = start.getMonth();
      var d       = start.getDate();
      return {
        id:         ev.getId(),
        titulo:     titulo,
        fecha:      Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
        fechaLabel: d + ' de ' + CAL_MESES_ES_[m],
        diaSemana:  ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][start.getDay()],
        horaInicio: allDay ? '' : Utilities.formatDate(start, tz, 'HH:mm'),
        horaFin:    allDay ? '' : Utilities.formatDate(end,   tz, 'HH:mm'),
        lugar:      (ev.getLocation() || '').trim(),
        allDay:     allDay,
        tipo:       tNorm.indexOf(normalizeCalText_('Reunion CS')) !== -1 ? 'reunion' : 'ministro'
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
