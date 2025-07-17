#!/usr/bin/env npx tsx

import { google } from "googleapis";

async function testGoogleCredentials() {
  try {
    console.log("🔐 Testing Google API credentials...");
    
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: [
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive"
      ]
    });

    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    console.log("📂 Testing Drive API access...");
    const driveRes = await drive.files.list({ pageSize: 1 });
    console.log("✅ Drive API working:", driveRes.status === 200);

    console.log("📄 Testing Docs API access...");
    // Test creating a simple document
    const testDoc = await docs.documents.create({
      requestBody: {
        title: "API Test Document - " + new Date().toISOString()
      }
    });
    console.log("✅ Docs API working:", testDoc.status === 200);
    console.log("📄 Test document ID:", testDoc.data.documentId);

    // Clean up test document
    if (testDoc.data.documentId) {
      await drive.files.delete({ fileId: testDoc.data.documentId });
      console.log("🗑️ Test document deleted");
    }

    console.log("✅ All Google API credentials verified successfully!");
    return true;
  } catch (error) {
    console.error("❌ Google API credentials test failed:", error);
    return false;
  }
}

testGoogleCredentials().catch(console.error);