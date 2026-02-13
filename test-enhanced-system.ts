#!/usr/bin/env node --loader tsx/esm
/**
 * Comprehensive test suite for enhanced Concept Forge system
 */

import { initializeEnhancedRetrieval, retrieveEnhancedCampaigns, getEnhancedRetrievalStats } from './server/utils/enhancedEmbeddingRetrieval.js';
import { performanceMonitor } from './server/utils/performanceMonitor.js';
import { retrieveTopN } from './server/utils/embeddingRetrieval.js';

interface TestCase {
  name: string;
  prompt: string;
  expectedDevices?: string[];
  expectedBrands?: string[];
  minSimilarityScore?: number;
}

const testCases: TestCase[] = [
  {
    name: "Public Health Safety",
    prompt: "Create a campaign about road safety to prevent accidents using humor",
    expectedDevices: ["Humor", "Safety"],
    expectedBrands: ["Metro Trains Melbourne", "NHTSA"]
  },
  {
    name: "Anti-Smoking Youth",
    prompt: "Anti-smoking campaign targeting teenagers with shock value",
    expectedDevices: ["Shock Value", "Youth Appeal"],
    expectedBrands: ["Truth", "FDA"]
  },
  {
    name: "Mental Health Awareness",
    prompt: "Mental health campaign to reduce stigma and encourage conversation",
    expectedDevices: ["Conversation Starter", "Empathy"],
    expectedBrands: ["Time to Change", "Heads Together"]
  },
  {
    name: "Environmental Sustainability",
    prompt: "Sustainable fashion campaign about ocean plastic waste",
    expectedDevices: ["Environmental", "Metaphor"],
    expectedBrands: ["Patagonia", "Adidas"]
  },
  {
    name: "Technology Innovation",
    prompt: "AI technology campaign about revolutionary thinking",
    expectedDevices: ["Innovation", "Revolution"],
    expectedBrands: ["Apple", "IBM"]
  },
  {
    name: "Social Equality",
    prompt: "Diversity and inclusion campaign about breaking barriers",
    expectedDevices: ["Inclusivity", "Empowerment"],
    expectedBrands: ["Ad Council", "Dove"]
  }
];

async function runRetrievalTest(testCase: TestCase): Promise<{
  enhanced: any[];
  original: any[];
  performanceComparison: any;
}> {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`Prompt: "${testCase.prompt}"`);
  
  // Test enhanced retrieval
  const enhancedStart = performance.now();
  const enhancedResults = await retrieveEnhancedCampaigns(testCase.prompt, 3);
  const enhancedDuration = performance.now() - enhancedStart;
  
  // Test original retrieval
  const originalStart = performance.now();
  const originalResults = await retrieveTopN(testCase.prompt, 3);
  const originalDuration = performance.now() - originalStart;
  
  console.log(`Enhanced retrieval: ${enhancedDuration.toFixed(2)}ms`);
  console.log(`Original retrieval: ${originalDuration.toFixed(2)}ms`);
  
  console.log(`\n📊 Enhanced Results:`);
  enhancedResults.forEach((campaign, i) => {
    const devices = campaign.rhetoricalDevices?.slice(0, 2).join(', ') || 'None';
    const award = campaign.award || 'N/A';
    console.log(`   ${i + 1}. ${campaign.campaign} (${campaign.brand}, ${campaign.year}) - ${devices} [${award}]`);
  });
  
  console.log(`\n📊 Original Results:`);
  originalResults.forEach((campaign, i) => {
    const devices = campaign.rhetoricalDevices?.slice(0, 2).join(', ') || 'None';
    console.log(`   ${i + 1}. ${campaign.campaign} (${campaign.brand}, ${campaign.year}) - ${devices}`);
  });
  
  // Analyze diversity
  const enhancedBrands = new Set(enhancedResults.map(c => c.brand));
  const originalBrands = new Set(originalResults.map(c => c.brand));
  const enhancedDevices = new Set(enhancedResults.flatMap(c => c.rhetoricalDevices || []));
  const originalDevices = new Set(originalResults.flatMap(c => c.rhetoricalDevices || []));
  
  console.log(`\nDiversity Analysis:`);
  console.log(`   Enhanced: ${enhancedBrands.size} brands, ${enhancedDevices.size} devices`);
  console.log(`   Original: ${originalBrands.size} brands, ${originalDevices.size} devices`);
  
  return {
    enhanced: enhancedResults,
    original: originalResults,
    performanceComparison: {
      enhancedDuration,
      originalDuration,
      enhancedBrandDiversity: enhancedBrands.size,
      originalBrandDiversity: originalBrands.size,
      enhancedDeviceDiversity: enhancedDevices.size,
      originalDeviceDiversity: originalDevices.size
    }
  };
}

