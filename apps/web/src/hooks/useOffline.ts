"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface QueuedAction {
    id: string;
    action: string;
    data: unknown;
    timestamp: number;
}

export function useOffline() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );
    const [queue, setQueue] = useState<QueuedAction[]>([]);
    const processingRef = useRef(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const addToQueue = useCallback((action: string, data: unknown) => {
        const item: QueuedAction = {
            id: crypto.randomUUID(),
            action,
            data,
            timestamp: Date.now(),
        };
        setQueue((prev) => [...prev, item]);
        return item.id;
    }, []);

    const removeFromQueue = useCallback((id: string) => {
        setQueue((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const processQueue = useCallback(
        async (processor: (item: QueuedAction) => Promise<boolean>) => {
            if (processingRef.current || !isOnline || queue.length === 0) return;
            processingRef.current = true;

            for (const item of queue) {
                try {
                    const success = await processor(item);
                    if (success) removeFromQueue(item.id);
                } catch {
                    break; // Stop processing on failure
                }
            }

            processingRef.current = false;
        },
        [isOnline, queue, removeFromQueue]
    );

    return {
        isOnline,
        queue,
        queueLength: queue.length,
        addToQueue,
        removeFromQueue,
        processQueue,
    };
}
