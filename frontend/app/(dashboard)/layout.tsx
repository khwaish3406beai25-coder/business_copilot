/**
 * Dashboard layout — Server Component.
 *
 * Route protection and the sidebar UI live in DashboardShell (a Client
 * Component), keeping this layout file as a Server Component so Next.js
 * App Router can correctly render the page tree under /dashboard/*.
 */

import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
