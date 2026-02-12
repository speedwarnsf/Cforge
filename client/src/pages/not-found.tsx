import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900" role="main">
      <div className="text-center space-y-4 px-4">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-white">404 — Page Not Found</h1>
        <p className="text-sm text-gray-400 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button className="mt-4" aria-label="Return to the ConceptForge home page">
            Back to ConceptForge
          </Button>
        </Link>
      </div>
    </div>
  );
}
