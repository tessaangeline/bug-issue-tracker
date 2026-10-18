
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "./MyIssues.css";


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

const ISSUES_PER_PAGE = 10;

const STATUSES: Status[] = [
  "open",
  "in_progress",
  "in_review",
  "closed",
];

const SEVERITIES: Severity[] = [
  "low",
  "medium",
  "high",
  "critical",
];

const PRIORITIES: Priority[] = ["low", "medium", "high"];

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

export default function MyIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState("");

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    api
      .get<Issue[]>("/issues/my-issues")
      .then((response) => setIssues(response.data))
      .catch((err) => {
        setError(
          err.response?.data?.detail ?? "Could not load your issues."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const projects = useMemo(
    () =>
      [...new Set(issues.map((issue) => issue.project_id))].sort(
        (a, b) => a - b
      ),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesSearch =
        !query ||
        issue.title.toLowerCase().includes(query) ||
        (issue.description ?? "").toLowerCase().includes(query);

      return (
        matchesSearch &&
        (projectFilter === "all" ||
          issue.project_id === Number(projectFilter)) &&
        (statusFilter === "all" || issue.status === statusFilter) &&
        (severityFilter === "all" ||
          issue.severity === severityFilter) &&
        (priorityFilter === "all" ||
          issue.priority === priorityFilter)
      );
    });
  }, [
    issues,
    search,
    projectFilter,
    statusFilter,
    severityFilter,
    priorityFilter,
  ]);

  // Calculate the total number of pages after filtering.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredIssues.length / ISSUES_PER_PAGE)
  );

  // Get only the issues for the current page.
  const paginatedIssues = useMemo(
    () =>
      filteredIssues.slice(
        (currentPage - 1) * ISSUES_PER_PAGE,
        currentPage * ISSUES_PER_PAGE
      ),
    [filteredIssues, currentPage]
  );

  // Return to page 1 whenever the search or filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    projectFilter,
    statusFilter,
    severityFilter,
    priorityFilter,
  ]);

  // Keep the current page valid if the number of results decreases.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleStatusChange(
    issue: Issue,
    newStatus: Status
  ) {
    if (issue.status === newStatus) return;

    setUpdatingId(issue.id);
    setUpdateError("");

    try {
      const response = await api.patch<Issue>(
        `/issues/${issue.id}/status`,
        { status: newStatus }
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

  if (loading) return <p>Loading your issues...</p>;

  if (error) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-content">
          <h1>My Issues</h1>
          <p role="alert">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-content">
        <h1>My Issues</h1>
        <p>Issues assigned to you.</p>

        {updateError && (
          <p role="alert" className="issue-update-error">
            {updateError}
          </p>
        )}

        <div className="issue-filters">
          <input
            type="search"
            placeholder="Search by title or description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search issues"
          />

          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            aria-label="Filter by project"
          >
            <option value="all">All Projects</option>
            {projects.map((projectId) => (
              <option key={projectId} value={projectId}>
                Project #{projectId}
              </option>
            ))}
          </select>

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
          {filteredIssues.length} shown · {issues.length} total
        </p>

        {filteredIssues.length === 0 ? (
          <p>No issues match your filters.</p>
        ) : (
          <>
            <div className="issues-table-wrapper">
              <table className="issues-table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Project</th>
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

                      <td>Project #{issue.project_id}</td>

                      <td>
                        <select
                          value={issue.status}
                          disabled={updatingId === issue.id}
                          onChange={(event) =>
                            handleStatusChange(
                              issue,
                              event.target.value as Status
                            )
                          }
                          aria-label={`Update status for issue ${issue.id}`}
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
    </main>
  );
}
