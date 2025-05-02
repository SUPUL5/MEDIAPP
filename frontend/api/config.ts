// frontend/api/config.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// SERVER_ROOT_URL: The base address where your backend server is running
// (without the '/api' part, used for fetching static files like images)
// !! IMPORTANT: Replace with your actual backend server address !!
// For local development using Expo Go, this is often your computer's local IP.
// For production, this will be your deployed backend URL.
export const SERVER_ROOT_URL = 'http:// 192.168.1.4:5000'; // <-- REPLACE WITH YOUR ACTUAL BACKEND IP/DOMAIN

// BASE_URL: The base URL for your API endpoints
export const BASE_URL = `${SERVER_ROOT_URL}/api`;

interface StoredTokens {
    accessToken: string | null;
}

const getStoredTokens = async (): Promise<StoredTokens> => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    return { accessToken };
};

const storeToken = async (accessToken: string): Promise<void> => {
    await AsyncStorage.setItem('accessToken', accessToken);
};

// Define a type for the headers to satisfy strict typing
type FetchHeaders = Record<string, string>;

export const fetchWithToken = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let { accessToken } = await getStoredTokens();

    // Initialize headers object ensuring type correctness
    const headers: FetchHeaders = {
        ...(options.headers as FetchHeaders || {}), // Assert type or provide empty object
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    };

    // Prepare fetch options, ensuring headers are correctly typed
    const fetchOptions: RequestInit = {
        ...options,
        credentials: 'include', // For cookies (refresh token)
        headers: headers as HeadersInit, // Cast back to HeadersInit after modification
    };

    // Remove Content-Type header if body is FormData, Fetch API handles it
    if (fetchOptions.body instanceof FormData) {
        // TypeScript might complain about deleting from HeadersInit, cast to modify
        delete (fetchOptions.headers as Record<string, string>)['Content-Type'];
    } else if (!headers['Content-Type'] && !(options.method === 'GET' || options.method === 'HEAD')) {
        // Default to JSON if not FormData and not already set (and not GET/HEAD)
         (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }


    let response = await fetch(url, fetchOptions);

    if (response.status === 401) {
        console.log("Received 401, attempting token refresh...");
        try {
            const refreshResponse = await fetch(`${BASE_URL}/users/refresh-token`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!refreshResponse.ok) {
                 console.error("Token refresh failed with status:", refreshResponse.status);
                 await AsyncStorage.multiRemove(['accessToken', 'user']);
                throw new Error('Token refresh failed');
            }

            const { accessToken: newAccessToken } = await refreshResponse.json();
             console.log("Token refreshed successfully.");
            if (!newAccessToken || typeof newAccessToken !== 'string') {
                throw new Error('Invalid new access token received.');
            }
            await storeToken(newAccessToken);

            // Update headers for the retry, ensuring type safety
             (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;

            console.log("Retrying original request with new token...");
            response = await fetch(url, fetchOptions);

        } catch (error) {
            console.error("Error during token refresh or retry:", error);
            await AsyncStorage.multiRemove(['accessToken', 'user']);
            // Consider navigation to login here
            throw new Error('Authentication failed after token refresh attempt.');
        }
    }

    return response;
};

export default BASE_URL;