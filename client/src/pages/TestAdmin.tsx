import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface TestResult {
  id: string;
  prompt: string;
  tone: string;
  avoidCliches: boolean;
  maxOutputs: number;
  response: any;
  error?: string;
  rhetoricalExample?: any;
  timestamp: string;
  concepts?: any[];
}

interface ConceptResult {
  id: string;
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  originalityScore: number;
  example?: any;
  testId: string;
  feedbackType?: 'more_like_this' | 'less_like_this' | null;
}

export default function TestAdmin() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [conceptResults, setConceptResults] = useState<ConceptResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testsSummary, setTestsSummary] = useState<any>(null);
  const [enableIterativeRefinement, setEnableIterativeRefinement] = useState(true);
  const { toast } = useToast();

  // Test configurations for automated testing - 8 diverse scenarios
  const testConfigs = [
    // Creative tone tests (2)
    { query: "Launch campaign for sustainable sneakers made from ocean plastic", tone: "creative", maxOutputs: 3, avoidCliches: true },
    { query: "AI-powered meal planning app for busy families", tone: "creative", maxOutputs: 4, avoidCliches: false },
    
    // Analytical tone tests (2)
    { query: "B2B software that reduces energy costs by 40%", tone: "analytical", maxOutputs: 3, avoidCliches: true },
    { query: "Cybersecurity training program for employees", tone: "analytical", maxOutputs: 5, avoidCliches: false },
    
    // Conversational tone tests (2)
    { query: "Dating app for book lovers and intellectuals", tone: "conversational", maxOutputs: 3, avoidCliches: true },
    { query: "Mental health support app for students", tone: "conversational", maxOutputs: 4, avoidCliches: false },
    
    // Technical tone tests (1)
    { query: "Machine learning model for fraud detection", tone: "technical", maxOutputs: 3, avoidCliches: true },
    
    // Summarize tone tests (1)
    { query: "Comprehensive health insurance plan for freelancers", tone: "summarize", maxOutputs: 5, avoidCliches: false }
  ];

  // Run automated tests
  const runAutomatedTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    setConceptResults([]);
    
    const results: TestResult[] = [];
    const concepts: ConceptResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let tooLongCount = 0;
    let formatErrorCount = 0;

    for (let i = 0; i < testConfigs.length; i++) {
      const config = testConfigs[i];
      const testId = `test-${Date.now()}-${i}`;
      
      try {
        console.log(`Running test ${i + 1}/8:`, config);
        
        const response = await fetch('/api/generate-multivariant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...config,
            enableIterativeRefinement
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate response structure
        if (!Array.isArray(data)) {
          throw new Error('Response is not an array');
        }

        // Check each concept for formatting issues
        const conceptsWithValidation = data.map((concept: any) => {
          let hasFormatError = false;
          let isTooLong = false;
          
          // Check headline length
          if (concept.headlines) {
            concept.headlines.forEach((headline: string) => {
              const wordCount = headline.trim().split(/\s+/).length;
              if (wordCount > 3) {
                isTooLong = true;
                tooLongCount++;
              }
            });
          }
          
          // Check required fields
          if (!concept.visualDescription || !concept.headlines || !concept.rhetoricalDevice) {
            hasFormatError = true;
            formatErrorCount++;
          }

          return {
            ...concept,
            id: `${testId}-concept-${Math.random().toString(36).substr(2, 9)}`,
            testId,
            hasFormatError,
            isTooLong
          };
        });

        const testResult: TestResult = {
          id: testId,
          prompt: config.query,
          tone: config.tone,
          avoidCliches: config.avoidCliches,
          maxOutputs: config.maxOutputs,
          response: data,
          concepts: conceptsWithValidation,
          timestamp: new Date().toISOString()
        };

        results.push(testResult);
        concepts.push(...conceptsWithValidation.map((c: any) => ({
          id: c.id,
          visualDescription: c.visualDescription,
          headlines: c.headlines,
          rhetoricalDevice: c.rhetoricalDevice,
          originalityScore: c.originalityScore,
          example: c.example,
          testId: c.testId,
          feedbackType: null
        })));
        
        successCount++;
        console.log(`Test ${i + 1} completed successfully`);
        
      } catch (error) {
        console.error(`Test ${i + 1} failed:`, error);
        
        const testResult: TestResult = {
          id: testId,
          prompt: config.query,
          tone: config.tone,
          avoidCliches: config.avoidCliches,
          maxOutputs: config.maxOutputs,
          response: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };
        
        results.push(testResult);
        failureCount++;
      }

      // Add delay between requests to avoid rate limiting
      if (i < testConfigs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Enhanced summary report with required statistics
    const uniqueDevices = new Set(concepts.map(c => c.rhetoricalDevice)).size;
    const uniqueExamples = new Set(concepts.map(c => c.example?.campaign_name).filter(Boolean)).size;
    
    // Detect duplicate headlines
    const allHeadlines = concepts.flatMap(c => c.headlines || []);
    const headlineCounts = allHeadlines.reduce((acc, headline) => {
      acc[headline] = (acc[headline] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const duplicateHeadlines = Object.entries(headlineCounts)
      .filter(([_, count]) => count > 1)
      .map(([headline, count]) => ({ headline, count }));
    
    const summary = {
      totalTests: testConfigs.length,
      successCount,
      failureCount,
      tooLongCount,
      formatErrorCount,
      totalConcepts: concepts.length,
      uniqueRhetoricalDevices: uniqueDevices,
      uniqueRhetoricalExamples: uniqueExamples,
      duplicateHeadlines: duplicateHeadlines,
      completedAt: new Date().toISOString()
    };

    console.log('\n📊 ENHANCED TEST SUMMARY REPORT:');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Successful: ${summary.successCount}`);
    console.log(`Failed: ${summary.failureCount}`);
    console.log(`Concepts with too-long headlines: ${summary.tooLongCount}`);
    console.log(`Concepts with format errors: ${summary.formatErrorCount}`);
    console.log(`Total concepts generated: ${summary.totalConcepts}`);
    console.log(`Unique rhetorical devices: ${summary.uniqueRhetoricalDevices}`);
    console.log(`Unique rhetorical examples: ${summary.uniqueRhetoricalExamples}`);
    console.log(`Duplicate headlines found: ${summary.duplicateHeadlines.length}`);
    if (summary.duplicateHeadlines.length > 0) {
      console.log('Duplicate headlines:');
      summary.duplicateHeadlines.forEach(({ headline, count }) => {
        console.log(`  - "${headline}" (${count} times)`);
      });
    }

    setTestResults(results);
    setConceptResults(concepts);
    setTestsSummary(summary);
    setIsRunningTests(false);

    toast({
      title: "Automated Testing Complete",
      description: `${summary.successCount}/${summary.totalTests} tests successful. Generated ${summary.totalConcepts} concepts.`,
      duration: 5000,
    });
  };



  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          {/* Back Button */}
          <div className="mb-4">
            <Link href="/">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Concept Forge
              </Button>
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Concept Forge Testing Admin
          </h1>
          <p className="text-gray-600 mb-6">
            Automated testing and manual review interface for multi-variant generation system
          </p>
          
          {/* Iterative Refinement Control */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  Iterative Refinement System
                </h3>
                <p className="text-blue-700 text-sm">
                  Enable automatic concept refinement using originality, audience, and award arbiters (max 2 iterations)
                </p>
              </div>
              <button
                onClick={() => setEnableIterativeRefinement(!enableIterativeRefinement)}
                className={`relative inline-flex h-6 w-11 items-center rounded-none transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  enableIterativeRefinement ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-none bg-white transition-transform ${
                    enableIterativeRefinement ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="mt-2 text-xs text-blue-600 font-medium">
              Status: {enableIterativeRefinement ? 'ENABLED' : 'DISABLED'}
            </div>
          </div>
          
          <Button
            onClick={runAutomatedTests}
            disabled={isRunningTests}
            className="bg-black hover:bg-gray-800 text-white px-6 py-3"
          >
            {isRunningTests ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests... 
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run 8 Automated Tests
              </>
            )}
          </Button>
        </div>

        {/* Test Summary */}
        {testsSummary && (
          <div className="bg-gray-50 p-6 rounded-none mb-8">
            <h2 className="text-xl font-bold mb-4">Test Summary Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Successful: {testsSummary.successCount}/{testsSummary.totalTests}
              </div>
              <div className="flex items-center">
                <XCircle className="w-4 h-4 text-red-500 mr-2" />
                Failed: {testsSummary.failureCount}
              </div>
              <div>Total Concepts: {testsSummary.totalConcepts}</div>
              <div>Too-long Headlines: {testsSummary.tooLongCount}</div>
              <div>Format Errors: {testsSummary.formatErrorCount}</div>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">Test Results</h2>
            
            {testResults.map((test, testIndex) => (
              <div key={test.id} className="border border-gray-200 rounded-none p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Test {testIndex + 1}: {test.tone} tone
                  </h3>
                  <p className="text-gray-600 mb-2">"{test.prompt}"</p>
                  <div className="text-sm text-gray-500">
                    Settings: {test.maxOutputs} outputs, {test.avoidCliches ? 'avoid' : 'allow'} clichés
                  </div>
                  {test.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      Error: {test.error}
                    </div>
                  )}
                </div>

                {/* Generated Concepts */}
                {test.concepts && test.concepts.length > 0 && (
                  <div className="space-y-4">
                    {test.concepts.map((concept: any, conceptIndex: number) => {
                      const conceptData = conceptResults.find(c => c.id === concept.id);
                      
                      return (
                        <div key={concept.id} className="bg-gray-50 p-4 rounded-none">
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              Concept {conceptIndex + 1}: {concept.rhetoricalDevice}
                            </h4>
                            <p className="text-gray-700 mb-2">
                              <strong>Visual:</strong> {concept.visualDescription}
                            </p>
                            <p className="text-gray-700 mb-2">
                              <strong>Headlines:</strong> {concept.headlines?.join(' / ') || 'N/A'}
                            </p>
                            <p className="text-gray-700 mb-2">
                              <strong>Originality Score:</strong> {concept.originalityScore}%
                            </p>
                            
                            {/* Rhetorical Example Context */}
                            {concept.example && (
                              <p className="text-xs italic text-gray-500 mb-3">
                                Inspired by: {concept.example.campaign_name} – {concept.example.brand} ({concept.example.year}) – "{concept.example.headline}"
                              </p>
                            )}

                            {/* Validation Warnings */}
                            {(concept.isTooLong || concept.hasFormatError) && (
                              <div className="mb-3 text-sm">
                                {concept.isTooLong && (
                                  <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded mr-2">
                                    Headlines too long
                                  </span>
                                )}
                                {concept.hasFormatError && (
                                  <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded">
                                    Format error
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status Indicator */}
                          <div className="text-sm text-gray-600">
                            Saved to concept_logs (feedback_type: null)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}