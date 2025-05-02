// frontend/api/chatApi.ts
import BASE_URL, { fetchWithToken } from './config';
import { GeminiResponse, ChatHistoryItem } from '../types'; 

const chatApi = {
    sendMessage: async (message: string, history?: ChatHistoryItem[]): Promise<GeminiResponse> => {
        const payload: { message: string; history?: ChatHistoryItem[] } = { message };
        if (history && history.length > 0) {
            payload.history = history;
        }

        const response = await fetchWithToken(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Chat API error! status: ${response.status}`);
        }
        return data as GeminiResponse; // Contains { response, history }
    },
};

export default chatApi;