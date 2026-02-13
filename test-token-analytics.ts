/**
 * TEST TOKEN USAGE AND COST ANALYTICS IN GENERATEAIRESPONSE
 * Validates restored token tracking with detailed logging
 */

import { generateAiResponse } from './server/services/openai.js';

async function testTokenAnalytics() {
  console.log('🧪 TESTING TOKEN USAGE AND COST ANALYTICS');
  console.log('==========================================');

  try {
    console.log('📋 Generating test concept with token tracking...');
    
    const testRequest = {
      query: 'Create a campaign for sustainable coffee pods made from seaweed',
      tone: 'creative',
      includeCliches: false,
      deepScan: false,
      conceptCount: 1
    };

    console.log(`Test query: "${testRequest.query}"`);
    console.log(`Test tone: ${testRequest.tone}`);
    console.log('');

    const response = await generateAiResponse(testRequest);

    console.log('GENERATION COMPLETE - ANALYZING RESPONSE:');
    console.log('===========================================');
    
    const concept = response.concepts[0];
    
    console.log(`📊 Response Structure:`);
    console.log(`- Content length: ${concept.content.length} characters`);
    console.log(`- Visual prompt: ${concept.visualPrompt ? 'Generated' : 'Missing'}`);
    console.log(`- Tokens used: ${concept.tokens}`);
    console.log(`- Processing time: ${concept.processingTime}`);
    console.log(`- Rhetorical device: ${concept.rhetoricalDevice || 'Not specified'}`);
    console.log(`- Cost field present: ${concept.cost !== undefined ? 'Yes' : 'No'}`);
    
    if (concept.cost !== undefined) {
      console.log(`💰 Cost analysis:`);
      console.log(`- Individual concept cost: $${concept.cost}`);
      console.log(`- Cost per token: $${(concept.cost / concept.tokens).toFixed(6)}`);
    }

    console.log(`\nBatch Analysis:`);
    console.log(`- Total concepts: ${response.concepts.length}`);
    console.log(`- Total tokens: ${response.totalTokens}`);
    console.log(`- Total processing time: ${response.totalProcessingTime}`);
    console.log(`- Batch ID: ${response.batchId}`);

    // Validate token tracking implementation
    console.log(`\nVALIDATION RESULTS:`);
    const tokenFieldPresent = concept.tokens > 0;
    const costFieldPresent = concept.cost !== undefined && concept.cost > 0;
    const validCostCalculation = concept.cost && concept.cost > 0 && concept.cost < 1; // Should be small for single concept
    
    console.log(`- Token tracking: ${tokenFieldPresent ? 'WORKING' : 'MISSING'}`);
    console.log(`- Cost field: ${costFieldPresent ? 'PRESENT' : 'MISSING'}`);
    console.log(`- Cost calculation: ${validCostCalculation ? 'REASONABLE' : 'INVALID'}`);
    
    if (tokenFieldPresent && costFieldPresent && validCostCalculation) {
      console.log(`\n🏆 TOKEN ANALYTICS RESTORATION: SUCCESS`);
      console.log(`All token usage and cost tracking features are working correctly!`);
    } else {
      console.log(`\nTOKEN ANALYTICS: ISSUES DETECTED`);
      console.log(`Some tracking features may need adjustment.`);
    }

  } catch (error) {
    console.error('TEST FAILED:', error);
    console.log('This indicates an issue with the token analytics implementation.');
  }
}

// Run the test
testTokenAnalytics().catch(console.error);