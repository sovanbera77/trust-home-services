import type { Docket } from './types';
import { SERVICE_CATALOG } from './services';

interface ServiceSuggestion {
  categoryId: string;
  name: string;
  price: number;
  score: number;
  reason: string;
}

export function getRecommendations(
  dockets: Docket[],
  customerName?: string,
): ServiceSuggestion[] {
  const customerDockets = customerName
    ? dockets.filter((d) => d.customer === customerName)
    : dockets;

  const categoryCount: Record<string, number> = {};
  const categoryRatings: Record<string, number[]> = {};

  for (const docket of customerDockets) {
    const cat = SERVICE_CATALOG.find((c) =>
      c.subs.some((s) => s.name === docket.title),
    );
    if (!cat) continue;

    categoryCount[cat.id] = (categoryCount[cat.id] || 0) + 1;
    if (docket.rating && docket.rating > 0) {
      (categoryRatings[cat.id] ||= []).push(docket.rating);
    }
  }

  const topCategory = Object.entries(categoryCount).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];

  const suggestions: ServiceSuggestion[] = [];

  for (const cat of SERVICE_CATALOG) {
    const usageCount = categoryCount[cat.id] || 0;
    const ratings = categoryRatings[cat.id] || [];
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
        : 0;

    for (const sub of cat.subs) {
      if (customerDockets.some((d) => d.title === sub.name)) continue;

      let score = 0;
      const reasons: string[] = [];

      if (usageCount > 0) {
        score += usageCount * 15;
        reasons.push(`You've used ${cat.name} services ${usageCount} times`);
      }
      if (avgRating >= 4) {
        score += 20;
        reasons.push(`Rated ${cat.name} services highly (${avgRating.toFixed(1)}/5)`);
      }
      if (sub.price <= 500) {
        score += 10;
        reasons.push('Affordable service');
      }
      if (cat.id === topCategory) {
        score += 10;
      }

      if (score > 0) {
        suggestions.push({
          categoryId: cat.id,
          name: sub.name,
          price: sub.price,
          score,
          reason: reasons.join('. '),
        });
      }
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 5);
}

export function getSmartScheduling(
  dockets: Docket[],
): string[] {
  const completed = dockets.filter((d) => d.status === 'completed');
  const dayCount: Record<string, number> = {};

  for (const d of completed) {
    const day = new Date(d.completedDate || d.date).getDay();
    dayCount[day] = (dayCount[day] || 0) + 1;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
  const tips: string[] = [];

  if (bestDay) {
    tips.push(`Your team completes most jobs on ${dayNames[Number(bestDay[0])]} (${bestDay[1]} jobs)`);
  }

  const avgTime = completed.reduce((s, d, _, arr) => {
    if (!d.completedDate) return s;
    const days = (new Date(d.completedDate).getTime() - new Date(d.date).getTime()) / 86400000;
    return s + days / arr.length;
  }, 0);

  if (avgTime > 0) {
    tips.push(`Average job completion takes ${avgTime.toFixed(1)} days`);
  }

  return tips;
}
