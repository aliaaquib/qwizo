/**
 * TeacherStore — Durable Object with SQLite storage.
 * One isolated relational database per teacher. Every method below
 * enforces ownership structurally: there is no cross-teacher query path.
 * The worker talks to it via fetch (RPC-over-HTTP).
 *
 * Tables: user, quizzes, questions, options, matching_pairs,
 *         accepted_answers, bank_items, attempts, submissions, submission_answers
 *
 * NOTE: the workers SQLite `.one()` throws on empty results, so all
 * single-row reads go through `_one()`, which returns null instead.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  onboarding_done INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  curriculum TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  time_limit_sec INTEGER,
  settings TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  share_code TEXT,
  published_snapshot TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_code ON quizzes(share_code);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT,
  bank_item_id TEXT,
  type TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  marks REAL NOT NULL DEFAULT 1,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  position INTEGER NOT NULL DEFAULT 0,
  case_sensitive INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id, position);
CREATE TABLE IF NOT EXISTS options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  is_correct INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_options_q ON options(question_id, position);
CREATE TABLE IF NOT EXISTS matching_pairs (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  left_text TEXT NOT NULL DEFAULT '',
  right_text TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pairs_q ON matching_pairs(question_id, position);
CREATE TABLE IF NOT EXISTS accepted_answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_answers_q ON accepted_answers(question_id);
CREATE TABLE IF NOT EXISTS bank_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  marks REAL NOT NULL DEFAULT 1,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  subject TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  curriculum TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_search ON bank_items(subject, topic, type, difficulty);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  started_at INTEGER NOT NULL,
  expires_at INTEGER,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON attempts(quiz_id);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  attempt_id TEXT,
  student_name TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL DEFAULT 0,
  max_score REAL NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER,
  snapshot TEXT NOT NULL DEFAULT '{}',
  started_at INTEGER NOT NULL,
  submitted_at INTEGER NOT NULL,
  late INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sub_quiz ON submissions(quiz_id, submitted_at);
CREATE TABLE IF NOT EXISTS submission_answers (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '{}',
  is_correct INTEGER NOT NULL DEFAULT 0,
  marks_awarded REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sans_sub ON submission_answers(submission_id);
`;

export class TeacherStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(SCHEMA);
    // Column migrations for existing databases (additive only, idempotent).
    for (const [table, col, def] of [
      ['user', 'role', `TEXT NOT NULL DEFAULT ''`],
      ['user', 'onboarding_done', 'INTEGER NOT NULL DEFAULT 0'],
      ['user', 'job_title', `TEXT NOT NULL DEFAULT ''`],
      ['user', 'specialization', `TEXT NOT NULL DEFAULT ''`],
      ['user', 'subjects', `TEXT NOT NULL DEFAULT '[]'`],
      ['user', 'grades', `TEXT NOT NULL DEFAULT '[]'`],
      ['quizzes', 'grade', `TEXT NOT NULL DEFAULT ''`],
    ]) {
      try {
        this.sql.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      } catch (e) {
        if (!/duplicate column/i.test(e.message || '')) throw e;
      }
    }
  }

  /** RPC entrypoint: POST {method, args}. Private helpers are unreachable. */
  async fetch(req) {
    try {
      const { method, args } = await req.json();
      if (typeof method !== 'string' || method.startsWith('_') ||
          typeof this[method] !== 'function' || method === 'fetch') {
        return Response.json({ error: 'unknown method' }, { status: 400 });
      }
      const result = await this[method](...(args || []));
      return Response.json({ result: result === undefined ? null : result });
    } catch (e) {
      return Response.json({ error: e.message || 'store error' }, { status: 500 });
    }
  }

  /** Single-row read that returns null (not a throw) when empty. */
  _one(query, ...args) {
    const rows = this.sql.exec(query, ...args).toArray();
    return rows.length ? rows[0] : null;
  }

  /* ---------------- user ---------------- */

  async createUser({ id, name, email, password_hash }) {
    const now = Date.now();
    this.sql.exec(
      'INSERT INTO user (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      id, name, email, password_hash, now
    );
    return this.getUser(id);
  }

  getUser(id) {
    return this._one('SELECT id, name, email, password_hash, role, job_title, specialization, subjects, grades, onboarding_done, created_at FROM user WHERE id = ?', id);
  }

  updateUser(id, { name, role, job_title, specialization, subjects, grades, onboarding_done }) {
    const sets = [];
    const args = [];
    if (name !== undefined) { sets.push('name = ?'); args.push(name); }
    if (role !== undefined) { sets.push('role = ?'); args.push(String(role).slice(0, 50)); }
    if (job_title !== undefined) { sets.push('job_title = ?'); args.push(String(job_title).slice(0, 80)); }
    if (specialization !== undefined) { sets.push('specialization = ?'); args.push(String(specialization).slice(0, 80)); }
    if (subjects !== undefined) { sets.push('subjects = ?'); args.push(JSON.stringify(subjects).slice(0, 2000)); }
    if (grades !== undefined) { sets.push('grades = ?'); args.push(JSON.stringify(grades).slice(0, 1000)); }
    if (onboarding_done !== undefined) { sets.push('onboarding_done = ?'); args.push(onboarding_done ? 1 : 0); }
    if (sets.length) this.sql.exec(`UPDATE user SET ${sets.join(', ')} WHERE id = ?`, ...args, id);
    return this.getUser(id);
  }

  /* ---------------- quizzes ---------------- */

  listQuizzes({ status = null, q = '' } = {}) {
    let where = '1=1';
    const args = [];
    if (status) { where += ' AND status = ?'; args.push(status); }
    if (q) { where += ' AND (title LIKE ? OR subject LIKE ? OR topic LIKE ?)'; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    return this.sql.exec(
      `SELECT q.*,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) AS question_count,
        (SELECT COUNT(*) FROM submissions WHERE quiz_id = q.id) AS submission_count
       FROM quizzes q WHERE ${where} ORDER BY q.updated_at DESC`,
      ...args
    ).toArray();
  }

  getQuiz(id) {
    return this._one('SELECT * FROM quizzes WHERE id = ?', id);
  }

  getQuizByCode(code) {
    return this._one("SELECT * FROM quizzes WHERE share_code = ? AND status = 'published'", code);
  }

  createQuiz(data) {
    const now = Date.now();
    const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO quizzes (id, title, description, subject, curriculum, level, grade, topic, time_limit_sec, settings, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      id, data.title || 'Untitled quiz', data.description || '', data.subject || '',
      data.curriculum || '', data.level || '', data.grade || '', data.topic || '',
      data.time_limit_sec ?? null, JSON.stringify(data.settings || {}), now, now
    );
    return this.getQuiz(id);
  }

  updateQuiz(id, patch) {
    const allowed = ['title', 'description', 'subject', 'curriculum', 'level', 'grade', 'topic', 'time_limit_sec', 'settings', 'status', 'share_code', 'published_snapshot', 'published_at'];
    const sets = [], args = [];
    for (const k of allowed) {
      if (patch[k] !== undefined) {
        sets.push(`${k} = ?`);
        args.push(k === 'settings' ? JSON.stringify(patch[k]) : patch[k]);
      }
    }
    if (!sets.length) return this.getQuiz(id);
    sets.push('updated_at = ?'); args.push(Date.now(), id);
    this.sql.exec(`UPDATE quizzes SET ${sets.join(', ')} WHERE id = ?`, ...args);
    return this.getQuiz(id);
  }

  deleteQuiz(id) {
    const qids = this.sql.exec('SELECT id FROM questions WHERE quiz_id = ?', id).toArray().map(r => r.id);
    for (const qid of qids) this._deleteQuestionRows(qid);
    this.sql.exec('DELETE FROM submission_answers WHERE submission_id IN (SELECT id FROM submissions WHERE quiz_id = ?)', id);
    this.sql.exec('DELETE FROM submissions WHERE quiz_id = ?', id);
    this.sql.exec('DELETE FROM attempts WHERE quiz_id = ?', id);
    this.sql.exec('DELETE FROM quizzes WHERE id = ?', id);
  }

  /* ---------------- questions ---------------- */

  getQuestion(id) {
    const q = this._one('SELECT * FROM questions WHERE id = ?', id);
    if (!q) return null;
    return this._hydrateQuestion(q);
  }

  listQuestions(quizId) {
    const rows = this.sql.exec('SELECT * FROM questions WHERE quiz_id = ? ORDER BY position ASC', quizId).toArray();
    return rows.map(r => this._hydrateQuestion(r));
  }

  _hydrateQuestion(q) {
    const out = { ...q, case_sensitive: !!q.case_sensitive };
    out.options = this.sql.exec('SELECT id, text, is_correct, position FROM options WHERE question_id = ? ORDER BY position ASC', q.id)
      .toArray().map(o => ({ ...o, is_correct: !!o.is_correct }));
    out.pairs = this.sql.exec('SELECT id, left_text, right_text, position FROM matching_pairs WHERE question_id = ? ORDER BY position ASC', q.id).toArray();
    out.accepted = this.sql.exec('SELECT id, text FROM accepted_answers WHERE question_id = ?', q.id).toArray();
    return out;
  }

  _deleteQuestionRows(qid) {
    this.sql.exec('DELETE FROM options WHERE question_id = ?', qid);
    this.sql.exec('DELETE FROM matching_pairs WHERE question_id = ?', qid);
    this.sql.exec('DELETE FROM accepted_answers WHERE question_id = ?', qid);
    this.sql.exec('DELETE FROM questions WHERE id = ?', qid);
  }

  deleteQuestion(qid) { this._deleteQuestionRows(qid); }

  _nextPosition(quizId) {
    const r = this._one('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM questions WHERE quiz_id = ?', quizId);
    return r ? r.p : 0;
  }

  createQuestion(quizId, data) {
    const now = Date.now();
    const id = crypto.randomUUID();
    const position = data.position ?? this._nextPosition(quizId);
    this.sql.exec(
      `INSERT INTO questions (id, quiz_id, bank_item_id, type, text, explanation, marks, difficulty, position, case_sensitive, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, quizId, data.bank_item_id || null, data.type, data.text || '', data.explanation || '',
      data.marks ?? 1, data.difficulty || 'medium', position, data.case_sensitive ? 1 : 0, now, now
    );
    this._writeChildren(id, data);
    return this.getQuestion(id);
  }

  _childId(provided) {
    // Reuse client-provided ids so the editor's DOM references stay valid
    // across autosaves; otherwise mint a fresh UUID.
    const s = String(provided || '').slice(0, 40);
    return s || crypto.randomUUID();
  }

  _writeChildren(qid, data) {
    this.sql.exec('DELETE FROM options WHERE question_id = ?', qid);
    this.sql.exec('DELETE FROM matching_pairs WHERE question_id = ?', qid);
    this.sql.exec('DELETE FROM accepted_answers WHERE question_id = ?', qid);
    (data.options || []).forEach((o, i) => {
      this.sql.exec('INSERT INTO options (id, question_id, text, is_correct, position) VALUES (?, ?, ?, ?, ?)',
        this._childId(o.id), qid, o.text || '', o.is_correct ? 1 : 0, o.position ?? i);
    });
    (data.pairs || []).forEach((p, i) => {
      this.sql.exec('INSERT INTO matching_pairs (id, question_id, left_text, right_text, position) VALUES (?, ?, ?, ?, ?)',
        this._childId(p.id), qid, p.left_text || p.left || '', p.right_text || p.right || '', p.position ?? i);
    });
    (data.accepted || []).forEach(a => {
      const text = typeof a === 'string' ? a : (a.text || '');
      const aid = typeof a === 'object' && a ? a.id : undefined;
      if (text.trim()) this.sql.exec('INSERT INTO accepted_answers (id, question_id, text) VALUES (?, ?, ?)', this._childId(aid), qid, text);
    });
  }

  updateQuestion(qid, data) {
    const q = this._one('SELECT * FROM questions WHERE id = ?', qid);
    if (!q) return null;
    const sets = [], args = [];
    for (const k of ['type', 'text', 'explanation', 'marks', 'difficulty', 'case_sensitive', 'position']) {
      if (data[k] !== undefined) { sets.push(`${k} = ?`); args.push(k === 'case_sensitive' ? (data[k] ? 1 : 0) : data[k]); }
    }
    sets.push('updated_at = ?'); args.push(Date.now(), qid);
    this.sql.exec(`UPDATE questions SET ${sets.join(', ')} WHERE id = ?`, ...args);
    if (data.options !== undefined || data.pairs !== undefined || data.accepted !== undefined) {
      const merged = { ...this.getQuestion(qid), ...data };
      this._writeChildren(qid, merged);
    }
    this.sql.exec('UPDATE quizzes SET updated_at = ? WHERE id = ?', Date.now(), q.quiz_id);
    return this.getQuestion(qid);
  }

  reorderQuestions(quizId, ids) {
    ids.forEach((qid, i) => {
      this.sql.exec('UPDATE questions SET position = ? WHERE id = ? AND quiz_id = ?', i, qid, quizId);
    });
    this.sql.exec('UPDATE quizzes SET updated_at = ? WHERE id = ?', Date.now(), quizId);
  }

  moveQuestionToQuiz(qid, quizId) {
    const pos = this._nextPosition(quizId);
    this.sql.exec('UPDATE questions SET quiz_id = ?, position = ? WHERE id = ?', quizId, pos, qid);
    this.sql.exec('UPDATE quizzes SET updated_at = ? WHERE id = ?', Date.now(), quizId);
  }

  duplicateQuestion(qid) {
    const q = this.getQuestion(qid);
    if (!q) return null;
    // Strip child ids so _writeChildren mints fresh ones (reusing them
    // would collide with the source question's rows).
    const fresh = a => (a || []).map(x => ({ ...x, id: undefined }));
    return this.createQuestion(q.quiz_id, {
      type: q.type, text: q.text, explanation: q.explanation, marks: q.marks,
      difficulty: q.difficulty, case_sensitive: q.case_sensitive,
      options: fresh(q.options), pairs: fresh(q.pairs),
      accepted: (q.accepted || []).map(a => a.text),
    });
  }

  /* ---------------- question bank ---------------- */

  listBank({ q = '', subject = '', topic = '', type = '', difficulty = '' } = {}) {
    let where = '1=1'; const args = [];
    if (q) { where += ' AND (text LIKE ? OR topic LIKE ? OR subject LIKE ?)'; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (subject) { where += ' AND subject = ?'; args.push(subject); }
    if (topic) { where += ' AND topic = ?'; args.push(topic); }
    if (type) { where += ' AND type = ?'; args.push(type); }
    if (difficulty) { where += ' AND difficulty = ?'; args.push(difficulty); }
    return this.sql.exec(`SELECT * FROM bank_items WHERE ${where} ORDER BY updated_at DESC`, ...args).toArray()
      .map(r => ({ ...r, payload: JSON.parse(r.payload || '{}') }));
  }

  getBankItem(id) {
    const r = this._one('SELECT * FROM bank_items WHERE id = ?', id);
    return r ? { ...r, payload: JSON.parse(r.payload || '{}') } : null;
  }

  createBankItem(data) {
    const now = Date.now(); const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO bank_items (id, type, text, explanation, marks, difficulty, subject, topic, curriculum, level, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, data.type, data.text || '', data.explanation || '', data.marks ?? 1, data.difficulty || 'medium',
      data.subject || '', data.topic || '', data.curriculum || '', data.level || '',
      JSON.stringify(data.payload || {}), now, now
    );
    return this.getBankItem(id);
  }

  updateBankItem(id, data) {
    const sets = [], args = [];
    for (const k of ['type', 'text', 'explanation', 'marks', 'difficulty', 'subject', 'topic', 'curriculum', 'level']) {
      if (data[k] !== undefined) { sets.push(`${k} = ?`); args.push(data[k]); }
    }
    if (data.payload !== undefined) { sets.push('payload = ?'); args.push(JSON.stringify(data.payload)); }
    if (!sets.length) return this.getBankItem(id);
    sets.push('updated_at = ?'); args.push(Date.now(), id);
    this.sql.exec(`UPDATE bank_items SET ${sets.join(', ')} WHERE id = ?`, ...args);
    return this.getBankItem(id);
  }

  deleteBankItem(id) { this.sql.exec('DELETE FROM bank_items WHERE id = ?', id); }

  /* ---------------- attempts & submissions ---------------- */

  createAttempt(quizId, studentName, timeLimitSec) {
    const now = Date.now(); const id = crypto.randomUUID();
    this.sql.exec(
      'INSERT INTO attempts (id, quiz_id, student_name, started_at, expires_at, used) VALUES (?, ?, ?, ?, ?, 0)',
      id, quizId, studentName || '', now, timeLimitSec ? now + timeLimitSec * 1000 : null
    );
    return this._one('SELECT * FROM attempts WHERE id = ?', id);
  }

  getAttempt(id) { return this._one('SELECT * FROM attempts WHERE id = ?', id); }

  markAttemptUsed(id) { this.sql.exec('UPDATE attempts SET used = 1 WHERE id = ?', id); }

  hasSubmitted(quizId, studentName) {
    const rows = this.sql.exec(
      'SELECT id FROM submissions WHERE quiz_id = ? AND LOWER(TRIM(student_name)) = LOWER(TRIM(?)) LIMIT 1',
      quizId, studentName || ''
    ).toArray();
    return rows.length > 0;
  }

  createSubmission(data) {
    const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO submissions (id, quiz_id, attempt_id, student_name, score, max_score, percentage, correct_count, incorrect_count, duration_sec, snapshot, started_at, submitted_at, late)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, data.quiz_id, data.attempt_id || null, data.student_name, data.score, data.max_score,
      data.percentage, data.correct_count, data.incorrect_count, data.duration_sec ?? null,
      JSON.stringify(data.snapshot), data.started_at, Date.now(), data.late ? 1 : 0
    );
    for (const a of data.answers) {
      this.sql.exec(
        'INSERT INTO submission_answers (id, submission_id, question_id, answer, is_correct, marks_awarded) VALUES (?, ?, ?, ?, ?, ?)',
        crypto.randomUUID(), id, a.question_id, JSON.stringify(a.answer), a.is_correct ? 1 : 0, a.marks_awarded
      );
    }
    return this.getSubmission(id);
  }

  getSubmission(id) {
    const s = this._one('SELECT * FROM submissions WHERE id = ?', id);
    if (!s) return null;
    s.answers = this.sql.exec('SELECT question_id, answer, is_correct, marks_awarded FROM submission_answers WHERE submission_id = ?', id)
      .toArray().map(a => ({ ...a, is_correct: !!a.is_correct, answer: JSON.parse(a.answer || '{}') }));
    s.snapshot = JSON.parse(s.snapshot || '{}');
    s.late = !!s.late;
    return s;
  }

  listSubmissions(quizId) {
    return this.sql.exec(
      `SELECT id, student_name, score, max_score, percentage, correct_count, incorrect_count, duration_sec, submitted_at, late
       FROM submissions WHERE quiz_id = ? ORDER BY submitted_at DESC`, quizId
    ).toArray().map(s => ({ ...s, late: !!s.late }));
  }

  resultsSummary(quizId) {
    const subs = this.sql.exec('SELECT id, percentage FROM submissions WHERE quiz_id = ?', quizId).toArray();
    const avg = subs.length ? subs.reduce((a, s) => a + s.percentage, 0) / subs.length : 0;
    const perQ = this.sql.exec(
      `SELECT question_id, COUNT(*) AS attempts, SUM(is_correct) AS correct
       FROM submission_answers WHERE submission_id IN (SELECT id FROM submissions WHERE quiz_id = ?)
       GROUP BY question_id`, quizId
    ).toArray().map(r => ({
      question_id: r.question_id, attempts: r.attempts,
      correct_pct: r.attempts ? Math.round((r.correct / r.attempts) * 1000) / 10 : 0,
    }));
    return { total: subs.length, avg_percentage: Math.round(avg * 10) / 10, per_question: perQ };
  }

  dashboardStats() {
    const c = (q) => this.sql.exec(q).toArray()[0].c;
    return {
      quizzes: c('SELECT COUNT(*) c FROM quizzes'),
      published: c("SELECT COUNT(*) c FROM quizzes WHERE status='published'"),
      drafts: c("SELECT COUNT(*) c FROM quizzes WHERE status='draft'"),
      submissions: c('SELECT COUNT(*) c FROM submissions'),
      bank: c('SELECT COUNT(*) c FROM bank_items'),
    };
  }
}
