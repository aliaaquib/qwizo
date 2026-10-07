/**
 * Qwizo — Cloudflare Worker.
 * Serves the marketing site, teacher app, student pages, and the JSON API.
 * Data: per-teacher Durable Object (SQLite) + KV indexes.
 * AI: Workers AI. Secrets: JWT_SECRET via wrangler secret.
 */

import { TeacherStore } from './db.js';
import { TemplateStore } from './templates.js';

/**
 * Proxy to a teacher's Durable Object. Every data call becomes
 * POST {method, args} to the DO's fetch handler. The stub is
 * per-teacher, so cross-teacher access is structurally impossible.
 */
function teacherStore(env, teacherId) {
  const id = env.TEACHER_STORE.idFromName(`teacher:${teacherId}`);
  const stub = env.TEACHER_STORE.get(id);
  return new Proxy({}, {
    get: (_, method) => async (...args) => {
      const res = await stub.fetch(new Request('https://qwizo.internal/do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args }),
      }));
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `store ${String(method)} failed`);
      if (body.error) throw new Error(body.error);
      return body.result;
    },
  });
}

/**
 * Proxy to the single global TemplateStore. Same RPC-over-HTTP pattern as
 * teacherStore; the fixed name keeps one shared database for all teachers.
 */
function templateStore(env) {
  const id = env.TEMPLATE_STORE.idFromName('templates:global');
  const stub = env.TEMPLATE_STORE.get(id);
  return new Proxy({}, {
    get: (_, method) => async (...args) => {
      const res = await stub.fetch(new Request('https://qwizo.internal/do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args }),
      }));
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `store ${String(method)} failed`);
      if (body.error) throw new Error(body.error);
      return body.result;
    },
  });
}
import {
  hashPassword, verifyPassword, signToken, verifyToken, getTokenFromRequest,
  sessionCookie, clearSessionCookie, newSessionPayload, requireTeacher,
  rateLimit, clientIp, isEmail, jsonResponse, err, readJson, COOKIE_NAME,
} from './auth.js';
import { generateQuizQuestions, questionAIAction, QUESTION_TYPES } from './ai.js';
import { gradeSubmission, buildSnapshot, publicQuizPayload, validateQuizForPublish, validateQuestionForPublish } from './grade.js';
import { extractMaterialText } from './upload.js';

export { TeacherStore, TemplateStore };

const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
const CODE_DIGITS = '23456789';

function randomCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  s += '-';
  for (let i = 0; i < 4; i++) s += CODE_DIGITS[Math.floor(Math.random() * CODE_DIGITS.length)];
  return s;
}

async function uniqueShareCode(env) {
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const exists = await env.QWIZO_KV.get(`code:${code}`);
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique share code');
}

const DEFAULT_SETTINGS = {
  shuffle_questions: false,
  shuffle_options: false,
  show_score: true,
  show_results_immediately: true,
  show_correct_answers: true,
  show_explanations: true,
  allow_multiple_attempts: false,
  require_student_name: true,
};

function withDefaults(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

function publicTeacher(u) {
  if (!u) return null;
  let subjects = [];
  let grades = [];
  try { subjects = JSON.parse(u.subjects || '[]'); } catch (e) { /* keep [] */ }
  try { grades = JSON.parse(u.grades || '[]'); } catch (e) { /* keep [] */ }
  return {
    id: u.id, name: u.name, email: u.email, created_at: u.created_at,
    role: u.role || '', job_title: u.job_title || '',
    specialization: u.specialization || '',
    subjects, grades,
    onboarding_done: !!u.onboarding_done,
  };
}

async function teacherCtx(req, env) {
  const t = await requireTeacher(req, env);
  if (!t) return { response: err('Not signed in', 401) };
  const store = teacherStore(env, t.userId);
  const user = await store.getUser(t.userId);
  if (!user) return { response: err('Account not found', 401) };
  return { store, user };
}

/* ================= auth routes ================= */

async function handleSignup(req, env, _ctx) {
  const ip = clientIp(req);
  if (!(await rateLimit(env, `auth:${ip}`, 10, 60))) return err('Too many attempts. Try again in a minute.', 429);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const name = (body.name || '').trim().slice(0, 80);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!name) return err('Please enter your name.');
  if (!isEmail(email)) return err('Please enter a valid email address.');
  if (password.length < 8) return err('Password must be at least 8 characters.');

  const existing = await env.QWIZO_KV.get(`user:email:${email}`);
  if (existing) return err('An account with this email already exists. Try logging in.', 409);

  const userId = crypto.randomUUID();
  const store = teacherStore(env, userId);
  const user = await store.createUser({ id: userId, name, email, password_hash: await hashPassword(password) });
  await env.QWIZO_KV.put(`user:email:${email}`, userId);

  const token = await signToken(env.JWT_SECRET, newSessionPayload(userId));
  return jsonResponse({ user: publicTeacher(user) }, 201, { 'Set-Cookie': sessionCookie(token, 7 * 86400) });
}

async function handleLogin(req, env, _ctx) {
  const ip = clientIp(req);
  if (!(await rateLimit(env, `auth:${ip}`, 10, 60))) return err('Too many attempts. Try again in a minute.', 429);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!isEmail(email) || !password) return err('Enter your email and password.');

  const userId = await env.QWIZO_KV.get(`user:email:${email}`);
  if (!userId) return err('No account found with this email.', 401);
  const store = teacherStore(env, userId);
  const user = await store.getUser(userId);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return err('Incorrect email or password.', 401);
  }
  const token = await signToken(env.JWT_SECRET, newSessionPayload(userId));
  return jsonResponse({ user: publicTeacher(user) }, 200, { 'Set-Cookie': sessionCookie(token, 7 * 86400) });
}

