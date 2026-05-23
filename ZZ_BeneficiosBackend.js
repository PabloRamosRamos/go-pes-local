function getFixedBenefitMeta_() {
  return [
    {
      beneficio_codigo: 'CAMARAS_1414',
      beneficio_nombre: 'CAMARAS 1414',
      descripcion_beneficio: 'Base mínima del módulo para el flujo de CAMARAS 1414.',
      descripcion_corta: 'Flujo municipal listo para construirse por etapas.',
      instrumento_tipo: 'beneficio_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: '',
      elegibilidad_label: 'Base mínima',
      estado: 'Base mínima',
      items: [
        'Pestaña operativa lista para desarrollar la administración del beneficio.',
        'Sin formularios ni reglas complejas activas en esta etapa.',
        'Estructura preparada para incorporar flujos posteriores sin rehacer el módulo.'
      ],
      nota: 'La implementación funcional de CAMARAS 1414 se retomará por partes desde esta base.'
    },
    {
      beneficio_codigo: 'FONDESE',
      beneficio_nombre: 'FONDESE',
      descripcion_beneficio: 'Base mínima del módulo para el flujo FONDESE.',
      descripcion_corta: 'Convocatorias y seguimiento se reconstruirán en iteraciones futuras.',
      instrumento_tipo: 'fondo_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: '',
      elegibilidad_label: 'Base mínima',
      estado: 'Base mínima',
      items: [
        'Pestaña fija para organizar el futuro desarrollo del flujo FONDESE.',
        'Sin calendario editable ni CRUD legado activos.',
        'Espacio reservado para construir administración, hitos y operación por separado.'
      ],
      nota: 'El backend anterior de configuración y seguimiento fue retirado para evitar complejidad residual.'
    },
    {
      beneficio_codigo: 'CHARLAS_CAPACITACIONES',
      beneficio_nombre: 'CAPACITACIONES',
      descripcion_beneficio: 'Base mínima del módulo para CAPACITACIONES.',
      descripcion_corta: 'Espacio operativo reservado para contenidos y gestión futura.',
      instrumento_tipo: 'capacitacion_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: '',
      elegibilidad_label: 'Base mínima',
      estado: 'Base mínima',
      items: [
        'Pestaña preparada para construir la lógica propia de capacitaciones.',
        'Sin planes anuales, formularios ni asignaciones activas por ahora.',
        'Lista para crecer de forma incremental sin arrastrar la implementación anterior.'
      ],
      nota: 'La pestaña queda visible y estable, con el módulo operativo pero sin sobrearquitectura.'
    }
  ];
}

function seedBeneficios_() {
  ensureSheetsSubset_([GO_PES_V2.SHEETS.DIM_BENEFICIOS]);

  const now = new Date();
  const actor = 'system';
  const rows = getFixedBenefitMeta_().map(function(item) {
    return {
      beneficio_codigo: item.beneficio_codigo,
      beneficio_nombre: item.beneficio_nombre,
      descripcion_beneficio: item.descripcion_beneficio,
      instrumento_tipo: item.instrumento_tipo,
      origen_instrumento: item.origen_instrumento,
      elegibilidad_tipo: item.elegibilidad_tipo,
      elegibilidad_label: item.elegibilidad_label,
      activo_flag: 'Si',
      system_flag: 'Si',
      updated_by: actor,
      updated_at: now
    };
  });

  upsertRowsByKey_(GO_PES_V2.SHEETS.DIM_BENEFICIOS, 'beneficio_codigo', rows, false);
}

function getBeneficiosModuloPanel(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  seedBeneficios_();

  payload = payload || {};
  const tabs = getFixedBenefitMeta_().map(function(item) {
    return {
      codigo: item.beneficio_codigo,
      titulo: item.beneficio_nombre,
      descripcion: item.descripcion_beneficio,
      descripcion_corta: item.descripcion_corta,
      estado: item.estado,
      items: (item.items || []).slice(),
      nota: item.nota || ''
    };
  });
  const requestedCode = String(payload.beneficio_codigo || '').trim().toUpperCase();
  const selected = tabs.find(function(tab) {
    return String(tab.codigo || '').trim().toUpperCase() === requestedCode;
  }) || tabs[0] || null;

  return serializeForClient_({
    tabs: tabs,
    selected_tab_codigo: selected ? selected.codigo : '',
    selected_tab: selected || ''
  });
}
