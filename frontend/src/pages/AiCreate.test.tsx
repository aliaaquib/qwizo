import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AiCreate } from '@/pages/AiCreate';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

const mockApi = vi.hoisted(() => ({ aiGenerate: vi.fn(), aiGenerateUpload: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: mockApi }));

beforeEach(() => {
  cleanup();
  mockNavigate.mockReset();
  Object.values(mockApi).forEach(fn => fn.mockReset());
});

function renderAi(mode: 'prompt' | 'upload') {
  return render(
    <MemoryRouter>
      <AiCreate mode={mode} />
    </MemoryRouter>,
  );
}

describe('AiCreate', () => {
  it('validates: needs a type and a prompt or topic', async () => {
    renderAi('prompt');

    // deselect all types
    fireEvent.click(screen.getByText('Multiple choice'));
    fireEvent.click(screen.getByText('Short answer'));
    fireEvent.click(screen.getByText('Generate quiz'));
    expect(await screen.findByText('Pick at least one question type.')).toBeTruthy();
    expect(mockApi.aiGenerate).not.toHaveBeenCalled();

    // reselect one type, still no prompt/topic
    fireEvent.click(screen.getByText('Multiple choice'));
    fireEvent.click(screen.getByText('Generate quiz'));
    expect(await screen.findByText('Describe the quiz or enter a topic.')).toBeTruthy();
  });

  it('generates from a prompt and navigates to the editor', async () => {
    mockApi.aiGenerate.mockResolvedValue({
      quiz: { id: 'quiz-ai' },
      questions: [{ id: 'q1' }, { id: 'q2' }],
    });
    renderAi('prompt');

    fireEvent.change(screen.getByPlaceholderText(/Year 8 Cambridge/), {
      target: { value: 'Quiz on fractions' },
    });
    fireEvent.change(screen.getByLabelText('Number of questions'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('hard')); // difficulty segment
    fireEvent.click(screen.getByText('Generate quiz'));

    await waitFor(() => expect(mockApi.aiGenerate).toHaveBeenCalled());
    const body = mockApi.aiGenerate.mock.calls[0][0] as Record<string, unknown>;
    expect(body.prompt).toBe('Quiz on fractions');
    expect(body.count).toBe(5);
    expect(body.difficulty).toBe('hard');
    expect(body.types).toEqual(['mcq', 'short']);
    expect(mockNavigate).toHaveBeenCalledWith('/app/quizzes/quiz-ai');
  });

  it('requires a file in upload mode', async () => {
    renderAi('upload');
    expect(screen.getByText('Create from material')).toBeTruthy();
    fireEvent.click(screen.getByText('Generate from material'));
    expect(await screen.findByText('Choose a .txt or .docx file first.')).toBeTruthy();
    expect(mockApi.aiGenerateUpload).not.toHaveBeenCalled();
  });

  it('uploads material as FormData and navigates to the editor', async () => {
    mockApi.aiGenerateUpload.mockResolvedValue({
      quiz: { id: 'quiz-up' },
      questions: [{ id: 'q1' }],
    });
    renderAi('upload');

    const file = new File(['chapter one text'], 'chapter1.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByPlaceholderText(/two-step equations/), {
      target: { value: 'Focus on chapter one' },
    });
    fireEvent.click(screen.getByText('Generate from material'));

    await waitFor(() => expect(mockApi.aiGenerateUpload).toHaveBeenCalled());
    const fd = mockApi.aiGenerateUpload.mock.calls[0][0] as FormData;
    expect(fd.get('file')).toBe(file);
    expect(fd.get('prompt')).toBe('Focus on chapter one');
    expect(fd.get('types')).toBe('mcq,short');
    expect(mockNavigate).toHaveBeenCalledWith('/app/quizzes/quiz-up');
  });
});
