import { google } from "googleapis";
(async () => {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive"
    ]
  });
  const docs = google.docs({ version: "v1", auth });
  const res = await docs.documents.create({
    requestBody: { title: "Test Document From Clean Project" }
  });
  console.log(res.data);
})();