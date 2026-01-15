import { loadPrompt } from './promptLoader';

interface SalvagedFragment {
  id: string;
  fragment_text: string;
  rationale: string;
  fragment_type: string;
}

interface PromptHelperParams {
  rhetoricalDevice: string;
  secondRhetoricalDevice: string;
  userQuery: string;
  tone?: string;
  avoidCliches: boolean;
  rhetoricalExample?: any;
  semanticExample?: any; // From comprehensive retrieval corpus
  salvagedFragments?: SalvagedFragment[];
}

export function generateMultivariantPrompt({
  rhetoricalDevice,
  secondRhetoricalDevice,
  userQuery,
  tone,
  avoidCliches,
  rhetoricalExample,
  semanticExample,
  salvagedFragments = []
}: PromptHelperParams): string {
  
  // **Step 4: Include rhetorical example context**
  const exampleContext = rhetoricalExample ? `
**RHETORICAL INSPIRATION - STUDY THIS BREAKTHROUGH CAMPAIGN:**
Campaign: ${rhetoricalExample.campaign_name || 'Unknown'}
Brand: ${rhetoricalExample.brand || 'Unknown'}
Year: ${rhetoricalExample.year || 'Unknown'}
Headline: ${rhetoricalExample.headline || 'Unknown'}
Verbal Device: ${rhetoricalExample.verbal_device || 'Unknown'}
Visual Device: ${rhetoricalExample.visual_device || 'Unknown'}
Tone: ${rhetoricalExample.tone || 'Unknown'}

Learn from this example's strategic craft, but create something completely original that surpasses it.

` : '';

  // **SEMANTIC CORPUS INTEGRATION: Include theoretical framework example**
  const semanticContext = semanticExample ? `
**THEORETICAL FRAMEWORK - MASTER THESE STRATEGIC PRINCIPLES:**
Campaign: ${semanticExample.campaign || 'Unknown'}
Brand: ${semanticExample.brand || 'Unknown'}
${semanticExample.year ? `Year: ${semanticExample.year}` : ''}
Headline: ${semanticExample.headline || 'Unknown'}
Rhetorical Devices: ${semanticExample.rhetoricalDevices?.join(', ') || 'Unknown'}
Strategic Rationale: ${semanticExample.rationale || 'Unknown'}
When to Use: ${semanticExample.whenToUse || 'Unknown'}
When NOT to Use: ${semanticExample.whenNotToUse || 'Unknown'}
${semanticExample.isTheory ? `**THEORETICAL INSIGHT:** This is an academic framework that provides deep strategic understanding of how rhetorical devices create persuasive impact.` : ''}

Apply these strategic principles to create breakthrough concepts that demonstrate mastery of rhetorical craft.

` : '';

  // Add salvaged fragments as inspiration
  const inspirationFragments = salvagedFragments && salvagedFragments.length > 0 ? `
**INSPIRATION FRAGMENTS - USE AS CREATIVE SPRINGBOARDS:**
${salvagedFragments.map(fragment => 
  `- Fragment: "${fragment.fragment_text}"
  Rationale: "${fragment.rationale}"`
).join('\n')}

Transform, reimagine, or use these proven elements as inspiration for fresh creative breakthroughs.

` : '';

  // Load cliche avoidance and format instructions as modular components
  const clicheAvoidance = avoidCliches ? loadPrompt("cliche-avoidance.txt", {}) : '';
  const formatInstructions = loadPrompt("format-instructions.txt", {
    currentDate: new Date().toLocaleDateString(),
    tone: tone || 'creative',
    userQuery: userQuery
  });

  // Load and compose the main prompt using the template system
  return loadPrompt("multivariant-generation.txt", {
    exampleContext,
    semanticContext,
    inspirationFragments,
    userQuery,
    rhetoricalDevice,
    secondRhetoricalDevice,
    clicheAvoidance,
    formatInstructions
  });
}