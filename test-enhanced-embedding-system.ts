// Test the enhanced embedding similarity system with sanitization
import { 
  sanitizeText, 
  generateAiResponse, 
  checkConceptDiversity 
} from "./server/utils/embeddingSimilarity";

console.log('🧪 Testing Enhanced Embedding System with Sanitization...\n');

async function testSanitization() {
  console.log('🔧 Testing Text Sanitization:');
  
  const testTexts = [
    'Smart "quotes" and \'apostrophes\'',
    'Non-breaking\u00A0spaces and\u0009tabs',
    'Control\u0008characters\u001Fremoved',
    '  Multiple   spaces    normalized  '
  ];
  
  testTexts.forEach((text, i) => {
    const sanitized = sanitizeText(text);
    console.log(`  ${i + 1}. "${text}" → "${sanitized}"`);
  });
}

async function testConceptGeneration() {
  console.log('\n🎯 Testing Concept Generation with Diversity:');
  
  try {
    const concepts = await generateAiResponse({
      prompt: "Generate 3 short advertising concepts for sustainable sneakers",
      maxAttempts: 2,
      similarityThreshold: 0.8
    });
    
    console.log(`✅ Generated ${concepts.length} concepts:`);
    concepts.forEach((concept, i) => {
      console.log(`  ${i + 1}. ${concept.substring(0, 80)}...`);
    });
    
  } catch (error) {
    console.error('❌ Concept generation failed:', error);
  }
}

async function testDiversityCheck() {
  console.log('\n🔍 Testing Diversity Check:');
  
  const testConcepts = [
    "Ocean plastic becomes premium footwear",
    "Marine waste transforms into sustainable shoes", 
    "Revolutionary bamboo phone case design"
  ];
  
  try {
    const isDiverse = await checkConceptDiversity(testConcepts, 0.85);
    console.log(`${isDiverse ? '✅' : '❌'} Diversity check result: ${isDiverse}`);
  } catch (error) {
    console.error('❌ Diversity check failed:', error);
  }
}

// Run all tests
async function runTests() {
  await testSanitization();
  await testConceptGeneration();
  await testDiversityCheck();
  console.log('\n🎉 Enhanced embedding system testing complete!');
}

runTests().catch(console.error);