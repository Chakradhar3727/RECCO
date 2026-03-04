/**
 * Recycler Facility QR Code Generation — Patch 15 (P15)
 *
 * CRITICAL: This utility generates QR codes for recycler facilities,
 * but it must ONLY be called AFTER admin approval of the facility registration.
 *
 * Trigger point: Admin approves facility → Server Action calls generateFacilityQR()
 * It MUST NOT be called during the registration flow itself.
 *
 * The QR encodes a JSON payload with facility verification data:
 *   {
 *     facilityId: string,
 *     userId: string,
 *     verifyUrl: string,
 *     timestamp: string
 *   }
 *
 * This QR code is scanned by Aggregators during waste drop-off
 * to verify they are at a certified recycling facility.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface FacilityQRPayload {
    /** Unique facility ID from recycler_facilities table */
    facilityId: string;
    /** User ID of the recycler */
    userId: string;
    /** Public verification URL */
    verifyUrl: string;
    /** ISO timestamp of QR generation */
    generatedAt: string;
    /** QR version for future schema changes */
    version: 1;
}

export interface QRGenerationResult {
    /** Base64-encoded QR code PNG image */
    qrImageBase64: string;
    /** The raw payload encoded in the QR */
    payload: FacilityQRPayload;
    /** The full verification URL */
    verifyUrl: string;
}

// ─── QR Generation ──────────────────────────────────────────────────

/**
 * Generates a QR code for a recycler facility.
 *
 * P15: This function MUST only be called from the admin approval Server Action,
 * never during the registration flow.
 *
 * @param facilityId - The UUID of the facility from recycler_facilities table
 * @param userId - The user ID of the recycler
 * @param baseUrl - The base URL of the application (e.g., https://recco.in)
 * @returns QRGenerationResult with base64 image and payload
 */
export async function generateFacilityQR(
    facilityId: string,
    userId: string,
    baseUrl: string
): Promise<QRGenerationResult> {
    const verifyUrl = `${baseUrl}/verify/facility/${facilityId}`;

    const payload: FacilityQRPayload = {
        facilityId,
        userId,
        verifyUrl,
        generatedAt: new Date().toISOString(),
        version: 1,
    };

    // Encode payload as JSON string for QR
    const payloadString = JSON.stringify(payload);

    // Generate QR code as SVG string (lightweight, no external dependency)
    // In production, use 'qrcode' npm package for PNG generation
    // For now, we create a placeholder that stores the payload
    const qrImageBase64 = Buffer.from(
        `QR:${payloadString}`
    ).toString("base64");

    return {
        qrImageBase64,
        payload,
        verifyUrl,
    };
}

// ─── Admin Approval Trigger ─────────────────────────────────────────

/**
 * Called by the admin when approving a recycler facility registration.
 * This is the ONLY legitimate trigger for QR generation.
 *
 * Usage in admin Server Action:
 * ```
 * import { triggerFacilityQRGeneration } from "@/lib/qr/facility";
 * await triggerFacilityQRGeneration(facilityId, userId);
 * ```
 */
export async function triggerFacilityQRGeneration(
    facilityId: string,
    userId: string
): Promise<QRGenerationResult> {
    // Dynamic import to avoid bundling Supabase in non-server contexts
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const adminClient = createServiceRoleClient();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://recco.in";

    // Generate the QR code
    const result = await generateFacilityQR(facilityId, userId, baseUrl);

    // Store the QR data in the facility record
    await adminClient
        .from("recycler_facilities")
        .update({
            qr_code_data: result.payload,
            qr_code_image: result.qrImageBase64,
            qr_generated_at: result.payload.generatedAt,
            approval_status: "APPROVED",
            approved_at: new Date().toISOString(),
        })
        .eq("id", facilityId);

    return result;
}
