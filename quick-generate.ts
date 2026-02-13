import { google } from "googleapis";

async function quickGenerate() {
  console.log("🚀 Quick concept generation...");
  
  // Create a concept using the new format template
  const concept = `# Grove. Grow. Guard.

## Every case plants possibility

**Body Copy:**  
Transform your phone into a forest. Each bamboo case purchased plants one tree, turning daily protection into environmental action. Your device becomes a seed of change.

**Visual Concept:**  
Hands holding a phone with bamboo case as tiny green shoots emerge from the edges, growing into a sprawling forest that extends beyond the frame.

**Strategic Impact:**  
Reframes phone accessories from consumption to contribution, creating emotional investment through direct environmental impact tracking.

**Rhetorical Craft:**  
- **Primary Device:** Alliteration in "Grove. Grow. Guard." creates memorable progression from nature to action to protection.  
- **Secondary Device:** Metaphor of phone as "seed of change" transforms technology from environmental burden to solution.  
- **Additional Notes:** Visual progression from device to ecosystem creates powerful cause-effect narrative.`;

  console.log("Concept generated!");
  console.log("\n" + "=".repeat(60));
  console.log("GENERATED CONCEPT:");
  console.log("=".repeat(60) + "\n");
  console.log(concept);
  console.log("\n" + "=".repeat(60) + "\n");

  // Export to Google Docs
  console.log("📤 Creating Google Doc...");
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );
  
  oauth2Client.setCredentials({
    access_token: 'ya29.a0AS3H6NwAO7tcG1AiTKrD5xp_au0Sq6rhrEODf6scd5qs9pNt3Ax07AvI3eZOSFY4RpAjbuoOBQ0RVLYmw6nSreLEHfXJGVWep63SpWI-DMCq0kvxZdW1GWNhX_ebotcK_XSsr11uyZo9M0Cdhmf844R30wStwd68dP8D_zonaCgYKAfwSARYSFQHGX2MiHh1AH_jJSMHz08AzOOwYzA0175',
    refresh_token: '1//047tAjusE3uSKCgYIARAAGAQSNwF-L9IrFFRorH-kMLgp5zpRRs_N15XmlLUBO70u8A1gxFmtUJinqlwh4LyocOwplcS2Cp8fivU'
  });

  const docs = google.docs({ version: "v1", auth: oauth2Client });
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const createRes = await docs.documents.create({
    requestBody: {
      title: `Concept Forge CLI - Bamboo Phone Case (${new Date().toLocaleDateString()})`
    }
  });
  const docId = createRes.data.documentId!;

  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: "dustinyork15@gmail.com",
    },
    sendNotificationEmail: false,
  });

  const formattedContent = `CONCEPT FORGE CLI - NEW FORMAT DEMONSTRATION

Generated: ${new Date().toLocaleDateString()}
Prompt: Sustainable bamboo phone case that plants a tree with every purchase
Tone: creative
Format: markdown

GROVE. GROW. GUARD.

Every case plants possibility

BODY COPY:
Transform your phone into a forest. Each bamboo case purchased plants one tree, turning daily protection into environmental action. Your device becomes a seed of change.

VISUAL CONCEPT:
Hands holding a phone with bamboo case as tiny green shoots emerge from the edges, growing into a sprawling forest that extends beyond the frame.

STRATEGIC IMPACT:
Reframes phone accessories from consumption to contribution, creating emotional investment through direct environmental impact tracking.

RHETORICAL CRAFT:
• Primary Device: Alliteration in "Grove. Grow. Guard." creates memorable progression from nature to action to protection.
• Secondary Device: Metaphor of phone as "seed of change" transforms technology from environmental burden to solution.
• Additional Notes: Visual progression from device to ecosystem creates powerful cause-effect narrative.

============================================================

Generated via CLI simulation
Concept Forge AI - New Markdown Format System`;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { 
      requests: [
        { insertText: { location: { index: 1 }, text: formattedContent } }
      ]
    }
  });

  const url = `https://docs.google.com/document/d/${docId}/edit`;
  console.log("Google Doc created and shared!");
  console.log(`🌐 Document URL: ${url}`);
  console.log("📧 Shared with: dustinyork15@gmail.com");
  
  return url;
}

quickGenerate().catch(console.error);