async function handleLogout(req, env, _ctx) {
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}

async function handleUpdateMe(req, env, ctx) {
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const name = (body.name || '').trim().slice(0, 80);
  if (!name) return err('Please enter your name.');
  const user = await ctx.store.updateUser(ctx.user.id, { name });
  return jsonResponse({ user: publicTeacher(user) });
}

/** Save onboarding answers and mark onboarding complete. */
async function handleOnboarding(req, env, ctx) {
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const role = (body.role || '').trim().slice(0, 50);
  if (!role) return err('Please choose a role.');
  const subjects = Array.isArray(body.subjects) ? body.subjects.map(s => String(s).slice(0, 60)).slice(0, 30) : [];
  const grades = Array.isArray(body.grades) ? body.grades.map(g => String(g).slice(0, 30)).slice(0, 20) : [];
  const user = await ctx.store.updateUser(ctx.user.id, {
    role,
    job_title: (body.job_title || '').trim().slice(0, 80),
    specialization: (body.specialization || '').trim().slice(0, 80),
    subjects, grades,
    onboarding_done: true,
  });
  return jsonResponse({ user: publicTeacher(user) });
}

/* ================= teacher: quizzes ================= */

async function handleListQuizzes(req, env, ctx, params, url) {
  const status = url.searchParams.get('status') || null;
  const q = url.searchParams.get('q') || '';
  const quizzes = await ctx.store.listQuizzes({ status, q });
  return jsonResponse({ quizzes: quizzes.map(qu => ({ ...qu, settings: JSON.parse(qu.settings || '{}') })) });
}

async function handleCreateQuiz(req, env, ctx) {
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const quiz = await ctx.store.createQuiz({
    title: (body.title || 'Untitled quiz').slice(0, 200),
    description: (body.description || '').slice(0, 2000),
    subject: (body.subject || '').slice(0, 100),
    curriculum: (body.curriculum || '').slice(0, 100),
    level: (body.level || '').slice(0, 100),
    topic: (body.topic || '').slice(0, 200),
    time_limit_sec: body.time_limit_sec ? Math.min(Math.max(parseInt(body.time_limit_sec, 10), 60), 86400) : null,
    settings: withDefaults(body.settings),
  });
  return jsonResponse({ quiz: { ...quiz, settings: JSON.parse(quiz.settings) } }, 201);
}

async function handleGetQuiz(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  const questions = await ctx.store.listQuestions(params.id);
  return jsonResponse({ quiz: { ...quiz, settings: withDefaults(JSON.parse(quiz.settings || '{}')) }, questions });
}

async function handleUpdateQuiz(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  if (quiz.status === 'published') return err('Unpublish the quiz before editing it.', 409);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const patch = {};
  for (const k of ['title', 'description', 'subject', 'curriculum', 'level', 'topic']) {
    if (body[k] !== undefined) patch[k] = String(body[k]).slice(0, k === 'title' ? 200 : 2000);
  }
  if (body.time_limit_sec !== undefined) {
    patch.time_limit_sec = body.time_limit_sec ? Math.min(Math.max(parseInt(body.time_limit_sec, 10), 60), 86400) : null;
  }
  if (body.settings !== undefined) patch.settings = withDefaults(body.settings);
  const updated = await ctx.store.updateQuiz(params.id, patch);
  return jsonResponse({ quiz: { ...updated, settings: JSON.parse(updated.settings) } });
}

async function handleDeleteQuiz(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  if (quiz.share_code) await env.QWIZO_KV.delete(`code:${quiz.share_code}`);
  await ctx.store.deleteQuiz(params.id);
  return jsonResponse({ ok: true });
}

async function handleDuplicateQuiz(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  const copy = await ctx.store.createQuiz({
    title: `${quiz.title} (copy)`.slice(0, 200),
    description: quiz.description, subject: quiz.subject, curriculum: quiz.curriculum,
    level: quiz.level, topic: quiz.topic, time_limit_sec: quiz.time_limit_sec,
    settings: withDefaults(JSON.parse(quiz.settings || '{}')),
  });
  const questions = await ctx.store.listQuestions(params.id);
  for (const q of questions) {
    const dup = await ctx.store.duplicateQuestion(q.id);
    // Move the duplicated question into the new quiz
    await ctx.store.moveQuestionToQuiz(dup.id, copy.id);
  }
  return jsonResponse({ quiz: { ...copy, settings: JSON.parse(copy.settings) } }, 201);
}

async function handlePublishQuiz(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  if (quiz.status === 'published') return err('Quiz is already published.', 409);
  const questions = await ctx.store.listQuestions(params.id);
  const errors = validateQuizForPublish(quiz, questions);
  if (errors.length) return err('This quiz cannot be published yet.', 422, { errors });
  const snapshot = buildSnapshot(quiz, questions);
  let code = quiz.share_code;
  if (!code) {
    code = await uniqueShareCode(env);
    await env.QWIZO_KV.put(`code:${code}`, ctx.user.id);
  }
  const updated = await ctx.store.updateQuiz(params.id, {
    status: 'published', share_code: code,
    published_snapshot: JSON.stringify(snapshot), published_at: Date.now(),
  });
  // Save to the shared template gallery so other teachers can reuse it.
  // Re-publishing updates the existing template (keyed by quiz + teacher).
  // Template saving must never break publishing, so failures are logged only.
  try {
    await templateStore(env).upsertTemplate({
      source_quiz_id: params.id,
      teacher_id: ctx.user.id,
      teacher_name: ctx.user.name || '',
      title: quiz.title,
      description: quiz.description,
      subject: quiz.subject,
      level: quiz.level,
      topic: quiz.topic,
      question_count: questions.length,
      snapshot: { ...snapshot, description: quiz.description, subject: quiz.subject, level: quiz.level, topic: quiz.topic },
    });
  } catch (e) {
    console.error('template save failed', e);
  }
  return jsonResponse({ quiz: { ...updated, settings: JSON.parse(updated.settings) }, share_code: code });
}

