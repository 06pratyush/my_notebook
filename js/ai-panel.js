/**
 * ai-panel.js — Collapsible AI chat side panel.
 *
 * Opens as a real side panel: the notebook reflows to sit beside it rather than
 * being covered, which is why this is not one of the .fl-overlay modals.
 *
 * Answers are grounded in the current notebook's text. The model is instructed
 * to work only from that content and to say plainly when the notebook does not
 * cover something, so the chat never quietly invents notebook material.
 */
window.NBAIPanel = (() => {
  const OPEN_KEY = 'nb_ai_panel_open';
  const MAX_CONTEXT_CHARS = 12000;

  let panel = null;
  let messagesEl = null;
  let inputEl = null;
  let sendBtn = null;
  let statusEl = null;
  let modelSel = null;
  let history = [];
  let inFlight = null;

  function init() {
    panel = document.getElementById('fl-ai');
    if (!panel) return;
    render();
    if (localStorage.getItem(OPEN_KEY) === '1') open();
  }

  function render() {
    panel.innerHTML =
      '<div class="ai-head">' +
        '<div class="ai-title">Ask the notebook</div>' +
        '<button class="ai-close" title="Close panel">×</button>' +
      '</div>' +
      '<div class="ai-conn">' +
        '<select class="ai-model" title="Installed Ollama models"></select>' +
        '<button class="ai-reconnect fl-btn" title="Re-check connection">↻</button>' +
      '</div>' +
      '<div class="ai-status"></div>' +
      '<div class="ai-messages"></div>' +
      '<div class="ai-composer">' +
        '<textarea class="ai-input" rows="2" placeholder="Ask about this notebook…"></textarea>' +
        '<button class="ai-send fl-btn solid">Send</button>' +
      '</div>';

    messagesEl = panel.querySelector('.ai-messages');
    inputEl = panel.querySelector('.ai-input');
    sendBtn = panel.querySelector('.ai-send');
    statusEl = panel.querySelector('.ai-status');
    modelSel = panel.querySelector('.ai-model');

    panel.querySelector('.ai-close').onclick = close;
    panel.querySelector('.ai-reconnect').onclick = connect;
    sendBtn.onclick = onSend;

    modelSel.onchange = () => NBOllama.setModel(modelSel.value);

    inputEl.addEventListener('keydown', (e) => {
      // Enter sends; Shift+Enter inserts a newline.
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
    });
  }

  function open() {
    panel.classList.add('open');
    document.body.classList.add('ai-open');
    localStorage.setItem(OPEN_KEY, '1');
    const btn = document.getElementById('fbtn-ai');
    if (btn) btn.classList.add('solid');
    if (!history.length) connect();
    setTimeout(() => inputEl && inputEl.focus(), 220);
  }

  function close() {
    panel.classList.remove('open');
    document.body.classList.remove('ai-open');
    localStorage.setItem(OPEN_KEY, '0');
    const btn = document.getElementById('fbtn-ai');
    if (btn) btn.classList.remove('solid');
  }

  function toggle() {
    if (panel.classList.contains('open')) close();
    else open();
  }

  async function connect() {
    setStatus('Connecting to Ollama…', 'busy');
    modelSel.innerHTML = '';
    const result = await NBOllama.probe();

    if (!result.ok) {
      setStatus(result.detail, 'error');
      showSetupHelp(result.reason);
      sendBtn.disabled = true;
      return;
    }

    for (const m of result.models) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      modelSel.appendChild(opt);
    }
    modelSel.value = NBOllama.getModel();
    sendBtn.disabled = false;

    // Clear any setup instructions left over from a previous failed attempt.
    const staleHelp = messagesEl.querySelector('.ai-help');
    if (staleHelp) staleHelp.remove();

    const n = countPassages();
    setStatus(
      'Connected. ' + (n ? 'Reading ' + n + ' passage' + (n === 1 ? '' : 's') + ' from this notebook.'
                         : 'This notebook is empty, so answers will be limited.'),
      'ok'
    );
  }

  function showSetupHelp(reason) {
    if (reason === 'no-models') return; // detail already says what to do
    const help = document.createElement('div');
    help.className = 'ai-help';
    help.innerHTML =
      '<div class="ai-help-title">To connect</div>' +
      '<ol>' +
        '<li>Install and start Ollama.</li>' +
        '<li>Allow this site to reach it, then restart Ollama:' +
          '<code>OLLAMA_ORIGINS=' + escapeHTML(location.origin) + ' ollama serve</code></li>' +
        '<li>Pull a model if you have none: <code>ollama pull llama3.2</code></li>' +
        '<li>Press ↻ above to retry.</li>' +
      '</ol>' +
      '<div class="ai-help-note">Ollama runs on your own machine, so this panel only works for ' +
      'someone who has it running. Visitors without it still read the notebook normally.</div>';
    messagesEl.innerHTML = '';
    messagesEl.appendChild(help);
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'ai-status ' + (kind || '');
  }

  /** Collect the rendered notebook text that answers must be grounded in. */
  function gatherContext() {
    const nb = window.NBPassages && NBPassages.getCurrentNotebook();
    const title = (nb && nb.title) || 'Untitled notebook';
    const parts = [];

    document.querySelectorAll('#fl-content article').forEach(art => {
      const heading = art.querySelector('h2');
      const body = art.innerText.replace(/\s+\n/g, '\n').trim();
      if (body) parts.push('--- ' + ((heading && heading.textContent.trim()) || art.id) + ' ---\n' + body);
    });

    let joined = parts.join('\n\n');
    let truncated = false;
    if (joined.length > MAX_CONTEXT_CHARS) {
      joined = joined.slice(0, MAX_CONTEXT_CHARS);
      truncated = true;
    }

    return { title, text: joined, truncated, count: parts.length };
  }

  function countPassages() {
    return document.querySelectorAll('#fl-content article').length;
  }

  function buildSystemPrompt(ctx) {
    return [
      'You answer questions about a personal study notebook titled "' + ctx.title + '".',
      '',
      'Rules:',
      '- Answer only from the notebook content given below.',
      '- If the notebook does not cover the question, say so plainly instead of ' +
        'filling the gap with outside knowledge.',
      '- Do not invent passages, sections, figures, or citations.',
      '- Quote the notebook when it helps, and keep answers concise.',
      ctx.truncated ? '- The content below was truncated, so some passages may be missing.' : '',
      '',
      ctx.text ? 'NOTEBOOK CONTENT:\n' + ctx.text : 'NOTEBOOK CONTENT: (this notebook is currently empty)'
    ].filter(Boolean).join('\n');
  }

  async function onSend() {
    const q = inputEl.value.trim();
    if (!q || inFlight) return;

    inputEl.value = '';
    addMessage('user', q);
    history.push({ role: 'user', content: q });

    const bubble = addMessage('assistant', '');
    bubble.classList.add('streaming');
    sendBtn.disabled = true;

    const ctx = gatherContext();
    const messages = [{ role: 'system', content: buildSystemPrompt(ctx) }, ...history];

    inFlight = new AbortController();
    let acc = '';

    try {
      await NBOllama.chat(messages, (piece) => {
        acc += piece;
        bubble.textContent = acc;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }, inFlight.signal);

      history.push({ role: 'assistant', content: acc });
      bubble.classList.remove('streaming');
    } catch (e) {
      bubble.classList.remove('streaming');
      bubble.classList.add('ai-error');
      bubble.textContent = e.name === 'AbortError' ? 'Stopped.' : e.message;
      // Drop the user turn that failed, so retrying does not resend it twice.
      history.pop();
    } finally {
      inFlight = null;
      sendBtn.disabled = false;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function addMessage(role, text) {
    const help = messagesEl.querySelector('.ai-help');
    if (help) help.remove();

    const row = document.createElement('div');
    row.className = 'ai-msg ai-' + role;
    row.textContent = text;
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return row;
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { init, open, close, toggle };
})();
