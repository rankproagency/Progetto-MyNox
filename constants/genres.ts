import { Genre } from '../types';

export const ALL_GENRES: Genre[] = [
  'Techno', 'House', 'Hip-Hop', 'Trap', 'Pop', 'R&B', 'Reggaeton', 'Commercial',
];

export const GENRE_CONFIG: Record<Genre, { color: string; colorEnd: string }> = {
  'Techno':      { color: 'rgba(124,58,237,0.8)',   colorEnd: 'rgba(9,9,11,0.95)' },
  'Hip-Hop':     { color: 'rgba(168,85,247,0.75)',  colorEnd: 'rgba(30,27,75,0.95)' },
  'House':       { color: 'rgba(129,140,248,0.75)', colorEnd: 'rgba(30,58,138,0.95)' },
  'Commercial':  { color: 'rgba(192,132,252,0.7)',  colorEnd: 'rgba(126,34,206,0.95)' },
  'Reggaeton':   { color: 'rgba(217,70,239,0.65)',  colorEnd: 'rgba(109,40,217,0.95)' },
  'Trap':        { color: 'rgba(192,38,211,0.65)',  colorEnd: 'rgba(59,7,100,0.95)' },
  'R&B':         { color: 'rgba(232,121,249,0.6)',  colorEnd: 'rgba(134,25,143,0.95)' },
  'Pop':         { color: 'rgba(240,171,252,0.55)', colorEnd: 'rgba(190,24,93,0.95)' },
};
