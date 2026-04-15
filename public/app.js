// ===== Abogado IA - Wizard Logic v2.0 =====

const TOTAL_STEPS = 8;
let currentStep = 1;
let menoresCount = 0;
const MAX_MENORES = 10;
let lastPayload = null; // for retry
let juicioMode = 'pp'; // 'pp' or 'sucesorio'
let etapaActual = 1;

// Steps active per etapa (etapas 2-4 skip steps 3-7)
const ETAPA_ACTIVE_STEPS = {
  1: [1, 2, 3, 4, 5, 6, 7, 8],
  2: [1, 2, 8],
  3: [1, 2, 8],
  4: [1, 2, 8],
};

const STEP_TITLES_PP = {
  1: 'Tipo de Juicio',
  2: 'Datos del Actor',
  3: 'Datos del Demandado',
  4: 'Datos del Menor',
  5: 'Representación Legal',
  6: 'Prestaciones',
  7: 'Pruebas',
  8: 'Hechos y Envío',
};

const STEP_TITLES_SUCESORIO = {
  1: 'Tipo de Juicio',
  2: 'De Cujus',
  3: 'Cónyuge',
  4: 'Hijos',
  5: 'Representación',
  6: 'Albacea y Repudio',
  7: 'Testigos y Docs',
  8: 'Hechos y Envío',
};

// Step titles per etapa (only steps 1, 2, 8 matter for etapas 2-4)
const STEP_TITLES_ETAPA = {
  2: { 1: 'Tipo de Juicio', 2: 'Inventarios y Avalúos', 8: 'Revisión y Envío' },
  3: { 1: 'Tipo de Juicio', 2: 'Cuentas de Albaceazgo', 8: 'Revisión y Envío' },
  4: { 1: 'Tipo de Juicio', 2: 'Partición de Herencia', 8: 'Revisión y Envío' },
};

const STEP_TITLES = STEP_TITLES_PP;

// Navigation helpers for step-skipping
function getActiveSteps() {
  if (juicioMode !== 'sucesorio') return [1, 2, 3, 4, 5, 6, 7, 8];
  return ETAPA_ACTIVE_STEPS[etapaActual] || [1, 2, 3, 4, 5, 6, 7, 8];
}

function getNextStep(current) {
  const active = getActiveSteps();
  const idx = active.indexOf(current);
  return idx >= 0 && idx < active.length - 1 ? active[idx + 1] : null;
}

function getPrevStep(current) {
  const active = getActiveSteps();
  const idx = active.indexOf(current);
  return idx > 0 ? active[idx - 1] : null;
}

// ===== Fracciones data =====
const FRACCIONES = {
  'Pérdida de Patria Potestad': {
    articulo: '440',
    codigo: 'CCQ',
    items: [
      { num: 'I', desc: 'Condena expresa a la pérdida de patria potestad' },
      { num: 'II', desc: 'En los casos de divorcio, según resolución judicial' },
      { num: 'III', desc: 'Costumbres depravadas, malos tratos o abandono de deberes' },
      { num: 'IV', desc: 'Exposición que se hiciere de los hijos' },
      { num: 'V', desc: 'Abandono de los hijos por más de tres meses sin causa justificada' },
      { num: 'VI', desc: 'Condena por delito doloso en perjuicio de los hijos' },
      { num: 'VII', desc: 'Declaración de estado de interdicción' },
      { num: 'VIII', desc: 'Incumplimiento injustificado de obligación alimentaria por más de 90 días' },
      { num: 'IX', desc: 'Incumplimiento de obligación alimentaria por menos de 90 días sin causa justificada' },
      { num: 'X', desc: 'Demás casos que la ley expresamente establezca' },
    ],
  },
  'Suspensión de Patria Potestad': {
    articulo: '443',
    codigo: 'CCQ',
    items: [
      { num: 'I', desc: 'Incapacidad declarada judicialmente (interdicción)' },
      { num: 'II', desc: 'Ausencia declarada judicialmente' },
      { num: 'III', desc: 'Sentencia condenatoria que imponga pena privativa de libertad' },
    ],
  },
};

// Field labels for summary
const FIELD_LABELS = {
  tipo_juicio: 'Tipo de juicio',
  juzgado_destino: 'Juzgado destino',
  numero_expediente: 'Núm. expediente',
  fecha_escrito: 'Fecha del escrito',
  fracciones_aplicables: 'Fracciones',
  nombre_actor: 'Actor',
  calidad_actor: 'Calidad',
  domicilio_actor: 'Domicilio actor',
  domicilio_procesal: 'Dom. procesal',
  nombre_demandado: 'Demandado',
  genero_demandado: 'Género demandado',
  tipo_domicilio_demandado: 'Tipo dom. demandado',
  domicilio_demandado: 'Dom. demandado',
  empresa_demandado: 'Empresa',
  domicilio_empresa_demandado: 'Dom. empresa',
  puesto_demandado: 'Puesto',
  sueldo_demandado: 'Sueldo',
  abogados_autorizados: 'Abogados',
  persona_autorizada_notificaciones: 'Pers. autorizada',
  tiene_procedimiento_previo: 'Proc. previo',
  texto_procedimiento_previo: 'Detalle proc. previo',
  incluye_custodia: 'Custodia',
  incluye_alimentos: 'Alimentos',
  porcentaje_pension: '% pensión',
  porcentaje_pension_letra: 'Pensión en letra',
  incluye_bloqueo_vehicular: 'Bloqueo vehicular',
  curp_demandado: 'CURP demandado',
  rfc_demandado: 'RFC demandado',
  fecha_nacimiento_demandado: 'Fecha nac. demandado',
  lista_documentales: 'Documentales',
  tiene_testigos: 'Testigos',
  nombres_testigos: 'Nombres testigos',
  palabras_clave_jurisprudencia: 'Jurisprudencia',
  narrativa_hechos: 'Hechos',
  chat_id_telegram: 'Enviar a',
  // Sucesorio fields
  etapa_sucesorio: 'Etapa',
  suc_nombre_de_cujus: 'De Cujus',
  suc_genero_de_cujus: 'Género de cujus',
  suc_alias: 'Alias',
  suc_fecha_defuncion: 'Fecha defunción',
  suc_ultimo_domicilio: 'Último domicilio',
  suc_conyuge_comparece: 'Cónyuge comparece',
  suc_nombre_conyuge: 'Cónyuge',
  suc_regimen_matrimonial: 'Régimen matrimonial',
  suc_fecha_matrimonio: 'Fecha matrimonio',
  suc_datos_acta_matrimonio: 'Datos acta matrimonio',
  suc_hijos_comparecientes: 'Hijos comparecientes',
  suc_total_hijos: 'Total hijos',
  suc_hijos_fallecidos: 'Hijos fallecidos',
  suc_detalle_hijos_fallecidos: 'Detalle hijos fallecidos',
  suc_domicilios_interesados: 'Domicilios interesados',
  suc_domicilio_procesal: 'Dom. procesal',
  suc_abogados_autorizados: 'Abogados',
  suc_persona_autorizada: 'Pers. autorizada',
  suc_representante_comun: 'Representante común',
  suc_albacea_propuesto: 'Albacea propuesto',
  suc_hay_repudio: 'Hay repudio',
  suc_beneficiario_repudio: 'Beneficiario repudio',
  suc_declaraciones_adicionales: 'Declaraciones adicionales',
  suc_testigo_1: 'Testigo 1',
  suc_testigo_2: 'Testigo 2',
  suc_lista_documentales: 'Documentales',
  suc_narrativa_hechos: 'Hechos',
  suc_chat_id_telegram: 'Enviar a',
  // Etapa 2 fields
  suc_e2_sociedad_conyugal: 'Sociedad conyugal',
  suc_e2_inmuebles: 'Descripción inmuebles',
  suc_e2_anexos: 'Documentos anexos',
  // Etapa 3 fields
  suc_e3_ingresos: 'Ingresos',
  suc_e3_gastos_detalle: 'Detalle gastos',
  suc_e3_total_gastos: 'Total gastos',
  suc_e3_nota_pagos: 'Nota pagos',
  // Etapa 4 fields
  suc_e4_tipo_particion: 'Tipo partición',
  suc_e4_antecedentes: 'Antecedentes procesales',
  suc_e4_proyecto_particion: 'Proyecto partición',
  suc_e4_datos_notaria: 'Datos notaría',
  suc_e4_datos_cuenta: 'Datos cuenta',
  suc_e4_hay_desistimiento: 'Desistimiento previo',
};

