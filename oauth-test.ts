import { google } from "googleapis";

if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET || !process.env.AUTH_CODE) {
  console.log("❌ Please provide GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and AUTH_CODE environment variables");
  console.log("📝 Usage: AUTH_CODE='code' npx tsx oauth-test.ts");
  process.exit(1);
}

(async () => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob"
    );

    console.log("🔐 Getting tokens...");
    const { tokens } = await oauth2Client.getToken(process.env.AUTH_CODE);
    oauth2Client.setCredentials(tokens);

    console.log("📄 Creating test document...");
    const docs = google.docs({ version: "v1", auth: oauth2Client });
    const res = await docs.documents.create({
      requestBody: { title: "Concept Forge OAuth Test Document" },
    });

    console.log("✅ SUCCESS! Document created:");
    console.log("📄 Document ID:", res.data.documentId);
    console.log("🔗 Document URL:", `https://docs.google.com/document/d/${res.data.documentId}/edit`);
    
    // Store tokens for future use
    console.log("💾 Save these tokens for future use:");
    console.log("ACCESS_TOKEN:", tokens.access_token);
    console.log("REFRESH_TOKEN:", tokens.refresh_token);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
})();