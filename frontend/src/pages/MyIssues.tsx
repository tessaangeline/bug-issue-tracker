
import { useEffect, useState } from "react";
import api from "../api/axios";

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

export default function MyIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Issue[]>("/issues/my-issues")
      .then((response) => setIssues(response.data))
      .catch((err) => {
        setError(
          err.response?.data?.detail ??
            "Could not load your issues."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const formatLabel = (value: string) =>
    value.replaceAll("_", " ").replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );

  if (loading) return <p>Loading your issues...</p>;

  if (error) return <p role="alert">{error}</p>;

  return (
    <main className="dashboard-page">
      <section className="dashboard-content">
        <h1>My Issues</h1>
        <p>Issues assigned to you.</p>

        {issues.length === 0 ? (
          <p>You don't have any assigned issues yet.</p>
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
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <strong>
                        #{issue.id} {issue.title}
                      </strong>
                      <p>{issue.description}</p>
                    </td>
                    <td>Project #{issue.project_id}</td>
                    <td>{formatLabel(issue.status)}</td>
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
