// Quick export runner that processes in smaller batches to avoid timeout
import { exportAllHistoryToGoogleDoc } from './exportAllHistoryToGoogleDoc.js';

async function runQuickExport() {
  try {
    console.log('🚀 Starting enhanced Google Docs export...');
    const url = await exportAllHistoryToGoogleDoc();
    console.log('✅ Google Docs export complete with clean formatting.');
    console.log(`📄 Document URL: ${url}`);
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    console.log('Document may still be partially created. Check Google Drive.');
  }
}

runQuickExport();