const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://paneln8n.multi-agent-ai.com/webhook/escritos-legales';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint: recibe del wizard y reenvía al webhook de n8n
app.post('/api/submit', async (req, res) => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('n8n respondió con error:', response.status, text);
      return res.status(502).json({ error: 'Error al procesar en n8n', detail: `Status ${response.status}: El webhook no respondió correctamente. Verifica que esté activo en n8n.` });
    }

    // Try to parse as JSON, fallback to text
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    res.json({ success: true, message: 'Escrito enviado correctamente', data });
  } catch (err) {
    console.error('Error conectando con n8n:', err.message);
    res.status(500).json({ error: 'No se pudo conectar con n8n', detail: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', webhook: WEBHOOK_URL });
});

app.listen(PORT, () => {
  console.log(`Escritos Legales Web corriendo en puerto ${PORT}`);
  console.log(`Webhook destino: ${WEBHOOK_URL}`);
});
