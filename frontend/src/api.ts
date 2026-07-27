const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type BetResult = {
  bet_id: string;
  game: string;
  stake: number;
  multiplier: number;
  payout: number;
  won: boolean;
  new_balance: number;
  label: string;
  created_at: string;
};

async function request<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const api = {
  placeBet: (token: string, body: { game: string; stake: number; multiplier: number; label?: string }) =>
    request<BetResult>("/api/user/bet", token, { method: "POST", body: JSON.stringify(body) }),
  getBalance: (token: string) =>
    request<{ virtual_coins: number }>("/api/user/balance", token),
  deposit: (token: string, body: { amount: number; card_number?: string; card_holder?: string; expiry?: string; cvv?: string }) =>
    request<{ virtual_coins: number }>("/api/user/deposit", token, { method: "POST", body: JSON.stringify(body) }),
  getMatches: () =>
    request<{ matches: any[] }>("/api/sports/matches", null),
  getHistory: (token: string) =>
    request<{ bets: BetResult[] }>("/api/bets/history", token),
};
