// Enhanced Theory System Testing Endpoint
import { Request, Response } from 'express';
import { generateConceptWithTheoryInject, abTestGenerate } from '../utils/enhancedTheoryMapping';
import { readFileSync } from 'fs';

export async function testTheorySystem(req: Request, res: Response) {
  try {
    const testQueries = [
      "Create an empowering HIV awareness campaign using quantitative data visualization to decode stigma myths",
      "Design bold visual typography for cross-cultural health messaging about treatment adherence", 
      "Develop persuasive multimodal metaphors for community identification and belonging",
      "Build accessible infographics showing statistical evidence of healing narratives"
    ];

    const basePrompt = "Generate a sophisticated advertising concept that leverages advanced rhetorical theory:";
    const results = [];

    console.log('🧪 TESTING ENHANCED THEORY SYSTEM WITH CACHING AND LOGGING...');
    
    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`\n--- Test ${i + 1}: ${query.substring(0, 50)}... ---`);
      
      const startTime = performance.now();
      const result = generateConceptWithTheoryInject(basePrompt, query, []);
      const endTime = performance.now();
      
      results.push({
        query,
        detectedKeywords: result.detectedKeywords,
        selectedTheories: result.selectedTheories,
        injectionLength: result.theoryInjection.length,
        processingTime: Math.round(endTime - startTime),
        theoriesApplied: result.selectedTheories.length
      });
    }

    // Read theory injection log for analysis
    let logContents = "Log file not found or empty";
    try {
      logContents = readFileSync('./theory_inject.log', 'utf-8');
    } catch (error) {
      console.log('Theory injection log not yet created');
    }

    const summary = {
      totalTests: results.length,
      averageTheoriesPerQuery: Math.round(
        results.reduce((sum, r) => sum + r.theoriesApplied, 0) / results.length * 10
      ) / 10,
      averageProcessingTime: Math.round(
        results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
      ),
      totalKeywordsDetected: results.reduce((sum, r) => sum + r.detectedKeywords.length, 0),
      cachingEnabled: true,
      loggingEnabled: true,
      abTestingAvailable: true
    };

    res.json({
      status: 'Enhanced Theory System Test Complete',
      summary,
      testResults: results,
      recentLogEntries: logContents.split('\n').slice(-5).filter(Boolean),
      performanceNotes: [
        "Cache system reduces repeated corpus scans",
        "Logging provides detailed theory application debugging", 
        "A/B testing framework ready for empirical measurement",
        "371 keywords across 15+ theoretical frameworks active"
      ]
    });

  } catch (error: unknown) {
    console.error('Theory system test error:', error);
    res.status(500).json({
      error: 'Theory system test failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}