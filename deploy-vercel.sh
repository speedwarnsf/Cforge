#!/bin/bash

# The C Forge - Vercel Deployment Script
# This script prepares and deploys to Vercel

echo "🚀 The C Forge - Vercel Deployment"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Please create .env from .env.example and add your credentials:"
    echo "  - OPENAI_API_KEY"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_ANON_KEY"
    echo "  - DATABASE_URL"
    echo ""
    echo "Run: cp .env.example .env"
    echo "Then edit .env with your actual values"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Build the application
echo "🔨 Building production application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Ready for Vercel deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Install Vercel CLI: npm i -g vercel"
    echo "2. Login to Vercel: vercel login"
    echo "3. Deploy: vercel --prod"
    echo ""
    echo "Or use the Vercel dashboard to deploy from GitHub"
else
    echo "❌ Build failed! Check errors above"
    exit 1
fi
