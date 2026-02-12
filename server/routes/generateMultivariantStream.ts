import { Request, Response } from 'express';
import { HybridGenerationOrchestrator } from '../utils/hybridGenerationOrchestrator';
import { logSession, saveCreativeBrief } from '../supabaseClient';

interface StreamEvent {
  type: 'progress' | 'log' | 'variant' | 'complete' | 'error';
  data: any;
}

function sendSSE(res: Response, event: StreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  // Force flush to ensure immediate delivery (works with compression middleware)
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }
}

export async function generateMultivariantStream(req: Request, res: Response) {
  const {
    query,
    tone,
    conceptCount = 3,
    enableHybridMode = true,
    hybridConfig
  } = req.body;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  const startTime = Date.now();
  const logs: string[] = [];

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${message}`;
    logs.push(entry);
    sendSSE(res, { type: 'log', data: { message: entry, timestamp } });
  };

  const updateProgress = (step: string, progress: number, detail: string) => {
    sendSSE(res, {
      type: 'progress',
      data: { step, progress, detail }
    });
  };

  try {
    if (!query || !tone) {
      sendSSE(res, { type: 'error', data: { message: 'Query and tone are required' } });
      res.end();
      return;
    }

    log(`Starting generation for: "${query.substring(0, 50)}..."`);
    updateProgress('analyzing', 5, 'Analyzing your creative brief...');

    // Auto-save the creative brief to history (non-blocking)
    saveCreativeBrief({
      user_id: null,
      name: null,
      query,
      tone,
      concept_count: conceptCount,
      hybrid_config: hybridConfig || null,
      is_starred: false,
      last_used_at: new Date().toISOString(),
      times_used: 1
    }).catch(err => console.log('Brief auto-save skipped:', err.message));

    if (enableHybridMode) {
      log('Hybrid mode enabled - using CREATIVEDC + EvoToken-DLM pipeline');
      updateProgress('analyzing', 10, 'Initializing hybrid generation system...');

      const orchestrator = new HybridGenerationOrchestrator({
        enableDivergentExploration: hybridConfig?.enableDivergentExploration ?? true,
        enableProgressiveEvolution: hybridConfig?.enableProgressiveEvolution ?? false,  // PERF: Disabled by default
        enableTropeConstraints: hybridConfig?.enableTropeConstraints ?? true,
        creativityLevel: hybridConfig?.creativityLevel ?? 'balanced',
        fallbackToLegacy: true,
        // Pass progress callback for real-time updates
        onProgress: (phase: string, progress: number, detail: string) => {
          updateProgress(phase, progress, detail);
          log(detail);
        }
      });

      log('Starting divergent exploration phase...');
      updateProgress('exploring', 15, 'Exploring creative directions with multiple personas...');

      const hybridResult = await orchestrator.generate({
        userBrief: query,
        tone,
        requestedTropes: hybridConfig?.requestedTropes,
        variantCount: conceptCount,
        sessionId: `session_${Date.now()}`,
        // Progress callback for variant-level updates
        onVariantProgress: (variantIndex: number, total: number, status: string) => {
          const baseProgress = 40; // After exploration
          const variantProgress = baseProgress + ((variantIndex / total) * 40);
          updateProgress('generating', Math.round(variantProgress), `Generating variant ${variantIndex + 1}/${total}: ${status}`);
          log(`Variant ${variantIndex + 1}/${total}: ${status}`);
        }
      });

      log(`Generated ${hybridResult.variants.length} variants`);
      updateProgress('saving', 85, 'Saving concepts to database...');

      // Transform and save to database
      const outputs: any[] = [];
      for (let i = 0; i < hybridResult.variants.length; i++) {
        const variant = hybridResult.variants[i];

        log(`Saving variant ${i + 1} to Supabase...`);

        // Format device name for display (title case)
        const deviceDisplayName = variant.rhetoricalDevice
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const structuredContent = `**RHETORICAL DEVICE:** ${deviceDisplayName}
${variant.rhetoricalDeviceDefinition ? `*${variant.rhetoricalDeviceDefinition}*\n` : ''}
**VISUAL CONCEPT:**
${variant.visualDescription}

**HEADLINE:**
${variant.headlines[0] || 'No headline generated'}

${variant.tagline ? `**TAGLINE:** ${variant.tagline}\n` : ''}
${variant.bodyCopy ? `**BODY COPY:** ${variant.bodyCopy}\n` : ''}
**Prompt:** ${query}`;

        const conceptId = await logSession({
          userId: null,
          prompt: query,
          response: structuredContent,
          tone: tone,
        });

        const output = {
          visualDescription: variant.visualDescription,
          headlines: variant.headlines,
          rhetoricalDevice: variant.rhetoricalDevice,
          rhetoricalDeviceDefinition: variant.rhetoricalDeviceDefinition,
          originalityScore: Math.round(variant.scores.originality * 100),
          id: variant.id,
          tagline: variant.tagline,
          bodyCopy: variant.bodyCopy,
          conceptId: conceptId || `generated-${Date.now()}-${i}`,
          hybridMetadata: {
            creativeSeedOrigin: variant.creativeSeedOrigin,
            evolutionPath: variant.evolutionPath,
            scores: variant.scores
          }
        };

        outputs.push(output);

        // Send each variant as it's saved
        sendSSE(res, { type: 'variant', data: { index: i, variant: output } });

        const saveProgress = 85 + ((i + 1) / hybridResult.variants.length * 10);
        updateProgress('saving', Math.round(saveProgress), `Saved ${i + 1}/${hybridResult.variants.length} concepts`);
      }

      const endTime = Date.now();
      log(`Generation complete in ${endTime - startTime}ms`);
      updateProgress('complete', 100, `${outputs.length} concepts generated successfully!`);

      // Send final complete event with all data
      sendSSE(res, {
        type: 'complete',
        data: {
          success: true,
          outputs,
          metadata: {
            generationMode: 'hybrid',
            ...hybridResult.metadata,
            totalTime: endTime - startTime,
            savedCount: outputs.length
          },
          logs
        }
      });

    } else {
      // Fallback to non-hybrid mode (simplified)
      log('Using legacy generation mode');
      sendSSE(res, { type: 'error', data: { message: 'Legacy mode not supported in streaming endpoint' } });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error: ${errorMessage}`);
    sendSSE(res, { type: 'error', data: { message: errorMessage, logs } });
  } finally {
    res.end();
  }
}
