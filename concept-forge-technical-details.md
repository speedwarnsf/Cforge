# Concept Forge - Technical Implementation Details

## Core System Architecture

### Multi-Variant Generation Pipeline
```typescript
// server/routes/generateMultivariant.ts
export async function generateMultivariant(req: Request, res: Response) {
  // 1. Parallel AI generation (10 concepts)
  // 2. Four-arbiter evaluation system
  // 3. Semantic similarity checking (85% threshold)
  // 4. Database persistence with Supabase
  // 5. Fragment salvaging for future use
}
```

### Semantic Similarity Detection
```typescript
// server/utils/embeddingSimilarity.ts
export async function enforceConceptDiversity(concepts: any[], threshold: number = 0.85) {
  // Uses OpenAI text-embedding-3-large for vector similarity
  // Calculates cosine similarity between concept pairs
  // Automatically regenerates concepts above threshold
}
```

### Database Integration
```typescript
// server/supabaseClient.ts
export async function logSession(sessionData: any) {
  // Saves concepts to Supabase with proper error handling
  // Tracks tokens, cost, performance metrics
  // Maintains historical data for 118+ entries
}
```

## Key Issues Identified

### 1. Multi-Variant Display Parsing
**Location:** `client/src/components/ai-generator-broken.tsx`
**Issue:** TypeScript errors preventing proper concept display
**Status:** Core generation works, display layer needs fixes

### 2. Feedback System Validation
**Location:** `server/routes.ts` line 730
**Issue:** Missing rating parameter validation
**Error:** `ZodError: "rating" field required but undefined`

### 3. Code Export Performance
**Location:** `server/routes.ts` `/api/export-codebase`
**Issue:** 15-56 second scan time for 2,396 files
**Status:** Working but slow due to large file count

## System Performance Metrics

### Current Status (from logs)
- **Database Entries:** 118 historical concepts
- **File Scan:** 2,396 files, 332MB total
- **API Performance:** 29 calls, 40,420 tokens, $0.26 cost
- **Generation Time:** 165 seconds for 10 concepts
- **Similarity Threshold:** 85% diversity enforcement

### API Cost Breakdown
- **Generation:** $0.0099-$0.0202 per concept
- **Arbiters:** $0.0036-$0.0042 per evaluation
- **Embeddings:** Included in generation cost
- **Average:** $0.0090 per API call

## Working Features

### ✅ Successfully Operating
1. **Multi-variant concept generation** - 10 parallel AI calls
2. **Database persistence** - Supabase integration working
3. **Semantic similarity** - 85% threshold enforcement
4. **Performance tracking** - Comprehensive metrics
5. **Code export API** - Successfully scans all files
6. **Historical data** - 118 entries retrieved correctly

### ⚠️ Needs Attention
1. **Display formatting** - Concept parsing issues
2. **Export UI** - Requires user interaction
3. **Feedback validation** - Missing rating parameter
4. **Performance optimization** - File scanning speed

## Remote Access Information

**Main Application:** https://2be05202-6b54-4f81-9a0c-6e7cdc5d9b33-00-ucysu2niqdn2.riker.replit.dev/
**Code Share Portal:** https://2be05202-6b54-4f81-9a0c-6e7cdc5d9b33-00-ucysu2niqdn2.riker.replit.dev/code-share

## Deployment Configuration

```bash
# .replit
modules = ["nodejs-20", "web", "postgresql-16", "python-3.11"]
run = "npm run dev"

[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

[[ports]]
localPort = 5000
externalPort = 80
```

## Environment Variables Required

```bash
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...
```

## Technical Recommendations

1. **Fix TypeScript errors** in `ai-generator-broken.tsx`
2. **Optimize file scanning** in export endpoint
3. **Implement proper validation** for feedback system
4. **Add loading states** for better UX
5. **Deploy to production** using Replit's deployment features

The system is fundamentally working well with sophisticated AI integration and database persistence. The main issues are in the UI layer and can be resolved with targeted fixes.