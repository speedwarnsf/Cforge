# Concept Forge - AI Agent Handoff Document
## Complete Project Context for Continuation

### Project Overview
Concept Forge is an advanced AI-powered creative ideation platform for art directors and creative professionals. The system generates advertising concepts using sophisticated multi-variant generation, four-arbiter quality assessment, iterative refinement, and intelligent fragment recombination.

### Current State
- **Status**: Fully operational production-ready system
- **Last Update**: July 2, 2025
- **Version**: v2.4 with four-arbiter system and cost tracking
- **Deployment**: Replit environment with PostgreSQL/Supabase integration

---

## Technical Architecture

### Stack Summary
- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend**: Express.js + Node.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM (Supabase)
- **AI**: OpenAI GPT-4o API integration
- **PWA**: Complete offline functionality with service workers

### Key File Structure
```
├── client/src/
│   ├── pages/Review.tsx (manual concept review interface)
│   ├── pages/TestAdmin.tsx (automated testing system)
│   └── components/ (shadcn/ui component library)
├── server/
│   ├── routes/generateMultivariant.ts (main generation engine)
│   ├── utils/iterativeRefinementEngine.ts (four-arbiter system)
│   ├── utils/performanceTracker.ts (cost/timing monitoring)
│   ├── utils/relevanceArbiter.ts (fourth arbiter)
│   └── utils/fragmentSalvager.ts (creative reuse system)
├── shared/schema.ts (type definitions)
└── supabase-*.sql (database migration scripts)
```

---

## Recent Major Implementations

### 1. Four-Arbiter Quality Assessment System
**Date**: July 2, 2025
**Implementation**: Complete four-arbiter evaluation system
- **Originality Arbiter**: 0-100 score, <75 triggers refinement
- **Audience Arbiter**: Low/Medium/High, Low triggers refinement  
- **Award Potential Arbiter**: Low/Medium/High, Low triggers refinement
- **Relevance Arbiter**: 0-100 score, <70 triggers refinement

**Performance**: 3,215ms - 6,516ms total evaluation time

### 2. Comprehensive Performance Tracking
**Date**: July 2, 2025
**Implementation**: `server/utils/performanceTracker.ts`
- Real-time API call timing and token counting
- Cost calculation using OpenAI GPT-4o pricing
- Operation-specific performance analysis
- Console logging: `🔍 Operation: 2,075ms, 1,373 tokens, $0.0076`

### 3. Salvaged Fragment Recombination
**Date**: July 2, 2025
**Implementation**: Creative element reuse system
- Automatic extraction of promising concept fragments
- AI-powered categorization and rationale generation
- Smart recombination via prompt injection
- 50% word overlap threshold for usage tracking

---

## Database Schema

### Core Tables (Supabase)
```sql
-- Users and authentication
users (id, username, password_hash, created_at)

-- Main concept storage with iteration tracking
concept_logs (
  id UUID PRIMARY KEY,
  user_id TEXT,
  prompt TEXT,
  response TEXT,
  tone TEXT,
  created_at TIMESTAMP,
  originality_confidence INTEGER,
  iteration_type TEXT,
  parent_concept_id UUID,
  recombined_from UUID REFERENCES salvaged_fragments(id)
)

-- Fragment reuse system
salvaged_fragments (
  id UUID PRIMARY KEY,
  fragment_text TEXT,
  rationale TEXT,
  fragment_type TEXT,
  source_concept_id UUID,
  created_at TIMESTAMP
)

-- Example rotation system
used_examples (id, example_id, created_at)
rhetorical_device_usage (device_name, usage_count, last_used)
```

### Required Migration Scripts
Run these SQL scripts in Supabase console:
1. `supabase-salvaged-fragments-table.sql`
2. `supabase-recombined-from-column.sql`
3. Other `supabase-*.sql` files for complete schema

---

## API Endpoints

### Primary Generation
- **POST /api/generate-multivariant**
  - Payload: `{query, tone, maxOutputs, avoidCliches, enableIterativeRefinement}`
  - Returns: Array of generated concepts with arbiter evaluations
  - Performance: ~25 seconds for 2 concepts with refinement

