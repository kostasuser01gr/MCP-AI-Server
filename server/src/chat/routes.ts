/* ── Chat Routes: SSE streaming + conversation API ── */

import { Router, type Request, type Response } from 'express';
import { aiRouter } from '../llm/router.js';
import {
  createConversation,
  getConversations,
  getConversation,
  updateConversation,
  deleteConversation,
  addMessage,
  getMessages,
  autoTitleConversation,
  logUsage,
} from './service.js';
import { logger } from '../logger.js';
import type { LLMMessage } from '../llm/types.js';

export const chatRouter = Router();

/* ── POST /chat/stream — SSE streaming chat ── */
chatRouter.post('/stream', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { conversationId, message, model } = req.body as {
    conversationId?: string;
    message: string;
    model?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    // Get or create conversation
    let convId = conversationId;
    let isNew = false;

    if (!convId) {
      const conv = createConversation(userId, undefined, model);
      convId = conv.id;
      isNew = true;
    } else {
      const conv = getConversation(convId, userId);
      if (!conv) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
    }

    // Save user message
    addMessage(convId, 'user', message);

    // Auto-title on first message
    if (isNew) {
      autoTitleConversation(convId, message);
    }

    // Build messages array from conversation history
    const history = getMessages(convId);
    const messages: LLMMessage[] = history.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send conversation info
    res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: convId, isNew })}\n\n`);

    let fullContent = '';
    let finalModel = '';
    let finalProvider = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let latencyMs = 0;

    // Stream from AI router
    for await (const chunk of aiRouter.chatStream({ messages, model })) {
      if (chunk.type === 'text') {
        fullContent += chunk.content;
        finalModel = chunk.model || finalModel;
        finalProvider = chunk.provider || finalProvider;
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`);
      } else if (chunk.type === 'done') {
        promptTokens = chunk.tokens?.prompt || 0;
        completionTokens = chunk.tokens?.completion || 0;
        latencyMs = chunk.latencyMs || 0;
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`);
      }
    }

    // Save assistant message
    if (fullContent) {
      addMessage(convId, 'assistant', fullContent, {
        model: finalModel,
        provider: finalProvider,
        promptTokens,
        completionTokens,
        latencyMs,
      });

      // Log usage
      logUsage(userId, finalModel, finalProvider, promptTokens, completionTokens, latencyMs);
    }

    // Send done event
    res.write(`data: ${JSON.stringify({
      type: 'done',
      model: finalModel,
      provider: finalProvider,
      tokens: { prompt: promptTokens, completion: completionTokens },
      latencyMs,
    })}\n\n`);

    res.end();
  } catch (err) {
    logger.error('Chat stream error', { error: (err as Error).message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat failed: ' + (err as Error).message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', content: (err as Error).message })}\n\n`);
      res.end();
    }
  }
});

/* ── GET /chat/conversations — list conversations ── */
chatRouter.get('/conversations', (req: Request, res: Response) => {
  const conversations = getConversations(req.user!.userId);
  res.json(conversations);
});

/* ── GET /chat/conversations/:id — get conversation with messages ── */
chatRouter.get('/conversations/:id', (req: Request, res: Response) => {
  const conv = getConversation(req.params['id']!, req.user!.userId);
  if (!conv) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const messages = getMessages(conv.id);
  res.json({ ...conv, messages });
});

/* ── PATCH /chat/conversations/:id — update conversation ── */
chatRouter.patch('/conversations/:id', (req: Request, res: Response) => {
  const { title, starred, model_id, system_prompt } = req.body;
  updateConversation(req.params['id']!, req.user!.userId, { title, starred, model_id, system_prompt });
  res.json({ ok: true });
});

/* ── DELETE /chat/conversations/:id ── */
chatRouter.delete('/conversations/:id', (req: Request, res: Response) => {
  deleteConversation(req.params['id']!, req.user!.userId);
  res.json({ ok: true });
});
