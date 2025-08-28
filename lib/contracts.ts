// lib/contracts.ts
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
export const PUBLIC_CONTRACT = process.env.NEXT_PUBLIC_PUBLIC_CONTRACT!;
export const VAULT_CONTRACT = process.env.NEXT_PUBLIC_VAULT_CONTRACT || "";

export const RPC_URL = process.env.RPC_URL || "https://rpc.sepolia.org";

// Minimal ABI covering both potential claim styles.
// Your actual contract may only include one of these—front end will try the one selected by backend.
export const EIC_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  // Merkle-style (optional in your contract)
  "function claim(uint256 amount, bytes32[] calldata proof) external",
  // EIP-712 voucher-style (optional in your contract)
  "function claimWithSig(address recipient,uint256 amount,uint256 nonce,uint256 expiry,bytes32 campaignId,bytes signature) external"
];

export function getBrowserContract(signerOrProvider: any) {
  return new Contract(PUBLIC_CONTRACT, EIC_ABI, signerOrProvider);
}

export function getServerProvider() {
  return new JsonRpcProvider(RPC_URL, CHAIN_ID);
}

export async function ensureSepolia(browserProvider: BrowserProvider) {
  const network = await browserProvider.getNetwork();
  if (Number(network.chainId) === CHAIN_ID) return;
  // Ask wallet to switch to Sepolia
  // 0xaa36a7 is Sepolia chainId in hex
  // @ts-ignore
  await (window as any).ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0xaa36a7" }],
  });
}

