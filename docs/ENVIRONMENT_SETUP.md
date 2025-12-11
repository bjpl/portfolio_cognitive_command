# Environment Setup Guide

This guide explains how to configure your environment for Portfolio Cognitive Command.

## Quick Start

Run the automated setup script:

```bash
./scripts/setup-env.sh
```

This script will:
1. Create a `.env` file from the template
2. Prompt you for API keys
3. Configure optional settings
4. Create necessary directories
5. Validate your configuration

## Manual Setup

If you prefer to configure manually:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```bash
   nano .env  # or use your preferred editor
   ```

3. Create required directories:
   ```bash
   mkdir -p data output
   ```

## Environment Variables

### Claude API Configuration (Primary)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | - | Your Anthropic API key from https://console.anthropic.com/ |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | Claude model to use |
| `USE_CLAUDE_API` | No | `true` | Enable/disable Claude API |

*Required for AI-powered analysis. Falls back to keyword-based if not provided.

### OpenAI API Configuration (Fallback)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | - | Your OpenAI API key from https://platform.openai.com/ |
| `OPENAI_EMBEDDING_MODEL` | No | `text-embedding-3-small` | OpenAI embedding model |
| `EMBEDDING_DIMENSIONS` | No | `1536` | Embedding vector dimensions |
| `USE_OPENAI_API` | No | `false` | Enable/disable OpenAI API |

### Project Paths

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SCAN_DIR` | No | `./` | Directory to scan for code files |
| `AGENTDB_PATH` | No | `./data/agentdb.json` | Path to AgentDB database file |
| `OUTPUT_DIR` | No | `./output` | Directory for output files |

### Analysis Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DRIFT_THRESHOLD` | No | `0.7` | Semantic drift detection threshold (0.0-1.0) |
| `MIN_CLUSTER_SIZE` | No | `2` | Minimum items in a cluster |
| `MAX_CLUSTER_SIZE` | No | `10` | Maximum items in a cluster |

### System Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VERBOSE` | No | `false` | Enable verbose logging |
| `LOG_LEVEL` | No | `info` | Logging level: error, warn, info, debug |
| `FALLBACK_TO_KEYWORDS` | No | `true` | Fall back to keywords when API unavailable |

## API Keys

### Getting Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

### Getting Your OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

## Configuration Priority

The system uses APIs in the following priority:

1. **Claude API** (if `USE_CLAUDE_API=true` and key is set)
2. **OpenAI API** (if `USE_OPENAI_API=true` and key is set)
3. **Keyword Fallback** (if `FALLBACK_TO_KEYWORDS=true`)

## Validation

After configuration, the system will automatically validate your settings on startup:

```bash
npm start
```

Look for any warnings or errors in the output. Common issues:

- Missing API keys (warns, falls back to keywords)
- Invalid drift threshold (must be 0.0-1.0)
- Invalid cluster sizes (MIN must be < MAX)
- Invalid embedding dimensions

## Security

- **Never commit your `.env` file** - it's already in `.gitignore`
- **Keep API keys secret** - don't share them or commit them
- **Rotate keys regularly** - if you suspect a key is compromised
- **Use environment variables** in production environments

## Troubleshooting

### API Keys Not Working

1. Check that the key is correctly copied (no extra spaces)
2. Verify the key is valid in the API console
3. Check for usage limits or billing issues
4. Review the logs for specific error messages

### Configuration Not Loading

1. Ensure `.env` file is in the project root
2. Check file permissions (should be readable)
3. Verify environment variable names match exactly
4. Restart the application after changes

### Fallback Mode

If you see "Using keyword-based fallback", this means:
- No API keys are configured, OR
- API requests are failing, AND
- `FALLBACK_TO_KEYWORDS=true`

This provides basic functionality without API access.

## Next Steps

After configuration:

1. **Build the project**: `npm run build`
2. **Run tests**: `npm test`
3. **Start the application**: `npm start`
4. **Check the logs** for any configuration warnings

For more information, see:
- [Architecture Documentation](./architecture/)
- [API Documentation](./API_DOCUMENTATION.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
