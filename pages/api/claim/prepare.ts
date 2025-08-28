// pages/api/claim/prepare.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Wallet, parseUnits } from "ethers";
import { campaignToBytes32, CLAIM_DOMAIN_NAME, CLAIM_DOMAIN_VERSION, CLAIM_TYPES, Voucher } from "@/lib/eip712";
import { PUBLIC_CONTRACT, CHAIN_ID } from "@/lib/contracts";
import { getCode } from "@/lib/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const mode = (process.env.CLAIM_MODE || "eip712").toLowerCase();
    const { campaign = "", code = "", recipient = "" } = req.query as Record<string, string>;

    if (!campaign || !code) return res.status(400).json({ ok: false, error: "Missing campaign or code" });

    const rec = getCode(campaign, code);
    if (!rec) return res.status(404).json({ ok: false, error: "Invalid code" });
    if (rec.used) return res.status(410).json({ ok: false, error: "Code already used" });

    if (mode === "eip712") {
      const pk = process.env.SIGNER_PRIVATE_KEY;
      if (!pk) return res.status(500).json({ ok: false, error: "Server signer not configured" });

      const signer = new Wallet(pk);
      const now = Math.floor(Date.now() / 1000);
      const voucher: Voucher = {
        campaignId: campaignToBytes32(campaign),
        recipient: recipient || "0x0000000000000000000000000000000000000000",
        amount: parseUnits(rec.amount, 18).toString(),
        nonce: Date.now().toString(),
        expiry: (now + 60 * 30).toString(),
      };

      const domain = {
        name: CLAIM_DOMAIN_NAME,
        version: CLAIM_DOMAIN_VERSION,
        chainId: CHAIN_ID,
        verifyingContract: PUBLIC_CONTRACT,
      };

      const signature = await signer.signTypedData(domain as any, CLAIM_TYPES as any, voucher as any);

      return res.status(200).json({
        ok: true,
        mode: "eip712",
        data: { voucher, signature, publicContract: PUBLIC_CONTRACT, chainId: CHAIN_ID, amount: rec.amount },
      });
    }

    return res.status(500).json({ ok: false, error: "Unsupported mode" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
}
