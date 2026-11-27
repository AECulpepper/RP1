// RP1 tracker: Sign in with Google. Every page loads this before its own script.
// Usage: RP1.auth.start({ button: element, onSignedIn(email), onSignedOut(message) })
(function () {
  const cfg = window.RP1_CONFIG || {};
  const api = window.RP1.api;
  const auth = {
    configured: /\.apps\.googleusercontent\.com$/.test(cfg.clientId || ''),
    email: '',
    _opts: null,
    _ready: false,
    start(opts) {
      auth._opts = opts;
      api.onSignInNeeded = (msg) => auth._out(msg || 'Please sign in again.');
      if (!auth.configured) { auth._out('Sign-in isn’t set up yet: the Client ID in js/config.js is still the placeholder.'); return; }
      const tok = api.token;
      if (tok) { auth.email = auth._emailOf(tok); opts.onSignedIn(auth.email); }
      auth._load().then(() => {
        google.accounts.id.initialize({ client_id: cfg.clientId, callback: auth._got, auto_select: true, itp_support: true, use_fedcm_for_prompt: true });
        auth._ready = true;
        auth._button();
        if (!api.token) google.accounts.id.prompt();
      }).catch(() => auth._out('Couldn’t load Google sign-in. Check your connection or content blockers, then reload.'));
    },
    signOut() {
      api.setToken('');
      if (auth._ready) google.accounts.id.disableAutoSelect();
      auth._out('Signed out.');
    },
    _got(resp) {
      if (!resp || !resp.credential) return;
      api.setToken(resp.credential);
      auth.email = auth._emailOf(resp.credential);
      auth._opts.onSignedIn(auth.email);
    },
    _out(msg) {
      auth.email = '';
      auth._button();
      if (auth._ready && !api.token) { try { google.accounts.id.prompt(); } catch (e) { /* the button still works */ } }
      if (auth._opts) auth._opts.onSignedOut(msg);
    },
    _button() {
      const el = auth._opts && auth._opts.button;
      if (!el || !auth._ready) return;
      el.replaceChildren();
      google.accounts.id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill' });
    },
    _emailOf(tok) { try { return JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || ''; } catch (e) { return ''; } },
    _load() {
      if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
        s.onload = resolve; s.onerror = reject;
        document.head.append(s);
      });
    },
  };
  window.RP1.auth = auth;
})();
