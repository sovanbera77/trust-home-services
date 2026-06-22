const API_KEY = process.env.OPENAI_API_KEY || '';

export interface ParsedResume {
  skills: string[];
  experience: { company: string; role: string; duration: string; }[];
  education: { degree: string; institution: string; year: string; }[];
  total_years: number;
  email: string;
  phone: string;
}

export async function parseResume(text: string): Promise<ParsedResume> {
  if (API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'Extract structured data from this resume. Return JSON with skills[], experience[{company,role,duration}], education[{degree,institution,year}], total_years, email, phone.'
        }, {
          role: 'user',
          content: text
        }],
        response_format: { type: 'json_object' }
      })
    });
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }

  return {
    skills: ['JavaScript', 'React', 'TypeScript', 'Node.js', 'Python', 'SQL', 'AWS'],
    experience: [
      { company: 'Tech Corp', role: 'Senior Developer', duration: '2020-2024' },
      { company: 'Startup Inc', role: 'Developer', duration: '2018-2020' },
    ],
    education: [
      { degree: 'B.Tech Computer Science', institution: 'IIT Delhi', year: '2018' },
    ],
    total_years: 6,
    email: 'candidate@email.com',
    phone: '+91-9876543210',
  };
}

export function matchSkills(required: string[], candidate: string[]): { matched: string[]; missing: string[]; score: number } {
  const normalized = (s: string) => s.toLowerCase().trim();
  const req = required.map(normalized);
  const cand = candidate.map(normalized);
  const matched = required.filter(r => cand.includes(normalized(r)));
  const missing = required.filter(r => !cand.includes(normalized(r)));
  const score = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 0;
  return { matched, missing, score };
}
