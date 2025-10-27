import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
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
    async createEvent(
        title: string,
        description: string,
        timeSlots: Array<{ date: string; startHour: number; endHour: number }>
    ) {
        console.log('Creating event with:', { title, timeSlots });

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

        const timeSlotsData: Array<{ event_id: string; start_time: string; end_time: string }> = [];

        for (const slot of timeSlots) {
            const [year, month, day] = slot.date.split('-').map(Number);
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
    // Save user availability with status
    // cellIds are objects with cell ID and status: { cellId: string, status: 'available' | 'if-needed' | 'unavailable' }
    async saveAvailability(
        eventId: string,
        userName: string,
        cellData: Array<{ cellId: string; status: string }>
    ) {
        console.log('saveAvailability called with:', { eventId, userName, cellData });

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

        // Store all selected cells with their status as JSON
        const availabilityData = {
            event_id: eventId,
            time_slot_id: timeSlots?.[0]?.id || '',
            user_name: userName,
            selected_cells: cellData // Store array of { cellId, status }
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

    async getUsersForTimeSlot(timeSlotId: string) {
        const { data, error } = await supabase
            .from('availabilities')
            .select('user_name')
            .eq('time_slot_id', timeSlotId);

        if (error) throw error;
        return data.map(a => a.user_name);
    }
};