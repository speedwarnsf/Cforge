import fs from 'fs';

// Read the RTF file and extract base64 content
const rtfContent = fs.readFileSync('./attached_assets/rhetorical_dataset.b64_1752214233962.rtf', 'utf8');

// Extract the base64 string from RTF content (removing RTF formatting)
const base64Match = rtfContent.match(/ewoJImZpZ3VyZXMiOiBb[^}]+/);
if (!base64Match) {
  console.error('Could not find base64 content in RTF file');
  process.exit(1);
}

// Get the full base64 string (it appears to be split across lines)
const lines = rtfContent.split('\n');
let base64Content = '';
let capturing = false;

for (const line of lines) {
  if (line.includes('ewoJImZpZ3VyZXMiOiBb')) {
    capturing = true;
  }
  if (capturing) {
    const cleanLine = line.replace(/\\$/, '').replace(/\f0\fs24 \\cf0 /, '').trim();
    if (cleanLine) {
      base64Content += cleanLine;
    }
  }
  if (line.includes('}')) {
    break;
  }
}

console.log('Extracted base64 content length:', base64Content.length);
console.log('🔍 First 100 chars:', base64Content.substring(0, 100));

try {
  // Decode base64
  const decodedContent = Buffer.from(base64Content, 'base64').toString('utf8');
  console.log('Successfully decoded base64');
  
  // Parse JSON
  const dataset = JSON.parse(decodedContent);
  console.log('Successfully parsed JSON');
  console.log('📊 Dataset structure:', Object.keys(dataset));
  
  if (dataset.figures && Array.isArray(dataset.figures)) {
    console.log('📊 Number of figures:', dataset.figures.length);
    
    // Save the dataset
    fs.writeFileSync('./rhetorical_figures_full_dataset.json', JSON.stringify(dataset.figures, null, 2));
    console.log('rhetorical_figures_full_dataset.json created successfully.');
    console.log(`📊 Dataset contains ${dataset.figures.length} records`);
    
    // Show sample
    console.log('\nSample figures:');
    dataset.figures.slice(0, 3).forEach(fig => {
      console.log(`- ${fig.figure_name}: ${fig.definition.substring(0, 50)}...`);
    });
  } else {
    console.log('Dataset does not contain expected "figures" array');
    console.log('Actual content:', decodedContent.substring(0, 200));
  }
  
} catch (error) {
  console.error('Error processing dataset:', error.message);
  console.log('Raw base64 content:', base64Content.substring(0, 200));
}