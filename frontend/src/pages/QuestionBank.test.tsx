import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuestionBank } from '@/pages/QuestionBank';
import type { BankItem } from '@/types';

const mockApi = vi.hoisted(() => ({
  listBank: vi.fn(),
  createBankItem: vi.fn(),
  updateBankItem: vi.fn(),
  deleteBankItem: vi.fn(),
  bankAddToQuiz: vi.fn(),
  listQuizzes: vi.fn(),
}));
vi.mock('@/lib/api/client', () => ({ api: mockApi }));

const bankItem: BankItem = {
  id: 'b1', type: 'mcq', text: 'Capital of France?', explanation: '', marks: 1,
  difficulty: 'easy', subject: 'Geography', topic: '', curriculum: '', level: '',
  payload: {
    options: [
      { id: 'a', text: 'Paris', is_correct: true },
      { id: 'b', text: 'Rome', is_correct: false },
    ],
    pairs: [], accepted: [], case_sensitive: false,
  },
};

beforeEach(() => {
  cleanup();
  Object.values(mockApi).forEach(fn => fn.mockReset());
  mockApi.listBank.mockResolvedValue({ items: [bankItem] });
  mockApi.listQuizzes.mockResolvedValue({ quizzes: [] });
});

function renderBank() {
  return render(
    <MemoryRouter>
      <QuestionBank />
    </MemoryRouter>,
  );
}

describe('QuestionBank', () => {
  it('lists bank items with type and subject metadata', async () => {
    renderBank();
    expect(await screen.findByText('Capital of France?')).toBeTruthy();
    expect(screen.getByText(/Multiple choice · Geography/)).toBeTruthy();
  });

  it('shows the empty state when the bank is empty', async () => {
    mockApi.listBank.mockResolvedValue({ items: [] });
    renderBank();
    expect(await screen.findByText('Bank is empty')).toBeTruthy();
  });

  it('creates a new bank question through the modal', async () => {
    mockApi.createBankItem.mockResolvedValue({ item: bankItem });
    renderBank();
    await screen.findByText('Capital of France?');

    fireEvent.click(screen.getByText('+ New question'));
    const modal = document.querySelector('.fixed.inset-0') as HTMLElement;
    expect(within(modal).getByText('New bank question')).toBeTruthy();

    // fill question text and one option
    fireEvent.change(within(modal).getAllByRole('textbox')[0], { target: { value: 'Capital of Italy?' } });
    const optionInputs = within(modal).getAllByPlaceholderText(/Option/);
    fireEvent.change(optionInputs[0], { target: { value: 'Rome' } });
    fireEvent.change(optionInputs[1], { target: { value: 'Paris' } });

    fireEvent.click(within(modal).getByText('Add to bank'));
    await waitFor(() => expect(mockApi.createBankItem).toHaveBeenCalled());
    const body = mockApi.createBankItem.mock.calls[0][0] as Record<string, unknown>;
    expect(body.type).toBe('mcq');
    expect(body.text).toBe('Capital of Italy?');
    expect(body.options).toEqual([
      { text: 'Rome', is_correct: true },
      { text: 'Paris', is_correct: false },
    ]);
  });

  it('deletes a bank item after confirmation', async () => {
    mockApi.deleteBankItem.mockResolvedValue({ ok: true });
    renderBank();
    await screen.findByText('Capital of France?');

    fireEvent.click(screen.getByLabelText('Delete'));
    const heading = await screen.findByText('Delete from bank?');
    const dialogEl = heading.closest('div.fixed') as HTMLElement;
    fireEvent.click(within(dialogEl).getByText('Delete'));

    await new Promise(r => setTimeout(r, 50));
    expect(mockApi.deleteBankItem).toHaveBeenCalledWith('b1');
  });

  it('adds a bank item to a draft quiz', async () => {
    mockApi.listQuizzes.mockResolvedValue({
      quizzes: [{
        id: 'qz1', title: 'Draft one', description: '', subject: '', curriculum: '',
        level: '', topic: '', time_limit_sec: null,
        settings: {
          shuffle_questions: false, shuffle_options: false, show_score: true,
          show_results_immediately: true, show_correct_answers: true, show_explanations: true,
          allow_multiple_attempts: false, require_student_name: true,
        },
        status: 'draft', share_code: null, created_at: 1, updated_at: 1,
      }],
    });
    mockApi.bankAddToQuiz.mockResolvedValue({ question: { id: 'nq' } });
    renderBank();
    await screen.findByText('Capital of France?');

    fireEvent.click(screen.getByLabelText('Add to a quiz'));
    const modal = await screen.findByText('Add to quiz');
    const modalEl = modal.closest('div.fixed') as HTMLElement;
    expect(within(modalEl).getByText('Draft one')).toBeTruthy();

    fireEvent.click(within(modalEl).getByText('Add question'));
    await waitFor(() => expect(mockApi.bankAddToQuiz).toHaveBeenCalledWith('b1', 'qz1'));
  });
});
