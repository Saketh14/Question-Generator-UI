import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});
const MODEL = process.env.GROQ_MODEL || 'llama3-70b-8192';

app.get('/api/health', (_req, res) => res.json({ ok: true, provider: 'groq', model: MODEL }));

app.post('/api/llm', async (req, res) => {
  try {
    const { prompt, system, temperature = 0.4, max_tokens = 512 } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const chat = await client.chat.completions.create({
      model: MODEL,
      temperature,
      max_tokens,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt }
      ]
    });

    res.json({ text: chat.choices?.[0]?.message?.content ?? '' });
  } catch (e) {
    res.status(500).json({ error: 'Groq error', details: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`LLM bridge (Groq) on http://localhost:${PORT}`);
});
