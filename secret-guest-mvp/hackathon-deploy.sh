#!/bin/bash

# Secret Guest MVP - Hackathon Deployment Script
# This script prepares the project for quick deployment during hackathon

echo "🚀 Secret Guest MVP - Hackathon Deployment"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it with your API keys"
    echo "   Copy .env.example to .env and fill in your keys"
    exit 1
fi

echo "✅ Environment check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Build the project
echo "🔨 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

echo "✅ Build successful"

# Test the build locally
echo "🧪 Testing build locally..."
npm run preview &
PREVIEW_PID=$!
sleep 3

# Check if preview server is running
if ps -p $PREVIEW_PID > /dev/null; then
    echo "✅ Preview server running at http://localhost:4173"
    echo "   You can test your build before deploying"
    echo "   Press Ctrl+C to stop the preview server"
    wait $PREVIEW_PID
else
    echo "⚠️  Preview server failed to start, but build was successful"
fi

echo ""
echo "🎯 HACKATHON READY!"
echo "==================="
echo "Your project is ready for deployment. Next steps:"
echo ""
echo "1. 🌐 For Vercel deployment:"
echo "   - Go to https://vercel.com"
echo "   - Import your GitHub repository"
echo "   - Set root directory to: secret-guest-mvp"
echo "   - Add environment variables from your .env file"
echo ""
echo "2. 🚀 For quick local demo:"
echo "   - Run: npm run dev"
echo "   - Open: http://localhost:5173"
echo ""
echo "3. 📋 For hackathon judges:"
echo "   - Live demo URL: [Deploy to get URL]"
echo "   - GitHub repo: https://github.com/konova1ove/racing-app-1"
echo "   - Project folder: secret-guest-mvp"
echo ""

echo "Good luck with your hackathon! 🏆"