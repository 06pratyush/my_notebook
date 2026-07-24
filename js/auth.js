/**
 * auth.js — GitHub PAT Authentication
 * Only TheQMLGuy account is authorised for admin mode.
 */
window.NBAuth = (() => {
  const TOKEN_KEY = 'nb_github_token';
  const USER_KEY = 'nb_github_user';
  const AUTHORED_USER = 'TheQMLGuy';
  const API = 'https://api.github.com';

  let currentUser = null;
  let token = null;

  function init() {
    token = localStorage.getItem(TOKEN_KEY);
    const saved = localStorage.getItem(USER_KEY);
    if (token && saved) {
      try { currentUser = JSON.parse(saved); } catch (e) { currentUser = null; }
    }
    updateUI();
  }

  function isLoggedIn() { return !!token && !!currentUser; }
  function isAdmin() { return isLoggedIn() && currentUser.login === AUTHORED_USER; }
  function getToken() { return token; }
  function getUser() { return currentUser; }

  async function login(t) {
    const res = await fetch(API + '/user', {
      headers: { 'Authorization': 'Bearer ' + t, 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) throw new Error('Invalid token or rate limited.');
    const user = await res.json();
    if (user.login !== AUTHORED_USER) {
      throw new Error('Account "' + user.login + '" is not authorised. Only ' + AUTHORED_USER + ' has admin access.');
    }
    token = t;
    currentUser = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    document.body.classList.add('admin-mode');
    updateUI();
    return currentUser;
  }

  function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.body.classList.remove('admin-mode');
    updateUI();
  }

  function updateUI() {
    const btn = document.getElementById('fbtn-edit');
    if (!btn) return;
    if (isAdmin()) {
      btn.textContent = '✎ ' + currentUser.login;
      btn.classList.add('solid');
    } else {
      btn.textContent = '✎ Edit';
      btn.classList.remove('solid');
    }
  }

  async function apiCall(method, path, body) {
    if (!token) throw new Error('Not logged in.');
    const opts = {
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'GitHub API error ' + res.status);
    }
    return res.json();
  }

  return { init, isLoggedIn, isAdmin, getToken, getUser, login, logout, apiCall };
})();
