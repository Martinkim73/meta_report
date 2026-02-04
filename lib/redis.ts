import { Redis } from "@upstash/redis";

const CLIENTS_KEY = "clients";

// Lazy initialization to avoid errors when env vars are missing
let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error("Redis environment variables not configured");
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisInstance;
}

export interface ClientConfig {
  access_token: string;
  ad_account_id: string;
  target_campaigns: string[];
  min_spend: number;
  low_roas_threshold: number;
  budget_rule_pct: number;
  discord_webhook: string;
  page_id: string;
  instagram_actor_id: string;
  landing_url: string;
}

export async function getClients(): Promise<Record<string, ClientConfig>> {
  const redis = getRedis();
  if (!redis) return {};

  try {
    const clients = await redis.get<Record<string, ClientConfig>>(CLIENTS_KEY);
    return clients || {};
  } catch (error) {
    console.error("Redis getClients error:", error);
    return {};
  }
}

export async function saveClients(clients: Record<string, ClientConfig>): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");

  await redis.set(CLIENTS_KEY, clients);
}

export async function getClient(name: string): Promise<ClientConfig | null> {
  const clients = await getClients();
  return clients[name] || null;
}

export async function addClient(name: string, config: ClientConfig): Promise<void> {
  const clients = await getClients();
  clients[name] = config;
  await saveClients(clients);
}

export async function deleteClient(name: string): Promise<boolean> {
  const clients = await getClients();
  if (!clients[name]) return false;
  delete clients[name];
  await saveClients(clients);
  return true;
}
