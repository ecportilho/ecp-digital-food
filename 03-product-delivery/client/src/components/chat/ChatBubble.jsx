import { Bot, User } from 'lucide-react';

const styles = {
  wrapper: (isUser) => ({
    display: 'flex',
    gap: '10px',
    flexDirection: isUser ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
  }),
  avatar: (isUser) => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: isUser ? 'rgba(123, 97, 255, 0.20)' : 'rgba(89, 216, 255, 0.20)',
    color: isUser ? 'var(--brand)' : 'var(--accent)',
  }),
  bubbleWrap: (isUser) => ({
    maxWidth: '80%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: isUser ? 'flex-end' : 'flex-start',
  }),
  bubble: (isUser) => ({
    padding: '10px 14px',
    borderRadius: '16px',
    fontSize: '0.875rem',
    lineHeight: '1.55',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    ...(isUser
      ? {
          background: 'var(--hero)',
          color: '#ffffff',
          borderTopRightRadius: '6px',
        }
      : {
          background: 'var(--surface-strong)',
          border: '1px solid var(--line)',
          color: 'var(--text)',
          borderTopLeftRadius: '6px',
        }),
  }),
  time: (isUser) => ({
    fontSize: '10px',
    color: 'var(--muted)',
    marginTop: '4px',
    textAlign: isUser ? 'right' : 'left',
  }),
};

export function ChatBubble({ role, content, createdAt }) {
  const isUser = role === 'user';

  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={styles.wrapper(isUser)}>
      <div style={styles.avatar(isUser)}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div style={styles.bubbleWrap(isUser)}>
        <div style={styles.bubble(isUser)}>{content}</div>
        {time && <p style={styles.time(isUser)}>{time}</p>}
      </div>
    </div>
  );
}

export default ChatBubble;
