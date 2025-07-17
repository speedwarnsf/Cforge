/**
 * Check recent concepts and display summary
 */

async function checkRecentConcepts() {
  try {
    console.log('🔍 Fetching recent concept history...');
    
    const response = await fetch('http://localhost:5000/api/history');
    const history = await response.json();
    
    console.log(`📊 Total entries in history: ${history.length}`);
    
    // Show most recent 5 entries
    const recent = history.slice(0, 5);
    console.log('\n📝 Most recent concepts:');
    
    recent.forEach((entry: any, index: number) => {
      console.log(`${index + 1}. ${entry.prompt.substring(0, 50)}... (${entry.tone})`);
      console.log(`   ID: ${entry.id}`);
      console.log(`   Created: ${entry.created_at || entry.timestamp}`);
      console.log('');
    });
    
    // Check for today's entries specifically
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = history.filter((entry: any) => 
      (entry.created_at || entry.timestamp)?.startsWith(today)
    );
    
    console.log(`📅 Concepts created today (${today}): ${todayEntries.length}`);
    
    if (todayEntries.length > 0) {
      console.log('\n🆕 Today\'s concepts:');
      todayEntries.slice(0, 3).forEach((entry: any, index: number) => {
        console.log(`- ${entry.prompt.substring(0, 40)}... (${entry.tone})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking recent concepts:', error);
  }
}

// Run the check
checkRecentConcepts();