import Link from 'next/link';
import Image from 'next/image';
import { tracks } from '../lib/labels';

export default function Home() {
  return <>
    <section className="hero"><div className="shell grid items-center gap-8 py-12 md:grid-cols-[.9fr_1.1fr] lg:gap-12 lg:py-20">
      <div>
        <p className="mb-4 font-bold uppercase tracking-widest text-amber-300">CDL-A · Auto Transport</p>
        <h1 className="display max-w-xl text-5xl uppercase sm:text-7xl">Build your career in car hauling.</h1>
        <p className="mt-5 max-w-xl text-lg text-slate-200">Explore CDL-A company driver and owner operator opportunities.</p>
        <Link className="button mt-7" href="/jobs">View open jobs <span className="ml-3" aria-hidden>↗</span></Link>
      </div>
      <figure className="relative overflow-hidden rounded-md border border-white/20">
        <Image src="/car-hauler.webp" width={1672} height={941}
          alt="An open two-level car hauler carrying vehicles on a highway"
          className="aspect-video w-full object-cover"
          sizes="(min-width: 1200px) 600px, (min-width: 768px) 52vw, 95vw"
          preload />
        <figcaption className="absolute bottom-0 right-0 bg-slate-950/85 px-3 py-1 text-xs text-white">Industry illustration</figcaption>
      </figure>
    </div></section>
    <section className="shell py-12" aria-labelledby="paths">
      <h2 id="paths" className="display mb-6 text-3xl uppercase sm:text-4xl">Find your driving path</h2>
      <div className="grid gap-4 md:grid-cols-2">{Object.values(tracks).map(item =>
        <article className="panel rail" key={item.slug}>
          <h3 className="text-2xl font-extrabold">{item.label}</h3>
          <p className="my-3 max-w-lg text-slate-700">{item.description}</p>
          <Link className="font-bold underline" href={'/' + item.slug}>Explore {item.label.toLowerCase()}</Link>
        </article>
      )}</div>
    </section>
  </>;
}
