/**
 * Complete Codebase Export Tool
 * Exports the entire Concept Forge project structure and code
 */

import * as fs from 'fs';
import * as path from 'path';

interface FileEntry {
  path: string;
  content: string;
  isDirectory: boolean;
}

function shouldIncludeFile(filePath: string): boolean {
  const excluded = [
    'node_modules',
    '.git',
    'dist',
    '.next',
    'coverage',
    '.env',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    'package-lock.json',
    'yarn.lock'
  ];
  
  return !excluded.some(pattern => 
    filePath.includes(pattern) || filePath.endsWith(pattern.replace('*', ''))
  );
}

function scanDirectory(dirPath: string, baseDir: string = ''): FileEntry[] {
  const entries: FileEntry[] = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.join(baseDir, item);
      
      if (!shouldIncludeFile(relativePath)) continue;
      
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        entries.push({
          path: relativePath,
          content: '',
          isDirectory: true
        });
        
        // Recursively scan subdirectory
        entries.push(...scanDirectory(fullPath, relativePath));
      } else {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          entries.push({
            path: relativePath,
            content,
            isDirectory: false
          });
        } catch (error) {
          console.log(`⚠️ Could not read file: ${relativePath}`);
        }
      }
    }
  } catch (error) {
    console.log(`⚠️ Could not scan directory: ${dirPath}`);
  }
  
  return entries;
}

function generateMarkdownExport(entries: FileEntry[]): string {
  let markdown = `# Concept Forge - Complete Codebase Export\n\n`;
  markdown += `Export generated on: ${new Date().toISOString()}\n\n`;
  markdown += `## Project Structure\n\n`;
  
  // Generate file tree
  const directories = entries.filter(e => e.isDirectory).sort();
  const files = entries.filter(e => !e.isDirectory).sort();
  
  markdown += `### Directory Structure\n\`\`\`\n`;
  directories.forEach(dir => {
    const depth = dir.path.split(path.sep).length - 1;
    const indent = '  '.repeat(depth);
    markdown += `${indent}📁 ${path.basename(dir.path)}/\n`;
  });
  markdown += `\`\`\`\n\n`;
  
  // Add all file contents
  markdown += `## File Contents\n\n`;
  
  files.forEach(file => {
    const extension = path.extname(file.path).replace('.', '');
    const language = getLanguageFromExtension(extension);
    
    markdown += `### \`${file.path}\`\n\n`;
    markdown += `\`\`\`${language}\n${file.content}\n\`\`\`\n\n`;
  });
  
  return markdown;
}

function getLanguageFromExtension(ext: string): string {
  const languageMap: { [key: string]: string } = {
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'html': 'html',
    'sql': 'sql',
    'py': 'python',
    'txt': 'text',
    'yml': 'yaml',
    'yaml': 'yaml'
  };
  
  return languageMap[ext] || 'text';
}

function generateZipManifest(entries: FileEntry[]): string {
  let manifest = `# Concept Forge - File Manifest\n\n`;
  manifest += `Total files: ${entries.filter(e => !e.isDirectory).length}\n`;
  manifest += `Total directories: ${entries.filter(e => e.isDirectory).length}\n\n`;
  
  manifest += `## Files by Category\n\n`;
  
  const categories: { [key: string]: FileEntry[] } = {
    'Frontend Components': [],
    'Backend/Server': [],
    'Shared Types': [],
    'Configuration': [],
    'Documentation': [],
    'Assets': [],
    'Scripts': [],
    'Other': []
  };
  
  entries.filter(e => !e.isDirectory).forEach(file => {
    if (file.path.startsWith('client/src/components')) {
      categories['Frontend Components'].push(file);
    } else if (file.path.startsWith('server') || file.path.startsWith('backend')) {
      categories['Backend/Server'].push(file);
    } else if (file.path.includes('shared') || file.path.includes('schema')) {
      categories['Shared Types'].push(file);
    } else if (file.path.includes('.json') || file.path.includes('config') || file.path.includes('.env')) {
      categories['Configuration'].push(file);
    } else if (file.path.includes('.md') || file.path.includes('.txt')) {
      categories['Documentation'].push(file);
    } else if (file.path.includes('assets') || file.path.includes('static')) {
      categories['Assets'].push(file);
    } else if (file.path.includes('.py') || file.path.includes('.ts') && !file.path.includes('client/src')) {
      categories['Scripts'].push(file);
    } else {
      categories['Other'].push(file);
    }
  });
  
  Object.entries(categories).forEach(([category, files]) => {
    if (files.length > 0) {
      manifest += `### ${category} (${files.length})\n`;
      files.forEach(file => {
        const size = file.content.length;
        manifest += `- \`${file.path}\` (${size} chars)\n`;
      });
      manifest += '\n';
    }
  });
  
  return manifest;
}

async function exportCompleteCodebase() {
  console.log('🚀 Starting complete codebase export...');
  
  const rootDir = process.cwd();
  console.log(`📂 Scanning directory: ${rootDir}`);
  
  const entries = scanDirectory(rootDir);
  const files = entries.filter(e => !e.isDirectory);
  
  console.log(`📊 Found ${files.length} files in ${entries.filter(e => e.isDirectory).length} directories`);
  
  // Generate different export formats
  console.log('📝 Generating Markdown export...');
  const markdownExport = generateMarkdownExport(entries);
  fs.writeFileSync('concept-forge-complete-export.md', markdownExport);
  
  console.log('📋 Generating file manifest...');
  const manifest = generateZipManifest(entries);
  fs.writeFileSync('concept-forge-file-manifest.md', manifest);
  
  // Generate JSON export for programmatic use
  console.log('💾 Generating JSON export...');
  const jsonExport = {
    timestamp: new Date().toISOString(),
    projectName: 'Concept Forge',
    totalFiles: files.length,
    totalDirectories: entries.filter(e => e.isDirectory).length,
    files: entries
  };
  fs.writeFileSync('concept-forge-complete-export.json', JSON.stringify(jsonExport, null, 2));
  
  // Generate a simple file list for quick reference
  console.log('📄 Generating file list...');
  const fileList = files.map(f => f.path).sort().join('\n');
  fs.writeFileSync('concept-forge-file-list.txt', fileList);
  
  console.log('\n✅ Export complete! Generated files:');
  console.log('  📖 concept-forge-complete-export.md (Full codebase in Markdown)');
  console.log('  📋 concept-forge-file-manifest.md (Project overview)');
  console.log('  💾 concept-forge-complete-export.json (Machine-readable export)');
  console.log('  📄 concept-forge-file-list.txt (Simple file listing)');
  
  console.log(`\n📊 Export Statistics:`);
  console.log(`  📁 Directories: ${entries.filter(e => e.isDirectory).length}`);
  console.log(`  📄 Files: ${files.length}`);
  console.log(`  📝 Total characters: ${files.reduce((sum, f) => sum + f.content.length, 0).toLocaleString()}`);
  
  // Count by file type
  const fileTypes: { [key: string]: number } = {};
  files.forEach(f => {
    const ext = path.extname(f.path).replace('.', '') || 'no-extension';
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  });
  
  console.log(`\n📈 File Types:`);
  Object.entries(fileTypes)
    .sort(([,a], [,b]) => b - a)
    .forEach(([ext, count]) => {
      console.log(`  .${ext}: ${count} files`);
    });
}

// Run the export
exportCompleteCodebase().catch(console.error);