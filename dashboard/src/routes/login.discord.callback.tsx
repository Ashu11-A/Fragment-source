import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login/discord/callback")({
  head: () => ({ meta: [{ title: "Authenticating — Fragment" }] }),
  component: DiscordCallbackPage,
});

const OAUTH_TIMEOUT_MS = 30_000;

function DiscordCallbackPage() {
  const navigate = useNavigate();
  const { completeDiscordSignIn, getDiscordCallbackRedirectUri, formatDiscordOAuthCallbackError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const processedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (processedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");
    const errorDescription = params.get("error_description");

    if (oauthError) {
      processedRef.current = true;
      setIsProcessing(false);
      const msg = errorDescription || oauthError;
      setError(formatDiscordOAuthCallbackError(msg));
      return;
    }

    if (!code || !state) {
      processedRef.current = true;
      setIsProcessing(false);
      setError("Missing authorization code or state. Please try again.");
      return;
    }

    processedRef.current = true;

    timeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
      setError("Authentication timed out. Please try again.");
    }, OAUTH_TIMEOUT_MS);

    completeDiscordSignIn({
      code,
      state,
      redirectUri: getDiscordCallbackRedirectUri(),
    })
      .then(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        navigate({ to: "/dashboard", replace: true });
      })
      .catch((err) => {
        console.error("Discord OAuth callback error:", err);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsProcessing(false);
        setError(formatDiscordOAuthCallbackError(err));
      });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [completeDiscordSignIn, getDiscordCallbackRedirectUri, formatDiscordOAuthCallbackError, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar-rail">
        <div className="text-center max-w-sm px-4">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="font-display text-lg font-semibold text-destructive">Authentication Failed</div>
          <div className="mt-2 text-sm text-muted-foreground">{error}</div>
          <button
            onClick={() => navigate({ to: "/", replace: true })}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar-rail">
      <div className="text-center">
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        </div>
        <div className="mt-6 font-display text-lg font-semibold">Authenticating with Discord…</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {isProcessing ? "Hold on, syncing your account." : "Processing complete."}
        </div>
      </div>
    </div>
  );
}
