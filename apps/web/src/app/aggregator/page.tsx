import { redirect } from "next/navigation";

/**
 * /aggregator root — redirects to the aggregator login page.
 */
export default function AggregatorRootPage() {
    redirect("/aggregator/login");
}
