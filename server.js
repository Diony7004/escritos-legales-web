const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://paneln8n.multi-agent-ai.com/webhook/escritos-legales';
const WEBHOOK_URL_SUCESORIO = process.env.WEBHOOK_URL_SUCESORIO || 'https://paneln8n.multi-agent-ai.com/webhook/escritos-sucesorio';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint: recibe del wizard y reenvía al webhook de n8n
app.post('/api/submit', async (req, res) => {
  try {
    // Route sucesorio to its own webhook
    const isSucesorio = (req.body['Tipo de juicio'] || '').includes('Sucesorio');
    const targetUrl = isSucesorio ? WEBHOOK_URL_SUCESORIO : WEBHOOK_URL;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('n8n respondió con error:', response.status, text);
      return res.status(502).json({
        error: 'Error al procesar en n8n',
        detail: `Error ${response.status}: El servidor de procesamiento no respondió correctamente. Tu escrito no fue procesado. Puedes reintentar.`,
      });
    }

    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    res.json({ success: true, message: 'Escrito enviado a procesamiento', data });
  } catch (err) {
    console.error('Error conectando con n8n:', err.message);
    res.status(500).json({
      error: 'No se pudo conectar con el servidor de procesamiento',
      detail: 'Verifica que el servicio esté activo. Si el problema persiste, contacta al administrador.',
    });
  }
});

// AI field check via OpenRouter (Haiku)
app.post('/api/check-field', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.json({
      error: 'Revisión con IA no disponible. Falta configurar OPENROUTER_API_KEY.',
    });
  }

  const { field_name, field_value, field_label } = req.body;

  if (!field_value || !field_value.trim()) {
    return res.json({ error: 'El campo está vacío.' });
  }

  const systemPrompt = `Eres un asistente de revisión para un formulario de escritos legales mexicanos (materia familiar, Querétaro).
Tu trabajo es revisar la ortografía y redacción de UN campo del formulario.

Reglas:
- Si el texto es correcto, responde EXACTAMENTE: {"original_ok": true, "notes": "Sin observaciones."}
- Si tiene errores, responde: {"original_ok": false, "notes": "breve explicación", "suggested": "texto corregido"}
- Para direcciones: verifica estructura (calle, número, colonia, ciudad, estado)
- Para nombres de abogados: verifica formato (LIC., Cédula Profesional, Folio TSJ)
- Para narrativas: corrige ortografía, gramática y sugiere mejoras de redacción legal formal
- Para documentales: verifica que cada línea sea un documento válido
- NUNCA cambies datos factuales (nombres, números, direcciones concretas)
- Solo corrige ortografía, gramática y formato
- Responde SOLO con el JSON, sin markdown ni texto adicional`;

  const userPrompt = `Campo: "${field_label}"
Contenido:
${field_value}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://personal-escritos-legales-web.eulklw.easypanel.host',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenRouter error:', data.error);
      return res.json({ error: 'Error al consultar la IA: ' + (data.error.message || 'desconocido') });
    }

    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON response from Haiku
    try {
      const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      return res.json(parsed);
    } catch {
      // If not valid JSON, return as notes
      return res.json({ original_ok: false, notes: content, suggested: '' });
    }
  } catch (err) {
    console.error('Error calling OpenRouter:', err.message);
    return res.json({ error: 'No se pudo conectar con el servicio de IA.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    webhook: WEBHOOK_URL,
    webhook_sucesorio: WEBHOOK_URL_SUCESORIO,
    ai_check: OPENROUTER_API_KEY ? 'configured' : 'not configured',
  });
});

app.listen(PORT, () => {
  console.log(`Escritos Legales Web v2.0 corriendo en puerto ${PORT}`);
  console.log(`Webhook PP: ${WEBHOOK_URL}`);
  console.log(`Webhook Sucesorio: ${WEBHOOK_URL_SUCESORIO}`);
  console.log(`AI Check: ${OPENROUTER_API_KEY ? 'habilitado' : 'NO configurado (set OPENROUTER_API_KEY)'}`);
});
