import { useEffect, useRef, useState, type FormEvent } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import './Users.css';
import { toast } from 'sonner';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type EditableRole = 'project_member' | 'project_manager';

type PaginatedUsersResponse = {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

const USERS_PER_PAGE = 10;

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);

  // Create user form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<EditableRole>('project_member');

  // Loading and action states
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Edit user form
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<EditableRole>('project_member');

  // Messages and notifications
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Search, filtering and sorting
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('name-asc');

  // Backend pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const editFormRef = useRef<HTMLElement | null>(null);

  function getErrorMessage(err: unknown, fallback: string): string {
    const error = err as {
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

    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item: unknown) => {
          if (typeof item === 'string') return item;

          if (typeof item === 'object' && item !== null) {
            const validation = item as {
              loc?: unknown[];
              msg?: string;
            };

            const field = validation.loc
              ?.filter(
                (part) =>
                  part !== 'body' && part !== 'query' && part !== 'path',
              )
              .join(' → ');

            const message = validation.msg || 'Invalid value';

            return field ? `${field}: ${message}` : message;
          }

          return String(item);
        })
        .join('. ');
    }

    const serverMessage = error.response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      return serverMessage;
    }

    if (status === 409) {
      return 'A user with this email already exists.';
    }

    if (status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    if (status === 403) {
      return "You don't have permission to perform this action.";
    }

    if (status === 404) {
      return 'User not found. Refresh the page and try again.';
    }

    if (status === 422) {
      return 'Some details are invalid. Please check the fields and try again.';
    }

    if (status && status >= 500) {
      return 'A server error occurred. Please try again later.';
    }

    if (error.request) {
      return 'Could not reach the server. Check your connection and try again.';
    }

    return fallback;
  }

  async function fetchUsers(page = currentPage) {
    setLoading(true);

    try {
      const response = await api.get<PaginatedUsersResponse>('/users/', {
        params: {
          page,
          page_size: USERS_PER_PAGE,
          search: search.trim(),
          role: roleFilter,
          sort_order: sortOrder,
        },
      });

      const data = response.data;

      setUsers(data.items);
      setTotalUsers(data.total);
      setCurrentPage(data.page);
      setTotalPages(Math.max(1, data.total_pages));
      setError('');
    } catch {
      setError("Couldn't load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Fetch whenever the page, search, filter or sort changes.
  useEffect(() => {
    void fetchUsers(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, roleFilter, sortOrder]);

  // Create a user
  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setCreating(true);

    try {
      await api.post('/users/', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      setName('');
      setEmail('');
      setPassword('');
      setRole('project_member');

      setMessage('User created successfully!');
      toast.success('User created successfully!');

      setCurrentPage(1);
      await fetchUsers(1);
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: { detail?: unknown };
        };
        request?: unknown;
      };

      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      let errorMessage: string;

      if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail
          .map((item: { loc?: string[]; msg?: string }) => {
            const field = item.loc?.at(-1);
            const message = item.msg || 'Invalid value';

            if (field === 'name') return `Name: ${message}`;
            if (field === 'email') return `Email: ${message}`;
            if (field === 'password') return `Password: ${message}`;

            return message;
          })
          .join('. ');
      } else if (typeof detail === 'string' && detail.trim()) {
        errorMessage = detail;
      } else if (status === 409) {
        errorMessage = 'This email address is already registered.';
      } else if (status === 400) {
        errorMessage =
          'The user could not be created because the submitted details were rejected.';
      } else if (status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (status === 403) {
        errorMessage = 'Only an administrator can create users.';
      } else if (status === 422) {
        errorMessage =
          'Some user details are invalid. Check the name, email, password and role.';
      } else if (status && status >= 500) {
        errorMessage =
          'The server encountered an error while creating the user.';
      } else if (error.request) {
        errorMessage =
          'The server could not be reached. Check that the backend is running.';
      } else {
        errorMessage =
          'The user could not be created due to an unexpected error.';
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  }

  // Start editing a user
  function startEditing(user: User) {
    console.log('Edit clicked:', user);
    if (user.role !== 'project_member' && user.role !== 'project_manager') {
      toast.error("This account's role cannot be edited here.");
      return;
    }

    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setMessage('');
    setError('');

    setTimeout(() => {
      editFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }

  // Cancel editing
  function cancelEditing() {
    setEditingUser(null);
    setEditName('');
    setEditEmail('');
    setEditRole('project_member');
  }

  // Save edited user
  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) return;

    setSavingEdit(true);
    setError('');

    try {
      await api.put(`/users/${editingUser.id}`, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
      });

      toast.success('User updated successfully!');
      cancelEditing();
      await fetchUsers(currentPage);
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(
          err,
          "Couldn't update user. Please check the details and try again.",
        ),
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // Delete a user
  async function handleDeleteUser(user: User) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name} (${user.email})? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(user.id);

    try {
      await api.delete(`/users/${user.id}`);

      toast.success(`${user.name} was deleted successfully.`);

      if (editingUser?.id === user.id) {
        cancelEditing();
      }

      const nextPage =
        users.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      setCurrentPage(nextPage);
      await fetchUsers(nextPage);
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err, "Couldn't delete the user. Please try again."),
      );
    } finally {
      setDeletingId(null);
    }
  }

  function formatRole(userRole: string) {
    if (userRole === 'super_admin') return 'Super Admin';

    return userRole
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function clearFilters() {
    setSearch('');
    setRoleFilter('all');
    setSortOrder('name-asc');
    setCurrentPage(1);
  }

  const firstUser =
    totalUsers === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;

  const lastUser = Math.min(currentPage * USERS_PER_PAGE, totalUsers);

  return (
    <main className="users-page">
      <header className="users-topbar">
        <div className="users-brand">
          <div className="users-brand-icon">B</div>
          <span>BugTracker</span>
        </div>

        <div className="users-topbar-right">
          <span className="users-role-badge">Administrator</span>
        </div>
      </header>

      <button className="issues-back-button" onClick={() => navigate(-1)}>
        ← Back to dashboard
      </button>

      <header className="users-header">
        <div className="users-heading">
          <span className="eyebrow">BUGTRACKER · ADMINISTRATION</span>
          <h1>User Management</h1>
          <p>Create accounts and manage access to your workspace.</p>
        </div>

        <div className="users-count">
          <span>Total users</span>
          <strong>{totalUsers}</strong>
        </div>
      </header>

      {/* Create user */}
      <section className="users-card create-card">
        <div className="section-heading">
          <div className="section-icon">+</div>
          <div>
            <h2>Create a user</h2>
            <p>Add a new account to BugTracker.</p>
          </div>
        </div>

        <form
          className="user-form"
          onSubmit={handleCreateUser}
          autoComplete="off"
        >
          <div className="form-field">
            <label htmlFor="user-name">Full name</label>
            <input
              id="user-name"
              type="text"
              placeholder="e.g. Alex Thomas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              required
              minLength={2}
              pattern="[A-Za-z]+(?:[ '-][A-Za-z]+)*"
              title="Name must contain at least one letter."
            />
          </div>

          <div className="form-field">
            <label htmlFor="user-email">Email address</label>
            <input
              id="user-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="user-password">Temporary password</label>
            <input
              id="user-password"
              type="password"
              placeholder="Enter a temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <span className="field-hint">Use at least 8 characters.</span>
          </div>

          <div className="form-field">
            <label htmlFor="user-role">User role</label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as EditableRole)}
              className="role-select"
            >
              <option value="project_member">Project Member</option>
              <option value="project_manager">Project Manager</option>
            </select>
            <span className="field-hint">
              Choose the role and permissions for this account.
            </span>
          </div>

          <button className="create-button" type="submit" disabled={creating}>
            {creating ? 'Creating account...' : 'Create user'}
          </button>

          {message && <p className="form-message success">{message}</p>}

          {error && <p className="form-message error">{error}</p>}
        </form>
      </section>

      {/* Edit user */}
      {editingUser && (
        <section ref={editFormRef} className="users-card edit-card">
          <div className="section-heading">
            <div className="section-icon">
              <span aria-hidden="true">✎</span>
            </div>
            <div>
              <h2>Edit user</h2>
              <p>Update this user's account details and role.</p>
            </div>
          </div>

          <form className="user-form" onSubmit={handleUpdateUser}>
            <div className="form-field">
              <label htmlFor="edit-user-name">Full name</label>
              <input
                id="edit-user-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                minLength={2}
                pattern=".*[A-Za-z].*"
                title="Name must contain at least one letter."
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-user-email">Email address</label>
              <input
                id="edit-user-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-user-role">User role</label>
              <select
                id="edit-user-role"
                className="role-select"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as EditableRole)}
              >
                <option value="project_member">Project Member</option>
                <option value="project_manager">Project Manager</option>
              </select>
              <span className="field-hint">
                Super Admin accounts cannot be edited using this form.
              </span>
            </div>

            <div className="edit-actions">
              <button
                className="create-button"
                type="submit"
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving changes...' : 'Save changes'}
              </button>

              <button
                className="secondary-button"
                type="button"
                onClick={cancelEditing}
                disabled={savingEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* User directory */}
      <section className="users-card directory-card">
        <div className="section-heading directory-heading">
          <div>
            <h2>All users</h2>
            <p>Search accounts and filter them by role.</p>
          </div>

          <span className="user-count-badge">{totalUsers} accounts</span>
        </div>

        {/* Search, role filter and sorting */}
        <div className="user-directory-filters">
          <div className="form-field user-search-field">
            <label htmlFor="user-search">Search users</label>
            <input
              id="user-search"
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="role-filter">Filter by role</label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="project_member">Project Member</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="user-sort">Sort by name</label>
            <select
              id="user-sort"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="name-asc">A–Z</option>
              <option value="name-desc">Z–A</option>
            </select>
          </div>

          <button
            type="button"
            className="secondary-button clear-filters-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

        <p className="user-results-count">
          Showing {users.length} of {totalUsers} users
        </p>

        {loading ? (
          <p className="table-state">Loading users...</p>
        ) : error && users.length === 0 ? (
          <p className="table-state error">{error}</p>
        ) : users.length === 0 ? (
          <p className="table-state">
            {search.trim() || roleFilter !== 'all'
              ? 'No users match your search or selected filters.'
              : 'No users found yet.'}
          </p>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email address</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isSuperAdmin = user.role === 'super_admin';

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="user-name-cell">
                            <span className="user-avatar">
                              {user.name.trim().charAt(0).toUpperCase()}
                            </span>
                            <span>{user.name}</span>
                          </div>
                        </td>

                        <td className="user-email">{user.email}</td>

                        <td>
                          <span
                            className={`role-pill ${
                              isSuperAdmin ? 'admin-role' : ''
                            }`}
                          >
                            {formatRole(user.role)}
                          </span>
                        </td>

                        <td>
                          <div className="user-actions">
                            <button
                              type="button"
                              className="action-button edit-button"
                              onClick={() => startEditing(user)}
                              disabled={isSuperAdmin || savingEdit}
                              title={
                                isSuperAdmin
                                  ? 'Super Admin accounts cannot be edited here'
                                  : 'Edit user'
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="action-button delete-button"
                              onClick={() => void handleDeleteUser(user)}
                              disabled={isSuperAdmin || deletingId === user.id}
                              title={
                                isSuperAdmin
                                  ? 'Super Admin accounts cannot be deleted here'
                                  : 'Delete user'
                              }
                            >
                              {deletingId === user.id
                                ? 'Deleting...'
                                : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Backend-driven pagination */}
            <div className="pagination">
              <span className="pagination-info">
                Showing {firstUser}–{lastUser} of {totalUsers} users
              </span>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage((page) => page - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  className="secondary-button"
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
