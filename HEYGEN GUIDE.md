# HeyGen × OpenAI — Speak‑Only (Secure Backend) using **Assistants API + Tools**

Production template: Node/Express backend with **OpenAI Assistants API** (server‑side, with **tools**) and HeyGen Streaming Avatar for **speak‑only** playback. No LiveKit. No browser‑exposed keys. Frontend stays very simple: type → server → avatar **speaks**.

---

## Overview

* **Backend (Express)**

  * `POST /api/openai/assistants/reply` → creates a **thread**, runs the **assistant with tools**, resolves required tool calls, and returns final **text**.
  * `POST /api/openai/files` → optional upload endpoint to attach PDFs/CSVs/etc. to your assistant’s vector store.
  * `GET /api/heygen/token` → mints short‑lived HeyGen Streaming token.
* **Frontend (Vite + TS)**

  * Start avatar → send user text → backend returns answer → `avatar.speak()`.

Why **Assistants API**? You want **tools** (function calling, code interpreter, file search/retrieval). This template wires a generic **function tool** dispatcher on your server and shows how to include built‑in tools.

---

## 0) Prerequisites

* Node 18+
* HeyGen account with **Streaming Avatar** enabled
* OpenAI API key

---

## 1) Install & Scaffold

```bash
npm create vite@latest heygen-openai-assistants -- --template vanilla-ts
cd heygen-openai-assistants

# Frontend
npm i @heygen/streaming-avatar

# Backend
npm i express cors openai dotenv zod
npm i -D ts-node-dev typescript @types/node npm-run-all
```

**Project structure**

```
heygen-openai-assistants/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ .env                         # server secrets (NEVER commit)
├─ server/
│  ├─ index.ts
│  └─ routes/
│     ├─ openai.ts              # Assistants + tools + file upload
│     └─ heygen.ts              # token mint
└─ src/
   ├─ avatar.ts
   ├─ main.ts
   └─ index.html
```

---

## 2) Configuration Files

### `package.json`

```json
{
  "name": "heygen-openai-assistants",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:server": "ts-node-dev --respawn --transpile-only server/index.ts",
    "dev:client": "vite",
    "dev": "run-p dev:server dev:client",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "npm-run-all": "^4.1.5",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "dependencies": {
    "@heygen/streaming-avatar": "^latest",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "openai": "^4.55.0",
    "zod": "^3.23.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["server", "src"]
}
```

### `vite.config.ts`

```ts
import { defineConfig } from 'vite';
export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:5174' } }
});
```

### `.env` (server)

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
ASSISTANT_ID=asst_...            # optional; if set, server reuses a pre-created assistant

# HeyGen
HEYGEN_API_KEY=hg-...
HEYGEN_AVATAR_NAME=Wayne_20240711

# Server
PORT=5174
ORIGIN=http://localhost:5173
```

> **Tip:** Pre‑create an assistant in the OpenAI dashboard or via API, enable tools there, and set `ASSISTANT_ID` to reuse it for all runs. This reduces latency and simplifies code.

---

## 3) Backend — Express API (Assistants + Tools)

### `server/index.ts`

```ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import openaiRouter from './routes/openai.js';
import heygenRouter from './routes/heygen.js';

const app = express();
app.use(cors({ origin: process.env.ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '20mb' }));

app.use('/api/openai', openaiRouter);
app.use('/api/heygen', heygenRouter);

const port = Number(process.env.PORT || 5174);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
```

### `server/routes/openai.ts`

This route shows three things:

1. **Assistant bootstrap** (create once or reuse via `ASSISTANT_ID`)
2. **Tool calls loop** for **function tools** (server executes and submits outputs)
3. Optional **file upload** to attach documents your assistant can use

```ts
import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';

const router = Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: create or reuse assistant with tools
async function getAssistantId(): Promise<string> {
  if (process.env.ASSISTANT_ID) return process.env.ASSISTANT_ID;
  const a = await client.beta.assistants.create({
    name: 'Voice Tutor',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    instructions: 'Be concise, friendly, and helpful. Use tools when needed.',
    tools: [
      { type: 'file_search' },
      { type: 'code_interpreter' },
      // Example function tool; you can add more below
      {
        type: 'function',
        function: {
          name: 'fetch_url',
          description: 'Fetches a URL and returns raw text content.',
          parameters: {
            type: 'object',
            properties: { url: { type: 'string' } },
            required: ['url']
          }
        }
      }
    ]
  });
  return a.id;
}