async function testCorpusQuality(): Promise<void> {
  console.log(`\n🔍 Testing Corpus Quality...`);
  
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile('data/retrieval-corpus.json', 'utf8');
    const corpus = JSON.parse(data);
    const campaigns = corpus.campaigns || [];
    
    // Quality metrics
    const totalCampaigns = campaigns.length;
    const hasHeadlines = campaigns.filter((c: any) => c.headline && c.headline !== 'N/A').length;
    const hasRationales = campaigns.filter((c: any) => c.rationale && c.rationale.length >= 20).length;
    const hasDevices = campaigns.filter((c: any) => c.rhetoricalDevices && c.rhetoricalDevices.length > 0).length;
    const hasAwards = campaigns.filter((c: any) => c.award).length;
    const hasImpactMetrics = campaigns.filter((c: any) => c.impactMetric).length;
    
    // Diversity metrics
    const brands = new Set(campaigns.map((c: any) => c.brand));
    const years = campaigns.map((c: any) => c.year).filter(Boolean);
    const yearRange = years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : 'N/A';
    const devices = new Set(campaigns.flatMap((c: any) => c.rhetoricalDevices || []));
    
    console.log(`📊 Corpus Quality Report:`);
    console.log(`   Total Campaigns: ${totalCampaigns}`);
    console.log(`   With Headlines: ${hasHeadlines}/${totalCampaigns} (${((hasHeadlines/totalCampaigns)*100).toFixed(1)}%)`);
    console.log(`   With Full Rationales: ${hasRationales}/${totalCampaigns} (${((hasRationales/totalCampaigns)*100).toFixed(1)}%)`);
    console.log(`   With Rhetorical Devices: ${hasDevices}/${totalCampaigns} (${((hasDevices/totalCampaigns)*100).toFixed(1)}%)`);
    console.log(`   With Awards: ${hasAwards}/${totalCampaigns} (${((hasAwards/totalCampaigns)*100).toFixed(1)}%)`);
    console.log(`   With Impact Metrics: ${hasImpactMetrics}/${totalCampaigns} (${((hasImpactMetrics/totalCampaigns)*100).toFixed(1)}%)`);
    console.log(`\nDiversity Metrics:`);
    console.log(`   Unique Brands: ${brands.size}`);
    console.log(`   Year Range: ${yearRange}`);
    console.log(`   Rhetorical Devices: ${devices.size}`);
    
    // Find potential issues
    const duplicateCampaigns = new Map();
    const shortRationales: any[] = [];
    
    campaigns.forEach((campaign: any, index: number) => {
      const key = `${campaign.campaign}-${campaign.brand}`;
      if (duplicateCampaigns.has(key)) {
        console.log(` Potential duplicate: ${campaign.campaign} (${campaign.brand})`);
      } else {
        duplicateCampaigns.set(key, index);
      }
      
      if (campaign.rationale && campaign.rationale.length < 20) {
        shortRationales.push(campaign);
      }
    });
    
    if (shortRationales.length > 0) {
      console.log(`\n Short rationales found: ${shortRationales.length}`);
      shortRationales.slice(0, 3).forEach(campaign => {
        console.log(`   - ${campaign.campaign}: "${campaign.rationale}"`);
      });
    }
    
  } catch (error) {
    console.error(`Corpus quality test failed:`, error);
  }
}

