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
  var desde        = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 días previos
  var hasta        = new Date(ahora.getTime() + diasAdelante * 24 * 60 * 60 * 1000);
  var calendar     = CalendarApp.getDefaultCalendar();
  var raw          = calendar.getEvents(desde, hasta);

  // Cargar hitos PRE_04 (Reunión CS) del período para cruce
  var hitosSheet = getSheet_(GO_PES_V2.AVANCE.FACT_HITOS);
  var hitosRows  = hitosSheet ? getSheetRows_(hitosSheet) : [];
  var hitosPRE04 = hitosRows.filter(function(h) {
    if (h.hito_key !== 'PRE_04') return false;
    var fh = h.fecha_hito;
    if (!fh) return false;
    var d = fh instanceof Date ? fh : new Date(fh);
    return d >= desde && d <= hasta;
  });

  // Cargar info de casos y organizaciones para enriquecer los hitos
  var casosSheet = getSheet_(GO_PES_V2.SHEETS.MAE_CASOS);
  var casosRows  = casosSheet ? getSheetRows_(casosSheet) : [];
  var casosBySol = {};
  casosRows.forEach(function(c) {
    if (c.solicitud_id) casosBySol[c.solicitud_id] = c;
  });

  var orgsSheet = getSheet_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
  var orgsRows  = orgsSheet ? getSheetRows_(orgsSheet) : [];
  var orgsByOrgId = {};
  orgsRows.forEach(function(o) {
    if (o.organizacion_id) orgsByOrgId[o.organizacion_id] = o;
  });

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
      var fechaEvento = Utilities.formatDate(start, tz, 'yyyy-MM-dd');
      var esReunion   = tNorm.indexOf(normalizeCalText_('Reunion CS')) !== -1;

      // Buscar hito PRE_04 coincidente (±1 día)
      var hitoMatch = null;
      if (esReunion) {
        var fechaEventoTs = start.getTime();
        var unDia = 24 * 60 * 60 * 1000;
        hitoMatch = hitosPRE04.find(function(h) {
          var fh = h.fecha_hito instanceof Date ? h.fecha_hito : new Date(h.fecha_hito);
          var diff = Math.abs(fh.getTime() - fechaEventoTs);
          return diff <= unDia; // Tolerancia ±1 día
        });
      }

      var resultado = {
        id:          ev.getId(),
        titulo:      titulo,
        fecha:       fechaEvento,
        fechaLabel:  d + ' de ' + CAL_MESES_ES_[m],
        diaSemana:   ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][start.getDay()],
        horaInicio:  allDay ? '' : Utilities.formatDate(start, tz, 'HH:mm'),
        horaFin:     allDay ? '' : Utilities.formatDate(end,   tz, 'HH:mm'),
        lugar:       (ev.getLocation()    || '').trim(),
        descripcion: stripCalHtml_(ev.getDescription()).trim(),
        allDay:      allDay,
        tipo:        esReunion ? 'reunion' : 'ministro',
        yaIngresado: !!hitoMatch
      };

      // Si hay match, agregar detalles del hito
      if (hitoMatch) {
        var caso = casosBySol[hitoMatch.solicitud_id] || {};
        var org  = hitoMatch.organizacion_id ? orgsByOrgId[hitoMatch.organizacion_id] : null;
        resultado.hitoInfo = {
          solicitud_id:       hitoMatch.solicitud_id || '',
          organizacion_id:    hitoMatch.organizacion_id || '',
          organizacion_nombre: org ? org.nombre_organizacion : '',
          fecha_hito:         Utilities.formatDate(
            hitoMatch.fecha_hito instanceof Date ? hitoMatch.fecha_hito : new Date(hitoMatch.fecha_hito),
            tz, 'dd/MM/yyyy'
          ),
          responsable:        hitoMatch.responsable_gestion || '',
          observacion:        hitoMatch.observacion || '',
          vecino_nombre:      caso.nombre_completo || '',
          vecino_uv:          caso.uv || '',
          vecino_direccion:   caso.direccion_original || ''
        };
      }

      return resultado;
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