const TELEGRAM_CONTACTS = {
  '6295473990': 'Multi Agent',
  '1171270516': 'Veronica Garfias',
};

// ===== DOM References =====
const form = document.getElementById('wizard-form');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnSubmit = document.getElementById('btn-submit');
const progressBar = document.getElementById('progress-bar');
const stepLabel = document.getElementById('step-label');
const stepTitle = document.getElementById('step-title');
const loadingOverlay = document.getElementById('loading-overlay');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const fieldProgress = document.getElementById('field-progress');

// ============================================================
//  NUMBER TO SPANISH WORDS (for sueldo & pension)
// ============================================================
function numberToSpanish(n) {
  if (n === 0) return 'cero';
  if (n < 0) return 'menos ' + numberToSpanish(-n);

  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
  const tens = ['', '', 'veinti', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  function chunk(num) {
    if (num === 0) return '';
    if (num <= 20) return units[num];
    if (num < 30) return 'veinti' + units[num - 20];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      return u === 0 ? tens[t] : tens[t] + ' y ' + units[u];
    }
    if (num === 100) return 'cien';
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      return hundreds[h] + (rest > 0 ? ' ' + chunk(rest) : '');
    }
    if (num < 1000000) {
      const miles = Math.floor(num / 1000);
      const rest = num % 1000;
      const milesStr = miles === 1 ? 'mil' : chunk(miles) + ' mil';
      return milesStr + (rest > 0 ? ' ' + chunk(rest) : '');
    }
    if (num < 1000000000) {
      const millones = Math.floor(num / 1000000);
      const rest = num % 1000000;
      const millStr = millones === 1 ? 'un millón' : chunk(millones) + ' millones';
      return millStr + (rest > 0 ? ' ' + chunk(rest) : '');
    }
    return String(num);
  }

  return chunk(Math.floor(n));
}

function formatSueldo(rawValue) {
  const cleaned = rawValue.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  const formatted = '$' + entero.toLocaleString('es-MX') + '.' + String(centavos).padStart(2, '0');
  const letra = numberToSpanish(entero);
  const centavosStr = String(centavos).padStart(2, '0');

  return {
    formatted,
    fullText: `${formatted} (${letra} pesos ${centavosStr}/100 m.n.)`,
  };
}

// ============================================================
//  CURP / RFC VALIDATION
// ============================================================
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;

function validateCURP(curp, nombre, fechaNac) {
  const issues = [];
  if (curp.length !== 18) { issues.push('Debe tener 18 caracteres'); return issues; }
  if (!CURP_REGEX.test(curp)) issues.push('Formato inválido');

  if (nombre && curp.length >= 4) {
    const parts = nombre.trim().toUpperCase().split(/\s+/);
    if (parts.length >= 3) {
      const apPaterno = parts[parts.length - 2] || '';
      const apMaterno = parts[parts.length - 1] || '';
      const nom = parts[0] || '';
      const expectedFirst = (apPaterno[0] || '') + getFirstVowel(apPaterno) + (apMaterno[0] || '') + (nom[0] || '');
      if (expectedFirst && curp.substring(0, 4) !== expectedFirst) {
        issues.push(`Letras iniciales no coinciden con el nombre (esperado: ${expectedFirst})`);
      }
    }
  }

  if (fechaNac && curp.length >= 10) {
    const datePart = curp.substring(4, 10);
    const parsed = parseFechaTexto(fechaNac);
    if (parsed) {
      const yy = String(parsed.year).slice(-2).padStart(2, '0');
      const mm = String(parsed.month).padStart(2, '0');
      const dd = String(parsed.day).padStart(2, '0');
      const expected = yy + mm + dd;
      if (datePart !== expected) issues.push(`Fecha no coincide (CURP: ${datePart}, esperado: ${expected})`);
    }
  }
  return issues;
}

function validateRFC(rfc, nombre, fechaNac) {
  const issues = [];
  if (rfc.length !== 13) { issues.push('Debe tener 13 caracteres (persona física)'); return issues; }
  if (!RFC_REGEX.test(rfc)) issues.push('Formato inválido');

  if (fechaNac && rfc.length >= 10) {
    const datePart = rfc.substring(4, 10);
    const parsed = parseFechaTexto(fechaNac);
    if (parsed) {
      const yy = String(parsed.year).slice(-2).padStart(2, '0');
      const mm = String(parsed.month).padStart(2, '0');
      const dd = String(parsed.day).padStart(2, '0');
      const expected = yy + mm + dd;
      if (datePart !== expected) issues.push(`Fecha no coincide (RFC: ${datePart}, esperado: ${expected})`);
    }
  }
  return issues;
}

function getFirstVowel(str) {
  const vowels = 'AEIOU';
  for (let i = 1; i < str.length; i++) {
    if (vowels.includes(str[i])) return str[i];
  }
  return 'X';
}

// ============================================================
//  DATE PARSING & AGE CALCULATION
// ============================================================
const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

