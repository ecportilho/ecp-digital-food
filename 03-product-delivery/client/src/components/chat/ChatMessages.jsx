import { useEffect, useRef } from 'react';
import { ChatBubble } from './ChatBubble';
import { Bot } from 'lucide-react';

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    textAlign: 'center',
    color: 'var(--muted)',
  },
  emptyIcon: {
    marginBottom: '12px',
    color: 'rgba(89, 216, 255, 0.40)',
  },
  emptyTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '4px',
  },
  emptySubtitle: {
    fontSize: '0.75rem',
    lineHeight: '1.5',
  },
  typingRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  typingAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'rgba(89, 216, 255, 0.20)',
    color: 'var(--accent)',
  },
  typingBubble: {
    background: 'var(--surface-strong)',
    border: '1px solid var(--line)',
    borderRadius: '16px',
    borderTopLeftRadius: '6px',
    padding: '12px 16px',
    display: 'flex',
    gap: '4px',
  },
  dot: (delay) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--muted)',
    animation: 'chatBounce 1.2s ease-in-out infinite',
    animationDelay: `${delay}ms`,
  }),
};

function TypingIndicator() {
  return (
    <div style={styles.typingRow}>
      <div style={styles.typingAvatar}>
        <Bot size={14} />
      </div>
      <div style={styles.typingBubble}>
        <span style={styles.dot(0)} />
        <span style={styles.dot(150)} />
        <span style={styles.dot(300)} />
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div style={styles.emptyState}>
        <Bot size={40} style={styles.emptyIcon} />
        <p style={styles.emptyTitle}>Assistente FoodFlow</p>
        <p style={styles.emptySubtitle}>
          Ola! Sou o assistente do FoodFlow. Posso ajudar voce a encontrar restaurantes, montar seu pedido e acompanhar entregas.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          createdAt={msg.createdAt}
        />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

export default ChatMessages;
