import type {
  Teacher, Quiz, Question, BankItem, Submission, SubmissionDetail, ResultsSummary,
  ApiError, QuestionType,
  PublicQuiz, StudentAnswer, StudentResultData,
} from '@/types';

// Typed API client for the existing Qwizo Worker API.
// Endpoint shapes are unchanged from the vanilla frontend.
//
// API base URL: defaults to relative paths (works with Vite dev proxy).
// Set VITE_API_URL in production to point at the Cloudflare Worker.

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  // FormData sets its own multipart content-type (with boundary) — never
  // override it with application/json.
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(opts.headers || {}) },
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => ({}))) as T & ApiError & { errors?: string[] };
  if (!res.ok) {
    // Mirror the vanilla client: attach server-side validation errors so the
    // editor can show the publish checklist instead of a single message.
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & {
      errors?: string[];
      status?: number;
    };
    err.errors = data.errors;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  // auth
  signup: (name: string, email: string, password: string) =>
    request<{ user: Teacher }>('/api/auth/signup', {
      method: 'POST', body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: Teacher }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: Teacher }>('/api/auth/me'),
  updateMe: (name: string) =>
    request<{ user: Teacher }>('/api/auth/me', {
      method: 'PUT', body: JSON.stringify({ name }),
    }),

  // dashboard + quizzes
  stats: () => request<{ stats: Record<string, number>; recent: Quiz[] }>('/api/stats'),
  listQuizzes: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<{ quizzes: Quiz[] }>(`/api/quizzes${q ? `?${q}` : ''}`);
  },
  createQuiz: (body: Partial<Quiz>) =>
    request<{ quiz: Quiz }>('/api/quizzes', { method: 'POST', body: JSON.stringify(body) }),
  getQuiz: (id: string) =>
    request<{ quiz: Quiz; questions: Question[] }>(`/api/quizzes/${id}`),
  updateQuiz: (id: string, body: Partial<Quiz>) =>
    request<{ quiz: Quiz }>(`/api/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteQuiz: (id: string) =>
    request<{ ok: true }>(`/api/quizzes/${id}`, { method: 'DELETE' }),
  duplicateQuiz: (id: string) =>
    request<{ quiz: Quiz }>(`/api/quizzes/${id}/duplicate`, { method: 'POST' }),
  publishQuiz: (id: string) =>
    request<{ quiz: Quiz }>(`/api/quizzes/${id}/publish`, { method: 'POST' }),
  unpublishQuiz: (id: string) =>
    request<{ quiz: Quiz }>(`/api/quizzes/${id}/unpublish`, { method: 'POST' }),
  archiveQuiz: (id: string) =>
    request<{ quiz: Quiz }>(`/api/quizzes/${id}/archive`, { method: 'POST' }),

  // questions
  createQuestion: (quizId: string, body: Partial<Question> & { type: QuestionType }) =>
    request<{ question: Question }>(`/api/quizzes/${quizId}/questions`, {
      method: 'POST', body: JSON.stringify(body),
    }),
  updateQuestion: (qid: string, body: Partial<Question>) =>
    request<{ question: Question }>(`/api/questions/${qid}`, {
      method: 'PUT', body: JSON.stringify(body),
    }),
  deleteQuestion: (qid: string) =>
    request<{ ok: true }>(`/api/questions/${qid}`, { method: 'DELETE' }),
  duplicateQuestion: (qid: string) =>
    request<{ question: Question }>(`/api/questions/${qid}/duplicate`, { method: 'POST' }),
  reorderQuestions: (quizId: string, question_ids: string[]) =>
    request<{ ok: true }>(`/api/quizzes/${quizId}/reorder`, {
      method: 'PUT', body: JSON.stringify({ question_ids }),
    }),
  questionToBank: (qid: string) =>
    request<{ bank_item: BankItem }>(`/api/questions/${qid}/to-bank`, { method: 'POST' }),
  questionAiAction: (qid: string, action: string) =>
    request<{ proposal: unknown }>(`/api/questions/${qid}/ai-action`, {
      method: 'POST', body: JSON.stringify({ action }),
    }),

  // public student endpoints
  publicQuiz: (code: string) =>
    request<{ quiz: PublicQuiz }>(`/api/public/quiz/${encodeURIComponent(code)}`),
  publicStart: (code: string, student_name: string) =>
    request<{ attempt_id: string; started_at: number; expires_at: number | null; time_limit_sec: number | null }>(
      `/api/public/quiz/${encodeURIComponent(code)}/start`,
      { method: 'POST', body: JSON.stringify({ student_name }) },
    ),
  publicSubmit: (code: string, attempt_id: string, answers: Record<string, StudentAnswer>) =>
    request<{ result: StudentResultData; result_token: string }>(
      `/api/public/quiz/${encodeURIComponent(code)}/submit`,
      { method: 'POST', body: JSON.stringify({ attempt_id, answers }) },
    ),
  publicResult: (token: string) =>
    request<{ result: StudentResultData; quiz_title: string }>(`/api/public/result/${encodeURIComponent(token)}`),

  // bank
  listBank: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<{ items: BankItem[] }>(`/api/bank${q ? `?${q}` : ''}`);
  },
  createBankItem: (body: Record<string, unknown>) =>
    request<{ item: BankItem }>('/api/bank', { method: 'POST', body: JSON.stringify(body) }),
  updateBankItem: (id: string, body: Record<string, unknown>) =>
    request<{ item: BankItem }>(`/api/bank/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBankItem: (id: string) =>
    request<{ ok: true }>(`/api/bank/${id}`, { method: 'DELETE' }),
  bankAddToQuiz: (id: string, quiz_id: string) =>
    request<{ question: Question }>(`/api/bank/${id}/add-to-quiz`, {
      method: 'POST', body: JSON.stringify({ quiz_id }),
    }),

  // AI
  aiGenerate: (body: Record<string, unknown>) =>
    request<{ quiz: Quiz; questions: Question[] }>('/api/ai/generate', {
      method: 'POST', body: JSON.stringify(body),
    }),
  aiGenerateUpload: (form: FormData) =>
    request<{ quiz: Quiz; questions: Question[] }>('/api/ai/generate-upload', {
      method: 'POST', body: form,
    }),

  // results
  resultsSummary: (quizId: string) =>
    request<{ quiz: { id: string; title: string }; summary: ResultsSummary }>(
      `/api/quizzes/${quizId}/results/summary`),
  listSubmissions: (quizId: string) =>
    request<{ submissions: Submission[] }>(`/api/quizzes/${quizId}/submissions`),
  getSubmission: (subId: string) =>
    request<{ submission: SubmissionDetail; quiz: { id: string; title: string } }>(
      `/api/submissions/${subId}`),
};
