import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './ManagerProjects.css';
import { toast } from 'sonner';

type Project = {
  id: number;
  name: string;
  description: string | null;
  manager_id: number;
  member_ids: number[];
};

export default function ManagerProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<Project[]>('/projects/')
      .then((response) => setProjects(response.data))
      .catch((err) => {
        toast.error(
          err.response?.data?.detail ?? 'Could not load your projects.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="dashboard-page manager-projects-page">
      <header className="dashboard-topbar">
        <div className="brand">
          <div className="brand-icon">B</div>
          <span>BugTracker</span>
        </div>

        <span className="admin-badge">Project Manager</span>
      </header>

      <section className="dashboard-content">
        <button className="manager-back-button" onClick={() => navigate('/')}>
          ← Back to dashboard
        </button>

        <div className="welcome-card manager-projects-welcome">
          <div className="welcome-text">
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>My Projects</h1>
            <p>Select a project to manage its team and track its issues.</p>
          </div>
          <div className="welcome-avatar">▦</div>
        </div>

        <section className="dashboard-section">
          <h2>Your projects</h2>
          <p className="section-description">
            Projects assigned to you as the manager.
          </p>

          {loading && (
            <p className="manager-projects-message">Loading projects...</p>
          )}

          {!loading && projects.length === 0 && (
            <div className="manager-projects-empty">
              <h3>No projects assigned yet</h3>
              <p>
                When an administrator assigns a project to you, it will appear
                here.
              </p>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="manager-project-grid">
              {projects.map((project) => (
                <article className="manager-project-card" key={project.id}>
                  <div className="manager-project-card-icon">▦</div>

                  <h3>{project.name}</h3>

                  <p className="manager-project-description">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="manager-project-meta">
                    <span>{project.member_ids?.length ?? 0} members</span>
                  </div>

                  <button
                    className="manager-project-open"
                    onClick={() => navigate(`/manager/projects/${project.id}`)}
                  >
                    Open project →
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
