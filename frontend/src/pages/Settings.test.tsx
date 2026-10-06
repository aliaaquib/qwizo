import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Settings } from '@/pages/Settings';

const mockApi = vi.hoisted(() => ({ updateMe: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: mockApi }));

const mocks = vi.hoisted(() => ({
  setUser: vi.fn(),
  // stable identity: the component's useEffect depends on `user`
  user: { id: 'u1', name: 'Aaquib', email: 'a@x.com' },
}));
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, setUser: mocks.setUser, loading: false }),
}));

beforeEach(() => {
  cleanup();
  mockApi.updateMe.mockReset();
  mocks.setUser.mockReset();
});

// React 19 + jsdom: fireEvent.change does not drive controlled inputs, so
// type through the native setter and dispatch a bubbling input event.
function typeText(el: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, text);
  fireEvent.input(el);
}

describe('Settings', () => {
  it('shows the profile with a disabled email field', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Aaquib');
    const email = screen.getByLabelText('Email') as HTMLInputElement;
    expect(email.value).toBe('a@x.com');
    expect(email.disabled).toBe(true);
    expect(screen.getByText('Email cannot be changed.')).toBeTruthy();
  });

  it('saves the new name and updates the auth context', async () => {
    mockApi.updateMe.mockResolvedValue({ user: { id: 'u1', name: 'Aaquib Ali', email: 'a@x.com' } });
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    typeText(screen.getByLabelText('Full name') as HTMLInputElement, 'Aaquib Ali');
    fireEvent.click(screen.getByText('Save changes'));

    await waitFor(() => expect(mockApi.updateMe).toHaveBeenCalledWith('Aaquib Ali'));
    expect(mocks.setUser).toHaveBeenCalledWith({ id: 'u1', name: 'Aaquib Ali', email: 'a@x.com' });
  });

  it('shows the server error without saving', async () => {
    mockApi.updateMe.mockRejectedValue(new Error('Name is required.'));
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Save changes'));
    expect(await screen.findByText('Name is required.')).toBeTruthy();
    expect(mocks.setUser).not.toHaveBeenCalled();
  });
});
