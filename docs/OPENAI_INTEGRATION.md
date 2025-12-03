# OpenAI Embeddings Integration

## Overview

Portfolio Cognitive Command v8.0 now supports real OpenAI embeddings via the `text-embedding-3-small` model. The system intelligently falls back to keyword-based embeddings when the API is unavailable.

## Configuration

### Environment Variable

Set your OpenAI API key in the environment:

```bash
export OPENAI_API_KEY="sk-..."
```

Or create a `.env` file in the project root:

```
OPENAI_API_KEY=sk-...
```

### Without API Key

If `OPENAI_API_KEY` is not set, the system automatically uses the keyword-based fallback algorithm, which provides semantic clustering without external API calls.

## Architecture

### Embedding Pipeline (`src/pipeline/embedding-pipeline.ts`)

**Primary Method**: `generateEmbedding(text: string)`

1. **OpenAI API (Primary)**
   - Model: `text-embedding-3-small`
   - Dimensions: 1536
   - Max Input: 8000 characters
   - Generates true semantic embeddings

2. **Keyword-Based Fallback**
   - Dimensions: 1536 (matches OpenAI)
   - Uses word frequency distribution
   - Normalized vectors
   - Multi-dimensional hashing for better semantics

### Semantic Analyzer (`src/skills/semantic-analyzer.ts`)

**Primary Method**: `generateEmbedding(commitMessages, filePaths)`

- Combines commit messages and file paths
- Tries OpenAI API first
- Falls back to keyword-based clustering
- Returns cluster assignment (Experience, Core Systems, Infra)

## API Usage

### Direct Usage

```typescript
import { EmbeddingPipeline } from './pipeline/embedding-pipeline';

const pipeline = new EmbeddingPipeline('./config/ruvector.json');

const commit = {
  hash: 'abc123',
  message: 'Add new authentication system',
  timestamp: '2025-12-03T10:00:00Z',
  author: 'dev@example.com',
  filesChanged: ['src/auth/login.ts', 'src/auth/middleware.ts'],
  diffSummary: '+150 -20',
  additions: 150,
  deletions: 20
};

const result = await pipeline.processCommit(commit);
console.log(result.embedding); // 1536-dimensional vector
console.log(result.cluster);   // 'coreSystems'
console.log(result.clusterConfidence); // 0.85
```

### Semantic Analyzer

```typescript
import { generateEmbedding } from './skills/semantic-analyzer';

const embedding = await generateEmbedding(
  ['Fix authentication bug', 'Add JWT validation'],
  ['src/auth/jwt.ts', 'tests/auth.test.ts']
);

console.log(embedding.vector);     // 1536-dimensional vector
console.log(embedding.cluster);    // 'Core Systems'
console.log(embedding.confidence); // 0.92
```

## Performance

### OpenAI API
- **Speed**: ~200-500ms per request
- **Quality**: High semantic accuracy
- **Cost**: ~$0.00002 per 1K tokens
- **Limit**: 8000 characters input

### Keyword Fallback
- **Speed**: <10ms per request
- **Quality**: Good for file-based clustering
- **Cost**: Free
- **Limit**: None

## Error Handling

The system gracefully handles:
- Missing API key (uses fallback)
- API failures (logs warning, uses fallback)
- Rate limits (retries with exponential backoff)
- Network errors (uses fallback)

## Testing

### With API Key

```bash
export OPENAI_API_KEY="sk-..."
npm run dev
```

You should see:
```
[EmbeddingPipeline] OpenAI API initialized successfully
[EmbeddingPipeline] Successfully generated OpenAI embedding
```

### Without API Key

```bash
unset OPENAI_API_KEY
npm run dev
```

You should see:
```
[EmbeddingPipeline] OPENAI_API_KEY not found, using keyword-based fallback
[EmbeddingPipeline] Using keyword-based fallback embedding
```

## Best Practices

1. **Use OpenAI for Production**: Real embeddings provide better semantic understanding
2. **Use Fallback for Development**: Fast iteration without API costs
3. **Monitor Costs**: Track OpenAI usage if processing large repositories
4. **Cache Results**: Store embeddings to avoid re-computation
5. **Batch Processing**: Process commits in batches for efficiency

## Troubleshooting

### Build Errors

If you see TypeScript errors about `openai` module:

```bash
npm install
npm run build
```

### API Errors

Check that your API key is valid:

```bash
echo $OPENAI_API_KEY
```

Test with a simple curl:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Fallback Not Working

Ensure the embedding-pipeline.ts and semantic-analyzer.ts files have been properly updated with the OpenAI integration code.

## Future Enhancements

- [ ] Support for other embedding models (text-embedding-3-large, ada-002)
- [ ] Embedding caching layer
- [ ] Batch API requests for multiple commits
- [ ] Custom embedding dimensions
- [ ] Fine-tuned embeddings for code-specific semantics
