/* ============================================================
   Qwizo teacher app — app.js
   Vanilla SPA: hash router, sidebar layout, quiz editor, bank,
   results, sharing. All data via the /api JSON API.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- tiny helpers ---------------- */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(msg, isErr) {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' err' : '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }
  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtDur(sec) {
    if (sec == null) return '—';
    return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  }

  async function api(path, opts) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...opts,
    });
    if (res.status === 401) { location.hash = '#/login'; throw new Error('Please log in.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(data.error || 'Something went wrong. Try again.');
      e.errors = data.errors; e.status = res.status;
      throw e;
    }
    return data;
  }
  async function apiForm(path, formData) {
    const res = await fetch(path, { method: 'POST', credentials: 'same-origin', body: formData });
    if (res.status === 401) { location.hash = '#/login'; throw new Error('Please log in.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
    return data;
  }

  /* ---------------- icons ---------------- */
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  };
  function brandMark(size) {
    size = size || 30;
    return `<span class="brand-mark" style="width:${size}px;height:${size}px"><svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3 8-8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg></span>`;
  }

  /* ---------------- modal + confirm ---------------- */
  function openModal(html, wide) {
    closeModal();
    const veil = document.createElement('div');
    veil.className = 'modal-veil'; veil.id = 'modalVeil';
    veil.innerHTML = `<div class="modal" ${wide ? 'style="max-width:720px"' : ''}>${html}</div>`;
    veil.addEventListener('click', e => { if (e.target === veil) closeModal(); });
    document.body.appendChild(veil);
    return veil;
  }
  function closeModal() { const v = $('#modalVeil'); if (v) v.remove(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function confirmDialog(title, msg, okLabel, danger) {
    return new Promise(resolve => {
      const veil = openModal(`
        <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-x" data-x>✕</button></div>
        <div class="modal-body"><p style="color:var(--body);font-size:14.5px;margin-bottom:22px">${esc(msg)}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-secondary btn-sm" data-x>Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" data-ok>${esc(okLabel)}</button>
        </div></div>`);
      veil.querySelector('[data-ok]').addEventListener('click', () => { closeModal(); resolve(true); });
      veil.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => { closeModal(); resolve(false); }));
    });
  }

  /* ---------------- app state + router ---------------- */
  const App = { user: null, route: null };

  const routes = {
    '/login': { view: LoginView, bare: true },
    '/signup': { view: SignupView, bare: true },
    '/': { view: DashboardView, nav: 'home' },
    '/quizzes': { view: QuizListView, nav: 'quizzes' },
    '/quizzes/new': { view: QuizNewView, nav: 'quizzes' },
    '/quizzes/:id': { view: EditorView, nav: 'quizzes' },
    '/quizzes/:id/preview': { view: PreviewView, nav: 'quizzes' },
    '/quizzes/:id/share': { view: ShareView, nav: 'quizzes' },
    '/quizzes/:id/results': { view: ResultsView, nav: 'quizzes' },
    '/bank': { view: BankView, nav: 'bank' },
    '/settings': { view: SettingsView, nav: 'settings' },
  };

  function parseRoute() {
    const hash = location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);
    // match /quizzes/:id/preview etc.
    if (parts[0] === 'quizzes' && parts[1] && parts[2] === 'preview') return { name: '/quizzes/:id/preview', params: { id: parts[1] } };
    if (parts[0] === 'quizzes' && parts[1] && parts[2] === 'share') return { name: '/quizzes/:id/share', params: { id: parts[1] } };
    if (parts[0] === 'quizzes' && parts[1] && parts[2] === 'results') return { name: '/quizzes/:id/results', params: { id: parts[1] } };
    if (parts[0] === 'quizzes' && parts[1] === 'new') return { name: '/quizzes/new', params: {} };
    if (parts[0] === 'quizzes' && parts[1]) return { name: '/quizzes/:id', params: { id: parts[1] } };
    const key = '/' + parts.join('/');
    if (routes[key]) return { name: key, params: {} };
    return { name: '/', params: {} };
  }

  async function ensureUser() {
    if (App.user) return App.user;
    try {
      const d = await api('/api/auth/me');
      App.user = d.user;
      return App.user;
    } catch (e) { return null; }
  }

  async function render() {
    const { name, params } = parseRoute();
    const def = routes[name];
    App.route = name;
    if (def.bare) {
      $('#app').innerHTML = '';
      def.view($('#app'), params);
      return;
    }
    const user = await ensureUser();
    if (!user) { location.hash = '#/login'; return; }
    renderShell(def.nav);
    const main = $('#viewRoot');
    main.innerHTML = '<div class="center-note"><div class="spinner"></div></div>';
    try {
      await def.view(main, params);
    } catch (e) {
      main.innerHTML = `<div class="empty"><h3>Something went wrong</h3><p>${esc(e.message)}</p></div>`;
    }
  }

  function renderShell(activeNav) {
    const u = App.user;
    $('#app').innerHTML = `
    <div class="topbar-mobile">
      <button class="icon-btn" id="menuBtn">${I.menu}</button>
      <div class="side-brand" style="padding:0">${brandMark(26)}Qwizo</div>
    </div>
    <div class="scrim" id="scrim"></div>
    <div class="shell">
      <aside class="side" id="sidebar">
        <div class="side-brand">${brandMark(30)}Qwizo</div>
        <nav class="side-nav">
          <a class="side-link ${activeNav === 'home' ? 'active' : ''}" href="#/">${I.home}Home</a>
          <a class="side-link ${activeNav === 'quizzes' ? 'active' : ''}" href="#/quizzes">${I.quiz}Quizzes</a>
          <a class="side-link ${activeNav === 'bank' ? 'active' : ''}" href="#/bank">${I.bank}Question Bank</a>
          <a class="side-link ${activeNav === 'settings' ? 'active' : ''}" href="#/settings">${I.gear}Settings</a>
        </nav>
        <div class="side-foot">
          <div class="side-user">
            <span class="avatar">${esc((u.name || 'T')[0].toUpperCase())}</span>
            <div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div>
          </div>
          <button class="logout-btn" id="logoutBtn">Log out</button>
        </div>
      </aside>
      <main class="main"><div class="page" id="viewRoot"></div></main>
    </div>`;
    $('#logoutBtn').addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
      App.user = null; location.hash = '#/login';
    });
    const side = $('#sidebar'), scrim = $('#scrim');
    $('#menuBtn').addEventListener('click', () => { side.classList.add('open'); scrim.classList.add('on'); });
    scrim.addEventListener('click', () => { side.classList.remove('open'); scrim.classList.remove('on'); });
    $$('.side-link', side).forEach(a => a.addEventListener('click', () => { side.classList.remove('open'); scrim.classList.remove('on'); }));
  }

  function pageHead(title, sub, actions) {
    return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
      <div class="head-actions">${actions || ''}</div></div>`;
  }

  /* ---------------- auth views ---------------- */
  function authShell(title, sub, bodyHtml, altHtml) {
    return `<div class="auth-wrap"><div class="auth-card">
      <div class="side-brand brand" style="padding:0 0 4px">${brandMark(34)}</div>
      <h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p>
      <div class="form-err" id="authErr" style="display:none"></div>
      ${bodyHtml}
      <div class="auth-alt">${altHtml}</div>
    </div></div>`;
  }

  function LoginView(root) {
    root.innerHTML = authShell('Welcome back', 'Log in to your Qwizo teacher account.', `
      <div class="field"><label>Email</label><input class="input" id="email" type="email" autocomplete="email" placeholder="you@school.edu"></div>
      <div class="field"><label>Password</label><input class="input" id="pw" type="password" autocomplete="current-password" placeholder="••••••••"></div>
      <button class="btn btn-primary" id="go">Log in</button>`,
      `New to Qwizo? <a href="#/signup">Create an account</a>`);
    const go = async () => {
      const err = $('#authErr'); err.style.display = 'none';
      const btn = $('#go'); btn.disabled = true; btn.textContent = 'Logging in…';
      try {
        const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: $('#email').value, password: $('#pw').value }) });
        App.user = d.user; location.hash = '#/';
      } catch (e) { err.textContent = e.message; err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Log in'; }
    };
    $('#go').addEventListener('click', go);
    $('#pw').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#email').focus();
  }

  function SignupView(root) {
    root.innerHTML = authShell('Create your account', 'Free for teachers. Your quizzes stay yours.', `
      <div class="field"><label>Full name</label><input class="input" id="name" autocomplete="name" placeholder="Aiza Toktogulova"></div>
      <div class="field"><label>Email</label><input class="input" id="email" type="email" autocomplete="email" placeholder="you@school.edu"></div>
      <div class="field"><label>Password</label><input class="input" id="pw" type="password" autocomplete="new-password" placeholder="At least 8 characters"><div class="hint">Use 8 or more characters.</div></div>
      <button class="btn btn-primary" id="go">Create account</button>`,
      `Already have an account? <a href="#/login">Log in</a>`);
    const go = async () => {
      const err = $('#authErr'); err.style.display = 'none';
      const btn = $('#go'); btn.disabled = true; btn.textContent = 'Creating…';
      try {
        const d = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: $('#name').value, email: $('#email').value, password: $('#pw').value }) });
        App.user = d.user; location.hash = '#/';
      } catch (e) { err.textContent = e.message; err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Create account'; }
    };
    $('#go').addEventListener('click', go);
    $('#pw').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#name').focus();
  }

  /* ---------------- dashboard ---------------- */
  async function DashboardView(root) {
    const d = await api('/api/stats');
    const s = d.stats, recent = d.recent;
    const statusBadge = st => `<span class="badge ${st}">${st}</span>`;
    root.innerHTML = pageHead(`Good ${daypart()}, ${esc(App.user.name.split(' ')[0])}`, 'Here is what is happening with your quizzes.', `
      <a class="btn btn-secondary btn-sm" href="#/quizzes/new">${I.plus} New quiz</a>`) + `
    <div class="stat-grid">
      <div class="stat"><b>${s.quizzes}</b><span>Total quizzes</span></div>
      <div class="stat"><b>${s.published}</b><span>Published</span></div>
      <div class="stat"><b>${s.submissions}</b><span>Student submissions</span></div>
      <div class="stat"><b>${s.bank}</b><span>Bank questions</span></div>
    </div>
    <h3 style="font-size:16px;font-weight:700;color:var(--ink);margin:0 0 12px">Recent quizzes</h3>
    ${recent.length ? `<div class="quiz-list">` + recent.map(q => `
      <div class="quiz-row">
        <div class="grow"><h3><a href="#/quizzes/${q.id}">${esc(q.title)}</a></h3>
          <div class="meta">${q.question_count} questions · ${q.submission_count} submissions · updated ${fmtDate(q.updated_at)}</div></div>
        ${statusBadge(q.status)}
        <div class="row-actions"><a class="btn btn-secondary btn-sm" href="#/quizzes/${q.id}">Open</a></div>
      </div>`).join('') + `</div>`
      : `<div class="empty"><h3>No quizzes yet</h3><p>Create your first quiz — with AI or by hand.</p>
        <a class="btn btn-primary" href="#/quizzes/new">Create quiz</a></div>`}`;
  }
  function daypart() {
    const h = new Date().getHours();
    return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  }

  /* ---------------- quiz list ---------------- */
  async function QuizListView(root) {
    let status = '', q = '';
    const draw = async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q) params.set('q', q);
      const d = await api('/api/quizzes?' + params.toString());
      const list = d.quizzes;
      $('#quizList').innerHTML = list.length ? list.map(rowHtml).join('') : `
        <div class="empty"><h3>${q || status ? 'No quizzes match' : 'No quizzes yet'}</h3>
        <p>${q || status ? 'Try a different search or filter.' : 'Create your first quiz — with AI or by hand.'}</p>
        ${!q && !status ? `<a class="btn btn-primary" href="#/quizzes/new">Create quiz</a>` : ''}</div>`;
      wireRows();
    };
    const rowHtml = quiz => `
      <div class="quiz-row" data-id="${quiz.id}">
        <div class="grow"><h3><a href="#/quizzes/${quiz.id}">${esc(quiz.title)}</a></h3>
          <div class="meta">${esc(quiz.subject || 'No subject')}${quiz.topic ? ' · ' + esc(quiz.topic) : ''} · ${quiz.question_count} questions · ${quiz.submission_count} submissions</div></div>
        <span class="badge ${quiz.status}">${quiz.status}</span>
        <div class="row-actions">
          ${quiz.status === 'published' ? `<a class="icon-btn" title="Share" href="#/quizzes/${quiz.id}/share">${I.share}</a>
            <a class="icon-btn" title="Results" href="#/quizzes/${quiz.id}/results">${I.chart}</a>` : ''}
          <button class="icon-btn" title="Duplicate" data-act="dup">${I.copy}</button>
          <button class="icon-btn danger" title="Delete" data-act="del">${I.trash}</button>
        </div>
      </div>`;
    const wireRows = () => {
      $$('#quizList .quiz-row').forEach(row => {
        const id = row.dataset.id;
        $('[data-act="dup"]', row).addEventListener('click', async e => {
          e.stopPropagation();
          try { const d = await api(`/api/quizzes/${id}/duplicate`, { method: 'POST' }); toast('Duplicated as draft.'); location.hash = '#/quizzes/' + d.quiz.id; }
          catch (err) { toast(err.message, true); }
        });
        $('[data-act="del"]', row).addEventListener('click', async e => {
          e.stopPropagation();
          if (await confirmDialog('Delete quiz?', 'This quiz, its questions and all student submissions will be permanently deleted.', 'Delete', true)) {
            try { await api(`/api/quizzes/${id}`, { method: 'DELETE' }); toast('Quiz deleted.'); draw(); }
            catch (err) { toast(err.message, true); }
          }
        });
      });
    };
    root.innerHTML = pageHead('Quizzes', 'Draft, publish and share your quizzes.', `
      <a class="btn btn-primary btn-sm" href="#/quizzes/new">${I.plus} New quiz</a>`) + `
      <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">
        <div style="position:relative;flex:1;min-width:200px">
          <input class="input" id="qSearch" placeholder="Search quizzes…" value="${esc(q)}" style="padding-left:38px">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--faint);width:16px;height:16px;display:block">${I.search}</span>
        </div>
        <select class="select" id="qStatus" style="width:auto">
          <option value="">All statuses</option>
          <option value="draft" ${status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="published" ${status === 'published' ? 'selected' : ''}>Published</option>
          <option value="archived" ${status === 'archived' ? 'selected' : ''}>Archived</option>
        </select>
      </div>
      <div class="quiz-list" id="quizList"><div class="center-note"><div class="spinner"></div></div></div>`;
    const debSearch = debounce(() => { q = $('#qSearch').value.trim(); draw(); }, 350);
    $('#qSearch').addEventListener('input', debSearch);
    $('#qStatus').addEventListener('change', e => { status = e.target.value; draw(); });
    await draw();
  }

  /* ---------------- new quiz: AI vs manual ---------------- */
  function QuizNewView(root) {
    root.innerHTML = pageHead('Create a quiz', 'Start with AI, from your material, or from a blank page.') + `
    <div class="share-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      <div class="share-box">
        <h4>Create with AI</h4>
        <p>Describe the quiz — topic, level, question types — and Qwizo drafts the questions. You review everything before publishing.</p>
        <button class="btn btn-primary btn-sm" id="goAI">${I.spark} Start with AI</button>
      </div>
      <div class="share-box">
        <h4>Create from material</h4>
        <p>Upload a .txt or .docx handout and generate a quiz grounded in its content. Nothing is invented outside your material.</p>
        <button class="btn btn-secondary btn-sm" id="goUpload">Upload material</button>
      </div>
      <div class="share-box">
        <h4>Create manually</h4>
        <p>A blank quiz with the full editor. Add each question yourself, exactly the way you want it.</p>
        <button class="btn btn-secondary btn-sm" id="goManual">Blank quiz</button>
      </div>
    </div>`;
    $('#goAI').addEventListener('click', () => AICreateView(root, 'prompt'));
    $('#goUpload').addEventListener('click', () => AICreateView(root, 'upload'));
    $('#goManual').addEventListener('click', async () => {
      try {
        const d = await api('/api/quizzes', { method: 'POST', body: JSON.stringify({ title: 'Untitled quiz' }) });
        location.hash = '#/quizzes/' + d.quiz.id;
      } catch (e) { toast(e.message, true); }
    });
  }

  const QTYPE_LABELS = { mcq: 'Multiple choice', tf: 'True / False', short: 'Short answer', fill: 'Fill in the blank', matching: 'Matching' };

  function AICreateView(root, mode) {
    let selTypes = ['mcq', 'short'];
    root.innerHTML = pageHead(mode === 'upload' ? 'Create from material' : 'Create with AI', 'The quiz is always created as a draft for your review.') + `
    <div class="card card-pad" style="max-width:720px">
      <div class="form-err" id="aiErr" style="display:none"></div>
      ${mode === 'upload' ? `
      <div class="field"><label>Learning material (.txt or .docx, max 5 MB)</label>
        <input type="file" id="aiFile" accept=".txt,.docx,text/plain" class="input" style="padding:9px 13px">
        <div class="hint">PDF is not supported yet — export it as .txt or .docx. Scanned images cannot be read.</div></div>
      <div class="field"><label>What should the quiz focus on? (optional)</label>
        <input class="input" id="aiPrompt" placeholder="e.g. Focus on solving two-step equations"></div>`
      : `
      <div class="field"><label>Describe the quiz</label>
        <textarea class="textarea" id="aiPrompt" placeholder="Create a Year 8 Cambridge Mathematics quiz about linear equations."></textarea></div>`}
      <div class="f-row">
        <div class="field"><label>Subject</label><input class="input" id="aiSubject" placeholder="Mathematics"></div>
        <div class="field"><label>Topic</label><input class="input" id="aiTopic" placeholder="Linear equations"></div>
      </div>
      <div class="f-row">
        <div class="field"><label>Curriculum</label><input class="input" id="aiCur" placeholder="Cambridge"></div>
        <div class="field"><label>Level / Year</label><input class="input" id="aiLevel" placeholder="Year 8"></div>
      </div>
      <div class="f-row">
        <div class="field"><label>Number of questions</label>
          <input class="input" id="aiCount" type="number" min="1" max="40" value="10"></div>
        <div class="field"><label>Difficulty</label>
          <div class="seg" id="aiDiff">
            <button data-v="easy">Easy</button><button data-v="medium" class="on">Medium</button><button data-v="hard">Hard</button>
          </div></div>
      </div>
      <div class="field"><label>Question types</label>
        <div class="chips" id="aiTypes">
          ${Object.entries(QTYPE_LABELS).map(([v, l]) => `<button class="chip ${selTypes.includes(v) ? 'on' : ''}" data-v="${v}">${I.check}${l}</button>`).join('')}
        </div></div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="btn btn-secondary" id="aiBack">Back</button>
        <button class="btn btn-primary" id="aiGo">${I.spark} Generate quiz</button>
      </div>
      <div id="aiProg" style="display:none;margin-top:20px">
        <div class="center-note"><div class="spinner"></div><p style="margin-top:12px" id="aiProgText">Generating your quiz…</p></div>
      </div>
    </div>`;
    let difficulty = 'medium';
    $('#aiDiff').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      difficulty = b.dataset.v;
      $$('#aiDiff button').forEach(x => x.classList.toggle('on', x === b));
    });
    $('#aiTypes').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      b.classList.toggle('on');
      selTypes = $$('#aiTypes .chip.on').map(x => x.dataset.v);
    });
    $('#aiBack').addEventListener('click', () => QuizNewView(root));
    $('#aiGo').addEventListener('click', async () => {
      const err = $('#aiErr'); err.style.display = 'none';
      if (!selTypes.length) { err.textContent = 'Pick at least one question type.'; err.style.display = 'block'; return; }
      const prompt = $('#aiPrompt').value.trim();
      if (mode === 'prompt' && !prompt && !$('#aiTopic').value.trim()) {
        err.textContent = 'Describe the quiz or enter a topic.'; err.style.display = 'block'; return;
      }
      const btn = $('#aiGo'); btn.disabled = true;
      $('#aiProg').style.display = 'block';
      const steps = ['Reading your request…', 'Drafting questions…', 'Checking each question…', 'Assembling your quiz…'];
      let si = 0;
      const stepInt = setInterval(() => { si = Math.min(si + 1, steps.length - 1); $('#aiProgText').textContent = steps[si]; }, 4000);
      try {
        const common = {
          prompt, subject: $('#aiSubject').value.trim(), curriculum: $('#aiCur').value.trim(),
          level: $('#aiLevel').value.trim(), topic: $('#aiTopic').value.trim(),
          count: $('#aiCount').value, difficulty, types: selTypes,
        };
        let d;
        if (mode === 'upload') {
          const file = $('#aiFile').files[0];
          if (!file) throw new Error('Choose a .txt or .docx file first.');
          const fd = new FormData();
          fd.append('file', file);
          Object.entries(common).forEach(([k, v]) => fd.append(k, Array.isArray(v) ? v.join(',') : String(v)));
          const upSteps = ['Uploading your material…', 'Reading the document…', 'Drafting questions from it…', 'Checking each question…'];
          let ui = 0;
          const upInt = setInterval(() => { ui = Math.min(ui + 1, upSteps.length - 1); $('#aiProgText').textContent = upSteps[ui]; }, 4000);
          try { d = await apiForm('/api/ai/generate-upload', fd); }
          finally { clearInterval(upInt); }
        } else {
          d = await api('/api/ai/generate', { method: 'POST', body: JSON.stringify(common) });
        }
        clearInterval(stepInt);
        toast(`Your quiz is ready — ${d.questions.length} questions drafted for review.`);
        location.hash = '#/quizzes/' + d.quiz.id;
      } catch (e) {
        clearInterval(stepInt);
        err.textContent = e.message; err.style.display = 'block';
        btn.disabled = false; $('#aiProg').style.display = 'none';
      }
    });
  }

  /* ---------------- quiz editor ---------------- */
  const Editor = {
    quiz: null, questions: [], saveState: 'saved', // saved | saving | dirty
    saveTimer: null, qSaveTimers: {},
  };

  function setSaveState(s) {
    Editor.saveState = s;
    const el = $('#saveState');
    if (!el) return;
    el.className = 'save-state' + (s === 'saving' ? ' saving' : s === 'dirty' ? ' dirty' : '');
    el.innerHTML = `<span class="dot"></span>${s === 'saving' ? 'Saving…' : s === 'dirty' ? 'Unsaved changes' : 'Saved'}`;
  }
  function markDirty() { if (Editor.saveState === 'saved') setSaveState('dirty'); }

  // The API drops empty accepted answers, so a fresh short/fill question comes
  // back with accepted: []. Give the teacher one empty row to type into.
  function ensureAcceptedRow(q) {
    if ((q.type === 'short' || q.type === 'fill') && !(q.accepted && q.accepted.length)) {
      q.accepted = [{ id: crypto.randomUUID(), text: '' }];
    }
  }

  async function EditorView(root, params) {
    const d = await api('/api/quizzes/' + params.id);
    Editor.quiz = d.quiz; Editor.questions = d.questions;
    Editor.questions.forEach(ensureAcceptedRow);
    Editor.saveState = 'saved'; Editor.qSaveTimers = {}; Editor.flushMeta = null;
    renderEditor(root);
  }

  function renderEditor(root) {
    const qz = Editor.quiz;
    const isPub = qz.status === 'published';
    root.innerHTML = `
    <div class="editor-top"><div class="editor-top-inner">
      <a class="icon-btn" href="#/quizzes" title="Back to quizzes">←</a>
      <input class="input" id="edTitle" value="${esc(qz.title)}" style="flex:1;min-width:180px;font-weight:700;font-size:16px" maxlength="200" ${isPub ? 'disabled' : ''}>
      <span class="save-state" id="saveState"><span class="dot"></span>Saved</span>
      <a class="btn btn-secondary btn-sm" href="#/quizzes/${qz.id}/preview">${I.eye} Preview</a>
      ${isPub ? `<button class="btn btn-secondary btn-sm" id="unpubBtn">Unpublish</button>
                 <a class="btn btn-primary btn-sm" href="#/quizzes/${qz.id}/share">${I.share} Share</a>`
              : `<button class="btn btn-primary btn-sm" id="pubBtn">Publish</button>`}
    </div></div>
    <div class="page-head"><div>
      <h1 style="font-size:20px">Quiz editor</h1>
      <p>${isPub ? 'This quiz is published. Unpublish it to make changes.' : 'Changes save automatically as a draft.'} <span class="badge ${qz.status}" style="margin-left:6px">${qz.status}</span></p>
    </div></div>
    <div id="valBox"></div>
    <div class="card card-pad" style="margin-bottom:16px">
      <h3 style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:14px">Quiz details</h3>
      <div class="field"><label>Description</label>
        <textarea class="textarea" id="edDesc" maxlength="2000" ${isPub ? 'disabled' : ''}>${esc(qz.description)}</textarea></div>
      <div class="f-row">
        <div class="field"><label>Subject</label><input class="input" id="edSubject" value="${esc(qz.subject)}" maxlength="100" ${isPub ? 'disabled' : ''}></div>
        <div class="field"><label>Topic</label><input class="input" id="edTopic" value="${esc(qz.topic)}" maxlength="200" ${isPub ? 'disabled' : ''}></div>
      </div>
      <div class="f-row">
        <div class="field"><label>Curriculum</label><input class="input" id="edCur" value="${esc(qz.curriculum)}" maxlength="100" ${isPub ? 'disabled' : ''}></div>
        <div class="field"><label>Level / Year</label><input class="input" id="edLevel" value="${esc(qz.level)}" maxlength="100" ${isPub ? 'disabled' : ''}></div>
      </div>
      <div class="f-row">
        <div class="field"><label>Time limit (minutes, optional)</label>
          <input class="input" id="edTime" type="number" min="1" max="1440" value="${qz.time_limit_sec ? Math.round(qz.time_limit_sec / 60) : ''}" placeholder="No limit" ${isPub ? 'disabled' : ''}></div>
        <div class="field"><label>Total marks</label>
          <input class="input" id="edTotalMarks" value="${totalMarks()}" disabled></div>
      </div>
      <details style="margin-top:4px" ${isPub ? 'disabled' : ''}>
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:var(--ink)">Quiz settings</summary>
        <div style="padding-top:12px">${settingsHtml(qz.settings, isPub)}</div>
      </details>
    </div>
    <h3 style="font-size:15px;font-weight:700;color:var(--ink);margin:22px 0 12px">Questions (${Editor.questions.length})</h3>
    <div id="qList"></div>
    ${isPub ? '' : `<div class="add-q-bar" id="addQBar">
      <span style="font-size:13.5px;color:var(--muted);align-self:center;margin-right:4px">Add:</span>
      ${Object.entries(QTYPE_LABELS).map(([v, l]) => `<button class="chip" data-add="${v}">${I.plus.replace('currentColor', 'currentColor')} ${l}</button>`).join('')}
      <button class="chip" data-add="bank">${I.bank} From bank</button>
    </div>`}
    `;
    if (!isPub) {
      // quiz meta autosave
      const doSaveMeta = async () => {
        Editor.flushMeta = null;
        setSaveState('saving');
        try {
          const body = {
            title: $('#edTitle').value.trim() || 'Untitled quiz',
            description: $('#edDesc').value, subject: $('#edSubject').value,
            curriculum: $('#edCur').value, level: $('#edLevel').value, topic: $('#edTopic').value,
            time_limit_sec: $('#edTime').value ? parseInt($('#edTime').value, 10) * 60 : null,
            settings: readSettings(),
          };
          const r = await api('/api/quizzes/' + qz.id, { method: 'PUT', body: JSON.stringify(body) });
          Editor.quiz = r.quiz; setSaveState('saved');
        } catch (e) { setSaveState('dirty'); toast(e.message, true); }
      };
      let metaTimer = null;
      const saveMeta = () => {
        clearTimeout(metaTimer);
        Editor.flushMeta = async () => { clearTimeout(metaTimer); await doSaveMeta(); };
        metaTimer = setTimeout(doSaveMeta, 900);
      };
      ['edTitle', 'edDesc', 'edSubject', 'edCur', 'edLevel', 'edTopic', 'edTime'].forEach(id => {
        $('#' + id).addEventListener('input', () => { markDirty(); saveMeta(); });
      });
      $('#quizSettings').addEventListener('change', () => { markDirty(); saveMeta(); });
      $('#addQBar').addEventListener('click', e => {
        const b = e.target.closest('[data-add]'); if (!b) return;
        if (b.dataset.add === 'bank') openBankPicker(); else addQuestion(b.dataset.add);
      });
      const pub = $('#pubBtn');
      if (pub) pub.addEventListener('click', publishFlow);
    } else {
      const unpub = $('#unpubBtn');
      if (unpub) unpub.addEventListener('click', async () => {
        if (await confirmDialog('Unpublish quiz?', 'Students will no longer be able to open the share link. Existing results are kept.', 'Unpublish')) {
          await api(`/api/quizzes/${qz.id}/unpublish`, { method: 'POST' });
          EditorView(root, { id: qz.id });
        }
      });
    }
    renderQuestions();
  }

  function totalMarks() {
    return Editor.questions.reduce((a, q) => a + (Number(q.marks) || 0), 0);
  }

  function settingsHtml(s, disabled) {
    const c = (key, label, sub) => `
      <label class="check"><input type="checkbox" data-set="${key}" ${s[key] ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
      <span><b>${label}</b><small>${sub}</small></span></label>`;
    return `<div id="quizSettings">
      ${c('shuffle_questions', 'Shuffle question order', 'Each student sees questions in a different order.')}
      ${c('shuffle_options', 'Shuffle answer options', 'Option order is randomized per student.')}
      ${c('show_score', 'Show score to students', 'Students see their score right after submitting.')}
      ${c('show_results_immediately', 'Show results immediately', 'Students see the per-question review right after submitting. If off, they only see a confirmation.')}
      ${c('show_correct_answers', 'Show correct answers', 'Students can review which answers were correct.')}
      ${c('show_explanations', 'Show explanations', 'Your explanations appear in the student review.')}
      ${c('allow_multiple_attempts', 'Allow multiple attempts', 'Students can take the quiz more than once.')}
      ${c('require_student_name', 'Require student name', 'Students must enter their name before starting.')}
    </div>`;
  }
  function readSettings() {
    const s = {};
    $$('#quizSettings [data-set]').forEach(el => { s[el.dataset.set] = el.checked; });
    return s;
  }

  /* ---------- question rendering ---------- */
  function renderQuestions() {
    const box = $('#qList');
    if (!box) return;
    const isPub = Editor.quiz.status === 'published';
    box.innerHTML = Editor.questions.map((q, i) => questionHtml(q, i, isPub)).join('');
    Editor.questions.forEach((q, i) => wireQuestion(q, i, isPub));
    // refresh count + total marks
    const h = $('h3', box.parentElement);
    // drag and drop
    if (!isPub) enableDrag(box);
  }

  function questionHtml(q, i, ro) {
    const dis = ro ? 'disabled' : '';
    return `<div class="q-block" data-qid="${q.id}">
      <div class="q-block-head">
        ${ro ? '' : `<span style="color:var(--faint);cursor:grab" data-grip>${I.grip}</span>`}
        <span class="q-num">Q${i + 1}</span>
        <span class="q-type-tag">${QTYPE_LABELS[q.type] || q.type}</span>
        <span class="spacer"></span>
        ${ro ? '' : `
        <button class="icon-btn" data-qact="up" title="Move up" ${i === 0 ? 'disabled' : ''}>${I.up}</button>
        <button class="icon-btn" data-qact="down" title="Move down" ${i === Editor.questions.length - 1 ? 'disabled' : ''}>${I.down}</button>
        <button class="icon-btn" data-qact="dup" title="Duplicate">${I.copy}</button>
        <button class="icon-btn" data-qact="bank" title="Save to question bank">${I.bank}</button>
        <button class="icon-btn danger" data-qact="del" title="Delete">${I.trash}</button>`}
      </div>
      <div class="q-block-body">
        <div class="field"><label>Question</label>
          <textarea class="textarea" data-f="text" rows="2" ${dis}>${esc(q.text)}</textarea></div>
        ${typeEditorHtml(q, dis)}
        <div class="f-row">
          <div class="field"><label>Marks</label><input class="input" data-f="marks" type="number" min="0.5" max="100" step="0.5" value="${q.marks}" ${dis}></div>
          <div class="field"><label>Difficulty</label>
            <select class="select" data-f="difficulty" ${dis}>
              ${['easy', 'medium', 'hard'].map(d => `<option ${q.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select></div>
        </div>
        <div class="field"><label>Explanation <span style="color:var(--faint);font-weight:400">(shown to students after submitting, if enabled)</span></label>
          <textarea class="textarea" data-f="explanation" rows="2" ${dis}>${esc(q.explanation)}</textarea></div>
        <div class="mini-label">Change type</div>
        <div class="chips" style="margin-bottom:4px">
          ${Object.entries(QTYPE_LABELS).map(([v, l]) => `<button class="chip ${q.type === v ? 'on' : ''}" data-ctype="${v}" ${dis}>${l}</button>`).join('')}
        </div>
        ${ro ? '' : `<div class="q-ai-bar">
          <button class="ai-chip" data-ai="improve">${I.spark} Improve wording</button>
          <button class="ai-chip" data-ai="easier">Make easier</button>
          <button class="ai-chip" data-ai="harder">Make harder</button>
          <button class="ai-chip" data-ai="regenerate">Regenerate</button>
          ${q.type === 'mcq' ? `<button class="ai-chip" data-ai="distractors">Better distractors</button>` : ''}
          <button class="ai-chip" data-ai="explanation">Add explanation</button>
        </div><div class="ai-slot"></div>`}
        <div class="val-err" data-verr style="display:none"></div>
      </div>
    </div>`;
  }

  function typeEditorHtml(q, dis) {
    if (q.type === 'mcq') {
      return `<div class="mini-label">Answer options — select the correct one</div>
      <div data-opts>${q.options.map((o, i) => `
        <div class="q-opt-row">
          <button class="radio-pick ${o.is_correct ? 'on' : ''}" data-pick="${o.id}" title="Mark correct" ${dis}></button>
          <input class="input" data-opt="${o.id}" value="${esc(o.text)}" placeholder="Option ${i + 1}" ${dis}>
          ${!dis && q.options.length > 2 ? `<button class="icon-btn danger" data-optdel="${o.id}" title="Remove option">${I.x}</button>` : ''}
        </div>`).join('')}</div>
      ${!dis && q.options.length < 6 ? `<button class="btn btn-secondary btn-sm" data-optadd style="margin-top:6px">${I.plus} Add option</button>` : ''}`;
    }
    if (q.type === 'tf') {
      const isTrue = q.options.some(o => o.is_correct && /^true$/i.test(o.text));
      return `<div class="mini-label">Correct answer</div>
      <div class="truefalse-pick">
        <button class="tf-btn ${isTrue ? 'on' : ''}" data-tfval="true" ${dis}>True</button>
        <button class="tf-btn ${!isTrue ? 'on' : ''}" data-tfval="false" ${dis}>False</button>
      </div>`;
    }
    if (q.type === 'short' || q.type === 'fill') {
      return `<div class="mini-label">Accepted answers ${q.type === 'fill' ? '— use _____ for the blank in the question' : ''}</div>
      <div data-acc>${q.accepted.map(a => `
        <div class="q-opt-row"><input class="input" data-accid="${a.id}" value="${esc(a.text)}" placeholder="Accepted answer" ${dis}>
        ${!dis ? `<button class="icon-btn danger" data-accdel="${a.id}">${I.x}</button>` : ''}</div>`).join('')}</div>
      ${!dis ? `<button class="btn btn-secondary btn-sm" data-accadd style="margin-top:6px">${I.plus} Add accepted answer</button>
      <label class="check" style="margin-top:8px"><input type="checkbox" data-f="case_sensitive" ${q.case_sensitive ? 'checked' : ''} ${dis}>
      <span><b>Case sensitive</b><small>“Paris” and “paris” count as different answers.</small></span></label>` : ''}`;
    }
    if (q.type === 'matching') {
      return `<div class="mini-label">Pairs</div>
      <div data-pairs>${q.pairs.map(p => `
        <div class="match-row">
          <input class="input" data-pairl="${p.id}" value="${esc(p.left_text)}" placeholder="Left" ${dis}>
          <span class="match-arrow">→</span>
          <input class="input" data-pairr="${p.id}" value="${esc(p.right_text)}" placeholder="Right" ${dis}>
          ${!dis && q.pairs.length > 2 ? `<button class="icon-btn danger" data-pairdel="${p.id}">${I.x}</button>` : `<span></span>`}
        </div>`).join('')}</div>
      ${!dis && q.pairs.length < 8 ? `<button class="btn btn-secondary btn-sm" data-pairadd style="margin-top:6px">${I.plus} Add pair</button>` : ''}`;
    }
    return '';
  }

  function wireQuestion(q, i, ro) {
    const block = $(`.q-block[data-qid="${q.id}"]`);
    if (!block || ro) return;

    const scheduleSave = () => {
      markDirty(); setSaveState('dirty');
      clearTimeout(Editor.qSaveTimers[q.id]);
      Editor.qSaveTimers[q.id] = setTimeout(() => saveQuestion(q.id), 900);
    };

    // scalar fields
    $$('[data-f]', block).forEach(el => {
      const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        const f = el.dataset.f;
        q[f] = el.type === 'checkbox' ? el.checked : (f === 'marks' ? parseFloat(el.value) || 0 : el.value);
        scheduleSave();
      });
    });
    // options text
    $$('[data-opt]', block).forEach(el => el.addEventListener('input', () => {
      q.options.find(o => o.id === el.dataset.opt).text = el.value; scheduleSave();
    }));
    // correct pick
    $$('[data-pick]', block).forEach(btn => btn.addEventListener('click', () => {
      q.options.forEach(o => { o.is_correct = o.id === btn.dataset.pick; });
      $$('[data-pick]', block).forEach(b => b.classList.toggle('on', b === btn));
      scheduleSave();
    }));
    const optAdd = $('[data-optadd]', block);
    if (optAdd) optAdd.addEventListener('click', () => {
      q.options.push({ id: crypto.randomUUID(), text: '', is_correct: false, position: q.options.length });
      renderQuestions(); scheduleSave();
    });
    $$('[data-optdel]', block).forEach(btn => btn.addEventListener('click', () => {
      q.options = q.options.filter(o => o.id !== btn.dataset.optdel);
      if (!q.options.some(o => o.is_correct) && q.options.length) q.options[0].is_correct = true;
      renderQuestions(); scheduleSave();
    }));
    // tf
    $$('[data-tfval]', block).forEach(btn => btn.addEventListener('click', () => {
      const v = btn.dataset.tfval === 'true';
      q.options = [{ id: 't', text: 'True', is_correct: v }, { id: 'f', text: 'False', is_correct: !v }];
      $$('[data-tfval]', block).forEach(b => b.classList.toggle('on', b === btn));
      scheduleSave();
    }));
    // accepted answers
    $$('[data-accid]', block).forEach(el => el.addEventListener('input', () => {
      q.accepted.find(a => a.id === el.dataset.accid).text = el.value; scheduleSave();
    }));
    const accAdd = $('[data-accadd]', block);
    if (accAdd) accAdd.addEventListener('click', () => {
      q.accepted.push({ id: crypto.randomUUID(), text: '' });
      renderQuestions(); scheduleSave();
    });
    $$('[data-accdel]', block).forEach(btn => btn.addEventListener('click', () => {
      q.accepted = q.accepted.filter(a => a.id !== btn.dataset.accdel);
      renderQuestions(); scheduleSave();
    }));
    // matching pairs
    $$('[data-pairl]', block).forEach(el => el.addEventListener('input', () => {
      q.pairs.find(p => p.id === el.dataset.pairl).left_text = el.value; scheduleSave();
    }));
    $$('[data-pairr]', block).forEach(el => el.addEventListener('input', () => {
      q.pairs.find(p => p.id === el.dataset.pairr).right_text = el.value; scheduleSave();
    }));
    const pairAdd = $('[data-pairadd]', block);
    if (pairAdd) pairAdd.addEventListener('click', () => {
      q.pairs.push({ id: crypto.randomUUID(), left_text: '', right_text: '', position: q.pairs.length });
      renderQuestions(); scheduleSave();
    });
    $$('[data-pairdel]', block).forEach(btn => btn.addEventListener('click', () => {
      q.pairs = q.pairs.filter(p => p.id !== btn.dataset.pairdel);
      renderQuestions(); scheduleSave();
    }));
    // change type
    $$('[data-ctype]', block).forEach(btn => btn.addEventListener('click', async () => {
      if (btn.dataset.ctype === q.type) return;
      if (await confirmDialog('Change question type?', 'The answer data will be reset for the new type. The question text is kept.', 'Change type')) {
        changeQuestionType(q, btn.dataset.ctype);
      }
    }));
    // actions
    $$('[data-qact]', block).forEach(btn => btn.addEventListener('click', () => questionAction(q, btn.dataset.qact)));
    // AI
    $$('[data-ai]', block).forEach(btn => btn.addEventListener('click', () => aiAction(q, btn.dataset.ai, btn)));
  }

  function collectQuestionPayload(q) {
    const p = {
      type: q.type, text: q.text, explanation: q.explanation,
      marks: q.marks, difficulty: q.difficulty, case_sensitive: !!q.case_sensitive,
    };
    if (q.type === 'mcq') p.options = q.options.map(o => ({ id: o.id, text: o.text, is_correct: !!o.is_correct }));
    if (q.type === 'tf') {
      const v = q.options.some(o => o.is_correct && /^true$/i.test(o.text));
      p.correct_bool = v;
    }
    if (q.type === 'short' || q.type === 'fill') p.accepted = q.accepted.map(a => ({ id: a.id, text: a.text }));
    if (q.type === 'matching') p.pairs = q.pairs.map(x => ({ id: x.id, left_text: x.left_text, right_text: x.right_text }));
    return p;
  }

  async function saveQuestion(qid) {
    const q = Editor.questions.find(x => x.id === qid);
    if (!q) return;
    setSaveState('saving');
    try {
      const r = await api('/api/questions/' + qid, { method: 'PUT', body: JSON.stringify(collectQuestionPayload(q)) });
      Object.assign(q, r.question);
      setSaveState('saved');
      const totalEl = $('#edTotalMarks');
      if (totalEl) totalEl.value = totalMarks();
    } catch (e) {
      setSaveState('dirty');
      const block = $(`.q-block[data-qid="${qid}"] [data-verr]`);
      if (block) { block.textContent = e.message; block.style.display = 'block'; }
      else toast(e.message, true);
    }
  }

  async function addQuestion(type) {
    try {
      const d = await api(`/api/quizzes/${Editor.quiz.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({ type, text: '', marks: 1, difficulty: 'medium',
          options: type === 'mcq' ? [{ text: '', is_correct: true }, { text: '', is_correct: false }] : undefined,
          accepted: (type === 'short' || type === 'fill') ? [''] : undefined,
          pairs: type === 'matching' ? [{ left_text: '', right_text: '' }, { left_text: '', right_text: '' }] : undefined,
        }),
      });
      Editor.questions.push(d.question);
      ensureAcceptedRow(d.question);
      renderQuestions();
      const block = $(`.q-block[data-qid="${d.question.id}"]`);
      if (block) { block.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('textarea', block).focus(); }
      toast('Question added.');
    } catch (e) { toast(e.message, true); }
  }

  async function questionAction(q, act) {
    if (act === 'del') {
      if (await confirmDialog('Delete question?', 'This question will be permanently removed from the quiz.', 'Delete', true)) {
        await api('/api/questions/' + q.id, { method: 'DELETE' });
        Editor.questions = Editor.questions.filter(x => x.id !== q.id);
        renderQuestions(); toast('Question deleted.');
      }
    } else if (act === 'dup') {
      const d = await api(`/api/questions/${q.id}/duplicate`, { method: 'POST' });
      const idx = Editor.questions.findIndex(x => x.id === q.id);
      Editor.questions.splice(idx + 1, 0, d.question);
      ensureAcceptedRow(d.question);
      try {
        await api(`/api/quizzes/${Editor.quiz.id}/reorder`, { method: 'PUT', body: JSON.stringify({ question_ids: Editor.questions.map(x => x.id) }) });
      } catch (e) { toast(e.message, true); }
      renderQuestions(); toast('Question duplicated.');
    } else if (act === 'bank') {
      try { await api(`/api/questions/${q.id}/to-bank`, { method: 'POST' }); toast('Saved to question bank.'); }
      catch (e) { toast(e.message, true); }
    } else if (act === 'up' || act === 'down') {
      const i = Editor.questions.findIndex(x => x.id === q.id);
      const j = act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= Editor.questions.length) return;
      [Editor.questions[i], Editor.questions[j]] = [Editor.questions[j], Editor.questions[i]];
      try {
        await api(`/api/quizzes/${Editor.quiz.id}/reorder`, { method: 'PUT', body: JSON.stringify({ question_ids: Editor.questions.map(x => x.id) }) });
        renderQuestions();
      } catch (e) { toast(e.message, true); }
    }
  }

  function changeQuestionType(q, newType) {
    const keep = { text: q.text, explanation: q.explanation, marks: q.marks, difficulty: q.difficulty };
    const fresh = { id: q.id, ...keep, type: newType, case_sensitive: false, options: [], pairs: [], accepted: [] };
    if (newType === 'mcq') fresh.options = [{ id: crypto.randomUUID(), text: '', is_correct: true }, { id: crypto.randomUUID(), text: '', is_correct: false }];
    if (newType === 'tf') fresh.options = [{ id: 't', text: 'True', is_correct: true }, { id: 'f', text: 'False', is_correct: false }];
    if (newType === 'short' || newType === 'fill') fresh.accepted = [{ id: crypto.randomUUID(), text: '' }];
    if (newType === 'matching') fresh.pairs = [{ id: 't1', left_text: '', right_text: '' }, { id: 't2', left_text: '', right_text: '' }];
    Object.assign(q, fresh);
    renderQuestions();
    clearTimeout(Editor.qSaveTimers[q.id]);
    Editor.qSaveTimers[q.id] = setTimeout(() => saveQuestion(q.id), 300);
  }

  /* ---------- AI actions inside editor ---------- */
  async function aiAction(q, action, btn) {
    const block = btn.closest('.q-block');
    const slot = $('.ai-slot', block);
    btn.disabled = true;
    const old = btn.innerHTML; btn.innerHTML = 'Working…';
    try {
      const d = await api(`/api/questions/${q.id}/ai-action`, { method: 'POST', body: JSON.stringify({ action }) });
      showProposal(q, d.proposal, slot, action);
    } catch (e) {
      toast(e.message, true);
    } finally { btn.disabled = false; btn.innerHTML = old; }
  }

  function showProposal(q, p, slot, action) {
    const label = { improve: 'Improved wording', easier: 'Easier version', harder: 'Harder version', regenerate: 'Regenerated', distractors: 'New distractors', explanation: 'Suggested explanation' }[action] || 'Suggestion';
    slot.innerHTML = `<div class="ai-proposal">
      <h4>${I.spark} ${esc(label)} — review before applying</h4>
      <p><b>Question:</b> ${esc(p.text)}</p>
      ${p.options ? `<p><b>Options:</b> ${p.options.map(o => esc(o.text) + (o.is_correct ? ' ✓' : '')).join(' · ')}</p>` : ''}
      ${p.accepted ? `<p><b>Accepted:</b> ${p.accepted.map(esc).join(' · ')}</p>` : ''}
      ${p.pairs ? `<p><b>Pairs:</b> ${p.pairs.map(x => esc(x.left) + ' → ' + esc(x.right)).join('; ')}</p>` : ''}
      ${p.explanation ? `<p><b>Explanation:</b> ${esc(p.explanation)}</p>` : ''}
      <div class="actions">
        <button class="btn btn-primary btn-sm" data-accept>Accept</button>
        <button class="btn btn-secondary btn-sm" data-discard>Discard</button>
      </div></div>`;
    $('[data-discard]', slot).addEventListener('click', () => { slot.innerHTML = ''; });
    $('[data-accept]', slot).addEventListener('click', async () => {
      // apply proposal into the local question, then save
      q.text = p.text; q.explanation = p.explanation || q.explanation;
      if (p.marks) q.marks = p.marks;
      if (p.difficulty) q.difficulty = p.difficulty;
      if (p.type && p.type !== q.type) { slot.innerHTML = ''; changeQuestionType(q, p.type); return; }
      if (p.options) q.options = p.options.map((o, i) => ({ id: crypto.randomUUID(), text: o.text, is_correct: !!o.is_correct, position: i }));
      if (p.accepted) q.accepted = p.accepted.map((t, i) => ({ id: crypto.randomUUID(), text: t }));
      if (p.pairs) q.pairs = p.pairs.map((x, i) => ({ id: crypto.randomUUID(), left_text: x.left || x.left_text, right_text: x.right || x.right_text, position: i }));
      slot.innerHTML = '';
      renderQuestions();
      await saveQuestion(q.id);
      toast('AI suggestion applied.');
    });
  }

  /* ---------- drag reorder ---------- */
  function enableDrag(box) {
    let dragId = null;
    box.addEventListener('dragstart', e => {
      const head = e.target.closest('.q-block-head'); if (!head) return;
      const block = head.closest('.q-block');
      dragId = block.dataset.qid;
      block.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    box.addEventListener('dragend', () => {
      $$('.q-block', box).forEach(b => b.classList.remove('dragging', 'drop-target'));
      dragId = null;
    });
    box.addEventListener('dragover', e => {
      const block = e.target.closest('.q-block');
      if (!block || block.dataset.qid === dragId) return;
      e.preventDefault();
      $$('.q-block', box).forEach(b => b.classList.remove('drop-target'));
      block.classList.add('drop-target');
    });
    box.addEventListener('drop', async e => {
      const target = e.target.closest('.q-block');
      if (!target || !dragId || target.dataset.qid === dragId) return;
      e.preventDefault();
      const ids = Editor.questions.map(q => q.id).filter(id => id !== dragId);
      const ti = ids.indexOf(target.dataset.qid);
      ids.splice(ti, 0, dragId);
      Editor.questions.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      try {
        await api(`/api/quizzes/${Editor.quiz.id}/reorder`, { method: 'PUT', body: JSON.stringify({ question_ids: ids }) });
        renderQuestions();
      } catch (err) { toast(err.message, true); }
    });
    // make heads draggable
    $$('.q-block-head', box).forEach(h => { h.setAttribute('draggable', 'true'); });
  }

  /* ---------- publish ---------- */
  async function publishFlow() {
    // wait for any pending saves
    await new Promise(r => setTimeout(r, 1100));
    const btn = $('#pubBtn'); btn.disabled = true; btn.textContent = 'Checking…';
    try {
      const d = await api(`/api/quizzes/${Editor.quiz.id}/publish`, { method: 'POST' });
      Editor.quiz = d.quiz;
      toast('Published! Share it with your students.');
      location.hash = `#/quizzes/${Editor.quiz.id}/share`;
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Publish';
      if (e.errors && e.errors.length) {
        $('#valBox').innerHTML = `<div class="val-summary"><h4>This quiz is not ready to publish yet:</h4>
          <ul>${e.errors.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
        $('#valBox').scrollIntoView({ behavior: 'smooth' });
      } else toast(e.message, true);
    }
  }

  /* ---------- bank picker (add from bank) ---------- */
  async function openBankPicker() {
    const d = await api('/api/bank');
    const items = d.items;
    const veil = openModal(`
      <div class="modal-head"><h3>Add from question bank</h3><button class="modal-x" data-x>✕</button></div>
      <div class="modal-body">
        <input class="input" id="bpSearch" placeholder="Search the bank…" style="margin-bottom:12px">
        <div id="bpList" style="max-height:50vh;overflow:auto;display:grid;gap:8px"></div>
      </div>`);
    const draw = (f) => {
      const list = items.filter(it => !f || it.text.toLowerCase().includes(f.toLowerCase()));
      $('#bpList', veil).innerHTML = list.length ? list.map(it => `
        <div style="border:1px solid var(--line-soft);border-radius:10px;padding:12px 14px;display:flex;gap:10px;align-items:center">
          <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.text)}</div>
          <div style="font-size:12px;color:var(--muted)">${QTYPE_LABELS[it.type]}${it.subject ? ' · ' + esc(it.subject) : ''}</div></div>
          <button class="btn btn-secondary btn-sm" data-add="${it.id}">Add</button>
        </div>`).join('') : `<div class="center-note">No bank questions found.</div>`;
      $$('[data-add]', veil).forEach(b => b.addEventListener('click', async () => {
        b.disabled = true;
        try {
          const r = await api(`/api/bank/${b.dataset.add}/add-to-quiz`, { method: 'POST', body: JSON.stringify({ quiz_id: Editor.quiz.id }) });
          Editor.questions.push(r.question);
          ensureAcceptedRow(r.question);
          renderQuestions(); closeModal(); toast('Question added from bank.');
        } catch (e) { toast(e.message, true); b.disabled = false; }
      }));
    };
    draw('');
    $('#bpSearch', veil).addEventListener('input', e => draw(e.target.value.trim()));
    veil.querySelector('[data-x]').addEventListener('click', closeModal);
  }

  /* ---------------- preview (as students see it) ---------------- */
  async function PreviewView(root, params) {
    const d = await api('/api/quizzes/' + params.id);
    const quiz = d.quiz, questions = d.questions;
    let idx = 0;
    const draw = () => {
      const q = questions[idx];
      root.innerHTML = pageHead('Preview', 'Exactly what your students will see. Answers here are not recorded.', `
        <a class="btn btn-secondary btn-sm" href="#/quizzes/${quiz.id}">Back to editor</a>`) + `
      <div class="card card-pad" style="max-width:720px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span class="q-num">Q${idx + 1} / ${questions.length}</span>
          <div class="progress" style="flex:1;height:8px;background:var(--line-soft);border-radius:99px;overflow:hidden">
            <i style="display:block;height:100%;width:${Math.round(((idx + 1) / questions.length) * 100)}%;background:var(--accent);border-radius:99px"></i></div>
        </div>
        <h3 style="font-size:19px;color:var(--ink);font-weight:600;margin:14px 0 18px">${esc(q.text).replace(/_____/g, '______')}</h3>
        ${previewAnswerHtml(q)}
        <div style="display:flex;gap:10px;margin-top:22px">
          <button class="btn btn-secondary btn-sm" id="pvPrev" ${idx === 0 ? 'disabled' : ''}>Previous</button>
          <span style="flex:1"></span>
          ${idx < questions.length - 1 ? `<button class="btn btn-primary btn-sm" id="pvNext">Next</button>`
            : `<span style="font-size:13px;color:var(--muted);align-self:center">End of preview</span>`}
        </div>
      </div>`;
      $('#pvPrev').addEventListener('click', () => { if (idx > 0) { idx--; draw(); } });
      const nx = $('#pvNext'); if (nx) nx.addEventListener('click', () => { idx++; draw(); });
      wirePreview(q);
    };
    const previewAnswerHtml = (q) => {
      if (q.type === 'mcq') return q.options.map((o, i) => `
        <button class="opt" data-pv><span class="letter">${'ABCDEF'[i]}</span><span>${esc(o.text)}</span></button>`).join('');
      if (q.type === 'tf') return `<div class="tf-row"><button class="tf-btn" data-pv>True</button><button class="tf-btn" data-pv>False</button></div>`;
      if (q.type === 'short' || q.type === 'fill') return `<input class="answer-input" placeholder="Type your answer" style="border:1.5px solid var(--line);border-radius:10px;padding:13px 15px;width:100%">`;
      if (q.type === 'matching') return q.pairs.map(p => `
        <div class="match-item"><div class="left" style="font-weight:600;color:var(--ink);margin-bottom:6px">${esc(p.left_text)}</div>
        <select class="select"><option>Choose…</option>${q.pairs.map(x => `<option>${esc(x.right_text)}</option>`).join('')}</select></div>`).join('');
      return '';
    };
    const wirePreview = () => {
      $$('[data-pv]').forEach(b => b.addEventListener('click', () => {
        $$('[data-pv]').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
      }));
    };
    if (!questions.length) {
      root.innerHTML = pageHead('Preview', '', `<a class="btn btn-secondary btn-sm" href="#/quizzes/${quiz.id}">Back to editor</a>`) +
        `<div class="empty"><h3>No questions yet</h3><p>Add questions in the editor to preview them.</p></div>`;
      return;
    }
    draw();
  }

  /* ---------------- share ---------------- */
  async function ShareView(root, params) {
    const d = await api('/api/quizzes/' + params.id);
    const quiz = d.quiz;
    if (quiz.status !== 'published') {
      root.innerHTML = pageHead('Share', '', `<a class="btn btn-secondary btn-sm" href="#/quizzes/${quiz.id}">Back to editor</a>`) +
        `<div class="empty"><h3>Publish first</h3><p>This quiz needs to be published before you can share it.</p></div>`;
      return;
    }
    const link = window.location.origin + '/q/' + quiz.share_code;
    root.innerHTML = pageHead('Share quiz', `"${quiz.title}" is live. Students need no account.`, `
      <a class="btn btn-secondary btn-sm" href="#/quizzes/${quiz.id}">Back to editor</a>
      <a class="btn btn-secondary btn-sm" href="#/quizzes/${quiz.id}/results">${I.chart} Results</a>`) + `
    <div class="share-grid">
      <div class="share-box">
        <h4>Quiz code</h4><p>Students can enter this code on the Qwizo homepage.</p>
        <div class="code-big">${esc(quiz.share_code)}</div>
        <button class="btn btn-secondary btn-sm" id="copyCode" style="width:100%">Copy code</button>
      </div>
      <div class="share-box">
        <h4>Share link</h4><p>Send this link directly — it opens the quiz.</p>
        <div class="link-row"><input class="input" id="shareLink" readonly value="${esc(link)}">
        <button class="btn btn-secondary btn-sm" id="copyLink">Copy</button></div>
      </div>
      <div class="share-box">
        <h4>QR code</h4><p>Print it or show it on the board. Students scan and start.</p>
        <div class="qr-wrap" id="qrBox"></div>
        <button class="btn btn-secondary btn-sm" id="dlQr" style="width:100%;margin-top:12px">Download QR</button>
      </div>
      <div class="share-box">
        <h4>Unpublish</h4><p>Take the quiz offline. The link and code stop working. Results are kept.</p>
        <button class="btn btn-danger btn-sm" id="unpubBtn" style="width:100%">Unpublish quiz</button>
      </div>
    </div>`;
    const copy = async (text, btn, label) => {
      try { await navigator.clipboard.writeText(text); }
      catch (e) {
        const i = document.createElement('input'); i.value = text; document.body.appendChild(i);
        i.select(); document.execCommand('copy'); i.remove();
      }
      btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = label; }, 1600);
    };
    $('#copyCode').addEventListener('click', e => copy(quiz.share_code, e.target, 'Copy code'));
    $('#copyLink').addEventListener('click', e => copy(link, e.target, 'Copy'));
    // QR
    try {
      const qr = qrcode(0, 'M');
      qr.addData(link); qr.make();
      $('#qrBox').innerHTML = qr.createSvgTag({ scalable: true });
      const svg = $('#qrBox svg'); if (svg) { svg.setAttribute('width', '180'); svg.setAttribute('height', '180'); }
      $('#dlQr').addEventListener('click', () => {
        const blob = new Blob([$('#qrBox').innerHTML], { type: 'image/svg+xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'qwizo-' + quiz.share_code + '.svg';
        a.click(); URL.revokeObjectURL(a.href);
      });
    } catch (e) { $('#qrBox').innerHTML = `<p style="color:var(--muted);font-size:13px">QR unavailable in this browser.</p>`; }
    $('#unpubBtn').addEventListener('click', async () => {
      if (await confirmDialog('Unpublish quiz?', 'Students will no longer be able to open the share link. Existing results are kept.', 'Unpublish')) {
        await api(`/api/quizzes/${quiz.id}/unpublish`, { method: 'POST' });
        location.hash = '#/quizzes/' + quiz.id;
      }
    });
  }

  /* ---------------- results ---------------- */
  async function ResultsView(root, params) {
    const quizId = params.id;
    const d = await api(`/api/quizzes/${quizId}/results/summary`);
    const subs = await api(`/api/quizzes/${quizId}/submissions`);
    const s = d.summary;
    const quiz = d.quiz;
    root.innerHTML = pageHead(`Results — ${quiz.title}`, s.total ? `${s.total} submission${s.total === 1 ? '' : 's'} · average ${s.avg_percentage}%` : 'No submissions yet.', `
      <a class="btn btn-secondary btn-sm" href="#/quizzes/${quizId}">${I.quiz} Editor</a>
      <a class="btn btn-secondary btn-sm" href="#/quizzes/${quizId}/share">${I.share} Share</a>`) + `
    ${s.total === 0 ? `<div class="empty"><h3>No results yet</h3><p>Share the quiz with your students — their results will appear here.</p>
      <a class="btn btn-primary" href="#/quizzes/${quizId}/share">Share quiz</a></div>` : `
    <div class="res-hero">
      <div class="stat"><b>${s.total}</b><span>Submissions</span></div>
      <div class="stat"><b>${s.avg_percentage}%</b><span>Average score</span></div>
      <div class="stat"><b>${hardest(s).length ? hardest(s)[0].correct_pct + '%' : '—'}</b><span>Hardest question</span></div>
      <div class="stat"><b>${easiest(s).length ? easiest(s)[0].correct_pct + '%' : '—'}</b><span>Easiest question</span></div>
    </div>
    <h3 style="font-size:16px;font-weight:700;color:var(--ink);margin:0 0 12px">Question performance</h3>
    <div class="qperf" style="margin-bottom:28px">
      ${s.per_question.map((p, i) => `
        <div class="qperf-row"><span class="t">Q${i + 1} · ${esc(p.text.slice(0, 80))}</span>
          <span class="qperf-bar ${p.correct_pct < 60 ? 'low' : ''}"><i style="width:${p.correct_pct}%"></i></span>
          <span class="qperf-pct">${p.correct_pct}%</span></div>`).join('')}
    </div>
    <h3 style="font-size:16px;font-weight:700;color:var(--ink);margin:0 0 12px">Submissions</h3>
    <div>${subs.submissions.map(sub => `
      <div class="sub-row" data-sub="${sub.id}">
        <div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--ink);font-size:14.5px">${esc(sub.student_name)}</div>
          <div style="font-size:12.5px;color:var(--muted)">${fmtDate(sub.submitted_at)} · ${fmtDur(sub.duration_sec)}${sub.late ? ' · late' : ''}</div></div>
        <span class="score-pill">${sub.score} / ${sub.max_score} · ${sub.percentage}%</span>
      </div>`).join('')}</div>`}`;
    $$('[data-sub]', root).forEach(row => row.addEventListener('click', () => showSubmission(row.dataset.sub)));
    function hardest(s) { return [...s.per_question].sort((a, b) => a.correct_pct - b.correct_pct); }
    function easiest(s) { return [...s.per_question].sort((a, b) => b.correct_pct - a.correct_pct); }
  }

  async function showSubmission(subId) {
    const d = await api('/api/submissions/' + subId);
    const s = d.submission;
    const snap = s.snapshot || {};
    const qmap = {};
    (snap.questions || []).forEach(q => { qmap[q.id] = q; });
    const veil = openModal(`
      <div class="modal-head"><h3>${esc(s.student_name)}</h3><button class="modal-x" data-x>✕</button></div>
      <div class="modal-body">
        <div style="display:flex;gap:16px;margin-bottom:18px;flex-wrap:wrap">
          <div><div style="font-size:12px;color:var(--muted)">Score</div><div style="font-size:20px;font-weight:700;color:var(--ink)">${s.score} / ${s.max_score} (${s.percentage}%)</div></div>
          <div><div style="font-size:12px;color:var(--muted)">Time taken</div><div style="font-size:20px;font-weight:700;color:var(--ink)">${fmtDur(s.duration_sec)}</div></div>
          <div><div style="font-size:12px;color:var(--muted)">Submitted</div><div style="font-size:14px;font-weight:600;color:var(--ink)">${fmtDate(s.submitted_at)}${s.late ? ' (late)' : ''}</div></div>
        </div>
        ${s.answers.map((a, i) => {
          const q = qmap[a.question_id] || {};
          return `<div class="ans-review ${a.is_correct ? 'correct' : 'wrong'}">
            <h5>Q${i + 1}. ${esc(q.text || '(question removed)')}<span class="tag ${a.is_correct ? 'ok' : 'no'}">${a.is_correct ? 'Correct' : 'Incorrect'}</span></h5>
            <p><span class="lbl">Student answered:</span> ${esc(studentAnswerText(q, a.answer))}</p>
            ${q.explanation ? `<p><span class="lbl">Explanation:</span> ${esc(q.explanation)}</p>` : ''}
            <p><span class="lbl">Marks:</span> ${a.marks_awarded} / ${q.marks || '—'}</p>
          </div>`;
        }).join('')}
      </div>`, true);
    veil.querySelector('[data-x]').addEventListener('click', closeModal);
  }

  function studentAnswerText(q, a) {
    if (!a) return '—';
    if (q.type === 'mcq') { const o = (q.options || []).find(x => x.id === a.option_id); return o ? o.text : '—'; }
    if (q.type === 'tf') return a.value === true ? 'True' : a.value === false ? 'False' : '—';
    if (q.type === 'short' || q.type === 'fill') return a.text || '—';
    if (q.type === 'matching') {
      const ms = a.matches || {};
      return Object.keys(ms).length ? Object.entries(ms).map(([l, r]) => {
        const lp = (q.pairs || []).find(p => p.id === l);
        const rp = (q.pairs || []).find(p => p.id === r);
        return (lp ? lp.left : '?') + ' → ' + (rp ? rp.right : '?');
      }).join('; ') : '—';
    }
    return '—';
  }

  /* ---------------- question bank ---------------- */
  async function BankView(root) {
    let f = { q: '', subject: '', type: '', difficulty: '' };
    const draw = async () => {
      const p = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
      const d = await api('/api/bank?' + p.toString());
      $('#bankList').innerHTML = d.items.length ? d.items.map(it => `
        <div class="quiz-row" data-id="${it.id}">
          <div class="grow"><h3>${esc(it.text.slice(0, 90))}</h3>
            <div class="meta">${QTYPE_LABELS[it.type]}${it.subject ? ' · ' + esc(it.subject) : ''}${it.topic ? ' · ' + esc(it.topic) : ''} · ${it.difficulty}</div></div>
          <div class="row-actions">
            <button class="icon-btn" title="Add to a quiz" data-bact="add">${I.plus}</button>
            <button class="icon-btn" title="Edit" data-bact="edit">${I.gear}</button>
            <button class="icon-btn danger" title="Delete" data-bact="del">${I.trash}</button>
          </div>
        </div>`).join('') : `<div class="empty"><h3>Bank is empty</h3><p>Save questions from any quiz to reuse them later.</p></div>`;
      $$('#bankList .quiz-row').forEach(row => {
        const id = row.dataset.id;
        const item = d.items.find(x => x.id === id);
        $('[data-bact="add"]', row).addEventListener('click', () => bankAddToQuiz(item));
        $('[data-bact="edit"]', row).addEventListener('click', () => bankEdit(item, draw));
        $('[data-bact="del"]', row).addEventListener('click', async () => {
          if (await confirmDialog('Delete from bank?', 'This question will be removed from your bank. Quizzes that already use a copy are not affected.', 'Delete', true)) {
            await api('/api/bank/' + id, { method: 'DELETE' });
            toast('Removed from bank.'); draw();
          }
        });
      });
    };
    root.innerHTML = pageHead('Question Bank', 'Save, find and reuse questions across quizzes.', `
      <button class="btn btn-primary btn-sm" id="bankNew">${I.plus} New question</button>`) + `
      <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">
        <div style="position:relative;flex:1;min-width:180px">
          <input class="input" id="bq" placeholder="Search questions…" style="padding-left:38px">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--faint);width:16px;height:16px;display:block">${I.search}</span>
        </div>
        <select class="select" id="bsub" style="width:auto"><option value="">All subjects</option></select>
        <select class="select" id="btype" style="width:auto"><option value="">All types</option>
          ${Object.entries(QTYPE_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
        <select class="select" id="bdiff" style="width:auto"><option value="">Any difficulty</option>
          <option>easy</option><option>medium</option><option>hard</option></select>
      </div>
      <div class="quiz-list" id="bankList"><div class="center-note"><div class="spinner"></div></div></div>`;
    const deb = debounce(() => { f.q = $('#bq').value.trim(); draw(); }, 350);
    $('#bq').addEventListener('input', deb);
    $('#btype').addEventListener('change', e => { f.type = e.target.value; draw(); });
    $('#bdiff').addEventListener('change', e => { f.difficulty = e.target.value; draw(); });
    $('#bsub').addEventListener('change', e => { f.subject = e.target.value; draw(); });
    $('#bankNew').addEventListener('click', () => bankEdit(null, draw));
    await draw();
    // populate subject filter from results
    const all = await api('/api/bank');
    const subs = [...new Set(all.items.map(i => i.subject).filter(Boolean))].sort();
    $('#bsub').innerHTML = `<option value="">All subjects</option>` + subs.map(s => `<option>${esc(s)}</option>`).join('');
  }

  async function bankAddToQuiz(item) {
    const d = await api('/api/quizzes?status=draft');
    const drafts = d.quizzes;
    if (!drafts.length) { toast('Create a draft quiz first.', true); return; }
    const veil = openModal(`
      <div class="modal-head"><h3>Add to quiz</h3><button class="modal-x" data-x>✕</button></div>
      <div class="modal-body">
        <p style="font-size:14px;color:var(--body);margin-bottom:14px">A copy is added — editing it in the quiz never changes the bank original.</p>
        <div class="field"><label>Draft quiz</label><select class="select" id="bqQuiz">
          ${drafts.map(q => `<option value="${q.id}">${esc(q.title)}</option>`).join('')}</select></div>
        <button class="btn btn-primary" id="bqGo" style="width:100%">Add question</button>
      </div>`);
    veil.querySelector('[data-x]').addEventListener('click', closeModal);
    $('#bqGo', veil).addEventListener('click', async e => {
      const b = e.target; b.disabled = true;
      try {
        await api(`/api/bank/${item.id}/add-to-quiz`, { method: 'POST', body: JSON.stringify({ quiz_id: $('#bqQuiz', veil).value }) });
        closeModal(); toast('Added to quiz.');
      } catch (err) { toast(err.message, true); b.disabled = false; }
    });
  }

  function bankEdit(item, redraw) {
    const isNew = !item;
    const p = item ? item.payload : {};
    const cur = {
      type: item ? item.type : 'mcq', text: item ? item.text : '', explanation: item ? item.explanation : '',
      marks: item ? item.marks : 1, difficulty: item ? item.difficulty : 'medium',
      subject: item ? item.subject : '', topic: item ? item.topic : '',
      options: p.options || [{ text: '', is_correct: true }, { text: '', is_correct: false }],
      accepted: p.accepted || [''], pairs: p.pairs || [{ left: '', right: '' }, { left: '', right: '' }],
      case_sensitive: !!p.case_sensitive,
    };
    const veil = openModal(`
      <div class="modal-head"><h3>${isNew ? 'New bank question' : 'Edit bank question'}</h3><button class="modal-x" data-x>✕</button></div>
      <div class="modal-body">
        <div class="form-err" id="beErr" style="display:none"></div>
        <div class="field"><label>Type</label><select class="select" id="beType">
          ${Object.entries(QTYPE_LABELS).map(([v, l]) => `<option value="${v}" ${cur.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>Question</label><textarea class="textarea" id="beText" rows="2">${esc(cur.text)}</textarea></div>
        <div id="beTypeZone"></div>
        <div class="f-row">
          <div class="field"><label>Marks</label><input class="input" id="beMarks" type="number" min="0.5" step="0.5" value="${cur.marks}"></div>
          <div class="field"><label>Difficulty</label><select class="select" id="beDiff">
            ${['easy', 'medium', 'hard'].map(x => `<option ${cur.difficulty === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        </div>
        <div class="f-row">
          <div class="field"><label>Subject</label><input class="input" id="beSubject" value="${esc(cur.subject)}"></div>
          <div class="field"><label>Topic</label><input class="input" id="beTopic" value="${esc(cur.topic)}"></div>
        </div>
        <div class="field"><label>Explanation</label><textarea class="textarea" id="beExpl" rows="2">${esc(cur.explanation)}</textarea></div>
        <button class="btn btn-primary" id="beSave" style="width:100%">${isNew ? 'Add to bank' : 'Save changes'}</button>
      </div>`, true);
    veil.querySelector('[data-x]').addEventListener('click', closeModal);
    const zone = $('#beTypeZone', veil);
    const drawType = () => {
      const t = $('#beType', veil).value;
      if (t === 'mcq') zone.innerHTML = `<div class="mini-label">Options — tick the correct one</div>` + cur.options.map((o, i) => `
        <div class="q-opt-row"><input type="checkbox" data-beoc="${i}" ${o.is_correct ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)">
        <input class="input" data-beot="${i}" value="${esc(o.text)}" placeholder="Option ${i + 1}"></div>`).join('') +
        `<button class="btn btn-secondary btn-sm" id="beOptAdd">${I.plus} Option</button>`;
      else if (t === 'tf') zone.innerHTML = `<div class="mini-label">Correct answer</div>
        <div class="truefalse-pick"><button class="tf-btn ${cur.tfTrue !== false ? 'on' : ''}" id="beTfT">True</button>
        <button class="tf-btn ${cur.tfTrue === false ? 'on' : ''}" id="beTfF">False</button></div>`;
      else if (t === 'short' || t === 'fill') zone.innerHTML = `<div class="mini-label">Accepted answers</div>` +
        cur.accepted.map((a, i) => `<div class="q-opt-row"><input class="input" data-beat="${i}" value="${esc(a)}" placeholder="Accepted answer"></div>`).join('') +
        `<button class="btn btn-secondary btn-sm" id="beAccAdd">${I.plus} Answer</button>`;
      else if (t === 'matching') zone.innerHTML = `<div class="mini-label">Pairs</div>` +
        cur.pairs.map((x, i) => `<div class="match-row"><input class="input" data-bepl="${i}" value="${esc(x.left || x.left_text || '')}" placeholder="Left">
        <span class="match-arrow">→</span><input class="input" data-bepr="${i}" value="${esc(x.right || x.right_text || '')}" placeholder="Right"><span></span></div>`).join('') +
        `<button class="btn btn-secondary btn-sm" id="bePairAdd">${I.plus} Pair</button>`;
      const oa = $('#beOptAdd', veil); if (oa) oa.addEventListener('click', () => { cur.options.push({ text: '', is_correct: false }); drawType(); });
      const aa = $('#beAccAdd', veil); if (aa) aa.addEventListener('click', () => { cur.accepted.push(''); drawType(); });
      const pa = $('#bePairAdd', veil); if (pa) pa.addEventListener('click', () => { cur.pairs.push({ left: '', right: '' }); drawType(); });
      const tft = $('#beTfT', veil);
      if (tft) {
        const setTf = v => { cur.tfTrue = v; tft.classList.toggle('on', v); $('#beTfF', veil).classList.toggle('on', !v); };
        tft.addEventListener('click', () => setTf(true));
        $('#beTfF', veil).addEventListener('click', () => setTf(false));
      }
    };
    drawType();
    $('#beType', veil).addEventListener('change', drawType);
    $('#beSave', veil).addEventListener('click', async e => {
      const btn = e.target; btn.disabled = true;
      const err = $('#beErr', veil); err.style.display = 'none';
      try {
        const t = $('#beType', veil).value;
        const body = {
          type: t, text: $('#beText', veil).value, explanation: $('#beExpl', veil).value,
          marks: parseFloat($('#beMarks', veil).value) || 1, difficulty: $('#beDiff', veil).value,
          subject: $('#beSubject', veil).value, topic: $('#beTopic', veil).value,
        };
        if (t === 'mcq') {
          body.options = cur.options.map((o, i) => ({
            text: ($(`[data-beot="${i}"]`, veil) || {}).value || '',
            is_correct: ($(`[data-beoc="${i}"]`, veil) || {}).checked || false,
          }));
        } else if (t === 'tf') {
          body.options = [{ text: 'True', is_correct: cur.tfTrue !== false }, { text: 'False', is_correct: cur.tfTrue === false }];
        } else if (t === 'short' || t === 'fill') {
          body.accepted = cur.accepted.map((_, i) => (($('[data-beat="' + i + '"]', veil) || {}).value || ''));
        } else if (t === 'matching') {
          body.pairs = cur.pairs.map((_, i) => ({
            left_text: (($('[data-bepl="' + i + '"]', veil) || {}).value || ''),
            right_text: (($('[data-bepr="' + i + '"]', veil) || {}).value || ''),
          }));
        }
        if (isNew) await api('/api/bank', { method: 'POST', body: JSON.stringify(body) });
        else await api('/api/bank/' + item.id, { method: 'PUT', body: JSON.stringify(body) });
        closeModal(); toast(isNew ? 'Added to bank.' : 'Bank question updated.'); redraw();
      } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; btn.disabled = false; }
    });
  }

  /* ---------------- settings ---------------- */
  async function SettingsView(root) {
    const u = App.user;
    root.innerHTML = pageHead('Settings', 'Your Qwizo teacher account.') + `
    <div class="card card-pad" style="max-width:560px">
      <div class="form-err" id="setErr" style="display:none"></div>
      <div class="field"><label>Full name</label><input class="input" id="setName" value="${esc(u.name)}" maxlength="80"></div>
      <div class="field"><label>Email</label><input class="input" value="${esc(u.email)}" disabled>
        <div class="hint">Email cannot be changed.</div></div>
      <button class="btn btn-primary btn-sm" id="setSave">Save changes</button>
    </div>
    <div class="card card-pad" style="max-width:560px;margin-top:16px">
      <h3 style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:8px">About Qwizo</h3>
      <p style="font-size:14px;color:var(--muted)">Create quizzes with AI or by hand, share them with a link, code or QR, and see results as students submit. Your data stays in your own private store.</p>
    </div>`;
    $('#setSave').addEventListener('click', async e => {
      const btn = e.target; btn.disabled = true;
      const err = $('#setErr'); err.style.display = 'none';
      try {
        // name update via a tiny dedicated path: reuse signup-less endpoint
        await api('/api/auth/me', { method: 'PUT', body: JSON.stringify({ name: $('#setName').value.trim() }) });
        const d = await api('/api/auth/me');
        App.user = d.user; toast('Saved.'); renderShell('settings'); SettingsView($('#viewRoot'));
      } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; btn.disabled = false; }
    });
  }

  /* ---------------- boot ---------------- */
  // Flush any pending debounced autosaves before leaving the editor,
  // so quick navigation doesn't lose the teacher's last keystrokes.
  async function flushPendingSaves() {
    const timers = Editor.qSaveTimers || {};
    const ids = Object.keys(timers);
    ids.forEach(id => clearTimeout(timers[id]));
    Editor.qSaveTimers = {};
    if (Editor.flushMeta) { const f = Editor.flushMeta; Editor.flushMeta = null; try { await f(); } catch (e) {} }
    for (const id of ids) {
      try { await saveQuestion(id); } catch (e) { /* keep going */ }
    }
  }
  window.addEventListener('hashchange', () => { flushPendingSaves().finally(render); });
  window.addEventListener('beforeunload', (e) => {
    const timers = Editor.qSaveTimers || {};
    if (Object.keys(timers).length || Editor.flushMeta) e.preventDefault();
  });
  if (!location.hash) location.hash = '#/';
  render();
})();
