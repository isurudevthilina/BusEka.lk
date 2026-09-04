// src/web/lib/i18n.ts
// Simple bilingual strings for the 6 UI labels that matter most

type Lang = 'en' | 'si';

const strings = {
  map:    { en: 'Map',   si: 'සිතියම' },
  plan:   { en: 'Plan',  si: 'සැලසුම' },
  trains: { en: 'Trains',si: 'දුම්රිය' },
  group:  { en: 'Group', si: 'කණ්ඩායම' },
  more:   { en: 'More',  si: 'තව' },
  live:   { en: 'LIVE',  si: 'සජීවී' },
  offline:{ en: 'Offline', si: 'නොබැඳි' },
  loading:{ en: 'Loading…', si: 'පූරණය…' },
} as const;

export type StringKey = keyof typeof strings;

let _lang: Lang = 'en';
export const setLang = (l: Lang) => { _lang = l; };
export const t = (k: StringKey) => strings[k][_lang];
