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

export type Availability = {
  userName: string;
  timeSlotId: string;
};