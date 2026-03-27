import { redirect } from "next/navigation";

/**
 * /aggregator root — redirects to the aggregator dashboard.
 */
export default function AggregatorRootPage() {
    redirect("/aggregator/dashboard");
}
