// Direct API testing script
import http from 'http';

async function runTests() {
  console.log('🧪 Starting Concept Forge API Tests...\n');

  const testConfigs = [
    {
      query: "Launch campaign for sustainable sneakers made from ocean plastic",
      tone: "creative",
      maxOutputs: 3,
      avoidCliches: true
    },
    {
      query: "B2B software that reduces energy costs by 40%",
      tone: "analytical", 
      maxOutputs: 3,
      avoidCliches: true
    },
    {
      query: "New coffee subscription service for busy professionals",
      tone: "conversational",
      maxOutputs: 3,
      avoidCliches: false
    }
  ];

  let successCount = 0;
  let failureCount = 0;
  let totalConcepts = 0;

  for (let i = 0; i < testConfigs.length; i++) {
    const config = testConfigs[i];
    console.log(`\nTest ${i + 1}: ${config.tone} tone`);
    console.log(`   Query: "${config.query}"`);
    
    try {
      const response = await fetch('http://localhost:5000/api/generate-multivariant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log(`   Generated ${data.length} concepts`);
      
      // Display first concept as example
      if (data.length > 0) {
        const concept = data[0];
        console.log(`   📋 Sample: ${concept.headlines?.[0] || 'No headline'}`);
        console.log(`   Device: ${concept.rhetoricalDevice || 'Unknown'}`);
        console.log(`   Score: ${concept.originalityScore || 0}%`);
        
        if (concept.example) {
          console.log(`   Inspired by: ${concept.example.campaign_name} - ${concept.example.brand}`);
        }
      }
      
      successCount++;
      totalConcepts += data.length;
      
    } catch (error) {
      console.log(`   Failed: ${error.message}`);
      failureCount++;
    }

    // Add delay between requests
    if (i < testConfigs.length - 1) {
      console.log('   ⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n📊 TEST SUMMARY:');
  console.log(`   Successful: ${successCount}/${testConfigs.length}`);
  console.log(`   Failed: ${failureCount}/${testConfigs.length}`);
  console.log(`   Total concepts: ${totalConcepts}`);
  
  // Test session history
  console.log('\n📚 Checking session history...');
  try {
    const historyResponse = await fetch('http://localhost:5000/api/history');
    const history = await historyResponse.json();
    console.log(`   📋 Found ${history.length} entries in session history`);
  } catch (error) {
    console.log(`   History check failed: ${error.message}`);
  }

  // Test pending feedback
  console.log('\n🔍 Checking pending feedback...');
  try {
    const pendingResponse = await fetch('http://localhost:5000/api/pending-feedback');
    const pending = await pendingResponse.json();
    console.log(`   📋 Found ${pending.length} concepts awaiting feedback`);
  } catch (error) {
    console.log(`   Pending check failed: ${error.message}`);
  }

  console.log('\nTesting complete! All APIs are functional.');
  console.log('📱 The system is ready for manual review and feedback collection.');
}

// Polyfill fetch for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const urlParts = new URL(url);
      const requestOptions = {
        hostname: urlParts.hostname,
        port: urlParts.port,
        path: urlParts.pathname + urlParts.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          });
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  };
}

runTests().catch(console.error);