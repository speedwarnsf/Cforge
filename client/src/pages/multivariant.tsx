import ConceptForgeHeroSection from "@/components/ConceptForgeHeroSection";
import ConceptForgeIdeationSection from "@/components/ConceptForgeIdeationSection";
import MultivariantGenerator from "@/components/MultivariantGenerator";
import { useVideo } from "@/hooks/use-video";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function MultivariantPage() {
  const { playForgeAnimation } = useVideo();

  const triggerForgeAnimation = async () => {
    // This will be called by the Multi-Variant generator when forge is clicked
    await playForgeAnimation();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* Concept Forge Hero Section */}
      <ConceptForgeHeroSection />

      {/* Concept Forge Ideation Section */}
      <ConceptForgeIdeationSection onSubmit={triggerForgeAnimation} />

      {/* Results Area with Original Multivariant Generator */}
      <div id="results-area" className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Multi-Variant Concept Generation</h2>
            <p className="text-gray-400">Generate multiple concept variations with advanced AI analysis</p>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
            <MultivariantGenerator onSubmit={triggerForgeAnimation} />
          </div>
        </div>
      </div>

      {/* Admin Navigation - Fixed Position */}
      <div className="fixed right-4 top-4 flex gap-2 z-50">
        <Link href="/test-admin">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-1 border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white transition-all bg-black/80"
          >
            Test
          </Button>
        </Link>
        <Link href="/review">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-1 border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white transition-all bg-black/80"
          >
            Review
          </Button>
        </Link>
      </div>
    </div>
  );
}