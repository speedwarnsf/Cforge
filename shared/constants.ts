export const exampleQueries = [
  {
    query: 'Luxury EV launch: billboard concept for impact',
    tone: "creative" as const,
    description: "Bold Concepting"
  },
  {
    query: 'Make solar sound smart: logic-led benefits',
    tone: "analytical" as const,
    description: "Strategic Persuasion"
  },
  {
    query: 'Rebrand learning: fun, social, sticky copy',
    tone: "conversational" as const,
    description: "Conversational Hook"
  },
  {
    query: 'Cybersecurity pitch: make it human, not jargon',
    tone: "technical" as const,
    description: "Simplified Systems"
  },
  {
    query: 'Consulting: distill the transformation into 5 words',
    tone: "summarize" as const,
    description: "Core Idea Finder"
  }
];

export type ExampleQuery = typeof exampleQueries[0];