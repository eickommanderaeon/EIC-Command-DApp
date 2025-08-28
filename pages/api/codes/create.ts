// pages/api/codes/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

type CodeItem = {
  code: string;
  amount: string;   // in whole tokens (e.g., "10")
  campaign: string; // e.g., "poi-006"
};

const isDev = process.env.NODE_ENV !== "production";
const QR_OUT_DIR = path.join(process.cwd(), "public", "qr");

function randomCode(len = 7) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { count = 10, campaign = "poi-006", amount = "10", baseUrl = "" } = (req.body || {});
  const n = Math.min(Number(count) || 10, 1000);
  const urlBase = (baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

  if (!urlBase) {
    return res.status(400).json({ ok: false, error: "Missing baseUrl or NEXT_PUBLIC_BASE_URL" });
  }

  const items: CodeItem[] = [];
  if (!fs.existsSync(QR_OUT_DIR)) fs.mkdirSync(QR_OUT_DIR, { recursive: true });

  for (let i = 0; i < n; i++) {
    const code = randomCode();
    items.push({ code, amount: String(amount), campaign });
  }

  // Generate QR PNGs (optional but handy)
  for (const it of items) {
    const claimUrl = `${urlBase}/claim?campaign=${encodeURIComponent(it.campaign)}&code=${encodeURIComponent(it.code)}`;
    const outFile = path.join(QR_OUT_DIR, `${it.campaign}-${it.code}.png`);
    await QRCode.toFile(outFile, claimUrl, { margin: 1, width: 512 });
  }

  // CSV text for download
  const csvHeader = "campaign,code,amount,claim_url\n";
  const csvBody = items.map(it => {
    const link = `${urlBase}/claim?campaign=${encodeURIComponent(it.campaign)}&code=${encodeURIComponent(it.code)}`;
    return `${it.campaign},${it.code},${it.amount},${link}`;
  }).join("\n");

  return res.status(200).json({
    ok: true,
    count: items.length,
    csv: csvHeader + csvBody,
    files: items.map(it => `/qr/${it.campaign}-${it.code}.png`),
  });
}

