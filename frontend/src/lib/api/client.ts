// Typed API client for the existing Qwizo Worker API.
// Endpoint shapes are unchanged from the vanilla frontend.

import type {
  Teacher, Quiz, Question, BankItem, Submission, ApiError, QuestionType,
} from '@/types';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
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

  // bank
  listBank: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<{ items: BankItem[] }>(`/api/bank${q ? `?${q}` : ''}`);
  },
  bankAddToQuiz: (id: string, quiz_id: string) =>
    request<{ question: Question }>(`/api/bank/${id}/add-to-quiz`, {
      method: 'POST', body: JSON.stringify({ quiz_id }),
    }),

  // AI
  aiGenerate: (body: Record<string, unknown>) =>
    request<{ quiz: Quiz; questions: Question[] }>('/api/ai/generate', {
      method: 'POST', body: JSON.stringify(body),
    }),

  // results
  resultsSummary: (quizId: string) =>
    request<{ total: number; average: number; per_question: Record<string, number> }>(
      `/api/quizzes/${quizId}/results/summary`),
  listSubmissions: (quizId: string) =>
    request<{ submissions: Submission[] }>(`/api/quizzes/${quizId}/submissions`),
};
