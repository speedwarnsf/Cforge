/**
 * Simple test of multivariant generation with minimal parameters
 */

async function testMultivariantSimple() {
  console.log('🧪 Testing simple multivariant generation...');
  
  try {
    const response = await fetch('http://localhost:5000/api/generate-multivariant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: "Water bottles that save the ocean",
        tone: "creative",
        maxOutputs: 1,
        avoidCliches: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Response received');
    console.log('📊 Results count:', data.concepts?.length || 0);
    
    if (data.concepts && data.concepts.length > 0) {
      const concept = data.concepts[0];
      console.log('📋 First concept:');
      console.log('  Visual:', concept.visualDescription?.substring(0, 100) + '...');
      console.log('  Headlines:', concept.headlines);
      console.log('  Device:', concept.rhetoricalDevice);
      console.log('  Score:', concept.originalityScore);
    } else {
      console.log('❌ No concepts generated');
      console.log('Raw response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMultivariantSimple();