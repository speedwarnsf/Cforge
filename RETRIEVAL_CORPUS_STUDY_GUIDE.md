# Concept Forge Retrieval Corpus - Study Guide
**Generated:** July 11, 2025  
**Total Campaigns:** 157  
**Date Range:** 1960-2025  

## Overview

This document provides the complete retrieval corpus used by Concept Forge V3 for generating contextual advertising concepts. The corpus contains 157 carefully curated campaign examples spanning 65 years of advertising excellence.

## Data Structure

Each campaign entry contains:
- **campaign**: Campaign name/title
- **brand**: Brand/company name
- **year**: Campaign launch year
- **headline**: Key headline or tagline
- **rhetoricalDevices**: Array of rhetorical techniques used
- **rationale**: Strategic explanation of approach
- **outcome**: Results or awards received
- **whenToUse**: Recommended usage scenarios
- **whenNotToUse**: Scenarios to avoid this approach

## Usage in Concept Forge

The retrieval system:
1. Uses semantic similarity matching to find relevant examples
2. Serves examples in round-robin pairs to ensure diversity
3. Injects context as "Retrieved Reference #1" and "Retrieved Reference #2"
4. Guides AI generation with real-world strategic examples

## File Formats Available

1. **JSON** - Original structured data (`data/retrieval-corpus.json`)
2. **CSV** - Spreadsheet format for analysis (`retrieval-corpus-export.csv`)
3. **Markdown** - Human-readable documentation (`retrieval-corpus-readable.md`)
4. **Excel** - Full-featured spreadsheet (`retrieval-corpus-analysis.xlsx`)

## Key Statistics

- **157 total campaigns**
- **65+ unique brands** (Nike, Apple, Dove, Google, P&G, etc.)
- **32+ rhetorical devices** (Metaphor, Antithesis, Anaphora, etc.)
- **Timeline**: 1960s to 2025
- **Industries**: Technology, Fashion, FMCG, Automotive, Social Causes

## Adding New Campaigns

To add new campaigns, maintain this structure:

```json
{
  "campaign": "Campaign Name",
  "brand": "Brand Name",
  "year": 2025,
  "headline": "Main Headline or Tagline",
  "rhetoricalDevices": ["Device1", "Device2"],
  "rationale": "Strategic explanation of why this works",
  "outcome": "Results, awards, or impact achieved",
  "whenToUse": "Recommended scenarios for this approach",
  "whenNotToUse": "When to avoid this strategy"
}
```

## Collaboration Guidelines

1. **Quality Standards**: Only include award-winning or highly effective campaigns
2. **Verification**: Ensure all headlines and details are accurate
3. **Diversity**: Maintain balance across industries, time periods, and approaches
4. **Attribution**: Include proper brand/year attribution for legal compliance

## Maintenance

- **Regular Updates**: Add recent breakthrough campaigns quarterly
- **Quality Review**: Annual audit for accuracy and relevance
- **Expansion**: Target 200-250 campaigns for Phase 2
- **Community Input**: Accept submissions from creative professionals

---

*This corpus serves as the foundation for Concept Forge's retrieval-augmented generation system, ensuring all AI outputs are grounded in proven advertising excellence.*