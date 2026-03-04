/**
 * Bank Details Encryption Utility — Patch 6 (P6)
 *
 * AES-256-GCM encryption for bank/UPI details.
 * Used by: Recycler registration (Step 5), PRO registration (Step 4)
 *
 * Storage format (JSONB column `bank_details_encrypted`):
 *   { iv: string, ciphertext: string, tag: string }
 *
 * WARNING: This file must ONLY be imported in server-side code.
 *          Never import in client components.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ─── Types ──────────────────────────────────────────────────────────

export interface EncryptedPayload {
    iv: string;
    ciphertext: string;
    tag: string;
}

export interface BankDetails {
    account_holder_name?: string;
    account_number?: string;
    ifsc_code?: string;
    bank_name?: string;
    branch?: string;
    upi_id?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
    const key = process.env.BANK_DETAILS_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error(
            "BANK_DETAILS_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). " +
            "Generate one with: openssl rand -hex 32"
        );
    }
    return Buffer.from(key, "hex");
}

// ─── Encrypt ────────────────────────────────────────────────────────

/**
 * Encrypts bank details using AES-256-GCM.
 * @param details - The bank/UPI details object to encrypt
 * @returns EncryptedPayload containing iv, ciphertext, and auth tag
 */
export function encryptBankDetails(details: BankDetails): EncryptedPayload {
    const key = getEncryptionKey();
    const iv = randomBytes(12); // 96-bit IV for GCM
    const plaintext = JSON.stringify(details);

    const cipher = createCipheriv("aes-256-gcm", key, iv);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
        iv: iv.toString("hex"),
        ciphertext,
        tag,
    };
}

// ─── Decrypt ────────────────────────────────────────────────────────

/**
 * Decrypts bank details from an EncryptedPayload.
 * @param payload - The encrypted payload from the database
 * @returns The decrypted BankDetails object
 */
export function decryptBankDetails(payload: EncryptedPayload): BankDetails {
    const key = getEncryptionKey();
    const iv = Buffer.from(payload.iv, "hex");
    const tag = Buffer.from(payload.tag, "hex");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(payload.ciphertext, "hex", "utf8");
    plaintext += decipher.final("utf8");

    return JSON.parse(plaintext) as BankDetails;
}
