// frontend/api/appointmentApi.ts
import BASE_URL, { fetchWithToken } from './config';
import { Appointment, AppointmentCreateRequest, AppointmentUpdateRequest } from '../types';

const appointmentApi = {
  getAllAppointments: async (): Promise<Appointment[]> => {
    const response = await fetchWithToken(`${BASE_URL}/appointments`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.message);
    }
    return response.json();
  },

  getAppointmentById: async (id: string): Promise<Appointment> => {
    const response = await fetchWithToken(`${BASE_URL}/appointments/${id}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.message);
    }
    return response.json();
  },

  createAppointment: async (appointmentData: AppointmentCreateRequest): Promise<Appointment> => {
    const response = await fetchWithToken(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  },

  updateAppointmentById: async (id: string, appointmentData: AppointmentUpdateRequest): Promise<Appointment> => {
    const response = await fetchWithToken(`${BASE_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  },

  // Specific function for cancelling an appointment (sets status to 'cancelled')
  cancelAppointment: async (id: string): Promise<Appointment> => {
    return appointmentApi.updateAppointmentById(id, { status: 'cancelled' });
  },

  // Specific function for confirming an appointment (sets status to 'confirmed')
  confirmAppointment: async (id: string): Promise<Appointment> => {
     return appointmentApi.updateAppointmentById(id, { status: 'confirmed' });
  },


  deleteAppointmentById: async (id: string): Promise<{ message: string }> => { // Keep return type simple
    const response = await fetchWithToken(`${BASE_URL}/appointments/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  },

  getMyAllAppointment: async (): Promise<Appointment[]> => {
    const response = await fetchWithToken(`${BASE_URL}/appointments/me`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.message);
    }
    return response.json();
  },
};

export default appointmentApi;