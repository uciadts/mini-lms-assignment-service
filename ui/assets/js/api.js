/*
 * api.js : semua panggilan ke API lewat satu pintu.
 * Tugasnya: menambah header (token, X-Request-ID), menunggu jawaban, menyeragamkan hasil,
 * dan mencatat setiap request ke "Jejak request".
 */
(function () {
  'use strict';

  var cfg = window.LMS_CONFIG;
  var memory = {};          // cadangan jika penyimpanan browser diblokir
  var traceLog = [];        // catatan request terbaru (paling baru di depan)
  var traceListeners = [];

  // ---------- Penyimpanan token ----------
  function store(key, value) {
    try {
      if (value === null) { localStorage.removeItem(key); } else { localStorage.setItem(key, value); }
    } catch (e) {
      if (value === null) { delete memory[key]; } else { memory[key] = value; }
    }
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return memory[key] || null; }
  }

  function getToken() { return load(cfg.TOKEN_KEY); }
  function setToken(t) { store(cfg.TOKEN_KEY, t); }
  function clearToken() { store(cfg.TOKEN_KEY, null); store(cfg.USER_KEY, null); }

  function getUser() {
    try { return JSON.parse(load(cfg.USER_KEY) || 'null'); } catch (e) { return null; }
  }
  function setUser(u) { store(cfg.USER_KEY, JSON.stringify(u)); }

  // Membaca isi (payload) token JWT tanpa memverifikasi. Hanya untuk menampilkan nama dan masa berlaku.
  function decodeToken(token) {
    try {
      var p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (p.length % 4) { p += '='; }
      var bytes = Uint8Array.from(atob(p), function (c) { return c.charCodeAt(0); });
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return null;
    }
  }

  // ---------- Jejak request ----------
  function onTrace(fn) { traceListeners.push(fn); }
  function record(entry) {
    traceLog.unshift(entry);
    if (traceLog.length > 8) { traceLog.pop(); }
    traceListeners.forEach(function (fn) { fn(traceLog); });
  }

  // ---------- Satu request ----------
  // Hasil selalu berbentuk { ok, status, data, meta, error } sehingga pemanggil tidak perlu try/catch.
  function request(method, path, options) {
    options = options || {};
    var rid = 'ui-' + Date.now().toString(36);
    var headers = { 'X-Request-ID': rid, 'Accept': 'application/json' };
    var init = { method: method, headers: headers };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    if (options.auth !== false && getToken()) {
      headers['Authorization'] = 'Bearer ' + getToken();
    }

    var controller = new AbortController();
    init.signal = controller.signal;
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; controller.abort(); }, cfg.TIMEOUT_MS);
    var started = performance.now();

    return fetch(cfg.API_BASE + path, init)
      .then(function (res) {
        return res.json().catch(function () { return null; }).then(function (json) {
          return { status: res.status, json: json };
        });
      })
      .catch(function () {
        return { status: 0, json: null, failed: timedOut ? 'timeout' : 'network' };
      })
      .then(function (raw) {
        clearTimeout(timer);
        var ms = Math.round(performance.now() - started);
        var json = raw.json;
        var meta = json && json.meta ? json.meta : {};
        var good = raw.status >= 200 && raw.status < 300 && json && json.success === true;

        record({
          time: new Date(),
          method: method,
          path: path,
          status: raw.status,
          ms: ms,
          rid: meta.request_id || rid
        });

        if (good) {
          return { ok: true, status: raw.status, data: json.data, meta: meta };
        }
        var error = (json && json.error) ? json.error : {
          code: raw.failed || 'unexpected_response',
          message: raw.failed === 'timeout' ? 'Permintaan terlalu lama' : 'Tidak ada jawaban yang bisa dibaca'
        };
        return { ok: false, status: raw.status, error: error, meta: meta };
      });
  }

  window.LMS_API = {
    request: request,
    get: function (path) { return request('GET', path); },
    post: function (path, body, options) {
      options = options || {};
      options.body = body;
      return request('POST', path, options);
    },
    del: function (path) { return request('DELETE', path); },
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    getUser: getUser,
    setUser: setUser,
    decodeToken: decodeToken,
    onTrace: onTrace,
    getTrace: function () { return traceLog; }
  };
})();