async function handleUnpublishQuiz(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  const updated = await ctx.store.updateQuiz(params.id, { status: 'draft' });
  return jsonResponse({ quiz: { ...updated, settings: JSON.parse(updated.settings) } });
}

async function handleArchiveQuiz(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  const updated = await ctx.store.updateQuiz(params.id, { status: 'archived' });
  return jsonResponse({ quiz: { ...updated, settings: JSON.parse(updated.settings) } });
}

/* ================= teacher: questions ================= */

function sanitizeQuestionInput(body) {
  const type = body.type;
  if (!QUESTION_TYPES.includes(type)) throw new Error(`Unknown question type "${type}"`);
  const data = {
    type,
    text: String(body.text || '').slice(0, 4000),
    explanation: String(body.explanation || '').slice(0, 4000),
    marks: Math.min(Math.max(Number(body.marks) || 1, 0.5), 100),
    difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium',
    case_sensitive: !!body.case_sensitive,
  };
  if (type === 'mcq') {
    const opts = (body.options || []).slice(0, 6).map(o => ({
      id: String(o.id || '').slice(0, 40) || undefined,
      text: String(o.text || '').slice(0, 500), is_correct: !!o.is_correct,
    }));
    data.options = opts;
  } else if (type === 'tf') {
    const v = body.correct_bool !== undefined ? !!body.correct_bool
      : (body.options || []).some(o => o.is_correct && /true/i.test(o.text || ''));
    data.options = [{ text: 'True', is_correct: v }, { text: 'False', is_correct: !v }];
  } else if (type === 'short' || type === 'fill') {
    data.accepted = (body.accepted || []).slice(0, 8).map(a => ({
      id: typeof a === 'object' && a ? String(a.id || '').slice(0, 40) || undefined : undefined,
      text: String(typeof a === 'string' ? a : (a.text || '')).slice(0, 300),
    }));
  } else if (type === 'matching') {
    data.pairs = (body.pairs || []).slice(0, 8).map(p => ({
      id: String(p.id || '').slice(0, 40) || undefined,
      left_text: String(p.left_text || p.left || '').slice(0, 300),
      right_text: String(p.right_text || p.right || '').slice(0, 300),
    }));
  }
  return data;
}

async function handleCreateQuestion(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  if (quiz.status === 'published') return err('Unpublish the quiz before editing it.', 409);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  let data;
  try { data = sanitizeQuestionInput(body); } catch (e) { return err(e.message, 400); }
  const q = await ctx.store.createQuestion(params.id, data);
  return jsonResponse({ question: q }, 201);
}

async function handleUpdateQuestion(req, env, ctx, params) {
  const existing = await ctx.store.getQuestion(params.qid);
  if (!existing) return err('Question not found', 404);
  const quiz = await ctx.store.getQuiz(existing.quiz_id);
  if (quiz && quiz.status === 'published') return err('Unpublish the quiz before editing it.', 409);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  let data;
  try { data = sanitizeQuestionInput({ ...body, type: body.type || existing.type }); }
  catch (e) { return err(e.message, 400); }
  const q = await ctx.store.updateQuestion(params.qid, data);
  return jsonResponse({ question: q });
}

async function handleDeleteQuestion(req, env, ctx, params) {
  const existing = await ctx.store.getQuestion(params.qid);
  if (!existing) return err('Question not found', 404);
  const quiz = await ctx.store.getQuiz(existing.quiz_id);
  if (quiz && quiz.status === 'published') return err('Unpublish the quiz before editing it.', 409);
  await ctx.store.deleteQuestion(params.qid);
  return jsonResponse({ ok: true });
}

async function handleDuplicateQuestion(req, env, ctx, params) {
  const existing = await ctx.store.getQuestion(params.qid);
  if (!existing) return err('Question not found', 404);
  const quiz = await ctx.store.getQuiz(existing.quiz_id);
  if (quiz && quiz.status === 'published') return err('Unpublish the quiz before editing it.', 409);
  const q = await ctx.store.duplicateQuestion(params.qid);
  return jsonResponse({ question: q }, 201);
}

async function handleReorderQuestions(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  if (quiz.status === 'published') return err('Unpublish the quiz before editing it.', 409);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const ids = body.question_ids;
  if (!Array.isArray(ids)) return err('question_ids must be an array');
  const existing = (await ctx.store.listQuestions(params.id)).map(q => q.id).sort();
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(existing)) return err('Question list does not match the quiz', 400);
  await ctx.store.reorderQuestions(params.id, ids);
  return jsonResponse({ ok: true });
}

async function handleQuestionToBank(req, env, ctx, params) {
  const q = await ctx.store.getQuestion(params.qid);
  if (!q) return err('Question not found', 404);
  const quiz = q.quiz_id ? await ctx.store.getQuiz(q.quiz_id) : null;
  const item = await ctx.store.createBankItem({
    type: q.type, text: q.text, explanation: q.explanation, marks: q.marks, difficulty: q.difficulty,
    subject: quiz ? quiz.subject : '', topic: quiz ? quiz.topic : '',
    curriculum: quiz ? quiz.curriculum : '', level: quiz ? quiz.level : '',
    payload: { options: q.options, pairs: q.pairs, accepted: q.accepted.map(a => a.text), case_sensitive: q.case_sensitive },
  });
  return jsonResponse({ item }, 201);
}

