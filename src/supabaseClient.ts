import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rsagursnppdyiwpivqwy.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYWd1cnNucHBkeWl3cGl2cXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NTcxNTMsImV4cCI6MjA3NTEzMzE1M30.SU5zxvBUimaaeLxPpjOeqXEFCz1SHDXhI9Y9OCFUFvE";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Check which schema you're using:
// Schema 1: events(id, name, created_at) + availability(slot timestamp)
// Schema 2: events(id, title, description, created_at) + time_slots(start_time, end_time) + availabilities(time_slot_id)

// This is for SCHEMA 2 (the one you ran second with title/description)

export type DbEvent = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export type DbTimeSlot = {
  id: string;
  event_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type DbAvailability = {
  id: string;
  event_id: string;
  time_slot_id: string;
  user_name: string;
  created_at: string;
};

// Helper to convert date + hour to ISO timestamp
const createTimestamp = (dateStr: string, hour: number): string => {
  const date = new Date(dateStr);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const eventApi = {
  // Create a new event with time slots
  async createEvent(
    title: string,
    description: string,
    timeSlots: Array<{ date: string; startHour: number; endHour: number }>
  ) {
    console.log('Creating event with:', { title, timeSlots });

    // Insert event - only 'title' (no description column in your schema)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: title
      })
      .select()
      .single();

    if (eventError) {
      console.error('Supabase event error:', eventError);
      throw eventError;
    }

    console.log('Event created:', event);

    // Insert time slots with timestamps
    const timeSlotsData = timeSlots.map(slot => ({
      event_id: event.id,
      start_time: createTimestamp(slot.date, slot.startHour),
      end_time: createTimestamp(slot.date, slot.endHour)
    }));

    console.log('Inserting time slots:', timeSlotsData);

    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .insert(timeSlotsData)
      .select();

    if (slotsError) {
      console.error('Supabase time slots error:', slotsError);
      throw slotsError;
    }

    console.log('Time slots created:', slots);

    return { event, timeSlots: slots };
  },

  // Get event with time slots
  async getEvent(eventId: string) {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const { data: timeSlots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true });

    if (slotsError) throw slotsError;

    return { event, timeSlots };
  },

  // Get all events (recent)
  async getAllEvents(limit = 10) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        time_slots (*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};

export const availabilityApi = {
  // Save user availability
  async saveAvailability(eventId: string, userName: string, timeSlotIds: string[]) {
    // First, delete existing availability for this user and event
    const { error: deleteError } = await supabase
      .from('availabilities')
      .delete()
      .eq('event_id', eventId)
      .eq('user_name', userName);

    if (deleteError) throw deleteError;

    // Insert new availability
    const availabilityData = timeSlotIds.map(timeSlotId => ({
      event_id: eventId,
      time_slot_id: timeSlotId,
      user_name: userName
    }));

    const { data, error } = await supabase
      .from('availabilities')
      .insert(availabilityData)
      .select();

    if (error) throw error;
    return data;
  },

  // Get all availability for an event
  async getEventAvailability(eventId: string) {
    const { data, error } = await supabase
      .from('availabilities')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data;
  },

  // Get users who marked a specific time slot as available
  async getUsersForTimeSlot(timeSlotId: string) {
    const { data, error } = await supabase
      .from('availabilities')
      .select('user_name')
      .eq('time_slot_id', timeSlotId);

    if (error) throw error;
    return data.map(a => a.user_name);
  }
};