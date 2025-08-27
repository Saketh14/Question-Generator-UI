/* llm.js — tiny client for the optional LLM bridge */
(function () {
  async function ask(prompt, { 
    system = 'You are a friendly, concise math coach. Explain clearly.',
    temperature = 0.4,
    max_tokens = 256,
    base = 'http://localhost:8787'
  } = {}) {
    try {
      const r = await fetch(`${base}/api/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, system, temperature, max_tokens })
      });
      if (!r.ok) throw new Error(`LLM bridge HTTP ${r.status}`);
      const data = await r.json();
      return data.text || '';
    } catch (e) {
      return '';
    }
  }
  window.LLM = { ask };
})();
