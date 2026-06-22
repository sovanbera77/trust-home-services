// Predefined service catalog used by the public site, customer dashboard
// catalog, and emergency booking. Prices are indicative (in INR).

export interface ServiceSub {
  name: string;
  price: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string; // emoji used as a lightweight icon (no extra deps)
  blurb: string;
  fromPrice: number;
  docketType: 'repair' | 'installation';
  subs: ServiceSub[];
}

export const SERVICE_CATALOG: ServiceCategory[] = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '🚿',
    blurb: 'Leaks, taps, fittings, drainage & water heater repairs.',
    fromPrice: 199,
    docketType: 'repair',
    subs: [
      { name: 'Tap / Mixer repair', price: 199 },
      { name: 'Leakage & pipe repair', price: 299 },
      { name: 'Water heater (geyser) service', price: 499 },
      { name: 'Drain / toilet unclogging', price: 349 },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: '💡',
    blurb: 'Switches, wiring, fans, sockets & fuse issues.',
    fromPrice: 199,
    docketType: 'repair',
    subs: [
      { name: 'Switch / socket repair', price: 199 },
      { name: 'Fan / light installation', price: 299 },
      { name: 'MCB / fuse fault', price: 349 },
      { name: 'Inverter / battery check', price: 499 },
    ],
  },
  {
    id: 'ac',
    name: 'AC & Refrigeration',
    icon: '❄️',
    blurb: 'AC service, gas refill, cooling & fridge repairs.',
    fromPrice: 499,
    docketType: 'repair',
    subs: [
      { name: 'Split AC service (per unit)', price: 499 },
      { name: 'AC gas refill', price: 1899 },
      { name: 'Refrigerator repair', price: 599 },
      { name: 'AC installation / uninstall', price: 699 },
    ],
  },
  {
    id: 'appliance',
    name: 'Appliance Repair',
    icon: '🧺',
    blurb: 'Washing machine, microwave, chimney & more.',
    fromPrice: 399,
    docketType: 'repair',
    subs: [
      { name: 'Washing machine repair', price: 399 },
      { name: 'Microwave repair', price: 399 },
      { name: 'Chimney service & repair', price: 499 },
      { name: 'Water purifier (RO) service', price: 399 },
    ],
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    icon: '🪚',
    blurb: 'Doors, locks, hinges, furniture & modular fixes.',
    fromPrice: 249,
    docketType: 'repair',
    subs: [
      { name: 'Door / window repair', price: 249 },
      { name: 'Lock & hinge fitting', price: 199 },
      { name: 'Furniture repair', price: 349 },
      { name: 'Cabinet / modular work', price: 499 },
    ],
  },
  {
    id: 'pest',
    name: 'Pest Control',
    icon: '🐜',
    blurb: 'Cockroaches, termites, bedbugs & rodents.',
    fromPrice: 799,
    docketType: 'repair',
    subs: [
      { name: 'General pest control (1BHK)', price: 799 },
      { name: 'Termite treatment', price: 1999 },
      { name: 'Bedbug treatment', price: 1499 },
      { name: 'Rodent control', price: 999 },
    ],
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: '🎨',
    blurb: 'Interior & exterior painting, waterproofing.',
    fromPrice: 12,
    docketType: 'repair',
    subs: [
      { name: 'Interior painting (per sq.ft)', price: 12 },
      { name: 'Exterior painting (per sq.ft)', price: 18 },
      { name: 'Putty & primer work', price: 8 },
      { name: 'Waterproofing', price: 25 },
    ],
  },
  {
    id: 'cleaning',
    name: 'Home Cleaning',
    icon: '🧹',
    blurb: 'Deep cleaning, bathroom, kitchen & sofa cleaning.',
    fromPrice: 999,
    docketType: 'repair',
    subs: [
      { name: 'Full home deep cleaning', price: 2499 },
      { name: 'Bathroom deep cleaning', price: 499 },
      { name: 'Kitchen deep cleaning', price: 999 },
      { name: 'Sofa / carpet cleaning', price: 599 },
    ],
  },
];

export function getServiceById(id: string): ServiceCategory | undefined {
  return SERVICE_CATALOG.find((s) => s.id === id);
}
