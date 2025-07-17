# Concept Forge - AI-Powered Creative Ideation Platform

An advanced AI-powered marketing concept generation tool that creates multivariant advertising concepts using OpenAI's GPT-4o API, with sophisticated semantic similarity detection, four-arbiter evaluation system, and comprehensive campaign intelligence.

## 🚀 Key Features

- **Single & Multi-Variant Concept Generation**: Generate individual concepts or batch create up to 20 variants
- **Four-Arbiter Evaluation System**: Originality, Relevance, Audience Resonance, and Award Potential scoring
- **Semantic Similarity Detection**: Advanced embedding-based duplicate detection and diversity enforcement
- **245+ Campaign Corpus**: Intelligent retrieval system with major brand examples and theoretical frameworks
- **Progressive Web App**: Full mobile optimization with offline capabilities
- **Session History & Analytics**: Comprehensive tracking with export functionality

## 🏗️ Architecture

### Backend
- **Express.js + TypeScript** server with RESTful API design
- **PostgreSQL + Supabase** for data persistence with RLS security
- **OpenAI GPT-4o** integration with sophisticated prompt engineering
- **Drizzle ORM** for type-safe database operations

### Frontend
- **React + TypeScript** with Vite bundler
- **shadcn/ui + Tailwind CSS** for modern component design
- **TanStack React Query** for optimized server state management
- **Wouter** for lightweight client-side routing

### AI Intelligence
- **Rhetorical Device Mapping**: 50+ devices organized by creative lens
- **Embedding-Based Similarity**: OpenAI text-embedding-3-large for semantic analysis
- **Round-Robin Retrieval**: Sophisticated campaign example selection
- **Cultural Sensitivity**: Automated appropriation detection and filtering

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DustinY15/Cforge.git
   cd Cforge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Add your OpenAI API key and Supabase credentials
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npm run db:generate
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📊 API Endpoints

- `POST /api/generate` - Single concept generation
- `POST /api/generate-multivariant` - Batch concept generation
- `GET /api/history` - Session history retrieval
- `POST /api/rate-concept` - User feedback submission

## 🎯 Usage

1. **Select Concept Lens**: Choose from Bold Concepting, Strategic Persuasion, Conversational Hook, Simplified Systems, or Core Idea Finder
2. **Input Creative Brief**: Describe your campaign challenge or product
3. **Generate Concepts**: Create single concepts or multi-variant batches
4. **Review & Rate**: Provide feedback to improve future generations
5. **Export Results**: Download formatted concepts for presentation

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API access
- `DATABASE_URL` - Supabase connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate database migrations

## 📈 Performance

- **Response Time**: < 30 seconds for multi-variant generation
- **Accuracy**: 85% originality threshold enforcement
- **Scalability**: Handles 10 parallel AI completions
- **Uptime**: 99.9% availability with Supabase backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4o API
- Supabase for backend infrastructure
- Replit for development environment
- shadcn/ui for component library