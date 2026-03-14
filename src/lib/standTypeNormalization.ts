// Allowed stand_type values per database CHECK constraint
export const ALLOWED_STAND_TYPES = ['Pipe and Drape', 'Shell', 'Space only'] as const;

export type StandType = typeof ALLOWED_STAND_TYPES[number];

/**
 * Normalizes stand_type values to match the database CHECK constraint.
 * Returns null for invalid values (null is allowed, invalid strings are not).
 */
export function normalizeStandType(value: string | null | undefined): StandType | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim().toLowerCase();
  
  // Return null for empty strings
  if (!trimmed) return null;
  
  // Map common variations to correct values
  const mapping: Record<string, StandType> = {
    'pipe and drape': 'Pipe and Drape',
    'pipeanddrape': 'Pipe and Drape',
    'pipe & drape': 'Pipe and Drape',
    'pipe&drape': 'Pipe and Drape',
    'p&d': 'Pipe and Drape',
    'pd': 'Pipe and Drape',
    'shell': 'Shell',
    'shell scheme': 'Shell',
    'shellscheme': 'Shell',
    'space only': 'Space only',
    'spaceonly': 'Space only',
    'space-only': 'Space only',
    'space': 'Space only',
    'raw space': 'Space only',
    'rawspace': 'Space only',
  };
  
  const normalized = mapping[trimmed];
  if (normalized) return normalized;
  
  // Check if it's already a valid value (case-insensitive)
  const match = ALLOWED_STAND_TYPES.find(
    allowed => allowed.toLowerCase() === trimmed
  );
  
  return match || null; // Return null for invalid values to satisfy constraint
}

/**
 * Validates if a stand_type value is valid for the database.
 */
export function isValidStandType(value: string | null | undefined): boolean {
  if (!value) return true; // null is allowed
  return ALLOWED_STAND_TYPES.includes(value as StandType);
}
