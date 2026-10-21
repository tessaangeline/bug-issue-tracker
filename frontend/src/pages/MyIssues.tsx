import { useEffect, useState } from 'react';
import api from '../api/axios';
import './MyIssues.css';
import { toast } from 'sonner';

type Status = 'open' | 'in_progress' | 'in_review' | 'closed';
type Severity = 'low' | 'medium' | 'high' | 'critical';

type Issue = {
  id: number;
  title: string;
  description: string;
  status: Status;
  severity: Severity;
  project_id: number;
  assignee_id: number | null;
  created_at: string | null;
  estimated_duration_days: number | null;
  due_date: string | null;
  completed_at: string | null;
  actual_duration_days: number | null;
};

type PaginatedIssuesResponse = {
  items: Issue[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

type Project = {
  id: number;
  name: string;
};

const ISSUES_PER_PAGE = 10;

const STATUSES: Status[] = ['open', 'in_progress', 'in_review', 'closed'];

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];

const formatLabel = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString();
};

export default function MyIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalIssues, setTotalIssues] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    let cancelled = false;

    api
      .get<Project[]>('/projects/')
      .then((response) => {
        if (!cancelled) {
          setProjects(response.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err.response?.data?.detail ?? 'Could not load project names.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, projectFilter, statusFilter, severityFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadIssues() {
      setLoading(true);

      try {
        const response = await api.get<PaginatedIssuesResponse>(
          '/issues/my-issues',
          {
            params: {
              search: search.trim() || undefined,
              project_id:
                projectFilter === 'all' ? undefined : Number(projectFilter),
              status: statusFilter === 'all' ? undefined : statusFilter,
              severity: severityFilter === 'all' ? undefined : severityFilter,
              page: currentPage,
              page_size: ISSUES_PER_PAGE,
            },
          },
        );

        if (cancelled) return;

        setIssues(response.data.items);
        setTotalIssues(response.data.total);
        setTotalPages(response.data.total_pages);
      } catch (err: any) {
        if (cancelled) return;

        toast.error(
          err.response?.data?.detail ?? 'Could not load your issues.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadIssues();

    return () => {
      cancelled = true;
    };
  }, [search, projectFilter, statusFilter, severityFilter, currentPage]);

  async function handleStatusChange(issue: Issue, newStatus: Status) {
    if (issue.status === newStatus) return;

    setUpdatingId(issue.id);

    try {
      await api.patch<Issue>(`/issues/${issue.id}/status`, {
        status: newStatus,
      });

      // Reload the current page so server-side filters and counts
      // remain accurate after a status change.
      const response = await api.get<PaginatedIssuesResponse>(
        '/issues/my-issues',
        {
          params: {
            search: search.trim() || undefined,
            project_id:
              projectFilter === 'all' ? undefined : Number(projectFilter),
            status: statusFilter === 'all' ? undefined : statusFilter,
            severity: severityFilter === 'all' ? undefined : severityFilter,
            page: currentPage,
            page_size: ISSUES_PER_PAGE,
          },
        },
      );

      setIssues(response.data.items);
      setTotalIssues(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail ?? 'Could not update issue status.',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading && issues.length === 0) {
    return <p>Loading your issues...</p>;
  }

  const firstIssue =
    totalIssues === 0 ? 0 : (currentPage - 1) * ISSUES_PER_PAGE + 1;

  const lastIssue = Math.min(currentPage * ISSUES_PER_PAGE, totalIssues);

  return (
    <main className="dashboard-page">
      <section className="dashboard-content">
        <h1>My Issues</h1>
        <p>Issues assigned to you.</p>

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

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
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
        </div>

        <p>
          {totalIssues} matching issue(s)
          {loading ? ' · Updating...' : ''}
        </p>

        {totalIssues === 0 ? (
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
                    <th>Created</th>
                    <th>Estimated</th>
                    <th>Due Date</th>
                    <th>Actual Duration</th>
                  </tr>
                </thead>

                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <strong>{issue.title}</strong>
                        <p>{issue.description}</p>
                      </td>

                      <td>
                        {projects.find(
                          (project) => project.id === issue.project_id,
                        )?.name ?? `Project #${issue.project_id}`}
                      </td>

                      <td>
                        <select
                          value={issue.status}
                          disabled={updatingId === issue.id}
                          onChange={(event) =>
                            handleStatusChange(
                              issue,
                              event.target.value as Status,
                            )
                          }
                          aria-label={`Update status for ${issue.title}`}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatLabel(status)}
                            </option>
                          ))}
                        </select>

                        {updatingId === issue.id && <small> Saving...</small>}
                      </td>

                      <td>{formatLabel(issue.severity)}</td>

                      <td>{formatDate(issue.created_at)}</td>

                      <td>
                        {issue.estimated_duration_days != null
                          ? `${issue.estimated_duration_days} day(s)`
                          : 'Not set'}
                      </td>

                      <td>
                        {issue.estimated_duration_days != null &&
                        issue.created_at
                          ? new Date(
                              new Date(issue.created_at).getTime() +
                                issue.estimated_duration_days *
                                  24 *
                                  60 *
                                  60 *
                                  1000,
                            ).toLocaleDateString('en-GB')
                          : '—'}
                      </td>

                      <td>
                        {issue.status === 'closed' &&
                        issue.completed_at &&
                        issue.created_at
                          ? `${
                              Math.round(
                                Math.max(
                                  0,
                                  (new Date(issue.completed_at).getTime() -
                                    new Date(issue.created_at).getTime()) /
                                    (1000 * 60 * 60 * 24),
                                ) * 100,
                              ) / 100
                            } day(s)`
                          : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="issues-pagination">
              <span>
                Showing {firstIssue}–{lastIssue} of {totalIssues} issues
              </span>

              <div className="issues-pagination-controls">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage((page) => page - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {Math.max(1, totalPages)}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage((page) => page + 1)}
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
