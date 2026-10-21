import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'sonner';
import './MyIssues.css';

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

const STATUSES: Status[] = ['open', 'in_progress', 'in_review', 'closed'];
const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
const ISSUES_PER_PAGE = 10;

const formatLabel = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.detail ?? fallback;

export default function MyProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const id = Number(projectId);
  const validId = Number.isInteger(id) && id > 0;

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!validId) {
      toast.error('Invalid project ID.');
      setLoadingProject(false);
      return;
    }

    let cancelled = false;
    api
      .get<ProjectDetails>(`/projects/${id}/details`)
      .then((response) => {
        if (!cancelled) setProject(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            getErrorMessage(
              error,
              'Could not load this project. Please try again.',
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProject(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, validId]);

  useEffect(() => {
    if (!validId) {
      setLoadingIssues(false);
      return;
    }

    let cancelled = false;
    const loadIssues = async () => {
      setLoadingIssues(true);
      try {
        const response = await api.get<PaginatedIssuesResponse>(
          '/issues/my-issues',
          {
            params: {
              project_id: id,
              search: search.trim() || undefined,
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
        setTotalPages(Math.max(1, response.data.total_pages));
      } catch (error: any) {
        if (!cancelled) {
          toast.error(
            getErrorMessage(error, 'Could not load issues. Please try again.'),
          );
        }
      } finally {
        if (!cancelled) setLoadingIssues(false);
      }
    };

    void loadIssues();
    return () => {
      cancelled = true;
    };
  }, [id, validId, search, statusFilter, severityFilter, currentPage]);

  const handleStatusChange = async (issue: Issue, status: Status) => {
    if (issue.status === status || updatingId !== null) return;
    setUpdatingId(issue.id);

    try {
      // The API response contains the saved status, due date, and duration fields.
      const response = await api.patch<Issue>(`/issues/${issue.id}/status`, {
        status,
      });
      const updatedIssue = response.data;

      setIssues((current) => {
        const updated = current.map((item) =>
          item.id === issue.id ? { ...item, ...updatedIssue } : item,
        );
        // Keep the current list consistent when a status filter is active.
        return statusFilter !== 'all' && statusFilter !== status
          ? updated.filter((item) => item.id !== issue.id)
          : updated;
      });

      if (statusFilter !== 'all' && statusFilter !== status) {
        setTotalIssues((count) => Math.max(0, count - 1));
      }
      toast.success('Issue status updated.');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Could not update issue status.'));
    } finally {
      setUpdatingId(null);
    }
  };

  if (loadingProject) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-content">
          <p>Loading project...</p>
        </section>
      </main>
    );
  }

  if (!project) return null;

  const startItem =
    totalIssues === 0 ? 0 : (currentPage - 1) * ISSUES_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ISSUES_PER_PAGE, totalIssues);

  return (
    <main className="dashboard-page">
      <section className="dashboard-content">
        <button
          className="back-button"
          type="button"
          onClick={() => navigate('/my-projects')}
        >
          ← Back to My Projects
        </button>

        <div className="welcome-card">
          <div className="welcome-text">
            <span className="eyebrow">MY PROJECT WORKSPACE</span>
            <h1>{project.name}</h1>
            <p>{project.description || 'No project description provided.'}</p>
          </div>
          <div className="welcome-avatar" aria-hidden="true">
            ▦
          </div>
        </div>

        <section className="dashboard-section">
          <h2>Project Details</h2>

          <div className="project-details-grid">
            <div className="project-info-block manager-info-block">
              <h3>Project Manager</h3>

              {project.manager ? (
                <div className="manager-profile">
                  <span className="manager-avatar">
                    {project.manager.name.trim().charAt(0).toUpperCase()}
                  </span>

                  <div className="manager-profile-details">
                    <strong>{project.manager.name}</strong>
                    <p>{project.manager.email}</p>
                    <span className="manager-role">Project Manager</span>
                  </div>
                </div>
              ) : (
                <p>No manager assigned</p>
              )}
            </div>

            <div className="project-info-block team-members-info-block">
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

                      <div className="project-member-details">
                        <strong>{member.name}</strong>
                        <p>{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-project-members">
                  No team members assigned yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>My Issues</h2>
          <p className="section-description">
            Issues assigned to you in {project.name}.
          </p>

          <div className="issue-filters">
            <input
              type="search"
              placeholder="Search title or description..."
              aria-label="Search project issues"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
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
              onChange={(event) => {
                setSeverityFilter(event.target.value);
                setCurrentPage(1);
              }}
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

          <p className="section-description">
            {totalIssues} matching issue(s)
            {loadingIssues ? ' · Updating...' : ''}
          </p>

          {loadingIssues ? (
            <p>Loading issues...</p>
          ) : totalIssues === 0 ? (
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
                          <select
                            value={issue.status}
                            disabled={updatingId === issue.id}
                            aria-label={`Update status for ${issue.title}`}
                            onChange={(event) =>
                              handleStatusChange(
                                issue,
                                event.target.value as Status,
                              )
                            }
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
                  Showing {startItem}–{endItem} of {totalIssues} issues
                </span>
                <div className="issues-pagination-controls">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || loadingIssues}
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
                    disabled={currentPage >= totalPages || loadingIssues}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
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
