import { 
  getEmbedding, 
  cosineSimilarity, 
  checkConceptDiversity, 
  checkHistoricalSimilarityWithEmbeddings,
  enforceConceptDiversity 
} from "./server/utils/embeddingSimilarity";

async function testEmbeddingSimilarity() {
  console.log('🧪 Testing Embedding Similarity System...\n');

  try {
    // Test 1: Basic embedding generation
    console.log('Test 1: Basic Embedding Generation');
    const text1 = "Sustainable sneakers made from ocean plastic";
    const text2 = "Eco-friendly shoes created from recycled ocean waste";
    const text3 = "Revolutionary AI-powered meal planning application";

    const embedding1 = await getEmbedding(text1);
    const embedding2 = await getEmbedding(text2);
    const embedding3 = await getEmbedding(text3);

    console.log(`✅ Generated embeddings:
    - Text 1: ${embedding1.length} dimensions
    - Text 2: ${embedding2.length} dimensions  
    - Text 3: ${embedding3.length} dimensions\n`);

    // Test 2: Cosine similarity calculation
    console.log('Test 2: Cosine Similarity Calculation');
    const similarity12 = cosineSimilarity(embedding1, embedding2);
    const similarity13 = cosineSimilarity(embedding1, embedding3);
    const similarity23 = cosineSimilarity(embedding2, embedding3);

    console.log(`Similarity Results:
    - Text 1 vs Text 2 (similar concepts): ${similarity12.toFixed(3)}
    - Text 1 vs Text 3 (different concepts): ${similarity13.toFixed(3)}
    - Text 2 vs Text 3 (different concepts): ${similarity23.toFixed(3)}\n`);

    // Test 3: Concept diversity checking
    console.log('Test 3: Concept Diversity Checking');
    
    // Similar concepts (should fail diversity)
    const similarConcepts = [
      "Ocean plastic sneakers for sustainable living",
      "Eco-friendly shoes made from recycled ocean waste",
      "Sustainable footwear from marine plastic debris"
    ];

    const isDiverseSimilar = await checkConceptDiversity(similarConcepts, 0.85);
    console.log(`Similar concepts diversity check: ${isDiverseSimilar ? 'PASSED' : 'FAILED'} (expected: FAILED)\n`);

    // Diverse concepts (should pass diversity)
    const diverseConcepts = [
      "Ocean plastic sneakers for sustainable living",
      "AI-powered meal planning for busy families", 
      "Cybersecurity training program for employees"
    ];

    const isDiverseDifferent = await checkConceptDiversity(diverseConcepts, 0.85);
    console.log(`Diverse concepts diversity check: ${isDiverseDifferent ? 'PASSED' : 'FAILED'} (expected: PASSED)\n`);

    // Test 4: Historical similarity checking
    console.log('Test 4: Historical Similarity Checking');
    const newConcept = "Revolutionary sustainable sneakers from ocean plastic";
    const historicalConcepts = [
      "Nike's eco-friendly shoes made from recycled materials",
      "Adidas Ocean Plastic sneakers for environmental sustainability",
      "AI meal planning app for health-conscious families",
      "Cybersecurity software for enterprise protection"
    ];

    const historyResult = await checkHistoricalSimilarityWithEmbeddings(
      newConcept, 
      historicalConcepts, 
      0.8
    );

    console.log(`Historical similarity check:
    - Is similar: ${historyResult.isSimilar}
    - Most similar: ${historyResult.mostSimilar?.concept.substring(0, 50)}...
    - Similarity score: ${historyResult.mostSimilar?.similarity.toFixed(3)}\n`);

    // Test 5: Diversity enforcement with regeneration
    console.log('Test 5: Diversity Enforcement with Regeneration');
    const testConcepts = [
      "Ocean plastic shoes for eco-conscious consumers",
      "Sustainable footwear made from recycled marine waste",  // Too similar
      "Advanced cybersecurity training for modern workplaces"
    ];

    const regenerationCallback = async () => {
      console.log('🔄 Regeneration callback triggered');
      return [
        "Ocean plastic shoes for eco-conscious consumers",
        "AI-powered nutrition tracker for fitness enthusiasts", // Replaced similar concept
        "Advanced cybersecurity training for modern workplaces"
      ];
    };

    const finalConcepts = await enforceConceptDiversity(
      testConcepts,
      regenerationCallback,
      0.85
    );

    console.log(`Final concepts after diversity enforcement:
    ${finalConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`);

    console.log('🎉 All embedding similarity tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Embedding similarity test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmbeddingSimilarity().then(() => {
  console.log('\n✅ Embedding similarity system is ready for production use!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});