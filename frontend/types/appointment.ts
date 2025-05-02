import { Availability } from "./availability";
import { User } from "./user";

export interface AppointmentCreateRequest {
  availabilityId: string; 
  serviceType: string;
}

export interface AppointmentUpdateRequest {
  availabilityId?: string; 
  status?: string;
  serviceType?: string;
}

export interface Appointment {
  _id: string;
  patientId: string | User;
  doctorId: string | User;
  availability: Availability;
  status: string;
  createdAt: string;
  updatedAt: string;
  serviceType: string;
}
