import { useNavigate } from "@tanstack/react-router";
import { Hexagon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/fragment/primitives";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, startDiscordSignIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, pw);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar-rail lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Hexagon className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Fragment</span>
        </div>
        <div className="relative">
          <h2 className="max-w-md font-display text-4xl font-bold leading-tight">
            Manage your Discord bots like a real platform.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Bots, plugins, nodes and subscriptions — all in one workspace, with the polish of a modern dev console.
          </p>
        </div>
        <div className="relative text-xs text-muted-foreground">© 2026 Fragment. Crafted for builders.</div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Hexagon className="h-6 w-6" />
            </div>
            <div className="font-display text-xl font-bold">Fragment</div>
          </div>

          <h1 className="font-display text-2xl font-bold">Welcome to Fragment</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your Discord bots with ease.</p>

          {error && (
            <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <Field label="Email">
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="Enter your password" value={pw} onChange={(e) => setPw(e.target.value)} required disabled={isLoading} />
            </Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in…" : "Log In"}
            </Button>

            <div className="relative my-2 flex items-center">
              <div className="h-px flex-1 bg-border" />
              <span className="px-3 text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={startDiscordSignIn}
              disabled={isLoading}
            >
              <DiscordMark /> Continue with Discord
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>Don&apos;t have an account? <a className="text-primary hover:underline" href="#">Sign up</a></span>
            <a className="text-primary hover:underline" href="#">Forgot password?</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.075.075 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.51 12.51 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.027 14.21 14.21 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.673-3.548-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
