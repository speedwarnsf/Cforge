import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue?: any): any => {
  const index = args.findIndex(arg => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (index !== -1) {
    const arg = args[index];
    if (arg.includes('=')) {
      return arg.split('=')[1];
    }
    if (args[index + 1] && !args[index + 1].startsWith('--')) {
      return args[index + 1];
    }
    return true;
  }
  return defaultValue;
};

const updateTarget = getArg('updateRegex');
const newPattern = getArg('pattern');
const description = getArg('description', 'Regex pattern update');

interface RegexUpdate {
  target: string;
  oldPattern: RegExp;
  newPattern: RegExp;
  description: string;
}

// Define the specific regex updates needed
const regexUpdates: { [key: string]: RegexUpdate } = {
  rhetoricalCraft: {
    target: 'rhetoricalCraft',
    oldPattern: /\*\*RHETORICAL CRAFT:\*\*\s*(.*?)(?=\*\*|$)/is,
    newPattern: /\*\*RHETORICAL CRAFT(?:\s+BREAKDOWN)?:\*\*\s*(.*?)(?=\*\*|$)/is,
    description: 'Update rhetorical craft parsing to handle both "RHETORICAL CRAFT:" and "RHETORICAL CRAFT BREAKDOWN:" headers'
  }
};

function findFilesWithParsing(directory: string): string[] {
  const files: string[] = [];
  
  function searchDirectory(dir: string) {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        searchDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
        try {
          const content = readFileSync(fullPath, 'utf8');
          if (content.includes('RHETORICAL CRAFT') && content.includes('parseMarkdownContent')) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }
  
  searchDirectory(directory);
  return files;
}

function updateFileRegex(filePath: string, update: RegexUpdate): boolean {
  try {
    let content = readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Look for the old pattern and replace with new pattern
    const oldPatternStr = update.oldPattern.source;
    const newPatternStr = update.newPattern.source;
    
    // Find and replace the regex pattern in the code
    const regexDeclarationPattern = new RegExp(`/\\*\\*RHETORICAL CRAFT:\\*\\*\\\\s\\*\\(.*?\\)\\?\\(\\?=\\\\\\*\\\\\\*\\|\\$\\)/[gims]*`, 'g');
    
    if (content.includes('RHETORICAL CRAFT:**')) {
      // Replace the specific regex pattern for rhetorical craft
      content = content.replace(
        /\/\*\*RHETORICAL CRAFT:\*\*\\s\*\(.*?\)\?\(\?\=\\*\\*\|\$\)\/[gims]*/g,
        `/\\*\\*RHETORICAL CRAFT(?:\\\\s+BREAKDOWN)?:\\*\\*\\\\s*(.*?)(?=\\\\*\\\\*|$)/is`
      );
      
      // Also handle string-based patterns
      content = content.replace(
        /\*\*RHETORICAL CRAFT:\*\*/g,
        '**RHETORICAL CRAFT(?:\\\\s+BREAKDOWN)?:**'
      );
      
      updated = true;
    }
    
    if (updated) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error updating ${filePath}:`, error);
    return false;
  }
}

async function editParsingRegex() {
  console.log(`🔧 Editing parsing regex for: ${updateTarget}`);
  console.log(`📝 Description: ${description}`);
  
  if (!updateTarget || !regexUpdates[updateTarget]) {
    console.log("❌ Invalid update target. Available targets:");
    Object.keys(regexUpdates).forEach(key => {
      console.log(`  - ${key}: ${regexUpdates[key].description}`);
    });
    return;
  }
  
  const update = regexUpdates[updateTarget];
  
  console.log("\n🔍 Finding files with parsing logic...");
  const files = findFilesWithParsing('.');
  
  if (files.length === 0) {
    console.log("❌ No files found with rhetorical craft parsing");
    return;
  }
  
  console.log(`📁 Found ${files.length} files with parsing logic:`);
  files.forEach(file => console.log(`  - ${file}`));
  
  console.log("\n🛠️  Updating regex patterns...");
  let updatedCount = 0;
  
  for (const file of files) {
    if (updateFileRegex(file, update)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} files successfully`);
  
  if (updatedCount > 0) {
    console.log("\n🎯 Regex update complete! The parsing should now handle both:");
    console.log("  - **RHETORICAL CRAFT:**");
    console.log("  - **RHETORICAL CRAFT BREAKDOWN:**");
  }
}

// Run the regex editor
editParsingRegex().catch(console.error);