import { useState } from 'react';
import { MessageCircle, X, RotateCcw } from 'lucide-react';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useChat } from '../../hooks/useChat';

const QUICK_ACTIONS = [
  { label: 'Ver restaurantes', message: 'Quais restaurantes estao disponiveis?' },
  { label: 'Buscar comida', message: 'Quero buscar comida' },
  { label: 'Ver meu carrinho', message: 'Mostra meu carrinho' },
  { label: 'Meus pedidos', message: 'Quais sao meus pedidos?' },
];

const fabStyle = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  zIndex: 9999,
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  border: 'none',
  background: 'var(--hero)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: 'var(--shadow)',
  transition: 'transform 0.2s',
};

const panelBase = {
  position: 'fixed',
  zIndex: 9999,
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  boxShadow: 'var(--shadow)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const panelDesktop = {
  ...panelBase,
  bottom: '24px',
  right: '24px',
  width: '400px',
  height: '600px',
  borderRadius: 'var(--radius-xl)',
};

const panelMobile = {
  ...panelBase,
  bottom: 0,
  right: 0,
  width: '100%',
  height: '100%',
  borderRadius: 0,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid var(--line)',
  background: 'var(--surface-strong)',
};

const headerLeft = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const headerIcon = {
  width: '32px',
  height: '32px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--hero)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
};

const headerTitle = {
  fontSize: '0.875rem',
  fontWeight: 700,
  color: 'var(--text)',
};

const headerSubtitle = {
  fontSize: '10px',
  color: 'var(--muted)',
};

const headerRight = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const headerBtn = {
  padding: '8px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'transparent',
  color: 'var(--muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.2s, background 0.2s',
};

const errorBar = {
  padding: '8px 16px',
  background: 'rgba(255, 107, 129, 0.10)',
  borderTop: '1px solid rgba(255, 107, 129, 0.20)',
};

const errorText = {
  fontSize: '0.75rem',
  color: 'var(--danger)',
};

/* Keyframes injected once for typing animation */
const keyframesId = 'chat-bounce-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(keyframesId)) {
  const style = document.createElement('style');
  style.id = keyframesId;
  style.textContent = `
    @keyframes chatBounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
  `;
  document.head.appendChild(style);
}

function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 640;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, error, sendMessage, startNewConversation } = useChat();
  const isMobile = useIsMobile();

  const showQuickActions = messages.length === 0;

  return (
    <>
      {/* Floating action button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={fabStyle}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          aria-label="Abrir chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div style={isMobile ? panelMobile : panelDesktop}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={headerLeft}>
              <div style={headerIcon}>
                <span role="img" aria-label="food">AI</span>
              </div>
              <div>
                <p style={headerTitle}>Assistente FoodFlow</p>
                <p style={headerSubtitle}>Online</p>
              </div>
            </div>
            <div style={headerRight}>
              <button
                onClick={startNewConversation}
                style={headerBtn}
                title="Nova conversa"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'var(--surface)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={headerBtn}
                title="Fechar"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'var(--surface)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <ChatMessages messages={messages} isLoading={isLoading} />

          {/* Error */}
          {error && (
            <div style={errorBar}>
              <p style={errorText}>{error}</p>
            </div>
          )}

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            quickActions={showQuickActions ? QUICK_ACTIONS : undefined}
          />
        </div>
      )}
    </>
  );
}

export default ChatWidget;
