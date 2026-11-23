'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="shell py-12"><h1 className="display text-4xl">This page is temporarily unavailable.</h1>
    <button className="button mt-5" onClick={reset}>Try again</button></section>;
}
