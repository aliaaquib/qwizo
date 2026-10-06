import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuizEditor } from '@/pages/QuizEditor';
import type { Question, Quiz } from '@/types';

vi.mock('react-router-dom', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useParams: () => ({ id: 'quiz-1' }), useNavigate: () => mockNavigate };
});

const mockNavigate = vi.hoisted(() => vi.fn());

const mockApi = vi.hoisted(() => ({
  getQuiz: vi.fn(),
  updateQuiz: vi.fn(),
  updateQuestion: vi.fn(),
  createQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  duplicateQuestion: vi.fn(),
  reorderQuestions: vi.fn(),
  questionToBank: vi.fn(),
  questionAiAction: vi.fn(),
  publishQuiz: vi.fn(),
  unpublishQuiz: vi.fn(),
  listBank: vi.fn(),
  bankAddToQuiz: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ api: mockApi }));

if (!crypto.randomUUID) {
  // @ts-expect-error test shim
  crypto.randomUUID = () => `uuid-${Math.random().toString(36).slice(2)}`;
}

const baseQuiz: Quiz = {
  id: 'quiz-1',
  title: 'Test quiz',
  description: 'desc',
  subject: 'Math',
  curriculum: '',
  level: '',
  topic: '',
  time_limit_sec: null,
  settings: {
    shuffle_questions: false,
    shuffle_options: false,
    show_score: true,
    show_results_immediately: true,
    show_correct_answers: true,
    show_explanations: true,
    allow_multiple_attempts: false,
    require_student_name: true,
  },
  status: 'draft',
  share_code: null,
  created_at: 1,
  updated_at: 1,
};

const mcq: Question = {
  id: 'mcq-1',
  quiz_id: 'quiz-1',
  type: 'mcq',
  text: 'What is 2+2?',
  explanation: '',
  marks: 2,
  difficulty: 'easy',
  case_sensitive: false,
  options: [
    { id: 'o1', text: '3', is_correct: false },
    { id: 'o2', text: '4', is_correct: true },
  ],
  pairs: [],
  accepted: [],
};

const tf: Question = {
  id: 'tf-1',
  quiz_id: 'quiz-1',
  type: 'tf',
  text: 'The sky is blue.',
  explanation: '',
  marks: 1,
  difficulty: 'easy',
  case_sensitive: false,
  options: [
    { id: 't', text: 'True', is_correct: true },
    { id: 'f', text: 'False', is_correct: false },
  ],
  pairs: [],
  accepted: [],
};

const short: Question = {
  id: 'short-1',
  quiz_id: 'quiz-1',
  type: 'short',
  text: 'Capital of France?',
  explanation: '',
  marks: 1,
  difficulty: 'medium',
  case_sensitive: false,
  options: [],
  pairs: [],
  accepted: [{ id: 'a1', text: 'Paris' }],
};

const fill: Question = {
  id: 'fill-1',
  quiz_id: 'quiz-1',
  type: 'fill',
  text: 'The _____ is red.',
  explanation: '',
  marks: 1,
  difficulty: 'medium',
  case_sensitive: false,
  options: [],
  pairs: [],
  accepted: [{ id: 'a1', text: 'rose' }],
};

const matching: Question = {
  id: 'match-1',
  quiz_id: 'quiz-1',
  type: 'matching',
  text: 'Match them.',
  explanation: '',
  marks: 2,
  difficulty: 'hard',
  case_sensitive: false,
  options: [],
  pairs: [
    { id: 'p1', left_text: 'A', right_text: '1' },
    { id: 'p2', left_text: 'B', right_text: '2' },
  ],
  accepted: [],
};

function renderEditor() {
  return render(
    <MemoryRouter>
      <QuizEditor />
    </MemoryRouter>,
  );
}

// Faithful browser typing simulation. user-event v14 is not compatible with
// React 19's value tracking (typed characters get reverted), so set the value
// through the native setter and dispatch a bubbling input event — exactly
// what a real keystroke produces.
function typeText(el: HTMLTextAreaElement | HTMLInputElement, text: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  setter.call(el, text);
  fireEvent.input(el);
}

beforeEach(() => {
  cleanup();
  mockNavigate.mockReset();
  Object.values(mockApi).forEach(fn => fn.mockReset());
  mockApi.getQuiz.mockResolvedValue({ quiz: baseQuiz, questions: [mcq, tf, short, fill, matching] });
  mockApi.updateQuestion.mockImplementation((qid: string, body: object) =>
    Promise.resolve({ question: { ...mcq, id: qid, ...body } }),
  );
});

