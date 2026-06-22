export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) return `${fieldName} is required`;
  return null;
}

export function validateMobile(value: string): string | null {
  if (!value) return null;
  if (!/^[6-9]\d{9}$/.test(value.replace(/\D/g, ''))) return 'Invalid mobile number (10 digits starting with 6-9)';
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
  return null;
}

export function validatePincode(value: string): string | null {
  if (!value) return null;
  if (!/^\d{6}$/.test(value)) return 'Pincode must be 6 digits';
  return null;
}

export function validateNumber(value: string | number, fieldName: string, min = 0): string | null {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num) || num < min) return `${fieldName} must be at least ${min}`;
  return null;
}

export function validateForm(values: Record<string, string>, rules: Record<string, (v: string) => string | null>): ValidationResult {
  const errors: Record<string, string> = {};
  for (const [field, rule] of Object.entries(rules)) {
    const err = rule(values[field] || '');
    if (err) errors[field] = err;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function sanitizeInput(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}
