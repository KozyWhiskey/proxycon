export type CardSource = 'set' | 'sets' | 'cube' | 'none';

const SEATING_FORMATS = new Set(['draft', 'set_draft', 'chaos_draft', 'cube']);
const POD_FORMATS = new Set(['commander', 'two_headed_giant', 'free_play', 'budget_commander']);

export function needsSeating(format: string): boolean {
  return SEATING_FORMATS.has(format);
}

export function isPodFormat(format: string): boolean {
  return POD_FORMATS.has(format);
}

export function cardSourceFor(format: string): CardSource {
  if (format === 'chaos_draft') return 'sets';
  if (format === 'cube') return 'cube';
  if (format === 'set_draft' || format === 'draft' || format === 'sealed') return 'set';
  return 'none';
}

export function formatLabel(format: string): string {
  switch (format) {
    case 'draft':
    case 'set_draft':
      return 'Set draft';
    case 'chaos_draft':
      return 'Chaos draft';
    case 'cube':
      return 'Cube';
    case 'sealed':
      return 'Sealed';
    case 'constructed':
      return 'Constructed';
    case 'commander':
      return 'Commander';
    case 'two_headed_giant':
      return 'Two-Headed Giant';
    case 'free_play':
      return 'Free play';
    case 'budget_commander':
      return '$15 Commander';
    case 'budget_vintage':
      return '$30 Value Vintage';
    default:
      return format;
  }
}

export function rosterKey(row: { id: string; profile_id: string | null }): string {
  return row.profile_id || row.id;
}

export function matchPlayerKey(row: { profile_id: string | null; participant_id?: string | null }): string {
  return row.profile_id || row.participant_id || '';
}

export function seatName(seat: number | null | undefined, name?: string | null): string {
  if (name) return name;
  if (seat) return `Seat ${seat}`;
  return 'Open seat';
}

export const BASIC_LANDS = new Set([
  'plains',
  'island',
  'swamp',
  'mountain',
  'forest',
  'wastes',
  'snow-covered plains',
  'snow-covered island',
  'snow-covered swamp',
  'snow-covered mountain',
  'snow-covered forest',
]);

export function isBasicLand(name: string): boolean {
  return BASIC_LANDS.has(name.trim().toLowerCase());
}
