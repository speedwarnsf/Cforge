// Response streaming wrapper for improved UX during long generations
import { Response } from 'express';

export interface StreamingResponse {
  write: (data: string | object) => void;
  end: () => void;
}

/**
 * Creates a streaming response for long-running operations
 */
export function createStreamingResponse(res: Response): StreamingResponse {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  return {
    write: (data: string | object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    end: () => {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  };
}

/**
 * Stream progress updates during multivariant generation
 */
export async function streamMultivariantGeneration(
  stream: StreamingResponse,
  conceptCount: number,
  generationFn: (index: number) => Promise<any>
): Promise<any[]> {
  const concepts: any[] = [];
  
  stream.write({
    type: 'progress',
    message: `Starting generation of ${conceptCount} concepts...`,
    progress: 0
  });

  for (let i = 0; i < conceptCount; i++) {
    try {
      stream.write({
        type: 'progress', 
        message: `Generating concept ${i + 1} of ${conceptCount}...`,
        progress: (i / conceptCount) * 100
      });

      const concept = await generationFn(i);
      concepts.push(concept);

      stream.write({
        type: 'concept',
        concept: concept,
        index: i,
        progress: ((i + 1) / conceptCount) * 100
      });

    } catch (error) {
      stream.write({
        type: 'error',
        message: `Failed to generate concept ${i + 1}: ${error}`,
        index: i
      });
      throw error;
    }
  }

  stream.write({
    type: 'complete',
    message: `Generated ${concepts.length} concepts successfully`,
    progress: 100,
    totalConcepts: concepts.length
  });

  return concepts;
}