
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

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
};

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
    () => [...new Set(issues.map((issue) => issue.project_id))].sort(
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
  if (error) return <p role="alert">{error}</p>;

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
          <div className="issues-table-wrapper">
            <table className="issues-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Priority</th>
                </tr>
              </thead>

              <tbody>
                {filteredIssues.map((issue) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
