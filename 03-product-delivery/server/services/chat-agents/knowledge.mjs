import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 2048;

const SYSTEM_PROMPT = `Você é o assistente do FoodFlow, um app de delivery de comida. Ajude o usuário a descobrir restaurantes, pratos e responda dúvidas sobre entregas e funcionamento.

Informações gerais do FoodFlow:
- Entrega em média de 20 a 50 minutos, dependendo do restaurante e distância
- Taxa de entrega varia por restaurante (gratuita em pedidos acima de R$ 120)
- Aceitamos Pix e cartão de crédito
- Horário de funcionamento depende de cada restaurante
- Cupons de desconto podem ser aplicados no checkout
- Pedidos podem ser acompanhados em tempo real

Regras:
- Valores sempre em R$ (ex: R$ 49,90)
- Seja simpático e use emojis ocasionalmente
- Se o usuário perguntar algo que requer ação (fazer pedido, ver carrinho), sugira os comandos corretos
- Quando não souber algo específico, sugira que o usuário explore os restaurantes no app`;

/**
 * Knowledge agent — answers questions about restaurants, menus, and FAQ.
 */
export async function handleKnowledge(message, intent, history = []) {
  const messages = [];

  for (const msg of history.slice(-6)) {
    messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
  }

  messages.push({ role: 'user', content: message });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages,
  });

  return {
    content: response.content[0]?.text || 'Desculpe, não consegui processar sua pergunta. Pode reformular?',
    agent: 'knowledge',
    intent,
    toolCalls: null,
  };
}
