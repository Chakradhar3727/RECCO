/**
 * Next.js instrumentation hook — runs once at server startup.
 * Fixes DNS resolution when the local DNS server (127.0.0.1) is down.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const dns = await import("dns");
        const currentServers = dns.getServers();

        // If DNS is only pointing to localhost (which may be a dead proxy),
        // add Google's public DNS as fallback
        if (
            currentServers.length === 0 ||
            (currentServers.length === 1 && currentServers[0] === "127.0.0.1")
        ) {
            console.log("[RECCO] Local DNS unreliable, adding Google DNS fallback...");
            dns.setServers(["8.8.8.8", "8.8.4.4", ...currentServers]);
        }
    }
}
