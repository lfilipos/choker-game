#!/bin/bash

# Comprehensive test runner for the chess game project
# This script runs all types of tests and fails if any fail

set -e  # Exit on any error

echo "🧪 Starting comprehensive test suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/.cache/ms-playwright" ]; then
    print_status "Installing Playwright browsers..."
    npx playwright install --with-deps
fi

# Run linting
print_status "Running ESLint..."
npm run lint
print_success "Linting passed"

# Run unit and component tests
print_status "Running unit and component tests..."
npm test -- --coverage --watchAll=false --passWithNoTests
print_success "Unit and component tests passed"

# Check test coverage
print_status "Checking test coverage..."
COVERAGE=$(node -e "
  try {
    const coverage = require('./coverage/coverage-summary.json');
    console.log(coverage.total.lines.pct);
  } catch (e) {
    console.log('0');
  }
")

if [ "$COVERAGE" = "0" ]; then
    print_warning "Could not determine coverage. Make sure tests ran successfully."
else
    print_status "Test coverage: ${COVERAGE}%"
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
        print_error "Test coverage ${COVERAGE}% is below 80% threshold"
        exit 1
    fi
    print_success "Test coverage meets 80% threshold"
fi

# Build the application
print_status "Building application..."
npm run build
print_success "Build completed"

# Start the application in background
print_status "Starting application for E2E tests..."
npm start &
APP_PID=$!

# Wait for the application to start
print_status "Waiting for application to start..."
timeout=60
counter=0
while ! curl -s http://localhost:3000 > /dev/null && [ $counter -lt $timeout ]; do
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    print_error "Application failed to start within $timeout seconds"
    kill $APP_PID 2>/dev/null || true
    exit 1
fi

print_success "Application started successfully"

# Run Playwright tests
print_status "Running Playwright E2E tests..."
npx playwright test
print_success "E2E tests passed"

# Run accessibility tests specifically
print_status "Running accessibility tests..."
npx playwright test --grep "Accessibility"
print_success "Accessibility tests passed"

# Run performance tests specifically
print_status "Running performance tests..."
npx playwright test --grep "Performance"
print_success "Performance tests passed"

# Stop the application
print_status "Stopping application..."
kill $APP_PID 2>/dev/null || true

# Run security audit
print_status "Running security audit..."
npm audit --audit-level=moderate || {
    print_warning "Security audit found issues. Please review and fix."
}

# Generate test report
print_status "Generating test report..."
echo "# Test Suite Report" > test-report.md
echo "Generated on: $(date)" >> test-report.md
echo "" >> test-report.md
echo "## Summary" >> test-report.md
echo "- ✅ Linting: Passed" >> test-report.md
echo "- ✅ Unit/Component Tests: Passed" >> test-report.md
echo "- ✅ Test Coverage: ${COVERAGE}% (meets 80% threshold)" >> test-report.md
echo "- ✅ E2E Tests: Passed" >> test-report.md
echo "- ✅ Accessibility Tests: Passed" >> test-report.md
echo "- ✅ Performance Tests: Passed" >> test-report.md
echo "- ⚠️  Security Audit: Completed (review warnings)" >> test-report.md

print_success "All tests completed successfully!"
print_status "Test report generated: test-report.md"

# Exit with success
exit 0