const MsgBody = z.object({
  message: z.string().min(1),
  // optional per-user context; you can plumb this into instructions
  user: z.string().optional()
});

// Main reply route: Assistants + tools
router.post('/assistants/reply', async (req, res) => {
  const parsed = MsgBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const { message } = parsed.data;

  try {
    const assistantId = await getAssistantId();
    const thread = await client.beta.threads.create();

    await client.beta.threads.messages.create(thread.id, { role: 'user', content: message });

    // Kick off the run
    let run = await client.beta.threads.runs.create(thread.id, { assistant_id: assistantId });

    // Tool resolution loop
    while (true) {
      run = await client.beta.threads.runs.retrieve(thread.id, run.id);

      if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls || [];

        // Map each tool call to an output
        const outputs = await Promise.all(toolCalls.map(async (tc: any) => {
          if (tc.type === 'function' && tc.function?.name === 'fetch_url') {
            try {
              const args = JSON.parse(tc.function.arguments || '{}');
              const resp = await fetch(args.url);
              const text = await resp.text();
              return { tool_call_id: tc.id, output: text.slice(0, 8000) }; // keep output reasonable
            } catch (e: any) {
              return { tool_call_id: tc.id, output: `ERROR: ${e?.message || 'fetch failed'}` };
            }
          }
          // Unknown tool → return empty string to avoid stalling
          return { tool_call_id: tc.id, output: '' };
        }));

        // Submit tool outputs back to OpenAI
        await client.beta.threads.runs.submitToolOutputs(thread.id, run.id, { tool_outputs: outputs });
        continue; // poll again
      }

      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        break;
      }

      // small backoff
      await new Promise(r => setTimeout(r, 500));
    }

    if (run.status !== 'completed') return res.status(500).json({ error: `Run ended with status ${run.status}` });

    // Collect assistant text
    const msgs = await client.beta.threads.messages.list(thread.id);
    const firstAssistant = msgs.data.find(m => m.role === 'assistant');
    const text = (firstAssistant?.content?.[0] as any)?.text?.value ?? '';

    return res.json({ text, threadId: thread.id, assistantId });
  } catch (e: any) {
    console.error('[Assistants] error:', e);
    return res.status(500).json({ error: e?.message || 'assistants error' });
  }
});

// Optional: file upload → attach to assistant’s retrieval store
const UploadBody = z.object({ name: z.string().min(1), content: z.string().min(1) });
router.post('/files', async (req, res) => {
  const parsed = UploadBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const { name, content } = parsed.data;

  try {
    const file = await client.files.create({
      file: new File([content], name, { type: 'text/plain' }),
      purpose: 'assistants'
    });

    // If you preconfigured your Assistant to use file_search, attach files to a vector store
    // or add them at thread time via a message with attachments.

    return res.json({ fileId: file.id });
  } catch (e: any) {
    console.error('[Files] upload error:', e);
    return res.status(500).json({ error: e?.message || 'upload error' });
  }
});

export default router;
```

### `server/routes/heygen.ts`

```ts
import { Router } from 'express';

const router = Router();

router.get('/token', async (_req, res) => {
  try {
    const r = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ttl: 60 * 15 })
    });

    if (!r.ok) {
      const body = await r.text();
      console.error('[HeyGen] token error:', r.status, body);
      return res.status(500).json({ error: 'Failed to mint HeyGen token' });
    }

    const data = await r.json();
    return res.json({ token: data?.data?.token ?? data?.token });
  } catch (e) {
    console.error('[HeyGen] token exception:', e);
    return res.status(500).json({ error: 'Token mint error' });
  }
});

export default router;
```

---

## 4) Frontend — HeyGen speak flow (unchanged)

### `src/avatar.ts`

```ts
import { StreamingAvatar, StreamingEvents, AvatarQuality, TaskType } from '@heygen/streaming-avatar';

export class HeyGenClient {
  private avatar?: StreamingAvatar;

