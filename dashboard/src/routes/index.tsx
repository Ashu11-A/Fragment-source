import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/auth/LoginPage";
import { redirectToDashboardIfAuthenticated } from "@/lib/routeMindware";

export const Route = createFileRoute("/")({
  beforeLoad: redirectToDashboardIfAuthenticated,
  head: () => ({ meta: [{ title: "Log in — Fragment" }] }),
  component: LoginPage,
});
