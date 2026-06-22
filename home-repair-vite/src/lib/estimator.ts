import { SERVICE_CATALOG } from './services';

interface EstimateInput {
  type: string;
  title: string;
  desc: string;
}

interface EstimateResult {
  min: number;
  max: number;
  confidence: 'low' | 'medium' | 'high';
  matchCategory: string;
  explanation: string;
}

const KEYWORD_MAP: Record<string, { cat: string; premium: number }> = {
  // Plumbing
  tap: { cat: 'plumbing', premium: 0 },
  mixer: { cat: 'plumbing', premium: 0 },
  leak: { cat: 'plumbing', premium: 0 },
  pipe: { cat: 'plumbing', premium: 0 },
  drainage: { cat: 'plumbing', premium: 0 },
  geyser: { cat: 'plumbing', premium: 50 },
  water: { cat: 'plumbing', premium: 0 },
  toilet: { cat: 'plumbing', premium: 50 },
  clog: { cat: 'plumbing', premium: 50 },
  // Electrical
  switch: { cat: 'electrical', premium: 0 },
  socket: { cat: 'electrical', premium: 0 },
  fan: { cat: 'electrical', premium: 0 },
  light: { cat: 'electrical', premium: 0 },
  wiring: { cat: 'electrical', premium: 50 },
  fuse: { cat: 'electrical', premium: 0 },
  mcb: { cat: 'electrical', premium: 0 },
  inverter: { cat: 'electrical', premium: 100 },
  // AC
  ac: { cat: 'ac', premium: 0 },
  fridge: { cat: 'ac', premium: 0 },
  refrigerator: { cat: 'ac', premium: 0 },
  cooling: { cat: 'ac', premium: 0 },
  gas: { cat: 'ac', premium: 200 },
  // Appliance
  washing: { cat: 'appliance', premium: 0 },
  microwave: { cat: 'appliance', premium: 0 },
  chimney: { cat: 'appliance', premium: 50 },
  purifier: { cat: 'appliance', premium: 0 },
  // Carpentry
  door: { cat: 'carpentry', premium: 0 },
  lock: { cat: 'carpentry', premium: 0 },
  hinge: { cat: 'carpentry', premium: 0 },
  furniture: { cat: 'carpentry', premium: 50 },
  cabinet: { cat: 'carpentry', premium: 100 },
  // Pest
  pest: { cat: 'pest', premium: 0 },
  cockroach: { cat: 'pest', premium: 0 },
  termite: { cat: 'pest', premium: 200 },
  bedbug: { cat: 'pest', premium: 100 },
  rodent: { cat: 'pest', premium: 50 },
  // Painting
  paint: { cat: 'painting', premium: 0 },
  painting: { cat: 'painting', premium: 0 },
  waterproofing: { cat: 'painting', premium: 100 },
  putty: { cat: 'painting', premium: 0 },
  // Cleaning
  cleaning: { cat: 'cleaning', premium: 0 },
  deep: { cat: 'cleaning', premium: 100 },
  bathroom: { cat: 'cleaning', premium: 0 },
  kitchen: { cat: 'cleaning', premium: 50 },
  sofa: { cat: 'cleaning', premium: 0 },
  carpet: { cat: 'cleaning', premium: 0 },
};

export function estimateCost(input: EstimateInput): EstimateResult {
  const text = `${input.title} ${input.desc}`.toLowerCase();

  // Score each category by keyword matches
  const scores: Record<string, { count: number; premium: number }> = {};
  for (const [keyword, mapping] of Object.entries(KEYWORD_MAP)) {
    if (text.includes(keyword)) {
      if (!scores[mapping.cat]) scores[mapping.cat] = { count: 0, premium: 0 };
      scores[mapping.cat].count++;
      scores[mapping.cat].premium += mapping.premium;
    }
  }

  const bestCategory = Object.entries(scores).sort((a, b) => b[1].count - a[1].count)[0];
  const catId = bestCategory?.[0] || (input.type === 'installation' ? 'electrical' : 'plumbing');
  const cat = SERVICE_CATALOG.find(c => c.id === catId);

  if (!cat) {
    return { min: 199, max: 999, confidence: 'low', matchCategory: 'general', explanation: 'Based on typical service rates' };
  }

  const basePrices = cat.subs.map(s => s.price);
  const baseMin = Math.min(...basePrices);
  const baseMax = Math.max(...basePrices);
  const premium = bestCategory?.[1]?.premium || 0;

  const confidence = bestCategory && bestCategory[1].count >= 3 ? 'high' : bestCategory && bestCategory[1].count >= 1 ? 'medium' : 'low';

  const isLateHour = new Date().getHours() >= 20 || new Date().getHours() <= 6;
  const emergencyPremium = isLateHour ? 100 : 0;

  const min = baseMin + premium;
  const max = baseMax + premium + emergencyPremium;

  const parts: string[] = [`${cat.name} service rates`];
  if (premium > 0) parts.push(`₹${premium} for specialized work`);
  if (emergencyPremium > 0) parts.push('₹100 late-hour charge');

  return {
    min,
    max: Math.max(max, min + 50),
    confidence,
    matchCategory: cat.name,
    explanation: parts.join(', '),
  };
}
