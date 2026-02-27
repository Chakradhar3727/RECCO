import { Factory, MapPin, Clock } from "lucide-react";

export default function DeliveryPage({
    params,
}: {
    params: { facilityId: string };
}) {
    return (
        <main className="min-h-screen bg-white p-6">
            <div className="max-w-md mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-4 rounded-2xl bg-recco-teal-700 text-white shadow-lg">
                        <Factory size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-recco-navy-900">
                        Facility Delivery
                    </h1>
                    <p className="text-recco-navy-900/60 text-sm">
                        Facility ID: {params.facilityId}
                    </p>
                </div>

                <div className="bg-recco-green-100 p-4 rounded-xl border border-recco-green-700">
                    <div className="flex items-center gap-3">
                        <MapPin size={20} className="text-recco-green-700" />
                        <div>
                            <p className="font-medium text-recco-navy-900">Delivery Confirmation</p>
                            <p className="text-sm text-recco-navy-900/60">
                                Confirm delivery at the recycler facility with GPS + weight verification.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-recco-gray-50 p-4 rounded-xl text-center">
                    <Clock size={24} className="mx-auto mb-2 text-recco-navy-900/40" />
                    <p className="text-recco-navy-900/60 text-sm">
                        Delivery verification coming in Phase 5
                    </p>
                </div>
            </div>
        </main>
    );
}
