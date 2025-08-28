// pages/admin/codes.tsx
import { useState } from "react";

export default function CodesAdmin() {
  const [campaign, setCampaign] = useState("poi-006");
  const [count, setCount] = useState(20);
  const [amount, setAmount] = useState(10);
  const [baseUrl, setBaseUrl] = useState(
    process.env.NEXT_PUBLIC_BASE_URL || "https://your-dapp-domain.example"
  );
  const [csv, setCsv] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setBusy(true); setErr(""); setCsv(""); setFiles([]);
    try {
      const resp = await fetch("/api/codes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign, count, amount, baseUrl }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "Failed to generate");
      setCsv(data.csv);
      setFiles(data.files || []);
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign}-codes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>PoI Code Generator</h1>
      <p>Generate one-time QR claim codes for campaigns (e.g., <b>poi-006</b>, <b>poi-007</b>).</p>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <label>
          Campaign<br />
          <input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="poi-006" />
        </label>
        <label>
          Count<br />
          <input type="number" value={count} onChange={e => setCount(Number(e.target.value))} min={1} max={1000} />
        </label>
        <label>
          Amount (EIC)<br />
          <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={1} />
        </label>
        <label>
          Base URL (public)<br />
          <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://your-dapp-domain" />
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={generate} disabled={busy} style={{ padding: "10px 16px", borderRadius: 8, cursor: "pointer" }}>
          {busy ? "Generating…" : "Generate Codes + QRs"}
        </button>
      </div>

      {err && <p style={{ color: "red" }}>Error: {err}</p>}

      {csv && (
        <>
          <h2 style={{ marginTop: 24 }}>CSV</h2>
          <button onClick={downloadCsv} style={{ padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
            Download CSV
          </button>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12, borderRadius: 8, marginTop: 8 }}>
            {csv}
          </pre>
        </>
      )}

      {files.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>QR Files</h2>
          <ul>
            {files.map((f) => (
              <li key={f}>
                <a href={f} target="_blank" rel="noreferrer">{f}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
