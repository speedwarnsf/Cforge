#!/usr/bin/env node

console.log('🔍 Testing ConceptForge production site...');

// Test if the site loads and React mounts properly
const testUrl = 'https://thecforge.com';

fetch(testUrl)
  .then(response => response.text())
  .then(html => {
    console.log('\n📊 Site Analysis:');
    console.log(`✅ Site loads: ${html.length > 0 ? 'YES' : 'NO'}`);
    console.log(`📏 HTML size: ${html.length} characters`);
    
    // Check for key elements
    const hasRoot = html.includes('<div id="root">');
    const hasReactScript = html.includes('index-') && html.includes('.js');
    const hasCSS = html.includes('.css');
    
    console.log(`🎯 Root element: ${hasRoot ? 'FOUND' : 'MISSING'}`);
    console.log(`📦 React script: ${hasReactScript ? 'FOUND' : 'MISSING'}`);
    console.log(`🎨 CSS file: ${hasCSS ? 'FOUND' : 'MISSING'}`);
    
    // Check if it's the blank page issue
    const hasConceptForgeTitle = html.includes('ConceptForge');
    const hasPasswordGate = html.includes('PasswordGate');
    
    console.log(`🏷️  Has title: ${hasConceptForgeTitle ? 'YES' : 'NO'}`);
    console.log(`🔒 Has PasswordGate: ${hasPasswordGate ? 'YES' : 'NO'}`);
    
    // Extract script src for main bundle
    const scriptMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
    if (scriptMatch) {
      console.log(`📦 Main script: ${scriptMatch[1]}`);
      
      // Test if the script loads
      const scriptUrl = `${testUrl}/assets/${scriptMatch[1]}`;
      console.log(`\n🔍 Testing main script at: ${scriptUrl}`);
      
      fetch(scriptUrl)
        .then(response => {
          console.log(`📦 Script status: ${response.status}`);
          console.log(`📏 Script size: ${response.headers.get('content-length') || 'unknown'} bytes`);
          return response.text();
        })
        .then(scriptContent => {
          const hasReactRender = scriptContent.includes('render(');
          const hasCreateRoot = scriptContent.includes('createRoot');
          const hasAppComponent = scriptContent.includes('App');
          
          console.log(`⚛️  Has React render: ${hasReactRender ? 'YES' : 'NO'}`);
          console.log(`🌱 Has createRoot: ${hasCreateRoot ? 'YES' : 'NO'}`);
          console.log(`🏠 Has App component: ${hasAppComponent ? 'YES' : 'NO'}`);
          
          if (hasReactRender && hasCreateRoot && hasAppComponent) {
            console.log('\n✅ LIKELY FIXED: React should be mounting properly!');
          } else {
            console.log('\n❌ ISSUE PERSISTS: React mounting may still be broken');
          }
        })
        .catch(err => {
          console.log(`❌ Script load error: ${err.message}`);
        });
    } else {
      console.log('❌ Could not find main script reference');
    }
    
  })
  .catch(error => {
    console.log(`❌ Site load error: ${error.message}`);
  });