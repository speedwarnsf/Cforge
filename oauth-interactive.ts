import { google } from "googleapis";

console.log("🔐 OAuth Setup for Google Docs API");
console.log("📋 You need to provide your OAuth credentials manually");
console.log("");
console.log("🔗 1. Go to Google Cloud Console");
console.log("🔗 2. Create OAuth 2.0 credentials");  
console.log("🔗 3. Copy the Client ID and Client Secret");
console.log("");
console.log("Then run this script with your credentials:");
console.log("CLIENT_ID='your_client_id' CLIENT_SECRET='your_client_secret' npx tsx oauth-interactive.ts");
console.log("");

if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
  console.log("Please provide GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

const scopes = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive"
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
});

console.log("🌐 Open this URL in your browser:");
console.log(authUrl);
console.log("");
console.log("After authorizing, you'll get a code");
console.log("🔄 Then run: AUTH_CODE='your_auth_code' CLIENT_ID='your_client_id' CLIENT_SECRET='your_client_secret' npx tsx oauth-test.ts");