async function handleQuestionAIAction(req, env, ctx, params) {
  if (!(await rateLimit(env, `ai:${ctx.user.id}`, 30, 3600))) return err('AI limit reached. Try again later.', 429);
  const q = await ctx.store.getQuestion(params.qid);
  if (!q) return err('Question not found', 404);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const action = body.action;
  const result = await questionAIAction(env, action, q, { target_type: body.target_type });
  if (!result.ok) return err(result.reason, 502);
  // Return a proposal only — the teacher decides whether to apply it.
  return jsonResponse({ proposal: result.proposal });
}

/* ================= teacher: question bank ================= */

async function handleListBank(req, env, ctx, params, url) {
  const sp = url.searchParams;
  const items = await ctx.store.listBank({
    q: sp.get('q') || '', subject: sp.get('subject') || '', topic: sp.get('topic') || '',
    type: sp.get('type') || '', difficulty: sp.get('difficulty') || '',
  });
  return jsonResponse({ items });
}

/* ================= templates (shared gallery) ================= */

async function handleListTemplates(req, env, ctx, params, url) {
  const sp = url.searchParams;
  const { templates, total } = await templateStore(env).listTemplates({
    search: sp.get('q') || '', subject: sp.get('subject') || '',
    limit: sp.get('limit') || 24, offset: sp.get('offset') || 0,
  });
  return jsonResponse({ templates, total });
}

async function handleListTemplateSubjects(req, env, ctx) {
  const subjects = await templateStore(env).listSubjects();
  return jsonResponse({ subjects });
}

async function handleGetTemplate(req, env, ctx, params) {
  const t = await templateStore(env).getTemplate(params.id);
  if (!t) return err('Template not found', 404);
  return jsonResponse({ template: t });
}

async function handleDeleteTemplate(req, env, ctx, params) {
  try {
    const ok = await templateStore(env).deleteTemplate(params.id, ctx.user.id);
    if (!ok) return err('Template not found', 404);
  } catch (e) {
    return err(e.message || 'Could not delete template', 403);
  }
  return jsonResponse({ ok: true });
}

/**
 * Clone a template into the teacher's own quizzes as a new draft.
 * Child ids (options/pairs) are stripped so fresh UUIDs are minted —
 * reusing source ids would violate the options.id UNIQUE constraint.
 */
async function handleUseTemplate(req, env, ctx, params) {
  const t = await templateStore(env).getTemplate(params.id);
  if (!t) return err('Template not found', 404);
  let snapshot;
  try {
    snapshot = JSON.parse(t.snapshot || '{}');
  } catch (e) {
    return err('Template data is corrupted', 500);
  }
  const quiz = await ctx.store.createQuiz({
    title: `${t.title} (from template)`.slice(0, 200),
    description: t.description, subject: t.subject,
    level: t.level, topic: t.topic,
    settings: withDefaults((snapshot.quiz && snapshot.quiz.settings) || {}),
  });
  for (const q of snapshot.questions || []) {
    await ctx.store.createQuestion(quiz.id, {
      type: q.type, text: q.text, explanation: q.explanation || '',
      marks: q.marks ?? 1, case_sensitive: !!q.case_sensitive,
      options: (q.options || []).map(o => ({ text: o.text, is_correct: !!o.is_correct })),
      accepted: (q.accepted || []).map(a => ({ text: a.text })),
      pairs: (q.pairs || []).map(p => ({ left: p.left, right: p.right })),
    });
  }
  await templateStore(env).incrementUseCount(params.id);
  return jsonResponse({ quiz: { ...quiz, settings: JSON.parse(quiz.settings) } }, 201);
}

async function handleCreateBankItem(req, env, ctx) {
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  let data;
  try { data = sanitizeQuestionInput(body); } catch (e) { return err(e.message, 400); }
  const item = await ctx.store.createBankItem({
    type: data.type, text: data.text, explanation: data.explanation, marks: data.marks,
    difficulty: data.difficulty, subject: (body.subject || '').slice(0, 100), topic: (body.topic || '').slice(0, 200),
    curriculum: (body.curriculum || '').slice(0, 100), level: (body.level || '').slice(0, 100),
    payload: { options: data.options, pairs: data.pairs, accepted: data.accepted, case_sensitive: data.case_sensitive },
  });
  return jsonResponse({ item }, 201);
}

async function handleUpdateBankItem(req, env, ctx, params) {
  const existing = await ctx.store.getBankItem(params.id);
  if (!existing) return err('Bank item not found', 404);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const patch = {};
  for (const k of ['text', 'explanation', 'difficulty', 'subject', 'topic', 'curriculum', 'level']) {
    if (body[k] !== undefined) patch[k] = String(body[k]).slice(0, 2000);
  }
  if (body.marks !== undefined) patch.marks = Math.min(Math.max(Number(body.marks) || 1, 0.5), 100);
  if (body.type !== undefined || body.options !== undefined || body.pairs !== undefined || body.accepted !== undefined) {
    let data;
    try {
      data = sanitizeQuestionInput({
        type: body.type || existing.type,
        text: body.text !== undefined ? body.text : existing.text,
        explanation: body.explanation !== undefined ? body.explanation : existing.explanation,
        marks: body.marks !== undefined ? body.marks : existing.marks,
        difficulty: body.difficulty || existing.difficulty,
        options: body.options !== undefined ? body.options : existing.payload.options,
        pairs: body.pairs !== undefined ? body.pairs : existing.payload.pairs,
        accepted: body.accepted !== undefined ? body.accepted : existing.payload.accepted,
        case_sensitive: body.case_sensitive !== undefined ? body.case_sensitive : existing.payload.case_sensitive,
      });
    } catch (e) { return err(e.message, 400); }
    patch.type = data.type; patch.text = data.text; patch.explanation = data.explanation;
    patch.marks = data.marks; patch.difficulty = data.difficulty;
    patch.payload = { options: data.options, pairs: data.pairs, accepted: data.accepted, case_sensitive: data.case_sensitive };
  }
  const item = await ctx.store.updateBankItem(params.id, patch);
  return jsonResponse({ item });
}

