import { redirect } from 'next/navigation';

// This page exists only to redirect to the dashboard.
// The real dashboard lives at /dashboard via (dashboard)/dashboard/page.tsx
export default function RootPage() {
  redirect('/dashboard');
}
