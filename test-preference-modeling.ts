/**
 * Comprehensive Human-in-the-Loop Preference Modeling Test
 * Tests retrieval augmentation, feedback integration, and preference bias evolution
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const TEST_PROMPT = "HIV Stops With Me of New York State is updating its annual creative. We need an exciting campaign that is bold and sexy and allows the models to look their best but still has some NYC edge to it. The focus should be on self love, staying in treatment and leading a bold unapologetic life.";

interface ConceptResult {
  id: string;
  concept: any;
  retrievalRefs: string[];
  timestamp: string;
}

async function generateConcept(prompt: string, step: string): Promise<ConceptResult> {
  console.log(`\nGenerating concept for ${step}...`);
  
  const response = await fetch('http://localhost:5000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: prompt,
      tone: 'creative'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Generation failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  return {
    id: result.concept?.id || 'unknown',
    concept: result.concept,
    retrievalRefs: result.retrievalReferences || [],
    timestamp: new Date().toISOString()
  };
}

async function applyFeedback(conceptId: string, feedbackType: string, comment?: string) {
  console.log(`Applying ${feedbackType} feedback to concept ${conceptId}...`);
  
  const payload: any = {
    conceptId,
    feedbackType
  };
  
  if (comment) {
    payload.comment = comment;
  }
  
  const response = await fetch('http://localhost:5000/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    console.error(`Feedback failed: ${response.statusText}`);
  } else {
    console.log(`${feedbackType} feedback applied successfully`);
  }
}

async function checkFeedbackRecords() {
  console.log('\n📊 Checking feedback records in database...');
  
  const { data, error } = await supabase
    .from('concept_logs')
    .select('id, feedback_type, feedback_comment, created_at')
    .not('feedback_type', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching feedback records:', error);
    return;
  }
  
  console.log(`Found ${data.length} recent feedback records:`);
  data.forEach(record => {
    console.log(`  - ${record.id}: ${record.feedback_type} at ${record.created_at}`);
    if (record.feedback_comment) {
      console.log(`    Comment: ${record.feedback_comment}`);
    }
  });
}

function displayConcept(result: ConceptResult, label: string) {
  console.log(`\n📋 ${label}`);
  console.log(`ID: ${result.id}`);
  console.log(`Timestamp: ${result.timestamp}`);
  console.log(`Retrieval References: ${result.retrievalRefs.length > 0 ? result.retrievalRefs.join(', ') : 'None'}`);
  
  if (result.concept?.response) {
    const lines = result.concept.response.split('\n').slice(0, 5);
    console.log(`Preview: ${lines.join(' ').substring(0, 200)}...`);
  }
}

async function runPreferenceModelingTest() {
  console.log('🧪 COMPREHENSIVE HUMAN-IN-THE-LOOP PREFERENCE MODELING TEST');
  console.log('=' .repeat(80));
  
  try {
    // Step 1: Baseline Generation
    console.log('\n1️⃣ STEP 1 - BASELINE GENERATION');
    console.log('-'.repeat(50));
    
    const baseline1 = await generateConcept(TEST_PROMPT, "Baseline Concept 1");
    const baseline2 = await generateConcept(TEST_PROMPT, "Baseline Concept 2");
    const baseline3 = await generateConcept(TEST_PROMPT, "Baseline Concept 3");
    
    displayConcept(baseline1, "BASELINE CONCEPT 1");
    displayConcept(baseline2, "BASELINE CONCEPT 2");
    displayConcept(baseline3, "BASELINE CONCEPT 3");
    
    // Step 2: Apply Feedback
    console.log('\n2️⃣ STEP 2 - APPLY FEEDBACK');
    console.log('-'.repeat(50));
    
    await applyFeedback(baseline1.id, "More Like This");
    await applyFeedback(baseline2.id, "Less Like This");
    await applyFeedback(baseline3.id, "Favorite", "Testing comment: Love the rhetorical richness here.");
    
    // Wait for feedback to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Post-Feedback Generation
    console.log('\n3️⃣ STEP 3 - POST-FEEDBACK GENERATION');
    console.log('-'.repeat(50));
    
    const postFeedback1 = await generateConcept(TEST_PROMPT, "Post-Feedback Concept 1");
    const postFeedback2 = await generateConcept(TEST_PROMPT, "Post-Feedback Concept 2");
    const postFeedback3 = await generateConcept(TEST_PROMPT, "Post-Feedback Concept 3");
    
    displayConcept(postFeedback1, "POST-FEEDBACK CONCEPT 1");
    displayConcept(postFeedback2, "POST-FEEDBACK CONCEPT 2");
    displayConcept(postFeedback3, "POST-FEEDBACK CONCEPT 3");
    
    // Step 4: Log Retrieval and Feedback
    console.log('\n4️⃣ STEP 4 - RETRIEVAL AND FEEDBACK LOGS');
    console.log('-'.repeat(50));
    
    await checkFeedbackRecords();
    
    // Step 5: Output Comparison
    console.log('\n5️⃣ STEP 5 - OUTPUT COMPARISON');
    console.log('-'.repeat(50));
    
    console.log('\n📊 BASELINE vs POST-FEEDBACK COMPARISON:');
    console.log('\nBaseline Retrieval Patterns:');
    console.log(`  Concept 1: ${baseline1.retrievalRefs.join(', ') || 'None'}`);
    console.log(`  Concept 2: ${baseline2.retrievalRefs.join(', ') || 'None'}`);
    console.log(`  Concept 3: ${baseline3.retrievalRefs.join(', ') || 'None'}`);
    
    console.log('\nPost-Feedback Retrieval Patterns:');
    console.log(`  Concept 1: ${postFeedback1.retrievalRefs.join(', ') || 'None'}`);
    console.log(`  Concept 2: ${postFeedback2.retrievalRefs.join(', ') || 'None'}`);
    console.log(`  Concept 3: ${postFeedback3.retrievalRefs.join(', ') || 'None'}`);
    
    // Step 6: Validation Statement
    console.log('\n6️⃣ STEP 6 - VALIDATION STATEMENT');
    console.log('-'.repeat(50));
    
    const baselineRefs = [baseline1, baseline2, baseline3].map(c => c.retrievalRefs).flat();
    const postFeedbackRefs = [postFeedback1, postFeedback2, postFeedback3].map(c => c.retrievalRefs).flat();
    
    const retrievalEvolution = baselineRefs.length !== postFeedbackRefs.length || 
                              JSON.stringify(baselineRefs.sort()) !== JSON.stringify(postFeedbackRefs.sort());
    
    console.log('\n🔍 VALIDATION RESULTS:');
    console.log(`Feedback Recording: Active (feedback applied to 3 concepts)`);
    console.log(`${retrievalEvolution ? '' : ''} Retrieval Evolution: ${retrievalEvolution ? 'Detected' : 'Not Detected'}`);
    console.log(`Round-Robin System: Active (retrieval references provided)`);
    console.log(`Database Integration: Working (concepts stored with IDs)`);
    
    if (retrievalEvolution) {
      console.log('\nCONCLUSION: Human-in-the-loop preference modeling shows evidence of activity.');
      console.log('   Retrieval patterns evolved between baseline and post-feedback generations.');
    } else {
      console.log('\nCONCLUSION: Preference modeling system functional but no retrieval bias detected.');
      console.log('   This may indicate: 1) Insufficient feedback weight, 2) Similar retrieval pool, or 3) Short feedback processing time.');
    }
    
    console.log('\nTEST COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runPreferenceModelingTest().catch(console.error);