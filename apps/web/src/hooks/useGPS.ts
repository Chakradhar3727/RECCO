"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface GPSPosition {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
}

interface UseGPSOptions {
    enableHighAccuracy?: boolean;
    watch?: boolean;
    maxAge?: number;
    timeout?: number;
}

export function useGPS(options: UseGPSOptions = {}) {
    const {
        enableHighAccuracy = true,
        watch = false,
        maxAge = 0,
        timeout = 10000,
    } = options;

    const [position, setPosition] = useState<GPSPosition | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const watchIdRef = useRef<number | null>(null);

    const handleSuccess = useCallback((pos: GeolocationPosition) => {
        setPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
        });
        setLoading(false);
        setError(null);
    }, []);

    const handleError = useCallback((err: GeolocationPositionError) => {
        setError(err.message);
        setLoading(false);
    }, []);

    const getPosition = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation not supported");
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
            enableHighAccuracy,
            maximumAge: maxAge,
            timeout,
        });
    }, [enableHighAccuracy, maxAge, timeout, handleSuccess, handleError]);

    useEffect(() => {
        if (!watch || !navigator.geolocation) return;

        setLoading(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            { enableHighAccuracy, maximumAge: maxAge, timeout }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [watch, enableHighAccuracy, maxAge, timeout, handleSuccess, handleError]);

    return { position, error, loading, getPosition };
}
