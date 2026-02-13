import { google } from "googleapis";
import open from "open";
import readline from "node:readline/promises";

(async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const clientId = await rl.question("Paste your OAuth Client ID: ");
  const clientSecret = await rl.question("Paste your OAuth Client Secret: ");
  rl.close();

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
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

  console.log("🌐 Open this URL in your browser:\n", authUrl);

  await open(authUrl);

  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await rl2.question("Paste the code here: ");
  rl2.close();

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const docs = google.docs({ version: "v1", auth: oauth2Client });
  const res = await docs.documents.create({
    requestBody: { title: "Concept Forge OAuth Test Document" },
  });

  console.log("Document created successfully:");
  console.log(res.data);
})();