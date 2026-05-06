// Shared utilities for grok-install pages.
// Loaded as a plain script (no module). Exposes globals:
//   escapeHtml(s)              — canonical HTML-escaper used across pages
//   clearAuthLocalState()      — clears all four auth-related localStorage keys
//   getWorkerUrl()             — reads <meta name="worker-url"> as the single source of truth

(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clearAuthLocalState() {
    try {
      localStorage.removeItem('grok_session_id');
      localStorage.removeItem('grok_authed');
      localStorage.removeItem('ghHandle');
      localStorage.removeItem('quickMintPending');
    } catch (e) { /* private mode / disabled storage */ }
  }

  function getWorkerUrl() {
    var meta = document.querySelector('meta[name="worker-url"]');
    return (meta && meta.content) || '';
  }

  window.escapeHtml = escapeHtml;
  window.clearAuthLocalState = clearAuthLocalState;
  window.getWorkerUrl = getWorkerUrl;
})();
