export interface AvailabilityCreateRequest {
  doctorId: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
}

export interface AvailabilityUpdateRequest {
  doctorId?: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: string;
  isBooked?: boolean;
}

export interface Availability {
  _id: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  isBooked: boolean;
}
