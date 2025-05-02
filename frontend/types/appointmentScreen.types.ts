// frontend/types/appointmentScreen.types.ts
// This file seems unused based on current imports.
// Keeping it empty or removing it might be appropriate.
// For now, let's keep the definition but comment it out
// to avoid potential future conflicts if it was intended for something else.

/*
export interface AvailabilityResponse {
    message: string;
    availability?: Availability;
    availabilities?: Availability[];
}

export interface Availability {
  _id: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  isBooked: boolean;
}
*/

// If this file is truly needed, define the types here.
// Example:
export interface AvailabilityResponse {
    message: string;
    availability?: Availability; // Optional: used for single create/delete/update responses
    // availabilities?: Availability[]; // This might not be needed if list responses return Availability[] directly
}

export interface Availability {
  _id: string;
  doctorId: string;
  startTime: string; // ISO String format recommended (e.g., "2024-10-27T09:00:00.000Z")
  endTime: string;   // ISO String format recommended
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isBooked: boolean;
}