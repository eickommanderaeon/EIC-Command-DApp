// lib/eip712.ts
import { keccak256, toUtf8Bytes } from "ethers";

export const CLAIM_DOMAIN_NAME = process.env.CLAIM_DOMAIN_NAME || "EICClaims";
export const CLAIM_DOMAIN_VERSION = process.env.CLAIM_DOMAIN_VERSION || "1";

export type Voucher = {
  campaignId: string; // bytes32 hex string
  recipient: string;
  amount: string; // wei string
  nonce: string;  // uint256 as string
  expiry: string; // unix ts string
};

export const CLAIM_TYPES = {
  ClaimVoucher: [
    { name: "campaignId", type: "bytes32" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
};

export function campaignToBytes32(campaign: string) {
  return keccak256(toUtf8Bytes(campaign.toUpperCase()));
}

