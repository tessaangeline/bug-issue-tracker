
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "./ProjectIssues.css";

type Issue = {
  id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "in_review" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  priority: "low" | "medium" | "high";
  project_id: number;
  assignee_id: number | null;
};

type ProjectMember = {
  id: number;
  name: string;
  email: string;
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
  const [showCreateForm, setShowCreateForm] = useState(false);
const [creating, setCreating] = useState(false);
const [createError, setCreateError] = useState("");

const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
const [severity, setSeverity] = useState("medium");
const [priority, setPriority] = useState("medium");

const [members, setMembers] = useState<ProjectMember[]>([]);
const [assigneeId, setAssigneeId] = useState("");
const [membersError, setMembersError] = useState("");

const fetchIssues = async () => {
  if (!projectId) return;

  const response = await api.get<Issue[]>(
    `/projects/${projectId}/issues`
  );

  setIssues(response.data);
};

 useEffect(() => {
  setLoading(true);
  setError("");

  fetchIssues()
    .catch((err) => {
      setError(
        err.response?.data?.detail ?? "Could not load project issues."
      );
    })
    .finally(() => setLoading(false));
}, [projectId]);

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
        err.response?.data?.detail ?? "Could not load project members."
      );
    });
}, [projectId]);

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

  const handleCreateIssue = async (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  if (!projectId || creating) return;

  setCreating(true);
  setCreateError("");

  try {
    await api.post(`/projects/${projectId}/issues`, {
      title: title.trim(),
      description: description.trim(),
      severity,
      priority,
      assignee_id: assigneeId === "" ? null : Number(assigneeId),
    });

    await fetchIssues();

    setTitle("");
    setDescription("");
    setSeverity("medium");
    setPriority("medium");
    setShowCreateForm(false);
    setAssigneeId("");

  } catch (err: any) {
    setCreateError(
      err.response?.data?.detail ?? "Could not create the issue."
    );
  } finally {
    setCreating(false);
  }
};

  const formatLabel = (value: string) =>
    value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

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

        <section className="dashboard-section">
          <div className="issues-heading">
            <div>
              <h2>Issues</h2>
              <p className="section-description">
                {issues.length} total · {filteredIssues.length} shown
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
  <form
    className="create-issue-form"
    onSubmit={handleCreateIssue}
  >
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
      <p className="issues-error" role="alert">{createError}</p>
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
        
        
          {loading && <p className="issues-message">Loading issues...</p>}

          {!loading && error && (
            <p className="issues-error" role="alert">{error}</p>
          )}

          {!loading && !error && filteredIssues.length === 0 && (
            <div className="issues-empty">
              <h3>{issues.length === 0 ? "No issues yet" : "No matching issues"}</h3>
              <p>
                {issues.length === 0
                  ? "This project doesn't have any issues yet."
                  : "Try changing your search or filters."}
              </p>
            </div>
          )}

          {!loading && !error && filteredIssues.length > 0 && (
            <div className="issues-table-wrapper">
              <table className="issues-table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Status</th>
                    <th>Severity</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <strong>#{issue.id} {issue.title}</strong>
                        <p className="issues-description">
                          {issue.description}
                        </p>
                      </td>
                      <td>
                        <span className={`issue-badge status-${issue.status}`}>
                          {formatLabel(issue.status)}
                        </span>
                      </td>
                      <td>
                        <span className={`issue-badge severity-${issue.severity}`}>
                          {formatLabel(issue.severity)}
                        </span>
                      </td>
                      <td>{formatLabel(issue.priority)}</td>
                      <td>
                        {issue.assignee_id === null
                          ? "Unassigned"
                          : `User #${issue.assignee_id}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