  async init() {
    const r = await fetch('/api/heygen/token');
    if (!r.ok) throw new Error('Failed to fetch HeyGen token');
    const { token } = await r.json();

    this.avatar = new StreamingAvatar({ token });
    this.avatar.on(StreamingEvents.STREAM_READY, () => console.log('Avatar READY'));
    this.avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => console.log('Avatar DISCONNECTED'));

    await this.avatar.createStartAvatar({
      quality: AvatarQuality.Medium,
      avatarName: (import.meta as any).env?.VITE_HEYGEN_AVATAR_NAME || 'Wayne_20240711',
      language: 'English'
    });
  }

  async speak(text: string) {
    if (!this.avatar) throw new Error('Avatar not initialized');
    await this.avatar.speak({ text, taskType: TaskType.REPEAT });
  }

  stop() { try { this.avatar?.stopAvatar(); } catch {} }
}
```

### `src/main.ts`

```ts
import { HeyGenClient } from './avatar';

const startBtn = document.querySelector('#start') as HTMLButtonElement;
const stopBtn = document.querySelector('#stop') as HTMLButtonElement;
const sendBtn = document.querySelector('#send') as HTMLButtonElement;
const input = document.querySelector('#prompt') as HTMLInputElement;
const log = document.querySelector('#log') as HTMLPreElement;

const heygen = new HeyGenClient();

startBtn.onclick = async () => {
  startBtn.disabled = true; stopBtn.disabled = false;
  try { await heygen.init(); } catch (e) { console.error(e); startBtn.disabled = false; }
};

stopBtn.onclick = () => { heygen.stop(); startBtn.disabled = false; stopBtn.disabled = true; };

sendBtn.onclick = async () => {
  const message = input.value.trim();
  if (!message) return;
  log.textContent = `You: ${message}
`;

  try {
    const r = await fetch('/api/openai/assistants/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!r.ok) { log.textContent += `Error: ${r.status}`; return; }
    const { text } = await r.json();
    log.textContent += `Assistant: ${text}
`;
    await heygen.speak(text || 'I do not have an answer right now.');
  } catch (e) {
    console.error(e);
    log.textContent += 'Error calling API.';
  } finally {
    input.value = '';
  }
};
```

### `src/index.html`

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HeyGen × OpenAI — Assistants + Tools (Speak)</title>
  </head>
  <body>
    <button id="start">Start Avatar</button>
    <button id="stop" disabled>Stop Avatar</button>
    <div>
      <input id="prompt" placeholder="Type your question" />
      <button id="send">Ask</button>
    </div>
    <pre id="log"></pre>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

## 5) Run Locally

```bash
# Terminal 1 — API
npm run dev:server

# Terminal 2 — Frontend
npm run dev
# Open http://localhost:5173
```

---

## 6) Tooling Deep‑Dive

### Built‑in tools

* `file_search` — attach files (PDF, CSV, text) to your assistant’s retrieval store or the thread; the model will cite content.
* `code_interpreter` — lets the model run Python in a sandbox (data analysis, plotting). No server work needed—OpenAI executes it.

### Function tools (your API)

* Declare tool schema in the assistant (see `fetch_url`).
* When a run returns `requires_action → submit_tool_outputs`, your server executes the function and submits outputs using `runs.submitToolOutputs(...)`.
* Add more tools by expanding the `tools` array and `switch`ing on `tc.function.name`.

> Keep tool outputs reasonably sized (few KBs). For larger data, upload a file and return a short summary + file ID.

---

## 7) Feasibility & Error‑Proofing Checklist

* **Keys** never leave server; CORS origin set.
* **Assistant reuse**: set `ASSISTANT_ID` for faster cold starts; only threads are created per user prompt.
* **Tool loop**: robust to multiple tool calls; default empty outputs for unknown tools to avoid stalling.
* **HeyGen**: wait for `STREAM_READY` before `speak()`; ensure avatar slug/language.
* **Fallbacks**: if assistant returns empty text, speak a polite default.
* **Uploads**: Simple `/files` route included; attach to retrieval as needed.

---

## 8) Future Options

* Add **per-user threads** and persistence (DB) to maintain context across prompts.
* Add **rate limiting** & **audit logs** (token usage, latency, tool outcomes).
* Add **SSE streaming UI** if you want live text while the final answer is spoken once.

This guide is production‑ready for **Assistants API + tools** with a speak‑only HeyGen avatar frontend. Copy, configure, extend.
