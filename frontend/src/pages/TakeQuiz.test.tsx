import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TakeQuiz } from '@/pages/TakeQuiz';
import type { PublicQuiz, StudentResultData } from '@/types';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useParams: () => ({ code: 'AB-1234' }), useNavigate: () => mockNavigate };
});

const mockApi = vi.hoisted(() => ({
  publicQuiz: vi.fn(),
  publicStart: vi.fn(),
  publicSubmit: vi.fn(),
}));
vi.mock('@/lib/api/client', () => ({ api: mockApi }));

const pubQuiz: PublicQuiz = {
  code: 'AB-1234',
  title: 'Capitals',
  description: 'A geography quiz',
  subject: 'Geography',
  level: '',
  time_limit_sec: 600,
  settings: {
    shuffle_questions: false, shuffle_options: false,
    require_student_name: true, allow_multiple_attempts: false,
    show_results_immediately: true,
  },
  questions: [
    {
      id: 'pq1', type: 'mcq', text: 'Capital of France?', marks: 2,
      options: [{ id: 'a', text: 'Paris' }, { id: 'b', text: 'Rome' }],
    },
    {
      id: 'pq2', type: 'tf', text: 'The sky is blue?', marks: 1,
      options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
    },
  ],
};

const resultData: StudentResultData = {
  score: 2, max_score: 3, percentage: 67,
  correct_count: 1, incorrect_count: 1, duration_sec: 65, late: false,
  questions: [
    { question_id: 'pq1', text: 'Capital of France?', marks: 2, marks_awarded: 2, is_correct: true, correct: 'Paris', explanation: 'It is Paris.' },
    { question_id: 'pq2', text: 'The sky is blue?', marks: 1, marks_awarded: 0, is_correct: false, correct: 'True' },
  ],
};

beforeEach(() => {
  cleanup();
  mockNavigate.mockReset();
  Object.values(mockApi).forEach(fn => fn.mockReset());
  mockApi.publicQuiz.mockResolvedValue({ quiz: pubQuiz });
  mockApi.publicStart.mockResolvedValue({ attempt_id: 'att1', started_at: 1, expires_at: null, time_limit_sec: 600 });
  mockApi.publicSubmit.mockResolvedValue({ result: resultData, result_token: 'tok123' });
});

function renderTake() {
  return render(
    <MemoryRouter>
      <TakeQuiz />
    </MemoryRouter>,
  );
}

async function startQuiz() {
  renderTake();
  await screen.findByText('Capitals');
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Aiza' } });
  fireEvent.click(screen.getByText('Start quiz'));
  await screen.findByText('Capital of France?');
}

describe('TakeQuiz', () => {
  it('renders the intro with title, meta and name field', async () => {
    renderTake();
    expect(await screen.findByText('Capitals')).toBeTruthy();
    expect(screen.getByText('A geography quiz')).toBeTruthy();
    expect(screen.getByText('10 min')).toBeTruthy();
    expect(screen.getByLabelText('Your name')).toBeTruthy();
  });

  it('shows the server error when starting without a name', async () => {
    mockApi.publicStart.mockRejectedValue(new Error('Please enter your name to start.'));
    renderTake();
    await screen.findByText('Capitals');
    fireEvent.click(screen.getByText('Start quiz'));
    expect(await screen.findByText('Please enter your name to start.')).toBeTruthy();
  });

  it('shows an error card for an invalid code', async () => {
    mockApi.publicQuiz.mockRejectedValue(new Error('Quiz not found. Check the code and try again.'));
    renderTake();
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Quiz not found. Check the code and try again.')).toBeTruthy();
  });

  it('answers questions, navigates, and submits with the latest answers', async () => {
    await startQuiz();

    // Q1: answer mcq
    expect(screen.getByText('1 / 2')).toBeTruthy();
    fireEvent.click(screen.getByText('Paris'));
    fireEvent.click(screen.getByText('Next'));

    // Q2: answer true/false
    expect(await screen.findByText('The sky is blue?')).toBeTruthy();
    fireEvent.click(screen.getByText('True'));

    fireEvent.click(screen.getByText('Review & submit'));
    const heading = await screen.findByText('Submit quiz?');
    const dialogEl = heading.closest('div.fixed') as HTMLElement;
    expect(within(dialogEl).getByText(/You answered 2 of 2 questions/)).toBeTruthy();
    fireEvent.click(within(dialogEl).getByText('Submit'));

    await waitFor(() => expect(mockApi.publicSubmit).toHaveBeenCalled());
    const [code, attemptId, answers] = mockApi.publicSubmit.mock.calls[0];
    expect(code).toBe('AB-1234');
    expect(attemptId).toBe('att1');
    expect(answers).toEqual({ pq1: { option_id: 'a' }, pq2: { value: true } });
    expect(mockNavigate).toHaveBeenCalledWith('/q/AB-1234/r/tok123', {
      replace: true,
      state: { result: resultData, quizTitle: 'Capitals' },
    });
  });

  it('renders matching questions with left/right selects', async () => {
    mockApi.publicQuiz.mockResolvedValue({
      quiz: {
        ...pubQuiz,
        questions: [{
          id: 'pq3', type: 'matching', text: 'Match them', marks: 2,
          lefts: [{ id: 'l1', text: 'France' }],
          rights: [{ id: 'r1', text: 'Paris' }, { id: 'r2', text: 'Rome' }],
        }],
      },
    });
    renderTake();
    await screen.findByText('Capitals');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Aiza' } });
    fireEvent.click(screen.getByText('Start quiz'));

    const sel = (await screen.findByLabelText('Match for France')) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'r1' } });
    expect(sel.value).toBe('r1');
  });
});
