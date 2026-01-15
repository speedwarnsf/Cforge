// Streaming multivariant generation endpoint
import express from 'express';
import { createStreamingResponse, streamMultivariantGeneration } from '../utils/responsiveStreaming';
import { generateAiResponse } from '../utils/openAiHelper';
import { aiRequestFormSchema } from '../../shared/schema';

const router = express.Router();

router.post('/api/generate-multivariant-stream', async (req, res) => {
  const stream = createStreamingResponse(res);
  
  try {
    const validatedData = aiRequestFormSchema.parse(req.body);
    
    stream.write({
      type: 'start',
      message: 'Initializing streaming generation...',
      conceptCount: validatedData.conceptCount
    });

    const concepts = await streamMultivariantGeneration(
      stream,
      validatedData.conceptCount,
      async (index) => {
        // Generate single concept with progress updates
        const result = await generateAiResponse({
          query: validatedData.query,
          tone: validatedData.tone,
          includeCliches: validatedData.includeCliches,
          deepScan: validatedData.deepScan,
          conceptCount: 1,
          projectId: validatedData.projectId
        });
        
        return result.concepts[0];
      }
    );

    stream.end();
    
  } catch (error) {
    stream.write({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    stream.end();
  }
});

export default router;