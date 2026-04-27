import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <article className="prose prose-sm sm:prose-base max-w-none text-[#3D5265]">
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
