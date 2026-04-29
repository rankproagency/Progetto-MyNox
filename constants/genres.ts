import { Genre } from '../types';

export const ALL_GENRES: Genre[] = [
  'Techno', 'House', 'Hip-Hop', 'Trap', 'Pop', 'R&B', 'Reggaeton', 'Commercial',
];

export const GENRE_CONFIG: Record<Genre, { color: string; colorEnd: string; emoji: string }> = {
  'Techno':      { color: 'rgba(109,40,217,1)',   colorEnd: 'rgba(9,9,11,0.95)',   emoji: '⚡' },
  'Hip-Hop':     { color: 'rgba(168,85,247,1)',   colorEnd: 'rgba(30,27,75,0.95)', emoji: '🎤' },
  'House':       { color: 'rgba(99,102,241,1)',   colorEnd: 'rgba(15,20,80,0.95)', emoji: '🎹' },
  'Commercial':  { color: 'rgba(192,132,252,1)',  colorEnd: 'rgba(50,20,90,0.95)', emoji: '🔥' },
  'Reggaeton':   { color: 'rgba(217,70,239,1)',   colorEnd: 'rgba(55,10,70,0.95)', emoji: '🌴' },
  'Trap':        { color: 'rgba(192,38,211,1)',   colorEnd: 'rgba(40,5,55,0.95)',  emoji: '💎' },
  'R&B':         { color: 'rgba(232,121,249,1)',  colorEnd: 'rgba(60,15,75,0.95)', emoji: '🎶' },
  'Pop':         { color: 'rgba(240,171,252,1)',  colorEnd: 'rgba(70,20,80,0.95)', emoji: '✨' },
};
