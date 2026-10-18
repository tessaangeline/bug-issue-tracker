
import { useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";
import "./Users.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState("project_member");
  const [toast, setToast] = useState<{
  type: "success" | "error";
  text: string;
} | null>(null);

  async function fetchUsers() {
    try {
      const response = await api.get<User[]>("/users/");
      setUsers(response.data);
    } catch {
      setError("Couldn't load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
  }, []);

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
      setToast({
        type: "success",
        text: "User created successfully!",
    });

      await fetchUsers();
  } catch (err: any) {

    console.log("Create user error:", err.response?.data);
    const detail = err.response?.data?.detail;

    const errorMessage =
      typeof detail === "string"
        ? detail
        : "Couldn't create user. Please check the details and try again.";

    setError(errorMessage);
setToast({
  type: "error",
  text: errorMessage,
});

  } finally {
    setCreating(false);
  }
}

  function formatRole(role: string) {
    if (role === "super_admin") return "Super Admin";
    return role.replaceAll("_", " ");
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
            <span className="field-hint">
              Use at least 8 characters.
            </span>
          </div>


<div className="form-field">
  <label htmlFor="user-role">User role</label>

  <select
    id="user-role"
    value={role}
    onChange={(e) => setRole(e.target.value)}
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
          {error && <p className="form-message error">{error}</p>}
        </form>
      </section>

      <section className="users-card directory-card">
        <div className="section-heading directory-heading">
          <div>
            <h2>All users</h2>
            <p>Accounts registered in your workspace.</p>
          </div>
          <span className="user-count-badge">{users.length} accounts</span>
        </div>

        {loading ? (
          <p className="table-state">Loading users...</p>
        ) : error && users.length === 0 ? (
          <p className="table-state error">{error}</p>
        ) : users.length === 0 ? (
          <p className="table-state">No users found yet.</p>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email address</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
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
                          user.role === "super_admin" ? "admin-role" : ""
                        }`}
                      >
                        {formatRole(user.role)}
                      </span>
                    </td>
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
