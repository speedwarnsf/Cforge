import { google } from "googleapis";
import { createClient } from '@supabase/supabase-js';

// OAuth tokens from the successful test
const ACCESS_TOKEN = 'ya29.a0AS3H6NwAO7tcG1AiTKrD5xp_au0Sq6rhrEODf6scd5qs9pNt3Ax07AvI3eZOSFY4RpAjbuoOBQ0RVLYmw6nSreLEHfXJGVWep63SpWI-DMCq0kvxZdW1GWNhX_ebotcK_XSsr11uyZo9M0Cdhmf844R30wStwd68dP8D_zonaCgYKAfwSARYSFQHGX2MiHh1AH_jJSMHz08AzOOwYzA0175';
const REFRESH_TOKEN = '1//047tAjusE3uSKCgYIARAAGAQSNwF-L9IrFFRorH-kMLgp5zpRRs_N15XmlLUBO70u8A1gxFmtUJinqlwh4LyocOwplcS2Cp8fivU';

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

interface ParsedConcept {
  headline: string;
  tagline: string;
  bodyCopy: string;
  visualConcept: string;
  rhetoricalCraft: Array<{
    device: string;
    explanation: string;
  }>;
  strategicImpact: string;
}

function isMarkdownFormat(content: string): boolean {
  return content.includes('# ') || content.includes('## ') || content.includes('**Tagline:**') || content.includes('**Body Copy:**') || content.includes('**HEADLINE:**');
}

