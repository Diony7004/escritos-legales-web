// ===== Abogado IA - Wizard Logic =====

const TOTAL_STEPS = 8;
let currentStep = 1;

const STEP_TITLES = {
  1: 'Tipo de Juicio',
  2: 'Datos del Actor',
  3: 'Datos del Demandado',
  4: 'Datos del Menor',
  5: 'Representación Legal',
  6: 'Prestaciones',
  7: 'Pruebas',
  8: 'Hechos y Envío',
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
  nombre_menor: 'Nombre menor',
  apellidos_menor: 'Apellidos menor',
  iniciales_menor: 'Iniciales',
  genero_menor: 'Género menor',
  fecha_nacimiento_menor: 'Fecha nac. menor',
  edad_menor: 'Edad menor',
  escuela_menor: 'Escuela',
  documento_identidad_menor: 'Doc. identidad',
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
};

// Telegram contacts for summary display
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

// ===== Navigation =====
function goToStep(step) {
  if (step < 1 || step > TOTAL_STEPS) return;

  // Validate current step before advancing
  if (step > currentStep && !validateStep(currentStep)) return;

  // Hide all steps
  document.querySelectorAll('.wizard-step').forEach((s) => s.classList.remove('active'));

  // Show target step
  const target = document.querySelector(`.wizard-step[data-step="${step}"]`);
  if (target) target.classList.add('active');

  // Update dots
  document.querySelectorAll('.step-dot').forEach((dot) => {
    const dotStep = parseInt(dot.dataset.step);
    dot.classList.remove('active', 'completed');
    if (dotStep === step) dot.classList.add('active');
    else if (dotStep < step) dot.classList.add('completed');
  });

  currentStep = step;

  // Update progress bar
  progressBar.style.width = `${(step / TOTAL_STEPS) * 100}%`;
  stepLabel.textContent = `Paso ${step} de ${TOTAL_STEPS}`;
  stepTitle.textContent = STEP_TITLES[step];

  // Show/hide buttons
  btnPrev.classList.toggle('hidden', step === 1);
  btnNext.classList.toggle('hidden', step === TOTAL_STEPS);
  btnSubmit.classList.toggle('hidden', step !== TOTAL_STEPS);

  // Build summary on last step
  if (step === TOTAL_STEPS) buildSummary();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

btnNext.addEventListener('click', () => goToStep(currentStep + 1));
btnPrev.addEventListener('click', () => goToStep(currentStep - 1));

// Allow clicking step dots (only to completed or current steps)
document.querySelectorAll('.step-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    const step = parseInt(dot.dataset.step);
    if (step <= currentStep) goToStep(step);
  });
});

// ===== Validation =====
function validateStep(step) {
  const section = document.querySelector(`.wizard-step[data-step="${step}"]`);
  const requiredFields = section.querySelectorAll('[required]');
  let valid = true;

  requiredFields.forEach((field) => {
    // Skip hidden conditional fields
    const wrapper = field.closest('.conditional');
    if (wrapper && wrapper.style.display === 'none') return;

    clearFieldError(field);

    if (!field.value.trim()) {
      showFieldError(field, 'Este campo es obligatorio');
      valid = false;
    }
  });

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

// Clear error on input
form.addEventListener('input', (e) => {
  if (e.target.matches('input, select, textarea')) {
    clearFieldError(e.target);
  }
});

form.addEventListener('change', (e) => {
  if (e.target.matches('select')) {
    clearFieldError(e.target);
  }
});

// ===== Conditional Fields =====
function setupConditionalFields() {
  const conditionalFields = document.querySelectorAll('.conditional[data-show-when]');

  conditionalFields.forEach((field) => {
    const [triggerName, triggerValue] = field.dataset.showWhen.split('=');
    const triggerEl = document.getElementById(triggerName);

    if (triggerEl) {
      triggerEl.addEventListener('change', () => {
        const show = triggerEl.value === triggerValue;
        field.style.display = show ? '' : 'none';
        // Clear values when hiding
        if (!show) {
          field.querySelectorAll('input, select, textarea').forEach((input) => {
            input.value = '';
          });
        }
      });
    }
  });
}

// ===== Summary =====
function buildSummary() {
  const summaryEl = document.getElementById('summary');
  summaryEl.innerHTML = '';

  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    if (!value.trim()) continue;

    const label = FIELD_LABELS[key] || key;
    let displayValue = value;

    // Show contact name for telegram
    if (key === 'chat_id_telegram' && TELEGRAM_CONTACTS[value]) {
      displayValue = `${TELEGRAM_CONTACTS[value]} (${value})`;
    }

    // Truncate long values
    if (displayValue.length > 120) {
      displayValue = displayValue.substring(0, 120) + '...';
    }

    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `<span class="summary-label">${label}:</span><span class="summary-value">${escapeHtml(displayValue)}</span>`;
    summaryEl.appendChild(row);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Submit =====
btnSubmit.addEventListener('click', async () => {
  if (!validateStep(currentStep)) return;

  // Collect all form data
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value.trim();
  }

  // Map field names to match what n8n expects (original FormTrigger labels)
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
    'Nombre del menor': data.nombre_menor || '',
    'Apellidos del menor': data.apellidos_menor || '',
    'Iniciales del menor': data.iniciales_menor || '',
    'Género del menor': data.genero_menor || '',
    'Fecha nacimiento menor': data.fecha_nacimiento_menor || '',
    'Edad del menor': data.edad_menor || '',
    'Escuela del menor': data.escuela_menor || '',
    'Documento identidad menor': data.documento_identidad_menor || '',
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

  // Show loading
  loadingOverlay.classList.remove('hidden');
  btnSubmit.disabled = true;

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    if (!response.ok) {
      let detail = 'Error al enviar';
      try { detail = JSON.parse(text).detail || detail; } catch {}
      throw new Error(detail);
    }

    // Success
    loadingOverlay.classList.add('hidden');
    form.closest('main').querySelectorAll('.card, .flex').forEach((el) => el.classList.add('hidden'));
    successMessage.classList.remove('hidden');
  } catch (err) {
    loadingOverlay.classList.add('hidden');
    btnSubmit.disabled = false;
    alert('Error al generar el escrito: ' + err.message);
  }
});

// ===== Keyboard: Enter advances step =====
form.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    }
  }
});

// ===== Init =====
setupConditionalFields();
goToStep(1);
