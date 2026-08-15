import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Brain, FileText, Search, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "./AuthProvider";

type AuthMode = "login" | "register";

const FEATURES = [
  {
    icon: <Brain size={15} />,
    title: "RAG-native",
    desc: "Your notes power the AI answers.",
  },
  {
    icon: <Sparkles size={15} />,
    title: "AI Companion",
    desc: "Ask questions, get cited answers.",
  },
  {
    icon: <FileText size={15} />,
    title: "Block editor",
    desc: "Rich text, code, images, checklists.",
  },
  {
    icon: <Search size={15} />,
    title: "Semantic search",
    desc: "Find notes by meaning, not keywords.",
  },
];

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const { isAuthenticated, isBootstrapping, login, register } = useAuth();
  const [name, setName]                 = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [error, setError]               = useState("");
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
    <main className="min-h-screen flex bg-background text-foreground font-sans">

      {/* ── LEFT: Marketing copy ────────────────────────────────────────── */}
      <section className="hidden lg:flex flex-col justify-center flex-1 px-16 xl:px-24 py-12 border-r border-foreground/10 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(var(--orange)/0.06)] blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-900/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg">
          {/* Brand */}
          <div className="font-mono text-sm font-black tracking-tighter mb-10 text-foreground">
            <span className="text-blue-400">&lt;</span>
            Microcosm
            <span className="text-blue-400"> /&gt;</span>
          </div>

          {/* Eyebrow */}
          <p className="font-mono text-xs text-[hsl(var(--orange))] tracking-widest uppercase mb-4">
            // knowledge operating system
          </p>

          {/* Headline */}
          <h1 className="font-serif text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight mb-6 text-foreground">
            Your knowledge.<br />
            <span className="text-gradient-warm">Connected.</span> Alive.
          </h1>

          <p className="text-foreground/60 text-lg leading-relaxed mb-10 max-w-md">
            Build a personal knowledge system where your notes, ideas, and AI conversations
            become searchable, structured, and genuinely useful — long after you write them.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 border border-foreground/10 bg-card rounded-none hover:border-foreground/25 transition-colors"
              >
                <div className="text-[hsl(var(--orange))] mb-2">{f.icon}</div>
                <strong className="block text-sm font-semibold text-foreground mb-0.5">{f.title}</strong>
                <span className="text-xs text-muted-foreground">{f.desc}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RIGHT: Auth form ─────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 sm:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile brand */}
          <div className="font-mono text-sm font-black tracking-tighter mb-8 text-foreground lg:hidden">
            <span className="text-blue-400">&lt;</span>
            Microcosm
            <span className="text-blue-400"> /&gt;</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-2">
              // {isRegister ? "create account" : "welcome back"}
            </p>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              {isRegister ? "Start your microcosm" : "Enter your workspace"}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isRegister && (
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoFocus
                  autoComplete="name"
                  className="w-full bg-card border-2 border-foreground/20 focus:border-foreground rounded-none px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors"
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                required
                autoFocus={!isRegister}
                autoComplete="email"
                className="w-full bg-card border-2 border-foreground/20 focus:border-foreground rounded-none px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "At least 8 characters" : "Your password"}
                type="password"
                required
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="w-full bg-card border-2 border-foreground/20 focus:border-foreground rounded-none px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors"
              />
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/50 text-red-400 text-sm rounded-none">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 w-full min-h-[44px] px-6 py-3
                         bg-foreground text-background border-2 border-foreground font-bold text-sm
                         hover:bg-secondary hover:text-foreground hover:-translate-y-0.5
                         active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
              style={{ boxShadow: "3px 3px 0px 0px rgba(255,255,255,0.15)" }}
            >
              {isSubmitting ? (
                <><Loader2 size={15} className="animate-spin" /> Working…</>
              ) : isRegister ? (
                <><span>Create account</span><ArrowRight size={15} /></>
              ) : (
                <><span>Sign in</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            {isRegister ? "Already have an account? " : "New to Microcosm? "}
            <Link
              to={isRegister ? "/login" : "/register"}
              className="font-semibold text-foreground underline underline-offset-2 hover:text-[hsl(var(--orange))] transition-colors"
            >
              {isRegister ? "Sign in" : "Create account"}
            </Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
}
