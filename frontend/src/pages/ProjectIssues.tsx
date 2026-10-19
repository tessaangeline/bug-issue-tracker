
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import "./ProjectIssues.css";

const ISSUES_PER_PAGE = 10;

type Issue = {
  id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "in_review" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  priority: "low" | "medium" | "high";
  project_id: number;
  assignee_id: number | null;
  created_at: string;
  estimated_duration_days: number | null;
  due_date: string | null;
  completed_at: string | null;
  actual_duration_days: number | null;
};

type ProjectMember = {
  id: number;
  name: string;
  email: string;
};

type ProjectUser = {
  id: number;
  name: string;
  email: string;
};

type ProjectDetails = {
  id: number;
  name: string;
  description: string | null;
  manager: ProjectUser | null;
  members: ProjectUser[];
};

export default function ProjectIssues() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSeverity, setEditSeverity] = useState("medium");
  const [editPriority, setEditPriority] = useState("medium");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [priority, setPriority] = useState("medium");
  const [estimatedDurationDays, setEstimatedDurationDays] =
    useState("1");

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [membersError, setMembersError] = useState("");

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [projectDetailsLoading, setProjectDetailsLoading] =
    useState(true);
  const [projectDetailsError, setProjectDetailsError] = useState("");

  const fetchIssues = async () => {
    if (!projectId) return;

    const response = await api.get<Issue[]>(
      `/projects/${projectId}/issues`
    );

    setIssues(response.data);
  };

  // Fetch issues whenever the project changes.
  useEffect(() => {
    setLoading(true);
    setError("");

    fetchIssues()
      .catch((err) => {
        setError(
          err.response?.data?.detail ??
            "Could not load project issues."
        );
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  // Fetch the members who can be assigned to an issue.
  useEffect(() => {
    if (!projectId) return;

    api
      .get<ProjectMember[]>(`/projects/${projectId}/members`)
      .then((response) => {
        setMembers(response.data);
        setMembersError("");
      })
      .catch((err) => {
        setMembersError(
          err.response?.data?.detail ??
            "Could not load project members."
        );
      });
  }, [projectId]);

  // Fetch project overview and manager information.
  useEffect(() => {
    if (!projectId) {
      setProjectDetailsLoading(false);
      return;
    }

    setProjectDetailsLoading(true);
    setProjectDetailsError("");

    api
      .get<ProjectDetails>(`/projects/${projectId}/details`)
      .then((response) => {
        setProject(response.data);
      })
      .catch((err) => {
        setProjectDetailsError(
          err.response?.data?.detail ??
            "Could not load project details."
        );
      })
      .finally(() => {
        setProjectDetailsLoading(false);
      });
  }, [projectId]);

  // Filter issues before applying pagination.
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || issue.status === statusFilter;

    const matchesSeverity =
      severityFilter === "all" || issue.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Calculate the number of pages from the filtered results.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredIssues.length / ISSUES_PER_PAGE)
  );

  // Display only the issues belonging to the current page.
  const paginatedIssues = filteredIssues.slice(
    (currentPage - 1) * ISSUES_PER_PAGE,
    currentPage * ISSUES_PER_PAGE
  );

  // Reset pagination when the search, filters, or project changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, severityFilter, projectId]);

  // Keep the current page valid if issues are removed or filtered out.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCreateIssue = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!projectId || creating) return;

    const duration = Number(estimatedDurationDays);

    if (!Number.isInteger(duration) || duration < 1) {
      setCreateError(
        "Estimated duration must be a whole number of at least 1 day."
      );
      return;
    }

    if (!title.trim() || !description.trim()) {
      setCreateError("Please enter both a title and description.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      await api.post(`/projects/${projectId}/issues`, {
        title: title.trim(),
        description: description.trim(),
        severity,
        priority,
        assignee_id: assigneeId === "" ? null : Number(assigneeId),
        estimated_duration_days: duration,
      });

      // Return to page 1 so the refreshed list starts at the beginning.
      setCurrentPage(1);
      await fetchIssues();

      setTitle("");
      setDescription("");
      setSeverity("medium");
      setPriority("medium");
      setEstimatedDurationDays("1");
      setAssigneeId("");
      setShowCreateForm(false);
    } catch (err: any) {
      setCreateError(
        err.response?.data?.detail ?? "Could not create the issue."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (issue: Issue) => {
    setEditingIssue(issue);
    setEditTitle(issue.title);
    setEditDescription(issue.description);
    setEditSeverity(issue.severity);
    setEditPriority(issue.priority);
    setEditAssigneeId(
      issue.assignee_id === null ? "" : String(issue.assignee_id)
    );
    setEditDuration(
      issue.estimated_duration_days === null
        ? ""
        : String(issue.estimated_duration_days)
    );
    setEditError("");
  };

  const formatLabel = (value: string) =>
    value.replaceAll("_", " ").replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString();
  };

  return (
    <main className="dashboard-page project-issues-page">
      <header className="dashboard-topbar">
        <div className="brand">
          <div className="brand-icon">B</div>
          <span>BugTracker</span>
        </div>
        <span className="admin-badge">Project Manager</span>
      </header>

      <section className="dashboard-content">
        <button
          className="issues-back-button"
          onClick={() => navigate("/manager/projects")}
        >
          ← Back to My Projects
        </button>

        <div className="welcome-card issues-welcome">
          <div className="welcome-text">
            <span className="eyebrow">PROJECT WORKSPACE</span>
            <h1>Project Issues</h1>
            <p>Track, filter, and manage issues for this project.</p>
            <p className="issues-project-id">Project ID: {projectId}</p>
          </div>
          <div className="welcome-avatar">⚑</div>
        </div>

        <section className="project-details-card">
          {projectDetailsLoading ? (
            <p>Loading project details...</p>
          ) : projectDetailsError ? (
            <p className="issues-error" role="alert">
              {projectDetailsError}
            </p>
          ) : project ? (
            <>
              <div className="project-details-heading">
                <div>
                  <span className="eyebrow">PROJECT OVERVIEW</span>
                  <h2>{project.name}</h2>
                  <p>
                    {project.description || "No description provided."}
                  </p>
                </div>

                <span className="project-id-badge">
                  Project #{project.id}
                </span>
              </div>

              <div className="project-details-grid">
                <div className="project-info-block">
                  <h3>Project Manager</h3>

                  {project.manager ? (
                    <>
                      <strong>{project.manager.name}</strong>
                      <p>{project.manager.email}</p>
                    </>
                  ) : (
                    <p>Manager details unavailable.</p>
                  )}
                </div>

                <div className="project-info-block">
                  <div className="project-members-heading">
                    <h3>Team Members</h3>
                    <span>{project.members.length}</span>
                  </div>

                  {project.members.length > 0 ? (
                    <div className="project-members-list">
                      {project.members.map((member) => (
                        <div className="project-member" key={member.id}>
                          <span className="project-member-avatar">
                            {member.name.trim().charAt(0).toUpperCase()}
                          </span>

                          <div>
                            <strong>{member.name}</strong>
                            <p>{member.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No team members assigned yet.</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section className="dashboard-section">
          <div className="issues-heading">
            <div>
              <h2>Issues</h2>
              <p className="section-description">
                {issues.length} total · {filteredIssues.length} matching
              </p>
            </div>

            <button
              className="issues-create-button"
              onClick={() => {
                setCreateError("");
                setShowCreateForm(true);
              }}
            >
              + Create Issue
            </button>
          </div>

          <div className="issues-filters">
            <input
              aria-label="Search issues"
              placeholder="Search by title or description..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="closed">Closed</option>
            </select>

            <select
              aria-label="Filter by severity"
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
            >
              <option value="all">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {showCreateForm && (
            <form className="create-issue-form" onSubmit={handleCreateIssue}>
              <h3>Create a new issue</h3>

              <label htmlFor="issue-title">Title *</label>
              <input
                id="issue-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Login button not working"
                required
                maxLength={200}
              />

              <label htmlFor="issue-description">Description *</label>
              <textarea
                id="issue-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue..."
                required
                rows={4}
              />

              <label htmlFor="issue-estimated-duration">
                Estimated duration (days) *
              </label>
              <input
                id="issue-estimated-duration"
                type="number"
                min="1"
                step="1"
                value={estimatedDurationDays}
                onChange={(event) =>
                  setEstimatedDurationDays(event.target.value)
                }
                required
              />
              <p className="field-hint">
                Calendar days, including weekends. The due date is calculated
                automatically.
              </p>

              <label htmlFor="issue-assignee">Assign to</label>
              <select
                id="issue-assignee"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                disabled={membersError !== ""}
              >
                <option value="">Unassigned</option>

                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>

              {membersError && (
                <p className="issues-error" role="alert">
                  {membersError}
                </p>
              )}

              <div className="create-issue-fields">
                <div>
                  <label htmlFor="issue-severity">Severity *</label>
                  <select
                    id="issue-severity"
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="issue-priority">Priority *</label>
                  <select
                    id="issue-priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {createError && (
                <p className="issues-error" role="alert">
                  {createError}
                </p>
              )}

              <div className="create-issue-actions">
                <button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Issue"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError("");
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}



            {editingIssue && (
              <form
                className="create-issue-form"
                onSubmit={async (event) => {
                  event.preventDefault();

                  if (savingEdit) return;

                  const duration = Number(editDuration);

                  if (
                    editDuration.trim() !== "" &&
                    (!Number.isInteger(duration) || duration < 1)
                  ) {
                    setEditError("Estimated duration must be a whole number of at least 1 day.");
                    return;
                  }

                  if (!editTitle.trim() || !editDescription.trim()) {
                    setEditError("Please enter both a title and description.");
                    return;
                  }

                  setSavingEdit(true);
                  setEditError("");

                  try {
                    await api.patch(`/issues/${editingIssue.id}`, {
                      title: editTitle.trim(),
                      description: editDescription.trim(),
                      severity: editSeverity,
                      priority: editPriority,
                      assignee_id:
                        editAssigneeId === "" ? null : Number(editAssigneeId),
                      estimated_duration_days:
                        editDuration.trim() === "" ? null : duration,
                    });

                    await fetchIssues();
                    setEditingIssue(null);
                  } catch (err: any) {
                    setEditError(
                      err.response?.data?.detail ?? "Could not update the issue."
                    );
                  } finally {
                    setSavingEdit(false);
                  }
                }}
              >
                <h3>Edit issue</h3>

                <label htmlFor="edit-issue-title">Title *</label>
                <input
                  id="edit-issue-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  required
                  maxLength={200}
                />

                <label htmlFor="edit-issue-description">Description *</label>
                <textarea
                  id="edit-issue-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  required
                  rows={4}
                />

                <label htmlFor="edit-issue-duration">Estimated duration (days)</label>
                <input
                  id="edit-issue-duration"
                  type="number"
                  min="1"
                  step="1"
                  value={editDuration}
                  onChange={(event) => setEditDuration(event.target.value)}
                  placeholder="Leave blank for no estimate"
                />

                <label htmlFor="edit-issue-assignee">Assign to</label>
                <select
                  id="edit-issue-assignee"
                  value={editAssigneeId}
                  onChange={(event) => setEditAssigneeId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>

                <div className="create-issue-fields">
                  <div>
                    <label htmlFor="edit-issue-severity">Severity *</label>
                    <select
                      id="edit-issue-severity"
                      value={editSeverity}
                      onChange={(event) => setEditSeverity(event.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="edit-issue-priority">Priority *</label>
                    <select
                      id="edit-issue-priority"
                      value={editPriority}
                      onChange={(event) => setEditPriority(event.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {editError && (
                  <p className="issues-error" role="alert">{editError}</p>
                )}

                <div className="create-issue-actions">
                  <button type="submit" disabled={savingEdit}>
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => {
                      setEditingIssue(null);
                      setEditError("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          {loading && (
            <p className="issues-message">Loading issues...</p>
          )}

          {!loading && error && (
            <p className="issues-error" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && filteredIssues.length === 0 && (
            <div className="issues-empty">
              <h3>
                {issues.length === 0
                  ? "No issues yet"
                  : "No matching issues"}
              </h3>
              <p>
                {issues.length === 0
                  ? "This project doesn't have any issues yet."
                  : "Try changing your search or filters."}
              </p>
            </div>
          )}

          {!loading && !error && filteredIssues.length > 0 && (
            <>
              <div className="issues-table-wrapper">
                <table className="issues-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Status</th>
                      <th>Severity</th>
                      <th>Priority</th>
                      <th>Assignee</th>
                      <th>Created</th>
                      <th>Estimated</th>
                      <th>Due Date</th>
                      <th>Actual Duration</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedIssues.map((issue) => (
                      <tr key={issue.id}>
                        <td>
                          <strong>
                            {issue.title}
                          </strong>
                          <p className="issues-description">
                            {issue.description}
                          </p>
                        </td>

                        <td>
                          <span
                            className={`issue-badge status-${issue.status}`}
                          >
                            {formatLabel(issue.status)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`issue-badge severity-${issue.severity}`}
                          >
                            {formatLabel(issue.severity)}
                          </span>
                        </td>

                        <td>{formatLabel(issue.priority)}</td>

                        <td>
                          {issue.assignee_id === null
                            ? "Unassigned"
                            : members.find((member) => member.id === issue.assignee_id)?.name ??
                              "Unknown member"}
                        </td>

                        <td>{formatDate(issue.created_at)}</td>

                        <td>
                          {issue.estimated_duration_days != null
                            ? `${issue.estimated_duration_days} day(s)`
                            : "Not set"}
                        </td>

                        <td>{formatDate(issue.due_date)}</td>

                          <td>
                            {issue.status === "closed" &&
                            issue.actual_duration_days != null
                              ? `${issue.actual_duration_days} day(s)`
                              : "Pending"}
                          </td>

                          <td className="issue-actions">
                            <button
                              type="button"
                              className="issue-action-btn edit-btn"
                              title="Edit issue"
                              aria-label={`Edit ${issue.title}`}
                              onClick={() => handleEditClick(issue)}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="issue-action-btn delete-btn"
                              title="Delete issue"
                              aria-label={`Delete ${issue.title}`}
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  `Are you sure you want to delete "${issue.title}"?`
                                );

                                if (!confirmed) return;

                                try {
                                  await api.delete(`/issues/${issue.id}`);
                                  await fetchIssues();
                                } catch (err: any) {
                                  setError(
                                    err.response?.data?.detail ?? "Could not delete the issue."
                                  );
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                          </tr>


                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="issues-pagination">
                <span>
                  Showing{" "}
                  {(currentPage - 1) * ISSUES_PER_PAGE + 1}
                  {"–"}
                  {Math.min(
                    currentPage * ISSUES_PER_PAGE,
                    filteredIssues.length
                  )}{" "}
                  of {filteredIssues.length} issues
                </span>

                <div className="issues-pagination-controls">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    Previous
                  </button>

                  <span>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
