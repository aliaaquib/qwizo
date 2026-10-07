/**
 * TemplateStore — Durable Object with SQLite storage.
 * ONE global instance holding quiz templates shared across all teachers.
 * When a teacher publishes a quiz, a snapshot is saved here automatically;
 * other teachers can browse, preview, and clone templates into their own
 * quizzes. The worker talks to it via fetch (RPC-over-HTTP), same pattern
 * as TeacherStore.
 *
 * NOTE: the workers SQLite `.one()` throws on empty results, so all
 * single-row reads go through `_one()`, which returns null instead.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  source_quiz_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  question_count INTEGER NOT NULL DEFAULT 0,
  snapshot TEXT NOT NULL DEFAULT '{}',
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(source_quiz_id, teacher_id)
);
CREATE INDEX IF NOT EXISTS idx_templates_subject ON templates(subject);
CREATE INDEX IF NOT EXISTS idx_templates_updated ON templates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_teacher ON templates(teacher_id);
`;

export class TemplateStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(SCHEMA);
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

  _one(query, ...args) {
    const rows = this.sql.exec(query, ...args).toArray();
    return rows.length ? rows[0] : null;
  }

  _all(query, ...args) {
    return this.sql.exec(query, ...args).toArray();
  }

  /* ---------------- templates ---------------- */

  /**
   * Save or update a template. Keyed by (source_quiz_id, teacher_id) so
   * re-publishing the same quiz updates its template instead of duplicating.
   */
  upsertTemplate(data) {
    const now = Date.now();
    const id = data.id || crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO templates
         (id, source_quiz_id, teacher_id, teacher_name, title, description,
          subject, level, topic, question_count, snapshot, use_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(source_quiz_id, teacher_id) DO UPDATE SET
         teacher_name = excluded.teacher_name,
         title = excluded.title,
         description = excluded.description,
         subject = excluded.subject,
         level = excluded.level,
         topic = excluded.topic,
         question_count = excluded.question_count,
         snapshot = excluded.snapshot,
         updated_at = excluded.updated_at`,
      id, data.source_quiz_id, data.teacher_id, (data.teacher_name || '').slice(0, 80),
      (data.title || 'Untitled quiz').slice(0, 200), (data.description || '').slice(0, 2000),
      (data.subject || '').slice(0, 100), (data.level || '').slice(0, 100),
      (data.topic || '').slice(0, 200), data.question_count || 0,
      JSON.stringify(data.snapshot || {}), now, now
    );
    return this._one(
      'SELECT * FROM templates WHERE source_quiz_id = ? AND teacher_id = ?',
      data.source_quiz_id, data.teacher_id
    );
  }

  /** List templates for the gallery — without the heavy snapshot payload. */
  listTemplates({ search, subject, limit, offset } = {}) {
    const conds = [];
    const args = [];
    if (subject) {
      conds.push('subject = ?');
      args.push(subject);
    }
    if (search) {
      conds.push('(title LIKE ? OR description LIKE ? OR subject LIKE ? OR topic LIKE ?)');
      const like = `%${search}%`;
      args.push(like, like, like, like);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const lim = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    const rows = this._all(
      `SELECT id, source_quiz_id, teacher_id, teacher_name, title, description,
              subject, level, topic, question_count, use_count, created_at, updated_at
       FROM templates ${where}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      ...args, lim, off
    );
    const total = this._one(`SELECT COUNT(*) AS c FROM templates ${where}`, ...args);
    return { templates: rows, total: total ? total.c : 0 };
  }

  /** Full template including the question snapshot (for preview / cloning). */
  getTemplate(id) {
    return this._one('SELECT * FROM templates WHERE id = ?', id);
  }

  /** Only the owning teacher can remove their template. */
  deleteTemplate(id, teacherId) {
    const t = this._one('SELECT id, teacher_id FROM templates WHERE id = ?', id);
    if (!t) return false;
    if (t.teacher_id !== teacherId) throw new Error('Not your template');
    this.sql.exec('DELETE FROM templates WHERE id = ?', id);
    return true;
  }

  incrementUseCount(id) {
    this.sql.exec('UPDATE templates SET use_count = use_count + 1 WHERE id = ?', id);
  }

  /** Distinct subjects for the gallery filter. */
  listSubjects() {
    return this._all(
      `SELECT subject, COUNT(*) AS c FROM templates
       WHERE subject != '' GROUP BY subject ORDER BY c DESC LIMIT 50`
    );
  }
}
