import Link from "next/link";
import { Mark } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <Mark size={44} />
      <h1 className="font-display text-[32px] font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted">That project or page doesn’t exist, or it isn’t yours.</p>
      <Link href="/projects" className="inline-flex items-center h-10 px-4 rounded-[10px] bg-ink text-bg text-sm font-medium hover:opacity-90">Back to projects</Link>
    </div>
  );
}
