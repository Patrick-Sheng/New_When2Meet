export type TimeSlot = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  timeSlots: TimeSlot[];
};

export type AvailabilityStatus = 'available' | 'if-needed' | 'unavailable';

export type Availability = {
  userName: string;
  timeSlotId: string;
  status: AvailabilityStatus; // New field for availability status
};