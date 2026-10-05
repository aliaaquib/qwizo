/* Qwizo student flow — take.js. Focused, no account, mobile-first. */
(function () {
  'use strict';
  const root = document.getElementById('take');
  const path = window.location.pathname;
  const codeMatch = path.match(/^\/q\/([A-Za-z0-9-]+)/);
  const CODE = codeMatch ? codeMatch[1].toUpperCase() : null;
  const resultTokenMatch = path.match(/^\/q\/[A-Za-z0-9-]+\/r\/(.+)$/);
  const RESULT_TOKEN = resultTokenMatch ? resultTokenMatch[1] : null;

  const state = {
    quiz: null, attemptId: null, expiresAt: null,
    index: 0, answers: {}, timerInt: null, submitted: false,
  };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(msg) {
    const box = document.querySelector('.toasts') || (() => {
      const d = document.createElement('div'); d.className = 'toasts'; document.body.appendChild(d); return d;
    })();
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }
  async function api(url, opts) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
  }
  function mark(text) {
    return esc(text).replace(/_____/g, '<span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>');
  }

  /* ---------- views ---------- */
  function showError(title, msg) {
    root.innerHTML = `<div class="take-wrap"><div class="take-main">
      <div class="center-card"><h1>${esc(title)}</h1><p>${esc(msg)}</p>
      <a class="btn btn-secondary" href="/">Back to Qwizo</a></div></div></div>`;
  }

  function brandMini() {
    return `<div class="brand-mini"><span class="brand-mark">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3 8-8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>
      </span>Qwizo</div>`;
  }

  async function loadQuiz() {
    try {
      const data = await api('/api/public/quiz/' + CODE);
      state.quiz = data.quiz;
      const s = state.quiz.settings;
      if (s.shuffle_questions) state.quiz.questions = shuffle(state.quiz.questions);
      if (s.shuffle_options) {
        state.quiz.questions.forEach(q => {
          if (q.options) q.options = shuffle(q.options);
          if (q.rights) q.rights = shuffle(q.rights);
        });
      }
      state.quiz.questions.forEach(q => {
        if (q.type === 'matching') state.answers[q.id] = { matches: {} };
      });
      renderIntro();
    } catch (e) {
      showError('Quiz not found', e.message || 'Check the code and try again.');
    }
  }

  function renderIntro() {
    const q = state.quiz, s = q.settings;
    const mins = q.time_limit_sec ? Math.round(q.time_limit_sec / 60) : null;
    root.innerHTML = `<div class="take-wrap">
      <div class="take-top"><div class="take-top-inner">${brandMini()}</div></div>
      <div class="take-main"><div class="intro-card">
        <div class="kicker">${esc(q.subject || 'Quiz')}</div>
        <h1>${esc(q.title)}</h1>
        ${q.description ? `<p class="desc">${esc(q.description)}</p>` : ''}
        <div class="intro-meta">
          <div>Questions<b>${q.questions.length}</b></div>
          ${mins ? `<div>Time limit<b>${mins} min</b></div>` : `<div>Time limit<b>No limit</b></div>`}
        </div>
        <div class="form-err" id="introErr" style="display:none"></div>
        ${s.require_student_name ? `<div class="field"><label for="stuName">Your name</label>
          <input class="input" id="stuName" placeholder="e.g. Aiza" autocomplete="name" maxlength="80"></div>` : ''}
        <button class="btn btn-primary" id="startBtn" style="width:100%">Start quiz</button>
      </div></div></div>`;
    const nameInput = document.getElementById('stuName');
    if (nameInput) nameInput.focus();
    document.getElementById('startBtn').addEventListener('click', startQuiz);
    if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') startQuiz(); });
  }

  async function startQuiz() {
    const name = (document.getElementById('stuName') || {}).value || '';
    const btn = document.getElementById('startBtn');
    const errBox = document.getElementById('introErr');
    btn.disabled = true; btn.textContent = 'Starting…';
    try {
      const data = await api('/api/public/quiz/' + CODE + '/start', {
        method: 'POST', body: JSON.stringify({ student_name: name.trim() }),
      });
      state.attemptId = data.attempt_id;
      state.expiresAt = data.expires_at;
      state.studentName = name.trim();
      state.index = 0;
      renderQuestion();
      startTimer();
    } catch (e) {
      errBox.textContent = e.message; errBox.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Start quiz';
    }
  }

  function startTimer() {
    if (!state.expiresAt) return;
    const tick = () => {
      const left = state.expiresAt - Date.now();
      const el = document.getElementById('timer');
      if (!el) { clearInterval(state.timerInt); state.timerInt = null; return; }
      el.textContent = fmtTime(left);
      el.classList.toggle('warn', left < 5 * 60 * 1000 && left >= 60 * 1000);
      el.classList.toggle('danger', left < 60 * 1000);
      if (left <= 0) {
        clearInterval(state.timerInt); state.timerInt = null;
        if (!state.submitted) { toast("Time's up — submitting your answers."); submitQuiz(true); }
      }
    };
    clearInterval(state.timerInt);
    state.timerInt = setInterval(tick, 1000);
    tick();
  }

  function renderQuestion() {
    const q = state.quiz;
    const cur = q.questions[state.index];
    const total = q.questions.length;
    const timerHtml = state.expiresAt ? `<span class="timer" id="timer">--:--</span>` : '';
    root.innerHTML = `<div class="take-wrap">
      <div class="take-top"><div class="take-top-inner">
        ${brandMini()}
        <div class="progress"><i style="width:${Math.round(((state.index + 1) / total) * 100)}%"></i></div>
        <span class="q-count">${state.index + 1} / ${total}</span>
        ${timerHtml}
      </div></div>
      <div class="take-main"><div class="q-card">
        <div class="q-meta"><span class="q-count">Question ${state.index + 1}</span>
          <span class="q-marks">${cur.marks} ${cur.marks == 1 ? 'mark' : 'marks'}</span></div>
        <div class="q-text">${mark(cur.text)}</div>
        <div id="ansZone">${answerHtml(cur)}</div>
      </div></div>
      <div class="take-nav"><div class="take-nav-inner">
        <button class="btn btn-secondary" id="prevBtn" ${state.index === 0 ? 'disabled' : ''}>Previous</button>
        <span class="spacer"></span>
        ${state.index === total - 1
          ? `<button class="btn btn-primary" id="nextBtn">Review &amp; submit</button>`
          : `<button class="btn btn-primary" id="nextBtn">Next</button>`}
      </div></div></div>`;
    wireAnswers(cur);
    document.getElementById('prevBtn').addEventListener('click', () => {
      if (state.index > 0) { state.index--; renderQuestion(); }
    });
    document.getElementById('nextBtn').addEventListener('click', () => {
      if (state.index === total - 1) confirmSubmit();
      else { state.index++; renderQuestion(); }
    });
  }

  function answerHtml(cur) {
    const a = state.answers[cur.id];
    if (cur.type === 'mcq') {
      const letters = 'ABCDEFGHIJ';
      return cur.options.map((o, i) => `
        <button class="opt ${a && a.option_id === o.id ? 'sel' : ''}" data-opt="${o.id}">
          <span class="letter">${letters[i] || '•'}</span><span>${esc(o.text)}</span>
        </button>`).join('');
    }
    if (cur.type === 'tf') {
      return `<div class="tf-row">
        <button class="tf-btn ${a && a.value === true ? 'sel' : ''}" data-tf="true">True</button>
        <button class="tf-btn ${a && a.value === false ? 'sel' : ''}" data-tf="false">False</button>
      </div>`;
    }
    if (cur.type === 'short' || cur.type === 'fill') {
      return `<input class="answer-input" id="textAns" placeholder="Type your answer" value="${esc((a && a.text) || '')}" autocomplete="off">`;
    }
    if (cur.type === 'matching') {
      const matches = (a && a.matches) || {};
      return cur.lefts.map(l => `
        <div class="match-item"><div class="left">${esc(l.text)}</div>
          <select data-left="${l.id}" class="${matches[l.id] ? 'answered' : ''}">
            <option value="">Choose a match…</option>
            ${cur.rights.map(r => `<option value="${r.id}" ${matches[l.id] === r.id ? 'selected' : ''}>${esc(r.text)}</option>`).join('')}
          </select></div>`).join('');
    }
    return '';
  }

  function wireAnswers(cur) {
    if (cur.type === 'mcq') {
      document.querySelectorAll('[data-opt]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.answers[cur.id] = { option_id: btn.dataset.opt };
          document.querySelectorAll('[data-opt]').forEach(b => b.classList.toggle('sel', b === btn));
        });
      });
    } else if (cur.type === 'tf') {
      document.querySelectorAll('[data-tf]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.answers[cur.id] = { value: btn.dataset.tf === 'true' };
          document.querySelectorAll('[data-tf]').forEach(b => b.classList.toggle('sel', b === btn));
        });
      });
    } else if (cur.type === 'short' || cur.type === 'fill') {
      const input = document.getElementById('textAns');
      input.addEventListener('input', () => { state.answers[cur.id] = { text: input.value }; });
    } else if (cur.type === 'matching') {
      document.querySelectorAll('[data-left]').forEach(sel => {
        sel.addEventListener('change', () => {
          const m = state.answers[cur.id].matches;
          if (sel.value) m[sel.dataset.left] = sel.value; else delete m[sel.dataset.left];
          sel.classList.toggle('answered', !!sel.value);
        });
      });
    }
  }

  function answeredCount() {
    return state.quiz.questions.filter(q => {
      const a = state.answers[q.id];
      if (!a) return false;
      if (q.type === 'mcq') return !!a.option_id;
      if (q.type === 'tf') return typeof a.value === 'boolean';
      if (q.type === 'short' || q.type === 'fill') return !!(a.text || '').trim();
      if (q.type === 'matching') return Object.keys(a.matches || {}).length > 0;
      return false;
    }).length;
  }

  function confirmSubmit() {
    const total = state.quiz.questions.length;
    const done = answeredCount();
    const veil = document.createElement('div');
    veil.className = 'modal-veil';
    veil.innerHTML = `<div class="modal">
      <h3>Submit quiz?</h3>
      <p>You answered ${done} of ${total} questions. Once submitted, you cannot change your answers.</p>
      <div class="row">
        <button class="btn btn-secondary" id="cancelSubmit">Keep answering</button>
        <button class="btn btn-primary" id="doSubmit">Submit</button>
      </div></div>`;
    document.body.appendChild(veil);
    veil.querySelector('#cancelSubmit').addEventListener('click', () => veil.remove());
    veil.addEventListener('click', e => { if (e.target === veil) veil.remove(); });
    veil.querySelector('#doSubmit').addEventListener('click', () => { veil.remove(); submitQuiz(false); });
  }

  async function submitQuiz(auto) {
    if (state.submitted) return;
    state.submitted = true;
    clearInterval(state.timerInt); state.timerInt = null;
    root.innerHTML = `<div class="take-wrap"><div class="boot"><div class="boot-spin"></div><p>${auto ? 'Time expired — submitting…' : 'Submitting your answers…'}</p></div></div>`;
    try {
      const data = await api('/api/public/quiz/' + CODE + '/submit', {
        method: 'POST',
        body: JSON.stringify({ attempt_id: state.attemptId, answers: state.answers }),
      });
      if (data.result_token) {
        try { sessionStorage.setItem('qwizo_result_' + CODE, data.result_token); } catch (e) { /* ignore */ }
      }
      renderResult(data.result, data.result_token);
    } catch (e) {
      state.submitted = false;
      showError('Submission failed', e.message);
    }
  }

  function renderResult(r, token) {
    const s = state.quiz.settings || {};
    const showScore = s.show_score !== false && r.score !== undefined;
    const review = r.questions || [];
    const resultUrl = token ? `/q/${CODE}/r/${token}` : null;
    if (resultUrl) {
      try { history.replaceState(null, '', resultUrl); } catch (e) { /* ignore */ }
    }
    root.innerHTML = `<div class="take-wrap">
      <div class="take-top"><div class="take-top-inner">${brandMini()}</div></div>
      <div class="take-main">
        <div class="result-hero">
          <div class="kicker">${esc(state.quiz.title)} — ${r.late ? 'submitted late' : 'submitted'}</div>
          ${showScore ? `
            <div class="result-score">${r.score} <span style="font-size:24px;color:var(--muted)">/ ${r.max_score}</span></div>
            <div class="result-pct">${r.percentage}%</div>
            <div class="result-stats">
              <div>Correct<b style="color:var(--green)">${r.correct_count}</b></div>
              <div>Incorrect<b style="color:var(--red)">${r.incorrect_count}</b></div>
              ${r.duration_sec != null ? `<div>Time<b>${Math.floor(r.duration_sec / 60)}m ${r.duration_sec % 60}s</b></div>` : ''}
            </div>` : `
            <div class="result-score" style="font-size:30px">Submitted</div>
            <p style="color:var(--muted);margin-top:10px">Your teacher will share your score with you.</p>`}
          ${resultUrl ? `<p style="margin-top:18px;font-size:13px;color:var(--muted)">Bookmark this page to view your result later:<br>
            <span style="font-family:var(--mono);font-size:12px;word-break:break-all">${esc(window.location.origin + resultUrl)}</span></p>` : ''}
        </div>
        ${review.length ? `<div class="review">` + review.map((q, i) => `
          <div class="review-item ${q.is_correct ? 'ok' : 'no'}">
            <h4>Q${i + 1}. ${esc(q.text)}</h4>
            <span class="verdict ${q.is_correct ? 'ok' : 'no'}">${q.is_correct ? 'Correct' : 'Incorrect'}</span>
            <span style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-left:10px">${q.marks_awarded} / ${q.marks}</span>
            ${q.correct !== undefined && q.correct !== null ? `<p><span class="lbl">Correct answer: </span>${esc(correctText(q.correct))}</p>` : ''}
            ${q.explanation ? `<div class="expl">${esc(q.explanation)}</div>` : ''}
          </div>`).join('') + `</div>` : ''}
      </div></div>`;
  }

  function correctText(c) {
    if (Array.isArray(c)) {
      if (c.length && typeof c[0] === 'object') return c.map(p => p.left + ' → ' + p.right).join('; ');
      return c.join(' / ');
    }
    if (typeof c === 'object' && c !== null) return JSON.stringify(c);
    return String(c);
  }

  async function loadResultToken() {
    try {
      const data = await api('/api/public/result/' + RESULT_TOKEN);
      state.quiz = { title: data.quiz_title, settings: {} };
      renderResult(data.result, RESULT_TOKEN);
    } catch (e) {
      showError('Result not found', 'This result link is invalid or has expired.');
    }
  }

  /* ---------- boot ---------- */
  if (!CODE) { showError('No quiz code', 'This link is incomplete.'); return; }
  if (RESULT_TOKEN) loadResultToken();
  else loadQuiz();
})();
