import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuizPreview } from '@/pages/QuizPreview';
import type { Question, Quiz } from '@/types';

vi.mock('react-router-dom', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useParams: () => ({ id: 'quiz-1' }) };
});

const mockApi = vi.hoisted(() => ({ getQuiz: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: mockApi }));

const baseQuiz: Quiz = {
  id: 'quiz-1', title: 'Preview me', description: '', subject: '', curriculum: '',
  level: '', topic: '', time_limit_sec: null,
  settings: {
    shuffle_questions: false, shuffle_options: false, show_score: true,
    show_results_immediately: true, show_correct_answers: true, show_explanations: true,
    allow_multiple_attempts: false, require_student_name: true,
  },
  status: 'draft', share_code: null, created_at: 1, updated_at: 1,
};

const q1: Question = {
  id: 'q1', quiz_id: 'quiz-1', type: 'mcq', text: 'First?', explanation: '', marks: 1,
  difficulty: 'easy', case_sensitive: false,
  options: [{ id: 'a', text: 'Yes', is_correct: true }, { id: 'b', text: 'No', is_correct: false }],
  pairs: [], accepted: [],
};
const q2: Question = {
  id: 'q2', quiz_id: 'quiz-1', type: 'tf', text: 'Second?', explanation: '', marks: 1,
  difficulty: 'easy', case_sensitive: false,
  options: [{ id: 't', text: 'True', is_correct: true }, { id: 'f', text: 'False', is_correct: false }],
  pairs: [], accepted: [],
};

beforeEach(() => {
  cleanup();
  mockApi.getQuiz.mockReset();
});

function renderPreview() {
  return render(
    <MemoryRouter>
      <QuizPreview />
    </MemoryRouter>,
  );
}

describe('QuizPreview', () => {
  it('renders the first question with progress and advances with Next', async () => {
    mockApi.getQuiz.mockResolvedValue({ quiz: baseQuiz, questions: [q1, q2] });
    renderPreview();

    expect(await screen.findByText('Q1 / 2')).toBeTruthy();
    expect(screen.getByText('First?')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();

    fireEvent.click(screen.getByText('Next'));
    expect(await screen.findByText('Q2 / 2')).toBeTruthy();
    expect(screen.getByText('Second?')).toBeTruthy();
    expect(screen.getByText('End of preview')).toBeTruthy();

    fireEvent.click(screen.getByText('Previous'));
    expect(await screen.findByText('Q1 / 2')).toBeTruthy();
  });

  it('shows an empty state when the quiz has no questions', async () => {
    mockApi.getQuiz.mockResolvedValue({ quiz: baseQuiz, questions: [] });
    renderPreview();
    expect(await screen.findByText('No questions yet')).toBeTruthy();
  });

  it('lets students select an answer without recording it', async () => {
    mockApi.getQuiz.mockResolvedValue({ quiz: baseQuiz, questions: [q1] });
    renderPreview();
    await screen.findByText('First?');
    // selecting an option must not call any API
    fireEvent.click(screen.getByText('Yes'));
    expect(mockApi.getQuiz).toHaveBeenCalledTimes(1);
  });
});
