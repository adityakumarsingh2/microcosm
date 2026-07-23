import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Brain, Sparkles } from "lucide-react";
import { useAuth } from "./AuthProvider";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const { isAuthenticated, isBootstrapping, login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register({ name, email, password });
      } else {
        await login({ email, password });
      }

      navigate("/app");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-copy">
        <div className="brand-mark">&lt;Microcosm /&gt;</div>
        <p className="eyebrow">import {"{ Memory }"} from "@you/knowledge"</p>
        <h1>
          Your knowledge.<br />
          <span>Connected.</span> Alive.
        </h1>
        <p className="auth-lede">
          Build a personal knowledge system where notes, images, and AI conversations become searchable, structured, and useful.
        </p>
        <div className="auth-proof-grid">
          <div>
            <Brain size={19} />
            <strong>RAG-native</strong>
            <span>Ask from your own notes.</span>
          </div>
          <div>
            <Sparkles size={19} />
            <strong>Companion-first</strong>
            <span>AI beside your work, not above it.</span>
          </div>
        </div>
      </section>

      <section className="auth-panel auth-card">
        <div>
          <p className="section-label">// {isRegister ? "create account" : "welcome back"}</p>
          <h2>{isRegister ? "Start your microcosm" : "Enter your workspace"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister ? (
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Aditya Kumar Singh" required />
            </label>
          ) : null}
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" type="password" required />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : isRegister ? "Create account" : "Login"}
            <ArrowRight size={17} />
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to Microcosm?"} {" "}
          <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Login" : "Create account"}</Link>
        </p>
      </section>
    </main>
  );
}
