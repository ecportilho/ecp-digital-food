import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 2048;

const SYSTEM_PROMPT = `Você é o orquestrador de intenções do FoodFlow, um app de delivery de comida.

Analise a mensagem do usuário e classifique a intenção em EXATAMENTE uma das categorias abaixo.
Responda APENAS com o código da intenção, sem explicação.

Intenções disponíveis:
- BROWSE:RESTAURANTS — usuário quer ver restaurantes disponíveis
- BROWSE:MENU — usuário quer ver cardápio de um restaurante
- BROWSE:SEARCH — usuário busca comida ou culinária específica
- ORDER:CREATE — usuário quer fazer/finalizar um pedido
- ORDER:STATUS — usuário quer saber status de um pedido
- ORDER:HISTORY — usuário quer ver histórico de pedidos
- PAYMENT:PIX — usuário quer pagar com Pix
- PAYMENT:CARD — usuário quer pagar com cartão de crédito
- CART:VIEW — usuário quer ver o carrinho
- CART:ADD — usuário quer adicionar item ao carrinho
- CART:REMOVE — usuário quer remover item do carrinho
- FAQ:DELIVERY — dúvidas sobre entrega, tempo, taxa
- FAQ:GENERAL — dúvidas gerais sobre o app
- GENERAL:GREETING — saudação, oi, olá, bom dia
- GENERAL:OUT_OF_SCOPE — assunto não relacionado a comida/delivery

Exemplos:
"oi" → GENERAL:GREETING
"quero ver os restaurantes" → BROWSE:RESTAURANTS
"me mostra o cardápio do Sushi Place" → BROWSE:MENU
"quero uma pizza" → BROWSE:SEARCH
"adiciona 2 hambúrgueres" → CART:ADD
"ver meu carrinho" → CART:VIEW
"tira o sushi do carrinho" → CART:REMOVE
"quero fazer o pedido" → ORDER:CREATE
"cadê meu pedido?" → ORDER:STATUS
"meus pedidos anteriores" → ORDER:HISTORY
"pagar com pix" → PAYMENT:PIX
"pagar no cartão" → PAYMENT:CARD
"quanto tempo demora a entrega?" → FAQ:DELIVERY
"como funciona o app?" → FAQ:GENERAL
"qual a capital da França?" → GENERAL:OUT_OF_SCOPE`;

/**
 * Classify the user's intent using Claude.
 */
export async function classifyIntent(message, history = []) {
  const messages = [];

  // Add recent history for context
  for (const msg of history.slice(-4)) {
    messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
  }

  messages.push({ role: 'user', content: message });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 50,
    system: SYSTEM_PROMPT,
    messages,
  });

  const raw = response.content[0]?.text?.trim() || 'GENERAL:GREETING';

  // Validate intent
  const validIntents = [
    'BROWSE:RESTAURANTS', 'BROWSE:MENU', 'BROWSE:SEARCH',
    'ORDER:CREATE', 'ORDER:STATUS', 'ORDER:HISTORY',
    'PAYMENT:PIX', 'PAYMENT:CARD',
    'CART:VIEW', 'CART:ADD', 'CART:REMOVE',
    'FAQ:DELIVERY', 'FAQ:GENERAL',
    'GENERAL:GREETING', 'GENERAL:OUT_OF_SCOPE',
  ];

  const intent = validIntents.find(i => raw.includes(i)) || 'GENERAL:GREETING';
  return intent;
}

/**
 * Route intent to the appropriate agent.
 */
export function routeIntent(intent) {
  const [category] = intent.split(':');

  switch (category) {
    case 'FAQ':
      return 'knowledge';
    case 'BROWSE':
    case 'ORDER':
    case 'PAYMENT':
    case 'CART':
      return 'transaction';
    case 'GENERAL':
    default:
      return 'orchestrator';
  }
}

/**
 * Handle GENERAL intents directly (greeting, out of scope).
 */
export async function handleGeneral(message, intent, history = []) {
  const systemPrompt = `Você é o assistente virtual do FoodFlow, um app de delivery de comida.

Se o usuário cumprimentar, responda de forma simpática e ofereça ajuda para:
- Explorar restaurantes e cardápios
- Fazer pedidos
- Acompanhar entregas
- Tirar dúvidas

Se o assunto for fora do escopo (não relacionado a comida/delivery), responda educadamente que você só pode ajudar com assuntos do FoodFlow.

Seja breve, simpático e use emojis ocasionalmente.`;

  const messages = [];
  for (const msg of history.slice(-6)) {
    messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
  }
  messages.push({ role: 'user', content: message });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  return {
    content: response.content[0]?.text || 'Olá! Como posso ajudar?',
    agent: 'orchestrator',
    intent,
    toolCalls: null,
  };
}
