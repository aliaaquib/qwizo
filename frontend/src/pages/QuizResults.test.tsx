import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuizResults } from '@/pages/QuizResults';
import type { ResultsSummary, Submission, SubmissionDetail } from '@/types';

vi.mock('react-router-dom', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useParams: () => ({ id: 'quiz-1' }) };
});

const mockApi = vi.hoisted(() => ({
  resultsSummary: vi.fn(),
  listSubmissions: vi.fn(),
  getSubmission: vi.fn(),
}));
vi.mock('@/lib/api/client', () => ({ api: mockApi }));

const summary: ResultsSummary = {
  total: 2,
  avg_percentage: 75,
  per_question: [
    { question_id: 'q1', attempts: 2, correct_pct: 100, text: 'Easy one' },
    { question_id: 'q2', attempts: 2, correct_pct: 50, text: 'Hard one' },
  ],
};

const submissions: Submission[] = [
  {
    id: 's1', student_name: 'Aiza', score: 8, max_score: 10, percentage: 80,
    correct_count: 4, incorrect_count: 1, duration_sec: 125, submitted_at: 1791304000000, late: false,
  },
  {
    id: 's2', student_name: 'Bek', score: 7, max_score: 10, percentage: 70,
    correct_count: 3, incorrect_count: 2, duration_sec: 200, submitted_at: 1791304100000, late: true,
  },
];

const detail: SubmissionDetail = {
  id: 's1', quiz_id: 'quiz-1', student_name: 'Aiza',
  score: 8, max_score: 10, percentage: 80, correct_count: 4, incorrect_count: 1,
  duration_sec: 125, submitted_at: 1791304000000, late: false,
  snapshot: {
    questions: [
      {
        id: 'q1', type: 'mcq', text: 'Easy one', marks: 5, explanation: 'Because.',
        options: [{ id: 'a', text: 'Yes', is_correct: true }, { id: 'b', text: 'No', is_correct: false }],
        accepted: [], pairs: [],
      },
      {
        id: 'q2', type: 'short', text: 'Hard one', marks: 5, explanation: '',
        options: [], accepted: [{ text: 'answer' }], pairs: [],
      },
    ],
  },
  answers: [
    { question_id: 'q1', answer: { option_id: 'a' }, is_correct: true, marks_awarded: 5 },
    { question_id: 'q2', answer: { text: 'wrong' }, is_correct: false, marks_awarded: 0 },
  ],
};

beforeEach(() => {
  cleanup();
  Object.values(mockApi).forEach(fn => fn.mockReset());
  mockApi.resultsSummary.mockResolvedValue({ quiz: { id: 'quiz-1', title: 'Capitals' }, summary });
  mockApi.listSubmissions.mockResolvedValue({ submissions });
  mockApi.getSubmission.mockResolvedValue({ submission: detail, quiz: { id: 'quiz-1', title: 'Capitals' } });
});

function renderResults() {
  return render(
    <MemoryRouter>
      <QuizResults />
    </MemoryRouter>,
  );
}

describe('QuizResults', () => {
  it('renders analytics, question performance and submissions', async () => {
    renderResults();
    expect(await screen.findByText('Results — Capitals')).toBeTruthy();
    expect(screen.getByText('2 submissions · average 75%')).toBeTruthy();

    // hero stats
    expect(screen.getAllByText('Submissions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Average score')).toBeTruthy();
    expect(screen.getByText('Hardest question')).toBeTruthy();
    expect(screen.getByText('Easiest question')).toBeTruthy();

    // question performance bars
    expect(screen.getByText(/Q1 · Easy one/)).toBeTruthy();
    expect(screen.getByText(/Q2 · Hard one/)).toBeTruthy();

    // submissions
    expect(screen.getByText('Aiza')).toBeTruthy();
    expect(screen.getByText('Bek')).toBeTruthy();
    expect(screen.getByText('8 / 10 · 80%')).toBeTruthy();
  });

  it('shows the empty state when there are no submissions', async () => {
    mockApi.resultsSummary.mockResolvedValue({
      quiz: { id: 'quiz-1', title: 'Capitals' },
      summary: { total: 0, avg_percentage: 0, per_question: [] },
    });
    mockApi.listSubmissions.mockResolvedValue({ submissions: [] });
    renderResults();
    expect(await screen.findByText('No results yet')).toBeTruthy();
    expect(screen.queryByText('Aiza')).toBeNull();
  });

  it('opens a submission detail modal with per-answer review', async () => {
    renderResults();
    await screen.findByText('Aiza');

    fireEvent.click(screen.getByText('Aiza'));
    const scoreEl = await screen.findByText('8 / 10 (80%)');
    const modal = scoreEl.closest('div.fixed') as HTMLElement;
    expect(within(modal).getByText('Aiza')).toBeTruthy();
    // answer review
    expect(within(modal).getByText(/Q1\. Easy one/)).toBeTruthy();
    expect(within(modal).getByText('Yes')).toBeTruthy(); // mcq answer text resolved
    expect(within(modal).getByText('wrong')).toBeTruthy(); // short answer text
    expect(within(modal).getByText('Because.')).toBeTruthy(); // explanation
    expect(mockApi.getSubmission).toHaveBeenCalledWith('s1');
  });
});
