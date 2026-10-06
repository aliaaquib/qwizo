import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { JoinQuiz } from '@/pages/JoinQuiz';
import { StudentResult } from '@/pages/StudentResult';
import type { StudentResultData } from '@/types';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...mod,
    useParams: () => (globalThis as Record<string, unknown>).__testParams || {},
    useNavigate: () => mockNavigate,
  };
});

const mockApi = vi.hoisted(() => ({ publicResult: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: mockApi }));

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
  mockApi.publicResult.mockReset();
  (globalThis as Record<string, unknown>).__testParams = {};
});

describe('JoinQuiz', () => {
  it('navigates to the quiz intro on join', async () => {
    (globalThis as Record<string, unknown>).__testParams = {};
    render(
      <MemoryRouter>
        <JoinQuiz />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Quiz code'), { target: { value: 'fnhc-2474' } });
    fireEvent.click(screen.getByText('Join quiz'));
    expect(mockNavigate).toHaveBeenCalledWith('/q/FNHC-2474');
  });

  it('pre-fills the code from the URL param', () => {
    (globalThis as Record<string, unknown>).__testParams = { code: 'AB-1234' };
    render(
      <MemoryRouter>
        <JoinQuiz />
      </MemoryRouter>,
    );
    expect((screen.getByLabelText('Quiz code') as HTMLInputElement).value).toBe('AB-1234');
  });
});

describe('StudentResult', () => {
  it('renders the passed result without fetching', async () => {
    (globalThis as Record<string, unknown>).__testParams = { code: 'AB-1234', token: 'tok123' };
    render(
      <MemoryRouter initialEntries={[{ pathname: '/q/AB-1234/r/tok123', state: { result: resultData, quizTitle: 'Capitals' } }]}>
        <Routes>
          <Route path="/q/:code/r/:token" element={<StudentResult />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Capitals — SUBMITTED')).toBeTruthy();
    expect(screen.getAllByText('Correct').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Incorrect').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('It is Paris.')).toBeTruthy();
    expect(mockApi.publicResult).not.toHaveBeenCalled();
  });

  it('fetches the result by token when opened from a bookmark', async () => {
    (globalThis as Record<string, unknown>).__testParams = { code: 'AB-1234', token: 'tok123' };
    mockApi.publicResult.mockResolvedValue({ result: resultData, quiz_title: 'Capitals' });
    render(
      <MemoryRouter initialEntries={['/q/AB-1234/r/tok123']}>
        <Routes>
          <Route path="/q/:code/r/:token" element={<StudentResult />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Capitals — SUBMITTED')).toBeTruthy();
    expect(mockApi.publicResult).toHaveBeenCalledWith('tok123');
  });

  it('shows "Submitted" without scores when the teacher hides them', async () => {
    (globalThis as Record<string, unknown>).__testParams = { code: 'AB-1234', token: 'tok123' };
    render(
      <MemoryRouter initialEntries={[{ pathname: '/q/AB-1234/r/tok123', state: { result: {}, quizTitle: 'Capitals' } }]}>
        <Routes>
          <Route path="/q/:code/r/:token" element={<StudentResult />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Submitted')).toBeTruthy();
    expect(screen.getByText('Your teacher will share your score with you.')).toBeTruthy();
  });

  it('shows an error for an invalid token', async () => {
    (globalThis as Record<string, unknown>).__testParams = { code: 'AB-1234', token: 'bad' };
    mockApi.publicResult.mockRejectedValue(new Error('Result link is invalid or expired.'));
    render(
      <MemoryRouter initialEntries={['/q/AB-1234/r/bad']}>
        <Routes>
          <Route path="/q/:code/r/:token" element={<StudentResult />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Result not found')).toBeTruthy();
  });
});
