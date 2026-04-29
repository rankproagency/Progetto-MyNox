import { Genre } from '../types';

export const ALL_GENRES: Genre[] = [
  'Techno', 'House', 'Hip-Hop', 'Trap', 'Pop', 'R&B', 'Reggaeton', 'Commercial',
];

export const GENRE_CONFIG: Record<Genre, { color: string; colorEnd: string }> = {
  'Techno':      { color: '#7c3aed', colorEnd: '#09090b' },
  'Hip-Hop':     { color: '#a855f7', colorEnd: '#1e1b4b' },
  'House':       { color: '#818cf8', colorEnd: '#1e3a8a' },
  'Commercial':  { color: '#c084fc', colorEnd: '#7e22ce' },
  'Reggaeton':   { color: '#d946ef', colorEnd: '#6d28d9' },
  'Trap':        { color: '#c026d3', colorEnd: '#3b0764' },
  'R&B':         { color: '#e879f9', colorEnd: '#86198f' },
  'Pop':         { color: '#f0abfc', colorEnd: '#be185d' },
};
