import { Redis } from '@upstash/redis';

// Initialize the Redis client using the environment variables
// It automatically picks up UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Utility to get a cached value or fetch it and cache it.
 */
export async function getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    expirationInSeconds: number = 3600
): Promise<T> {
    try {
        const cachedData = await redis.get<T>(key);
        if (cachedData) {
            return cachedData;
        }

        const freshData = await fetcher();
        await redis.set(key, freshData, { ex: expirationInSeconds });
        return freshData;
    } catch (error) {
        console.warn(`Redis Cache Error for key ${key}:`, error);
        // If Redis fails, gracefully fallback to just fetching the data
        return fetcher();
    }
}
