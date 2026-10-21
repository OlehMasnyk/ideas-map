import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../api';
import { AuthProvider } from '../auth/AuthContext';
import { AuthPage } from './AuthPage';

const apiMock = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return { ...actual, api: apiMock };
});

function renderAt(path: string) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/my-requests" element={<p>My requests page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  apiMock.me.mockResolvedValue(null);
});

describe('AuthPage', () => {
  it('validates input before calling the API', async () => {
    renderAt('/login');
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid email');
    expect(apiMock.login).not.toHaveBeenCalled();
  });

  it('signs in and redirects to the next page', async () => {
    apiMock.login.mockResolvedValue({ id: '1', email: 'a@b.co' });
    renderAt('/login?next=/my-requests');
    await userEvent.type(screen.getByLabelText('Email'), 'A@B.co');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(apiMock.login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'password123' });
    expect(await screen.findByText('My requests page')).toBeInTheDocument();
  });

  it('shows API errors on register', async () => {
    apiMock.register.mockRejectedValue(new ApiRequestError(409, 'Email already exists'));
    renderAt('/register');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already exists');
  });

  it.each(['https://evil.example', '//evil.example'])(
    'ignores external redirect %s',
    async (next) => {
      apiMock.login.mockResolvedValue({ id: '1', email: 'a@b.co' });
      renderAt(`/login?next=${encodeURIComponent(next)}`);
      await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(await screen.findByText('Home page')).toBeInTheDocument();
    },
  );
});
