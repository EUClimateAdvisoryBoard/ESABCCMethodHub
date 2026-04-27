import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in — ESABCC Method Hub',
  robots: { index: false, follow: false },
};

export default function SiteLoginPage({
  searchParams,
}: {
  searchParams?: { next?: string; error?: string };
}) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '/';
  const hasError = searchParams?.error === '1';
  return <LoginForm next={next} hasError={hasError} />;
}
