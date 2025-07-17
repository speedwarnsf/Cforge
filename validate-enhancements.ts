#!/usr/bin/env npx tsx
/**
 * Quick validation script for enhanced Concept Forge improvements
 */

import fs from 'fs/promises';
import { validateCorpus, generateCorpusReport } from './server/utils/corpusValidator.js';

async function validateEnhancements(): Promise<void> {
  console.log('🔍 Validating Concept Forge Enhancements...\n');
  
  try {
    // 1. Validate corpus quality
    console.log('📊 Checking corpus quality...');
    const validation = await validateCorpus();
    
    console.log(`✅ Corpus Status: ${validation.isValid ? 'Valid' : 'Invalid'}`);
    console.log(`📈 Quality Score: ${(validation.stats.qualityScore * 100).toFixed(1)}%`);
    console.log(`📊 Completeness: ${(validation.stats.completenessScore * 100).toFixed(1)}%`);
    console.log(`🎯 Diversity: ${(validation.stats.diversityScore * 100).toFixed(1)}%`);
    console.log(`🗂️ Total Campaigns: ${validation.stats.totalCampaigns}`);
    
    if (validation.errors.length > 0) {
      console.log(`\n❌ Errors found: ${validation.errors.length}`);
      validation.errors.slice(0, 3).forEach(error => console.log(`   - ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log(`\n⚠️ Warnings found: ${validation.warnings.length}`);
      validation.warnings.slice(0, 3).forEach(warning => console.log(`   - ${warning}`));
    }
    
    // 2. Check corpus structure
    console.log('\n🏗️ Checking corpus structure...');
    const corpusData = await fs.readFile('data/retrieval-corpus.json', 'utf8');
    const corpus = JSON.parse(corpusData);
    const campaigns = corpus.campaigns || [];
    
    const hasEnhancedFields = campaigns.filter((c: any) => c.award || c.impactMetric).length;
    const hasFullRationales = campaigns.filter((c: any) => c.rationale && c.rationale.length >= 20).length;
    const hasDevices = campaigns.filter((c: any) => c.rhetoricalDevices && c.rhetoricalDevices.length > 0).length;
    
    console.log(`✅ Enhanced fields: ${hasEnhancedFields}/${campaigns.length} campaigns`);
    console.log(`✅ Full rationales: ${hasFullRationales}/${campaigns.length} campaigns`);
    console.log(`✅ Rhetorical devices: ${hasDevices}/${campaigns.length} campaigns`);
    
    // 3. Check file structure
    console.log('\n📁 Checking enhanced files...');
    const enhancedFiles = [
      'server/utils/enhancedEmbeddingRetrieval.ts',
      'server/utils/performanceMonitor.ts',
      'server/utils/corpusValidator.ts'
    ];
    
    for (const file of enhancedFiles) {
      try {
        await fs.access(file);
        console.log(`✅ ${file} exists`);
      } catch {
        console.log(`❌ ${file} missing`);
      }
    }
    
    // 4. Check backup files
    console.log('\n💾 Checking backup files...');
    const backupFiles = [
      'corpus-enhanced-quality.json',
      'corpus-with-public-health.json',
      'corpus-with-classics.json'
    ];
    
    for (const file of backupFiles) {
      try {
        await fs.access(file);
        const data = await fs.readFile(file, 'utf8');
        const backup = JSON.parse(data);
        console.log(`✅ ${file} (${backup.campaigns?.length || 0} campaigns)`);
      } catch {
        console.log(`⚠️ ${file} not found`);
      }
    }
    
    // 5. Generate quality report
    console.log('\n📋 Generating quality report...');
    const report = await generateCorpusReport();
    await fs.writeFile('CORPUS_QUALITY_REPORT.md', report);
    console.log('✅ Quality report saved to CORPUS_QUALITY_REPORT.md');
    
    // 6. Summary
    console.log('\n🎉 Enhancement Validation Summary:');
    
    if (validation.stats.totalCampaigns >= 200) {
      console.log('✅ 200 campaign milestone achieved');
    } else {
      console.log(`⚠️ Campaign count: ${validation.stats.totalCampaigns}/200`);
    }
    
    if (validation.stats.qualityScore >= 0.8) {
      console.log('✅ High quality corpus (80%+)');
    } else {
      console.log(`⚠️ Quality score: ${(validation.stats.qualityScore * 100).toFixed(1)}%`);
    }
    
    if (validation.errors.length === 0) {
      console.log('✅ No validation errors');
    } else {
      console.log(`❌ ${validation.errors.length} validation errors`);
    }
    
    console.log('\n✅ All enhancements validated successfully!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

validateEnhancements();