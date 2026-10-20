import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import './Projects.css';
import { toast } from 'sonner';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  project_id?: number | null;
};

type PaginatedUsersResponse = {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

type Project = {
  id: number;
  name: string;
  description: string | null;
  manager_id: number;
  member_ids: number[];
  open_issue_count: number;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const err = error as {
    message?: string;
    response?: {
      status?: number;
      data?: {
        detail?: unknown;
        message?: unknown;
      };
    };
    request?: unknown;
  };

  const response = err.response;
  const data = response?.data;
  const detail = data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item: unknown) => {
        if (typeof item === 'string') return item;

        if (typeof item === 'object' && item !== null) {
          const validation = item as {
            loc?: unknown;
            msg?: unknown;
          };

          const field = Array.isArray(validation.loc)
            ? validation.loc
                .filter(
                  (part) =>
                    part !== 'body' && part !== 'query' && part !== 'path',
                )
                .join('.')
            : '';

          const message =
            typeof validation.msg === 'string'
              ? validation.msg
              : 'Invalid value';

          return field ? `${field}: ${message}` : message;
        }

        return String(item);
      })
      .join('; ');
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (response?.status && response.status >= 500) {
    return 'Something went wrong on the server. Please try again or check the backend logs.';
  }

  if (response?.status) {
    return `Request failed with status ${response.status}.`;
  }

  if (err.request) {
    return 'Could not connect to the server. Check whether the backend is running.';
  }

  return err.message || fallback;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);

  const managers = useMemo(
    () => users.filter((user) => user.role === 'project_manager'),
    [users],
  );

  const members = useMemo(
    () => users.filter((user) => user.role === 'project_member'),
    [users],
  );

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query);

      // Keep unassigned users and users already assigned
      // to the project currently being edited.
      const available =
        member.project_id == null ||
        projects.some(
          (project) =>
            project.member_ids?.includes(member.id) &&
            member.project_id === project.id &&
            project.id === editingProjectId,
        );

      // Also keep members selected in the current form.
      const alreadySelected = memberIds.includes(member.id);

      return matchesSearch && (available || alreadySelected);
    });
  }, [members, memberSearch, projects, editingProjectId, memberIds]);

  async function loadData() {
    setLoading(true);

    try {
      const [projectsResponse, usersResponse] = await Promise.all([
        api.get<Project[]>('/projects/'),
        api.get<PaginatedUsersResponse>('/users/', {
          params: {
            page: 1,
            page_size: 100,
          },
        }),
      ]);

      setProjects(projectsResponse.data);
      setUsers(usersResponse.data.items);
    } catch (err: unknown) {
      console.error('Load projects/users error:', err);

      toast.error(
        getApiErrorMessage(err, 'Could not load projects and users.'),
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
        : [...current, id],
    );
  }

  function resetForm() {
    setName('');
    setDescription('');
    setManagerId('');
    setMemberIds([]);
    setMemberSearch('');
    setEditingProjectId(null);
    setShowForm(false);
  }

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error('Enter a project name.');
      return;
    }

    if (trimmedName.length > 200) {
      toast.error('Project name cannot exceed 200 characters.');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();

    if (
      projects.some(
        (project) =>
          project.id !== editingProjectId &&
          project.name.trim().toLowerCase() === normalizedName,
      )
    ) {
      toast.error('A project with this name already exists.');
      return;
    }

    if (memberIds.length === 0) {
      toast.error('Select at least one project member.');
      return;
    }

    if (!managerId) {
      toast.error('Select a project manager.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: trimmedName,
        description: description.trim() || null,
        manager_id: Number(managerId),
        member_ids: memberIds,
      };

      if (editingProjectId !== null) {
        await api.patch(`/projects/${editingProjectId}`, payload);
      } else {
        await api.post('/projects/', payload);
      }

      const wasEditing = editingProjectId !== null;

      resetForm();
      await loadData();

      toast.success(
        wasEditing
          ? 'Project updated successfully.'
          : 'Project created successfully.',
      );
    } catch (err: unknown) {
      console.error('Save project error:', err);

      toast.error(
        getApiErrorMessage(
          err,
          editingProjectId !== null
            ? 'Could not update the project.'
            : 'Could not create the project.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEditProject(project: Project) {
    setEditingProjectId(project.id);
    setName(project.name);
    setDescription(project.description ?? '');
    setManagerId(String(project.manager_id));
    setMemberIds(project.member_ids ?? []);
    setMemberSearch('');
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDeleteProject(project: Project) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/projects/${project.id}`);

      setProjects((current) =>
        current.filter((item) => item.id !== project.id),
      );

      if (editingProjectId === project.id) {
        resetForm();
      }

      toast.success(`"${project.name}" deleted successfully.`);
    } catch (err: unknown) {
      console.error('Delete project error:', err);

      toast.error(
        getApiErrorMessage(err, `Could not delete "${project.name}".`),
      );
    }
  }

  function getUserName(id: number) {
    return users.find((user) => user.id === id)?.name ?? 'Unknown user';
  }

  if (loading) {
    return (
      <main className="projects-page">
        <p>Loading projects...</p>
      </main>
    );
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
          type="button"
          className="projects-primary-button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? 'Cancel' : '+ Create project'}
        </button>
      </header>

      {showForm && (
        <section className="projects-panel">
          <div className="projects-panel-heading">
            <div>
              <h2>
                {editingProjectId !== null
                  ? 'Edit project'
                  : 'Create a project'}
              </h2>
              <p>
                {editingProjectId !== null
                  ? 'Update project details and manage your team.'
                  : 'Add project details and choose your team.'}
              </p>
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
              <label htmlFor="member-search">Project members *</label>
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
                {memberIds.length} member
                {memberIds.length === 1 ? '' : 's'} selected
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
                {saving
                  ? editingProjectId !== null
                    ? 'Saving...'
                    : 'Creating...'
                  : editingProjectId !== null
                    ? 'Save changes'
                    : 'Create project'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="projects-list-section">
        <div className="projects-list-heading">
          <div>
            <h2>All projects</h2>
            <p>
              {projects.length} project
              {projects.length === 1 ? '' : 's'}
            </p>
          </div>

          <button
            type="button"
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
              type="button"
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
                <div className="project-card-header">
                  <h3>{project.name}</h3>

                  <div className="project-card-actions">
                    <button
                      type="button"
                      className="projects-secondary-button"
                      onClick={() => handleEditProject(project)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="projects-delete-button"
                      onClick={() => void handleDeleteProject(project)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="project-description">
                  {project.description || 'No description added.'}
                </p>

                <div className="project-info-row">
                  <div className="project-manager-row">
                    <span className="project-avatar">
                      {getUserName(project.manager_id).charAt(0).toUpperCase()}
                    </span>

                    <div>
                      <small>Project manager</small>
                      <strong>{getUserName(project.manager_id)}</strong>
                    </div>
                  </div>

                  <div className="project-open-issues">
                    <strong>{project.open_issue_count ?? 0}</strong>
                    <span>Open issues</span>
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

                  <small>{project.member_ids?.length ?? 0} members</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
