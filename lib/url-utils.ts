
export const getBaseUrl = () => {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    
    // Check for Vercel environment variables
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }

    // Default to localhost
    return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
};
