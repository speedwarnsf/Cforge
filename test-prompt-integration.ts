// Test the prompt loader integration without the .js extension issue
import { loadPrompt } from "./server/utils/promptLoader";

console.log('🧪 Testing Prompt Loader Integration...\n');

try {
  // Test basic prompt loading
  const singlePrompt = loadPrompt("single-concept-generation.txt", {
    clicheGuidance: "Avoid overused language",
    deviceNames: "metaphor, hyperbole",
    userQuery: "Test campaign",
    tone: "creative", 
    rhetoricalDevice: "metaphor"
  });

  console.log('Single concept prompt loaded');
  console.log(`Length: ${singlePrompt.length} characters`);
  console.log(`🔍 Contains requirements: ${singlePrompt.includes('ABSOLUTE HEADLINE') ? 'Yes' : 'No'}`);

  // Test modular component loading
  const clicheAvoidance = loadPrompt("cliche-avoidance.txt", {});
  console.log(`Cliche avoidance loaded: ${clicheAvoidance.length} characters`);

  const formatInstructions = loadPrompt("format-instructions.txt", {
    currentDate: "July 10, 2025",
    tone: "creative",
    userQuery: "Test"
  });
  console.log(`Format instructions loaded: ${formatInstructions.length} characters`);

  console.log('\n🎉 Prompt loader system is ready for production!');
  
} catch (error) {
  console.error('Test failed:', error);
}