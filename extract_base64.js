import fs from 'fs';

// Read the RTF file
const rtfContent = fs.readFileSync('./attached_assets/rhetorical_dataset.b64_1752214233962.rtf', 'utf8');

// Extract all base64-looking content by removing RTF formatting
let base64Content = rtfContent
  .replace(/\\rtf[^}]+}/g, '') // Remove RTF headers
  .replace(/\\[a-zA-Z0-9]+/g, '') // Remove RTF commands
  .replace(/\{[^}]*\}/g, '') // Remove RTF groups
  .replace(/\\/g, '') // Remove backslashes
  .replace(/\s+/g, '') // Remove all whitespace
  .replace(/[^A-Za-z0-9+/=]/g, ''); // Keep only base64 characters

console.log('Cleaned base64 content length:', base64Content.length);
console.log('🔍 First 100 chars:', base64Content.substring(0, 100));
console.log('🔍 Last 100 chars:', base64Content.substring(base64Content.length - 100));

if (base64Content.length === 0) {
  console.error('No base64 content found');
  process.exit(1);
}

try {
  // Try to decode
  const decodedContent = Buffer.from(base64Content, 'base64').toString('utf8');
  console.log('Successfully decoded base64');
  console.log('Decoded content preview:', decodedContent.substring(0, 200));
  
  // Try to parse as JSON
  const dataset = JSON.parse(decodedContent);
  console.log('Successfully parsed JSON');
  
  if (dataset.figures && Array.isArray(dataset.figures)) {
    fs.writeFileSync('./rhetorical_figures_full_dataset.json', JSON.stringify(dataset.figures, null, 2));
    console.log('rhetorical_figures_full_dataset.json created successfully.');
    console.log(`📊 Dataset contains ${dataset.figures.length} records`);
  } else if (Array.isArray(dataset)) {
    fs.writeFileSync('./rhetorical_figures_full_dataset.json', JSON.stringify(dataset, null, 2));
    console.log('rhetorical_figures_full_dataset.json created successfully.');
    console.log(`📊 Dataset contains ${dataset.length} records`);
  } else {
    console.log('Unexpected dataset structure');
    console.log('📊 Dataset keys:', Object.keys(dataset));
  }
  
} catch (error) {
  console.error('Error:', error.message);
  
  // Try manual extraction from the RTF visible content
  console.log('\n🔧 Attempting manual extraction from RTF content...');
  
  // Look for the JSON pattern in the original content
  const jsonMatch = rtfContent.match(/ewo[^}]+/);
  if (jsonMatch) {
    console.log('Found JSON pattern, attempting decode...');
    try {
      const manualBase64 = jsonMatch[0].replace(/\\/g, '');
      const manualDecoded = Buffer.from(manualBase64, 'base64').toString('utf8');
      console.log('Manual decoded preview:', manualDecoded.substring(0, 200));
    } catch (e) {
      console.error('Manual extraction failed:', e.message);
    }
  }
}