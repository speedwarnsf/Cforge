import { generateMultivariantPrompt } from "./server/utils/openAiPromptHelper";

// Test the new Markdown format prompt
const testPrompt = generateMultivariantPrompt({
  rhetoricalDevice: "metaphor",
  secondRhetoricalDevice: "hyperbole", 
  userQuery: "Test concept for sustainable sneakers made from ocean plastic",
  tone: "creative",
  avoidCliches: true,
  rhetoricalExample: null,
  salvagedFragments: []
});

console.log("Generated prompt for Markdown format:");
console.log("=".repeat(60));
console.log(testPrompt);
console.log("=".repeat(60));