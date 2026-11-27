// RP1 tracker: talks to the Apps Script backend. Shared by every page.
// The script URL and key are kept in this browser only (localStorage), never in the repo.
(function () {
  const LS_URL = 'rp1.scriptUrl';
  const LS_KEY = 'rp1.key';
  const LS_TOK = 'rp1.idToken';
  const cfg = window.RP1_CONFIG || {};
  const cfgUrl = /^https:\/\/script\.google\.com\/.+\/exec$/.test(cfg.scriptUrl || '') ? cfg.scriptUrl : '';
  const store = {
    get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };
  const api = {
    get url() { return cfgUrl || store.get(LS_URL); },
    get urlFromConfig() { return !!cfgUrl; },
    get key() { return store.get(LS_KEY); },
    get ready() { return !!(api.url && api.key); },
    save(url, key) { if (!cfgUrl) store.set(LS_URL, (url || '').trim()); store.set(LS_KEY, (key || '').trim()); },
    forget() { store.set(LS_URL, ''); store.set(LS_KEY, ''); },
    // Google ID token from Sign in with Google, kept until it expires (about an hour).
    get token() {
      try { const t = JSON.parse(localStorage.getItem(LS_TOK) || 'null'); return t && t.exp > Date.now() / 1000 + 60 ? t.v : ''; } catch (e) { return ''; }
    },
    setToken(v) {
      if (!v) { store.set(LS_TOK, ''); return; }
      let exp = 0; try { exp = JSON.parse(atob(v.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp; } catch (e) { exp = Date.now() / 1000 + 3000; }
      store.set(LS_TOK, JSON.stringify({ v, exp }));
    },
    // Called when the script says the sign-in is missing or expired. auth.js sets this.
    onSignInNeeded: null,
    // POST as text/plain so the browser sends it without a CORS preflight (Apps Script can't answer one).
    async call(action, payload) {
      if (!api.ready) throw new Error('Not connected: enter the script URL and key first.');
      let res;
      try {
        res = await fetch(api.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, key: api.key, idToken: api.token }, payload || {})) });
      } catch (e) {
        throw new Error('Could not reach the script. Check the URL (it should end in /exec) and that the deployment allows "Anyone".');
      }
      const text = await res.text();
      let out;
      try { out = JSON.parse(text); } catch (e) { throw new Error('The script answered with something that isn’t JSON. Usually the URL is wrong or the deployment needs "Anyone" access.'); }
      if (!out.ok) {
        const err = new Error(out.error || 'The script reported an error.'); err.code = out.code;
        if (out.code === 'signin') { api.setToken(''); if (api.onSignInNeeded) api.onSignInNeeded(err.message); }
        throw err;
      }
      return out;
    },
    ping() { return api.call('ping'); },
    setup() { return api.call('setup'); },
    read(tabs) { return api.call('read', { tabs }).then((o) => o.data); },
    write(ops) { return api.call('write', { ops }); },
    listFiles(folder) { return api.call('listFiles', { folder }).then((o) => o.files); },
    readFile(fileId) { return api.call('readFile', { fileId }); },
    uploadFile(folder, name, text, ifExists) { return api.call('uploadFile', { folder, name, text, ifExists }); },
  };
  window.RP1 = window.RP1 || {};
  window.RP1.api = api;
})();
