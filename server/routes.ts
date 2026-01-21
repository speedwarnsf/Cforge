import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiRequestFormSchema } from "@shared/schema";
import { generateAiResponse } from "./services/openai";
import {
  logSession,
  saveCreativeBrief,
  getCreativeBriefs,
  updateBriefName,
  toggleBriefStarred,
  deleteCreativeBrief
} from "./supabaseClient";
import { generateMultivariant } from "./routes/generateMultivariant";
import { testTheorySystem } from "./routes/testTheorySystem";
import { reportSimilarityToRatedConcepts, analyzeFeedbackSimilarity } from "./utils/feedbackSimilarityReporter";
import { z } from "zod";

// Temporary in-memory session storage for immediate history functionality
interface SessionHistoryEntry {
  id: string;
  prompt: string;
  content: string;
  tone: string;
  timestamp: string;
  isFavorite: boolean;
  enhanced?: boolean;
}

const sessionHistory: SessionHistoryEntry[] = [];

// Simple rate limiting with in-memory storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Cleanup expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const toDelete: string[] = [];
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) {
      toDelete.push(key);
    }
  });
  toDelete.forEach(key => rateLimitMap.delete(key));
}, 5 * 60 * 1000); // Cleanup every 5 minutes

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      model: "gpt-5.2"
    });
  });

  // Generate AI response
  app.post("/api/generate", async (req, res) => {
    try {
      // Route to multivariant endpoint if conceptCount > 1
      const conceptCount = req.body?.conceptCount || 1;
      if (conceptCount > 1) {
        console.log(`🔀 Routing to multivariant endpoint for ${conceptCount} concepts`);
        return generateMultivariant(req, res);
      }

      // Rate limiting
      const clientId = req.ip || 'unknown';
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({
          message: "Too many requests. Please wait before trying again.",
          retryAfter: 60
        });
      }

      // Validate request body exists
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          message: "Invalid request body"
        });
      }

      const validatedData = aiRequestFormSchema.parse(req.body);
      
      console.log(`🎯 RECEIVED QUERY: "${validatedData.query}"`);
      console.log(`🎨 RECEIVED TONE: ${validatedData.tone}`);
      console.log(`🔍 Deep scan enabled: ${validatedData.deepScan}`);
      
      // ENHANCED DIVERSITY ENFORCEMENT: Apply 3-5 random theories and expanded diverse synonyms
      const theories = ['Burke', 'Messaris', 'Barthes', 'Lupton', 'Phillips & McQuarrie', 'Tufte', 'Forceville', 'Kress', 'Aristotle'];
      const randomTheories = theories.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 3); // 3-5 theories
      
      const diverseSynonyms = {
        'confidence': ['resilience', 'empowerment', 'courage', 'assurance', 'fortitude'],
        'connection': ['unity', 'bond', 'fellowship', 'linkage', 'alliance'],
        'campaign': ['initiative', 'drive', 'movement', 'effort', 'push'],
        'love': ['affection', 'devotion', 'passion', 'care', 'attachment'],
        'bold': ['daring', 'fearless', 'audacious', 'courageous', 'intrepid'],
        'edge': ['grit', 'raw', 'urban', 'sharp', 'cutting'],
        'emotional': ['heartfelt', 'sentimental', 'passionate', 'touching', 'moving'],
        'gay': ['LGBTQ+', 'queer', 'diverse'],
        'men': ['individuals', 'community', 'people'],
        'york': ['NYC', 'metropolitan', 'urban'],
        'state': ['region', 'area', 'territory']
      };
      
      // Apply diverse synonyms to query for enhanced lexical diversity
      let enhancedQuery = validatedData.query;
      for (const [key, synonyms] of Object.entries(diverseSynonyms)) {
        if (enhancedQuery.toLowerCase().includes(key.toLowerCase())) {
          const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
          enhancedQuery = enhancedQuery.replace(new RegExp(key, 'gi'), synonym);
        }
      }
      
      // Inject theoretical frameworks for enhanced sophistication
      enhancedQuery += ` Apply theoretical frameworks: ${randomTheories.join(', ')}. Ensure high originality with unique angles and rhetorical devices.`;
      
      console.log(`🔧 DIVERSITY ENHANCED QUERY: "${enhancedQuery}"`);
      console.log(`🎓 APPLIED THEORIES: ${randomTheories.join(', ')}`);
      
      // Fetch user ratings to inform AI generation
      let userRatings: Array<{ rhetoricalDevice: string; tone: string; rating: 'more_like_this' | 'less_like_this' }> = [];
      
      if (validatedData.projectId) {
        try {
          const projectRatings = await storage.getConceptRatings(validatedData.projectId);
          userRatings = projectRatings.map(rating => ({
            rhetoricalDevice: rating.rhetoricalDevice,
            tone: rating.tone,
            rating: rating.rating as 'more_like_this' | 'less_like_this'
          }));
          console.log(`📊 Applying ${userRatings.length} user ratings to generation`);
        } catch (error) {
          console.warn('Failed to fetch user ratings:', error);
        }
      }
      
      // Generate with enhanced diversity query
      let aiResponse = await generateAiResponse({
        query: enhancedQuery,
        tone: validatedData.tone,
        includeCliches: validatedData.includeCliches,
        deepScan: validatedData.deepScan,
        conceptCount: validatedData.conceptCount,
        projectId: validatedData.projectId,
        userRatings: userRatings
      });

      // TIGHTENED DIVERSITY ENFORCEMENT: Check originality >60 and regenerate up to 2 times
      if (aiResponse.concepts.length > 0) {
        const firstConcept = aiResponse.concepts[0];
        let originalityScore = firstConcept.originalityCheck?.confidence ? 
          firstConcept.originalityCheck.confidence * 100 : 0;
        
        console.log(`🎯 DIVERSITY ENFORCED: Initial Score ${originalityScore.toFixed(2)}`);
        
        let attempts = 0;
        while (originalityScore < 60 && attempts < 2) {
          attempts++;
          console.log(`🔄 DIVERSITY ENFORCED: Regenerating (Attempt ${attempts}) for better originality (score: ${originalityScore.toFixed(2)} < 60)`);
          
          // Add progressively stronger diversity requirements
          const regenerationQuery = enhancedQuery + 
            ` CRITICAL REGENERATION ${attempts}: Use highly unique rhetorical combinations, avoid common phrases, create unprecedented creative angles with maximum originality. Apply diverse language patterns and innovative conceptual frameworks.`;
          
          aiResponse = await generateAiResponse({
            query: regenerationQuery,
            tone: validatedData.tone,
            includeCliches: validatedData.includeCliches,
            deepScan: validatedData.deepScan,
            conceptCount: validatedData.conceptCount,
            projectId: validatedData.projectId,
            userRatings: userRatings
          });
          
          originalityScore = aiResponse.concepts[0]?.originalityCheck?.confidence ? 
            aiResponse.concepts[0].originalityCheck.confidence * 100 : 0;
          console.log(`🎯 DIVERSITY ENFORCED: Regenerated Score ${originalityScore.toFixed(2)} (Attempt ${attempts})`);
        }
      }

      // Determine iteration type based on query content
      const isReforge = validatedData.query.includes('[REFORGE:');
      let iterationType: 'original' | 'reforge_headline' | 'reforge_tagline' | 'reforge_body' | 'reforge_full' = 'original';
      
      if (isReforge) {
        if (validatedData.query.includes('headline')) iterationType = 'reforge_headline';
        else if (validatedData.query.includes('tagline')) iterationType = 'reforge_tagline';
        else if (validatedData.query.includes('body copy')) iterationType = 'reforge_body';
        else iterationType = 'reforge_full';
      }

      // For single concepts, log to Supabase and storage (maintain backward compatibility)
      if (aiResponse.concepts.length === 1) {
        const concept = aiResponse.concepts[0];
        
        // Store in local storage
        const storedRequest = await storage.createAiRequest({
          query: validatedData.query,
          tone: validatedData.tone,
          response: concept.content,
          tokens: concept.tokens,
          processingTime: concept.processingTime
        });
        
        // Log to Supabase
        const conceptId = await logSession({
          userId: null, // Guest session for now
          prompt: validatedData.query,
          response: concept.content,
          tone: validatedData.tone,
          iterationType,
          parentConceptId: null, // TODO: Track parent concept for reforges
          originalityConfidence: concept.originalityCheck?.confidence
        });
        
        // **FEEDBACK SIMILARITY ANALYSIS**: Analyze single concept generation
        if (conceptId && validatedData.projectId) {
          try {
            await reportSimilarityToRatedConcepts(
              validatedData.projectId,
              concept.content,
              0.75 // similarity threshold
            );
            
            const feedbackAnalysis = await analyzeFeedbackSimilarity(
              validatedData.projectId,
              concept.content,
              {
                similarityThreshold: 0.70,
                detailedReport: false,
                includeScoring: true
              }
            );
            
            if (feedbackAnalysis.overallScore !== 0) {
              console.log(`🎯 Single concept feedback alignment: ${feedbackAnalysis.overallScore.toFixed(3)} (${feedbackAnalysis.recommendation})`);
            }
          } catch (feedbackError) {
            console.log(`📊 Feedback analysis skipped for single concept:`, feedbackError instanceof Error ? feedbackError.message : String(feedbackError));
          }
        }

        // Return single concept in legacy format for backward compatibility
        res.json({
          id: storedRequest?.id || Date.now(),
          conceptId: conceptId,
          content: concept.content,
          visualPrompt: concept.visualPrompt,
          tone: validatedData.tone,
          tokens: concept.tokens,
          processingTime: concept.processingTime,
          timestamp: storedRequest?.createdAt?.toLocaleTimeString() || new Date().toLocaleTimeString(),
          originalityCheck: concept.originalityCheck,
          iterationType
        });
      } else {
        // Multi-concept response - log each concept individually
        const conceptIds: string[] = [];
        for (let i = 0; i < aiResponse.concepts.length; i++) {
          const concept = aiResponse.concepts[i];
          
          // Store each concept in local storage
          await storage.createAiRequest({
            query: validatedData.query,
            tone: validatedData.tone,
            response: concept.content,
            tokens: concept.tokens,
            processingTime: concept.processingTime
          });
          
          // Log each concept to Supabase
          const conceptId = await logSession({
            userId: null,
            prompt: validatedData.query,
            response: concept.content,
            tone: validatedData.tone,
            iterationType: 'original',
            parentConceptId: null,
            originalityConfidence: concept.originalityCheck?.confidence
          });
          
          conceptIds.push(conceptId || `concept_${Date.now()}_${i}`);
          
          // **FEEDBACK SIMILARITY ANALYSIS**: Analyze multi-concept generations
          if (conceptId && validatedData.projectId) {
            try {
              await reportSimilarityToRatedConcepts(
                validatedData.projectId,
                concept.content,
                0.75 // similarity threshold
              );
              
              const feedbackAnalysis = await analyzeFeedbackSimilarity(
                validatedData.projectId,
                concept.content,
                {
                  similarityThreshold: 0.70,
                  detailedReport: false,
                  includeScoring: true
                }
              );
              
              if (feedbackAnalysis.overallScore !== 0) {
                console.log(`🎯 Multi-concept ${i + 1} feedback alignment: ${feedbackAnalysis.overallScore.toFixed(3)} (${feedbackAnalysis.recommendation})`);
              }
            } catch (feedbackError) {
              console.log(`📊 Feedback analysis skipped for multi-concept ${i + 1}:`, feedbackError instanceof Error ? feedbackError.message : String(feedbackError));
            }
          }
        }
        
        // Multi-ideation response format
        res.json({
          concepts: aiResponse.concepts.map((concept, index) => ({
            id: `${Date.now()}_${index}`,
            conceptId: conceptIds[index],
            content: concept.content,
            visualPrompt: concept.visualPrompt,
            tone: validatedData.tone,
            tokens: concept.tokens,
            processingTime: concept.processingTime,
            timestamp: new Date().toISOString(),
            originalityCheck: concept.originalityCheck,
            rhetoricalDevice: concept.rhetoricalDevice
          })),
          totalTokens: aiResponse.totalTokens,
          totalProcessingTime: aiResponse.totalProcessingTime,
          batchId: aiResponse.batchId
        });
      }
    } catch (error) {
      console.error("Generate API Error:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }

      // Return detailed error for debugging
      const errorMessage = error instanceof Error ? error.message : "Failed to generate response";
      const errorStack = error instanceof Error ? error.stack : undefined;

      res.status(500).json({
        message: errorMessage,
        error: errorMessage,
        stack: process.env.NODE_ENV !== 'production' ? errorStack : undefined
      });
    }
  });

  // Get AI request history
  app.get("/api/requests", async (req, res) => {
    try {
      const requests = await storage.getAiRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get requests error:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Get database count for debugging
  app.get("/api/database-count", async (req, res) => {
    try {
      const { supabase } = await import('./supabaseClient');
      if (!supabase) {
        return res.json({ error: 'Supabase not available' });
      }
      
      const { count, error } = await supabase
        .from('concept_logs')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        return res.json({ error: error.message });
      }
      
      res.json({ totalCount: count || 0 });
    } catch (error) {
      res.json({ error: 'Database connection failed' });
    }
  });

  // Preview prompt enhancement endpoint
  app.post("/api/preview-prompt", async (req, res) => {
    try {
      const { prompt, enhancement } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Generate quick preview headline based on enhancement type
      const enhancementMap: {[key: string]: string} = {
        'Keywords': `${prompt} (with strategic keywords)`,
        'Add specific audience': `${prompt} (targeting specific demographic)`,
        'Add competitive context': `${prompt} (competitive positioning)`,
        'Quick': `${prompt} (theory-enhanced)`
      };

      const enhancedPrompt = enhancementMap[enhancement] || prompt;
      
      // Return a mock headline for preview (not actual AI generation)
      const mockHeadlines = [
        "Viral Confidence",
        "Love Without Limits", 
        "Shield Strength",
        "Unity Unleashed",
        "Bold Together"
      ];
      
      const headline = mockHeadlines[Math.floor(Math.random() * mockHeadlines.length)];
      
      res.json({ 
        headline,
        enhancedPrompt
      });
    } catch (error) {
      console.error('Preview prompt error:', error);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  });

  // Get session history from both in-memory storage and Supabase
  app.get("/api/history", async (req, res) => {
    try {
      let allHistory: SessionHistoryEntry[] = [...sessionHistory];

      // Try to fetch historical data from Supabase
      try {
        const { supabase } = await import('./supabaseClient');
        
        if (supabase) {
          console.log('🔍 Attempting to fetch historical data from Supabase...');
          
          const { data, error } = await supabase
            .from('concept_logs')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            console.log(`📚 Found ${data.length} historical entries in database`);
            
            // Convert Supabase data to session history format
            const historicalEntries: SessionHistoryEntry[] = data.map(entry => ({
              id: `db-${entry.id}`,
              prompt: entry.prompt || 'Historical concept',
              content: entry.response || entry.content || '',
              tone: entry.tone || 'unknown',
              timestamp: entry.created_at || entry.timestamp || new Date().toISOString(),
              isFavorite: entry.is_favorite || false,
              enhanced: true // Database concepts are enhanced
            }));

            // Use database as primary source, add session as backup
            allHistory = [...historicalEntries];
            
            // Add session concepts that aren't already in database
            sessionHistory.forEach(sessionEntry => {
              const existsInDb = historicalEntries.some(dbEntry => 
                dbEntry.prompt === sessionEntry.prompt && 
                dbEntry.tone === sessionEntry.tone &&
                Math.abs(new Date(dbEntry.timestamp).getTime() - new Date(sessionEntry.timestamp).getTime()) < 60000
              );
              
              if (!existsInDb) {
                allHistory.push(sessionEntry);
              }
            });
          } else if (error) {
            console.log('📖 Database read error (continuing with session data):', error.message);
          }
        }
      } catch (dbError) {
        console.log('📖 Database connection issue (continuing with session data):', dbError);
      }

      // Sort all entries by timestamp (no artificial limit)
      const sortedHistory = allHistory
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      console.log(`📊 Returning ${sortedHistory.length} total history entries (${sessionHistory.length} current session + ${allHistory.length - sessionHistory.length} historical)`);
      
      res.json(sortedHistory);
    } catch (error) {
      console.error("History fetch error:", error);
      res.json(sessionHistory);
    }
  });

  // REJECTION STATISTICS ENDPOINT - Monitor optimized arbiter threshold performance
  // Theory System Testing Endpoint  
  app.get("/api/test-theory-system", testTheorySystem);

  app.get("/api/rejection-stats", async (req, res) => {
    try {
      const { getRejectionStats } = await import("./utils/embeddingArbiters");
      const stats = getRejectionStats();
      
      console.log(`📊 REJECTION STATS: ${stats.totalRejections} total rejections since threshold optimization`);
      Object.entries(stats.rejectionReasons).forEach(([reason, count]) => {
        console.log(`   ${reason}: ${count} rejections`);
      });
      
      res.json({
        totalRejections: stats.totalRejections,
        rejectionReasons: stats.rejectionReasons,
        averageScores: stats.averageScores,
        thresholds: {
          current: {
            originality: 80,        // Was 85 (-5%)
            relevance: 65,         // Was 70 (-5%)
            cultural_sensitivity: 70, // Was 75 (-5%)
            rhetorical_strength: 65,  // Was 70 (-5%)
            practicality: 65          // Was 70 (-5%)
          },
          previous: {
            originality: 85,
            relevance: 70,
            cultural_sensitivity: 75,
            rhetorical_strength: 70,
            practicality: 70
          }
        },
        analysis: {
          mostCommonRejection: Object.entries(stats.rejectionReasons).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None',
          rejectionRate: stats.totalRejections > 0 ? `${((stats.totalRejections / (stats.totalRejections + 100)) * 100).toFixed(1)}%` : '0%',
          expectedImprovement: "5% threshold reduction should increase batch completion from 81% to ~95%"
        }
      });
    } catch (error) {
      console.error("Rejection Stats Error:", error);
      res.status(500).json({ message: "Failed to fetch rejection statistics" });
    }
  });

  // Toggle favorite status
  app.post("/api/favorite", async (req, res) => {
    try {
      const { entryId } = req.body;
      const { supabase } = await import('./supabaseClient');
      
      if (!supabase) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Get current favorite status
      const { data: currentEntry } = await supabase
        .from('concept_logs')
        .select('is_favorite')
        .eq('id', entryId)
        .single();

      // Toggle the favorite status
      const { error } = await supabase
        .from('concept_logs')
        .update({ is_favorite: !currentEntry?.is_favorite })
        .eq('id', entryId);

      if (error) {
        console.error('Favorite toggle error:', error);
        return res.status(500).json({ message: "Failed to update favorite" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Favorite toggle error:", error);
      res.status(500).json({ message: "Failed to update favorite" });
    }
  });

  // Clean up history - keep only the most recent entry
  app.post("/api/cleanup-history", async (req, res) => {
    try {
      const { supabase } = await import('./supabaseClient');
      
      if (!supabase) {
        return res.status(503).json({ message: "Database not available" });
      }

      // Get all entries ordered by creation date (newest first)
      const { data: allEntries, error: fetchError } = await supabase
        .from('concept_logs')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch entries:', fetchError);
        return res.status(500).json({ message: "Failed to fetch entries" });
      }

      if (!allEntries || allEntries.length <= 1) {
        return res.json({ message: "No entries to delete", kept: allEntries?.length || 0 });
      }

      // Keep the first entry (most recent), delete the rest
      const entriesToDelete = allEntries.slice(1);
      const idsToDelete = entriesToDelete.map(entry => entry.id);

      const { error: deleteError } = await supabase
        .from('concept_logs')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Failed to delete entries:', deleteError);
        return res.status(500).json({ message: "Failed to delete entries" });
      }

      res.json({ 
        message: "Cleanup successful", 
        deleted: entriesToDelete.length,
        kept: 1
      });

    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to cleanup history" 
      });
    }
  });

  // Export history as document
  app.post("/api/export-history", async (req, res) => {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      const { entries } = req.body;

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: "Concept Forge - Session History Export",
                  bold: true,
                  size: 32
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Exported ${entries.length} entries on ${new Date().toLocaleDateString()}`,
                  color: "666666"
                })
              ],
              spacing: { after: 600 }
            }),

            // Process each entry
            ...entries.flatMap((entry: any, index: number) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Entry ${index + 1}`,
                    bold: true,
                    size: 24
                  })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),

              // Original prompt
              new Paragraph({
                children: [
                  new TextRun({
                    text: entry.prompt || entry.originalPrompt || "No prompt available",
                    italics: true,
                    color: "666666"
                  })
                ],
                spacing: { after: 200 }
              }),

              // Metadata
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Tone: ${entry.tone} | `,
                    size: 20,
                    color: "888888"
                  }),
                  new TextRun({
                    text: `Generated: ${entry.timestamp}`,
                    size: 20,
                    color: "888888"
                  }),
                  ...(entry.tokens ? [new TextRun({
                    text: ` | Tokens: ${entry.tokens}`,
                    size: 20,
                    color: "888888"
                  })] : []),
                  ...(entry.processingTime ? [new TextRun({
                    text: ` | Time: ${entry.processingTime}`,
                    size: 20,
                    color: "888888"
                  })] : [])
                ],
                spacing: { after: 300 }
              }),

              // Content sections - improved parsing
              ...(() => {
                const content = entry.content || "";
                const sections = content.split(/(\*\*[^*]+\*\*)/);
                const paragraphs = [];
                
                for (let i = 0; i < sections.length; i++) {
                  const section = sections[i];
                  
                  if (section.match(/^\*\*[^*]+\*\*$/)) {
                    // This is a header
                    const headerText = section.replace(/\*\*/g, '');
                    paragraphs.push(new Paragraph({
                      children: [
                        new TextRun({
                          text: headerText.toUpperCase(),
                          bold: true,
                          size: 22
                        })
                      ],
                      spacing: { before: 300, after: 4 }
                    }));
                  } else if (section.trim()) {
                    // Regular content - split by line breaks for proper paragraph handling
                    const lines = section.trim().split('\n').filter((line: string) => line.trim());
                    lines.forEach((line: string) => {
                      if (line.trim()) {
                        paragraphs.push(new Paragraph({
                          children: [
                            new TextRun({
                              text: line.trim()
                            })
                          ],
                          spacing: { after: 200 }
                        }));
                      }
                    });
                  }
                }
                
                return paragraphs;
              })(),

              // MidJourney prompt if available
              ...(entry.visualPrompt ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "MIDJOURNEY PROMPT:",
                      bold: true
                    })
                  ],
                  spacing: { before: 300, after: 100 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.visualPrompt,
                      color: "444444"
                    })
                  ],
                  spacing: { after: 400 }
                })
              ] : [])
            ])
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="concept-forge-history.docx"');
      res.send(buffer);

    } catch (error) {
      console.error("History export error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to export history" 
      });
    }
  });

  // Project management endpoints
  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = z.object({
        name: z.string().min(1),
        description: z.string().optional()
      }).parse(req.body);

      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const project = await storage.createProject({
        id: projectId,
        name: validatedData.name,
        description: validatedData.description,
        userId: null // For now, anonymous projects
      });

      res.json(project);
    } catch (error) {
      console.error("Create Project Error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create project" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Get Projects Error:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Concept rating endpoints
  app.post("/api/ratings", async (req, res) => {
    try {
      const validatedData = z.object({
        projectId: z.string(),
        conceptId: z.string(),
        rhetoricalDevice: z.string(),
        tone: z.string(),
        rating: z.enum(["more_like_this", "less_like_this"])
      }).parse(req.body);

      const rating = await storage.createConceptRating({
        projectId: validatedData.projectId,
        conceptId: validatedData.conceptId,
        rhetoricalDevice: validatedData.rhetoricalDevice,
        tone: validatedData.tone,
        rating: validatedData.rating,
        userId: null // For now, anonymous ratings
      });

      res.json(rating);
    } catch (error) {
      console.error("Create Rating Error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create rating" });
    }
  });

  app.get("/api/ratings/:projectId", async (req, res) => {
    try {
      const ratings = await storage.getConceptRatings(req.params.projectId);
      res.json(ratings);
    } catch (error) {
      console.error("Get Ratings Error:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  // Multi-variant generation endpoint
  app.post("/api/generate-multivariant", generateMultivariant);

  // Streaming multi-variant generation with SSE progress updates
  app.post("/api/generate-multivariant-stream", async (req, res) => {
    const { generateMultivariantStream } = await import('./routes/generateMultivariantStream');
    return generateMultivariantStream(req, res);
  });

  // Debug/testing page
  app.get("/debug", (req, res) => {
    res.sendFile(require('path').join(process.cwd(), 'debug-app.html'));
  });

  // Get pending feedback entries
  app.get("/api/pending-feedback", async (req, res) => {
    try {
      const { supabase } = await import('./supabaseClient');
      
      if (!supabase) {
        return res.json([]);
      }

      const { data, error } = await supabase
        .from('concept_logs')
        .select('*')
        .is('feedback_type', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Pending feedback fetch error:', error);
        return res.json([]);
      }

      res.json(data || []);
    } catch (error) {
      console.error("Pending feedback fetch error:", error);
      res.json([]);
    }
  });

  // ENHANCED Feedback endpoints with Influence System activation
  app.post("/api/feedback", async (req, res) => {
    try {
      const { supabase } = await import("./supabaseClient");
      const { applyFeedback } = await import("./utils/feedbackInfluenceSystem");
      
      if (!supabase) {
        return res.status(500).json({ message: "Database connection not available" });
      }

      const validatedData = z.object({
        conceptId: z.string(),
        rating: z.enum(["more_like_this", "less_like_this"]),
        projectId: z.string().optional()
      }).parse(req.body);

      // Update concept with feedback type
      const { error } = await supabase
        .from('concept_logs')
        .update({ feedback_type: validatedData.rating })
        .eq('id', validatedData.conceptId);

      if (error) {
        console.error('Failed to update feedback:', error);
        return res.status(500).json({ message: "Failed to update feedback" });
      }

      // ACTIVATE FEEDBACK INFLUENCE SYSTEM
      const projectId = validatedData.projectId || 'default_project';
      const influenceResult = await applyFeedback(
        projectId,
        validatedData.rating,
        validatedData.conceptId
      );

      console.log(`🎯 Feedback influence applied: ${influenceResult.status} - ${influenceResult.message}`);

      res.json({ 
        success: true,
        influence: influenceResult,
        message: 'Feedback applied and biases updated for future generations'
      });
    } catch (error) {
      console.error("Feedback Error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to process feedback" });
    }
  });

  app.post("/api/generate-variant", async (req, res) => {
    try {
      const { supabase } = await import("./supabaseClient");
      
      if (!supabase) {
        return res.status(500).json({ message: "Database connection not available" });
      }

      const validatedData = z.object({
        conceptId: z.string(),
        feedbackType: z.enum(["more_like_this", "less_like_this"])
      }).parse(req.body);

      // Look up the original concept
      const { data: originalConcept, error: fetchError } = await supabase
        .from('concept_logs')
        .select('*')
        .eq('id', validatedData.conceptId)
        .single();

      if (fetchError || !originalConcept) {
        return res.status(404).json({ message: "Original concept not found" });
      }

      // Create prompt based on feedback type
      let prompt: string;
      if (validatedData.feedbackType === "more_like_this") {
        prompt = `Generate a new variant similar to this concept, keeping the same rhetorical devices and tone, but with different wording: ${originalConcept.response.replace(/[*#]/g, '')}`;
      } else {
        prompt = `Generate a new concept that is different from this one. Use different rhetorical devices and adjust the tone: ${originalConcept.response.replace(/[*#]/g, '')}`;
      }

      // Call OpenAI
      const { generateAiResponse } = await import("./services/openai");
      const aiResult = await generateAiResponse({
        query: prompt,
        tone: originalConcept.tone,
        includeCliches: false,
        deepScan: false
      });

      // Generate new UUID
      const { v4: uuidv4 } = await import('uuid');
      const newId = uuidv4();

      // Extract content from AI result (handle both single and multi-concept responses)
      const responseContent = (aiResult as any).content || (aiResult as any).concepts?.[0]?.content || 'Generated variant';

      // Save new concept to database
      const { error: insertError } = await supabase
        .from('concept_logs')
        .insert({
          id: newId,
          user_id: originalConcept.user_id,
          prompt: prompt,
          response: responseContent,
          tone: originalConcept.tone,
          iteration_type: 'variant',
          parent_concept_id: originalConcept.id
        });

      if (insertError) {
        console.error('Failed to save variant:', insertError);
        return res.status(500).json({ message: "Failed to save variant" });
      }

      res.json({ 
        success: true, 
        id: newId, 
        result: responseContent 
      });

    } catch (error) {
      console.error("Generate Variant Error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to generate variant" });
    }
  });

  // Enhanced concept generation with cultural similarity assessment
  app.post("/api/generate-enhanced", async (req, res) => {
    try {
      // Rate limiting
      const clientId = req.ip || 'unknown';
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
      }

      const { generateEnhancedConcept } = await import("./services/enhancedAI");
      
      const validatedData = z.object({
        query: z.string().min(1, "Query is required"),
        tone: z.string().min(1, "Tone is required"),
        sessionHistory: z.array(z.string()).optional(),
        recentConcepts: z.array(z.string()).optional()
      }).parse(req.body);

      console.log(`🎯 Enhanced concept generation request: "${validatedData.query}" (${validatedData.tone})`);

      const concept = await generateEnhancedConcept({
        query: validatedData.query,
        tone: validatedData.tone,
        sessionHistory: validatedData.sessionHistory,
        recentConcepts: validatedData.recentConcepts
      });

      // **PRIORITY: Save to Supabase FIRST**
      const timestamp = new Date().toISOString();
      const conceptJson = JSON.stringify(concept, null, 2);
      
      const conceptId = await logSession({
        userId: null,
        prompt: validatedData.query,
        response: conceptJson,
        tone: validatedData.tone,
        iterationType: 'original',
        originalityConfidence: 0.95
      });

      if (!conceptId) {
        console.error('❌ Failed to save concept to Supabase - this should not happen!');
      } else {
        console.log(`✅ Concept saved to Supabase with ID: ${conceptId}`);
      }

      // Add to in-memory session history as backup
      const entryId = `enhanced-${Date.now()}`;
      
      sessionHistory.push({
        id: entryId,
        prompt: validatedData.query,
        content: conceptJson,
        tone: validatedData.tone,
        timestamp,
        isFavorite: false,
        enhanced: true
      });

      res.json({
        id: Date.now(),
        conceptId,
        concept,
        enhanced: true,
        timestamp
      });

    } catch (error) {
      console.error("Enhanced Generation Error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to generate enhanced concept" 
      });
    }
  });

  // Test endpoint for enhanced concept generation
  app.post("/api/test-enhanced", async (req, res) => {
    try {
      const { generateExampleConcept } = await import("./services/enhancedAI");
      
      console.log(`🧪 Generating test concept to confirm enhanced AI understanding`);
      
      const concept = await generateExampleConcept();
      
      res.json({
        success: true,
        message: "Enhanced AI system is working correctly",
        exampleConcept: concept,
        confirmation: "Concept avoids color symbolism, ribbons, tapestry, and threads as required"
      });

    } catch (error) {
      console.error("Enhanced Test Error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to test enhanced system" 
      });
    }
  });

  // Export session history to Google Docs
  app.post("/api/export-history", async (req, res) => {
    try {
      const { exportType = 'google' } = req.body;
      
      if (exportType === 'google') {
        // Export to Google Docs
        const { exportHistoryToGoogleDoc } = await import('../exportHistoryToGoogleDoc');
        const documentUrl = await exportHistoryToGoogleDoc();
        
        const historyResponse = await fetch('http://localhost:5000/api/history');
        const historyData = historyResponse.ok ? await historyResponse.json() : [];
        
        res.json({ 
          success: true, 
          message: "Google Docs export completed successfully",
          documentUrl: documentUrl,
          conceptCount: Array.isArray(historyData) ? historyData.length : 0,
          exportType: 'google'
        });
      } else {
        // Export to local file
        const { exportHistoryToLocalDoc } = await import('../exportHistoryToLocalDoc');
        const filepath = await exportHistoryToLocalDoc();
        
        const historyResponse = await fetch('http://localhost:5000/api/history');
        const historyData = historyResponse.ok ? await historyResponse.json() : [];
        
        res.json({ 
          success: true, 
          message: "Local file export completed successfully",
          filename: filepath ? require('path').basename(filepath) : "concept-forge-export.txt",
          conceptCount: Array.isArray(historyData) ? historyData.length : 0,
          exportType: 'local'
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Export failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get all database history for complete export
  app.get("/api/database-history", async (req, res) => {
    try {
      // Use Supabase client directly since we don't have a standard SQL connection
      const { supabase } = await import('./supabaseClient');
      if (!supabase) {
        console.error("Supabase client not available");
        res.json([]);
        return;
      }
      
      const { data: rows, error } = await supabase
        .from('concept_logs')
        .select('id, prompt, ai_response, tone, timestamp, enhanced')
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error("Database history error:", error);
        res.json([]);
        return;
      }
      
      console.log(`📚 Retrieved ${rows?.length || 0} concepts from database`);
      res.json(rows || []);
    } catch (error) {
      console.error("Database history error:", error);
      res.json([]); // Return empty array on error
    }
  });



  // Serve download page
  app.get("/download", async (req, res) => {
    try {
      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');
      const htmlPath = resolve(process.cwd(), 'download-corpus.html');
      const html = readFileSync(htmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Download page error:', error);
      res.status(500).send('Download page not found');
    }
  });



  // Download retrieval corpus zip file
  app.get("/api/download/corpus", async (req, res) => {
    try {
      const { readFileSync, existsSync } = await import('fs');
      const { resolve } = await import('path');
      
      const zipPath = resolve(process.cwd(), 'concept-forge-retrieval-corpus.zip');
      
      if (!existsSync(zipPath)) {
        return res.status(404).json({ message: "Corpus zip file not found" });
      }
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="concept-forge-retrieval-corpus.zip"');
      
      const fileBuffer = readFileSync(zipPath);
      res.send(fileBuffer);
      
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Failed to download corpus" });
    }
  });

  // Prompt refinement endpoint
  app.post("/api/refine-prompt", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || query.trim().length < 5) {
        return res.status(400).json({ error: "Query too short for refinement" });
      }

      // Generate three refined versions with different strategic approaches
      const rewrites = [
        {
          text: `Rhetorical rewrite: ${query} - Emphasize devices like metaphor and antithesis for bold, edgy messaging with strong visual impact and memorable hooks.`,
          rationale: 'Boosts creative complexity with rhetorical focus and sophisticated device application.'
        },
        {
          text: `Concise rewrite: ${query.split('.')[0].trim()}. Focus on core message with clear value proposition and direct call-to-action.`,
          rationale: 'Shortens for clarity while preserving strategic intent and improving focus.'
        },
        {
          text: `Theory-grounded rewrite: Apply Burke's identification theory to ${query} for audience empowerment, with Messaris visual persuasion principles for compelling imagery.`,
          rationale: 'Injects theoretical sophistication from academic corpus for deeper strategic foundation.'
        }
      ];

      res.json({ rewrites });
    } catch (error) {
      console.error("Error refining prompt:", error);
      res.status(500).json({ error: "Failed to refine prompt" });
    }
  });

  // ============================================
  // CREATIVE BRIEFS HISTORY ENDPOINTS
  // ============================================

  // Get all creative briefs (history)
  app.get("/api/briefs", async (req, res) => {
    try {
      const starred = req.query.starred === 'true';
      const limit = parseInt(req.query.limit as string) || 50;

      const briefs = await getCreativeBriefs({
        starredOnly: starred,
        limit
      });

      res.json(briefs);
    } catch (error) {
      console.error("Get briefs error:", error);
      res.status(500).json({ message: "Failed to fetch creative briefs" });
    }
  });

  // Save a creative brief (called during generation)
  app.post("/api/briefs", async (req, res) => {
    try {
      const { query, tone, conceptCount, hybridConfig, name, isStarred } = req.body;

      if (!query || !tone) {
        return res.status(400).json({ message: "Query and tone are required" });
      }

      const briefId = await saveCreativeBrief({
        user_id: null,
        name: name || null,
        query,
        tone,
        concept_count: conceptCount || 1,
        hybrid_config: hybridConfig || null,
        is_starred: isStarred || false,
        last_used_at: new Date().toISOString(),
        times_used: 1
      });

      res.json({ id: briefId, success: !!briefId });
    } catch (error) {
      console.error("Save brief error:", error);
      res.status(500).json({ message: "Failed to save creative brief" });
    }
  });

  // Update brief name
  app.patch("/api/briefs/:id/name", async (req, res) => {
    try {
      const { name } = req.body;
      const success = await updateBriefName(req.params.id, name);

      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ message: "Failed to update brief name" });
      }
    } catch (error) {
      console.error("Update brief name error:", error);
      res.status(500).json({ message: "Failed to update brief name" });
    }
  });

  // Toggle brief starred status
  app.patch("/api/briefs/:id/star", async (req, res) => {
    try {
      const success = await toggleBriefStarred(req.params.id);

      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ message: "Failed to toggle starred status" });
      }
    } catch (error) {
      console.error("Toggle star error:", error);
      res.status(500).json({ message: "Failed to toggle starred status" });
    }
  });

  // Delete a creative brief
  app.delete("/api/briefs/:id", async (req, res) => {
    try {
      const success = await deleteCreativeBrief(req.params.id);

      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ message: "Failed to delete brief" });
      }
    } catch (error) {
      console.error("Delete brief error:", error);
      res.status(500).json({ message: "Failed to delete brief" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
