#!/bin/bash
# Portfolio Cognitive Command - Environment Setup Script

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
ENV_EXAMPLE="$PROJECT_DIR/.env.example"

echo "========================================"
echo "Portfolio Cognitive Command Setup"
echo "========================================"
echo ""

# Check if .env.example exists
if [ ! -f "$ENV_EXAMPLE" ]; then
    echo "Error: .env.example not found at $ENV_EXAMPLE"
    exit 1
fi

# Backup existing .env if it exists
if [ -f "$ENV_FILE" ]; then
    echo "Backing up existing .env to .env.backup"
    cp "$ENV_FILE" "$ENV_FILE.backup"
fi

# Copy .env.example to .env
cp "$ENV_EXAMPLE" "$ENV_FILE"
echo "Created .env from .env.example"
echo ""

# Prompt for Anthropic API key
read -p "Enter your Anthropic API key (or press Enter to skip): " ANTHROPIC_KEY
if [ -n "$ANTHROPIC_KEY" ]; then
    sed -i "s/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$ANTHROPIC_KEY/" "$ENV_FILE"
    echo "Anthropic API key configured"
fi

# Prompt for OpenAI API key
read -p "Enter your OpenAI API key (optional, press Enter to skip): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
    sed -i "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_KEY/" "$ENV_FILE"
    sed -i "s/^USE_OPENAI_API=.*/USE_OPENAI_API=true/" "$ENV_FILE"
    echo "OpenAI API key configured"
fi

# Create directories
mkdir -p "$PROJECT_DIR/data" "$PROJECT_DIR/output"
echo ""
echo "Created directories: data/, output/"

echo ""
echo "========================================"
echo "Setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Review .env and adjust settings as needed"
echo "  2. Run 'npm install' to install dependencies"
echo "  3. Run 'npm test' to verify setup"
echo "  4. Run 'npm start' to begin analysis"
