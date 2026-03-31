import { classifyIntent, routeIntent, handleGeneral } from './chat-agents/orchestrator.mjs';
import { handleKnowledge } from './chat-agents/knowledge.mjs';
import { handleTransaction } from './chat-agents/transaction.mjs';

/**
 * Create a new conversation.
 */
export function createConversation(db, userId) {
  const stmt = db.prepare(`
    INSERT INTO chat_conversations (user_id) VALUES (?)
  `);
  const result = stmt.run(userId);
  const conversation = db.prepare('SELECT * FROM chat_conversations WHERE rowid = ?').get(result.lastInsertRowid);

  return {
    success: true,
    data: conversation,
  };
}

/**
 * List active conversations for a user.
 */
export function listConversations(db, userId, limit = 10) {
  const conversations = db.prepare(`
    SELECT * FROM chat_conversations
    WHERE user_id = ? AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(userId, limit);

  return {
    success: true,
    data: conversations,
  };
}

/**
 * Get message history for a conversation.
 */
export function getHistory(db, userId, conversationId, limit = 20) {
  // Verify conversation belongs to user
  const conversation = db.prepare(
    'SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?'
  ).get(conversationId, userId);

  if (!conversation) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } };
  }

  const messages = db.prepare(`
    SELECT id, role, content, agent, intent, tool_calls, created_at
    FROM chat_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT ?
  `).all(conversationId, limit);

  return {
    success: true,
    data: {
      conversation,
      messages: messages.map(m => ({
        ...m,
        toolCalls: m.tool_calls ? JSON.parse(m.tool_calls) : null,
      })),
    },
  };
}

/**
 * Archive a conversation.
 */
export function archiveConversation(db, userId, conversationId) {
  const conversation = db.prepare(
    'SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?'
  ).get(conversationId, userId);

  if (!conversation) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } };
  }

  db.prepare(`
    UPDATE chat_conversations SET status = 'archived', updated_at = datetime('now')
    WHERE id = ?
  `).run(conversationId);

  return { success: true, data: { id: conversationId, status: 'archived' } };
}

/**
 * Send a message and get AI response.
 * Core function: classify intent -> route to agent -> save -> return.
 */
export async function sendMessage(db, userId, { message, conversationId }) {
  // 1. Create or verify conversation
  let convId = conversationId;
  if (!convId) {
    const result = createConversation(db, userId);
    convId = result.data.id;
  } else {
    const existing = db.prepare(
      'SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?'
    ).get(convId, userId);
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } };
    }
  }

  // 2. Save user message
  db.prepare(`
    INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, 'user', ?)
  `).run(convId, message);

  // 3. Get last 10 messages as history
  const history = db.prepare(`
    SELECT role, content FROM chat_messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC LIMIT 10
  `).all(convId).reverse();

  // 4. Classify intent
  let intent;
  try {
    intent = await classifyIntent(message, history);
  } catch (err) {
    console.error('[chat] Intent classification error:', err.message);
    intent = 'GENERAL:GREETING';
  }

  // 5. Route to agent
  const agentName = routeIntent(intent);

  let result;
  try {
    switch (agentName) {
      case 'knowledge':
        result = await handleKnowledge(message, intent, history);
        break;
      case 'transaction':
        result = await handleTransaction(db, userId, message, intent, history);
        break;
      case 'orchestrator':
      default:
        result = await handleGeneral(message, intent, history);
        break;
    }
  } catch (err) {
    // 6. Fallback on error
    console.error(`[chat] Agent "${agentName}" error:`, err.message);
    result = {
      content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?',
      agent: agentName,
      intent,
      toolCalls: null,
    };
  }

  // 7. Sanitize tool_calls JSON (remove control chars)
  let toolCallsJson = null;
  if (result.toolCalls) {
    try {
      toolCallsJson = JSON.stringify(result.toolCalls)
        .replace(/[\x00-\x1F\x7F]/g, '');
    } catch {
      toolCallsJson = null;
    }
  }

  // 8. Save assistant message
  const saveStmt = db.prepare(`
    INSERT INTO chat_messages (conversation_id, role, content, agent, intent, tool_calls)
    VALUES (?, 'assistant', ?, ?, ?, ?)
  `);
  const saveResult = saveStmt.run(convId, result.content, result.agent, intent, toolCallsJson);
  const savedMsg = db.prepare('SELECT * FROM chat_messages WHERE rowid = ?').get(saveResult.lastInsertRowid);

  // 9. Auto-title conversation on first message
  const msgCount = db.prepare('SELECT COUNT(*) as cnt FROM chat_messages WHERE conversation_id = ?').get(convId).cnt;
  if (msgCount <= 2) {
    // Use first user message as title (truncated)
    const title = message.length > 60 ? message.slice(0, 57) + '...' : message;
    db.prepare("UPDATE chat_conversations SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title, convId);
  } else {
    db.prepare("UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?").run(convId);
  }

  // 10. Return response
  return {
    success: true,
    data: {
      conversationId: convId,
      message: {
        id: savedMsg.id,
        role: savedMsg.role,
        content: savedMsg.content,
        agent: savedMsg.agent,
        intent: savedMsg.intent,
        toolCalls: toolCallsJson ? JSON.parse(toolCallsJson) : null,
        createdAt: savedMsg.created_at,
      },
    },
  };
}
