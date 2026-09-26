import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <span className="ribbon self-start">Not found</span>
      <h1 className="gothic text-7xl text-bone">Beyond the Walls.</h1>
      <p className="prose-story">There&apos;s nothing at this address.</p>
      <Link to="/" className="btn btn-ghost self-start">
        Back inside →
      </Link>
    </div>
  );
}
