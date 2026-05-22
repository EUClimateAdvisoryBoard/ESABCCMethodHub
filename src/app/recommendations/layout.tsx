import { ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';

export default function RecommendationsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
    </>
  );
}
