import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span aria-hidden>📍</span> Demand Map
        </Link>
        <nav>
          <NavLink to="/" end>
            Map
          </NavLink>
          {user && <NavLink to="/my-requests">My requests</NavLink>}
        </nav>
        <div className="topbar-right">
          {loading ? null : user ? (
            <>
              <span className="muted small user-email">{user.email}</span>
              <button
                className="btn btn-ghost"
                onClick={() => void logout().then(() => navigate('/'))}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
