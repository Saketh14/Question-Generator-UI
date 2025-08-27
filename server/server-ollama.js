import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3';

app.get('/api/health', (_req, res) => res.json({ ok: true, provider: 'ollama', model: MODEL }));

app.post('/api/llm', async (req, res) => {
  try {
    const { prompt, system, temperature = 0.4, max_tokens = 512 } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const body = {
      model: MODEL,
      prompt: system ? `${system}\n\nUser:\n${prompt}\n\nAssistant:` : prompt,
      options: { temperature, num_predict: max_tokens },
      stream: false
    };

    const r = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Ollama error', details: text });
    }
    const data = await r.json();
    res.json({ text: data.response ?? '' });
  } catch (e) {
    res.status(500).json({ error: 'Server error', details: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`LLM bridge (Ollama) on http://localhost:${PORT}`);
});
