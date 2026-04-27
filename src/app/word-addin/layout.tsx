import Script from 'next/script';

export const metadata = {
  title: 'ESABCC Reference Manager - Word Add-in',
};

export default function WordAddinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
