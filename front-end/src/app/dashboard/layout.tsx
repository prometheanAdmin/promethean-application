import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { getDashboardData } from '@/lib/server/getDashboardData';

export const metadata: Metadata = {
  title: 'Dashboard - Promethean',
};

/*
 * Async Server Component — runs on the Node.js runtime for every hard refresh.
 *
 * getDashboardData() fires all backend requests server-to-server (~5–20 ms)
 * before the HTML leaves the server. The result is serialised into the RSC
 * payload and delivered to DashboardShell as initialData.
 *
 * On the client, DashboardShell seeds the store from initialData in a
 * useLayoutEffect (before paint), so the moment Clerk finishes hydrating
 * (~200 ms) the page renders immediately — no additional API calls required.
 *
 * If getDashboardData returns null (unauthenticated, backend unreachable, etc.)
 * DashboardShell falls back to the original client-side loading flow.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const initialData = await getDashboardData();
  return <DashboardShell initialData={initialData}>{children}</DashboardShell>;
}
