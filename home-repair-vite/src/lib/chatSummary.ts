import type { ChatMessage } from './types';

interface ChatSummary {
  bullets: string[];
  keyTopics: string[];
  actionItems: string[];
}

const KEYWORD_TOPICS: Record<string, string> = {
  leak: 'Water leak',
  pipe: 'Pipe issue',
  tap: 'Tap / faucet',
  drainage: 'Drainage',
  toilet: 'Toilet',
  switch: 'Switch',
  socket: 'Socket',
  fan: 'Fan',
  light: 'Light / bulb',
  wiring: 'Wiring',
  inverter: 'Inverter',
  ac: 'AC',
  fridge: 'Refrigerator',
  gas: 'Gas refill',
  washing: 'Washing machine',
  microwave: 'Microwave',
  chimney: 'Chimney',
  door: 'Door',
  lock: 'Lock',
  furniture: 'Furniture',
  pest: 'Pest control',
  paint: 'Painting',
};

const ACTION_KEYWORDS = ['come', 'visit', 'fix', 'repair', 'install', 'replace', 'check', 'bring', 'order', 'need part', 'available after', 'available at', 'reach', 'arrive'];

export function summarizeChat(messages: ChatMessage[]): ChatSummary {
  if (messages.length === 0) return { bullets: [], keyTopics: [], actionItems: [] };

  const text = messages.map(m => m.text).join(' ').toLowerCase();
  const topics = new Set<string>();
  const actions: string[] = [];

  // Extract key topics from message content
  for (const [keyword, topic] of Object.entries(KEYWORD_TOPICS)) {
    if (text.includes(keyword)) topics.add(topic);
  }

  // Extract action items — sentences containing action keywords
  for (const msg of messages) {
    const lower = msg.text.toLowerCase();
    for (const keyword of ACTION_KEYWORDS) {
      if (lower.includes(keyword)) {
        actions.push(msg.text);
        break;
      }
    }
  }

  const bullets: string[] = [];
  if (topics.size > 0) {
    bullets.push(`Issue: ${Array.from(topics).slice(0, 3).join(', ')}`);
  }

  // Find customer and employee mentions
  const customerMsgs = messages.filter(m => m.sender !== 'admin' && m.sender !== 'employee' && m.sender !== 'emp');
  const empMsgs = messages.filter(m => m.sender === 'admin' || m.sender === 'employee' || m.sender === 'emp');

  if (customerMsgs.length > 0) {
    const lastCust = customerMsgs[customerMsgs.length - 1];
    bullets.push(`Customer (${lastCust.sender}): "${lastCust.text}"`);
  }

  if (empMsgs.length > 0) {
    const lastEmp = empMsgs[empMsgs.length - 1];
    bullets.push(`Technician: "${lastEmp.text}"`);
  }

  // Deduplicate action items
  const uniqueActions = Array.from(new Set(actions.map(a => a.trim()))).slice(0, 3);

  // Chat volume
  if (messages.length >= 20) bullets.push(`${messages.length} messages exchanged`);

  return { bullets, keyTopics: Array.from(topics), actionItems: uniqueActions };
}