async function handleDeleteBankItem(req, env, ctx, params) {
  await ctx.store.deleteBankItem(params.id);
  return jsonResponse({ ok: true });
}

async function handleBankAddToQuiz(req, env, ctx, params) {
  const item = await ctx.store.getBankItem(params.id);
  if (!item) return err('Bank item not found', 404);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const quiz = await ctx.store.getQuiz(body.quiz_id);
  if (!quiz) return err('Quiz not found', 404);
  if (quiz.status === 'published') return err('Unpublish the quiz before editing it.', 409);
  const p = item.payload || {};
  // Copy — editing the quiz question never touches the bank original.
  // Strip child ids so fresh ones are minted (the payload keeps the source
  // question's ids, which would collide with its options/pairs rows).
  const fresh = a => (a || []).map(x => ({ ...x, id: undefined }));
  const q = await ctx.store.createQuestion(quiz.id, {
    type: item.type, text: item.text, explanation: item.explanation, marks: item.marks,
    difficulty: item.difficulty, case_sensitive: !!p.case_sensitive, bank_item_id: item.id,
    options: fresh(p.options), pairs: fresh(p.pairs), accepted: p.accepted,
  });
  return jsonResponse({ question: q }, 201);
}

/* ================= teacher: AI generation ================= */

async function handleAIGenerate(req, env, ctx) {
  if (!(await rateLimit(env, `ai:${ctx.user.id}`, 20, 3600))) return err('AI generation limit reached. Try again later.', 429);
  let body;
  try { body = await readJson(req, 1024 * 1024); } catch (e) { return err(e.message, 400); }
  const prompt = String(body.prompt || '').slice(0, 2000);
  if (!prompt && !body.topic) return err('Describe the quiz you want, or pick a topic.');
  const spec = {
    prompt, topic: String(body.topic || '').slice(0, 200),
    subject: String(body.subject || '').slice(0, 100),
    curriculum: String(body.curriculum || '').slice(0, 100),
    level: String(body.level || '').slice(0, 100),
    count: Math.min(Math.max(parseInt(body.count, 10) || 10, 1), 40),
    difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium',
    types: (body.types || []).filter(t => QUESTION_TYPES.includes(t)),
  };
  const result = await generateQuizQuestions(env, spec);
  if (!result.ok) return err(result.reason, 502);
  // Always a draft. The teacher reviews before anything goes live.
  const quiz = await ctx.store.createQuiz({
    title: (spec.topic ? `${spec.topic}` : prompt.slice(0, 60) || 'AI quiz').slice(0, 200),
    description: '', subject: spec.subject, curriculum: spec.curriculum, level: spec.level,
    topic: spec.topic, settings: withDefaults({}),
  });
  for (const q of result.questions) {
    await ctx.store.createQuestion(quiz.id, {
      type: q.type, text: q.text, explanation: q.explanation, marks: q.marks,
      difficulty: q.difficulty || spec.difficulty,
      options: q.options, accepted: q.accepted, pairs: q.pairs,
      case_sensitive: false,
    });
  }
  const full = await ctx.store.getQuiz(quiz.id);
  const questions = await ctx.store.listQuestions(quiz.id);
  return jsonResponse({ quiz: { ...full, settings: JSON.parse(full.settings) }, questions }, 201);
}

