import { fetchCustomWords } from "@/lib/auth";

export type Word = {
  id: string;
  ar: string;
  translit: string;
  en: string;
  emoji: string;
  category: string;
};

export async function loadAllWords(): Promise<Word[]> {
  try {
    const custom = await fetchCustomWords();
    const mapped: Word[] = custom.map((w) => ({
      id: w.id,
      ar: w.ar,
      translit: w.translit,
      en: w.en,
      emoji: w.emoji,
      category: w.category,
    }));
    return [...WORDS, ...mapped];
  } catch {
    return WORDS;
  }
}

export const WORDS: Word[] = [
  { id: "w1", ar: "طَيَّارَة", translit: "tayyara", en: "Airplane", emoji: "✈️", category: "transport" },
  { id: "w2", ar: "كُوجِينَة", translit: "koujina", en: "Kitchen", emoji: "🍳", category: "food" },
  { id: "w3", ar: "قَطُّوس", translit: "gattous", en: "Cat", emoji: "🐱", category: "animals" },
  { id: "w4", ar: "كَلْب", translit: "kalb", en: "Dog", emoji: "🐶", category: "animals" },
  { id: "w5", ar: "عْصْفُور", translit: "asfour", en: "Bird", emoji: "🐦", category: "animals" },
  { id: "w6", ar: "خُبْز", translit: "khobz", en: "Bread", emoji: "🍞", category: "food" },
  { id: "w7", ar: "تُفَّاحَة", translit: "toffaha", en: "Apple", emoji: "🍎", category: "food" },
  { id: "w8", ar: "كَرْهْبَة", translit: "karhba", en: "Car", emoji: "🚗", category: "transport" },
  { id: "w9", ar: "شَمْس", translit: "shams", en: "Sun", emoji: "☀️", category: "nature" },
  { id: "w10", ar: "قَمَر", translit: "qamar", en: "Moon", emoji: "🌙", category: "nature" },
  { id: "w11", ar: "يَدّ", translit: "yedd", en: "Hand", emoji: "✋", category: "body" },
  { id: "w12", ar: "عِين", translit: "ayn", en: "Eye", emoji: "👁️", category: "body" },
];

export const AVATARS = [
  { id: "a1", emoji: "👦🏻", name: "Karim" },
  { id: "a2", emoji: "👧🏽", name: "Yasmine" },
  { id: "a3", emoji: "👦🏾", name: "Ahmed" },
  { id: "a4", emoji: "👧🏼", name: "Lina" },
  { id: "a5", emoji: "👦🏿", name: "Sami" },
  { id: "a6", emoji: "👧🏻", name: "Maya" },
];
