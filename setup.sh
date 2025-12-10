#!/bin/bash

# Business Pro App - Quick Setup Script

echo "🚀 Business Pro - Premium Accounting App Setup"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the app, run:"
echo "  npm run dev"
echo ""
echo "The app will open at http://localhost:3000"
echo ""
echo "🎉 Enjoy your premium business app!"
