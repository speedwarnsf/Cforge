import { loadPrompt } from "./server/utils/promptLoader";

async function testPromptLoader() {
  console.log('🧪 Testing Prompt Loader System...\n');

  try {
    // Test 1: Basic prompt loading and variable replacement
    console.log('Test 1: Basic Single Concept Generation Prompt');
    const singlePrompt = loadPrompt("single-concept-generation.txt", {
      clicheGuidance: "Avoid all overused marketing language",
      deviceNames: "metaphor, hyperbole, anaphora",
      userQuery: "Sustainable sneakers made from ocean plastic", 
      tone: "creative",
      rhetoricalDevice: "metaphor"
    });

    console.log('Single concept prompt loaded successfully');
    console.log(`Length: ${singlePrompt.length} characters\n`);

    // Test 2: Multivariant generation with complex variables
    console.log('Test 2: Multivariant Generation with Variables');
    const multiPrompt = loadPrompt("multivariant-generation.txt", {
      exampleContext: "**Example Campaign Context:**\nCampaign: Nike Air Max\nHeadline: Just Do It",
      inspirationFragments: "**Inspiration Fragments:**\n- Fragment: \"Ocean's gift to feet\"",
      userQuery: "AI-powered meal planning app for busy families",
      rhetoricalDevice: "anaphora", 
      secondRhetoricalDevice: "hyperbole",
      clicheAvoidance: loadPrompt("cliche-avoidance.txt", {}),
      formatInstructions: loadPrompt("format-instructions.txt", {
        currentDate: new Date().toLocaleDateString(),
        tone: "conversational",
        userQuery: "AI-powered meal planning app"
      })
    });

    console.log('Multivariant prompt loaded successfully');
    console.log(`Length: ${multiPrompt.length} characters`);
    console.log(`🔍 Contains cliche avoidance: ${multiPrompt.includes('BANNED EMPOWERMENT') ? 'Yes' : 'No'}`);
    console.log(`🔍 Contains format instructions: ${multiPrompt.includes('OUTPUT REQUIREMENTS') ? 'Yes' : 'No'}\n`);

    // Test 3: Concept regeneration prompt
    console.log('Test 3: Concept Regeneration Prompt');
    const regenPrompt = loadPrompt("concept-regeneration.txt", {
      originalPrompt: "Launch campaign for sustainable sneakers",
      tone: "analytical",
      strictRequirements: "STRICT REQUIREMENTS:\n- Headlines must be 2-6 words maximum",
      allSectionsRequired: "ALL SECTIONS REQUIRED:\n- Every section must be completed",
      currentDate: new Date().toLocaleDateString()
    });

    console.log('Regeneration prompt loaded successfully');
    console.log(`Length: ${regenPrompt.length} characters\n`);

    // Test 4: Modular component loading
    console.log('Test 4: Modular Component Loading');
    const clicheAvoidance = loadPrompt("cliche-avoidance.txt", {});
    const formatInstructions = loadPrompt("format-instructions.txt", {
      currentDate: "July 10, 2025",
      tone: "creative", 
      userQuery: "Test query"
    });

    console.log(`Cliche avoidance loaded: ${clicheAvoidance.length} characters`);
    console.log(`Format instructions loaded: ${formatInstructions.length} characters`);
    console.log(`🔍 Cliche avoidance contains forbidden words: ${clicheAvoidance.includes('BANNED EMPOWERMENT') ? 'Yes' : 'No'}`);
    console.log(`🔍 Format instructions contains requirements: ${formatInstructions.includes('OUTPUT REQUIREMENTS') ? 'Yes' : 'No'}\n`);

    console.log('🎉 All prompt loader tests completed successfully!');
    
  } catch (error) {
    console.error('Prompt loader test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPromptLoader().then(() => {
  console.log('\nPrompt loader system is ready for integration!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});