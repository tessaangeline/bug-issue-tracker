import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

import Projects from './pages/Projects';
import Users from './pages/Users';
import './dashboard.css';
import ManagerProjects from './pages/ManagerProjects';
import ProjectIssues from './pages/ProjectIssues';
import MyIssues from './pages/MyIssues';
import MyProjects from './pages/MyProjects';
import MyProjectWorkspace from './pages/MyProjectWorkspace';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import Login from './pages/Login';
import api from './api/axios';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    api
      .get<User>('/users/me')
      .then((response) => setUser(response.data))
      .catch(() => {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        navigate('/login', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleLogout() {
    api
      .post('/auth/logout')
      .catch((error) => {
        console.error('Logout request failed:', error);
      })
      .finally(() => {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        navigate('/login', { replace: true });
      });
  }

  if (loading) {
    return <p>Checking your session...</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="brand">
          <div className="brand-icon">B</div>
          <span>BugTracker</span>
        </div>

        <div className="dashboard-topbar-actions">
          <span className="admin-badge">
            {user.role === 'super_admin'
              ? 'Administrator'
              : user.role === 'project_manager'
                ? 'Project Manager'
                : 'Project Member'}
          </span>

          <button
            type="button"
            className="dashboard-logout-button"
            onClick={handleLogout}
          >
            Sign out ↗
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="welcome-card">
          <div className="welcome-text">
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>Welcome, {user.name}!</h1>
            <p>
              Manage your BugTracker workspace and keep everything organized.
            </p>
          </div>

          <div className="welcome-avatar">
            {user.name.trim().charAt(0).toUpperCase()}
          </div>
        </div>

        <section className="dashboard-section">
          <h2>Quick actions</h2>
          <p className="section-description">
            Choose what you'd like to do next.
          </p>

          <div className="dashboard-actions">
            {user.role === 'super_admin' && (
              <button
                className="action-card"
                onClick={() => navigate('/users')}
              >
                <span className="action-icon">♙</span>
                <span className="action-title">Manage users</span>
                <span className="action-description">
                  Create accounts and view registered users.
                </span>
                <span className="action-link">Open user management →</span>
              </button>
            )}

            {user.role === 'super_admin' && (
              <button
                className="action-card"
                onClick={() => navigate('/projects')}
              >
                <span className="action-icon">▦</span>
                <span className="action-title">Manage projects</span>
                <span className="action-description">
                  Create projects, assign managers, and organize teams.
                </span>
                <span className="action-link">Open project management →</span>
              </button>
            )}

            {user.role === 'project_manager' && (
              <button
                className="action-card"
                onClick={() => navigate('/manager/projects')}
              >
                <span className="action-icon">▦</span>
                <span className="action-title">My Projects</span>
                <span className="action-description">
                  View the projects you manage, check their issues, and organize
                  your team.
                </span>
                <span className="action-link">Open my projects →</span>
              </button>
            )}

            {user.role === 'project_member' && (
              <>
                <button
                  className="action-card"
                  onClick={() => navigate('/my-projects')}
                >
                  <span className="action-icon">▦</span>
                  <span className="action-title">My Projects</span>
                  <span className="action-description">
                    Explore your projects, team members, and assigned work.
                  </span>
                  <span className="action-link">Open my projects →</span>
                </button>

                <button
                  className="action-card"
                  onClick={() => navigate('/my-issues')}
                >
                  <span className="action-icon">☑</span>
                  <span className="action-title">My Issues</span>
                  <span className="action-description">
                    See all your assigned issues across projects.
                  </span>
                  <span className="action-link">Open my issues →</span>
                </button>
              </>
            )}
          </div>
        </section>

        <footer className="dashboard-footer">
          Signed in as <strong>{user.email}</strong>
        </footer>
      </section>
    </main>
  );
}

function ProtectedUsers() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<User>('/users/me')
      .then((response) => {
        if (response.data.role === 'super_admin') {
          setAllowed(true);
        } else {
          setAllowed(false);
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  if (allowed !== true) {
    return <p>Checking permissions...</p>;
  }

  return <Users />;
}

function ProtectedProjects() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<User>('/users/me')
      .then((response) => {
        if (response.data.role === 'super_admin') {
          setAllowed(true);
        } else {
          setAllowed(false);
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  if (allowed !== true) {
    return <p>Checking permissions...</p>;
  }

  return <Projects />;
}

function ProtectedManagerProjects() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<User>('/users/me')
      .then((response) => {
        if (response.data.role === 'project_manager') {
          setAllowed(true);
        } else {
          setAllowed(false);
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  if (allowed !== true) {
    return <p>Checking permissions...</p>;
  }

  return <ManagerProjects />;
}

function ProtectedProjectIssues() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<User>('/users/me')
      .then((response) => {
        if (response.data.role === 'project_manager') {
          setAllowed(true);
        } else {
          setAllowed(false);
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  if (allowed !== true) {
    return <p>Checking permissions...</p>;
  }

  return <ProjectIssues />;
}

function ProtectedMyIssues() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<User>('/users/me')
      .then((response) => {
        if (response.data.role === 'project_member') {
          setAllowed(true);
        } else {
          setAllowed(false);
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  if (allowed !== true) {
    return <p>Checking permissions...</p>;
  }

  return <MyIssues />;
}

function ProtectedMyProjects() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<User>('/users/me')
      .then((response) => {
        if (response.data.role === 'project_member') {
          setAllowed(true);
        } else {
          setAllowed(false);
          navigate('/', { replace: true });
        }
      })
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  if (allowed !== true) {
    return <p>Checking permissions...</p>;
  }

  return <MyProjects />;
}

function ProtectedMyProjectWorkspace() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<User>('/users/me')
      .then((response) => {
        if (response.data.role === 'project_member') {
          setAllowed(true);
        } else {
          setAllowed(false);
          navigate('/', { replace: true });
        }
      })
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  if (allowed !== true) {
    return <p>Checking permissions...</p>;
  }

  return <MyProjectWorkspace />;
}

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />

      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/users" element={<ProtectedUsers />} />
          <Route path="/projects" element={<ProtectedProjects />} />
          <Route
            path="/manager/projects"
            element={<ProtectedManagerProjects />}
          />
          <Route
            path="/manager/projects/:projectId"
            element={<ProtectedProjectIssues />}
          />
          <Route path="/my-issues" element={<ProtectedMyIssues />} />
          <Route path="/my-projects" element={<ProtectedMyProjects />} />
          <Route
            path="/my-projects/:projectId"
            element={<ProtectedMyProjectWorkspace />}
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
