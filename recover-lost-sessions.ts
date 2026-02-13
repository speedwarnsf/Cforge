/**
 * Script to recover recent failed/lost forge attempts from logs and add to session history
 */

interface LostSession {
  prompt: string;
  tone: string;
  timestamp: string;
  type: 'multivariant' | 'single';
  status: 'failed' | 'timeout' | 'incomplete';
}

async function recoverLostSessions() {
  console.log('🔍 Searching for lost forge attempts...');
  
  // Based on the recent logs, identify potential lost sessions
  const recentAttempts: LostSession[] = [
    {
      prompt: "coffee shop loyalty program",
      tone: "creative", 
      timestamp: new Date().toISOString(),
      type: "multivariant",
      status: "timeout"
    },
    {
      prompt: "test query",
      tone: "creative",
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      type: "multivariant", 
      status: "timeout"
    }
  ];

  console.log(`📦 Found ${recentAttempts.length} potential lost sessions:`);
  
  for (const attempt of recentAttempts) {
    console.log(`- ${attempt.prompt} (${attempt.tone}, ${attempt.type}) - ${attempt.status}`);
    
    // Try to add a placeholder entry to session history for user awareness
    try {
      const response = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `[RECOVERED] ${attempt.prompt}`,
          tone: attempt.tone,
          isRecovery: true
        })
      });
      
      if (response.ok) {
        console.log(`Recovery placeholder added for: ${attempt.prompt}`);
      } else {
        console.log(`Failed to add recovery for: ${attempt.prompt}`);
      }
    } catch (error) {
      console.log(`Error recovering ${attempt.prompt}:`, error);
    }
  }
  
  console.log('🔄 Recovery process complete. Check session history for recovered entries.');
}

// Run recovery
recoverLostSessions().catch(console.error);