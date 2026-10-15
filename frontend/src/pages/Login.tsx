
import { useState, type FormEvent } from "react";
import axios from "axios";
import api from "../api/axios";
import "./Login.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams(); //backend expects URL encoded form data
      formData.append("username", username);
      formData.append("password", password);
        
      const response = await api.post("/auth/login", formData, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    console.log("Login response:", response.data);

sessionStorage.setItem("access_token", response.data.access_token);
sessionStorage.setItem("refresh_token", response.data.refresh_token);

navigate("/");


    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.detail ??  //If the backend provides an error message, show it. Otherwise, show our default error.
            "Unable to log in. Please check your credentials."
        ); 
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-icon">B</span>
          <span>BugTracks</span>
        </div>

        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in to your workspace</h1>
        <p className="login-description">
          Manage projects, track issues, and keep your team moving.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
            
        <p className="login-footer">
          BugTrack · Project and issue management
        </p>
      </section>
    </main>
  );
}
