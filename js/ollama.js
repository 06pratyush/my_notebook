/**
 * ollama.js — Connector for a locally running Ollama instance.
 *
 * Ollama listens on http://localhost:11434. Because this notebook is served from
 * a different origin (GitHub Pages, or a local static server on another port),
 * Ollama must be told to accept that origin:
 *
 *   OLLAMA_ORIGINS=https://06pratyush.github.io ollama serve
 *
 * Without it the browser blocks the request and every call here fails with a
 * generic TypeError, which we translate into an actionable message rather than
 * letting it surface as an opaque network error.
 */
window.NBOllama = (() => {
  const HOST_KEY = 'nb_ollama_host';
  const MODEL_KEY = 'nb_ollama_model';
  const DEFAULT_HOST = 'http://localhost:11434';

  let host = localStorage.getItem(HOST_KEY) || DEFAULT_HOST;
  let model = localStorage.getItem(MODEL_KEY) || null;

  function getHost() { return host; }
  function setHost(h) {
    host = (h || DEFAULT_HOST).replace(/\/+$/, '');
    localStorage.setItem(HOST_KEY, host);
  }

  function getModel() { return model; }
  function setModel(m) {
    model = m;
    if (m) localStorage.setItem(MODEL_KEY, m);
    else localStorage.removeItem(MODEL_KEY);
  }

  /**
   * Probe the instance and list installed models.
   * Resolves { ok: true, models: [...] } or { ok: false, reason, detail }.
   * Never throws — callers render the reason directly.
   */
  async function probe() {
    let res;
    try {
      res = await fetch(host + '/api/tags', { method: 'GET' });
    } catch (e) {
      // fetch() rejects identically for "not running" and "blocked by CORS",
      // so we cannot distinguish them here; the message covers both.
      return {
        ok: false,
        reason: 'unreachable',
        detail: 'Could not reach Ollama at ' + host + '. Either it is not running, ' +
                'or it has not been told to accept requests from ' + location.origin + '.'
      };
    }

    if (!res.ok) {
      return { ok: false, reason: 'http', detail: 'Ollama replied ' + res.status + ' ' + res.statusText + '.' };
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      return { ok: false, reason: 'parse', detail: 'Ollama returned a response that was not valid JSON.' };
    }

    const models = (data.models || []).map(m => m.name).filter(Boolean);
    if (!models.length) {
      return {
        ok: false,
        reason: 'no-models',
        detail: 'Ollama is running but has no models installed. Pull one first, for example: ollama pull llama3.2'
      };
    }

    // Keep a previously chosen model only if it is still installed.
    if (!model || !models.includes(model)) setModel(models[0]);

    return { ok: true, models };
  }

  /**
   * Stream a chat completion. Calls onToken(text) for each chunk as it arrives.
   * `messages` is [{ role, content }]. Returns the full assembled reply.
   * Pass an AbortSignal to allow the caller to stop generation.
   */
  async function chat(messages, onToken, signal) {
    if (!model) throw new Error('No model selected.');

    let res;
    try {
      res = await fetch(host + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal
      });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new Error('Lost connection to Ollama at ' + host + '.');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error('Ollama error ' + res.status + (body ? ': ' + body.slice(0, 200) : ''));
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Ollama streams newline-delimited JSON; the final line may be partial.
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let obj;
        try { obj = JSON.parse(trimmed); } catch (e) { continue; }
        if (obj.error) throw new Error(obj.error);
        const piece = obj.message && obj.message.content;
        if (piece) {
          full += piece;
          if (onToken) onToken(piece);
        }
      }
    }

    return full;
  }

  return { probe, chat, getHost, setHost, getModel, setModel, DEFAULT_HOST };
})();
