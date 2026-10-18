
import { useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";
import "./Users.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type EditableRole = "project_member" | "project_manager";

type Toast = {
  type: "success" | "error";
  text: string;
};

const USERS_PER_PAGE = 10;

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<EditableRole>("project_member");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] =
    useState<EditableRole>("project_member");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  async function fetchUsers() {
    try {
      const response = await api.get<User[]>("/users/");
      setUsers(response.data);
      setCurrentPage(1);
      setError("");
    } catch {
      setError("Couldn't load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(users.length / USERS_PER_PAGE)
  );

  const startIndex = (currentPage - 1) * USERS_PER_PAGE;

  const paginatedUsers = users.slice(
    startIndex,
    startIndex + USERS_PER_PAGE
  );

  function showToast(type: Toast["type"], text: string) {
    setToast({ type, text });
  }

  function getErrorMessage(err: unknown, fallback: string): string {
    const detail = (
      err as {
        response?: { data?: { detail?: unknown } };
      }
    )?.response?.data?.detail;

    return typeof detail === "string" ? detail : fallback;
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setCreating(true);

    try {
      await api.post("/users/", {
        name,
        email,
        password,
        role,
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("project_member");

      setMessage("User created successfully!");
      showToast("success", "User created successfully!");

      await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        "Couldn't create user. Please check the details and try again."
      );

      setError(errorMessage);
      showToast("error", errorMessage);
    } finally {
      setCreating(false);
    }
  }

  function startEditing(user: User) {
    if (
      user.role !== "project_member" &&
      user.role !== "project_manager"
    ) {
      showToast("error", "This account's role cannot be edited here.");
      return;
    }

    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setMessage("");
    setError("");
  }

  function cancelEditing() {
    setEditingUser(null);
    setEditName("");
    setEditEmail("");
    setEditRole("project_member");
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) return;

    setSavingEdit(true);
    setError("");

    try {
      await api.put(`/users/${editingUser.id}`, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
      });

      showToast("success", "User updated successfully!");
      cancelEditing();
      await fetchUsers();
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(
          err,
          "Couldn't update user. Please check the details and try again."
        )
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteUser(user: User) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name} (${user.email})? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(user.id);

    try {
      await api.delete(`/users/${user.id}`);

      showToast("success", `${user.name} was deleted successfully.`);

      if (editingUser?.id === user.id) {
        cancelEditing();
      }

      await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        "Couldn't delete the user. Please try again."
      );

      showToast("error", errorMessage);
    } finally {
      setDeletingId(null);
    }
  }

  function formatRole(userRole: string) {
    if (userRole === "super_admin") return "Super Admin";

    return userRole
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return (
    <main className="users-page">
      {toast && (
        <div
          className={`toast toast-${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.text}</span>

          <button
            type="button"
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <header className="users-header">
        <div className="users-heading">
          <span className="eyebrow">BUGTRACKER · ADMINISTRATION</span>
          <h1>User Management</h1>
          <p>Create accounts and manage access to your workspace.</p>
        </div>

        <div className="users-count">
          <span>Total users</span>
          <strong>{users.length}</strong>
        </div>
      </header>

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
            {creating ? "Creating account..." : "Create user"}
          </button>

          {message && <p className="form-message success">{message}</p>}
          {error && users.length > 0 && (
            <p className="form-message error">{error}</p>
          )}
        </form>
      </section>

      {editingUser && (
        <section className="users-card edit-card">
          <div className="section-heading">
            <div className="section-icon">
              <span aria-hidden="true">✎</span>
            </div>
            <div>
              <h2>Edit user #{editingUser.id}</h2>
              <p>Update this user's account details and role.</p>
            </div>
          </div>

          <form className="user-form" onSubmit={handleUpdateUser}>
            <div className="form-field">
              <label htmlFor="edit-user-name">Full name</label>
              <input
                id="edit-user-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
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
                onChange={(e) =>
                  setEditRole(e.target.value as EditableRole)
                }
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
                {savingEdit ? "Saving changes..." : "Save changes"}
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

      <section className="users-card directory-card">
        <div className="section-heading directory-heading">
          <div>
            <h2>All users</h2>
            <p>Accounts registered in your workspace.</p>
          </div>
          <span className="user-count-badge">
            {users.length} accounts
          </span>
        </div>

        {loading ? (
          <p className="table-state">Loading users...</p>
        ) : error && users.length === 0 ? (
          <p className="table-state error">{error}</p>
        ) : users.length === 0 ? (
          <p className="table-state">No users found yet.</p>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email address</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((user) => {
                    const isSuperAdmin = user.role === "super_admin";

                    return (
                      <tr key={user.id}>
                        <td className="user-id">#{user.id}</td>

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
                              isSuperAdmin ? "admin-role" : ""
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
                                  ? "Super Admin accounts cannot be edited here"
                                  : "Edit user"
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="action-button delete-button"
                              onClick={() => void handleDeleteUser(user)}
                              disabled={
                                isSuperAdmin || deletingId === user.id
                              }
                              title={
                                isSuperAdmin
                                  ? "Super Admin accounts cannot be deleted here"
                                  : "Delete user"
                              }
                            >
                              {deletingId === user.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span className="pagination-info">
                Showing {startIndex + 1}–
                {Math.min(startIndex + USERS_PER_PAGE, users.length)} of{" "}
                {users.length} users
              </span>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="secondary-button"
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
                  className="secondary-button"
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
