
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "./Projects.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  project_id?: number | null;
};

type Project = {
  id: number;
  name: string;
  description: string | null;
  manager_id: number;
  member_ids: number[];
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [managerId, setManagerId] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const managers = useMemo(
    () => users.filter((user) => user.role === "project_manager"),
    [users]
  );

  const members = useMemo(
    () => users.filter((user) => user.role === "project_member"),
    [users]
  );

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query);

      // With the current schema, a user can belong to one project.
      // Keep unassigned users and users already assigned to this project.
      const available =
        member.project_id == null ||
        projects.some(
          (project) =>
            project.member_ids?.includes(member.id) &&
            member.project_id === project.id
        );

      return matchesSearch && available;
    });
  }, [members, memberSearch, projects]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [projectsResponse, usersResponse] = await Promise.all([
        api.get<Project[]>("/projects/"),
        api.get<User[]>("/users/"),
      ]);

      setProjects(projectsResponse.data);
      setUsers(usersResponse.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Could not load projects or users. Check your login and backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function toggleMember(id: number) {
    setMemberIds((current) =>
      current.includes(id)
        ? current.filter((memberId) => memberId !== id)
        : [...current, id]
    );
  }

  function resetForm() {
    setName("");
    setDescription("");
    setManagerId("");
    setMemberIds([]);
    setMemberSearch("");
    setShowForm(false);
  }

  async function handleCreateProject(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Enter a project name.");
      return;
    }

    if (!managerId) {
      setError("Select a project manager.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/projects/", {
        name: name.trim(),
        description: description.trim() || null,
        manager_id: Number(managerId),
        member_ids: memberIds,
      });

      resetForm();
      setSuccess("Project created successfully.");
      await loadData();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Could not create the project. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function getUserName(id: number) {
    return users.find((user) => user.id === id)?.name ?? `User #${id}`;
  }

  if (loading) {
    return <main className="projects-page"><p>Loading projects...</p></main>;
  }

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div>
          <p className="projects-eyebrow">WORKSPACE</p>
          <h1>Projects</h1>
          <p className="projects-subtitle">
            Organize projects, assign managers, and build your teams.
          </p>
        </div>

        <button
          className="projects-primary-button"
          onClick={() => {
            setError("");
            setSuccess("");
            setShowForm((current) => !current);
          }}
        >
          {showForm ? "Cancel" : "+ Create project"}
        </button>
      </header>

      {error && <div className="projects-alert error">{error}</div>}
      {success && <div className="projects-alert success">{success}</div>}

      {showForm && (
        <section className="projects-panel">
          <div className="projects-panel-heading">
            <div>
              <h2>Create a project</h2>
              <p>Add project details and choose your team.</p>
            </div>
          </div>

          <form onSubmit={handleCreateProject} className="projects-form">
            <div className="projects-field">
              <label htmlFor="project-name">Project name *</label>
              <input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. BugTracker"
                maxLength={200}
                required
              />
            </div>

            <div className="projects-field">
              <label htmlFor="project-description">Description</label>
              <textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>

            <div className="projects-field">
              <label htmlFor="project-manager">Project manager *</label>
              <select
                id="project-manager"
                value={managerId}
                onChange={(event) => setManagerId(event.target.value)}
                required
              >
                <option value="">Select a manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({manager.email})
                  </option>
                ))}
              </select>

              {managers.length === 0 && (
                <small>
                  No project managers found. Create a user with the
                  project_manager role first.
                </small>
              )}
            </div>

            <div className="projects-field">
              <label htmlFor="member-search">Project members</label>
              <input
                id="member-search"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search members by name or email..."
              />

              <div className="member-picker">
                {filteredMembers.length === 0 ? (
                  <p className="member-picker-empty">
                    No available members found.
                  </p>
                ) : (
                  filteredMembers.map((member) => (
                    <label className="member-option" key={member.id}>
                      <input
                        type="checkbox"
                        checked={memberIds.includes(member.id)}
                        onChange={() => toggleMember(member.id)}
                      />
                      <span className="member-avatar">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="member-details">
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </span>
                    </label>
                  ))
                )}
              </div>

              <small>
                {memberIds.length} member{memberIds.length === 1 ? "" : "s"}{" "}
                selected
              </small>
            </div>

            <div className="projects-form-actions">
              <button
                type="button"
                className="projects-secondary-button"
                onClick={resetForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="projects-primary-button"
                disabled={saving || managers.length === 0}
              >
                {saving ? "Creating..." : "Create project"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="projects-list-section">
        <div className="projects-list-heading">
          <div>
            <h2>All projects</h2>
            <p>{projects.length} project{projects.length === 1 ? "" : "s"}</p>
          </div>
          <button
            className="projects-secondary-button"
            onClick={() => void loadData()}
          >
            Refresh
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="projects-empty">
            <div className="projects-empty-icon">▦</div>
            <h3>No projects yet</h3>
            <p>Create your first project to get your team started.</p>
            <button
              className="projects-primary-button"
              onClick={() => setShowForm(true)}
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
            

                <h3>{project.name}</h3>
                <p className="project-description">
                  {project.description || "No description added."}
                </p>

                <div className="project-manager-row">
                  <span className="project-avatar">
                    {getUserName(project.manager_id).charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <small>Project manager</small>
                    <strong>{getUserName(project.manager_id)}</strong>
                  </div>
                </div>

                
<div className="project-card-footer">
  <div className="project-member-list">
    <strong>Project members</strong>

    {(project.member_ids ?? []).length === 0 ? (
      <p>No members assigned yet.</p>
    ) : (
      <ul>
        {project.member_ids.map((id) => (
          <li key={id}>{getUserName(id)}</li>
        ))}
      </ul>
    )}
  </div>

  <small>
    {project.member_ids?.length ?? 0} members
  </small>
</div>

              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
