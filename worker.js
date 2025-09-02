// Cloudflare Worker: Gemini 1.5 — Flash primary, Pro fallback, solver-safe, timeouts, friendly errors
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (url.pathname === '/api/ping') {
      return respondJSON({ ok: true, primary: (env.MODEL_ID || 'gemini-1.5-flash') }, 200);
    }

    if (url.pathname === '/api/next' && request.method === 'POST') {
      // --- Basic env checks
      if (!env.GEMINI_API_KEY || !env.GEMINI_API_KEY.trim()) {
        return friendlyResponse(401, 'GEMINI_API_KEY missing');
      }

      // --- Model selection (Gemini 1.5 only)
      const primaryModel =
        (env.MODEL_ID && env.MODEL_ID.trim()) ||
        (env.GEMINI_MODEL_ID && env.GEMINI_MODEL_ID.trim()) ||
        'gemini-1.5-flash';

      const fallbackModel =
        (env.FALLBACK_MODEL_ID && env.FALLBACK_MODEL_ID.trim()) ||
        (env.GEMINI_FALLBACK_MODEL_ID && env.GEMINI_FALLBACK_MODEL_ID.trim()) ||
        'gemini-1.5-pro';

      // --- Parse body
      let body; try { body = await request.json(); } catch { body = {}; }
      const input = body?.messages;

      // Accept OpenAI-like {messages} OR a plain string
      let msgs = [];
      if (Array.isArray(input)) {
        msgs = input.map(m => ({
          role: String(m.role || 'user'),
          content: String(m.content || '')
        }));
      } else if (typeof input === 'string') {
        msgs = [{ role: 'user', content: String(input) }];
      } else {
        msgs = [
          { role: 'system', content: 'You are a helpful math question generator.' },
          { role: 'user', content: 'Return compact JSON with a single math question.' }
        ];
      }

      // --- Detect solver calls (do NOT force JSON for solver)
      const systemTextsClient = msgs.filter(m => m.role === 'system').map(m => m.content).filter(Boolean);
      const isSolver = systemTextsClient.some(t => /Solver/i.test(t));
      const systemTexts = systemTextsClient; // no extra hard rules here

      // Build contents
      const contents = msgs
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || '') }]
        }));

      // Token limits (smaller is faster; solver needs less)
      const clientMax = Number.isFinite(body?.max_tokens) ? body.max_tokens : undefined;
      const baseMax   = isSolver ? 150 : 240;
      const maxTokens = clientMax ? Math.min(clientMax, 320) : baseMax;

      let generationConfig = { temperature: 0.6, topP: 0.9, maxOutputTokens: maxTokens };

      // --- Build payload; hint JSON only for non-solver
      const makePayload = (mode = 'normal') => {
        const cfg = { ...generationConfig };
        if (mode === 'lite') {
          cfg.maxOutputTokens = Math.min(cfg.maxOutputTokens, 180);
          cfg.temperature = 0.5;
        }
        const p = {
          contents,
          generationConfig: { ...cfg },
          // Relax safety for benign math
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        };
        if (systemTexts.length) {
          p.systemInstruction = { parts: [{ text: systemTexts.join('\n\n') }] };
        }
        if (!isSolver) {
          p.generationConfig.responseMimeType = 'application/json';
        }
        return p;
      };

      // --- Timeouts + quick fallback race
      const HARD_TIMEOUT_MS  = 8000;  // per attempt
      const FALLBACK_RACE_MS = 3500;  // start fallback early

      function withTimeout(promise, ms, abort) {
        return new Promise((resolve, reject) => {
          const t = setTimeout(() => { try { abort?.(); } catch {} reject(new Error('timeout')); }, ms);
          promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
        });
      }

      const callGemini = async (modelId, mode = 'normal') => {
        const controller = new AbortController();
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
        const req = fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(makePayload(mode)),
          signal: controller.signal
        });
        const res = await withTimeout(req, HARD_TIMEOUT_MS, () => controller.abort());
        const text = await res.text();
        return { ok: res.ok, status: res.status, text, modelId };
      };

      const shouldRetry = (status, text) => {
        const s = String(text || '');
        return (
          status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504 ||
          /rate[\s-]?limit|quota|too many|rpm|tpm|timeout|timed out|bad gateway|temporarily unavailable|overloaded/i.test(s)
        );
      };

      const t0 = Date.now();
      let attempt;

      try {
        // race primary (flash, normal) vs fallback (pro, lite)
        const pPrimary  = callGemini(primaryModel, 'normal');
        const pFallback = (async () => {
          await new Promise(r => setTimeout(r, FALLBACK_RACE_MS));
          return callGemini(fallbackModel, 'lite');
        })();

        const first = await Promise.race([pPrimary, pFallback]);

        if (!first.ok) {
          const other = (first.modelId === primaryModel) ? pFallback : pPrimary;
          const second = await other.catch(() => null);
          attempt = (second && second.ok) ? second : first;
        } else {
          attempt = first;
        }

        // single retry (lite) if transient issue
        if (!attempt.ok && shouldRetry(attempt.status, attempt.text)) {
          const retryModel = attempt.modelId === primaryModel ? fallbackModel : primaryModel;
          const retried = await callGemini(retryModel, 'lite').catch(() => null);
          if (retried && retried.ok) attempt = retried;
        }

      } catch (e) {
        return friendlyResponse(504, 'timed out');
      }

      const elapsed = Date.now() - t0;

      // Payment/capacity
      if (!attempt.ok && attempt.status === 402) {
        return friendlyResponse(402, parseUpstreamText(attempt.text), attempt.modelId, elapsed);
      }

      const rawText = parseUpstreamText(attempt.text);
      if (!attempt.ok) {
        return friendlyResponse(attempt.status || 500, rawText || 'Gemini error', attempt.modelId, elapsed);
      }

      // --- Success → unwrap text; solver cleanup if needed
      try {
        const json = JSON.parse(attempt.text);
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const content = parts.map(p => p?.text || '').join('');

        if (!content.trim()) {
          return friendlyResponse(502, 'Empty content from model', attempt.modelId, elapsed);
        }

        let out = content;

        // Solver cleanup: ensure plain 3-line HTML (no "Solution:", no fences, rescue if JSON)
        if (isSolver) {
          out = out.replace(/^```(?:html|json)?/gi, '```') // normalize any labeled fence
                   .replace(/```/g, '')                    // strip fences
                   .replace(/^\s*Solution:\s*/i, '');      // remove "Solution:" prefix

          if (out.trim().startsWith('{')) {
            try {
              const j = JSON.parse(out);
              const guess =
                j.solution_html ||
                j.sample ||
                j.answer_html ||
                (j.questions && j.questions[0] && (j.questions[0].solution_html || j.questions[0].sample)) ||
                '';
              if (guess) out = String(guess);
            } catch { /* ignore parse errors */ }
          }
        }

        if (!out.trim()) {
          return friendlyResponse(502, 'Empty content from model', attempt.modelId, elapsed);
        }

        return new Response(out, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Model-Used': attempt.modelId || '',
            'X-Trace': `ms=${elapsed}`,
            ...cors()
          }
        });
      } catch {
        return friendlyResponse(502, rawText, attempt.modelId, elapsed);
      }
    }

    // Unknown route
    return friendlyResponse(404, 'Unknown path');
  }
};

/* ------------------------------- helpers ---------------------------------- */

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

function respondJSON(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() }
  });
}

/** Parse upstream JSON/text to a simple message string */
function parseUpstreamText(text = '') {
  const s = String(text || '');
  try {
    const j = JSON.parse(s);

    // Google AI error format: { error: { code, message, status } }
    if (j?.error?.message) return j.error.message;

    // finishReason sometimes indicates safety block
    const finishReason = j?.candidates?.[0]?.finishReason || '';
    if (/safety|blocked/i.test(finishReason)) return 'content blocked by safety';

    const parts = j?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const t = parts.map(p => p?.text || '').join(' ').trim();
      if (t) return t;
    }
    return s.slice(0, 500);
  } catch {
    return s.slice(0, 500);
  }
}

/** Map status/raw upstream text to a friendly end-user message */
function friendlyMessage(status, raw = '') {
  const s = String(raw || '');
  const isRate    = status === 429 || /rate[\s-]?limit|quota|tokens per (minute|day)|rpm|tpm|too many/i.test(s);
  const isPayment = status === 402 || /payment required|billing|credit|insufficient funds/i.test(s);
  const isAuth    = status === 401 || /unauthorized|unauthenticated|api key|invalid key|permission|forbidden/i.test(s);
  const isNF      = status === 404 || /not found|unknown (path|route|url)|unknown request url/i.test(s);
  const isTimeout = status === 408 || status === 504 || /timed? ?out|deadline|timeout/i.test(s);
  const isBusy    = status === 503 || /overloaded|temporarily unavailable|server busy|unavailable/i.test(s);
  const isGateway = status === 502 || /bad gateway|upstream/i.test(s);
  const isFormat  = status === 400 || status === 422 || /invalid json|parse|schema|bad request/i.test(s);
  const isPolicy  = /safety|blocked|content policy|harm|unsafe/i.test(s);
  const isModel   = /model.*(not found|invalid|unavailable|unsupported)/i.test(s);

  if (isRate)     return "Lots of traffic right now—try again in a few seconds.";
  if (isPayment)  return "We’re temporarily out of capacity. Please try again later.";
  if (isAuth)     return "The generator is warming up. Please try again shortly.";
  if (isNF)       return "The generator isn’t reachable right now. Please try again.";
  if (isTimeout)  return "It’s taking a bit long. Let’s try that again.";
  if (isBusy)     return "Our generator is a bit busy. Please try again shortly.";
  if (isGateway)  return "We hit a small snag connecting. Please try once more.";
  if (isFormat)   return "That request didn’t go through cleanly. One more try should fix it.";
  if (isPolicy)   return "We couldn’t generate that one. Try a slightly different input.";
  if (isModel)    return "That model isn’t available. Please try again.";
  if (status >= 500) return "We hit a small snag. Please try again soon.";
  return "Something unexpected happened. Please try again.";
}

/** Build a friendly Response (text/plain) + CORS + debug headers */
function friendlyResponse(status, rawText, modelUsed = '', elapsedMs = 0) {
  const msg = friendlyMessage(status, rawText);
  const snippet = String(rawText || '').slice(0, 200).replace(/\s+/g, ' ');
  return new Response(msg, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Debug-Note': 'See Worker logs for details',
      'X-Origin-Status': String(status || ''),
      'X-Model-Used': modelUsed || '',
      'X-Trace': elapsedMs ? `ms=${elapsedMs}` : '',
      'X-Upstream-Snippet': snippet,
      ...cors()
    }
  });
}
