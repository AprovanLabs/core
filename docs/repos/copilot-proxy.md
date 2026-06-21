# copilot-proxy

GitHub Copilot OpenAI-compatible proxy.

## Language/Framework

TypeScript/Node.js

## Installation

```bash
cd repos/copilot-proxy
npm install
```

## CLI Usage

```bash
npx copilot-proxy connect
npx copilot-proxy serve
```

## Using with OpenAI SDK

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://127.0.0.1:6433/v1",
  apiKey: "not-needed",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
```

