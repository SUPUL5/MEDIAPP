import { useState, useCallback } from 'react';
import chatApi from '../api/chatApi'; // Adjust path
import { ChatMessage, ChatHistoryItem, GeminiResponse } from '../types'; // Adjust path

// Helper for message ID generation
const generateMessageId = (role: ChatMessage['role']): string => {
    return `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

interface UseChatApiProps {
  addMessage: (message: ChatMessage) => void;
  setHistory: (newHistory: ChatHistoryItem[]) => void;
}

interface UseChatApiOutput {
  sendMessage: (text: string, currentHistory: ChatHistoryItem[]) => Promise<void>;
  isLoading: boolean;
}

export const useChatApi = ({ addMessage, setHistory }: UseChatApiProps): UseChatApiOutput => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sendMessage = useCallback(async (text: string, currentHistory: ChatHistoryItem[]) => {
    if (!text || isLoading) {
        return;
    }
    setIsLoading(true);

    try {
        const backendHistory = currentHistory.map(h => ({
            role: h.role,
            parts: Array.isArray(h.parts)
                ? h.parts.map(p => (typeof p === 'string' ? { text: p } : p))
                : typeof h.parts === 'string' ? [{ text: h.parts }] : []
        }));

        const backendResponse: GeminiResponse = await chatApi.sendMessage(text, backendHistory);
        // console.log("[useChatApi] Received from backend API:", JSON.stringify(backendResponse, null, 2));

        let botMessage: ChatMessage | null = null;

        if (!backendResponse || !backendResponse.response) {
            console.error("[useChatApi] Malformed backend response structure:", backendResponse);
            // Corrected: Use 'model' role for error messages
            botMessage = {
                id: generateMessageId('model'), // Use 'model' role
                role: 'model',                 // Use 'model' role
                text: 'Received an unexpected response format.',
                timestamp: Date.now(),
                error: 'Malformed server response.'
            };
        } else {
            const responseData = backendResponse.response;
            const recommendations = Array.isArray(responseData.recommendations) ? responseData.recommendations : [];
            const foundAppointments = Array.isArray(responseData.foundAppointments) ? responseData.foundAppointments : [];
            const foundSlots = Array.isArray(responseData.foundSlots) ? responseData.foundSlots : [];
            const adviceText = responseData.advice?.trim() ?? null;
            const errorText = responseData.error?.trim() ?? null;
            const rawText = responseData.rawText?.trim() ?? responseData.text?.trim() ?? null;

            const hasDisplayableContent = !!rawText || !!adviceText || recommendations.length > 0 || foundAppointments.length > 0 || foundSlots.length > 0 || !!responseData.createdAppointment || !!responseData.updatedAppointment || !!errorText;

            if (hasDisplayableContent) {
                 // Corrected: Always use 'model' role for bot/system messages
                 botMessage = {
                    id: generateMessageId('model'), // Use 'model' role
                    role: 'model',                 // Use 'model' role
                    text: rawText,
                    timestamp: Date.now(),
                    advice: adviceText,
                    recommendations: recommendations,
                    foundAppointments: foundAppointments,
                    foundSlots: foundSlots,
                    createdAppointment: responseData.createdAppointment,
                    updatedAppointment: responseData.updatedAppointment,
                    error: errorText, // Error property indicates it's an error message
                 };
            } else {
                console.log("[useChatApi] Backend response contained no displayable content.");
            }
        }

        if (botMessage) {
            addMessage(botMessage);
        }

        if (backendResponse?.history) {
            setHistory(backendResponse.history);
        } else {
            console.warn("[useChatApi] Backend response did not include history.");
        }

    } catch (error: any) {
        console.error("[useChatApi] Chat API error:", error);
        const errorMessageContent = error?.response?.data?.message || error?.message || 'Unknown error';
        const userFriendlyErrorText = 'Sorry, I encountered an error processing your request.';
        const detailedError = `Error: ${errorMessageContent}`;

        // Corrected: Use 'model' role for error messages displayed in chat
        addMessage({
            id: generateMessageId('model'), // Use 'model' role
            role: 'model',                 // Use 'model' role
            text: userFriendlyErrorText,
            timestamp: Date.now(),
            error: detailedError // Populate the error property
        });
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, addMessage, setHistory]);

  return { sendMessage, isLoading };
};