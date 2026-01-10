// pages/api/claim/confirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerProvider, PUBLIC_CONTRACT } from "@/lib/contracts";
import { markUsed } from "@/lib/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { campaign = "", code = "", tx = "", recipient = "" } = req.body || {};
    if (!campaign || !code || !tx) return res.status(400).json({ ok: false, error: "Missing campaign, code, or tx" });

    const provider = getServerProvider();
    const receipt = await provider.getTransactionReceipt(tx);
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ ok: false, error: "Transaction not found or failed" });
    }

    // Basic verification: ensure tx went to the expected Public contract
    const to = (receipt.to || "").toLowerCase();
    if (to !== PUBLIC_CONTRACT.toLowerCase()) {
      return res.status(400).json({ ok: false, error: "Tx was not sent to the Public EIC contract" });
    }

    // Optional: parse logs to ensure it was a claim function — skipped for now.

    const ok = await markUsed(campaign, code, { recipient, txHash: tx });
    if (!ok) return res.status(404).json({ ok: false, error: "Code not found" });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
}
