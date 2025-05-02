import { useState, useCallback } from 'react';
import { ChatMessage, ChatHistoryItem } from '../types'; // Adjust path

// Helper to generate slightly more unique IDs
const generateMessageId = (role: ChatMessage['role']): string => { // Role is now 'user' | 'model'
    return `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

interface UseChatMessagesOutput {
  messages: ChatMessage[];
  history: ChatHistoryItem[];
  addMessage: (message: ChatMessage) => void;
  setHistory: (newHistory: ChatHistoryItem[]) => void;
  initializeMessages: (initialMessageText: string) => void;
  clearChat: (initialMessageText: string) => void;
}

export const useChatMessages = (): UseChatMessagesOutput => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);

  // Corrected: Use 'model' role for initial bot message
  const createInitialMessage = (text: string): ChatMessage => ({
    id: generateMessageId('model'), // Use 'model' role
    role: 'model',                 // Use 'model' role
    text: text,
    timestamp: Date.now(),
    // Ensure other properties are undefined/null for initial message
    error: null,
    advice: null,
    recommendations: null,
    foundAppointments: null,
    foundSlots: null,
    createdAppointment: null,
    updatedAppointment: null,
  });

  const initializeMessages = useCallback((initialMessageText: string) => {
    // console.log("[useChatMessages] Initializing messages.");
    setMessages([createInitialMessage(initialMessageText)]);
    setHistory([]);
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    // Basic validation
    if (!message || !message.id || !message.role) {
      console.error("[useChatMessages] Attempted to add invalid message:", message);
      return;
    }
    // Ensure role is valid according to type
    if (message.role !== 'user' && message.role !== 'model') {
        console.error(`[useChatMessages] Invalid role "${message.role}" for message ID: ${message.id}. Forcing to 'model'.`);
        message.role = 'model'; // Force to 'model' if invalid role provided
    }

    // console.log(`[useChatMessages] Adding message ID: ${message.id} with role: ${message.role}`);
    setMessages((prevMessages) => {
        // Prevent adding duplicate message IDs (optional safeguard)
        if (prevMessages.some(m => m.id === message.id)) {
            console.warn(`[useChatMessages] Attempted to add duplicate message ID: ${message.id}`);
            return prevMessages;
        }
        return [...prevMessages, message];
    });
  }, []);

  const clearChat = useCallback((initialMessageText: string) => {
    // console.log("[useChatMessages] Clearing chat.");
    setMessages([createInitialMessage(initialMessageText)]);
    setHistory([]);
  }, []);

  return {
    messages,
    history,
    addMessage,
    setHistory,
    initializeMessages,
    clearChat,
  };
};