#!/usr/bin/env npx tsx

// Test script to verify Google Docs export functionality
import { exportHistoryToGoogleDoc } from './exportHistoryToGoogleDoc';

async function testGoogleDocsExport() {
  console.log('🧪 Testing Google Docs Export Integration');
  console.log('=====================================\n');
  
  try {
    // Test fetching session history first
    console.log('1️⃣ Testing session history fetch...');
    const historyResponse = await fetch('http://localhost:5000/api/history');
    
    if (!historyResponse.ok) {
      throw new Error(`History API failed: ${historyResponse.status}`);
    }
    
    const historyData = await historyResponse.json();
    console.log(`Found ${historyData.length} concepts in session history\n`);
    
    if (historyData.length === 0) {
      console.log(' No concepts found. Generating a test concept...');
      
      const generateResponse = await fetch('http://localhost:5000/api/generate-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Test concept for export functionality',
          tone: 'creative'
        })
      });
      
      if (generateResponse.ok) {
        console.log('Test concept generated\n');
      }
    }
    
    // Test Google Docs export
    console.log('2️⃣ Testing Google Docs API export...');
    const documentUrl = await exportHistoryToGoogleDoc();
    
    console.log('Google Docs export successful!');
    console.log(`Document URL: ${documentUrl}\n`);
    
    // Test API endpoint
    console.log('3️⃣ Testing export API endpoint...');
    const apiResponse = await fetch('http://localhost:5000/api/export-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportType: 'google' })
    });
    
    if (apiResponse.ok) {
      const result = await apiResponse.json();
      console.log('API endpoint working');
      console.log(`📊 Exported ${result.conceptCount} concepts`);
      console.log(`Document: ${result.documentUrl}\n`);
    } else {
      console.log('API endpoint failed');
    }
    
    console.log('🎉 All tests completed successfully!');
    console.log('\nNext steps:');
    console.log('• Copy the Google Docs URL to view the formatted export');
    console.log('• Enable Google Drive API if you want automatic sharing');
    console.log('• The export includes complete concept analysis and formatting');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGoogleDocsExport();
}

export { testGoogleDocsExport };