#!/usr/bin/env npx tsx

import { exportAllHistoryToGoogleDoc } from './exportAllHistoryToGoogleDoc-simple.ts';

async function runExport() {
  try {
    console.log('🚀 Starting Concept Forge export with improved formatting...');
    const documentUrl = await exportAllHistoryToGoogleDoc();
    console.log(`✅ Export completed with professional styling!`);
    console.log(`📄 Document URL: ${documentUrl}`);
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

runExport();