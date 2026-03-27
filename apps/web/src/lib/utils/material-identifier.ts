/**
 * RECCO — Material Identifier Utility (Module 3.1, G42)
 *
 * Shared constants and types for AI material type classification.
 * Used by both the API route (/api/ai/identify-material) and UI components.
 */

// ── CPCB Material Categories ─────────────────────────────────────────
export const VALID_MATERIALS = [
  'PET',
  'HDPE',
  'PVC',
  'LDPE',
  'PP',
  'PS',
  'MLP',
  'PLASTIC_SHEET',
  'MIXED',
] as const;

export type MaterialType = (typeof VALID_MATERIALS)[number];

// ── Material Label Map ───────────────────────────────────────────────
export const MATERIAL_LABELS: Record<MaterialType, string> = {
  PET: 'PET Bottles',
  HDPE: 'HDPE Containers',
  PVC: 'PVC Rigid',
  LDPE: 'LDPE Film',
  PP: 'PP Containers',
  PS: 'PS / Thermocol',
  MLP: 'Multi-Layer Plastic',
  PLASTIC_SHEET: 'Plastic Sheet / Cover',
  MIXED: 'Mixed Plastic',
};

// ── Confidence Thresholds ────────────────────────────────────────────
export const AI_CONFIDENCE_HIGH = 80;
export const AI_CONFIDENCE_MEDIUM = 60;
export const AI_CONFIDENCE_LOW = 40;

/**
 * Maps a raw AI-detected string to the nearest valid CPCB material type.
 * Returns 'MIXED' if no match found.
 */
export function normalizeMaterial(raw: string | null | undefined): MaterialType {
  if (!raw) return 'MIXED';
  const upper = raw.toUpperCase().trim();
  if (VALID_MATERIALS.includes(upper as MaterialType)) {
    return upper as MaterialType;
  }
  // Fuzzy fallback for common variations
  if (upper.includes('PET') || upper.includes('BOTTLE')) return 'PET';
  if (upper.includes('HDPE') || upper.includes('JUG')) return 'HDPE';
  if (upper.includes('PVC') || upper.includes('PIPE')) return 'PVC';
  if (upper.includes('LDPE') || upper.includes('FILM') || upper.includes('BAG')) return 'LDPE';
  if (upper.includes('PP') || upper.includes('POLYPROPYLENE')) return 'PP';
  if (upper.includes('PS') || upper.includes('THERMOCOL') || upper.includes('FOAM')) return 'PS';
  if (upper.includes('MLP') || upper.includes('MULTI') || upper.includes('LAYER')) return 'MLP';
  if (upper.includes('SHEET') || upper.includes('TARP') || upper.includes('COVER')) return 'PLASTIC_SHEET';
  return 'MIXED';
}

/**
 * Returns human-readable label for a material type.
 */
export function getMaterialLabel(material: MaterialType): string {
  return MATERIAL_LABELS[material] ?? 'Mixed Plastic';
}

/**
 * Checks if AI confidence meets the minimum threshold for trust.
 */
export function isConfidenceTrusted(confidence: number, threshold = AI_CONFIDENCE_MEDIUM): boolean {
  return confidence >= threshold;
}
