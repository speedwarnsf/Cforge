/**
 * create-doc.ts
 *
 * Minimal working example to verify correct OAuth scopes.
 * Paste this into Replit, set GOOGLE_SERVICE_ACCOUNT_KEY in your secrets,
 * and run with: npx tsx create-doc.ts
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');

    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents'
      ],
    });

    const docs = google.docs({ version: 'v1', auth });

    const res = await docs.documents.create({
      requestBody: {
        title: '✅ Test Document Created from Replit'
      }
    });

    console.log(`✅ Document created successfully!`);
    console.log(`📝 Document ID: ${res.data.documentId}`);
    console.log(`🔗 URL: https://docs.google.com/document/d/${res.data.documentId}/edit`);

  } catch (error) {
    console.error('❌ Error creating document:', error);
  }
})();