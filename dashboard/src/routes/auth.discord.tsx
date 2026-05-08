import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth/discord")({
  head: () => ({ meta: [{ title: "Authenticating — Fragment" }] }),
  component: DiscordAuthPage,
});

function DiscordAuthPage() {
  const { startDiscordSignIn } = useAuth();

  useEffect(() => {
    startDiscordSignIn();
  }, [startDiscordSignIn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar-rail">
      <div className="text-center">
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        </div>
        <div className="mt-6 font-display text-lg font-semibold">Authenticating with Discord…</div>
        <div className="mt-1 text-sm text-muted-foreground">Hold on, syncing your guilds.</div>
      </div>
    </div>
  );
}
