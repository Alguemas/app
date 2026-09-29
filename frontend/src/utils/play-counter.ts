import { storage } from "@/src/utils/storage";

const KEY = "simbet_play_counter";
const INTERSTITIAL_EVERY = 10;

// Increments the global play counter and returns true when an interstitial
// ad should be shown (every 10th round, wins or losses combined).
export async function bumpPlayCounterAndShouldShowAd(): Promise<boolean> {
  const current = (await storage.getItem<number>(KEY, 0)) || 0;
  const next = current + 1;
  await storage.setItem(KEY, next);
  return next % INTERSTITIAL_EVERY === 0;
}
