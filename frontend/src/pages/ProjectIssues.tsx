import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'sonner';
import './ProjectIssues.css';

const ISSUES_PER_PAGE = 10;

type Issue = {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'in_review' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  project_id: number;
  assignee_id: number | null;
  created_at: string;
  estimated_duration_days: number | null;
  due_date: string | null;
  completed_at: string | null;
  actual_duration_days: number | null;
};

type PaginatedIssues = {
  items: Issue[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
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

/**
 * Extract a useful message from FastAPI/Axios errors.
 * FastAPI validation errors often return detail as an array of objects.
 */
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
    const messages = detail.map((item: unknown) => {
      if (typeof item === 'string') return item;

      if (typeof item === 'object' && item !== null) {
        const validationItem = item as {
          msg?: unknown;
          loc?: unknown;
        };
        const message =
          typeof validationItem.msg === 'string'
            ? validationItem.msg
            : 'Invalid value';
        const location = Array.isArray(validationItem.loc)
          ? validationItem.loc
              .filter(
                (part) =>
                  part !== 'body' && part !== 'query' && part !== 'path',
              )
              .join(' → ')
          : '';

        return location ? `${location}: ${message}` : message;
      }

      return String(item);
    });

    return messages.join('; ');
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (response?.status) {
    if (response.status >= 500) {
      return `The server encountered an error (${response.status}) while processing the request. Check the backend terminal for the exact cause.`;
    }
    return `Request failed (${response.status})${err.message ? `: ${err.message}` : '.'}`;
  }

  if (err.request) {
    return 'Could not reach the server. Check that the backend is running and try again.';
  }

  return err.message || fallback;
}

export default function ProjectIssues() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSeverity, setEditSeverity] = useState('medium');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [estimatedDurationDays, setEstimatedDurationDays] = useState('1');

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [assigneeId, setAssigneeId] = useState('');

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [projectDetailsLoading, setProjectDetailsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [availableMembers, setAvailableMembers] = useState<ProjectUser[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [updatingMembers, setUpdatingMembers] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);

  const fetchIssues = async (
    page = currentPage,
    searchTerm = search,
    selectedStatus = statusFilter,
    selectedSeverity = severityFilter,
  ) => {
    if (!projectId) return;

    const params: Record<string, string | number> = {
      page,
      page_size: ISSUES_PER_PAGE,
    };

    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (selectedSeverity !== 'all') params.severity = selectedSeverity;
    if (assigneeFilter !== 'all') {
      params.assignee_id = Number(assigneeFilter);
    }
    const response = await api.get<PaginatedIssues>(
      `/projects/${projectId}/issues`,
      { params },
    );

    const pages = Math.max(1, response.data.total_pages);
    setIssues(response.data.items);
    setTotalIssues(response.data.total);
    setTotalPages(pages);

    // If a deletion makes the current page invalid, move to the last page.
    if (page > pages) {
      setCurrentPage(pages);
    }
  };

  // Fetch filtered issues from the backend whenever the query or page changes.
  useEffect(() => {
    let cancelled = false;

    const loadIssues = async () => {
      setLoading(true);

      try {
        if (!projectId) {
          setIssues([]);
          setTotalIssues(0);
          setTotalPages(1);
          return;
        }

        const params: Record<string, string | number> = {
          page: currentPage,
          page_size: ISSUES_PER_PAGE,
        };

        if (search.trim()) params.search = search.trim();
        if (statusFilter !== 'all') params.status = statusFilter;
        if (severityFilter !== 'all') params.severity = severityFilter;
        if (assigneeFilter !== 'all') {
          params.assignee_id = Number(assigneeFilter);
        }

        const response = await api.get<PaginatedIssues>(
          `/projects/${projectId}/issues`,
          { params },
        );

        if (cancelled) return;

        const pages = Math.max(1, response.data.total_pages);
        setIssues(response.data.items);
        setTotalIssues(response.data.total);
        setTotalPages(pages);

        if (currentPage > pages) setCurrentPage(pages);
      } catch (err: any) {
        if (!cancelled) {
          const status = err?.response?.status;

          if (status === 403 || status === 404) {
            return;
          }

          console.error('Load project issues failed:', err);
          toast.error(
            getApiErrorMessage(err, 'Could not load project issues.'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadIssues();
    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    currentPage,
    search,
    statusFilter,
    severityFilter,
    assigneeFilter,
  ]);

  // Fetch the members who can be assigned to an issue.
  useEffect(() => {
    if (!projectId) return;

    api
      .get<ProjectMember[]>(`/projects/${projectId}/members`)
      .then((response) => {
        setMembers(response.data);
      })

      .catch((err) => {
        const status = err?.response?.status;

        if (status === 403 || status === 404) {
          return;
        }

        toast.error(getApiErrorMessage(err, 'Could not load project members.'));
      });
  }, [projectId]);

  // Fetch project overview and manager information.

  useEffect(() => {
    let cancelled = false;

    if (!projectId) {
      setProjectDetailsLoading(false);
      setAccessDenied(true);
      navigate('/manager/projects', { replace: true });
      return;
    }

    setProjectDetailsLoading(true);
    setAccessDenied(false);

    api
      .get<ProjectDetails>(`/projects/${projectId}/details`)
      .then((response) => {
        if (cancelled) return;
        setProject(response.data);
      })
      .catch((err) => {
        if (cancelled) return;

        const status = err?.response?.status;

        if (status === 403 || status === 404) {
          setAccessDenied(true);
          setProject(null);

          navigate('/manager/projects', { replace: true });
          return;
        }

        toast.error(getApiErrorMessage(err, 'Could not load project details.'));
      })
      .finally(() => {
        if (!cancelled) setProjectDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, navigate]);

  useEffect(() => {
    void loadAvailableMembers();
  }, [projectId]);

  const loadAvailableMembers = async () => {
    if (!projectId) return;

    try {
      const response = await api.get<ProjectUser[]>(
        `/projects/${projectId}/available-members`,
      );

      setAvailableMembers(response.data);
      setCanManageMembers(true);
    } catch (error) {
      console.error('Could not load available members:', error);
      setCanManageMembers(false);
      setAvailableMembers([]);
    }
  };

  const updateProjectMembers = async (memberIds: number[]) => {
    if (!projectId) return;

    setUpdatingMembers(true);

    try {
      await api.put(`/projects/${projectId}/members`, {
        member_ids: memberIds,
      });

      const response = await api.get<ProjectDetails>(
        `/projects/${projectId}/details`,
      );

      setProject(response.data);

      const membersResponse = await api.get<ProjectMember[]>(
        `/projects/${projectId}/members`,
      );
      setMembers(membersResponse.data);

      setSelectedMemberId('');
      await loadAvailableMembers();

      toast.success('Project members updated!');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Couldn't update project members."),
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
    if (!project || updatingMembers) return;

    const member = project.members.find((item) => item.id === memberId);

    if (!member) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${member.name} from this project?`,
    );

    if (!confirmed) return;

    if (!projectId) return;

    setUpdatingMembers(true);

    try {
      const updatedMemberIds = project.members
        .filter((item) => item.id !== memberId)
        .map((item) => item.id);

      await api.put(`/projects/${projectId}/members`, {
        member_ids: updatedMemberIds,
      });

      const [projectResponse, membersResponse] = await Promise.all([
        api.get<ProjectDetails>(`/projects/${projectId}/details`),
        api.get<ProjectMember[]>(`/projects/${projectId}/members`),
      ]);

      setProject(projectResponse.data);
      setMembers(membersResponse.data);
      setSelectedMemberId('');

      const availableResponse = await api.get<ProjectUser[]>(
        `/projects/${projectId}/available-members`,
      );
      setAvailableMembers(availableResponse.data);

      toast.success(`${member.name} was removed from the project.`);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Could not remove this member.',
      );

      if (message.toLowerCase().includes('unclosed issues')) {
        window.alert(
          `${member.name} cannot be removed because they still have open issues. Please reassign or close those issues first.`,
        );
      } else if (message.toLowerCase().includes('cannot be removed')) {
        window.alert(message);
      } else if (
        message.toLowerCase().includes('member_ids') &&
        message.toLowerCase().includes('at least 1')
      ) {
        toast.error(
          'A project must have at least one team member. Add another member before removing this one.',
        );
      } else {
        toast.error(message);
      }
    } finally {
      setUpdatingMembers(false);
    }
  };

  const handleCreateIssue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId || creating) return;

    const duration = Number(estimatedDurationDays);

    if (!Number.isFinite(duration) || duration <= 0) {
      setCreateError('Estimated duration must be a positive number of days.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setCreateError('Please enter both a title and description.');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      await api.post(`/projects/${projectId}/issues`, {
        title: title.trim(),
        description: description.trim(),
        severity,
        assignee_id: assigneeId === '' ? null : Number(assigneeId),
        estimated_duration_days: duration,
      });

      // Return to page 1 so the refreshed list starts at the beginning.
      setSearch('');
      setStatusFilter('all');
      setSeverityFilter('all');
      setAssigneeFilter('all');
      setCurrentPage(1);
      await fetchIssues(1, '', 'all', 'all');

      setTitle('');
      setDescription('');
      setSeverity('medium');
      setEstimatedDurationDays('1');
      setAssigneeId('');
      setShowCreateForm(false);
      toast.success('Issue created successfully!');
    } catch (err: any) {
      console.error('Create issue failed:', err);
      toast.error(getApiErrorMessage(err, 'Could not create the issue.'));
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (
    issue: Issue,
    newStatus: Issue['status'],
  ) => {
    if (issue.status === newStatus) return;

    try {
      const response = await api.patch<Issue>(`/issues/${issue.id}/status`, {
        status: newStatus,
      });

      setIssues((currentIssues) =>
        currentIssues.map((item) =>
          item.id === issue.id ? { ...item, ...response.data } : item,
        ),
      );

      toast.success('Issue status updated!');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update issue status.'));
    }
  };

  const handleEditClick = (issue: Issue) => {
    setEditingIssue(issue);
    setEditTitle(issue.title);
    setEditDescription(issue.description);
    setEditSeverity(issue.severity);
    setEditAssigneeId(
      issue.assignee_id === null ? '' : String(issue.assignee_id),
    );
    setEditDuration(
      issue.estimated_duration_days === null
        ? ''
        : String(issue.estimated_duration_days),
    );
    setEditError('');
  };

  const formatLabel = (value: string) =>
    value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString();
  };

  if (accessDenied) {
    return null;
  }

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
          onClick={() => navigate('/manager/projects')}
        >
          ← Back to My Projects
        </button>

        <div className="welcome-card issues-welcome">
          <div className="welcome-text">
            <span className="eyebrow">PROJECT WORKSPACE</span>
            <h1>Project Issues</h1>
            <p>Track, filter, and manage issues for this project.</p>
          </div>
          <div className="welcome-avatar">⚑</div>
        </div>

        <section className="project-details-card">
          {projectDetailsLoading ? (
            <p>Loading project details...</p>
          ) : project ? (
            <>
              <div className="project-details-heading">
                <div>
                  <span className="eyebrow">PROJECT OVERVIEW</span>
                  <h2>{project.name}</h2>
                  <p>{project.description || 'No description provided.'}</p>
                </div>
              </div>

              <div className="project-details-grid">
                <div className="project-info-block manager-info-block">
                  <h3>Project Manager</h3>

                  {project.manager ? (
                    <div className="manager-profile">
                      <div className="manager-avatar">
                        {project.manager.name.trim().charAt(0).toUpperCase()}
                      </div>

                      <div className="manager-profile-details">
                        <strong>{project.manager.name}</strong>
                        <p>{project.manager.email}</p>
                        <span className="manager-role">Project Manager</span>
                      </div>
                    </div>
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
                          {canManageMembers && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={updatingMembers}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No team members assigned yet.</p>
                  )}

                  {canManageMembers && (
                    <div style={{ marginTop: '16px' }}>
                      <label htmlFor="add-project-member">
                        Add a team member
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          marginTop: '8px',
                        }}
                      >
                        <select
                          id="add-project-member"
                          value={selectedMemberId}
                          onChange={(event) =>
                            setSelectedMemberId(event.target.value)
                          }
                          disabled={
                            updatingMembers || availableMembers.length === 0
                          }
                        >
                          <option value="">Select a member</option>
                          {availableMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({member.email})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          disabled={updatingMembers || !selectedMemberId}
                        >
                          {updatingMembers ? 'Updating...' : 'Add Member'}
                        </button>
                      </div>
                      {availableMembers.length === 0 && (
                        <p>There are no additional members available to add.</p>
                      )}
                    </div>
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
                {totalIssues} total matching the current filters
              </p>
            </div>

            <button
              className="issues-create-button"
              onClick={() => {
                setCreateError('');
                setShowCreateForm(true);
              }}
            >
              + Create Issue
            </button>
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
                min="0"
                step="0.01"
                max="36500"
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
              </div>

              {createError && (
                <p className="issues-error" role="alert">
                  {createError}
                </p>
              )}

              <div className="create-issue-actions">
                <button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Issue'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="issues-filters">
            <input
              aria-label="Search issues"
              placeholder="Search by title or description..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
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
              onChange={(event) => {
                setSeverityFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select
              aria-label="Filter by assigned member"
              value={assigneeFilter}
              onChange={(event) => {
                setAssigneeFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All members</option>

              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {editingIssue && (
            <form
              className="create-issue-form"
              onSubmit={async (event) => {
                event.preventDefault();

                if (savingEdit) return;

                const duration = Number(editDuration);

                if (
                  editDuration.trim() !== '' &&
                  (!Number.isFinite(duration) || duration <= 0)
                ) {
                  setEditError(
                    'Estimated duration must be a positive number of days.',
                  );
                  return;
                }

                if (!editTitle.trim() || !editDescription.trim()) {
                  setEditError('Please enter both a title and description.');
                  return;
                }

                setSavingEdit(true);
                setEditError('');

                try {
                  await api.patch(`/issues/${editingIssue.id}`, {
                    title: editTitle.trim(),
                    description: editDescription.trim(),
                    severity: editSeverity,
                    assignee_id:
                      editAssigneeId === '' ? null : Number(editAssigneeId),
                    estimated_duration_days:
                      editDuration.trim() === '' ? null : duration,
                  });

                  await fetchIssues();
                  setEditingIssue(null);
                  toast.success('Issue updated successfully!');
                } catch (err: any) {
                  console.error('Update issue failed:', err);
                  toast.error(
                    getApiErrorMessage(err, 'Could not update the issue.'),
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

              <label htmlFor="edit-issue-duration">
                Estimated duration (days)
              </label>
              <input
                id="edit-issue-duration"
                type="number"
                min="0"
                step="0.01"
                max="36500"
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
              </div>

              {editError && (
                <p className="issues-error" role="alert">
                  {editError}
                </p>
              )}

              <div className="create-issue-actions">
                <button type="submit" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => {
                    setEditingIssue(null);
                    setEditError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading && <p className="issues-message">Loading issues...</p>}

          {!loading && issues.length === 0 && (
            <div className="issues-empty">
              <h3>
                {totalIssues === 0
                  ? 'No issues found'
                  : 'No issues on this page'}
              </h3>
              <p>
                {totalIssues === 0
                  ? 'No issues match your current search or filters.'
                  : 'Try going to the previous page.'}
              </p>
            </div>
          )}

          {!loading && issues.length > 0 && (
            <>
              <div className="issues-table-wrapper">
                <table className="issues-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Status</th>
                      <th>Severity</th>
                      <th>Assignee</th>
                      <th>Created</th>
                      <th>Estimated</th>
                      <th>Due Date</th>
                      <th>Actual Duration</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {issues.map((issue) => (
                      <tr key={issue.id}>
                        <td>
                          <strong>{issue.title}</strong>
                          <p className="issues-description">
                            {issue.description}
                          </p>
                        </td>

                        <td>
                          <select
                            aria-label={`Update status for ${issue.title}`}
                            className={`issue-status-select status-${issue.status}`}
                            value={issue.status}
                            onChange={(event) =>
                              handleStatusChange(
                                issue,
                                event.target.value as Issue['status'],
                              )
                            }
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>

                        <td>
                          <span
                            className={`issue-badge severity-${issue.severity}`}
                          >
                            {formatLabel(issue.severity)}
                          </span>
                        </td>

                        <td>
                          {issue.assignee_id === null
                            ? 'Unassigned'
                            : (members.find(
                                (member) => member.id === issue.assignee_id,
                              )?.name ?? 'Unknown member')}
                        </td>

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
                          {issue.status === 'closed' && issue.completed_at
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
                                `Are you sure you want to delete "${issue.title}"?`,
                              );

                              if (!confirmed) return;

                              try {
                                await api.delete(`/issues/${issue.id}`);
                                await fetchIssues();
                                toast.success('Issue deleted successfully!');
                              } catch (err: any) {
                                console.error('Delete issue failed:', err);
                                toast.error(
                                  getApiErrorMessage(
                                    err,
                                    'Could not delete the issue.',
                                  ),
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
                  Showing {(currentPage - 1) * ISSUES_PER_PAGE + 1}
                  {'–'}
                  {Math.min(currentPage * ISSUES_PER_PAGE, totalIssues)} of{' '}
                  {totalIssues} issues
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
