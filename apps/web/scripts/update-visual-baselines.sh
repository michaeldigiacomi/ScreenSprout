#!/bin/bash
#
# Visual Regression Baseline Update Script
#
# Usage:
#   ./scripts/update-visual-baselines.sh          - Update all baselines
#   ./scripts/update-visual-baselines.sh --dry-run - Show what would be updated
#   ./scripts/update-visual-baselines.sh --page=dashboard - Update specific page
#
# This script updates the baseline screenshots after intentional UI changes.
# Run this when you've made intentional visual changes and want to update
# the reference screenshots.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASELINE_DIR="tests/visual/baseline"
DRY_RUN=false
SPECIFIC_PAGE=""

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --page=*)
      SPECIFIC_PAGE="${arg#*=}"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run          Show what would be updated without making changes"
      echo "  --page=PAGE        Update only specific page (dashboard, profile, settings, login)"
      echo "  --help, -h         Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                           # Update all baselines"
      echo "  $0 --dry-run                 # Preview changes"
      echo "  $0 --page=dashboard          # Update only dashboard baseline"
      exit 0
      ;;
  esac
done

echo -e "${BLUE}Visual Regression Baseline Updater${NC}"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Are you in the project root?${NC}"
  exit 1
fi

# Check if Playwright is installed
if ! npm list @playwright/test &>/dev/null; then
  echo -e "${YELLOW}Playwright not found. Installing...${NC}"
  npm ci
  npx playwright install chromium
fi

# Show current baseline status
echo -e "${BLUE}Current baseline files:${NC}"
if [ -d "$BASELINE_DIR" ]; then
  find "$BASELINE_DIR" -name "*.png" -type f | while read -r file; do
    filename=$(basename "$file")
    size=$(du -h "$file" | cut -f1)
    echo "  - $filename ($size)"
  done
else
  echo "  (No baseline directory yet)"
fi
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}[DRY RUN] Would execute the following:${NC}"
  if [ -n "$SPECIFIC_PAGE" ]; then
    echo "  npm run test:visual -- --update-snapshots -g '$SPECIFIC_PAGE'"
  else
    echo "  npm run test:visual:update"
  fi
  exit 0
fi

# Confirm before updating
echo -e "${YELLOW}Warning: This will update baseline screenshots.${NC}"
echo -e "${YELLOW}Only do this after intentional UI changes have been reviewed.${NC}"
echo ""

if [ -n "$SPECIFIC_PAGE" ]; then
  echo "Target: $SPECIFIC_PAGE page only"
else
  echo "Target: All pages"
fi

echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Cancelled.${NC}"
  exit 0
fi

# Run the visual tests with update flag
echo ""
echo -e "${BLUE}Updating baselines...${NC}"

if [ -n "$SPECIFIC_PAGE" ]; then
  # Update specific page
  npx playwright test --config=playwright.visual.config.js --update-snapshots -g "$SPECIFIC_PAGE"
else
  # Update all baselines
  npm run test:visual:update
fi

# Show results
echo ""
echo -e "${GREEN}Baseline update complete!${NC}"
echo ""
echo -e "${BLUE}Updated baseline files:${NC}"
find "$BASELINE_DIR" -name "*.png" -type f | while read -r file; do
  filename=$(basename "$file")
  size=$(du -h "$file" | cut -f1)
  echo "  - $filename ($size)"
done

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Review the updated baselines in $BASELINE_DIR"
echo "  2. Commit the changes: git add $BASELINE_DIR"
echo "  3. Push to repository"
