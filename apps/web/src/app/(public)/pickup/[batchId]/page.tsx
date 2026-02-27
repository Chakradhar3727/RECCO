import { Truck, MapPin, Clock } from "lucide-react";

export default function PickupPage({
    params,
}: {
    params: { batchId: string };
}) {
    return (
        <main className="min-h-screen bg-white p-6">
            <div className="max-w-md mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-4 rounded-2xl bg-recco-teal-700 text-white shadow-lg">
                        <Truck size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-recco-navy-900">
                        Transport Pickup
                    </h1>
                    <p className="text-recco-navy-900/60 text-sm">
                        Batch ID: {params.batchId}
                    </p>
                </div>

                <div className="bg-recco-green-100 p-4 rounded-xl border border-recco-green-700">
                    <div className="flex items-center gap-3">
                        <MapPin size={20} className="text-recco-green-700" />
                        <div>
                            <p className="font-medium text-recco-navy-900">GPS Verification Required</p>
                            <p className="text-sm text-recco-navy-900/60">
                                Scan the QR code at the pickup location to confirm custodial handover.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-recco-gray-50 p-4 rounded-xl text-center">
                    <Clock size={24} className="mx-auto mb-2 text-recco-navy-900/40" />
                    <p className="text-recco-navy-900/60 text-sm">
                        Pickup verification coming in Phase 5
                    </p>
                </div>
            </div>
        </main>
    );
}