async function runPerformanceBenchmark(): Promise<void> {
  console.log(`\nRunning Performance Benchmark...`);
  
  const benchmarkPrompts = [
    "Sustainable fashion campaign",
    "Mental health awareness for youth", 
    "Anti-smoking with humor",
    "Road safety prevention",
    "Diversity and inclusion workplace"
  ];
  
  const results = [];
  
  for (const prompt of benchmarkPrompts) {
    const start = performance.now();
    try {
      const campaigns = await retrieveEnhancedCampaigns(prompt, 2);
      const duration = performance.now() - start;
      results.push({ prompt, duration, success: true, count: campaigns.length });
    } catch (error) {
      const duration = performance.now() - start;
      results.push({ prompt, duration, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
  
  const successfulResults = results.filter(r => r.success);
  const averageDuration = successfulResults.length > 0 
    ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length 
    : 0;
  
  console.log(`📊 Benchmark Results:`);
  console.log(`   Successful retrievals: ${successfulResults.length}/${results.length}`);
  console.log(`   Average duration: ${averageDuration.toFixed(2)}ms`);
  console.log(`   Success rate: ${((successfulResults.length/results.length)*100).toFixed(1)}%`);
  
  results.forEach(result => {
    const status = result.success ? '' : '';
    const info = result.success ? `${result.count} campaigns` : result.error;
    console.log(`   ${status} ${result.prompt}: ${result.duration.toFixed(2)}ms (${info})`);
  });
}

async function main(): Promise<void> {
  console.log('🚀 Starting Enhanced Concept Forge System Tests\n');
  
  try {
    // Initialize enhanced retrieval
    console.log('🔄 Initializing enhanced retrieval system...');
    await initializeEnhancedRetrieval();
    
    // Test corpus quality
    await testCorpusQuality();
    
    // Run performance benchmark
    await runPerformanceBenchmark();
    
    // Run comprehensive retrieval tests
    console.log(`\n🧪 Running Retrieval Tests...`);
    
    const testResults = [];
    for (const testCase of testCases) {
      const result = await runRetrievalTest(testCase);
      testResults.push(result);
    }
    
    // Generate final report
    console.log(`\n📋 Final Test Report:`);
    
    const avgEnhancedDuration = testResults.reduce((sum, r) => sum + r.performanceComparison.enhancedDuration, 0) / testResults.length;
    const avgOriginalDuration = testResults.reduce((sum, r) => sum + r.performanceComparison.originalDuration, 0) / testResults.length;
    const avgEnhancedBrandDiversity = testResults.reduce((sum, r) => sum + r.performanceComparison.enhancedBrandDiversity, 0) / testResults.length;
    const avgOriginalBrandDiversity = testResults.reduce((sum, r) => sum + r.performanceComparison.originalBrandDiversity, 0) / testResults.length;
    
    console.log(`   Average Enhanced Retrieval Time: ${avgEnhancedDuration.toFixed(2)}ms`);
    console.log(`   Average Original Retrieval Time: ${avgOriginalDuration.toFixed(2)}ms`);
    console.log(`   Performance Improvement: ${((avgOriginalDuration - avgEnhancedDuration) / avgOriginalDuration * 100).toFixed(1)}%`);
    console.log(`   Enhanced Brand Diversity: ${avgEnhancedBrandDiversity.toFixed(1)} brands/query`);
    console.log(`   Original Brand Diversity: ${avgOriginalBrandDiversity.toFixed(1)} brands/query`);
    console.log(`   Diversity Improvement: ${((avgEnhancedBrandDiversity - avgOriginalBrandDiversity) / avgOriginalBrandDiversity * 100).toFixed(1)}%`);
    
    // Get enhanced retrieval stats
    const stats = getEnhancedRetrievalStats();
    console.log(`\n📊 Enhanced Retrieval System Stats:`, stats);
    
    // Get performance monitor stats
    const perfStats = performanceMonitor.getStats();
    console.log(`\nPerformance Monitor Stats:`, perfStats);
    
    console.log(`\nAll tests completed successfully!`);
    
  } catch (error) {
    console.error(`Test suite failed:`, error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}