describe('QuizEditor', () => {
  it('loads the quiz exactly once and does not refetch on edits', async () => {
    renderEditor();
    await screen.findByText('Questions (5)');
    // let any stray effects settle
    await new Promise(r => setTimeout(r, 300));
    expect(mockApi.getQuiz).toHaveBeenCalledTimes(1);

    // editing must not trigger a refetch that would wipe the edit
    const box = screen.getByDisplayValue('What is 2+2?') as HTMLTextAreaElement;
    typeText(box, 'What is 3+3?');
    await screen.findByText('Unsaved changes');
    await new Promise(r => setTimeout(r, 300));
    expect(mockApi.getQuiz).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('What is 3+3?')).toBeTruthy();
  });

  it('loads the quiz and renders all five question-type editors', async () => {
    renderEditor();
    await waitFor(() => expect(screen.getByText('Questions (5)')).toBeTruthy());

    expect(screen.getByDisplayValue('Test quiz')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    // mcq options
    expect(screen.getByDisplayValue('What is 2+2?')).toBeTruthy();
    expect(screen.getByDisplayValue('3')).toBeTruthy();
    // tf buttons
    expect(screen.getAllByText('True').length).toBeGreaterThan(0);
    // short accepted answer
    expect(screen.getByDisplayValue('Paris')).toBeTruthy();
    // fill blank hint
    expect(screen.getByText(/use _____ for the blank/)).toBeTruthy();
    // matching pairs
    expect(screen.getByDisplayValue('A')).toBeTruthy();
    expect(screen.getAllByPlaceholderText('Right')).toHaveLength(2);
    // add bar
    expect(screen.getByText('+ Multiple choice')).toBeTruthy();
    expect(screen.getByText('From bank')).toBeTruthy();
  });

  it('autosaves a question edit after 900ms with the server payload shape', async () => {
    renderEditor();
    await screen.findByText('Questions (5)');

    const box = screen.getByDisplayValue('What is 2+2?') as HTMLTextAreaElement;
    typeText(box, 'What is 3+3?');

    // pill flips to Unsaved changes immediately
    expect(await screen.findByText('Unsaved changes')).toBeTruthy();
    expect(mockApi.updateQuestion).not.toHaveBeenCalled();

    // 900ms debounced autosave fires with real timers
    await waitFor(() => expect(mockApi.updateQuestion).toHaveBeenCalledTimes(1), { timeout: 4000 });

    const [qid, payload] = mockApi.updateQuestion.mock.calls[0] as [string, Record<string, unknown>];
    expect(qid).toBe('mcq-1');
    expect(payload.text).toBe('What is 3+3?');
    expect(payload.type).toBe('mcq');
    expect((payload.options as { text: string }[]).map(o => o.text)).toEqual(['3', '4']);
    expect(await screen.findByText('Saved')).toBeTruthy();
  });

  it('shows the publish validation checklist when the server rejects', async () => {
    const err = Object.assign(new Error('This quiz cannot be published yet.'), {
      errors: ['Q2: question text is empty'],
    });
    mockApi.publishQuiz.mockRejectedValue(err);
    renderEditor();
    await screen.findByText('Questions (5)');

    fireEvent.click(screen.getByText('Publish'));
    // publish waits 1100ms for pending saves before calling the API
    await waitFor(() => expect(mockApi.publishQuiz).toHaveBeenCalled(), { timeout: 4000 });
    expect(await screen.findByText('This quiz is not ready to publish yet:')).toBeTruthy();
    expect(screen.getByText('Q2: question text is empty')).toBeTruthy();
  });

  it('navigates to the share page on successful publish', async () => {
    mockApi.publishQuiz.mockResolvedValue({ quiz: { ...baseQuiz, status: 'published', share_code: 'AB-1234' } });
    renderEditor();
    await screen.findByText('Questions (5)');

    fireEvent.click(screen.getByText('Publish'));
    await waitFor(() => expect(mockApi.publishQuiz).toHaveBeenCalled(), { timeout: 4000 });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app/quizzes/quiz-1/share'));
  });

  it('shows read-only published state with Share and Unpublish when opened published', async () => {
    mockApi.getQuiz.mockResolvedValueOnce({
      quiz: { ...baseQuiz, status: 'published', share_code: 'AB-1234' },
      questions: [mcq],
    });
    renderEditor();
    await screen.findByText('Questions (1)');

    expect(screen.getByText('Unpublish')).toBeTruthy();
    expect(screen.getByText('Share')).toBeTruthy();
    expect(screen.getByText('published')).toBeTruthy();
    // question fields are disabled in published mode
    expect((screen.getByDisplayValue('What is 2+2?') as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('deletes a question after confirmation', async () => {
    mockApi.deleteQuestion.mockResolvedValue({ ok: true });
    const { container } = renderEditor();
    await waitFor(() => expect(screen.getByText('Questions (5)')).toBeTruthy());

    const firstCard = container.querySelector('[data-qcard="mcq-1"]')!;
    fireEvent.click(firstCard.querySelector('[aria-label="Delete"]')!);
    // confirm dialog
    const heading = await screen.findByText('Delete question?');
    const dialogEl = heading.closest('div.fixed') as HTMLElement;
    fireEvent.click(within(dialogEl).getByText('Delete'));
    await waitFor(() => expect(mockApi.deleteQuestion).toHaveBeenCalledWith('mcq-1'));
  });
});
