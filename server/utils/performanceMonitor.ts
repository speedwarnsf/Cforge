/**
 * Performance monitoring and analytics for Concept Forge
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

interface ApiCallMetric {
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiCalls: ApiCallMetric[] = [];
  private maxHistorySize = 1000;

  startTimer(operation: string): (success?: boolean, metadata?: Record<string, any>) => number {
    const startTime = performance.now();
    const timestamp = Date.now();

    return (success: boolean = true, metadata?: Record<string, any>): number => {
      const duration = performance.now() - startTime;
      
      this.addMetric({
        operation,
        duration,
        timestamp,
        success,
        metadata
      });
      
      return duration;
    };
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep history size manageable
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }
  }

  logApiCall(apiCall: ApiCallMetric): void {
    this.apiCalls.push(apiCall);
    
    // Keep API call history manageable
    if (this.apiCalls.length > this.maxHistorySize) {
      this.apiCalls.shift();
    }
    
    // Log formatted output
    //console.log(`API Call: ${apiCall.model} | Tokens: ${apiCall.promptTokens}→${apiCall.completionTokens} (${apiCall.totalTokens}) | Cost: $${apiCall.cost.toFixed(4)} | Duration: ${apiCall.duration.toFixed(0)}ms`);
  }

  getStats(timeWindow: number = 3600000): { // Default 1 hour
    performance: {
      totalOperations: number;
      averageDuration: number;
      successRate: number;
      slowestOperations: PerformanceMetric[];
    };
    apiUsage: {
      totalCalls: number;
      totalTokens: number;
      totalCost: number;
      averageLatency: number;
      modelBreakdown: Record<string, { calls: number; tokens: number; cost: number }>;
    };
  } {
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    // Filter metrics within time window
    const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
    const recentApiCalls = this.apiCalls.filter(a => a.timestamp >= windowStart);
    
    // Performance stats
    const totalOperations = recentMetrics.length;
    const successfulOps = recentMetrics.filter(m => m.success).length;
    const averageDuration = totalOperations > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0;
    const successRate = totalOperations > 0 ? successfulOps / totalOperations : 0;
    
    const slowestOperations = recentMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    // API usage stats
    const totalCalls = recentApiCalls.length;
    const totalTokens = recentApiCalls.reduce((sum, call) => sum + call.totalTokens, 0);
    const totalCost = recentApiCalls.reduce((sum, call) => sum + call.cost, 0);
    const averageLatency = totalCalls > 0
      ? recentApiCalls.reduce((sum, call) => sum + call.duration, 0) / totalCalls
      : 0;
    
    // Model breakdown
    const modelBreakdown: Record<string, { calls: number; tokens: number; cost: number }> = {};
    
    for (const call of recentApiCalls) {
      if (!modelBreakdown[call.model]) {
        modelBreakdown[call.model] = { calls: 0, tokens: 0, cost: 0 };
      }
      
      modelBreakdown[call.model].calls++;
      modelBreakdown[call.model].tokens += call.totalTokens;
      modelBreakdown[call.model].cost += call.cost;
    }
    
    return {
      performance: {
        totalOperations,
        averageDuration,
        successRate,
        slowestOperations
      },
      apiUsage: {
        totalCalls,
        totalTokens,
        totalCost,
        averageLatency,
        modelBreakdown
      }
    };
  }

  logOperationSummary(operation: string, details: Record<string, any>): void {
    //console.log(`📊 ${operation} Summary:`, details);
  }

  clearHistory(): void {
    this.metrics = [];
    this.apiCalls = [];
    //console.log('Performance history cleared');
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export { performanceMonitor, PerformanceMetric, ApiCallMetric };

// Helper function for timing operations
export function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const endTimer = performanceMonitor.startTimer(operation);
  
  return fn()
    .then(result => {
      endTimer(true, metadata);
      return result;
    })
    .catch(error => {
      endTimer(false, { error: error.message, ...metadata });
      throw error;
    });
}

export function measure<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const endTimer = performanceMonitor.startTimer(operation);
  
  try {
    const result = fn();
    endTimer(true, metadata);
    return result;
  } catch (error) {
    endTimer(false, { error: error instanceof Error ? error.message : 'Unknown error', ...metadata });
    throw error;
  }
}