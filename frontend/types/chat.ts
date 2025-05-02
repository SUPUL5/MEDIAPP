// frontend/types/chat.ts
import { User } from './user';
import { Availability } from './availability';
import { Appointment } from './appointment';

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text?: string | null;
    timestamp: number;
    advice?: string | null;
    recommendations?: DoctorRecommendation[] | null;
    foundAppointments?: Appointment[] | null;
    foundSlots?: Availability[] | null;
    createdAppointment?: Appointment | null;
    updatedAppointment?: Appointment | null;
    error?: string | null;
}

export interface ChatHistoryItem {
    role: 'user' | 'model';
    parts: ({ text: string } | { functionCall: any } | { functionResponse: any })[];
}

export interface DoctorRecommendation {
    doctor: User;
    availabilitySlots: Availability[];
}

export interface GeminiChatResponseContent {
    rawText?: string | null;
    text?: string | null;
    advice?: string | null;
    recommendations?: DoctorRecommendation[] | null;
    foundAppointments?: Appointment[] | null;
    foundSlots?: Availability[] | null;
    createdAppointment?: Appointment | null;
    updatedAppointment?: Appointment | null;
    error?: string | null;
}

export interface GeminiResponse {
    response: GeminiChatResponseContent;
    history: ChatHistoryItem[];
}

export type { User, Appointment, Availability };