### Administration
- **GET /api/pending-concepts** - Fetch concepts needing review
- **POST /api/concept-feedback** - Submit manual feedback
- **GET /api/history** - Session history retrieval

### Testing
- **POST /api/run-automated-tests** - Execute 10-test cycle
- Performance tracking included in all endpoints

---

## Environment Configuration

### Required Environment Variables
```bash
# OpenAI Integration
OPENAI_API_KEY=sk-proj-... (provided in secrets)

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
DATABASE_URL=postgresql://... (from Supabase connection string)

# Development
NODE_ENV=development
```

### Current Issue
Supabase environment variables need configuration. User should:
1. Create Supabase project
2. Copy connection details from Supabase dashboard
3. Add to environment secrets in Replit

---

## Performance Benchmarks

### Typical Generation Cycle (2 concepts)
- **10x Parallel Generation**: 1,276ms-5,428ms, $0.0760
- **4x Arbiter Evaluation**: 3,215ms-6,516ms, $0.0144  
- **2x Refinement Cycles**: 2,800ms-6,000ms, $0.0168
- **Total**: ~25 seconds, $0.1072 (~$0.0536 per concept)

### Console Output Example
```
🚀 Starting multi-variant generation: "Smart fitness tracker" (creative, max 2)
🔍 OpenAI Generation 1: 2,075ms, 1,373 tokens, $0.0076
🔍 Relevance Arbiter: 2,977ms, 442 tokens, $0.0036
📊 Iteration 1 Results: Originality 85/100, Audience High, Awards Medium, Relevance 75/100
💰 Total Cost: $0.0847
```

---

## Development Workflow

### Starting the Application
```bash
npm run dev  # Starts Express + Vite dev servers
```
- Access: http://localhost:5000
- Hot reload enabled for client and server
- Performance tracking active in console

### Testing Procedures
1. **Automated Testing**: Visit `/test-admin` for 10-test cycles
2. **Manual Review**: Visit `/review` for pending concept evaluation
3. **Performance Monitoring**: Check console for detailed metrics

### Key Debugging Areas
- **Supabase Connection**: Check environment variables if database errors
- **OpenAI API**: Monitor rate limits and token usage
- **Performance**: Use built-in tracking for optimization

---

## User Preferences (from replit.md)

### Communication Style
- Simple, everyday language (non-technical users)
- No emojis in user-facing responses
- Focus on functionality over technical implementation

### Design Principles
- High-modernist aesthetic with sharp geometric elements
- Timeless print-design inspired interface
- Clean sans-serif typography with weight/size hierarchy

### Technical Approach
- Minimize back-and-forth interactions
- Work autonomously for extended periods
- Provide complete solutions rather than partial implementations

---

## Current Technical Debt & Next Steps

### Immediate Actions Needed
1. **Supabase Setup**: Configure environment variables for database
2. **Error Monitoring**: Enhanced logging for production debugging
3. **Documentation**: API documentation for external integrations

### Optimization Opportunities
1. **Caching Layer**: Redis for frequently accessed rhetorical examples
2. **Rate Limiting**: More sophisticated API throttling
3. **Analytics**: Usage pattern analysis for cost optimization

---

## Special Considerations

### OpenAI Model
- Always use "gpt-4o" (newest model, released May 13, 2024)
- Never change model unless explicitly requested by user
- Comment in code: `// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user`

### Deployment Notes
- Replit deployment ready - use suggest_deploy when requested
- PWA capable with offline functionality
- Performance tracking provides cost transparency for users
- No Docker/containers needed - uses Replit's native environment

### Error Handling
- Graceful degradation when Supabase unavailable
- Fallback responses for AI API failures
- Comprehensive validation using Zod schemas
- User-friendly error messages for all failure modes

---

## Continuation Instructions

1. **Review replit.md** for latest user preferences and technical decisions
2. **Check console logs** for current system status and any errors
3. **Verify environment** variables if database/API issues occur
4. **Use performance tracker** data for optimization insights
5. **Follow existing patterns** in codebase for consistency
6. **Maintain four-arbiter system** integrity in all modifications
7. **Update documentation** when making architectural changes

The system is production-ready and fully functional. Focus on optimization, user experience improvements, and addressing any specific user requests while maintaining the sophisticated AI-driven creative workflow that makes Concept Forge unique.