#!/usr/bin/env npx tsx

import { google } from "googleapis";

async function testDocsCreation() {
  try {
    console.log("🔐 Testing Google Docs API with service account...");
    
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    console.log("📧 Service account email:", creds.client_email);
    
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: [
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive"
      ]
    });

    const docs = google.docs({ version: "v1", auth });
    
    console.log("📄 Attempting to create test document...");
    const res = await docs.documents.create({
      requestBody: { title: "Test Document From Script" }
    });
    
    console.log("✅ SUCCESS! Document created:");
    console.log("📄 Document ID:", res.data.documentId);
    console.log("🔗 Document URL:", `https://docs.google.com/document/d/${res.data.documentId}/edit`);
    
    // Clean up test document
    const drive = google.drive({ version: "v3", auth });
    await drive.files.delete({ fileId: res.data.documentId! });
    console.log("🗑️ Test document cleaned up");
    
    return true;
  } catch (error) {
    console.error("❌ Failed to create document:", error.message);
    return false;
  }
}

testDocsCreation().catch(console.error);