function parseFechaTexto(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase().trim().replace(/,/g, '');

  // Format: "15 de agosto de 2019" or "15 de agosto 2019"
  let match = t.match(/(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = MESES[match[2]];
    const year = parseInt(match[3]);
    if (month && day && year) return { day, month, year };
  }

  // Format: "03 03 2022" or "03/03/2022" or "03-03-2022" (DD MM YYYY)
  match = t.match(/(\d{1,2})[\s/\-.](\d{1,2})[\s/\-.](\d{2,4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { day, month, year };
  }

  // Format: "2022-03-03" (YYYY-MM-DD ISO)
  match = t.match(/(\d{4})[\s/\-.](\d{1,2})[\s/\-.](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { day, month, year };
  }

  // Format: "marzo 2022" or "marzo de 2022" (month year only, day=1)
  match = t.match(/(\w+)\s+(?:de\s+)?(\d{4})/);
  if (match && MESES[match[1]]) {
    return { day: 1, month: MESES[match[1]], year: parseInt(match[2]) };
  }

  return null;
}

const MESES_NOMBRE = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatearFecha(texto) {
  if (!texto) return texto;
  const parsed = parseFechaTexto(texto);
  if (!parsed) return texto;
  return `${parsed.day} de ${MESES_NOMBRE[parsed.month]} de ${parsed.year}`;
}

function calcularEdad(fechaNacTexto) {
  const parsed = parseFechaTexto(fechaNacTexto);
  if (!parsed) return null;
  const birth = new Date(parsed.year, parsed.month - 1, parsed.day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

// ============================================================
//  INITIALS GENERATION
// ============================================================
function generarIniciales(nombre, apellidos) {
  if (!nombre || !apellidos) return '';
  const parts = [...nombre.trim().split(/\s+/), ...apellidos.trim().split(/\s+/)];
  return parts.filter(p => p.length > 0).map(p => p[0].toUpperCase() + '.').join('');
}

// ============================================================
//  DYNAMIC MINORS
// ============================================================
function createMenorCard(index) {
  const div = document.createElement('div');
  div.className = 'menor-card';
  div.dataset.menorIndex = index;
  div.innerHTML = `
    <div class="menor-header">
      <span class="menor-title">Menor ${index}</span>
      ${index > 1 ? `<button type="button" class="btn-remove-menor" data-remove="${index}" title="Quitar menor">&times;</button>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="field">
        <label>Nombre del menor <span class="req">*</span></label>
        <input type="text" name="menor_${index}_nombre" placeholder="Nombre completo" required class="auto-uppercase menor-nombre" data-menor="${index}">
      </div>
      <div class="field">
        <label>Apellidos del menor <span class="req">*</span></label>
        <input type="text" name="menor_${index}_apellidos" placeholder="Apellido paterno y materno" required class="auto-uppercase menor-apellidos" data-menor="${index}">
      </div>
      <div class="field">
        <label>Iniciales del menor <span class="req">*</span></label>
        <input type="text" name="menor_${index}_iniciales" placeholder="Se calcula automáticamente" required class="menor-iniciales bg-gray-100" data-menor="${index}" readonly>
        <p class="hint">Generadas desde nombre y apellidos</p>
      </div>
      <div class="field">
        <label>Género del menor <span class="req">*</span></label>
        <select name="menor_${index}_genero" required>
          <option value="">Seleccionar...</option>
          <option value="hijo">Hijo</option>
          <option value="hija">Hija</option>
        </select>
      </div>
      <div class="field">
        <label>Fecha de nacimiento <span class="req">*</span></label>
        <input type="text" name="menor_${index}_fecha_nacimiento" placeholder="Ej: 2 de febrero de 2021" required class="menor-fecha-nac" data-menor="${index}">
      </div>
      <div class="field">
        <label>Edad del menor <span class="req">*</span></label>
        <input type="text" name="menor_${index}_edad" placeholder="Se calcula automáticamente" required class="menor-edad bg-gray-100" data-menor="${index}" readonly>
        <p class="hint edad-hint" data-menor="${index}"></p>
      </div>
      <div class="field">
        <label>Escuela del menor</label>
        <input type="text" name="menor_${index}_escuela" placeholder="Nombre de escuela o guardería">
      </div>
      <div class="field">
        <label>Documento de identidad <span class="req">*</span></label>
        <select name="menor_${index}_documento_identidad" required>
          <option value="">Seleccionar...</option>
          <option value="Copia certificada del acta de nacimiento">Copia certificada del acta de nacimiento</option>
          <option value="Pasaporte">Pasaporte</option>
          <option value="Constancia Escolar">Constancia Escolar</option>
        </select>
      </div>
    </div>
  `;
  return div;
}

function addMenor() {
  if (menoresCount >= MAX_MENORES) return;
  menoresCount++;
  const container = document.getElementById('menores-container');
  container.appendChild(createMenorCard(menoresCount));
  updateMenoresCount();
  setupMenorListeners(menoresCount);
}

function removeMenor(index) {
  const card = document.querySelector(`.menor-card[data-menor-index="${index}"]`);
  if (card) card.remove();
  // Renumber remaining
  menoresCount = 0;
  const cards = document.querySelectorAll('.menor-card');
  cards.forEach((card, i) => {
    const newIdx = i + 1;
    menoresCount = newIdx;
    card.dataset.menorIndex = newIdx;
    card.querySelector('.menor-title').textContent = `Menor ${newIdx}`;

    // Update all field names and data attributes
    card.querySelectorAll('[name]').forEach(field => {
      field.name = field.name.replace(/menor_\d+_/, `menor_${newIdx}_`);
    });
    card.querySelectorAll('[data-menor]').forEach(el => {
      el.dataset.menor = newIdx;
    });
    card.querySelectorAll('[data-remove]').forEach(btn => {
      btn.dataset.remove = newIdx;
    });

    // Hide remove button on first minor
    const removeBtn = card.querySelector('.btn-remove-menor');
    if (removeBtn) {
      removeBtn.style.display = newIdx === 1 ? 'none' : '';
    }
  });
  updateMenoresCount();
}

function updateMenoresCount() {
  const el = document.getElementById('menores-count');
  el.textContent = `${menoresCount} de ${MAX_MENORES} menores`;
  const addBtn = document.getElementById('btn-add-menor');
  addBtn.disabled = menoresCount >= MAX_MENORES;
  addBtn.style.opacity = menoresCount >= MAX_MENORES ? '0.5' : '1';
}

function setupMenorListeners(index) {
  const card = document.querySelector(`.menor-card[data-menor-index="${index}"]`);
  if (!card) return;

  // Auto-initials from nombre + apellidos
  const nombreInput = card.querySelector(`.menor-nombre[data-menor="${index}"]`);
  const apellidosInput = card.querySelector(`.menor-apellidos[data-menor="${index}"]`);
  const inicialesInput = card.querySelector(`.menor-iniciales[data-menor="${index}"]`);

  function updateIniciales() {
    const ini = generarIniciales(nombreInput.value, apellidosInput.value);
    if (ini) inicialesInput.value = ini;
  }
  nombreInput.addEventListener('blur', updateIniciales);
  apellidosInput.addEventListener('blur', updateIniciales);

  // Auto-age from fecha_nacimiento
  const fechaInput = card.querySelector(`.menor-fecha-nac[data-menor="${index}"]`);
  const edadInput = card.querySelector(`.menor-edad[data-menor="${index}"]`);
  const edadHint = card.querySelector(`.edad-hint[data-menor="${index}"]`);

  fechaInput.addEventListener('blur', () => {
    const edad = calcularEdad(fechaInput.value);
    if (edad !== null) {
      edadInput.value = `${edad} años`;
      edadHint.textContent = '';
      edadHint.className = 'hint edad-hint';
    } else if (fechaInput.value.trim()) {
      edadHint.textContent = 'Formato esperado: 2 de febrero de 2021';
      edadHint.className = 'hint edad-hint text-amber-600';
    }
  });
}

// ============================================================
//  FRACCIONES CHECKBOXES
// ============================================================
function renderFracciones(tipoJuicio) {
  const container = document.getElementById('fracciones-container');
  const hiddenInput = document.getElementById('fracciones_aplicables');

  if (!tipoJuicio || !FRACCIONES[tipoJuicio]) {
    container.innerHTML = '<p class="text-sm text-gray-400 italic">Seleccione primero el tipo de juicio para ver las fracciones disponibles.</p>';
    hiddenInput.value = '';
    return;
  }

  const data = FRACCIONES[tipoJuicio];
  container.innerHTML = `
    <p class="text-xs text-gray-500 mb-2">Art. ${data.articulo} del ${data.codigo} — Seleccione las fracciones aplicables:</p>
    ${data.items.map(f => `
      <label class="fraccion-check">
        <input type="checkbox" value="${f.num}" class="fraccion-cb">
        <span class="fraccion-num">${f.num}</span>
        <span class="fraccion-desc">${f.desc}</span>
      </label>
    `).join('')}
  `;

  container.querySelectorAll('.fraccion-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...container.querySelectorAll('.fraccion-cb:checked')].map(c => c.value);
      hiddenInput.value = checked.join(',');
    });
  });
}

// ============================================================
//  JUZGADO DROPDOWN + "OTRO"
// ============================================================
function setupJuzgadoSelector() {
  const selector = document.getElementById('juzgado_selector');
  const input = document.getElementById('juzgado_destino');

  selector.addEventListener('change', () => {
    if (selector.value === 'otro') {
      input.classList.remove('hidden');
      input.value = '';
      input.focus();
    } else {
      input.classList.add('hidden');
      input.value = selector.value;
    }
  });

  // If selector has a value on load
  if (selector.value && selector.value !== 'otro') {
    input.value = selector.value;
  }
}

// ============================================================
//  ABOGADOS TEMPLATE
// ============================================================
function setupAbogadosTemplate() {
  const template = 'LIC. [NOMBRE COMPLETO], con Cédula Profesional número [NÚMERO], inscrita en el Tribunal Superior de Justicia del Estado bajo el Folio número [FOLIO]; y/o LIC. [NOMBRE COMPLETO 2], con Cédula Profesional número [NÚMERO], inscrita en el Tribunal Superior de Justicia del Estado bajo el Folio número [FOLIO]';

  // PP version
  const btn = document.getElementById('btn-template-abogado');
  const textarea = document.getElementById('abogados_autorizados');
  btn?.addEventListener('click', () => {
    if (!textarea.value.trim() || confirm('¿Reemplazar el contenido actual con la plantilla?')) {
      textarea.value = template;
      textarea.focus();
      textarea.setSelectionRange(5, 22);
    }
  });

  // Sucesorio version
  const btnSuc = document.getElementById('btn-template-abogado-suc');
  const textareaSuc = document.getElementById('suc_abogados_autorizados');
  btnSuc?.addEventListener('click', () => {
    if (!textareaSuc.value.trim() || confirm('¿Reemplazar el contenido actual con la plantilla?')) {
      textareaSuc.value = template;
      textareaSuc.focus();
      textareaSuc.setSelectionRange(5, 22);
    }
  });
}

// ============================================================
//  AUTO-UPPERCASE
// ============================================================
function setupAutoUppercase() {
  document.addEventListener('blur', (e) => {
    if (e.target.classList.contains('auto-uppercase') && e.target.value) {
      e.target.value = e.target.value.toUpperCase();
    }
  }, true);
}

// ============================================================
//  FECHA AUTO-FORMAT (convierte cualquier formato a "DD de mes de AAAA")
// ============================================================
function setupFechaAutoFormat() {
  const fechaFields = ['fecha_escrito', 'suc_fecha_defuncion', 'suc_fecha_matrimonio', 'fecha_nacimiento_demandado'];
  fechaFields.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur', () => {
      const val = input.value.trim();
      if (!val) return;
      const formatted = formatearFecha(val);
      if (formatted !== val) {
        input.value = formatted;
      }
    });
  });
  // Also handle minor fecha_nacimiento fields (dynamic)
  document.addEventListener('blur', (e) => {
    if (e.target.classList.contains('menor-fecha-nac') && e.target.value.trim()) {
      const formatted = formatearFecha(e.target.value.trim());
      if (formatted !== e.target.value.trim()) {
        e.target.value = formatted;
      }
    }
  }, true);
}

// ============================================================
//  SUELDO AUTO-FORMAT
// ============================================================
function setupSueldoFormat() {
  const input = document.getElementById('sueldo_demandado');
  const preview = document.querySelector('.sueldo-preview');
  if (!input || !preview) return;

  input.addEventListener('blur', () => {
    const result = formatSueldo(input.value);
    if (result) {
      preview.textContent = result.fullText;
      preview.className = 'hint sueldo-preview text-green-600';
    } else if (input.value.trim()) {
      preview.textContent = 'Ingrese un número válido (ej: 20629.94)';
      preview.className = 'hint sueldo-preview text-amber-600';
    } else {
      preview.textContent = '';
    }
  });
}

// ============================================================
//  PENSION AUTO-LETRA
// ============================================================
function setupPensionAutoLetra() {
  const input = document.getElementById('porcentaje_pension');
  const letraInput = document.getElementById('porcentaje_pension_letra');
  const preview = document.querySelector('.pension-letra-preview');
  if (!input || !letraInput) return;

  input.addEventListener('blur', () => {
    const num = parseInt(input.value);
    if (!isNaN(num) && num > 0 && num <= 100) {
      const letra = numberToSpanish(num).toUpperCase();
      letraInput.value = letra;
      if (preview) {
        preview.textContent = `${num}% = ${letra} POR CIENTO`;
        preview.className = 'hint pension-letra-preview text-green-600';
      }
    } else if (input.value.trim()) {
      letraInput.value = '';
      if (preview) {
        preview.textContent = 'Ingrese un número entre 1 y 100';
        preview.className = 'hint pension-letra-preview text-amber-600';
      }
    }
  });
}

// ============================================================
//  CURP / RFC VALIDATION UI
// ============================================================
function setupCURPRFCValidation() {
  const curpInput = document.getElementById('curp_demandado');
  const rfcInput = document.getElementById('rfc_demandado');
  const curpHint = document.querySelector('.curp-validation-hint');
  const rfcHint = document.querySelector('.rfc-validation-hint');
  const nombreDemandado = document.getElementById('nombre_demandado');
  const fechaNacDemandado = document.getElementById('fecha_nacimiento_demandado');

  if (curpInput) {
    curpInput.addEventListener('blur', () => {
      if (!curpInput.value.trim()) { curpHint.textContent = ''; return; }
      const issues = validateCURP(curpInput.value.toUpperCase(), nombreDemandado?.value, fechaNacDemandado?.value);
      if (issues.length === 0) {
        curpHint.textContent = 'CURP válido';
        curpHint.className = 'hint curp-validation-hint text-green-600';
      } else {
        curpHint.textContent = issues.join('. ');
        curpHint.className = 'hint curp-validation-hint text-red-500';
      }
    });
  }

  if (rfcInput) {
    rfcInput.addEventListener('blur', () => {
      if (!rfcInput.value.trim()) { rfcHint.textContent = ''; return; }
      const issues = validateRFC(rfcInput.value.toUpperCase(), nombreDemandado?.value, fechaNacDemandado?.value);
      if (issues.length === 0) {
        rfcHint.textContent = 'RFC válido';
        rfcHint.className = 'hint rfc-validation-hint text-green-600';
      } else {
        rfcHint.textContent = issues.join('. ');
        rfcHint.className = 'hint rfc-validation-hint text-red-500';
      }
    });
  }
}

// ============================================================
//  FIELD PROGRESS COUNTER
// ============================================================
function updateFieldProgress() {
  const allFields = form.querySelectorAll('input[required], select[required], textarea[required]');
  let total = 0;
  let filled = 0;

  allFields.forEach(f => {
    // Skip hidden conditional fields
    const wrapper = f.closest('.conditional');
    if (wrapper && wrapper.style.display === 'none') return;
    // Skip fields in hidden juicio mode blocks
    const modeBlock = f.closest('.juicio-pp, .juicio-sucesorio');
    if (modeBlock && modeBlock.classList.contains('hidden')) return;
    // Skip hidden wrappers
    const hiddenWrapper = f.closest('#fracciones-wrapper, #etapa-wrapper');
    if (hiddenWrapper && hiddenWrapper.classList.contains('hidden')) return;
    // Skip hidden etapa-fields
    const etapaBlock = f.closest('.etapa-fields');
    if (etapaBlock && etapaBlock.classList.contains('hidden')) return;
    // Skip fields in steps that are skipped for this etapa
    const stepBlock = f.closest('.wizard-step');
    if (stepBlock && juicioMode === 'sucesorio') {
      const stepNum = parseInt(stepBlock.dataset.step);
      if (!getActiveSteps().includes(stepNum)) return;
    }
    // Skip hidden juzgado input if selector is used
    if (f.id === 'juzgado_destino' && f.classList.contains('hidden')) return;
    total++;
    if (f.value.trim()) filled++;
  });

  fieldProgress.textContent = `${filled} de ${total} campos completados`;
}

// ============================================================
//  NAVIGATION
// ============================================================
function goToStep(step) {
  if (step < 1 || step > TOTAL_STEPS) return;

  // Don't allow navigating to skipped steps
  const active = getActiveSteps();
  if (!active.includes(step)) return;

  if (step > currentStep && !validateStep(currentStep)) return;

  document.querySelectorAll('.wizard-step').forEach((s) => s.classList.remove('active'));
  const target = document.querySelector(`.wizard-step[data-step="${step}"]`);
  if (target) target.classList.add('active');

  // Update step dots: active, completed, or skipped
  document.querySelectorAll('.step-dot').forEach((dot) => {
    const dotStep = parseInt(dot.dataset.step);
    dot.classList.remove('active', 'completed', 'step-dot-skipped');
    if (!active.includes(dotStep)) {
      dot.classList.add('step-dot-skipped');
    } else if (dotStep === step) {
      dot.classList.add('active');
    } else if (active.indexOf(dotStep) < active.indexOf(step)) {
      dot.classList.add('completed');
    }
  });

  currentStep = step;

  // Progress bar based on position within active steps
  const stepIndex = active.indexOf(step);
  const totalActive = active.length;
  progressBar.style.width = `${((stepIndex + 1) / totalActive) * 100}%`;
  stepLabel.textContent = `Paso ${stepIndex + 1} de ${totalActive}`;

  // Step title: use etapa-specific titles for etapas 2-4
  if (juicioMode === 'sucesorio' && etapaActual > 1 && STEP_TITLES_ETAPA[etapaActual]?.[step]) {
    stepTitle.textContent = STEP_TITLES_ETAPA[etapaActual][step];
  } else {
    stepTitle.textContent = STEP_TITLES[step];
  }

  const isFirst = active.indexOf(step) === 0;
  const isLast = active.indexOf(step) === active.length - 1;
  btnPrev.classList.toggle('hidden', isFirst);
  btnNext.classList.toggle('hidden', isLast);
  btnSubmit.classList.toggle('hidden', !isLast);

  if (isLast) buildSummary();

  updateFieldProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

btnNext.addEventListener('click', () => {
  const next = getNextStep(currentStep);
  if (next !== null) goToStep(next);
});
btnPrev.addEventListener('click', () => {
  const prev = getPrevStep(currentStep);
  if (prev !== null) goToStep(prev);
});

document.querySelectorAll('.step-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    const step = parseInt(dot.dataset.step);
    const active = getActiveSteps();
    if (!active.includes(step)) return;
    if (active.indexOf(step) <= active.indexOf(currentStep)) goToStep(step);
  });
});

// ============================================================
//  VALIDATION
// ============================================================
function validateStep(step) {
  const section = document.querySelector(`.wizard-step[data-step="${step}"]`);
  const requiredFields = section.querySelectorAll('[required]');
  let valid = true;

  requiredFields.forEach((field) => {
    // Skip fields inside hidden conditional blocks
    const wrapper = field.closest('.conditional');
    if (wrapper && wrapper.style.display === 'none') return;

    // Skip fields inside hidden juicio mode blocks
    const modeBlock = field.closest('.juicio-pp, .juicio-sucesorio');
    if (modeBlock && modeBlock.classList.contains('hidden')) return;

    // Skip hidden wrappers (fracciones/etapa toggle)
    const hiddenWrapper = field.closest('#fracciones-wrapper, #etapa-wrapper');
    if (hiddenWrapper && hiddenWrapper.classList.contains('hidden')) return;

    // Skip hidden etapa-fields
    const etapaBlock = field.closest('.etapa-fields');
    if (etapaBlock && etapaBlock.classList.contains('hidden')) return;

    // Skip hidden juzgado_destino if selector is not "otro"
    if (field.id === 'juzgado_destino' && field.classList.contains('hidden')) return;

    clearFieldError(field);

    if (!field.value.trim()) {
      showFieldError(field, 'Este campo es obligatorio');
      valid = false;
    }
  });

  // Step 1: validate at least one fraccion is checked (PP only)
  if (step === 1 && juicioMode === 'pp') {
    const fracciones = document.getElementById('fracciones_aplicables');
    if (!fracciones.value) {
      const container = document.getElementById('fracciones-container');
      container.style.border = '2px solid #ef4444';
      container.style.borderRadius = '0.5rem';
      valid = false;
    }
  }

  // Step 1: validate etapa is selected (Sucesorio only)
  if (step === 1 && juicioMode === 'sucesorio') {
    const etapa = document.getElementById('etapa_sucesorio');
    if (!etapa.value) {
      showFieldError(etapa, 'Seleccione la etapa del juicio');
      valid = false;
    }
  }

  return valid;
}

function showFieldError(field, message) {
  field.classList.add('error');
  let errorEl = field.parentElement.querySelector('.error-msg');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'error-msg';
    field.parentElement.appendChild(errorEl);
  }
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function clearFieldError(field) {
  field.classList.remove('error');
  const errorEl = field.parentElement.querySelector('.error-msg');
  if (errorEl) errorEl.style.display = 'none';
}

form.addEventListener('input', (e) => {
  if (e.target.matches('input, select, textarea')) {
    clearFieldError(e.target);
    updateFieldProgress();
  }
});

form.addEventListener('change', (e) => {
  if (e.target.matches('select')) {
    clearFieldError(e.target);
    updateFieldProgress();
  }
});

// ============================================================
//  CONDITIONAL FIELDS
// ============================================================
function setupConditionalFields() {
  const conditionalFields = document.querySelectorAll('.conditional[data-show-when]');

  conditionalFields.forEach((field) => {
    const [triggerName, triggerValue] = field.dataset.showWhen.split('=');
    const triggerEl = document.getElementById(triggerName);

    if (triggerEl) {
      triggerEl.addEventListener('change', () => {
        const show = triggerEl.value === triggerValue;
        field.style.display = show ? '' : 'none';
        if (!show) {
          field.querySelectorAll('input, select, textarea').forEach((input) => {
            input.value = '';
          });
        }
      });
    }
  });
}

// ============================================================
//  SUMMARY
// ============================================================
function buildSummary() {
  const summaryEl = document.getElementById('summary');
  summaryEl.innerHTML = '';

  const formData = new FormData(form);

  if (juicioMode === 'sucesorio') {
    // Sucesorio summary: show only suc_ fields + shared step-1 fields
    const sharedKeys = ['tipo_juicio', 'etapa_sucesorio', 'juzgado_destino', 'numero_expediente', 'fecha_escrito'];
    for (const key of sharedKeys) {
      const value = formData.get(key);
      if (value && value.trim()) {
        addSummaryRow(summaryEl, FIELD_LABELS[key] || key, value);
      }
    }
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith('suc_') || !value.trim()) continue;
      const label = FIELD_LABELS[key] || key;
      let displayValue = value;
      if (key === 'suc_chat_id_telegram' && TELEGRAM_CONTACTS[value]) {
        displayValue = `${TELEGRAM_CONTACTS[value]} (${value})`;
      }
      if (displayValue.length > 120) displayValue = displayValue.substring(0, 120) + '...';
      addSummaryRow(summaryEl, label, displayValue);
    }
    return;
  }

  // --- PP MODE ---
  const skipKeys = new Set();
  for (const [key] of formData.entries()) {
    if (key.startsWith('menor_') || key.startsWith('suc_')) skipKeys.add(key);
  }

  for (const [key, value] of formData.entries()) {
    if (!value.trim() || skipKeys.has(key) || key === 'juzgado_selector' || key === 'etapa_sucesorio') continue;

    const label = FIELD_LABELS[key] || key;
    let displayValue = value;

    if (key === 'chat_id_telegram' && TELEGRAM_CONTACTS[value]) {
      displayValue = `${TELEGRAM_CONTACTS[value]} (${value})`;
    }

    if (key === 'sueldo_demandado' && value.trim()) {
      const result = formatSueldo(value);
      if (result) displayValue = result.fullText;
    }

    if (displayValue.length > 120) displayValue = displayValue.substring(0, 120) + '...';

    addSummaryRow(summaryEl, label, displayValue);
  }

  // Menores grouped
  for (let i = 1; i <= menoresCount; i++) {
    const nombre = formData.get(`menor_${i}_nombre`) || '';
    const apellidos = formData.get(`menor_${i}_apellidos`) || '';
    const genero = formData.get(`menor_${i}_genero`) || '';
    const edad = formData.get(`menor_${i}_edad`) || '';
    const iniciales = formData.get(`menor_${i}_iniciales`) || '';

    if (nombre || apellidos) {
      const menorLabel = menoresCount > 1 ? `Menor ${i}` : 'Menor';
      addSummaryRow(summaryEl, menorLabel, `${nombre} ${apellidos} (${genero}, ${edad}, iniciales: ${iniciales})`);
    }
  }
}

function addSummaryRow(container, label, value) {
  const row = document.createElement('div');
  row.className = 'summary-row';
  row.innerHTML = `<span class="summary-label">${label}:</span><span class="summary-value">${escapeHtml(value)}</span>`;
  container.appendChild(row);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
//  AI CHECK (HAIKU via server)
// ============================================================
let aiCurrentField = null;
let aiSuggestedText = '';

function setupAICheck() {
  const panel = document.getElementById('ai-suggestion-panel');
  const loadingEl = document.getElementById('ai-suggestion-loading');
  const contentEl = document.getElementById('ai-suggestion-content');
  const errorEl = document.getElementById('ai-suggestion-error');
  const textEl = document.getElementById('ai-suggestion-text');

  // Close
  document.getElementById('ai-panel-close').addEventListener('click', () => panel.classList.add('hidden'));
  document.getElementById('ai-suggestion-dismiss').addEventListener('click', () => panel.classList.add('hidden'));

  // Apply
  document.getElementById('ai-suggestion-apply').addEventListener('click', () => {
    if (aiCurrentField && aiSuggestedText) {
      const field = document.getElementById(aiCurrentField);
      if (field) field.value = aiSuggestedText;
    }
    panel.classList.add('hidden');
  });

  // Click handlers for all AI check buttons
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-ai-check');
    if (!btn) return;

    const fieldId = btn.dataset.field;
    const field = document.getElementById(fieldId);
    if (!field || !field.value.trim()) {
      alert('Primero escribe algo en el campo para que la IA pueda revisarlo.');
      return;
    }

    aiCurrentField = fieldId;
    panel.classList.remove('hidden');
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    try {
      const response = await fetch('/api/check-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_name: fieldId,
          field_value: field.value,
          field_label: field.closest('.field')?.querySelector('label')?.textContent?.replace(' *', '') || fieldId,
        }),
      });

      const data = await response.json();

      loadingEl.classList.add('hidden');

      if (data.error) {
        errorEl.textContent = data.error;
        errorEl.classList.remove('hidden');
        return;
      }

      aiSuggestedText = data.suggested || '';
      textEl.innerHTML = '';

      if (data.original_ok) {
        textEl.innerHTML = '<p class="text-green-600 font-medium mb-2">La redacción es correcta.</p>';
        if (data.notes) textEl.innerHTML += `<p class="text-gray-600">${escapeHtml(data.notes)}</p>`;
        document.getElementById('ai-suggestion-apply').classList.add('hidden');
      } else {
        if (data.notes) textEl.innerHTML += `<p class="text-amber-700 font-medium mb-2">${escapeHtml(data.notes)}</p>`;
        if (aiSuggestedText) {
          textEl.innerHTML += `<div class="mt-2 p-3 bg-blue-50 rounded text-sm"><strong>Sugerencia:</strong><br>${escapeHtml(aiSuggestedText)}</div>`;
        }
        document.getElementById('ai-suggestion-apply').classList.remove('hidden');
      }

      contentEl.classList.remove('hidden');
    } catch (err) {
      loadingEl.classList.add('hidden');
      errorEl.textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
      errorEl.classList.remove('hidden');
    }
  });
}

// ============================================================
//  SUBMIT (ASYNC)
// ============================================================
function collectPayload() {
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('menor_') && key !== 'juzgado_selector') {
      data[key] = value.trim();
    }
  }

  // --- SUCESORIO MODE ---
  if (juicioMode === 'sucesorio') {
    const etapa = parseInt(data.etapa_sucesorio) || 1;

    // Common fields for all etapas
    const payload = {
      'Tipo de juicio': data.tipo_juicio || '',
      'Etapa': String(etapa),
      'Juzgado destino': data.juzgado_destino || '',
      'Número de expediente': data.numero_expediente || '',
      'Fecha del escrito': data.fecha_escrito || '',
      'Chat ID Telegram': data.suc_chat_id_telegram || '',
    };

    if (etapa === 1) {
      // Etapa 1: full data (De Cujus + Cónyuge + Hijos + Representación + Albacea + Testigos + Hechos)
      Object.assign(payload, {
        'Nombre de cujus': data.suc_nombre_de_cujus || '',
        'Género de cujus': data.suc_genero_de_cujus || '',
        'Alias': data.suc_alias || '',
        'Fecha defunción': data.suc_fecha_defuncion || '',
        'Último domicilio': data.suc_ultimo_domicilio || '',
        'Cónyuge comparece': data.suc_conyuge_comparece || 'No',
        'Nombre cónyuge': data.suc_nombre_conyuge || '',
        'Régimen matrimonial': data.suc_regimen_matrimonial || '',
        'Fecha matrimonio': data.suc_fecha_matrimonio || '',
        'Datos acta matrimonio': data.suc_datos_acta_matrimonio || '',
        'Hijos comparecientes': data.suc_hijos_comparecientes || '',
        'Total hijos': data.suc_total_hijos || '',
        'Hijos fallecidos': data.suc_hijos_fallecidos || 'No',
        'Detalle hijos fallecidos': data.suc_detalle_hijos_fallecidos || '',
        'Domicilios interesados': data.suc_domicilios_interesados || '',
        'Domicilio procesal': data.suc_domicilio_procesal || '',
        'Abogados autorizados': data.suc_abogados_autorizados || '',
        'Persona autorizada notificaciones': data.suc_persona_autorizada || '',
        'Representante común': data.suc_representante_comun || '',
        'Albacea propuesto': data.suc_albacea_propuesto || '',
        'Hay repudio': data.suc_hay_repudio || 'No',
        'Beneficiario repudio': data.suc_beneficiario_repudio || '',
        'Declaraciones adicionales': data.suc_declaraciones_adicionales || '',
        'Testigo 1': data.suc_testigo_1 || '',
        'Testigo 2': data.suc_testigo_2 || '',
        'Lista de documentales': data.suc_lista_documentales || '',
        'Narrativa de los hechos': data.suc_narrativa_hechos || '',
      });
    } else if (etapa === 2) {
      // Etapa 2: Inventarios y Avalúos
      Object.assign(payload, {
        'Sociedad conyugal': data.suc_e2_sociedad_conyugal || 'No',
        'Descripción inmuebles': data.suc_e2_inmuebles || '',
        'Documentos anexos': data.suc_e2_anexos || '',
        'Narrativa de los hechos': data.suc_narrativa_hechos || '',
      });
    } else if (etapa === 3) {
      // Etapa 3: Cuentas de Albaceazgo
      Object.assign(payload, {
        'Ingresos': data.suc_e3_ingresos || 'NO HUBO INGRESOS',
        'Detalle gastos': data.suc_e3_gastos_detalle || '',
        'Total gastos': data.suc_e3_total_gastos || '',
        'Nota pagos': data.suc_e3_nota_pagos || '',
        'Narrativa de los hechos': data.suc_narrativa_hechos || '',
      });
    } else if (etapa === 4) {
      // Etapa 4: Partición de la Herencia
      Object.assign(payload, {
        'Tipo partición': data.suc_e4_tipo_particion || '',
        'Antecedentes procesales': data.suc_e4_antecedentes || '',
        'Proyecto partición': data.suc_e4_proyecto_particion || '',
        'Datos notaría': data.suc_e4_datos_notaria || '',
        'Datos cuenta bancaria': data.suc_e4_datos_cuenta || '',
        'Desistimiento proyecto anterior': data.suc_e4_hay_desistimiento || 'No',
        'Narrativa de los hechos': data.suc_narrativa_hechos || '',
      });
    }

    return payload;
  }

  // --- PP MODE (existing) ---
  // Collect menores as array
  const menores = [];
  for (let i = 1; i <= menoresCount; i++) {
    menores.push({
      nombre: formData.get(`menor_${i}_nombre`)?.trim() || '',
      apellidos: formData.get(`menor_${i}_apellidos`)?.trim() || '',
      iniciales: formData.get(`menor_${i}_iniciales`)?.trim() || '',
      genero: formData.get(`menor_${i}_genero`)?.trim() || '',
      fecha_nacimiento: formData.get(`menor_${i}_fecha_nacimiento`)?.trim() || '',
      edad: formData.get(`menor_${i}_edad`)?.trim() || '',
      escuela: formData.get(`menor_${i}_escuela`)?.trim() || '',
      documento_identidad: formData.get(`menor_${i}_documento_identidad`)?.trim() || '',
    });
  }

  // Sueldo: send the formatted version
  if (data.sueldo_demandado) {
    const result = formatSueldo(data.sueldo_demandado);
    if (result) data.sueldo_demandado = result.fullText;
  }

  // Build payload matching n8n expected format
  const payload = {
    'Tipo de juicio': data.tipo_juicio || '',
    'Juzgado destino': data.juzgado_destino || '',
    'Número de expediente': data.numero_expediente || '',
    'Fecha del escrito': data.fecha_escrito || '',
    'Fracciones aplicables': data.fracciones_aplicables || '',
    'Incluye custodia': data.incluye_custodia || 'No',
    'Incluye alimentos': data.incluye_alimentos || 'No',
    'Nombre del actor': data.nombre_actor || '',
    'Calidad del actor': data.calidad_actor || '',
    'Domicilio habitual del actor': data.domicilio_actor || '',
    'Domicilio procesal': data.domicilio_procesal || '',
    'Nombre del demandado': data.nombre_demandado || '',
    'Género del demandado': data.genero_demandado || '',
    'Tipo domicilio demandado': data.tipo_domicilio_demandado || '',
    'Domicilio del demandado': data.domicilio_demandado || '',
    'Empresa del demandado': data.empresa_demandado || '',
    'Domicilio empresa demandado': data.domicilio_empresa_demandado || '',
    'Puesto del demandado': data.puesto_demandado || '',
    'Sueldo del demandado': data.sueldo_demandado || '',
    // Menores as array (new format)
    'Menores': menores,
    // Backward compat: first minor in flat fields
    'Nombre del menor': menores[0]?.nombre || '',
    'Apellidos del menor': menores[0]?.apellidos || '',
    'Iniciales del menor': menores[0]?.iniciales || '',
    'Género del menor': menores[0]?.genero || '',
    'Fecha nacimiento menor': menores[0]?.fecha_nacimiento || '',
    'Edad del menor': menores[0]?.edad || '',
    'Escuela del menor': menores[0]?.escuela || '',
    'Documento identidad menor': menores[0]?.documento_identidad || '',
    // Rest
    'Abogados autorizados': data.abogados_autorizados || '',
    'Persona autorizada notificaciones': data.persona_autorizada_notificaciones || '',
    'Tiene procedimiento previo': data.tiene_procedimiento_previo || 'No',
    'Texto procedimiento previo': data.texto_procedimiento_previo || '',
    'Porcentaje pensión': data.porcentaje_pension || '',
    'Porcentaje pensión en letra': data.porcentaje_pension_letra || '',
    'Incluye bloqueo vehicular': data.incluye_bloqueo_vehicular || 'No',
    'CURP demandado': data.curp_demandado || '',
    'RFC demandado': data.rfc_demandado || '',
    'Fecha nacimiento demandado': data.fecha_nacimiento_demandado || '',
    'Lista de documentales': data.lista_documentales || '',
    'Tiene testigos': data.tiene_testigos || 'No',
    'Nombres de testigos': data.nombres_testigos || '',
    'Palabras clave jurisprudencia': data.palabras_clave_jurisprudencia || '',
    'Narrativa de los hechos': data.narrativa_hechos || '',
    'Chat ID Telegram': data.chat_id_telegram || '',
  };

  return payload;
}

async function submitForm() {
  if (!validateStep(currentStep)) return;

  const payload = collectPayload();
  lastPayload = payload;

  // Show loading
  loadingOverlay.classList.remove('hidden');
  btnSubmit.disabled = true;

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    loadingOverlay.classList.add('hidden');

    if (!response.ok || result.error) {
      showErrorScreen(result.detail || result.error || `Error ${response.status}: No se pudo enviar el escrito.`);
      return;
    }

    // Success - show async message
    document.getElementById('wizard-form').classList.add('hidden');
    document.querySelector('.flex.justify-between.mt-6')?.classList.add('hidden');
    document.querySelector('.max-w-4xl.mx-auto.px-4.mt-6')?.classList.add('hidden'); // progress bar
    successMessage.classList.remove('hidden');
  } catch (err) {
    loadingOverlay.classList.add('hidden');
    showErrorScreen('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
  }
}

function showErrorScreen(detail) {
  btnSubmit.disabled = false;
  document.getElementById('wizard-form').classList.add('hidden');
  document.querySelector('.flex.justify-between.mt-6')?.classList.add('hidden');
  document.querySelector('.max-w-4xl.mx-auto.px-4.mt-6')?.classList.add('hidden');
  document.getElementById('error-detail').textContent = detail;
  errorMessage.classList.remove('hidden');
}

btnSubmit.addEventListener('click', submitForm);

// Retry button
document.getElementById('btn-retry')?.addEventListener('click', async () => {
  errorMessage.classList.add('hidden');
  if (lastPayload) {
    loadingOverlay.classList.remove('hidden');
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastPayload),
      });
      const result = await response.json();
      loadingOverlay.classList.add('hidden');

      if (!response.ok || result.error) {
        document.getElementById('error-detail').textContent = result.detail || result.error || 'Error al reintentar.';
        errorMessage.classList.remove('hidden');
        return;
      }
      successMessage.classList.remove('hidden');
    } catch (err) {
      loadingOverlay.classList.add('hidden');
      document.getElementById('error-detail').textContent = 'No se pudo conectar. Intenta de nuevo.';
      errorMessage.classList.remove('hidden');
    }
  } else {
    location.reload();
  }
});

// ============================================================
//  KEYBOARD: Enter advances step
// ============================================================
form.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    const next = getNextStep(currentStep);
    if (next !== null) goToStep(next);
  }
});

// ============================================================
//  MENORES container event delegation
// ============================================================
document.getElementById('menores-container')?.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.btn-remove-menor');
  if (removeBtn) {
    const idx = parseInt(removeBtn.dataset.remove);
    if (confirm(`¿Quitar los datos del Menor ${idx}?`)) {
      removeMenor(idx);
    }
  }
});

document.getElementById('btn-add-menor')?.addEventListener('click', addMenor);

// ============================================================
//  JUICIO MODE SWITCHING
// ============================================================
function switchJuicioMode(newMode) {
  juicioMode = newMode;

  // Toggle visibility of PP vs Sucesorio blocks in all steps
  document.querySelectorAll('.juicio-pp').forEach(el => {
    el.classList.toggle('hidden', newMode !== 'pp');
  });
  document.querySelectorAll('.juicio-sucesorio').forEach(el => {
    el.classList.toggle('hidden', newMode !== 'sucesorio');
  });

  // Toggle fracciones (PP only) vs etapa (Sucesorio only) in step 1
  const fraccionesWrapper = document.getElementById('fracciones-wrapper');
  const etapaWrapper = document.getElementById('etapa-wrapper');
  if (fraccionesWrapper) fraccionesWrapper.classList.toggle('hidden', newMode === 'sucesorio');
  if (etapaWrapper) etapaWrapper.classList.toggle('hidden', newMode !== 'sucesorio');

  // Toggle required on fracciones hidden input
  const fraccionesInput = document.getElementById('fracciones_aplicables');
  if (fraccionesInput) fraccionesInput.required = (newMode === 'pp');

  // Update step titles
  const titles = newMode === 'sucesorio' ? STEP_TITLES_SUCESORIO : STEP_TITLES_PP;
  Object.assign(STEP_TITLES, titles);
  stepTitle.textContent = STEP_TITLES[currentStep];

  // When switching to sucesorio, apply current etapa selection
  if (newMode === 'sucesorio') {
    const etapaSelect = document.getElementById('etapa_sucesorio');
    const etapa = parseInt(etapaSelect?.value) || 1;
    switchEtapa(etapa);
  } else {
    etapaActual = 1;
  }

  // Re-setup conditional fields for newly visible elements
  setupConditionalFields();
  updateFieldProgress();
}

// ============================================================
//  ETAPA CHANGE -> toggle etapa-specific fields
// ============================================================
function switchEtapa(etapa) {
  etapaActual = etapa;

  // Expediente obligatorio para Etapas 2-4 (necesario para UPDATE en Postgres)
  const expInput = document.getElementById('numero_expediente');
  if (expInput) {
    if (etapa > 1) {
      expInput.required = true;
      expInput.placeholder = 'Ej: 1110/21 (obligatorio para Etapas 2-4)';
    } else {
      expInput.required = false;
      expInput.placeholder = 'Ej: 1353/25 (vacío si es nuevo)';
    }
  }

  // Toggle etapa-fields visibility
  document.querySelectorAll('.etapa-fields').forEach(el => {
    el.classList.add('hidden');
  });
  const activeFields = document.querySelector(`.etapa-${etapa}-fields`);
  if (activeFields) activeFields.classList.remove('hidden');

  // Update step dots for skipped steps
  const active = getActiveSteps();
  document.querySelectorAll('.step-dot').forEach(dot => {
    const dotStep = parseInt(dot.dataset.step);
    dot.classList.toggle('step-dot-skipped', !active.includes(dotStep));
  });

  // Re-setup conditional fields for newly visible elements
  setupConditionalFields();
  updateFieldProgress();
}

document.getElementById('etapa_sucesorio')?.addEventListener('change', (e) => {
  const etapa = parseInt(e.target.value) || 1;
  switchEtapa(etapa);
});

// ============================================================
//  TIPO JUICIO change -> update fracciones / mode
// ============================================================
document.getElementById('tipo_juicio')?.addEventListener('change', (e) => {
  const val = e.target.value;
  const isSucesorio = val === 'Sucesorio Intestamentario';

  switchJuicioMode(isSucesorio ? 'sucesorio' : 'pp');

  if (!isSucesorio) {
    renderFracciones(val);
  } else {
    renderFracciones(''); // clear fracciones
  }

  // Clear fracciones border error
  const container = document.getElementById('fracciones-container');
  if (container) container.style.border = '';
});

// ============================================================
//  INIT
// ============================================================
function init() {
  setupConditionalFields();
  setupJuzgadoSelector();
  setupAbogadosTemplate();
  setupAutoUppercase();
  setupFechaAutoFormat();
  setupSueldoFormat();
  setupPensionAutoLetra();
  setupCURPRFCValidation();
  setupAICheck();

  // Add first minor
  addMenor();

  // Render initial fracciones state
  renderFracciones('');

  updateFieldProgress();
  goToStep(1);
}

init();
