import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

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
  micBtn: (listening, disabled) => ({
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${listening ? 'var(--danger)' : 'var(--line)'}`,
    background: listening ? 'rgba(255, 107, 129, 0.15)' : 'var(--surface-strong)',
    color: listening ? 'var(--danger)' : 'var(--muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    flexShrink: 0,
    transition: 'all 0.2s',
    animation: listening ? 'micPulse 1.3s ease-in-out infinite' : 'none',
  }),
  errorMsg: {
    marginTop: '8px',
    fontSize: '0.72rem',
    color: 'var(--danger)',
  },
  listeningHint: {
    marginTop: '8px',
    fontSize: '0.72rem',
    color: 'var(--muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  listeningDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--danger)',
    animation: 'dotPulse 1s ease-in-out infinite',
  },
};

export function ChatInput({ onSend, isLoading, quickActions }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const voice = useSpeechRecognition('pt-BR');
  const baselineRef = useRef('');

  // Enquanto o mic esta ativo, concatena a transcricao ao que o usuario
  // ja tinha digitado (baseline). Parcial (interim) + final.
  useEffect(() => {
    if (!voice.listening) return;
    const spoken = [voice.transcript, voice.interimTranscript].filter(Boolean).join(' ').trim();
    const merged = baselineRef.current
      ? (spoken ? baselineRef.current + ' ' + spoken : baselineRef.current)
      : spoken;
    setValue(merged.slice(0, 1000));
    if (inputRef.current) {
      const el = inputRef.current;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 96) + 'px';
    }
  }, [voice.transcript, voice.interimTranscript, voice.listening]);

  // "Cambio" no final da fala (acento opcional) — envia automaticamente,
  // como walkie-talkie. Olha apenas transcript final, remove a palavra antes
  // de enviar e da reset no voice.
  useEffect(() => {
    if (!voice.listening || !voice.transcript) return;
    const normalized = voice.transcript.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!/\bcambio\b\s*[.!?]*\s*$/i.test(normalized)) return;

    const strippedTranscript = voice.transcript.replace(/\s*c[aã]mbio\b\s*[.!?]*\s*$/i, '').trim();
    const finalMsg = baselineRef.current
      ? (strippedTranscript ? baselineRef.current + ' ' + strippedTranscript : baselineRef.current)
      : strippedTranscript;
    const trimmed = finalMsg.trim();
    if (!trimmed || isLoading) return;

    voice.stop();
    voice.reset();
    baselineRef.current = '';
    onSend(trimmed);
    setValue('');
    if (inputRef.current) inputRef.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript, voice.listening]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    if (voice.listening) voice.stop();
    voice.reset();
    baselineRef.current = '';
    onSend(trimmed);
    setValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
  }, [value, isLoading, onSend, voice]);

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

  const handleMicToggle = () => {
    if (voice.listening) {
      voice.stop();
      return;
    }
    baselineRef.current = value.trim();
    voice.start();
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
          placeholder={voice.listening ? 'Ouvindo... fale seu pedido' : 'Digite ou clique no microfone'}
          rows={1}
          disabled={isLoading}
          style={{
            ...styles.textarea,
            borderColor: voice.listening ? 'var(--danger)' : 'var(--line)',
            opacity: isLoading ? 0.5 : 1,
          }}
          onFocus={(e) => {
            if (!voice.listening) e.currentTarget.style.borderColor = 'var(--brand)';
          }}
          onBlur={(e) => {
            if (!voice.listening) e.currentTarget.style.borderColor = 'var(--line)';
          }}
        />
        {voice.supported && (
          <button
            onClick={handleMicToggle}
            disabled={isLoading}
            aria-label={voice.listening ? 'Parar gravacao' : 'Falar em portugues'}
            title={voice.listening ? 'Clique para parar' : 'Clique para ditar em portugues'}
            style={styles.micBtn(voice.listening, isLoading)}
          >
            {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <button
          onClick={handleSend}
          disabled={isDisabled}
          style={styles.sendBtn(isDisabled)}
        >
          <Send size={16} />
        </button>
      </div>
      {voice.error && <div style={styles.errorMsg}>{voice.error}</div>}
      {voice.listening && !voice.error && (
        <div style={styles.listeningHint}>
          <span style={styles.listeningDot} />
          Ouvindo em pt-BR... diga <strong style={{ color: 'var(--text)' }}>"câmbio"</strong> para enviar.
        </div>
      )}
    </div>
  );
}

export default ChatInput;
