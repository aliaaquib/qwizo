/**
 * AI quiz generation via Workers AI (Llama 3.3 70b).
 * The model MUST return structured JSON. Output is validated strictly;
 * anything that fails validation is retried, never saved half-parsed.
 * Generated quizzes always start as drafts — publishing is a separate,
 * teacher-driven step.
 */

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_ATTEMPTS = 3;

export const QUESTION_TYPES = ['mcq', 'tf', 'short', 'fill', 'matching'];

const TYPE_DESCRIPTIONS = `
- "mcq": multiple choice. Needs "options": array of 4 objects {text, is_correct} with exactly one is_correct=true.
- "tf": true/false. Needs "correct_bool": true or false.
- "short": short answer. Needs "accepted": array of 1-4 acceptable answer strings.
- "fill": fill in the blank. The "text" must contain "_____" for the blank. Needs "accepted": array of 1-4 acceptable answer strings.
- "matching": matching pairs. Needs "pairs": array of 4 objects {left, right} with unambiguous one-to-one matches.
Every question needs: "text" (string), "explanation" (string, 1-2 sentences), "marks" (number, default 1), "difficulty" ("easy"|"medium"|"hard").
`;

function buildPrompt(spec) {
  const types = (spec.types && spec.types.length ? spec.types : ['mcq', 'short'])
    .filter(t => QUESTION_TYPES.includes(t));
  return `You are an expert teacher creating a quiz. Generate exactly ${spec.count} questions.

Quiz context:
- Subject: ${spec.subject || 'General'}
- Curriculum: ${spec.curriculum || 'General'}
- Level: ${spec.level || 'General'}
- Topic: ${spec.topic || spec.prompt}
- Difficulty: ${spec.difficulty || 'medium'}
- Allowed question types: ${types.join(', ')}
${spec.material ? `Use ONLY the following source material for the questions. Do not invent facts outside it:\n---\n${spec.material.slice(0, 12000)}\n---` : `Teacher's request: "${spec.prompt}"`}
${TYPE_DESCRIPTIONS}
Rules:
- Distribute the allowed question types across the quiz.
- For mcq, make distractors plausible but clearly wrong.
- Keep language clear and age-appropriate for the level.
- Every question must be answerable and unambiguous.
- Respond with ONLY a JSON object, no prose, no markdown fences:
{"questions":[{"type":"mcq","text":"...","options":[{"text":"...","is_correct":false}],"explanation":"...","marks":1,"difficulty":"medium"}, ...]}`;
}

/** Strict validator. Returns {ok, questions} or {ok:false, reason}. */
export function validateAIQuestions(raw, expectedTypes) {
  if (!raw || typeof raw !== 'object') return fail('Response was not an object');
  const list = raw.questions;
  if (!Array.isArray(list) || list.length === 0) return fail('No questions array in response');
  if (list.length > 60) return fail('Too many questions returned');
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    const v = validateOneQuestion(q, i);
    if (!v.ok) return v;
    if (expectedTypes && expectedTypes.length && !expectedTypes.includes(v.question.type)) {
      return fail(`Question ${i + 1}: unexpected type "${v.question.type}"`);
    }
    out.push(v.question);
  }
  return { ok: true, questions: out };
}

function fail(reason) { return { ok: false, reason }; }

function cleanStr(s, max = 2000) {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

function validateOneQuestion(q, i) {
  const n = i + 1;
  if (!q || typeof q !== 'object') return fail(`Question ${n}: not an object`);
  if (!QUESTION_TYPES.includes(q.type)) return fail(`Question ${n}: bad type "${q.type}"`);
  const text = cleanStr(q.text, 2000);
  if (!text) return fail(`Question ${n}: missing text`);
  const explanation = cleanStr(q.explanation, 2000);
  const marks = Number(q.marks);
  const difficulty = ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium';
  const base = { type: q.type, text, explanation, marks: marks > 0 && marks <= 100 ? marks : 1, difficulty };

  if (q.type === 'mcq') {
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length < 2 || opts.length > 6) return fail(`Question ${n}: mcq needs 2-6 options`);
    const cleaned = opts.map(o => ({ text: cleanStr(o && o.text, 500), is_correct: !!(o && o.is_correct) }));
    if (cleaned.some(o => !o.text)) return fail(`Question ${n}: empty option text`);
    const correct = cleaned.filter(o => o.is_correct).length;
    if (correct !== 1) return fail(`Question ${n}: mcq needs exactly one correct option`);
    return { ok: true, question: { ...base, options: cleaned } };
  }
  if (q.type === 'tf') {
    if (typeof q.correct_bool !== 'boolean') return fail(`Question ${n}: tf needs correct_bool`);
    return {
      ok: true,
      question: { ...base, options: [{ text: 'True', is_correct: q.correct_bool }, { text: 'False', is_correct: !q.correct_bool }] },
    };
  }
  if (q.type === 'short' || q.type === 'fill') {
    if (q.type === 'fill' && !text.includes('_____')) return fail(`Question ${n}: fill needs a _____ blank`);
    const accepted = Array.isArray(q.accepted) ? q.accepted.map(a => cleanStr(a, 300)).filter(Boolean) : [];
    if (!accepted.length) return fail(`Question ${n}: needs at least one accepted answer`);
    return { ok: true, question: { ...base, accepted: accepted.slice(0, 6), case_sensitive: false } };
  }
  if (q.type === 'matching') {
    const pairs = Array.isArray(q.pairs) ? q.pairs : [];
    if (pairs.length < 3 || pairs.length > 8) return fail(`Question ${n}: matching needs 3-8 pairs`);
    const cleaned = pairs.map(p => ({ left: cleanStr(p && (p.left || p.left_text), 300), right: cleanStr(p && (p.right || p.right_text), 300) }));
    if (cleaned.some(p => !p.left || !p.right)) return fail(`Question ${n}: empty pair text`);
    const rights = new Set(cleaned.map(p => p.right.toLowerCase()));
    if (rights.size !== cleaned.length) return fail(`Question ${n}: matching right sides must be unique`);
    return { ok: true, question: { ...base, pairs: cleaned } };
  }
  return fail(`Question ${n}: unhandled type`);
}

function extractJson(text) {
  // Strip markdown fences if the model adds them despite instructions.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)); }
  catch { return null; }
}

export async function generateQuizQuestions(env, spec) {
  const count = Math.min(Math.max(parseInt(spec.count, 10) || 10, 1), 40);
  const prompt = buildPrompt({ ...spec, count });
  let lastReason = 'unknown';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: 'You generate quiz questions as strict JSON. Never add prose outside the JSON object.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 6000,
        temperature: 0.7,
      });
      const text = typeof res === 'string' ? res : (res.response || JSON.stringify(res));
      const parsed = extractJson(text);
      if (!parsed) { lastReason = 'AI returned unparsable output'; continue; }
      const v = validateAIQuestions(parsed, spec.types);
      if (v.ok) return { ok: true, questions: v.questions };
      lastReason = v.reason;
    } catch (e) {
      lastReason = e.message || 'AI request failed';
    }
  }
  return { ok: false, reason: `AI generation failed after ${MAX_ATTEMPTS} attempts: ${lastReason}` };
}

const QUESTION_ACTIONS = {
  improve: 'Rewrite the question for clarity and correctness. Keep the same type, answer and difficulty.',
  easier: 'Make this question easier while testing the same concept. Keep the same type.',
  harder: 'Make this question harder while testing the same concept. Keep the same type.',
  regenerate: 'Create a fresh question on the same concept and difficulty. Keep the same type.',
  distractors: 'For this multiple-choice question, replace the wrong options with stronger, more plausible distractors. Keep the correct answer correct.',
  explanation: 'Write a clear 1-2 sentence explanation for why the correct answer is correct.',
  change_type: 'Convert this question to the requested target type, keeping the same concept and difficulty.',
};

/**
 * AI assistance on a single question. Returns a PROPOSAL — the caller
 * decides whether to apply it. Never overwrites silently.
 */
export async function questionAIAction(env, action, question, extra = {}) {
  if (!QUESTION_ACTIONS[action]) return { ok: false, reason: 'Unknown action' };
  const instruction = QUESTION_ACTIONS[action] + (action === 'change_type' && extra.target_type ? ` Target type: ${extra.target_type}.` : '');
  const prompt = `${instruction}\n\nCurrent question (JSON):\n${JSON.stringify(question).slice(0, 4000)}\n\nRespond with ONLY a JSON object for the updated question using the same shape as a generated question: {"type","text","options"|"accepted"|"pairs"|"correct_bool","explanation","marks","difficulty"}. No prose.`;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: 'You edit quiz questions as strict JSON. Never add prose outside the JSON object.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });
      const text = typeof res === 'string' ? res : (res.response || JSON.stringify(res));
      const parsed = extractJson(text);
      if (!parsed) continue;
      // The model returns a single question object, not {questions:[...]}
      const v = validateOneQuestion(parsed.type ? parsed : parsed.question, 0);
      if (v.ok) return { ok: true, proposal: v.question };
    } catch { /* retry */ }
  }
  return { ok: false, reason: 'AI could not produce a valid question. Try again.' };
}
