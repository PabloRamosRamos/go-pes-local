var CAL_PATRONES_  = ['Reunion CS', 'Ministro de fe'];
var CAL_MESES_ES_  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var CAL_PROP_KEY_  = 'goPesCalEventos';

// Script IDs de cada entorno (ver CLAUDE.md)
var SCRIPT_ID_DEV_  = '12ZfNLyFSEpF5uAvwSwtqR8_zYZK9E6_TO0QhTaSYLO1AYsKHCN1eCdaB';
var SCRIPT_ID_PROD_ = '10Lzrg2GyPlkB0Wk6yLCshhtwv53dCSKLxDc8dDaOOpJgM2euLoKjRPOG';

/**
 * Detecta si el código está corriendo en DEV o PROD
 * @returns {boolean} true si es DEV, false si es PROD
 */
function isDevEnvironment_() {
  var currentScriptId = ScriptApp.getScriptId();
  return currentScriptId === SCRIPT_ID_DEV_;
}

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

/**
 * Retorna eventos simulados para testing sin acceder a Calendar API
 * Para activar: cambiar CAL_USE_MOCK_ = true
 */
function getCalendarioEventosMock_() {
  var ahora = new Date();
  var tz = Session.getScriptTimeZone();

  // Crear 8 eventos simulados
  var mockEvents = [
    {
      id: 'mock-1',
      titulo: 'Reunión CS - Comité Test UV 1',
      fecha: Utilities.formatDate(new Date(ahora.getTime() + 2 * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'),
      fechaLabel: '11 de junio',
      diaSemana: 'Mié',
      horaInicio: '15:30',
      horaFin: '16:30',
      lugar: 'Av. Providencia 1234',
      descripcion: 'Reunión con dirigentes del comité',
      allDay: false,
      tipo: 'reunion',
      yaIngresado: false
    },
    {
      id: 'mock-2',
      titulo: 'Ministro de Fe Comité de Seguridad María González (4500)',
      fecha: Utilities.formatDate(new Date(ahora.getTime() + 5 * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'),
      fechaLabel: '14 de junio',
      diaSemana: 'Sáb',
      horaInicio: '10:30',
      horaFin: '11:30',
      lugar: 'Antonio Varas 850',
      descripcion: '',
      allDay: false,
      tipo: 'ministro',
      yaIngresado: false
    },
    {
      id: 'mock-3',
      titulo: 'Reunión CS - Los Castaños 125',
      fecha: Utilities.formatDate(new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'),
      fechaLabel: '16 de junio',
      diaSemana: 'Lun',
      horaInicio: '18:00',
      horaFin: '19:00',
      lugar: 'Los Castaños 125',
      descripcion: '',
      allDay: false,
      tipo: 'reunion',
      yaIngresado: true,
      hitoInfo: {
        solicitud_id: 'SOL-TEST-001',
        organizacion_id: '',
        organizacion_nombre: '',
        fecha_hito: '16/06/2026',
        responsable: 'Test User',
        observacion: 'Reunión ingresada desde el calendario',
        vecino_nombre: 'Juan Pérez',
        vecino_uv: 'UV-1',
        vecino_direccion: 'Los Castaños 125'
      }
    },
    {
      id: 'mock-4',
      titulo: 'Ministro de Fe Comité Nuevo Amanecer (4600)',
      fecha: Utilities.formatDate(new Date(ahora.getTime() + 10 * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'),
      fechaLabel: '19 de junio',
      diaSemana: 'Jue',
      horaInicio: '11:00',
      horaFin: '',
      lugar: 'Los Leones 3400',
      descripcion: '',
      allDay: false,
      tipo: 'ministro',
      yaIngresado: false
    },
    {
      id: 'mock-5',
      titulo: 'Reunión CS - Santa Isabel 0180',
      fecha: Utilities.formatDate(new Date(ahora.getTime() + 12 * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'),
      fechaLabel: '21 de junio',
      diaSemana: 'Sáb',
      horaInicio: '16:00',
      horaFin: '17:30',
      lugar: 'Santa Isabel 0180',
      descripcion: 'Primera reunión constitutiva',
      allDay: false,
      tipo: 'reunion',
      yaIngresado: false
    },
    {
      id: 'mock-6',
      titulo: 'Ministro de Fe Comité Los Aromos (4700)',
      fecha: Utilities.formatDate(new Date(ahora.getTime() + 15 * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'),
      fechaLabel: '24 de junio',
      diaSemana: 'Mar',
      horaInicio: '10:00',
      horaFin: '11:00',
      lugar: 'Los Aromos 234',
      descripcion: '',
      allDay: false,
      tipo: 'ministro',
      yaIngresado: true,
      hitoInfo: {
        solicitud_id: 'SOL-TEST-002',
        organizacion_id: 'ORG-TEST-001',
        organizacion_nombre: 'Comité Los Aromos',
        fecha_hito: '24/06/2026',
        responsable: 'Admin Test',
        observacion: 'Asamblea constitutiva realizada',
        vecino_nombre: 'María López',
        vecino_uv: 'UV-3',
        vecino_direccion: 'Los Aromos 234'
      }
    }
  ];

  return serializeForClient_({
    ok: true,
    eventos: mockEvents,
    calendarName: 'Calendario Mock (Testing)',
    fetchedAt: Utilities.formatDate(ahora, tz, 'dd/MM/yyyy HH:mm'),
    nota: 'MODO TEST: Eventos simulados. Cambiar CAL_USE_MOCK_ = false para usar calendario real.'
  });
}

function getCalendarioEventos(payload) {
  requireModuleAccess_('inicio', ['visor', 'operador', 'coordinador', 'superuser']);

  // En DEV: usar datos simulados automáticamente (no requiere Calendar API)
  if (isDevEnvironment_()) {
    return getCalendarioEventosMock_();
  }

  var filters      = payload || {};
  var diasAdelante = Math.min(Number(filters.diasAdelante || 60), 365);
  var tz           = Session.getScriptTimeZone();

  // NOTA: Validación de email @providencia.cl comentada temporalmente
  // para permitir acceso con USER_ACCESSING de cualquier cuenta
  // var email = '';
  // try { email = Session.getActiveUser().getEmail().toLowerCase(); } catch (e) {}
  // if (!email || email.indexOf('@providencia.cl') === -1) {
  //   return serializeForClient_({
  //     ok: true, eventos: [], calendarName: '',
  //     nota: 'Solo disponible para cuentas @providencia.cl'
  //   });
  // }

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
  var hitosRows  = getSheetData_(GO_PES_V2.AVANCE.FACT_HITOS);
  var hitosPRE04 = hitosRows.filter(function(h) {
    if (h.hito_key !== 'PRE_04') return false;
    var fh = h.fecha_hito;
    if (!fh) return false;
    var d = fh instanceof Date ? fh : new Date(fh);
    return d >= desde && d <= hasta;
  });

  // Cargar info de casos y organizaciones para enriquecer los hitos
  var casosRows  = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  var casosBySol = {};
  casosRows.forEach(function(c) {
    if (c.solicitud_id) casosBySol[c.solicitud_id] = c;
  });

  var orgsRows  = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
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

      // Buscar hito PRE_04 coincidente (±1 día) para TODOS los eventos
      var hitoMatch = null;
      var fechaEventoTs = start.getTime();
      var unDia = 24 * 60 * 60 * 1000;
      hitoMatch = hitosPRE04.find(function(h) {
        var fh = h.fecha_hito instanceof Date ? h.fecha_hito : new Date(h.fecha_hito);
        var diff = Math.abs(fh.getTime() - fechaEventoTs);
        return diff <= unDia; // Tolerancia ±1 día
      });

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
