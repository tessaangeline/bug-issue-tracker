
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type Project = {
  id: number;
  name: string;
  description: string | null;
};

export default function MyProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<Project[]>("/projects/")
      .then((response) => setProjects(response.data))
      .catch((err) => {
        setError(
          err.response?.data?.detail ?? "Could not load your projects."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="dashboard-page">
      <section className="dashboard-content">

        <button
          className="back-button"
          onClick={() => navigate("/")}
        >
          ← Back to Dashboard
        </button>
        <h1>My Projects</h1>
        <p>Projects you're a member of.</p>

        {loading && <p>Loading your projects...</p>}
        {error && <p role="alert">{error}</p>}

        {!loading && !error && projects.length === 0 && (
          <p>You haven't been added to any projects yet.</p>
        )}

        <div className="dashboard-actions">
          {projects.map((project) => (
            <button
              key={project.id}
              className="action-card"
              onClick={() => navigate(`/my-projects/${project.id}`)}
            >
              <span className="action-icon">▦</span>
              <span className="action-title">{project.name}</span>
              <span className="action-description">
                {project.description || "No description available."}
              </span>
              <span className="action-link">Open project →</span>
            </button>
          ))}
        </div>

      </section>
    </main>
  );
}
