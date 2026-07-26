import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Brain, FileText, Search, Sparkles, AlertCircle } from "lucide-react";
import { useAuth } from "./AuthProvider";

type AuthMode = "login" | "register";

const FEATURES = [
  {
    icon: <Brain size={16} />,
    title: "RAG-native",
    desc: "Your notes power the AI answers.",
  },
  {
    icon: <Sparkles size={16} />,
    title: "AI Companion",
    desc: "Ask questions, get cited answers.",
  },
  {
    icon: <FileText size={16} />,
    title: "Block editor",
    desc: "Rich text, code, images, checklists.",
  },
  {
    icon: <Search size={16} />,
    title: "Semantic search",
    desc: "Find notes by meaning, not keywords.",
  },
];

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate    = useNavigate();
  const { isAuthenticated, isBootstrapping, login, register } = useAuth();
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register({ name, email, password });
      } else {
        await login({ email, password });
      }
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">

      {/* ── LEFT: Marketing copy ──────────────────────────────────────── */}
      <section className="auth-copy">
        <div className="auth-brand">&lt;Microcosm /&gt;</div>

        <p className="auth-eyebrow">// knowledge operating system</p>

        <h1 className="auth-headline">
          Your knowledge.<br />
          <span>Connected.</span> Alive.
        </h1>

        <p className="auth-lede">
          Build a personal knowledge system where your notes, ideas, and
          AI conversations become searchable, structured, and genuinely useful
          — long after you write them.
        </p>

        <div className="auth-proof-grid">
          {FEATURES.map((f) => (
            <div className="auth-proof-card" key={f.title}>
              {f.icon}
              <strong>{f.title}</strong>
              <span>{f.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── RIGHT: Auth form ──────────────────────────────────────────── */}
      <section className="auth-panel">
        <div className="auth-form-header">
          <p className="auth-section-label">
            // {isRegister ? "create account" : "welcome back"}
          </p>
          <h2 className="auth-form-title">
            {isRegister ? "Start your microcosm" : "Enter your workspace"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                autoFocus
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              required
              autoFocus={!isRegister}
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
              type="password"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <div className="auth-error">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Working…"
              : isRegister
              ? "Create account"
              : "Sign in"}
            {!isSubmitting && <ArrowRight size={15} />}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account? " : "New to Microcosm? "}
          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
