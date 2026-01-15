import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Database, Users } from "lucide-react";

export default function CorpusDownload() {
  const handleDownload = () => {
    window.open('/api/download/corpus', '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Retrieval Corpus Package</h1>
        <p className="text-lg text-muted-foreground">
          Complete collection of 157 award-winning advertising campaigns for AI-powered creative ideation
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Download Complete Package
          </CardTitle>
          <CardDescription>
            Ready-to-use corpus package with multiple formats for analysis and collaboration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Package Contents</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span><strong>retrieval-corpus.json</strong> - Structured database format</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-500" />
                  <span><strong>retrieval-corpus-export.csv</strong> - Spreadsheet analysis format</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span><strong>retrieval-corpus-readable.md</strong> - Human-readable documentation</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <span><strong>Documentation & Templates</strong> - Analysis reports and contribution guides</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Key Statistics</h3>
              <ul className="space-y-2 text-sm">
                <li><strong>157 campaigns</strong> spanning 1999-2020</li>
                <li><strong>129 unique brands</strong> (Nike, Apple, Google, etc.)</li>
                <li><strong>54 rhetorical devices</strong> catalogued</li>
                <li><strong>Award-winning quality</strong> (Cannes Lions, D&AD)</li>
                <li><strong>Global coverage</strong> across multiple industries</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <Button onClick={handleDownload} size="lg" className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Download Corpus Package (40KB)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">For Researchers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Study award-winning campaigns with detailed rhetorical analysis. Perfect for academic research and strategic insights.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">For Agencies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enhance your creative briefs with proven campaign examples. CSV format ready for team analysis and collaboration.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">For Developers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              JSON structure ready for AI integration. Include template for adding new campaigns to expand the corpus.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaboration Ready
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The package includes contribution templates and quality standards for expanding the corpus with your agency's award-winning campaigns.
          </p>
          <div className="text-xs text-muted-foreground">
            <strong>Next Phase Goals:</strong> Expand to 200+ campaigns with recent winners (2021-2025), digital-native brands, and enhanced global representation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}