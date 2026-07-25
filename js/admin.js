/**
 * admin.js — Admin editing: spark sections, artifacts, passage content
 * Uses GitHub Contents API to save changes.
 */
window.NBAdmin = (() => {
  const REPO = '06pratyush/my_notebook';
  const BRANCH = 'main';
  let passMeta = {}; // id -> { path, sha }

  function init(metadata) {
    passMeta = metadata || {};
    if (NBAuth.isAdmin()) document.body.classList.add('admin-mode');
    setupLoginModal();
    setupEditButton();
  }

  function setupLoginModal() {
    const modal = document.getElementById('fl-login');
    const tokenInput = document.getElementById('fl-login-token');
    const errorDiv = document.getElementById('fl-login-error');
    const submitBtn = document.getElementById('fl-login-submit');
    const cancelBtn = document.getElementById('fl-login-cancel');
    const editBtn = document.getElementById('fbtn-edit');

    editBtn.onclick = () => {
      if (NBAuth.isAdmin()) {
        NBAuth.logout();
        removeEditControls();
        return;
      }
      modal.style.display = 'flex';
      tokenInput.value = '';
      errorDiv.style.display = 'none';
      tokenInput.focus();
    };

    submitBtn.onclick = async () => {
      const t = tokenInput.value.trim();
      if (!t) return;
      submitBtn.disabled = true;
      errorDiv.style.display = 'none';
      try {
        await NBAuth.login(t);
        modal.style.display = 'none';
        addEditControls();
      } catch (e) {
        errorDiv.textContent = e.message;
        errorDiv.style.display = 'block';
      }
      submitBtn.disabled = false;
    };

    cancelBtn.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    tokenInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
  }

  function setupEditButton() {
    if (NBAuth.isAdmin()) addEditControls();
  }

  function addEditControls() {
    document.querySelectorAll('.spark-section').forEach(el => addEditBtn(el, 'spark'));
    document.querySelectorAll('.artifact-container').forEach(el => addEditBtn(el, 'artifact'));
  }

  function removeEditControls() {
    document.querySelectorAll('.admin-edit-btn').forEach(b => b.remove());
  }

  function addEditBtn(container, type) {
    if (container.querySelector('.admin-edit-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'admin-edit-btn';
    btn.textContent = type === 'spark' ? '✎ Spark' : '✎ Artifact';
    btn.onclick = (e) => { e.stopPropagation(); startEdit(container, type); };
    container.appendChild(btn);
  }

  function startEdit(container, type) {
    const existing = container.querySelector('.admin-editor');
    if (existing) return;

    const currentHTML = container.innerHTML.replace(/<button[^>]*class="admin-edit-btn"[^>]*>.*?<\/button>/g, '').trim();

    const editor = document.createElement('div');
    editor.className = 'admin-editor-wrap';

    const ta = document.createElement('textarea');
    ta.className = 'admin-editor';
    ta.value = currentHTML;

    const bar = document.createElement('div');
    bar.className = 'admin-save-bar';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'fl-btn solid';
    saveBtn.textContent = 'Save to repo';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'fl-btn';
    cancelBtn.textContent = 'Cancel';

    const statusSpan = document.createElement('span');
    statusSpan.style.cssText = 'font-style: italic; color: #6b675a; font-size: 14px; align-self: center;';

    bar.appendChild(saveBtn);
    bar.appendChild(cancelBtn);
    bar.appendChild(statusSpan);
    editor.appendChild(ta);
    editor.appendChild(bar);

    const editBtn = container.querySelector('.admin-edit-btn');
    if (editBtn) editBtn.style.display = 'none';
    container.appendChild(editor);

    cancelBtn.onclick = () => { editor.remove(); if (editBtn) editBtn.style.display = ''; };

    saveBtn.onclick = async () => {
      const newHTML = ta.value.trim();
      statusSpan.textContent = 'Saving…';
      saveBtn.disabled = true;

      try {
        const artId = container.closest('article')?.id;
        const passagePath = passMeta[artId]?.path;
        if (!passagePath) throw new Error('No path found for passage ' + artId);

        const fileRes = await NBAuth.apiCall('GET', '/repos/' + REPO + '/contents/' + passagePath + '?ref=' + BRANCH);
        const currentContent = decodeURIComponent(escape(atob(fileRes.content)));

        let updated;
        if (type === 'spark') {
          updated = currentContent.replace(
            /(<div class="spark-section">)([\s\S]*?)(<\/div>\s*<div class="artifact-container")/,
            '$1\n' + newHTML + '\n$3'
          );
        } else {
          updated = currentContent.replace(
            /(<div class="artifact-container">)([\s\S]*?)(<\/div>\s*(?:<div class="bound"|<\/article>))/,
            '$1\n' + newHTML + '\n$3'
          );
        }

        await NBAuth.apiCall('PUT', '/repos/' + REPO + '/contents/' + passagePath, {
          message: 'Update ' + type + ' for ' + artId,
          content: btoa(unescape(encodeURIComponent(updated))),
          sha: fileRes.sha,
          branch: BRANCH
        });

        statusSpan.textContent = 'Saved!';
        setTimeout(() => {
          editor.remove();
          if (type === 'spark') container.innerHTML = newHTML;
          else container.innerHTML = newHTML;
          if (editBtn) editBtn.style.display = '';
        }, 800);
      } catch (e) {
        statusSpan.textContent = 'Error: ' + e.message;
        saveBtn.disabled = false;
      }
    };
  }

  function setPassageMeta(meta) { passMeta = meta; }

  return { init, setPassageMeta, addEditControls };
})();
