/* Minimal JSON file store for codes */
import fs from "fs";
import path from "path";

const DEFAULT_PATH = path.join(process.cwd(), "data", "codes.json");
const STORE_PATH = process.env.CODES_STORE_PATH || DEFAULT_PATH;

export type CodeRecord = {
  code: string;
  campaign: string;
  amount: string;  // whole tokens string, e.g., "10"
  used: boolean;
  // optional: recipient, txHash, usedAt, etc.
  recipient?: string;
  txHash?: string;
  usedAt?: number;
};

export type CodeMap = Record<string, CodeRecord>; // key: `${campaign}:${code}`

function key(campaign: string, code: string) {
  return `${campaign}:${code}`.toUpperCase();
}

export function loadCodes(): CodeMap {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

export function saveCodes(map: CodeMap) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(map, null, 2), "utf8");
}

export function putCodes(items: Array<Omit<CodeRecord, "used"> & { used?: boolean }>) {
  const map = loadCodes();
  for (const it of items) {
    const k = key(it.campaign, it.code);
    map[k] = { ...it, used: !!it.used };
  }
  saveCodes(map);
}

export function getCode(campaign: string, code: string): CodeRecord | null {
  const map = loadCodes();
  const k = key(campaign, code);
  return map[k] || null;
}

export function markUsed(campaign: string, code: string, update: Partial<CodeRecord> = {}) {
  const map = loadCodes();
  const k = key(campaign, code);
  if (!map[k]) return false;
  map[k] = { ...map[k], used: true, usedAt: Date.now(), ...update };
  saveCodes(map);
  return true;
}

