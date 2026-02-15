// "Surprise Me" mode - random device + random parameters for creative exploration

const SURPRISE_BRIEFS = [
  "Launch a premium water brand that makes hydration feel like a luxury ritual",
  "Rebrand a 100-year-old hardware store for the TikTok generation",
  "Create a campaign for noise-canceling headphones targeting remote workers who miss office sounds",
  "Promote a dating app exclusively for people who hate dating apps",
  "Market a subscription service for mystery snacks from countries you can't pronounce",
  "Sell umbrellas to people who love getting rained on",
  "Launch a perfume inspired by the smell of fresh asphalt after rain",
  "Create awareness for a charity that teaches sharks to swim with humans safely",
  "Rebrand public libraries as the original co-working spaces",
  "Promote a travel agency that only books trips to places that don't exist yet",
  "Market artisanal ice to premium cocktail bars in tropical cities",
  "Launch a fitness tracker for people who consider walking to the fridge exercise",
  "Promote a bookstore where every purchase comes with a stranger's margin notes",
  "Create a campaign for a hotel chain where every room is a different decade",
  "Market a coffee brand that guarantees you'll have the best nap of your life",
  "Launch a fashion line made entirely from recycled billboard vinyl",
  "Promote a streaming service that only plays shows nobody has heard of",
  "Create a campaign for a pen that writes in colors based on your mood",
  "Market a car insurance company using the language of extreme sports",
  "Launch a restaurant where the menu is determined by today's weather",
];

const SURPRISE_TONES = ["bold", "strategic", "conversational", "simplified", "core"];

const SURPRISE_COUNTS = [1, 3, 5];

export interface SurpriseConfig {
  brief: string;
  tone: string;
  conceptCount: number;
}

export function generateSurpriseConfig(): SurpriseConfig {
  return {
    brief: SURPRISE_BRIEFS[Math.floor(Math.random() * SURPRISE_BRIEFS.length)],
    tone: SURPRISE_TONES[Math.floor(Math.random() * SURPRISE_TONES.length)],
    conceptCount: SURPRISE_COUNTS[Math.floor(Math.random() * SURPRISE_COUNTS.length)],
  };
}
