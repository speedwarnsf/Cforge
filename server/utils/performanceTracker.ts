interface PerformanceMetrics {
  totalTime: number;
  apiCalls: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  startTime: number;
  operations: {
    operation: string;
    duration: number;
    tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    cost?: number;
  }[];
}

// OpenAI GPT-4o pricing (as of 2024)
const GPT4O_INPUT_COST_PER_1K = 0.005;  // $0.005 per 1K input tokens
const GPT4O_OUTPUT_COST_PER_1K = 0.015; // $0.015 per 1K output tokens

function calculateCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1000) * GPT4O_INPUT_COST_PER_1K;
  const outputCost = (completionTokens / 1000) * GPT4O_OUTPUT_COST_PER_1K;
  return inputCost + outputCost;
}

class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    totalTime: 0,
    apiCalls: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalCost: 0,
    startTime: 0,
    operations: []
  };

  startTracking(): void {
    this.metrics.startTime = Date.now();
    this.metrics.operations = [];
    this.metrics.apiCalls = 0;
    this.metrics.totalTokens = 0;
    this.metrics.promptTokens = 0;
    this.metrics.completionTokens = 0;
    this.metrics.totalCost = 0;
    console.log('📊 Performance tracking started');
  }

  trackOperation(operation: string, startTime: number, endTime: number, tokenUsage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  }): void {
    const duration = endTime - startTime;
    
    let cost = 0;
    if (tokenUsage && tokenUsage.prompt_tokens && tokenUsage.completion_tokens) {
      cost = calculateCost(tokenUsage.prompt_tokens, tokenUsage.completion_tokens);
    }
    
    const operationData = {
      operation,
      duration,
      tokens: tokenUsage?.total_tokens,
      promptTokens: tokenUsage?.prompt_tokens,
      completionTokens: tokenUsage?.completion_tokens,
      cost
    };
    
    this.metrics.operations.push(operationData);
    
    if (tokenUsage) {
      this.metrics.apiCalls++;
      this.metrics.totalTokens += tokenUsage.total_tokens || 0;
      this.metrics.promptTokens += tokenUsage.prompt_tokens || 0;
      this.metrics.completionTokens += tokenUsage.completion_tokens || 0;
      this.metrics.totalCost += cost;
    }
    
    console.log(`🔍 ${operation}: ${duration}ms${tokenUsage ? `, ${tokenUsage.total_tokens} tokens, $${cost.toFixed(4)}` : ''}`);
  }

  getMetrics(): PerformanceMetrics {
    this.metrics.totalTime = Date.now() - this.metrics.startTime;
    return { ...this.metrics };
  }

  printSummary(): void {
    const finalMetrics = this.getMetrics();
    
    console.log('\nPERFORMANCE SUMMARY');
    console.log('========================');
    console.log(`⏱️  Total Time: ${finalMetrics.totalTime}ms (${(finalMetrics.totalTime / 1000).toFixed(2)}s)`);
    console.log(`🔗 API Calls: ${finalMetrics.apiCalls}`);
    console.log(`Total Tokens: ${finalMetrics.totalTokens}`);
    console.log(`Prompt Tokens: ${finalMetrics.promptTokens}`);
    console.log(`💬 Completion Tokens: ${finalMetrics.completionTokens}`);
    console.log(`💰 Total Cost: $${finalMetrics.totalCost.toFixed(4)}`);
    
    if (finalMetrics.operations.length > 0) {
      console.log('\n🔍 Operation Breakdown:');
      finalMetrics.operations.forEach(op => {
        const tokenInfo = op.tokens ? ` (${op.tokens} tokens)` : '';
        const costInfo = op.cost ? `, $${op.cost.toFixed(4)}` : '';
        console.log(`  • ${op.operation}: ${op.duration}ms${tokenInfo}${costInfo}`);
      });
    }
    
    const avgTimePerCall = finalMetrics.apiCalls > 0 ? (finalMetrics.totalTime / finalMetrics.apiCalls).toFixed(0) : 0;
    const avgTokensPerCall = finalMetrics.apiCalls > 0 ? (finalMetrics.totalTokens / finalMetrics.apiCalls).toFixed(0) : 0;
    const avgCostPerCall = finalMetrics.apiCalls > 0 ? (finalMetrics.totalCost / finalMetrics.apiCalls).toFixed(4) : 0;
    
    console.log('\n📊 Averages:');
    console.log(`  • Time per API call: ${avgTimePerCall}ms`);
    console.log(`  • Tokens per API call: ${avgTokensPerCall}`);
    console.log(`  • Cost per API call: $${avgCostPerCall}`);
    console.log('========================\n');
  }

  reset(): void {
    this.metrics = {
      totalTime: 0,
      apiCalls: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0,
      startTime: 0,
      operations: []
    };
  }
}

export const performanceTracker = new PerformanceTracker();
export { PerformanceMetrics };