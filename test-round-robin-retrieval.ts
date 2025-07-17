/**
 * Test Round-Robin Retrieval System
 * Demonstrates how the enhanced retrieval system serves different pairs
 * for subsequent requests with the same prompt
 */

import fetch from "node-fetch";

const testPrompt = "Eco-friendly electric vehicle charging station";

async function testRoundRobinRetrieval() {
  console.log("🧪 Testing Round-Robin Retrieval System");
  console.log("==========================================");
  console.log(`Test Prompt: "${testPrompt}"`);
  console.log("Expected Behavior: Different retrieval pairs for each request\n");

  for (let i = 1; i <= 6; i++) {
    console.log(`🔄 Request ${i}/6...`);
    
    try {
      const response = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: testPrompt,
          tone: "creative",
          conceptCount: 1,
          includeCliches: false,
          deepScan: false
        })
      });

      const data = await response.json();
      
      // Extract retrieval references from response
      const retrievalBlock = data.content?.match(/Retrieved Reference[^]*?(?=\n\n|\*\*HEADLINE)/)?.[0] || "None found";
      
      console.log(`✅ Request ${i} completed`);
      console.log(`📊 Retrieval References:`);
      console.log(retrievalBlock.substring(0, 200) + "...\n");
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Request ${i} failed:`, error.message);
    }
  }
  
  console.log("🏁 Round-Robin Test Complete");
  console.log("Expected: First 5 requests should show sequential pairs (1,2,3,4,5)");
  console.log("Expected: 6th request should show random selection from top 10");
}

// Run the test
testRoundRobinRetrieval().catch(console.error);