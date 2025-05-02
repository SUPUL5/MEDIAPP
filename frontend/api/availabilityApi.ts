import BASE_URL, { fetchWithToken } from './config';
import { Availability, AvailabilityResponse } from '../types/appointmentScreen.types';
import { AvailabilityCreateRequest, AvailabilityUpdateRequest } from '../types';

const availabilityApi = {
  getAllAvailabilities: async (): Promise<Availability[]> => {
    const response = await fetchWithToken(`${BASE_URL}/availability`);
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (e: any) {
        throw new Error(`Failed to parse error message: ${e}`);
      }
    }
    return response.json();
  },

  getAvailabilityById: async (id: string): Promise<Availability> => {
    const response = await fetchWithToken(`${BASE_URL}/availability/${id}`);
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (e: any) {
        throw new Error(`Failed to parse error message: ${e}`);
      }
    }
    return response.json();
  },

  createAvailability: async (availabilityData: AvailabilityCreateRequest): Promise<AvailabilityResponse> => {
    const response = await fetchWithToken(`${BASE_URL}/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(availabilityData),
    });
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (e: any) {
        throw new Error(`Failed to parse error message: ${e}`);
      }
    }
    return response.json();
  },

  updateAvailabilityById: async (id: string, availabilityData: AvailabilityUpdateRequest): Promise<Availability> => {
    const response = await fetchWithToken(`${BASE_URL}/availability/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(availabilityData),
    });
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (e: any) {
        throw new Error(`Failed to parse error message: ${e}`);
      }
    }
    return response.json();
  },

  deleteAvailabilityById: async (id: string): Promise<AvailabilityResponse> => {
    const response = await fetchWithToken(`${BASE_URL}/availability/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (e: any) {
        throw new Error(`Failed to parse error message: ${e}`);
      }
    }
    return response.json();
  },

  getAvailabilitiesByDoctorId: async (doctorId: string): Promise<Availability[]> => {
    const response = await fetchWithToken(`${BASE_URL}/availability/doctor/${doctorId}`);
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (e: any) {
        throw new Error(`Failed to parse error message: ${e}`);
      }
    }
    return response.json();
  },

  getMyAvailabilities: async (): Promise<Availability[]> => {
    const response = await fetchWithToken(`${BASE_URL}/availability/me`);
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (e: any) {
        throw new Error(`Failed to parse error message: ${e}`);
      }
    }
    return response.json();
  },
};

export default availabilityApi;