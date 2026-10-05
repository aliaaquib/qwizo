/**
 * Server-side grading. The browser never decides a score.
 * Grading always runs against the quiz's published snapshot, so edits
 * made after publishing cannot change already-taken results.
 */

function normalize(text, caseSensitive) {
  let s = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!caseSensitive) s = s.toLowerCase();
  // strip trailing punctuation for forgiving matching
  s = s.replace(/[.,;:!?]+$/, '');
  return s;
}

/**
 * @param {object} snapshot {questions:[{id,type,marks,case_sensitive,options,pairs,accepted}]}
 * @param {object} answers {questionId: answerPayload}
 * Answer payloads: mcq {option_id} | tf {value:boolean} | short/fill {text} | matching {matches:{leftId:rightId}}
 * @returns {graded:[{question_id,answer,is_correct,marks_awarded}], score, max_score, correct_count, incorrect_count}
 */
export function gradeSubmission(snapshot, answers) {
  const graded = [];
  let score = 0, maxScore = 0, correct = 0, incorrect = 0;

  for (const q of snapshot.questions || []) {
    const marks = Number(q.marks) || 0;
    maxScore += marks;
    const ans = answers[q.id];
    let isCorrect = false;
    let awarded = 0;

    if (ans !== undefined && ans !== null) {
      if (q.type === 'mcq') {
        const opt = (q.options || []).find(o => o.id === ans.option_id);
        isCorrect = !!(opt && opt.is_correct);
        awarded = isCorrect ? marks : 0;
      } else if (q.type === 'tf') {
        const opt = (q.options || []).find(o => (o.text || '').toLowerCase() === String(ans.value).toLowerCase());
        isCorrect = !!(opt && opt.is_correct);
        awarded = isCorrect ? marks : 0;
      } else if (q.type === 'short' || q.type === 'fill') {
        const given = normalize(ans.text, q.case_sensitive);
        isCorrect = (q.accepted || []).some(a => normalize(a.text ?? a, q.case_sensitive) === given) && given.length > 0;
        awarded = isCorrect ? marks : 0;
      } else if (q.type === 'matching') {
        const matches = (ans && ans.matches) || {};
        const pairs = q.pairs || [];
        let right = 0;
        for (const p of pairs) {
          if (matches[p.id] && String(matches[p.id]) === String(p.right_id || p.id)) right++;
        }
        // proportional credit, rounded to 2 decimals
        awarded = pairs.length ? Math.round((right / pairs.length) * marks * 100) / 100 : 0;
        isCorrect = pairs.length > 0 && right === pairs.length;
      }
    }

    score += awarded;
    if (isCorrect) correct++; else incorrect++;
    graded.push({ question_id: q.id, answer: ans ?? null, is_correct: isCorrect, marks_awarded: awarded });
  }

  score = Math.round(score * 100) / 100;
  maxScore = Math.round(maxScore * 100) / 100;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
  return { graded, score, max_score: maxScore, percentage, correct_count: correct, incorrect_count: incorrect };
}

/**
 * Build the immutable snapshot stored at publish time.
 * Includes correct answers (server only — never sent to students).
 */
export function buildSnapshot(quiz, questions) {
  return {
    quiz: { id: quiz.id, title: quiz.title, settings: JSON.parse(quiz.settings || '{}') },
    questions: questions.map(q => ({
      id: q.id, type: q.type, text: q.text, marks: q.marks, explanation: q.explanation || '',
      case_sensitive: !!q.case_sensitive,
      options: (q.options || []).map(o => ({ id: o.id, text: o.text, is_correct: !!o.is_correct })),
      accepted: (q.accepted || []).map(a => ({ text: a.text })),
      pairs: (q.pairs || []).map(p => ({ id: p.id, left: p.left_text, right: p.right_text, right_id: p.id })),
    })),
  };
}

/**
 * Public-safe version of the snapshot: strips correct answers and
 * explanations. This is what the student's browser receives.
 */
export function publicQuizPayload(quiz, questions, settings) {
  return {
    code: quiz.share_code,
    title: quiz.title,
    description: quiz.description,
    subject: quiz.subject,
    level: quiz.level,
    time_limit_sec: quiz.time_limit_sec,
    settings: {
      shuffle_questions: !!settings.shuffle_questions,
      shuffle_options: !!settings.shuffle_options,
      require_student_name: settings.require_student_name !== false,
      allow_multiple_attempts: !!settings.allow_multiple_attempts,
      show_results_immediately: settings.show_results_immediately !== false,
    },
    questions: questions.map(q => ({
      id: q.id, type: q.type, text: q.text, marks: q.marks,
      options: q.type === 'matching' ? undefined : (q.options || []).map(o => ({ id: o.id, text: o.text })),
      // matching: lefts fixed, rights shuffled client-side
      lefts: q.type === 'matching' ? (q.pairs || []).map(p => ({ id: p.id, text: p.left_text || p.left })) : undefined,
      rights: q.type === 'matching' ? (q.pairs || []).map(p => ({ id: p.id, text: p.right_text || p.right })) : undefined,
    })),
  };
}

/* ---------------- quiz validation (publish gate) ---------------- */

export function validateQuestionForPublish(q) {
  const errs = [];
  if (!q.text || !q.text.trim()) errs.push('question text is empty');
  if (!(q.marks > 0)) errs.push('marks must be greater than 0');
  if (q.type === 'mcq') {
    if (!q.options || q.options.length < 2) errs.push('needs at least 2 options');
    const correct = (q.options || []).filter(o => o.is_correct).length;
    if (correct !== 1) errs.push('needs exactly one correct answer');
    if ((q.options || []).some(o => !o.text || !o.text.trim())) errs.push('an option is empty');
  } else if (q.type === 'tf') {
    const correct = (q.options || []).filter(o => o.is_correct).length;
    if (correct !== 1) errs.push('needs a correct answer (True or False)');
  } else if (q.type === 'short' || q.type === 'fill') {
    if (!(q.accepted || []).some(a => (a.text || '').trim())) errs.push('needs at least one accepted answer');
    if (q.type === 'fill' && !q.text.includes('_____')) errs.push('fill-in-the-blank needs a _____ blank');
  } else if (q.type === 'matching') {
    if (!(q.pairs || []).length || q.pairs.length < 2) errs.push('needs at least 2 pairs');
    if ((q.pairs || []).some(p => !p.left_text || !p.right_text)) errs.push('a pair has empty text');
  } else {
    errs.push(`unknown type "${q.type}"`);
  }
  return errs;
}

export function validateQuizForPublish(quiz, questions) {
  const errs = [];
  if (!quiz.title || !quiz.title.trim()) errs.push('Quiz needs a title');
  if (!questions.length) errs.push('Quiz needs at least one question');
  questions.forEach((q, i) => {
    for (const e of validateQuestionForPublish(q)) errs.push(`Q${i + 1}: ${e}`);
  });
  return errs;
}
