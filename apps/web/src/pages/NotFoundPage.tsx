import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <p className="label">Not found</p>
      <h1 className="text-3xl font-semibold">There&apos;s nothing at this address.</h1>
      <Link to="/" className="text-brass-300 hover:underline">
        Back to the start →
      </Link>
    </div>
  );
}
