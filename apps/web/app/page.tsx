import Image from 'next/image';
import Link from 'next/link';
import { api, type Job } from '../lib/api';
import { tracks } from '../lib/labels';
import './career-home.css';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const drivingPaths = [
  { ...tracks.COMPANY_DRIVER, summary: 'Drive company equipment and put your CDL-A and car hauling experience to work.' },
  { ...tracks.OWNER_OPERATOR, summary: 'Tell recruiting about your equipment and how you want to operate.' },
];

export default async function Home({ searchParams }: Props) {
  const [params, response] = await Promise.all([searchParams, api('/jobs', { timeoutMs: 3500 })]);
  const jobs: Job[] = response.ok ? (await response.json() as Job[]).slice(0, 3) : [];
  const tracking = new URLSearchParams();
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) tracking.set(key, value.trim().slice(0, 100));
  }
  const query = tracking.size ? '?' + tracking : '';

  return <div className="career-home">
    <section className="career-hero" aria-labelledby="career-title">
      <Image src="/car-hauler.webp" alt="A loaded car hauler on an open highway"
        fill sizes="100vw" preload className="career-hero-image" />
      <div className="career-shell career-hero-inner">
        <div className="career-hero-copy">
          <p className="career-kicker">CDL-A careers <span aria-hidden>·</span> Auto transport</p>
          <h1 id="career-title">Build your career <span>in car hauling.</span></h1>
          <p className="career-hero-summary">Explore CDL-A opportunities for company drivers and owner operators.</p>
          <div className="career-hero-actions">
            <Link href={'/jobs' + query} className="career-primary">View open jobs <span aria-hidden>↗</span></Link>
            <a href="#driver-paths" className="career-secondary">Choose your path <span aria-hidden>↓</span></a>
          </div>
        </div>
      </div>
      <span className="career-image-credit">Industry illustration</span>
    </section>

    <section id="driver-paths" className="career-shell career-paths" aria-labelledby="paths-title">
      <h2 id="paths-title" className="career-heading">Choose your driving path</h2>
      <div className="career-path-grid">
        {drivingPaths.map(path => <article key={path.slug} className="career-path-card">
          <h3>{path.label}</h3>
          <p>{path.summary}</p>
          <Link href={'/' + path.slug + query} className="career-path-link">
            Explore {path.label.toLowerCase()} <span aria-hidden>↗</span>
          </Link>
        </article>)}
      </div>
    </section>

    <section className="career-openings" aria-labelledby="opening-title">
      <div className="career-shell">
        <div className="career-section-header">
          <h2 id="opening-title" className="career-heading">Open positions</h2>
          <Link href={'/jobs' + query} className="career-index-link">Browse all jobs <span aria-hidden>↗</span></Link>
        </div>
        {jobs.length > 0 ? <ul className="career-job-list">
          {jobs.map(job => <li key={job.id}>
            <Link href={'/jobs/' + job.slug + query} className="career-job-row">
              <div>
                <h3>{job.title}</h3>
                <p>{tracks[job.track].label} <span aria-hidden>·</span> {job.region}</p>
              </div>
              <span className="career-job-arrow" aria-hidden>↗</span>
            </Link>
          </li>)}
        </ul> : <p className="career-openings-empty" role="status">
          {response.ok ? 'There are no open positions listed right now.' : 'Job listings are temporarily unavailable.'}
        </p>}
      </div>
    </section>
  </div>;
}
