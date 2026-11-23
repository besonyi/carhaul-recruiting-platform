import type { Metadata } from 'next';
import Link from 'next/link';
import { siteData } from '../lib/api';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Car Hauling Careers', template: '%s | Car Hauling Careers' },
  description: 'Explore CDL-A company driver and owner operator opportunities in auto transport.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await siteData();
  return <html lang="en"><body>
    <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
    <header className="border-b border-slate-700 bg-[#14212a] text-white">
      <div className="shell flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4">
        <Link href="/" className="font-extrabold uppercase tracking-wide">{site.carrier || 'Car Hauling Careers'}</Link>
        <nav aria-label="Main navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <Link href="/company-drivers">Company Drivers</Link>
          <Link href="/owner-operators">Owner Operators</Link>
          <Link href="/jobs">Open Jobs</Link>
        </nav>
      </div>
    </header>
    <main id="main">{children}</main>
    <footer className="mt-12 border-t border-slate-300"><div className="shell flex flex-wrap justify-between gap-4 py-6 text-sm">
      <span>{site.carrier || 'Car Hauling Careers'}</span><div className="flex gap-5"><Link href="/privacy">Application privacy</Link><Link href="/crm">Staff sign in</Link></div>
    </div></footer>
  </body></html>;
}
