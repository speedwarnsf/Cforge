interface TestConceptOptions {
  prompt?: string;
  tone?: string;
  requireAllSections?: boolean;
  export?: {
    target: "googleDocs";
    shareWith: string;
  };
  returnLink?: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue?: any): any => {
  const index = args.findIndex(arg => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (index !== -1) {
    const arg = args[index];
    if (arg.includes('=')) {
      return arg.split('=')[1];
    }
    if (args[index + 1] && !args[index + 1].startsWith('--')) {
      return args[index + 1];
    }
    return true;
  }
  return defaultValue;
};

async function generateTestConcept(options: TestConceptOptions = {}) {
  // Parse CLI arguments
  const prompt = getArg('prompt', options.prompt || 'Sustainable sneakers made from ocean plastic');
  const tone = getArg('tone', options.tone || 'creative').toLowerCase();
  const requireAllSections = getArg('requireAllSections', options.requireAllSections || false);
  
  console.log("🚀 Generating test concept using server endpoint...");
  console.log(`Prompt: ${prompt}`);
  console.log(`Tone: ${tone}`);
  console.log(`Require all sections: ${requireAllSections}`);
  
  const testPrompt = prompt;
  const testTone = tone;
  
  try {
    // Use the existing server endpoint
    const response = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testPrompt,
        tone: testTone
      })
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const result = await response.json();
    
    console.log("Concept generated successfully via server!");
    console.log(`📊 Response length: ${result.content?.length || 0} characters`);
    console.log(`🆔 Concept ID: ${result.id || 'not provided'}`);
    
    // Show preview
    if (result.content) {
      console.log("\n📋 Generated Concept Preview:");
      console.log("=".repeat(50));
      console.log(result.content.substring(0, 300) + "...");
      console.log("=".repeat(50));
    }

    // If export requested, show export command
    if (options.export?.target === "googleDocs") {
      console.log("\n📤 Export to Google Docs:");
      console.log(`npx tsx exportSingleConceptToGoogleDoc.ts --specificId=${result.id} --cleanFormatting --enableHangingBullets --sentenceCaseAll --singleParagraphBody`);
    }

    if (options.returnLink && result.id) {
      console.log(`\n🔗 Direct export command:`);
      console.log(`npx tsx exportSingleConceptToGoogleDoc.ts --specificId=${result.id} --cleanFormatting --enableHangingBullets --sentenceCaseAll --singleParagraphBody`);
    }

    return result;

  } catch (error) {
    console.error("Generation failed:", error);
    
    // Fallback: show manual generation command
    console.log("\n🔧 Alternative: Generate manually in the web app:");
    console.log("1. Open http://localhost:5000");
    console.log("2. Enter prompt: 'Sustainable sneakers made from ocean plastic'");
    console.log("3. Select tone: Creative");
    console.log("4. Click 'Forge' to generate");
    console.log("5. Use the export commands from the console logs");
    
    return null;
  }
}

// Run the test generation
generateTestConcept({
  export: { target: "googleDocs", shareWith: "dustinyork15@gmail.com" },
  returnLink: true
}).catch(console.error);