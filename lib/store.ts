/* Store that uses Vercel KV in prod, JSON file locally */
import fs from "fs";
import path from "path";

// Try KV (available on Vercel)
let kv: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  kv = require("@vercel/kv").kv;
} catch {}

const DEFAULT_PATH = path.join(process.cwd(), "data", "codes.json");
const STORE_PATH = process.env.CODES_STORE_PATH || DEFAULT_PATH;

export type CodeRecord = {
  code: string;
  campaign: string;
  amount: string;  // whole tokens, e.g., "10"
  used: boolean;
  recipient?: string;
  txHash?: string;
  usedAt?: number;
};
export type CodeMap = Record<string, CodeRecord>; // key = `${campaign}:${code}`

function key(campaign: string, code: string) {
  return `${campaign}:${code}`.toUpperCase();
}

/** LOCAL fallback */
function loadLocal(): CodeMap {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}
function saveLocal(map: CodeMap) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(map, null, 2), "utf8");
}

export async function loadCodes(): Promise<CodeMap> {
  if (kv) {
    const all = await kv.hgetall<CodeMap>("EIC_CODES");
    return all || {};
  }
  return loadLocal();
}

export async function saveCodes(map: CodeMap) {
  if (kv) {
    // replace whole hash
    await kv.del("EIC_CODES");
    const entries = Object.entries(map);
    if (entries.length) {
      await Promise.all(entries.map(([k, v]) => kv.hset("EIC_CODES", { [k]: v })));
    }
    return;
  }
  saveLocal(map);
}

export async function putCodes(items: Array<Omit<CodeRecord, "used"> & { used?: boolean }>) {
  const map = await loadCodes();
  for (const it of items) map[key(it.campaign, it.code)] = { ...it, used: !!it.used } as CodeRecord;
  await saveCodes(map);
}

export async function getCode(campaign: string, code: string): Promise<CodeRecord | null> {
  const k = key(campaign, code);
  if (kv) {
    const v = await kv.hget<CodeRecord>("EIC_CODES", k);
    return (v as any) || null;
  }
  const map = loadLocal();
  return map[k] || null;
}

export async function markUsed(campaign: string, code: string, update: Partial<CodeRecord> = {}) {
  const k = key(campaign, code);
  if (kv) {
    const v = await kv.hget<CodeRecord>("EIC_CODES", k);
    if (!v) return false;
    const next = { ...v, used: true, usedAt: Date.now(), ...update };
    await kv.hset("EIC_CODES", { [k]: next });
    return true;
  }
  const map = loadLocal();
  if (!map[k]) return false;
  map[k] = { ...map[k], used: true, usedAt: Date.now(), ...update };
  saveLocal(map);
  return true;
}
