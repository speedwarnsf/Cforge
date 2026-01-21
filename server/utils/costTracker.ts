/**
 * OPENAI COST TRACKING AND PERFORMANCE MONITORING
 * Enhanced cost tracking with your preferred approach
 */

import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  timestamp: Date;
}

export interface APICallResult {
  content: string;
  usage: TokenUsage;
  duration: number;
}

// GPT pricing per 1K tokens (as of 2026)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5.2-pro': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'text-embedding-3-large': { input: 0.00013, output: 0 },
  'text-embedding-3-small': { input: 0.00002, output: 0 }
};

/**
 * Enhanced OpenAI completion with your preferred cost tracking approach
 */
export async function createCompletionWithTracking(
  openai: OpenAI,
  options: {
    model: string;
    messages: ChatCompletionMessageParam[];
    temperature?: number;
    max_tokens?: number;
  }
): Promise<APICallResult> {
  const startTime = Date.now();
  
  const completion = await openai.chat.completions.create({
    model: options.model,
    messages: options.messages,
    temperature: options.temperature,
    max_tokens: options.max_tokens
  });

  const duration = Date.now() - startTime;
  const rawContent = completion.choices[0].message.content || "";
  const usage = completion.usage;
  
  if (usage) {
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    
    // Calculate accurate cost based on model pricing
    const pricing = MODEL_PRICING[options.model] || MODEL_PRICING['gpt-5.2-pro'];
    const estimatedCost = (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
    
    console.log(`✅ Tokens used: prompt=${promptTokens}, completion=${completionTokens} (total=${totalTokens})`);
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    return {
      content: rawContent,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        model: options.model,
        timestamp: new Date()
      },
      duration
    };
  }
  
  // Fallback if no usage data
  return {
    content: rawContent,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      model: options.model,
      timestamp: new Date()
    },
    duration
  };
}

/**
 * Session cost tracking
 */
export class SessionCostTracker {
  private calls: TokenUsage[] = [];
  
  addCall(usage: TokenUsage) {
    this.calls.push(usage);
  }
  
  getSessionSummary() {
    const totalCost = this.calls.reduce((sum, call) => sum + call.estimatedCost, 0);
    const totalTokens = this.calls.reduce((sum, call) => sum + call.totalTokens, 0);
    const totalPromptTokens = this.calls.reduce((sum, call) => sum + call.promptTokens, 0);
    const totalCompletionTokens = this.calls.reduce((sum, call) => sum + call.completionTokens, 0);
    
    return {
      totalCalls: this.calls.length,
      totalCost,
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      averageCostPerCall: this.calls.length > 0 ? totalCost / this.calls.length : 0,
      averageTokensPerCall: this.calls.length > 0 ? totalTokens / this.calls.length : 0,
      calls: this.calls
    };
  }
  
  reset() {
    this.calls = [];
  }
}

// Global session tracker
export const sessionTracker = new SessionCostTracker();

/**
 * Wrapper function that matches your preferred API structure
 */
export async function generateWithCostTracking(
  openai: OpenAI,
  model: string,
  prompt: string,
  options: {
    temperature?: number;
    max_tokens?: number;
    systemMessage?: string;
  } = {}
): Promise<APICallResult> {
  const systemMessage = options.systemMessage || "You are a creative AI specializing in rhetorical advertising concepts.";
  
  const result = await createCompletionWithTracking(openai, {
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: prompt }
    ],
    temperature: options.temperature,
    max_tokens: options.max_tokens
  });
  
  // Add to session tracking
  sessionTracker.addCall(result.usage);
  
  return result;
}

export default {
  createCompletionWithTracking,
  generateWithCostTracking,
  SessionCostTracker,
  sessionTracker
};