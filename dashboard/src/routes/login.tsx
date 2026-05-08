import { Outlet, createFileRoute } from "@tanstack/react-router";
import { redirectFromLoginPath } from "@/lib/routeMindware";

export const Route = createFileRoute("/login")({
  beforeLoad: redirectFromLoginPath,
  component: Outlet,
});
