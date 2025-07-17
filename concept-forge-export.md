# Concept Forge - Complete Codebase Export

**Generated:** $(date)
**Project:** AI-powered marketing concept generation tool with multivariant capabilities

## Project Overview

Concept Forge is a sophisticated AI-powered creative ideation platform that generates marketing concepts using OpenAI's GPT-4o API. It features advanced semantic similarity detection, four-arbiter evaluation systems, and comprehensive database integration with Supabase.

### Key Features
- **Multi-variant concept generation** (1, 5, 10, or 20 concepts)
- **Advanced semantic similarity detection** using OpenAI embeddings
- **Four-arbiter evaluation system** (originality, audience empathy, award potential, relevance)
- **Supabase database integration** with 118+ historical entries
- **Real-time performance monitoring** and cost tracking
- **PWA capabilities** for offline functionality
- **Comprehensive export system** for sharing codebase

### Current Status
- **Database:** 118 historical concept entries
- **API Integration:** OpenAI GPT-4o with embedding-based similarity
- **Performance:** Processing 10 parallel AI calls with 85% similarity threshold
- **Cost Tracking:** $0.26 average per multivariant generation

## Core Architecture Files

### Backend Configuration
**server/index.ts** - Main Express server setup
**server/db.ts** - Database configuration and connection
**server/supabaseClient.ts** - Supabase client and utilities
**server/routes.ts** - API route definitions

### AI Generation System
**server/routes/generateMultivariant.ts** - Multi-variant concept generation
**server/services/openai.ts** - OpenAI API integration
**server/utils/embeddingSimilarity.ts** - Semantic similarity detection
**server/utils/performanceTracker.ts** - API call monitoring

### Frontend Application
**client/src/App.tsx** - Main React application
**client/src/pages/home.tsx** - Homepage with concept generation
**client/src/pages/multivariant.tsx** - Multi-variant generation interface
**client/src/pages/code-share.tsx** - Code sharing portal
**client/src/components/MultivariantGenerator.tsx** - Multi-variant UI component

### Database Schema
**shared/schema.ts** - Type definitions and database schema
**drizzle.config.ts** - Database configuration

### Configuration Files
**package.json** - Dependencies and scripts
**vite.config.ts** - Frontend build configuration
**tsconfig.json** - TypeScript configuration
**.replit** - Replit deployment configuration

## Technical Specifications

### Technology Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL with Supabase + Drizzle ORM
- **AI:** OpenAI GPT-4o API with text-embedding-3-large
- **UI:** shadcn/ui components + Tailwind CSS
- **State Management:** TanStack React Query

### API Endpoints
- `POST /api/generate` - Single concept generation
- `POST /api/generate-multivariant` - Multi-variant generation
- `GET /api/history` - Historical concept retrieval
- `GET /api/export-codebase` - Complete codebase export
- `POST /api/feedback` - User feedback collection

### Performance Metrics
- **Generation Time:** 30-60 seconds for 10 concepts
- **Token Usage:** 1,394 tokens average per API call
- **Cost:** $0.0090 average per API call
- **Similarity Threshold:** 85% for concept diversity
- **Database Entries:** 118 historical concepts

## Recent Issues & Solutions

### Multi-variant Mode Issues
The system is generating concepts successfully but some parsing issues exist in the display layer. The core generation pipeline (10 parallel AI calls, 4-arbiter evaluations, semantic similarity checking) works correctly.

### Database Integration
Successfully connected to Supabase with proper error handling for missing environment variables. All concept generations are being saved with proper IDs and timestamps.

### Code Sharing Portal
The portal exists at `/code-share` and successfully scans 2,396 files (332MB) but requires user interaction to generate exports. The system is working but needs time to process all files.

## Access Information

**Remote URL:** https://2be05202-6b54-4f81-9a0c-6e7cdc5d9b33-00-ucysu2niqdn2.riker.replit.dev/
**Code Share Portal:** https://2be05202-6b54-4f81-9a0c-6e7cdc5d9b33-00-ucysu2niqdn2.riker.replit.dev/code-share
**Local Development:** http://localhost:5000/

## Next Steps for Development

1. **Fix multivariant display parsing** - Address concept formatting issues
2. **Optimize code export** - Reduce file scanning time
3. **Enhance feedback system** - Fix missing rating validation
4. **Deploy to production** - Use Replit's deployment features

This export provides a comprehensive overview of the Concept Forge system architecture and current state for external review and development.