function parseMarkdownContent(content: string): ParsedConcept | null {
  try {
    const sections: any = {};
    
    // Handle both formats: # Headline and **HEADLINE:**
    const headlineMatch = content.match(/^#\s+(.+)$/m) || content.match(/\*\*HEADLINE:\*\*\s*(.+?)(?=\n\*\*|$)/s);
    sections.headline = headlineMatch ? headlineMatch[1].replace(/\*\*/g, '').trim() : "";
    
    // Handle ## Tagline, **Tagline:**, and **TAGLINE:**
    const taglineMatch = content.match(/^##\s+(.+)$/m) || content.match(/\*\*Tagline:\*\*\s*(.+?)(?=\n\*\*|$)/s) || content.match(/\*\*TAGLINE:\*\*\s*(.+?)(?=\n\*\*|$)/s);
    sections.tagline = taglineMatch ? taglineMatch[1].replace(/\*\*/g, '').trim() : "";
    
    const bodyMatch = content.match(/\*\*Body Copy:\*\*\s*(.+?)(?=\n\*\*|$)/s) || content.match(/\*\*BODY COPY:\*\*\s*(.+?)(?=\n\*\*|$)/s);
    sections.bodyCopy = bodyMatch ? bodyMatch[1].replace(/\*\*/g, '').trim() : "";
    
    const visualMatch = content.match(/\*\*Visual Concept:\*\*\s*(.+?)(?=\n\*\*|$)/s) || content.match(/\*\*VISUAL CONCEPT:\*\*\s*(.+?)(?=\n\*\*|$)/s);
    sections.visualConcept = visualMatch ? visualMatch[1].replace(/\*\*/g, '').trim() : "";
    
    const craftMatch = content.match(/\*\*Rhetorical Craft:\*\*\s*(.+?)(?=\n\*\*|$)/s) || content.match(/\*\*RHETORICAL CRAFT BREAKDOWN:\*\*\s*(.+?)(?=\n\*\*|$)/s);
    if (craftMatch) {
      const craftText = craftMatch[1];
      const craftItems = craftText.split('•').filter(item => item.trim()).map(item => {
        const parts = item.trim().split(':');
        return {
          device: parts[0].replace(/\*\*/g, '').trim(),
          explanation: parts.slice(1).join(':').replace(/\*\*/g, '').trim()
        };
      });
      sections.rhetoricalCraft = craftItems;
    } else {
      sections.rhetoricalCraft = [];
    }
    
    const impactMatch = content.match(/\*\*Strategic Impact:\*\*\s*(.+?)(?=\n\*\*|$)/s) || content.match(/\*\*STRATEGIC IMPACT:\*\*\s*(.+?)(?=\n\*\*|$)/s);
    sections.strategicImpact = impactMatch ? impactMatch[1].replace(/\*\*/g, '').trim() : "";
    
    return sections as ParsedConcept;
  } catch (error) {
    console.log("Failed to parse Markdown content:", error);
    return null;
  }
}

function parseContent(content: string): ParsedConcept | null {
  try {
    if (!content || typeof content !== 'string') {
      console.log("Invalid content:", content);
      return null;
    }
    
    // Check if it's Markdown format
    if (isMarkdownFormat(content)) {
      return parseMarkdownContent(content);
    }
    
    // Try JSON parsing for legacy format
    return JSON.parse(content);
  } catch (error) {
    console.log("Failed to parse content:", content?.substring(0, 100) || 'undefined');
    return null;
  }
}

function cleanContent(text: string): string {
  return text.replace(/\*\*/g, '').trim();
}

async function exportAllHistoryToGoogleDoc() {
  try {
    console.log("🚀 Starting OAuth-based Concept Forge export...");
    
    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob"
    );
    
    oauth2Client.setCredentials({
      access_token: ACCESS_TOKEN,
      refresh_token: REFRESH_TOKEN
    });

    // Initialize Google APIs
    const docs = google.docs({ version: "v1", auth: oauth2Client });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Fetch concepts from Supabase
    console.log("🔍 Fetching concepts...");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    const { data: concepts, error } = await supabase
      .from('concept_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    const entries = concepts as ConceptEntry[];
    console.log(`📊 Retrieved ${entries.length} concepts`);

    // Create document
    console.log("📄 Creating document...");
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge Export - ${new Date().toLocaleDateString()}`
      }
    });

    const documentId = createResponse.data.documentId!;
    console.log(`✅ Document created: ${documentId}`);

    // Build content with sophisticated formatting
    const requests = [];
    let conceptNumber = 1;

    // Add title
    requests.push({
      insertText: {
        location: { index: 1 },
        text: `Concept Forge Export - ${new Date().toLocaleDateString()}\n\n`
      }
    });

    let currentIndex = requests[0].insertText.text.length + 1;

    // Process each concept
    for (const entry of entries) {
      const concept = parseContent(entry.response || entry.content);
      if (!concept) continue;

      const date = new Date(entry.timestamp || entry.created_at!).toLocaleDateString();
      
      // Insert concept header
      const headerText = `CONCEPT ${conceptNumber} — ${date}\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: headerText
        }
      });
      currentIndex += headerText.length;

      // Insert headline
      const headlineText = `${cleanContent(concept.headline)}\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: headlineText
        }
      });
      currentIndex += headlineText.length;

      // Insert tagline
      const taglineText = `${cleanContent(concept.tagline)}\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: taglineText
        }
      });
      currentIndex += taglineText.length;

      // Insert body copy section
      const bodyCopyText = `BODY COPY:\n${cleanContent(concept.bodyCopy)}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: bodyCopyText
        }
      });
      currentIndex += bodyCopyText.length;

      // Insert visual concept section
      const visualText = `VISUAL CONCEPT:\n${cleanContent(concept.visualConcept)}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: visualText
        }
      });
      currentIndex += visualText.length;

      // Insert strategic impact section
      const impactText = `STRATEGIC IMPACT:\n${cleanContent(concept.strategicImpact)}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: impactText
        }
      });
      currentIndex += impactText.length;

      // Insert rhetorical craft as bulleted list
      const craftHeaderText = `RHETORICAL CRAFT:\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: craftHeaderText
        }
      });
      currentIndex += craftHeaderText.length;

      // Add each rhetorical craft item
      for (const craft of concept.rhetoricalCraft) {
        const craftText = `• ${craft.device}: ${cleanContent(craft.explanation)}\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: craftText
          }
        });
        currentIndex += craftText.length;
      }

      // Add separator line
      const separatorText = `\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: separatorText
        }
      });
      currentIndex += separatorText.length;

      conceptNumber++;
    }

    // Apply all text in one batch
    console.log("📝 Adding content to document...");
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    // Now apply formatting in a second batch
    console.log("🎨 Applying formatting...");
    const formatRequests = [];
    let textIndex = requests[0].insertText.text.length + 1; // Start after title

    conceptNumber = 1;
    for (const entry of entries) {
      const concept = parseContent(entry.response || entry.content);
      if (!concept) continue;

      const date = new Date(entry.timestamp || entry.created_at!).toLocaleDateString();
      const headerText = `CONCEPT ${conceptNumber} — ${date}\n`;
      const headlineText = `${cleanContent(concept.headline)}\n`;
      const taglineText = `${cleanContent(concept.tagline)}\n`;

      // Format concept header (10pt Arial, #666666, 4pt spacing after)
      formatRequests.push({
        updateTextStyle: {
          range: {
            startIndex: textIndex,
            endIndex: textIndex + headerText.length - 1
          },
          textStyle: {
            fontSize: { magnitude: 10, unit: 'PT' },
            weightedFontFamily: { fontFamily: 'Arial' },
            foregroundColor: {
              color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } }
            }
          },
          fields: 'fontSize,weightedFontFamily,foregroundColor'
        }
      });

      textIndex += headerText.length;

      // Format headline (Heading 1, 18pt Arial Bold)
      formatRequests.push({
        updateParagraphStyle: {
          range: {
            startIndex: textIndex,
            endIndex: textIndex + headlineText.length - 1
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1'
          },
          fields: 'namedStyleType'
        }
      });
      formatRequests.push({
        updateTextStyle: {
          range: {
            startIndex: textIndex,
            endIndex: textIndex + headlineText.length - 1
          },
          textStyle: {
            fontSize: { magnitude: 18, unit: 'PT' },
            weightedFontFamily: { fontFamily: 'Arial' },
            bold: true
          },
          fields: 'fontSize,weightedFontFamily,bold'
        }
      });

      textIndex += headlineText.length;

      // Format tagline (Heading 2, 14pt Arial Italic, #444444)
      formatRequests.push({
        updateParagraphStyle: {
          range: {
            startIndex: textIndex,
            endIndex: textIndex + taglineText.length - 1
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_2'
          },
          fields: 'namedStyleType'
        }
      });
      formatRequests.push({
        updateTextStyle: {
          range: {
            startIndex: textIndex,
            endIndex: textIndex + taglineText.length - 1
          },
          textStyle: {
            fontSize: { magnitude: 14, unit: 'PT' },
            weightedFontFamily: { fontFamily: 'Arial' },
            italic: true,
            foregroundColor: {
              color: { rgbColor: { red: 0.267, green: 0.267, blue: 0.267 } }
            }
          },
          fields: 'fontSize,weightedFontFamily,italic,foregroundColor'
        }
      });

      // Move index past the rest of the content for this concept
      const bodyCopyText = `BODY COPY:\n${cleanContent(concept.bodyCopy)}\n\n`;
      const visualText = `VISUAL CONCEPT:\n${cleanContent(concept.visualConcept)}\n\n`;
      const impactText = `STRATEGIC IMPACT:\n${cleanContent(concept.strategicImpact)}\n\n`;
      const craftHeaderText = `RHETORICAL CRAFT:\n`;
      
      textIndex += taglineText.length + bodyCopyText.length + visualText.length + impactText.length + craftHeaderText.length;
      
      for (const craft of concept.rhetoricalCraft) {
        const craftText = `• ${craft.device}: ${cleanContent(craft.explanation)}\n`;
        textIndex += craftText.length;
      }
      
      textIndex += 2; // separator
      conceptNumber++;
    }

    // Apply formatting
    if (formatRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: formatRequests }
      });
    }

    // Add horizontal lines as separators
    console.log("📏 Adding horizontal separators...");
    const separatorRequests = [];
    let separatorIndex = requests[0].insertText.text.length + 1;

    conceptNumber = 1;
    for (const entry of entries) {
      const concept = parseContent(entry.response || entry.content);
      if (!concept) continue;

      // Calculate position for separator (at end of concept)
      const date = new Date(entry.timestamp || entry.created_at!).toLocaleDateString();
      const headerText = `CONCEPT ${conceptNumber} — ${date}\n`;
      const headlineText = `${cleanContent(concept.headline)}\n`;
      const taglineText = `${cleanContent(concept.tagline)}\n`;
      const bodyCopyText = `BODY COPY:\n${cleanContent(concept.bodyCopy)}\n\n`;
      const visualText = `VISUAL CONCEPT:\n${cleanContent(concept.visualConcept)}\n\n`;
      const impactText = `STRATEGIC IMPACT:\n${cleanContent(concept.strategicImpact)}\n\n`;
      const craftHeaderText = `RHETORICAL CRAFT:\n`;
      
      let conceptLength = headerText.length + headlineText.length + taglineText.length + 
                         bodyCopyText.length + visualText.length + impactText.length + craftHeaderText.length;
      
      for (const craft of concept.rhetoricalCraft) {
        const craftText = `• ${craft.device}: ${cleanContent(craft.explanation)}\n`;
        conceptLength += craftText.length;
      }

      // Add separator at end (skip last concept)
      if (conceptNumber < entries.filter(e => parseContent(e.response || e.content)).length) {
        separatorRequests.push({
          insertText: {
            location: { index: separatorIndex + conceptLength },
            text: '_______________________________________________________________________________\n'
          }
        });
      }

      separatorIndex += conceptLength + 2; // +2 for spacing
      conceptNumber++;
    }

    if (separatorRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: separatorRequests }
      });
    }

    // Share document
    console.log("🔗 Sharing document...");
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: 'dustinyork15@gmail.com'
      }
    });

    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log("✅ Export complete!");
    console.log(`📄 Document URL: ${documentUrl}`);
    console.log(`📧 Shared with: dustinyork15@gmail.com`);

    return documentUrl;

  } catch (error) {
    console.error("❌ Export failed:", error);
    throw error;
  }
}

exportAllHistoryToGoogleDoc().catch(console.error);