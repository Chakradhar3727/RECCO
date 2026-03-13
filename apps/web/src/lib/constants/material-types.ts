/**
 * CPCB Material Type Constants for RECCO
 * Maps RECCO's internal material_type values to CPCB Category I-IV classifications.
 * These ENUMs exactly match the `collections.material_type` column in Supabase.
 */

export interface MaterialOption {
  value: string;
  label: string;
  category: string;
  description: string;
  icon: string; // emoji for quick visual identification
}

/**
 * CPCB material types available for aggregator collection.
 * Category I: Rigid plastic
 * Category II: Flexible plastic (single-layer)
 * Category III: Multi-layered plastic
 * Category IV: Plastic sheet / cover
 */
export const MATERIAL_TYPES: MaterialOption[] = [
  {
    value: 'PET',
    label: 'PET Bottles',
    category: 'Category I',
    description: 'Water bottles, soft drink bottles, oil bottles',
    icon: '🍶',
  },
  {
    value: 'HDPE',
    label: 'HDPE Containers',
    category: 'Category I',
    description: 'Milk jugs, detergent bottles, jerry cans',
    icon: '🫙',
  },
  {
    value: 'PVC',
    label: 'PVC Rigid',
    category: 'Category I',
    description: 'Pipes, fittings, window profiles',
    icon: '🔧',
  },
  {
    value: 'LDPE',
    label: 'LDPE Film',
    category: 'Category II',
    description: 'Carry bags, shrink wrap, agricultural film',
    icon: '🛍️',
  },
  {
    value: 'PP',
    label: 'PP Containers',
    category: 'Category I',
    description: 'Food containers, bottle caps, auto parts',
    icon: '📦',
  },
  {
    value: 'PS',
    label: 'PS / Thermocol',
    category: 'Category I',
    description: 'Thermocol, disposable cups, packaging foam',
    icon: '☕',
  },
  {
    value: 'MLP',
    label: 'Multi-Layer Plastic',
    category: 'Category III',
    description: 'Chips packets, biscuit wrappers, tetrapaks',
    icon: '🍫',
  },
  {
    value: 'PLASTIC_SHEET',
    label: 'Plastic Sheet / Cover',
    category: 'Category IV',
    description: 'Tarpaulin, greenhouse covers, plastic sheets',
    icon: '📄',
  },
  {
    value: 'MIXED',
    label: 'Mixed Plastic',
    category: 'Unsorted',
    description: 'Unsorted mixed plastic waste',
    icon: '♻️',
  },
];
