interface OriginalityResult {
  score: number; // 0-100 confidence score
  details?: string;
}

export async function checkOriginality(content: string): Promise<OriginalityResult> {
  // For now, return a high confidence score since no external search is configured
  // In the future, this could integrate with Google Custom Search API or known slogans database
  
  // Basic checks for very common phrases
  const commonPhrases = [
    'just do it',
    'think different',
    'the ultimate',
    'your journey',
    'unlock your potential',
    'ignite your passion',
    'empower yourself',
    'revolutionary',
    'game changer',
    'next level'
  ];
  
  const lowerContent = content.toLowerCase();
  const hasCommonPhrase = commonPhrases.some(phrase => lowerContent.includes(phrase));
  
  if (hasCommonPhrase) {
    return {
      score: 60,
      details: 'Contains common advertising phrases'
    };
  }
  
  // If no obvious clichés detected, return high originality score
  return {
    score: 95,
    details: 'No obvious similarities detected'
  };
}

// Helper function to calculate Levenshtein distance for headline diversity
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}