async function handleAIGenerateUpload(req, env, ctx) {
  if (!(await rateLimit(env, `ai:${ctx.user.id}`, 20, 3600))) return err('AI generation limit reached. Try again later.', 429);
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return err('No file uploaded.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extracted = extractMaterialText(file.name, bytes);
  if (!extracted.ok) return err(extracted.error, 422);
  const spec = {
    prompt: String(form.get('prompt') || '').slice(0, 2000),
    topic: String(form.get('topic') || file.name.replace(/\.[^.]+$/, '')).slice(0, 200),
    subject: String(form.get('subject') || '').slice(0, 100),
    curriculum: String(form.get('curriculum') || '').slice(0, 100),
    level: String(form.get('level') || '').slice(0, 100),
    count: Math.min(Math.max(parseInt(form.get('count'), 10) || 10, 1), 40),
    difficulty: ['easy', 'medium', 'hard'].includes(form.get('difficulty')) ? form.get('difficulty') : 'medium',
    types: String(form.get('types') || '').split(',').map(s => s.trim()).filter(t => QUESTION_TYPES.includes(t)),
    material: extracted.text,
  };
  const result = await generateQuizQuestions(env, spec);
  if (!result.ok) return err(result.reason, 502);
  const quiz = await ctx.store.createQuiz({
    title: spec.topic.slice(0, 200) || 'AI quiz',
    description: `Generated from uploaded material: ${file.name}`.slice(0, 500),
    subject: spec.subject, curriculum: spec.curriculum, level: spec.level,
    topic: spec.topic, settings: withDefaults({}),
  });
  for (const q of result.questions) {
    await ctx.store.createQuestion(quiz.id, {
      type: q.type, text: q.text, explanation: q.explanation, marks: q.marks,
      difficulty: q.difficulty || spec.difficulty,
      options: q.options, accepted: q.accepted, pairs: q.pairs, case_sensitive: false,
    });
  }
  const full = await ctx.store.getQuiz(quiz.id);
  const questions = await ctx.store.listQuestions(quiz.id);
  return jsonResponse({
    quiz: { ...full, settings: JSON.parse(full.settings) }, questions,
    material: { filename: file.name, chars: extracted.text.length, truncated: extracted.text.length >= 15000 },
  }, 201);
}

/* ================= teacher: results ================= */

async function handleResultsSummary(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  const summary = await ctx.store.resultsSummary(params.id);
  const questions = (await ctx.store.listQuestions(params.id)).map(q => ({ id: q.id, text: q.text, type: q.type }));
  const perQuestion = summary.per_question.map(p => ({
    ...p, text: (questions.find(q => q.id === p.question_id) || {}).text || '(removed question)',
  }));
  return jsonResponse({ quiz: { id: quiz.id, title: quiz.title }, summary: { ...summary, per_question: perQuestion } });
}

async function handleListSubmissions(req, env, ctx, params) {
  const quiz = await ctx.store.getQuiz(params.id);
  if (!quiz) return err('Quiz not found', 404);
  return jsonResponse({ submissions: await ctx.store.listSubmissions(params.id) });
}

async function handleGetSubmission(req, env, ctx, params) {
  const s = await ctx.store.getSubmission(params.sid);
  if (!s) return err('Submission not found', 404);
  const quiz = await ctx.store.getQuiz(s.quiz_id);
  if (!quiz) return err('Quiz not found', 404);
  return jsonResponse({ submission: s, quiz: { id: quiz.id, title: quiz.title } });
}

async function handleDashboardStats(req, env, ctx) {
  const stats = await ctx.store.dashboardStats();
  const recent = (await ctx.store.listQuizzes({})).slice(0, 5).map(qu => ({
    ...qu, settings: JSON.parse(qu.settings || '{}'),
  }));
  return jsonResponse({ stats, recent });
}

/* ================= public: student flow ================= */

async function teacherIdForCode(env, code) {
  return env.QWIZO_KV.get(`code:${code.toUpperCase()}`);
}

async function loadPublishedQuiz(env, code) {
  const teacherId = await teacherIdForCode(env, code);
  if (!teacherId) return null;
  const store = teacherStore(env, teacherId);
  const quiz = await store.getQuizByCode(code.toUpperCase());
  if (!quiz) return null;
  return { store, quiz, teacherId };
}

async function handlePublicQuiz(req, env, _ctx, params) {
  const found = await loadPublishedQuiz(env, params.code);
  if (!found) return err('Quiz not found. Check the code and try again.', 404);
  const questions = await found.store.listQuestions(found.quiz.id);
  const settings = withDefaults(JSON.parse(found.quiz.settings || '{}'));
  return jsonResponse({ quiz: publicQuizPayload(found.quiz, questions, settings) });
}

async function handlePublicStart(req, env, _ctx, params) {
  const ip = clientIp(req);
  if (!(await rateLimit(env, `pub:${ip}`, 30, 60))) return err('Too many requests. Slow down and try again.', 429);
  const found = await loadPublishedQuiz(env, params.code);
  if (!found) return err('Quiz not found.', 404);
  let body;
  try { body = await readJson(req); } catch (e) { return err(e.message, 400); }
  const settings = withDefaults(JSON.parse(found.quiz.settings || '{}'));
  const studentName = String(body.student_name || '').trim().slice(0, 80);
  if (settings.require_student_name && !studentName) return err('Please enter your name to start.');
  if (!settings.allow_multiple_attempts && studentName && await found.store.hasSubmitted(found.quiz.id, studentName)) {
    return err('You have already submitted this quiz.', 409);
  }
  const attempt = await found.store.createAttempt(found.quiz.id, studentName, found.quiz.time_limit_sec);
  return jsonResponse({
    attempt_id: attempt.id, started_at: attempt.started_at, expires_at: attempt.expires_at,
    time_limit_sec: found.quiz.time_limit_sec,
  }, 201);
}

function filterStudentResult(submission, snapshot, settings) {
  const out = {
    id: submission.id, student_name: submission.student_name,
    submitted_at: submission.submitted_at, duration_sec: submission.duration_sec, late: submission.late,
  };
  if (settings.show_score) {
    out.score = submission.score; out.max_score = submission.max_score;
    out.percentage = submission.percentage;
    out.correct_count = submission.correct_count; out.incorrect_count = submission.incorrect_count;
  }
  if (settings.show_results_immediately) {
    out.questions = (snapshot.questions || []).map(q => {
      const sa = (submission.answers || []).find(a => a.question_id === q.id) || {};
      const item = { question_id: q.id, text: q.text, marks: q.marks, marks_awarded: sa.marks_awarded ?? 0 };
      if (settings.show_correct_answers) {
        item.is_correct = !!sa.is_correct;
        item.correct = correctAnswerSummary(q);
        if (settings.show_explanations && q.explanation) item.explanation = q.explanation;
      }
      return item;
    });
  }
  return out;
}

function correctAnswerSummary(q) {
  if (q.type === 'mcq' || q.type === 'tf') {
    const c = (q.options || []).find(o => o.is_correct);
    return c ? c.text : null;
  }
  if (q.type === 'short' || q.type === 'fill') return (q.accepted || []).map(a => a.text);
  if (q.type === 'matching') return (q.pairs || []).map(p => ({ left: p.left_text || p.left, right: p.right_text || p.right }));
  return null;
}

async function handlePublicSubmit(req, env, _ctx, params) {
  const ip = clientIp(req);
  if (!(await rateLimit(env, `pub:${ip}`, 30, 60))) return err('Too many requests. Slow down and try again.', 429);
  const found = await loadPublishedQuiz(env, params.code);
  if (!found) return err('Quiz not found.', 404);
  let body;
  try { body = await readJson(req, 1024 * 1024); } catch (e) { return err(e.message, 400); }
  const attempt = await found.store.getAttempt(body.attempt_id);
  if (!attempt || attempt.quiz_id !== found.quiz.id) return err('Invalid attempt. Restart the quiz.', 400);
  if (attempt.used) return err('This attempt was already submitted.', 409);

  const settings = withDefaults(JSON.parse(found.quiz.settings || '{}'));
  const now = Date.now();
  let late = false;
  if (attempt.expires_at) {
    if (now > attempt.expires_at + 2 * 60 * 1000) return err('Time expired. Your attempt is no longer valid.', 410);
    if (now > attempt.expires_at) late = true;
  }

  const snapshot = JSON.parse(found.quiz.published_snapshot || '{}');
  if (!snapshot.questions || !snapshot.questions.length) return err('This quiz is no longer available.', 410);

  // Server-side grading — the browser never decides the score.
  const answers = (body.answers && typeof body.answers === 'object') ? body.answers : {};
  const result = gradeSubmission(snapshot, answers);
  await found.store.markAttemptUsed(attempt.id);
  const submission = await found.store.createSubmission({
    quiz_id: found.quiz.id, attempt_id: attempt.id,
    student_name: attempt.student_name || 'Anonymous',
    score: result.score, max_score: result.max_score, percentage: result.percentage,
    correct_count: result.correct_count, incorrect_count: result.incorrect_count,
    duration_sec: Math.round((now - attempt.started_at) / 1000),
    snapshot, started_at: attempt.started_at, late,
    answers: result.graded,
  });
  const full = await found.store.getSubmission(submission.id);
  const resultToken = await signResultToken(env, found.teacherId, submission.id);
  return jsonResponse({ result: filterStudentResult(full, snapshot, settings), result_token: resultToken }, 201);
}

// Result lookup uses a signed, unguessable token (see handlePublicResultToken).
// The submit response includes one so the student can revisit their result page.
async function handlePublicResultToken(req, env, _ctx, params) {
  try {
    const payload = await verifyToken(env.JWT_SECRET, params.token);
    if (!payload || payload.typ !== 'result') return err('Result link is invalid or expired.', 404);
    const store = teacherStore(env, payload.tid);
      const submission = await store.getSubmission(payload.sid);
    if (!submission) return err('Result not found.', 404);
    const quiz = await store.getQuiz(submission.quiz_id);
    const settings = withDefaults(JSON.parse((quiz && quiz.settings) || '{}'));
    const snapshot = submission.snapshot || {};
    return jsonResponse({ result: filterStudentResult(submission, snapshot, settings), quiz_title: quiz ? quiz.title : '' });
  } catch {
    return err('Result link is invalid or expired.', 404);
  }
}

async function signResultToken(env, teacherId, submissionId) {
  const now = Math.floor(Date.now() / 1000);
  return signToken(env.JWT_SECRET, { typ: 'result', tid: teacherId, sid: submissionId, iat: now, exp: now + 90 * 86400 });
}

/* ================= router ================= */

const ROUTES = [
  // auth
  ['POST', /^\/api\/auth\/signup$/, handleSignup, false],
  ['POST', /^\/api\/auth\/login$/, handleLogin, false],
  ['POST', /^\/api\/auth\/logout$/, handleLogout, false],
  ['GET', /^\/api\/auth\/me$/, async (req, env, ctx) => jsonResponse({ user: publicTeacher(ctx.user) }), true],
  ['PUT', /^\/api\/auth\/me$/, handleUpdateMe, true],
  ['POST', /^\/api\/auth\/onboarding$/, handleOnboarding, true],
  ['GET', /^\/api\/stats$/, handleDashboardStats, true],
  // quizzes
  ['GET', /^\/api\/quizzes$/, handleListQuizzes, true],
  ['POST', /^\/api\/quizzes$/, handleCreateQuiz, true],
  ['GET', /^\/api\/quizzes\/([^/]+)$/, handleGetQuiz, true, 'id'],
  ['PUT', /^\/api\/quizzes\/([^/]+)$/, handleUpdateQuiz, true, 'id'],
  ['DELETE', /^\/api\/quizzes\/([^/]+)$/, handleDeleteQuiz, true, 'id'],
  ['POST', /^\/api\/quizzes\/([^/]+)\/duplicate$/, handleDuplicateQuiz, true, 'id'],
  ['POST', /^\/api\/quizzes\/([^/]+)\/publish$/, handlePublishQuiz, true, 'id'],
  ['POST', /^\/api\/quizzes\/([^/]+)\/unpublish$/, handleUnpublishQuiz, true, 'id'],
  ['POST', /^\/api\/quizzes\/([^/]+)\/archive$/, handleArchiveQuiz, true, 'id'],
  ['POST', /^\/api\/quizzes\/([^/]+)\/questions$/, handleCreateQuestion, true, 'id'],
  ['PUT', /^\/api\/quizzes\/([^/]+)\/reorder$/, handleReorderQuestions, true, 'id'],
  // questions
  ['PUT', /^\/api\/questions\/([^/]+)$/, handleUpdateQuestion, true, 'qid'],
  ['DELETE', /^\/api\/questions\/([^/]+)$/, handleDeleteQuestion, true, 'qid'],
  ['POST', /^\/api\/questions\/([^/]+)\/duplicate$/, handleDuplicateQuestion, true, 'qid'],
  ['POST', /^\/api\/questions\/([^/]+)\/to-bank$/, handleQuestionToBank, true, 'qid'],
  ['POST', /^\/api\/questions\/([^/]+)\/ai-action$/, handleQuestionAIAction, true, 'qid'],
  // bank
  ['GET', /^\/api\/bank$/, handleListBank, true],
  ['POST', /^\/api\/bank$/, handleCreateBankItem, true],
  ['PUT', /^\/api\/bank\/([^/]+)$/, handleUpdateBankItem, true, 'id'],
  ['DELETE', /^\/api\/bank\/([^/]+)$/, handleDeleteBankItem, true, 'id'],
  ['POST', /^\/api\/bank\/([^/]+)\/add-to-quiz$/, handleBankAddToQuiz, true, 'id'],
  // templates (shared gallery)
  ['GET', /^\/api\/templates$/, handleListTemplates, true],
  ['GET', /^\/api\/templates\/subjects$/, handleListTemplateSubjects, true],
  ['GET', /^\/api\/templates\/([^/]+)$/, handleGetTemplate, true, 'id'],
  ['POST', /^\/api\/templates\/([^/]+)\/use$/, handleUseTemplate, true, 'id'],
  ['DELETE', /^\/api\/templates\/([^/]+)$/, handleDeleteTemplate, true, 'id'],
  // AI
  ['POST', /^\/api\/ai\/generate$/, handleAIGenerate, true],
  ['POST', /^\/api\/ai\/generate-upload$/, handleAIGenerateUpload, true],
  // results
  ['GET', /^\/api\/quizzes\/([^/]+)\/results\/summary$/, handleResultsSummary, true, 'id'],
  ['GET', /^\/api\/quizzes\/([^/]+)\/submissions$/, handleListSubmissions, true, 'id'],
  ['GET', /^\/api\/submissions\/([^/]+)$/, handleGetSubmission, true, 'sid'],
  // public student
  ['GET', /^\/api\/public\/quiz\/([^/]+)$/, handlePublicQuiz, false, 'code'],
  ['POST', /^\/api\/public\/quiz\/([^/]+)\/start$/, handlePublicStart, false, 'code'],
  ['POST', /^\/api\/public\/quiz\/([^/]+)\/submit$/, handlePublicSubmit, false, 'code'],
  ['GET', /^\/api\/public\/result\/([^/]+)$/, handlePublicResultToken, false, 'token'],
];

async function handleApi(req, env, url) {
  for (const [method, pattern, handler, needsAuth, paramName] of ROUTES) {
    if (req.method !== method) continue;
    const m = url.pathname.match(pattern);
    if (!m) continue;
    const params = paramName ? { [paramName]: decodeURIComponent(m[1]) } : {};
    if (needsAuth) {
      const ctx = await teacherCtx(req, env);
      if (ctx.response) return ctx.response;
      try {
        return await handler(req, env, ctx, params, url);
      } catch (e) {
        console.error('API error', e);
        return err('Something went wrong. Try again.', 500);
      }
    }
    try {
      return await handler(req, env, null, params, url);
    } catch (e) {
      console.error('API error', e);
      return err('Something went wrong. Try again.', 500);
    }
  }
  return err('Not found', 404);
}

/* ================= static pages ================= */

async function serveAsset(env, path) {
  // Preview deployment: serve static files from KV (asset: prefix).
  // Production wrangler deploy uses the ASSETS binding instead.
  const ctype = path.endsWith('.html') ? 'text/html; charset=utf-8'
    : path.endsWith('.js') ? 'application/javascript; charset=utf-8'
    : path.endsWith('.css') ? 'text/css; charset=utf-8'
    : path.endsWith('.svg') ? 'image/svg+xml'
    : path.endsWith('.png') ? 'image/png'
    : path.endsWith('.woff2') ? 'font/woff2'
    : 'application/octet-stream';
  if (env.ASSETS) {
    const res = await env.ASSETS.fetch(new Request(`https://qwizo.internal${path}`));
    if (res.status === 404) return new Response('Not found', { status: 404 });
    return res;
  }
  const data = await env.QWIZO_KV.get(`asset:${path}`, 'arrayBuffer');
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(data, { headers: { 'Content-Type': ctype, 'Cache-Control': 'public, max-age=3600' } });
}

export default {
  async fetch(req, env) {
    if (!env.JWT_SECRET) {
      return new Response('Server misconfigured: JWT_SECRET is not set.', { status: 500 });
    }
    const url = new URL(req.url);

    let res;
    if (url.pathname === '/api/health') {
      res = jsonResponse({ ok: true, app: 'qwizo', time: Date.now() });
    } else if (url.pathname.startsWith('/api/')) {
      res = await handleApi(req, env, url);
    } else if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
      res = await serveAsset(env, '/app.html');
    } else if (url.pathname.startsWith('/q/')) {
      res = await serveAsset(env, '/take.html');
    } else if (url.pathname === '/') {
      res = await serveAsset(env, '/index.html');
    } else {
      res = await serveAsset(env, url.pathname);
    }
    return withSecurityHeaders(res, url);
  },
};

function withSecurityHeaders(res, url) {
  const h = new Headers(res.headers);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const ctype = h.get('Content-Type') || '';
  if (ctype.includes('text/html')) {
    const isMarketing = url.pathname === '/';
    // App shells (/app, /q) load JS from external files: no inline scripts.
    // Marketing page keeps a tiny inline UI script.
    const scriptSrc = isMarketing ? "'self' 'unsafe-inline'" : "'self'";
    h.set('Content-Security-Policy',
      `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; ` +
      "img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
