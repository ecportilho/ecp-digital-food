import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';

const styles = {
  wrapper: {
    borderTop: '1px solid var(--line)',
    padding: '12px 16px',
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  quickBtn: {
    fontSize: '0.75rem',
    padding: '6px 12px',
    borderRadius: '999px',
    border: '1px solid var(--line)',
    background: 'transparent',
    color: 'var(--muted)',
    cursor: 'pointer',
    transition: 'border-color 0.2s, color 0.2s',
    whiteSpace: 'nowrap',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
  },
  textarea: {
    flex: 1,
    background: 'var(--surface-strong)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.875rem',
    color: 'var(--text)',
    outline: 'none',
    resize: 'none',
    minHeight: '40px',
    maxHeight: '96px',
    lineHeight: '1.5',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  sendBtn: (disabled) => ({
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: disabled ? 'rgba(123, 97, 255, 0.30)' : 'var(--brand)',
    color: '#ffffff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
  }),
};

export function ChatInput({ onSend, isLoading, quickActions }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    const text = e.target.value;
    if (text.length > 1000) return;
    setValue(text);

    // Auto resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  };

  const isDisabled = !value.trim() || isLoading;

  return (
    <div style={styles.wrapper}>
      {quickActions && quickActions.length > 0 && (
        <div style={styles.quickActions}>
          {quickActions.map((action) => (
            <button
              key={action.message}
              onClick={() => onSend(action.message)}
              disabled={isLoading}
              style={{
                ...styles.quickBtn,
                opacity: isLoading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.color = 'var(--brand)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div style={styles.inputRow}>
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          rows={1}
          disabled={isLoading}
          style={{
            ...styles.textarea,
            opacity: isLoading ? 0.5 : 1,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--brand)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--line)';
          }}
        />
        <button
          onClick={handleSend}
          disabled={isDisabled}
          style={styles.sendBtn(isDisabled)}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

export default ChatInput;
