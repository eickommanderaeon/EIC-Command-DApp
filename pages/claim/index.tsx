// pages/claim/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { BrowserProvider, Contract } from "ethers";
import { CHAIN_ID, getBrowserContract, ensureSepolia } from "@/lib/contracts";

type PrepResp =
  | { ok: true; mode: "eip712"; data: any }
  | { ok: true; mode: "merkle"; data: any }
  | { ok: false; error: string };

export default function ClaimPage() {
  const router = useRouter();
  const { campaign, code } = router.query as { campaign?: string; code?: string };

  const [status, setStatus] = useState<string>("");
  const [tx, setTx] = useState<string>("");
  const [error, setError] = useState<string>("");

  const explorerTx = useMemo(
    () => (tx ? `https://sepolia.etherscan.io/tx/${tx}` : ""),
    [tx]
  );

  async function doClaim() {
    try {
      setError(""); setTx(""); setStatus("Preparing claim…");

      // Ask backend for voucher/proof
      const resp = await fetch(`/api/claim/prepare?campaign=${campaign}&code=${code}`);
      const data: PrepResp = await resp.json();
      if (!data.ok) throw new Error((data as any).error || "Prepare failed");

      // Connect wallet
      // @ts-ignore
      const { ethereum } = window;
      if (!ethereum) throw new Error("No wallet found");
      await ethereum.request({ method: "eth_requestAccounts" });

      const provider = new BrowserProvider(ethereum);
      await ensureSepolia(provider);
      const signer = await provider.getSigner();
      const contract: Contract = getBrowserContract(signer);

      setStatus("Submitting claim…");
      let txResp;

      if (data.mode === "eip712") {
        const { voucher, signature } = (data as any).data;
        // Prefer recipient = connected wallet for safety
        const addr = await signer.getAddress();
        txResp = await contract.claimWithSig(
          addr,
          voucher.amount,
          voucher.nonce,
          voucher.expiry,
          voucher.campaignId,
          signature
        );
      } else if (data.mode === "merkle") {
        const { amount, proof } = (data as any).data;
        txResp = await contract.claim(amount, proof);
      } else {
        throw new Error("Unsupported claim mode");
      }

      setStatus("Waiting for confirmation…");
      const receipt = await txResp.wait();
      setTx(receipt.hash);
      setStatus("✅ Claimed!");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Claim failed");
      setStatus("");
    }
  }

  useEffect(() => {
    if (!campaign || !code) return;
  }, [campaign, code]);

  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>EIC Claim — {campaign || "unknown"}</h1>
      <p>Campaign: <b>{campaign}</b></p>
      <p>Code: <code>{code}</code></p>

      <button onClick={doClaim} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}>
        Connect & Claim
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
      {tx && <p>Tx: <a href={explorerTx} target="_blank" rel="noreferrer">{tx}</a></p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <hr style={{ margin: "24px 0" }} />
      <small>Network: Sepolia (chainId {CHAIN_ID}) • Contract: {process.env.NEXT_PUBLIC_PUBLIC_CONTRACT}</small>
    </main>
  );
}

