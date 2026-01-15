/**
 * Corpus validation and quality assessment utilities
 */

import fs from 'fs/promises';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalCampaigns: number;
    completenessScore: number;
    diversityScore: number;
    qualityScore: number;
  };
}

interface CampaignIssue {
  index: number;
  campaign: string;
  brand: string;
  issues: string[];
}

export async function validateCorpus(filePath: string = 'data/retrieval-corpus.json'): Promise<ValidationResult> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const corpus = JSON.parse(data);
    const campaigns = corpus.campaigns || [];
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const issues: CampaignIssue[] = [];
    
    // Required fields validation
    const requiredFields = ['campaign', 'brand', 'year', 'headline', 'rhetoricalDevices', 'rationale'];
    
    campaigns.forEach((campaign: any, index: number) => {
      const campaignIssues: string[] = [];
      
      // Check required fields
      requiredFields.forEach(field => {
        if (!campaign[field]) {
          campaignIssues.push(`Missing ${field}`);
        }
      });
      
      // Validate field types and quality
      if (campaign.year && (typeof campaign.year !== 'number' || campaign.year < 1900 || campaign.year > new Date().getFullYear())) {
        campaignIssues.push(`Invalid year: ${campaign.year}`);
      }
      
      if (campaign.rhetoricalDevices && !Array.isArray(campaign.rhetoricalDevices)) {
        campaignIssues.push('rhetoricalDevices must be an array');
      } else if (campaign.rhetoricalDevices && campaign.rhetoricalDevices.length === 0) {
        campaignIssues.push('Empty rhetoricalDevices array');
      }
      
      if (campaign.rationale && typeof campaign.rationale === 'string' && campaign.rationale.length < 20) {
        campaignIssues.push(`Short rationale (${campaign.rationale.length} chars)`);
      }
      
      if (campaign.headline === 'N/A' || campaign.headline === 'null') {
        campaignIssues.push('Placeholder headline');
      }
      
      if (campaignIssues.length > 0) {
        issues.push({
          index,
          campaign: campaign.campaign || 'Unknown',
          brand: campaign.brand || 'Unknown',
          issues: campaignIssues
        });
      }
    });
    
    // Duplicate detection
    const seen = new Map<string, number>();
    campaigns.forEach((campaign: any, index: number) => {
      const key = `${campaign.campaign}-${campaign.brand}-${campaign.year}`;
      if (seen.has(key)) {
        errors.push(`Duplicate campaign found: ${campaign.campaign} (${campaign.brand}, ${campaign.year}) at indices ${seen.get(key)} and ${index}`);
      } else {
        seen.set(key, index);
      }
    });
    
    // Calculate quality scores
    const completenessScore = calculateCompletenessScore(campaigns);
    const diversityScore = calculateDiversityScore(campaigns);
    const qualityScore = (completenessScore + diversityScore) / 2;
    
    // Generate warnings for quality issues
    if (completenessScore < 0.8) {
      warnings.push(`Low completeness score: ${(completenessScore * 100).toFixed(1)}%`);
    }
    
    if (diversityScore < 0.7) {
      warnings.push(`Low diversity score: ${(diversityScore * 100).toFixed(1)}%`);
    }
    
    // Add specific issue warnings
    issues.forEach(issue => {
      if (issue.issues.length > 1) {
        warnings.push(`Multiple issues with ${issue.campaign} (${issue.brand}): ${issue.issues.join(', ')}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalCampaigns: campaigns.length,
        completenessScore,
        diversityScore,
        qualityScore
      }
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to validate corpus: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      stats: {
        totalCampaigns: 0,
        completenessScore: 0,
        diversityScore: 0,
        qualityScore: 0
      }
    };
  }
}

function calculateCompletenessScore(campaigns: any[]): number {
  if (campaigns.length === 0) return 0;
  
  let totalScore = 0;
  
  campaigns.forEach(campaign => {
    let score = 0;
    
    // Required fields (60% of score)
    if (campaign.campaign && campaign.campaign !== 'null') score += 10;
    if (campaign.brand && campaign.brand !== 'null') score += 10;
    if (campaign.year && typeof campaign.year === 'number') score += 10;
    if (campaign.headline && campaign.headline !== 'N/A' && campaign.headline !== 'null') score += 10;
    if (campaign.rhetoricalDevices && Array.isArray(campaign.rhetoricalDevices) && campaign.rhetoricalDevices.length > 0) score += 10;
    if (campaign.rationale && campaign.rationale.length >= 20) score += 10;
    
    // Quality fields (40% of score)
    if (campaign.outcome && campaign.outcome.length > 10) score += 5;
    if (campaign.whenToUse && campaign.whenToUse.length > 10) score += 5;
    if (campaign.whenNotToUse && campaign.whenNotToUse.length > 10) score += 5;
    if (campaign.award) score += 5;
    if (campaign.impactMetric) score += 5;
    if (campaign.rhetoricalDevices && campaign.rhetoricalDevices.length >= 2) score += 5;
    if (campaign.rationale && campaign.rationale.length >= 50) score += 5;
    if (campaign.headline && campaign.headline.length >= 3 && campaign.headline.length <= 50) score += 5;
    if (campaign.year && campaign.year >= 1950) score += 5;
    if (campaign.outcome && (campaign.outcome.includes('Award') || campaign.outcome.includes('Grand Prix'))) score += 5;
    
    totalScore += Math.min(score, 100);
  });
  
  return totalScore / (campaigns.length * 100);
}

function calculateDiversityScore(campaigns: any[]): number {
  if (campaigns.length === 0) return 0;
  
  // Brand diversity
  const brands = new Set(campaigns.map(c => c.brand).filter(Boolean));
  const brandDiversity = Math.min(brands.size / (campaigns.length * 0.8), 1); // 80% unique brands is ideal
  
  // Year diversity
  const years = campaigns.map(c => c.year).filter(Boolean);
  const yearRange = years.length > 0 ? Math.max(...years) - Math.min(...years) : 0;
  const yearDiversity = Math.min(yearRange / 70, 1); // 70 years is ideal range
  
  // Device diversity
  const allDevices = campaigns.flatMap(c => c.rhetoricalDevices || []);
  const uniqueDevices = new Set(allDevices);
  const deviceDiversity = Math.min(uniqueDevices.size / 50, 1); // 50 unique devices is ideal
  
  // Award/outcome diversity
  const outcomes = campaigns.map(c => c.outcome || '').filter(o => o.length > 0);
  const hasAwards = outcomes.filter(o => o.includes('Award') || o.includes('Grand Prix') || o.includes('Gold')).length;
  const awardDiversity = Math.min(hasAwards / (campaigns.length * 0.3), 1); // 30% with awards is good
  
  // Industry diversity (approximated by brand types)
  const healthBrands = campaigns.filter(c => 
    c.brand && (c.brand.includes('Health') || c.brand.includes('CDC') || c.brand.includes('Foundation'))
  ).length;
  const techBrands = campaigns.filter(c => 
    c.brand && (c.brand.includes('Apple') || c.brand.includes('IBM') || c.brand.includes('Microsoft'))
  ).length;
  const consumerBrands = campaigns.filter(c => 
    c.brand && (c.brand.includes('Nike') || c.brand.includes('Coca-Cola') || c.brand.includes('Dove'))
  ).length;
  
  const industryDiversity = Math.min((healthBrands + techBrands + consumerBrands) / (campaigns.length * 0.6), 1);
  
  return (brandDiversity + yearDiversity + deviceDiversity + awardDiversity + industryDiversity) / 5;
}

export async function generateCorpusReport(filePath: string = 'data/retrieval-corpus.json'): Promise<string> {
  const validation = await validateCorpus(filePath);
  
  let report = `# Corpus Quality Report\n\n`;
  
  report += `## Overview\n`;
  report += `- **Total Campaigns**: ${validation.stats.totalCampaigns}\n`;
  report += `- **Overall Quality**: ${(validation.stats.qualityScore * 100).toFixed(1)}%\n`;
  report += `- **Completeness**: ${(validation.stats.completenessScore * 100).toFixed(1)}%\n`;
  report += `- **Diversity**: ${(validation.stats.diversityScore * 100).toFixed(1)}%\n`;
  report += `- **Validation Status**: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}\n\n`;
  
  if (validation.errors.length > 0) {
    report += `## Errors (${validation.errors.length})\n`;
    validation.errors.forEach(error => {
      report += `- ❌ ${error}\n`;
    });
    report += `\n`;
  }
  
  if (validation.warnings.length > 0) {
    report += `## Warnings (${validation.warnings.length})\n`;
    validation.warnings.slice(0, 10).forEach(warning => {
      report += `- ⚠️ ${warning}\n`;
    });
    if (validation.warnings.length > 10) {
      report += `- ... and ${validation.warnings.length - 10} more warnings\n`;
    }
    report += `\n`;
  }
  
  // Add recommendations
  report += `## Recommendations\n`;
  
  if (validation.stats.completenessScore < 0.9) {
    report += `- 📝 Improve data completeness by filling missing fields and expanding short rationales\n`;
  }
  
  if (validation.stats.diversityScore < 0.8) {
    report += `- 🎯 Increase diversity by adding campaigns from different industries, years, and rhetorical approaches\n`;
  }
  
  if (validation.errors.length > 0) {
    report += `- 🔧 Fix validation errors before deploying to production\n`;
  }
  
  if (validation.warnings.length > 5) {
    report += `- ⚠️ Address data quality warnings to improve retrieval accuracy\n`;
  }
  
  return report;
}