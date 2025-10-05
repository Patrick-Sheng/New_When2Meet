import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rsagursnppdyiwpivqwy.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYWd1cnNucHBkeWl3cGl2cXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NTcxNTMsImV4cCI6MjA3NTEzMzE1M30.SU5zxvBUimaaeLxPpjOeqXEFCz1SHDXhI9Y9OCFUFvE";

export const supabase = createClient(supabaseUrl, supabaseKey);

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

export const eventApi = {
  // Create a new event with time slots (one per day, not per 15-min interval)
  async createEvent(
    title: string,
    description: string,
    timeSlots: Array<{ date: string; startHour: number; endHour: number }>
  ) {
    console.log('Creating event with:', { title, timeSlots });

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: title,
        description: description
      })
      .select()
      .single();

    if (eventError) {
      console.error('Supabase event error:', eventError);
      throw eventError;
    }

    console.log('Event created:', event);

    // Create ONE time slot per day (not per 15-min interval)
    const timeSlotsData: Array<{ event_id: string; start_time: string; end_time: string }> = [];

    for (const slot of timeSlots) {
      // Parse date in local timezone
      const [year, month, day] = slot.date.split('-').map(Number);

      // Create date in local timezone
      const startDate = new Date(year, month - 1, day, slot.startHour, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, slot.endHour, 0, 0, 0);

      timeSlotsData.push({
        event_id: event.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString()
      });
    }

    console.log(`Creating ${timeSlotsData.length} time slots (one per day)`);

    const { data: slots, error: slotsError } = await supabase
      .from('time_slots')
      .insert(timeSlotsData)
      .select();

    if (slotsError) {
      console.error('Supabase time slots error:', slotsError);
      throw slotsError;
    }

    console.log('Time slots created:', slots?.length);

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
  // cellIds are in format: "YYYY-MM-DD-HH-MM" representing 15-min time slots
  async saveAvailability(eventId: string, userName: string, cellIds: string[]) {
    console.log('saveAvailability called with:', { eventId, userName, cellIds });

    // First, delete existing availability for this user and event
    const { error: deleteError } = await supabase
      .from('availabilities')
      .delete()
      .eq('event_id', eventId)
      .eq('user_name', userName);

    if (deleteError) {
      console.error('Error deleting old availability:', deleteError);
      throw deleteError;
    }

    // Get all time slots for this event
    const { data: timeSlots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('event_id', eventId);

    if (slotsError) {
      console.error('Error fetching time slots:', slotsError);
      throw slotsError;
    }

    console.log('Found time slots:', timeSlots?.length);

    // Just store all selected cell IDs as a single JSON array
    // This way we don't need multiple records per user
    const availabilityData = {
      event_id: eventId,
      time_slot_id: timeSlots?.[0]?.id || '', // Use first slot as reference
      user_name: userName,
      selected_cells: cellIds // Store entire array of selected cells
    };

    console.log('Availability data to insert:', availabilityData);

    const { data, error } = await supabase
      .from('availabilities')
      .insert(availabilityData)
      .select();

    if (error) {
      console.error('Error inserting availability:', error);
      throw error;
    }

    console.log('Successfully saved availability:', data);
    return data;
  },

  // Get all availability for an event
  async getEventAvailability(eventId: string) {
    const { data, error } = await supabase
      .from('availabilities')
      .select(`
        *,
        time_slots (*)
      `)
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