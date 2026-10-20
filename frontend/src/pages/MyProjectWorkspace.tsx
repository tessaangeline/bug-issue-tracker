import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import './MyIssues.css';
import { toast } from 'sonner';

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

export default function MyProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const id = Number(projectId);
  const validId = Number.isInteger(id) && id > 0;

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [availableMembers, setAvailableMembers] = useState<ProjectUser[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [updatingMembers, setUpdatingMembers] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [totalIssues, setTotalIssues] = useState(0);

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination when search or filters change.

  useEffect(() => {
    if (!validId) {
      toast.error('Invalid project ID.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProject = async () => {
      try {
        const response = await api.get<ProjectDetails>(
          `/projects/${id}/details`,
        );

        if (cancelled) return;

        setProject(response.data);

        try {
          const membersResponse = await api.get<ProjectUser[]>(
            `/projects/${id}/available-members`,
          );

          if (!cancelled) {
            setAvailableMembers(membersResponse.data);
            setCanManageMembers(true);
          }
        } catch (error) {
          console.error('Could not load available members:', error);

          if (!cancelled) {
            setAvailableMembers([]);
            setCanManageMembers(false);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(
            error.response?.data?.detail ??
              'Could not load this project. Please try again.',
          );
        }
      }
    };

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [id, validId]);

  const updateProjectMembers = async (memberIds: number[]) => {
    if (!project) return;

    setUpdatingMembers(true);

    try {
      await api.put(`/projects/${id}/members`, {
        member_ids: memberIds,
      });

      const response = await api.get<ProjectDetails>(`/projects/${id}/details`);

      setProject(response.data);
      setSelectedMemberId('');
      const membersResponse = await api.get<ProjectUser[]>(
        `/projects/${id}/available-members`,
      );
      setAvailableMembers(membersResponse.data);

      toast.success('Project members updated!');
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail ?? "Couldn't update project members.",
      );
    } finally {
      setUpdatingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!project || !selectedMemberId) {
      toast.error('Please select a member first.');
      return;
    }

    const memberId = Number(selectedMemberId);

    if (project.members.some((member) => member.id === memberId)) {
      toast.error('This member is already in the project.');
      return;
    }

    await updateProjectMembers([
      ...project.members.map((member) => member.id),
      memberId,
    ]);
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!project) return;

    const confirmed = window.confirm(
      'Are you sure you want to remove this member from the project?',
    );

    if (!confirmed) return;

    await updateProjectMembers(
      project.members
        .filter((member) => member.id !== memberId)
        .map((member) => member.id),
    );
  };

  // Search, filters, and pagination are handled by the backend.
  useEffect(() => {
    if (!validId) return;

    let cancelled = false;

    async function loadIssues() {
      setLoading(true);

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
        setTotalPages(response.data.total_pages);
      } catch (err: any) {
        if (cancelled) return;

        toast.error(
          err.response?.data?.detail ??
            'Could not load issues. Please try again.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadIssues();

    return () => {
      cancelled = true;
    };
  }, [id, validId, search, statusFilter, severityFilter, currentPage]);

  async function handleStatusChange(issue: Issue, status: Status) {
    if (issue.status === status) return;

    setUpdatingId(issue.id);
    try {
      await api.patch<Issue>(`/issues/${issue.id}/status`, { status });

      // Reload from the backend so results and counts stay accurate.
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

      setIssues(response.data.items);
      setTotalIssues(response.data.total);
      setTotalPages(response.data.total_pages);

      // If the updated issue no longer matches the filter,
      // the backend removes it from the current results.
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail ?? 'Could not update issue status.',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading && !project) {
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

          <div className="welcome-avatar">▦</div>
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
              <p>Debug: canManageMembers = {String(canManageMembers)}</p>
              {project.members.length === 0 ? (
                <p>No members listed.</p>
              ) : (
                <ul>
                  {project.members.map((member) => (
                    <li key={member.id}>
                      {member.name} — {member.email}
                      {canManageMembers && (
                        <button
                          type="button"
                          disabled={updatingMembers}
                          onClick={() => handleRemoveMember(member.id)}
                          style={{ marginLeft: '12px' }}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canManageMembers && (
                <div style={{ marginTop: '16px' }}>
                  <label htmlFor="add-project-member">Add a team member</label>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <select
                      id="add-project-member"
                      value={selectedMemberId}
                      onChange={(event) =>
                        setSelectedMemberId(event.target.value)
                      }
                      disabled={updatingMembers}
                    >
                      <option value="">Select a member</option>

                      {availableMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} — {member.email}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddMember}
                      disabled={updatingMembers || !selectedMemberId}
                    >
                      {updatingMembers ? 'Saving...' : 'Add Member'}
                    </button>
                  </div>

                  {availableMembers.length === 0 && (
                    <p>No additional members are available to add.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>My Issues in This Project</h2>

          <p className="section-description">
            Issues assigned to you in {project.name}.
          </p>

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
          </div>

          <p>
            {totalIssues} matching issue(s)
            {loading ? ' · Updating...' : ''}
          </p>

          {loading ? (
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

                        <td>{formatDate(issue.due_date)}</td>

                        <td>
                          {issue.status === 'closed' &&
                          issue.actual_duration_days != null
                            ? `${issue.actual_duration_days} day(s)`
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
                    disabled={currentPage <= 1 || loading}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    Previous
                  </button>

                  <span>
                    Page {currentPage} of {Math.max(1, totalPages)}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages || loading}
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
