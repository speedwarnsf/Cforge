import React from 'react';

export interface GenerationMetrics {
  totalTime: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  cacheHits: number;
  cacheMisses: number;
  theoriesApplied: string[];
  conceptCount: number;
}

interface AnalyticsDashboardProps {
  metrics: GenerationMetrics;
  isVisible?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  metrics, 
  isVisible = true 
}) => {
  if (!isVisible) return null;

  const promptTokenPercentage = metrics.totalTokens > 0 
    ? Math.round((metrics.promptTokens / metrics.totalTokens) * 100)
    : 0;
    
  const cacheHitRate = (metrics.cacheHits + metrics.cacheMisses) > 0
    ? Math.round((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100)
    : 0;

  const costPerConcept = metrics.conceptCount > 0
    ? metrics.totalCost / metrics.conceptCount
    : 0;
    
  // Cost threshold alerts
  const isHighCost = costPerConcept > 0.02;
  const alertStyle = {
    color: isHighCost ? '#ef4444' : '#10b981',
    fontWeight: 'bold'
  };

  return (
    <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
        Generation Analytics
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {(metrics.totalTime / 1000).toFixed(1)}s
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Time</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {metrics.totalTokens.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Tokens ({promptTokenPercentage}% prompt)
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            ${metrics.totalCost.toFixed(4)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Cost (${costPerConcept.toFixed(4)}/concept)
          </div>
          <div className="text-xs mt-1" style={alertStyle}>
            {isHighCost ? '⚠️ High Cost - Optimize Tokens' : '✅ Cost Optimal'}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {cacheHitRate}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Cache Hits ({metrics.cacheHits}/{metrics.cacheHits + metrics.cacheMisses})
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Theories Applied:
          </span>
          {metrics.theoriesApplied.map((theory, index) => (
            <span 
              key={index}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
            >
              {theory}
            </span>
          ))}
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
        Performance optimized with caching, token truncation, and parallel processing
      </div>
    </div>
  );
};