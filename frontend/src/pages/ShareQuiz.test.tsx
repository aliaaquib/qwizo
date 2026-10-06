import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShareQuiz } from '@/pages/ShareQuiz';
import type { Quiz } from '@/types';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useParams: () => ({ id: 'quiz-1' }), useNavigate: () => mockNavigate };
});

const mockApi = vi.hoisted(() => ({ getQuiz: vi.fn(), unpublishQuiz: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: mockApi }));

const baseQuiz: Quiz = {
  id: 'quiz-1', title: 'Share me', description: '', subject: '', curriculum: '',
  level: '', topic: '', time_limit_sec: null,
  settings: {
    shuffle_questions: false, shuffle_options: false, show_score: true,
    show_results_immediately: true, show_correct_answers: true, show_explanations: true,
    allow_multiple_attempts: false, require_student_name: true,
  },
  status: 'draft', share_code: null, created_at: 1, updated_at: 1,
};

beforeEach(() => {
  cleanup();
  mockNavigate.mockReset();
  mockApi.getQuiz.mockReset();
  mockApi.unpublishQuiz.mockReset();
});

function renderShare() {
  return render(
    <MemoryRouter>
      <ShareQuiz />
    </MemoryRouter>,
  );
}

describe('ShareQuiz', () => {
  it('shows "Publish first" for a draft quiz', async () => {
    mockApi.getQuiz.mockResolvedValue({ quiz: baseQuiz, questions: [] });
    renderShare();
    expect(await screen.findByText('Publish first')).toBeTruthy();
    expect(screen.queryByText('Quiz code')).toBeNull();
  });

  it('shows code, link and QR for a published quiz', async () => {
    mockApi.getQuiz.mockResolvedValue({
      quiz: { ...baseQuiz, status: 'published', share_code: 'AB-1234' },
      questions: [],
    });
    renderShare();

    expect(await screen.findByText('AB-1234')).toBeTruthy();
    const linkInput = (await screen.findByLabelText('Share link')) as HTMLInputElement;
    expect(linkInput.value).toBe(`${window.location.origin}/q/AB-1234`);
    // QR code renders as SVG
    expect(document.querySelector('svg')).toBeTruthy();
  });

  it('unpublishes after confirmation and returns to the editor', async () => {
    mockApi.getQuiz.mockResolvedValue({
      quiz: { ...baseQuiz, status: 'published', share_code: 'AB-1234' },
      questions: [],
    });
    mockApi.unpublishQuiz.mockResolvedValue({ quiz: { ...baseQuiz, status: 'draft' } });
    renderShare();
    await screen.findByText('AB-1234');

    fireEvent.click(screen.getByText('Unpublish quiz'));
    const heading = await screen.findByText('Unpublish quiz?');
    const dialogEl = heading.closest('div.fixed') as HTMLElement;
    fireEvent.click(within(dialogEl).getByText('Unpublish'));

    await new Promise(r => setTimeout(r, 50));
    expect(mockApi.unpublishQuiz).toHaveBeenCalledWith('quiz-1');
  });
});
