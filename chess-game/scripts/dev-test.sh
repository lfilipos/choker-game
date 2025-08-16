#!/bin/bash

# Development test runner - quick tests during development
# This script runs tests in watch mode for development

set -e

echo "🧪 Starting development test suite..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Run linting
print_status "Running ESLint..."
npm run lint
print_success "Linting passed"

# Run tests in watch mode
print_status "Starting tests in watch mode..."
print_status "Press 'q' to quit, 'a' to run all tests, 'f' to run failed tests"
npm test

print_success "Development test suite completed!"

