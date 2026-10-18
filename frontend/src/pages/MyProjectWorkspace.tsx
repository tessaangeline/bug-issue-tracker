
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "./MyIssues.css";

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

type Status = "open" | "in_progress" | "in_review" | "closed";
type Severity = "low" | "medium" | "high" | "critical";
type Priority = "low" | "medium" | "high";

type Issue = {
  id: number;
  title: string;
  description: string;
  status: Status;
  severity: Severity;
  priority: Priority;
  project_id: number;
  assignee_id: number | null;
  created_at: string | null;
  estimated_duration_days: number | null;
  due_date: string | null;
  completed_at: string | null;
  actual_duration_days: number | null;
};

const STATUSES: Status[] = [
  "open",
  "in_progress",
  "in_review",
  "closed",
];

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];

const ISSUES_PER_PAGE = 10;

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

export default function MyProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const id = Number(projectId);
  const validId = Number.isInteger(id) && id > 0;

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!validId) {
      setError("Invalid project ID.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError("");

    Promise.all([
      api.get<ProjectDetails>(`/projects/${id}/details`),
      api.get<Issue[]>("/issues/my-issues"),
    ])
      .then(([projectResponse, issuesResponse]) => {
        if (cancelled) return;

        setProject(projectResponse.data);

        setIssues(
          issuesResponse.data.filter((issue) => issue.project_id === id)
        );
      })
      .catch((err) => {
        if (cancelled) return;

        setError(
          err.response?.data?.detail ??
            "Could not load this project. Please try again."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, validId]);

  // Apply search and filters before pagination
  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesSearch =
        !query ||
        issue.title.toLowerCase().includes(query) ||
        (issue.description ?? "").toLowerCase().includes(query);

      return (
        matchesSearch &&
        (statusFilter === "all" || issue.status === statusFilter) &&
        (severityFilter === "all" || issue.severity === severityFilter) &&
        (priorityFilter === "all" || issue.priority === priorityFilter)
      );
    });
  }, [issues, search, statusFilter, severityFilter, priorityFilter]);

  // Calculate the number of pages
  const totalPages = Math.max(
    1,
    Math.ceil(filteredIssues.length / ISSUES_PER_PAGE)
  );

  // Get only the issues for the current page
  const paginatedIssues = useMemo(() => {
    const startIndex = (currentPage - 1) * ISSUES_PER_PAGE;

    return filteredIssues.slice(
      startIndex,
      startIndex + ISSUES_PER_PAGE
    );
  }, [filteredIssues, currentPage]);

  // Reset to page 1 when the project or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, severityFilter, priorityFilter, id]);

  // Keep the current page valid if the result count decreases
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  async function handleStatusChange(issue: Issue, status: Status) {
    if (issue.status === status) return;

    setUpdatingId(issue.id);
    setUpdateError("");

    try {
      const response = await api.patch<Issue>(
        `/issues/${issue.id}/status`,
        { status }
      );

      setIssues((current) =>
        current.map((item) =>
          item.id === issue.id ? response.data : item
        )
      );
    } catch (err: any) {
      setUpdateError(
        err.response?.data?.detail ?? "Could not update issue status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-content">
          <p>Loading project...</p>
        </section>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-content">
          <p role="alert">{error || "Project not found."}</p>

          <button onClick={() => navigate("/my-projects")}>
            Back to My Projects
          </button>
        </section>
      </main>
    );
  }

  const startItem =
    filteredIssues.length === 0
      ? 0
      : (currentPage - 1) * ISSUES_PER_PAGE + 1;

  const endItem = Math.min(
    currentPage * ISSUES_PER_PAGE,
    filteredIssues.length
  );

  return (
    <main className="dashboard-page">
      <section className="dashboard-content">
        <button
          className="back-button"
          onClick={() => navigate("/my-projects")}
        >
          ← Back to My Projects
        </button>

        <div className="welcome-card">
          <div className="welcome-text">
            <span className="eyebrow">MY PROJECT WORKSPACE</span>
            <h1>{project.name}</h1>
            <p>
              {project.description || "No project description provided."}
            </p>
          </div>

          <div className="welcome-avatar">#{project.id}</div>
        </div>

        <section className="dashboard-section">
          <h2>Project Details</h2>

          <div className="project-details-grid">
            <div className="project-info-block">
              <strong>Project Manager</strong>

              {project.manager ? (
                <>
                  <p>{project.manager.name}</p>
                  <p>{project.manager.email}</p>
                </>
              ) : (
                <p>No manager assigned</p>
              )}
            </div>

            <div className="project-info-block">
              <strong>Team Members ({project.members.length})</strong>

              {project.members.length === 0 ? (
                <p>No members listed.</p>
              ) : (
                <ul>
                  {project.members.map((member) => (
                    <li key={member.id}>
                      {member.name} — {member.email}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>My Issues in This Project</h2>

          <p className="section-description">
            Issues assigned to you in {project.name}.
          </p>

          {updateError && (
            <p role="alert" className="issue-update-error">
              {updateError}
            </p>
          )}

          <div className="issue-filters">
            <input
              type="search"
              placeholder="Search title or description..."
              aria-label="Search project issues"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>

              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              aria-label="Filter by severity"
            >
              <option value="all">All severities</option>

              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {formatLabel(severity)}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter by priority"
            >
              <option value="all">All priorities</option>

              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {formatLabel(priority)}
                </option>
              ))}
            </select>
          </div>

          <p>
            {filteredIssues.length} issues shown · {issues.length} assigned to
            you in this project
          </p>

          {filteredIssues.length === 0 ? (
            <p>No assigned issues match your filters in this project.</p>
          ) : (
            <>
              <div className="issues-table-wrapper">
                <table className="issues-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Status</th>
                      <th>Severity</th>
                      <th>Priority</th>
                      <th>Created</th>
                      <th>Estimated</th>
                      <th>Due Date</th>
                      <th>Actual Duration</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedIssues.map((issue) => (
                      <tr key={issue.id}>
                        <td>
                          <strong>
                            #{issue.id} {issue.title}
                          </strong>
                          <p>{issue.description}</p>
                        </td>

                        <td>
                          <select
                            value={issue.status}
                            disabled={updatingId === issue.id}
                            aria-label={`Update status for issue ${issue.id}`}
                            onChange={(event) =>
                              handleStatusChange(
                                issue,
                                event.target.value as Status
                              )
                            }
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {formatLabel(status)}
                              </option>
                            ))}
                          </select>

                          {updatingId === issue.id && (
                            <small> Saving...</small>
                          )}
                        </td>

                        <td>{formatLabel(issue.severity)}</td>
                        <td>{formatLabel(issue.priority)}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="issues-pagination">
                <span>
                  Showing {startItem}–{endItem} of {filteredIssues.length}{" "}
                  issues
                </span>

                <div className="issues-pagination-controls">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  <span>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                    disabled={currentPage === totalPages}
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
