import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// PIN padding: Supabase requires passwords >= 6 chars. We pad 4-digit PINs.
const PIN_SUFFIX = "##";

/**
 * POST /api/aggregator/complete-registration
 *
 * Completes aggregator registration: sets PIN, creates profile & aggregator record.
 * Uses an API route instead of a server action to avoid serialization issues.
 */
export async function POST(request: NextRequest) {
    try {
        const { email, name, pin } = await request.json();

        if (!email || !name || !pin) {
            return NextResponse.json(
                { success: false, error: "Missing required fields (email, name, pin)." },
                { status: 400 }
            );
        }

        const adminClient = createServiceRoleClient();

        // Generate user ID: AGG-<first 5 chars of email>-<random 6 digits>
        const emailPrefix = email.split("@")[0].substring(0, 5).toUpperCase();
        const randomSuffix = String(Math.floor(100000 + Math.random() * 900000));
        const userId = `AGG-${emailPrefix}-${randomSuffix}`;

        // Look up the user by email via admin API
        const { data: userList, error: listError } = await adminClient.auth.admin.listUsers();

        if (listError) {
            console.error("Admin listUsers error:", listError);
            return NextResponse.json(
                { success: false, error: `Admin API error: ${listError.message}` },
                { status: 500 }
            );
        }

        const user = userList.users.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found. Please start registration over." },
                { status: 404 }
            );
        }

        // Set PIN as the password (use admin API to bypass min length restriction)
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            user.id,
            { password: pin + PIN_SUFFIX }
        );

        if (updateError) {
            console.error("PIN update error:", updateError);
            return NextResponse.json(
                { success: false, error: `Failed to set PIN: ${updateError.message}` },
                { status: 500 }
            );
        }

        // Update user profile (non-blocking — continue even if this fails)
        const { error: profileError } = await adminClient
            .from("user_profiles")
            .upsert({
                id: user.id,
                email: email.toLowerCase(),
                portal_role: "AGGREGATOR",
                full_name: name,
            });

        if (profileError) {
            console.error("Profile upsert error:", profileError);
        }

        // Insert/update aggregators table
        const { error: aggError } = await adminClient
            .from("aggregators")
            .upsert({
                id: user.id,
                user_id: userId,
                email: email.toLowerCase(),
                name,
                status: "active",
            });

        if (aggError) {
            console.error("Aggregator insert error:", aggError);
            return NextResponse.json(
                { success: false, error: `Registration failed: ${aggError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, userId });
    } catch (err: any) {
        console.error("complete-registration uncaught error:", err);
        return NextResponse.json(
            { success: false, error: err?.message || "Unexpected server error." },
            { status: 500 }
        );
    }
}
