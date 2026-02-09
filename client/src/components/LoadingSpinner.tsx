import { Loader2 } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm text-slate-400">Loading ConceptForge...</p>
      </div>
    </div>
  );
}