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

// Helper to convert date + hour to ISO timestamp
const createTimestamp = (dateStr: string, hour: number): string => {
  const date = new Date(dateStr);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const eventApi = {
  // Create a new event with time slots (15-minute granularity)
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
        title: title
      })
      .select()
      .single();

    if (eventError) {
      console.error('Supabase event error:', eventError);
      throw eventError;
    }

    console.log('Event created:', event);

    // Create 15-minute time slots for each date range
    const timeSlotsData: Array<{ event_id: string; start_time: string; end_time: string }> = [];

    for (const slot of timeSlots) {
      // Parse date in local timezone
      const [year, month, day] = slot.date.split('-').map(Number);

      console.log(`Creating slots for ${slot.date}, hours ${slot.startHour}-${slot.endHour}`);

      // Create a time slot for each 15-minute interval
      for (let h = slot.startHour; h < slot.endHour; h++) {
        for (let m = 0; m < 60; m += 15) {
          // Create date in local timezone
          const startDate = new Date(year, month - 1, day, h, m, 0, 0);
          const endDate = new Date(year, month - 1, day, h, m + 15, 0, 0);

          timeSlotsData.push({
            event_id: event.id,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString()
          });
        }
      }
    }

    console.log(`Creating ${timeSlotsData.length} 15-minute time slots`);
    console.log('First 3 time slots:', timeSlotsData.slice(0, 3));
    console.log('Last 3 time slots:', timeSlotsData.slice(-3));

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

    // Create a map of cell IDs to time slot database IDs
    const cellToSlotMap = new Map<string, string>();

    timeSlots?.forEach(slot => {
      const startDate = new Date(slot.start_time);

      // Format date in local timezone
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;

      const hour = startDate.getHours();
      const minute = startDate.getMinutes();
      const cellId = `${date}-${hour}-${minute}`;
      cellToSlotMap.set(cellId, slot.id);
    });

    console.log('Cell to slot map:', Object.fromEntries(cellToSlotMap));

    // Map cell IDs to database time slot IDs
    const availabilityData = cellIds
      .map(cellId => {
        const slotId = cellToSlotMap.get(cellId);
        if (!slotId) {
          console.warn(`No time slot found for cell ${cellId}`);
          return null;
        }
        return {
          event_id: eventId,
          time_slot_id: slotId,
          user_name: userName
        };
      })
      .filter((item): item is { event_id: string; time_slot_id: string; user_name: string } => item !== null);

    console.log('Availability data to insert:', availabilityData);

    if (availabilityData.length === 0) {
      throw new Error('No valid time slots found for selected cells');
    }

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