import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <p className="label text-brass-400">Not found</p>
      <h1 className="display text-6xl text-parchment-50">Beyond the Walls.</h1>
      <p className="prose-story">There&apos;s nothing at this address.</p>
      <Link to="/" className="btn btn-ghost self-start">
        Back inside →
      </Link>
    </div>
  );
}
