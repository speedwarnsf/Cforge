#!/usr/bin/env npx tsx

// Demo script showcasing complete export functionality
console.log('CONCEPT FORGE EXPORT DEMO');
console.log('============================\n');

async function demoExportFunctionality() {
  try {
    // 1. Check current session history
    console.log('1️⃣ Checking current session history...');
    const historyResponse = await fetch('http://localhost:5000/api/history');
    const historyData = await historyResponse.json();
    console.log(`   Found ${historyData.length} concepts ready for export\n`);

    // 2. Demo Google Docs export via API
    console.log('2️⃣ Testing Google Docs export via API...');
    const googleExportResponse = await fetch('http://localhost:5000/api/export-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportType: 'google' })
    });

    if (googleExportResponse.ok) {
      const googleResult = await googleExportResponse.json();
      console.log(`   Google Docs export successful!`);
      console.log(`   Document URL: ${googleResult.documentUrl}`);
      console.log(`   📊 Exported ${googleResult.conceptCount} concepts\n`);
    } else {
      console.log('   Google Docs export failed\n');
    }

    // 3. Demo local file export via API
    console.log('3️⃣ Testing local file export via API...');
    const localExportResponse = await fetch('http://localhost:5000/api/export-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportType: 'local' })
    });

    if (localExportResponse.ok) {
      const localResult = await localExportResponse.json();
      console.log(`   Local file export successful!`);
      console.log(`   File: ${localResult.filename}`);
      console.log(`   📊 Exported ${localResult.conceptCount} concepts\n`);
    } else {
      console.log('   Local file export failed\n');
    }

    // 4. Summary
    console.log('🎉 EXPORT FUNCTIONALITY DEMO COMPLETE');
    console.log('=====================================\n');
    console.log('Available Export Methods:');
    console.log('   • Google Docs API integration (automatic document creation)');
    console.log('   • Local file export (ready for manual Google Docs import)');
    console.log('   • Programmatic API endpoints for both methods\n');
    
    console.log('Export Features:');
    console.log('   • Complete concept analysis with rhetorical breakdown');
    console.log('   • Professional formatting with clear section headers');
    console.log('   • Automatic timestamping and metadata');
    console.log('   • Primary/Secondary rhetorical device analysis');
    console.log('   • Strategic impact assessments\n');

    console.log('Ready for Use:');
    console.log('   • Run: npx tsx exportHistoryToGoogleDoc.ts');
    console.log('   • API: POST /api/export-history {"exportType": "google"}');
    console.log('   • API: POST /api/export-history {"exportType": "local"}');

  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Run demo
demoExportFunctionality();