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
  const brand = site.carrier || 'Car Hauling Careers';
  return <html lang="en"><body>
    <a href="#main" className="site-skip sr-only focus:not-sr-only">Skip to content</a>
    <header className="site-header">
      <div className="career-shell site-header-inner">
        <Link href="/" className="site-brand"><span className="site-mark" aria-hidden /><span>{brand}</span></Link>
        <nav aria-label="Main navigation" className="site-nav">
          <Link href="/company-drivers">Company Drivers</Link>
          <Link href="/owner-operators">Owner Operators</Link>
          <Link href="/jobs" className="site-nav-jobs">Open Jobs <span aria-hidden>↗</span></Link>
        </nav>
      </div>
    </header>
    <main id="main">{children}</main>
    <footer className="site-footer"><div className="career-shell site-footer-inner">
      <Link href="/" className="site-brand"><span className="site-mark" aria-hidden /><span>{brand}</span></Link>
      <nav aria-label="Footer navigation"><Link href="/privacy">Application privacy</Link><Link href="/crm">Staff sign in</Link></nav>
    </div></footer>
  </body></html>;
}
