/*
 * app.js : isi halaman. Bagian-bagiannya, dari atas ke bawah:
 *   1. alat bantu kecil (aman-kan teks, tanggal, pesan singkat)
 *   2. menerjemahkan kegagalan API menjadi kalimat yang bisa ditindaklanjuti
 *   3. halaman masuk (login)
 *   4. halaman tugas: daftar, detail, buat, hapus
 *   5. jejak request
 *   6. start
 */
(function () {
  'use strict';

  var cfg = window.LMS_CONFIG;
  var api = window.LMS_API;

  var app = document.getElementById('app');
  var state = {
    user: null,
    course: cfg.COURSES[0],
    items: [],
    loadSeq: 0
  };

  /* =====================================================================
   * 1. Alat bantu
   * ===================================================================== */

  function $(selector, root) { return (root || document).querySelector(selector); }

  // Semua teks dari server dimasukkan lewat esc() agar tidak dibaca sebagai HTML.
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function parseDate(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function daysFromToday(date) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((date - today) / 86400000);
  }

  // Mengubah "2026-11-13" menjadi bagian-bagian untuk blok tenggat di kiri baris.
  function dueInfo(text) {
    var d = parseDate(text);
    if (!d) {
      return { kind: 'none', day: '–', month: text ? esc(text) : 'Tanpa tenggat', note: '' };
    }
    var n = daysFromToday(d);
    var kind, note;
    if (n < 0) { kind = 'late'; note = 'Lewat ' + (-n) + ' hari'; }
    else if (n === 0) { kind = 'today'; note = 'Hari ini'; }
    else if (n === 1) { kind = 'soon'; note = 'Besok'; }
    else if (n <= 7) { kind = 'soon'; note = n + ' hari lagi'; }
    else { kind = 'ok'; note = n + ' hari lagi'; }
    return { kind: kind, day: d.getDate(), month: MONTHS[d.getMonth()] + ' ' + d.getFullYear(), note: note };
  }

  function longDate(text) {
    var d = parseDate(text);
    return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : (text || 'Tanpa tenggat');
  }

  function toast(message) {
    var box = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 4500);
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function clock(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }

  /* =====================================================================
   * 2. Menerjemahkan kegagalan API
   * Setiap hasil gagal dari api.js punya status HTTP dan error.code.
   * Di sini kode itu diubah menjadi judul + langkah perbaikan.
   * ===================================================================== */

  var ASSIGNMENT_NAME = 'Assignment Service (port 8104)';

  // `target` = service yang sedang dituju request ini, dipakai saat Gateway hanya menjawab "service tujuan mati".
  function explain(res, target) {
    var e = res.error || {};
    var code = e.code || '';
    var msg = e.message || '';
    target = target || ASSIGNMENT_NAME;

    if (code === 'gateway_unavailable') {
      return { title: 'API Gateway tidak menyala', hint: 'Nyalakan Gateway (port 8101), lalu coba lagi.' };
    }
    if (res.status === 0 && code === 'timeout') {
      return { title: 'Permintaan terlalu lama', hint: 'Server tidak menjawab dalam ' + (cfg.TIMEOUT_MS / 1000) + ' detik. Coba lagi.' };
    }
    if (res.status === 0) {
      return { title: 'Server web tidak menjawab', hint: 'Pastikan perintah php -S untuk web ini masih berjalan, lalu muat ulang halaman.' };
    }
    if (res.status === 401) {
      return { title: 'Sesi tidak berlaku', hint: 'Token tidak ada, salah, atau sudah kedaluwarsa. Masuk lagi.' };
    }
    if (res.status === 404 && code === 'course_not_found') {
      return { title: 'Course tidak ditemukan', hint: 'Course Service tidak mengenal course ini. Periksa penulisan course_id.' };
    }
    if (res.status === 404 && code === 'assignment_not_found') {
      return { title: 'Tugas tidak ditemukan', hint: 'Mungkin sudah dihapus. Daftar dimuat ulang.' };
    }
    if (res.status === 400 || res.status === 415) {
      return { title: msg || 'Isian belum benar', hint: 'Periksa isian lalu kirim lagi.' };
    }
    if (res.status === 503 && msg.indexOf('Service tujuan') === 0) {
      // Pesan dari Gateway: service yang kita tuju mati.
      return { title: target + ' tidak menyala', hint: 'Nyalakan service itu, lalu coba lagi.' };
    }
    if (res.status === 503) {
      // Pesan dari Assignment: Authentication atau Course yang mati, namanya sudah ada di pesan.
      return { title: msg || 'Layanan tidak dapat dihubungi', hint: 'Nyalakan service yang disebut pada pesan, lalu coba lagi.' };
    }
    if (res.status === 504) {
      return { title: msg || 'Layanan terlalu lama menjawab', hint: 'Service tujuan melewati batas waktu. Coba lagi sebentar lagi.' };
    }
    return { title: msg || 'Terjadi kesalahan', hint: 'Kode status ' + res.status + '. Lihat tabel Jejak request di bawah.' };
  }

  function alertHtml(info, retryLabel) {
    return '<div class="alert" role="alert"><strong>' + esc(info.title) + '</strong>' + esc(info.hint) +
      (retryLabel ? '<div class="alert-actions"><button type="button" class="btn ghost small" data-act="retry">' + esc(retryLabel) + '</button></div>' : '') +
      '</div>';
  }

  // Dipakai semua panggilan yang butuh token: jika 401, kembali ke halaman masuk.
  function sessionLost() {
    api.clearToken();
    state.user = null;
    renderLogin({ title: 'Sesi berakhir', hint: 'Masuk lagi untuk melanjutkan.' });
  }

  /* =====================================================================
   * 3. Halaman masuk
   * ===================================================================== */

  function renderLogin(notice) {
    document.title = 'Masuk | Mini LMS';
    var demo = '';
    if (cfg.SHOW_DEMO_ACCOUNTS && cfg.DEMO_ACCOUNTS.length) {
      demo = '<div class="demo"><p>Akun contoh dari Authentication Service. Klik untuk mengisi.</p><div class="demo-list">' +
        cfg.DEMO_ACCOUNTS.map(function (a, i) {
          return '<button type="button" class="btn ghost small" data-demo="' + i + '">' + esc(a.username) + ' (' + esc(a.role) + ')</button>';
        }).join('') + '</div></div>';
    }

    app.innerHTML =
      '<main class="login"><div class="login-box">' +
        '<p class="brand"><span class="brand-mark">Tugas</span> Mini LMS</p>' +
        '<div><h1>Masuk</h1><p class="lead" style="margin-top:8px">Akun diperiksa oleh Authentication Service. Halaman ini tidak menyimpan kata sandi.</p></div>' +
        '<div id="login-alert">' + (notice ? alertHtml(notice) : '') + '</div>' +
        '<form id="login-form" novalidate>' +
          '<div class="field"><label for="username">Username</label>' +
            '<input class="input" id="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false"></div>' +
          '<div class="field"><label for="password">Kata sandi</label>' +
            '<input class="input" id="password" name="password" type="password" autocomplete="current-password"></div>' +
          '<button class="btn primary" type="submit" id="login-submit">Masuk</button>' +
        '</form>' + demo +
      '</div></main>';

    $('#username').focus();
  }

  function onLoginSubmit(form) {
    var username = form.username.value.trim();
    var password = form.password.value;
    var box = $('#login-alert');

    if (!username || !password) {
      box.innerHTML = alertHtml({ title: 'Username dan kata sandi wajib diisi', hint: 'Isi keduanya, atau klik salah satu akun contoh.' });
      (username ? form.password : form.username).focus();
      return;
    }

    var button = $('#login-submit');
    button.disabled = true;
    button.textContent = 'Memeriksa…';
    box.innerHTML = '';

    api.post('/api/auth/login', { username: username, password: password }, { auth: false }).then(function (res) {
      button.disabled = false;
      button.textContent = 'Masuk';

      if (!res.ok) {
        var info = res.status === 401
          ? { title: 'Username atau kata sandi salah', hint: 'Periksa lagi isian Anda.' }
          : explain(res, 'Authentication Service (port 8102)');
        box.innerHTML = alertHtml(info);
        return;
      }

      var data = res.data || {};
      var token = data.token;
      if (!token) {
        box.innerHTML = alertHtml({ title: 'Respons login tidak berisi token', hint: 'Periksa kontrak Authentication Service (data.token).' });
        return;
      }
      var payload = api.decodeToken(token) || {};
      var u = data.user || {};
      api.setToken(token);
      state.user = {
        name: u.name || u.full_name || payload.name || u.username || payload.username || username,
        role: u.role || payload.role || ''
      };
      api.setUser(state.user);
      renderMain();
    });
  }

  /* =====================================================================
   * 4. Halaman tugas
   * ===================================================================== */

  function courseOptions() {
    var list = cfg.COURSES.slice();
    if (list.indexOf(state.course) === -1) { list.push(state.course); }
    return list;
  }

  function renderMain() {
    document.title = 'Tugas | Mini LMS';
    var u = state.user || {};

    app.innerHTML =
      '<header class="topbar"><div class="topbar-inner">' +
        '<p class="brand"><span class="brand-mark">Tugas</span> Mini LMS</p>' +
        '<div class="who">' +
          '<div class="who-text"><span class="who-name">' + esc(u.name || 'Pengguna') + '</span>' +
          (u.role ? '<span class="who-role">' + esc(u.role) + '</span>' : '') + '</div>' +
          '<button type="button" class="btn ghost small" id="logout">Keluar</button>' +
        '</div>' +
      '</div></header>' +

      '<main class="page">' +
        '<div class="page-head">' +
          '<div><h1>Tugas</h1><p class="sub">Pilih course untuk melihat tugasnya. Setiap tugas milik satu course.</p></div>' +
          '<div class="course-bar">' +
            '<div class="tabs" id="tabs" role="group" aria-label="Pilih course"></div>' +
            '<form class="course-other" id="course-form" novalidate>' +
              '<div class="field"><label for="course-other">Course lain</label>' +
              '<input class="input" id="course-other" list="course-options" placeholder="course-003" autocomplete="off" spellcheck="false"></div>' +
              '<button class="btn ghost" type="submit">Buka</button>' +
            '</form>' +
          '</div>' +
        '</div>' +

        '<div class="grid">' +
          '<section class="panel" aria-labelledby="list-title">' +
            '<div class="panel-head">' +
              '<h2 id="list-title"></h2>' +
              '<button type="button" class="btn ghost small" id="reload">Muat ulang</button>' +
            '</div>' +
            '<div id="list-alert" class="list-alert"></div>' +
            '<div id="list-body" aria-live="polite"></div>' +
          '</section>' +

          '<aside class="panel form-panel" aria-labelledby="form-title">' +
            '<div class="panel-head"><h2 id="form-title">Tugas baru</h2></div>' +
            '<div class="panel-body">' +
              '<div id="form-alert"></div>' +
              '<form id="create-form" novalidate>' +
                '<div class="field"><label for="f-course">Course</label>' +
                  '<input class="input" id="f-course" name="course_id" list="course-options" autocomplete="off" spellcheck="false">' +
                  '<p class="field-error" id="e-course" hidden></p></div>' +
                '<div class="field"><label for="f-title">Judul</label>' +
                  '<input class="input" id="f-title" name="title" maxlength="120" autocomplete="off">' +
                  '<p class="field-error" id="e-title" hidden></p></div>' +
                '<div class="field"><label for="f-desc">Deskripsi <span class="hint">(boleh kosong)</span></label>' +
                  '<textarea class="input" id="f-desc" name="description" maxlength="500"></textarea></div>' +
                '<div class="field"><label for="f-due">Tenggat <span class="hint">(boleh kosong)</span></label>' +
                  '<input class="input" id="f-due" name="due_date" type="date"></div>' +
                '<button type="submit" class="btn primary" id="create-submit">Buat tugas</button>' +
              '</form>' +
            '</div>' +
          '</aside>' +
        '</div>' +

        '<section class="panel" aria-labelledby="trace-title">' +
          '<div class="panel-head"><h2 id="trace-title">Jejak request</h2></div>' +
          '<p class="trace-note">Setiap aksi di halaman ini adalah request ke API Gateway. Tabel ini mencatat 8 request terakhir beserta status HTTP-nya.</p>' +
          '<div id="trace-body"></div>' +
        '</section>' +

        '<datalist id="course-options"></datalist>' +
      '</main>';

    renderCourseControls();
    renderTrace(api.getTrace());
    loadList();
  }

  // Tab course, daftar saran, dan isian course di form mengikuti state.course.
  function renderCourseControls() {
    var options = courseOptions();
    $('#tabs').innerHTML = options.map(function (id) {
      return '<button type="button" class="tab" data-course="' + esc(id) + '" aria-pressed="' + (id === state.course) + '">' + esc(id) + '</button>';
    }).join('');
    $('#course-options').innerHTML = options.map(function (id) { return '<option value="' + esc(id) + '">'; }).join('');
    $('#f-course').value = state.course;
    $('#list-title').innerHTML = esc(state.course) + '<span class="count" id="count"></span>';
  }

  function selectCourse(id) {
    id = (id || '').trim();
    if (!id) { return; }
    state.course = id;
    $('#form-alert').innerHTML = '';
    renderCourseControls();
    loadList();
  }

  function sortItems(items) {
    return items.slice().sort(function (a, b) {
      var da = a.due_date || '9999-99-99';
      var db = b.due_date || '9999-99-99';
      return da < db ? -1 : da > db ? 1 : (a.id < b.id ? -1 : 1);
    });
  }

  function loadList(highlightId) {
    var seq = ++state.loadSeq;
    $('#list-alert').innerHTML = '';
    $('#list-body').innerHTML = '<div class="loading">Memuat tugas…</div>';
    $('#count').textContent = '';

    api.get('/api/assignments?course_id=' + encodeURIComponent(state.course)).then(function (res) {
      if (seq !== state.loadSeq) { return; }   // jawaban lama, abaikan

      if (!res.ok) {
        if (res.status === 401) { return sessionLost(); }
        state.items = [];
        $('#list-body').innerHTML = '';
        $('#list-alert').innerHTML = alertHtml(explain(res), 'Coba lagi');
        return;
      }
      state.items = sortItems((res.data && res.data.assignments) || []);
      renderList(highlightId);
    });
  }

  function renderList(highlightId) {
    var n = state.items.length;
    $('#count').textContent = n + ' tugas';

    if (!n) {
      $('#list-body').innerHTML =
        '<div class="empty"><h3>Belum ada tugas di ' + esc(state.course) + '</h3>' +
        '<p>Isi form Tugas baru untuk membuat yang pertama.</p></div>';
      return;
    }

    $('#list-body').innerHTML = '<ul class="rows">' + state.items.map(function (a) {
      var due = dueInfo(a.due_date);
      return '<li class="row' + (a.id === highlightId ? ' is-new' : '') + '" data-id="' + esc(a.id) + '">' +
        '<div class="due due-' + due.kind + '">' +
          '<span class="due-day">' + esc(due.day) + '</span>' +
          '<span class="due-month">' + due.month + '</span>' +
          (due.note ? '<span class="due-note">' + esc(due.note) + '</span>' : '') +
        '</div>' +
        '<div class="row-body">' +
          '<h3>' + esc(a.title) + '</h3>' +
          (a.description ? '<p class="row-desc">' + esc(a.description) + '</p>' : '') +
          '<p class="row-meta"><code class="tag">' + esc(a.id) + '</code></p>' +
        '</div>' +
        '<div class="row-actions">' +
          '<button type="button" class="btn ghost small" data-act="detail" data-id="' + esc(a.id) + '">Detail</button>' +
          '<button type="button" class="btn danger-ghost small" data-act="delete" data-id="' + esc(a.id) + '">Hapus</button>' +
        '</div>' +
      '</li>';
    }).join('') + '</ul>';
  }

  /* ---------- Detail ---------- */

  function openDetail(id) {
    var dlg = $('#detail-dialog');
    dlg.innerHTML = '<div class="dialog-body"><h2 id="detail-title">Detail tugas</h2><p class="lead">Memuat…</p></div>';
    if (!dlg.open) { dlg.showModal(); }

    api.get('/api/assignments/' + encodeURIComponent(id)).then(function (res) {
      if (!res.ok) {
        if (res.status === 401) { dlg.close(); return sessionLost(); }
        dlg.innerHTML =
          '<div class="dialog-body"><h2 id="detail-title">Detail tugas</h2>' + alertHtml(explain(res)) + '</div>' +
          '<div class="dialog-actions"><button type="button" class="btn ghost" data-act="close-dialog">Tutup</button></div>';
        if (res.status === 404) { loadList(); }
        return;
      }
      var a = res.data;
      var due = dueInfo(a.due_date);
      dlg.innerHTML =
        '<div class="dialog-body"><h2 id="detail-title">' + esc(a.title) + '</h2>' +
          '<dl class="detail-list">' +
            '<div><dt>ID tugas</dt><dd><code>' + esc(a.id) + '</code></dd></div>' +
            '<div><dt>Course</dt><dd>' + esc(a.course_id) + '</dd></div>' +
            '<div><dt>Deskripsi</dt><dd class="desc">' + (a.description ? esc(a.description) : 'Tidak ada deskripsi') + '</dd></div>' +
            '<div><dt>Tenggat</dt><dd>' + esc(longDate(a.due_date)) + (due.note ? ' (' + esc(due.note.toLowerCase()) + ')' : '') + '</dd></div>' +
          '</dl></div>' +
        '<div class="dialog-actions">' +
          '<button type="button" class="btn ghost" data-act="close-dialog">Tutup</button>' +
          '<button type="button" class="btn danger-ghost" data-act="delete-from-detail" data-id="' + esc(a.id) + '">Hapus tugas</button>' +
        '</div>';
    });
  }

  /* ---------- Hapus ---------- */

  function openConfirm(id) {
    var item = state.items.filter(function (a) { return a.id === id; })[0] || { id: id, title: '' };
    var dlg = $('#confirm-dialog');
    dlg.innerHTML =
      '<div class="dialog-body"><h2 id="confirm-title">Hapus tugas ini?</h2>' +
        '<p><code class="tag">' + esc(item.id) + '</code> ' + esc(item.title) + '</p>' +
        '<p class="lead">Tugas yang dihapus tidak bisa dikembalikan.</p>' +
        '<div id="confirm-alert"></div></div>' +
      '<div class="dialog-actions">' +
        '<button type="button" class="btn ghost" data-act="close-dialog">Batal</button>' +
        '<button type="button" class="btn danger" id="confirm-go" data-id="' + esc(item.id) + '">Hapus tugas</button>' +
      '</div>';
    dlg.showModal();
    $('#confirm-go').focus();
  }

  function doDelete(id) {
    var go = $('#confirm-go');
    go.disabled = true;
    go.textContent = 'Menghapus…';

    api.del('/api/assignments/' + encodeURIComponent(id)).then(function (res) {
      var dlg = $('#confirm-dialog');
      if (res.ok) {
        dlg.close();
        toast('Tugas ' + id + ' dihapus');
        loadList();
        return;
      }
      if (res.status === 401) { dlg.close(); return sessionLost(); }
      if (res.status === 404) {
        dlg.close();
        toast('Tugas ' + id + ' sudah tidak ada');
        loadList();
        return;
      }
      go.disabled = false;
      go.textContent = 'Hapus tugas';
      $('#confirm-alert').innerHTML = alertHtml(explain(res));
    });
  }

  /* ---------- Buat ---------- */

  function fieldError(inputId, errId, message) {
    var input = document.getElementById(inputId);
    var err = document.getElementById(errId);
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errId);
      err.textContent = message;
      err.hidden = false;
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      err.hidden = true;
    }
  }

  function onCreateSubmit(form) {
    var course = form.course_id.value.trim();
    var title = form.title.value.trim();
    $('#form-alert').innerHTML = '';

    fieldError('f-course', 'e-course', course ? '' : 'Course wajib diisi');
    fieldError('f-title', 'e-title', title ? '' : 'Judul wajib diisi');
    if (!course) { return form.course_id.focus(); }
    if (!title) { return form.title.focus(); }

    var button = $('#create-submit');
    button.disabled = true;
    button.textContent = 'Menyimpan…';

    api.post('/api/assignments', {
      course_id: course,
      title: title,
      description: form.description.value.trim(),
      due_date: form.due_date.value
    }).then(function (res) {
      button.disabled = false;
      button.textContent = 'Buat tugas';

      if (!res.ok) {
        if (res.status === 401) { return sessionLost(); }
        $('#form-alert').innerHTML = alertHtml(explain(res));
        return;
      }

      var created = res.data;
      toast('Tugas dibuat: ' + created.id + ' di ' + created.course_id);
      form.title.value = '';
      form.description.value = '';
      form.due_date.value = '';

      if (created.course_id !== state.course) {
        state.course = created.course_id;
        renderCourseControls();
      }
      loadList(created.id);
    });
  }

  /* =====================================================================
   * 5. Jejak request
   * ===================================================================== */

  function renderTrace(entries) {
    var box = document.getElementById('trace-body');
    if (!box) { return; }
    if (!entries.length) {
      box.innerHTML = '<p class="trace-empty">Belum ada request.</p>';
      return;
    }
    box.innerHTML = '<div class="table-wrap"><table class="trace-table">' +
      '<thead><tr><th>Waktu</th><th>Request</th><th>Status</th><th>Durasi</th><th>ID request</th></tr></thead><tbody>' +
      entries.map(function (t) {
        var cls = 's' + String(t.status).charAt(0);
        return '<tr><td>' + clock(t.time) + '</td>' +
          '<td><code>' + esc(t.method) + ' ' + esc(t.path) + '</code></td>' +
          '<td><span class="status ' + cls + '">' + (t.status || 'gagal') + '</span></td>' +
          '<td>' + t.ms + ' ms</td>' +
          '<td><code>' + esc(t.rid) + '</code></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  api.onTrace(renderTrace);

  /* =====================================================================
   * 6. Penghubung peristiwa dan start
   * Satu pendengar di <body> untuk semua klik dan submit (event delegation),
   * jadi tombol yang dibuat ulang saat render tetap berfungsi.
   * ===================================================================== */

  document.addEventListener('click', function (event) {
    var t = event.target.closest('button');
    if (!t) { return; }

    if (t.dataset.demo !== undefined) {
      var acc = cfg.DEMO_ACCOUNTS[+t.dataset.demo];
      $('#username').value = acc.username;
      $('#password').value = acc.password;
      $('#login-submit').focus();
      return;
    }
    if (t.dataset.course) { return selectCourse(t.dataset.course); }
    if (t.id === 'logout') { api.clearToken(); state.user = null; return renderLogin(); }
    if (t.id === 'reload') { return loadList(); }
    if (t.id === 'confirm-go') { return doDelete(t.dataset.id); }

    switch (t.dataset.act) {
      case 'detail': return openDetail(t.dataset.id);
      case 'delete': return openConfirm(t.dataset.id);
      case 'delete-from-detail': $('#detail-dialog').close(); return openConfirm(t.dataset.id);
      case 'close-dialog': return t.closest('dialog').close();
      case 'retry': return loadList();
    }
  });

  document.addEventListener('submit', function (event) {
    event.preventDefault();
    var form = event.target;
    if (form.id === 'login-form') { return onLoginSubmit(form); }
    if (form.id === 'create-form') { return onCreateSubmit(form); }
    if (form.id === 'course-form') {
      var value = $('#course-other').value;
      $('#course-other').value = '';
      return selectCourse(value);
    }
  });

  // Klik di luar kotak dialog menutupnya.
  document.addEventListener('click', function (event) {
    if (event.target.tagName === 'DIALOG') { event.target.close(); }
  });

  function start() {
    var token = api.getToken();
    var payload = token ? api.decodeToken(token) : null;
    var expired = payload && payload.exp && payload.exp * 1000 < Date.now();

    if (token && !expired) {
      state.user = api.getUser() || { name: (payload && (payload.name || payload.username || payload.sub)) || 'Pengguna', role: (payload && payload.role) || '' };
      renderMain();
    } else {
      if (token) { api.clearToken(); }
      renderLogin(expired ? { title: 'Sesi berakhir', hint: 'Masuk lagi untuk melanjutkan.' } : null);
    }
  }

  start();
})();
