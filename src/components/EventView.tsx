import React, { useState, useRef, useEffect } from 'react';
import type { Event, Availability, AvailabilityStatus } from '../types';
import { availabilityApi } from '../supabaseClient';
import { supabase } from '../supabaseClient';

interface EventViewProps {
    event: Event;
    onBack: () => void;
}

function EventView({ event, onBack }: EventViewProps) {
    const [userName, setUserName] = useState('');
    const [selectedCells, setSelectedCells] = useState<Map<string, AvailabilityStatus>>(new Map());
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<AvailabilityStatus>('available');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const [hoveredUser, setHoveredUser] = useState<string | null>(null);
    const [isEditingExisting, setIsEditingExisting] = useState(false);
    const [hasExistingData, setHasExistingData] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [bestTimes, setBestTimes] = useState<Array<{
        date: string;
        startHour: number;
        startMinute: number;
        score: number;
        availableUsers: string[];
        ifNeededUsers: string[];
    }>>([]);
    const [hoveredBestTime, setHoveredBestTime] = useState<{
        date: string;
        startHour: number;
        startMinute: number;
    } | null>(null);
    const draggedCellsRef = useRef(new Set<string>());

    // Filter state variables
    const [filterStartDate, setFilterStartDate] = useState<string>('');
    const [filterStartHour, setFilterStartHour] = useState<string>('');
    const [filterStartMinute, setFilterStartMinute] = useState<string>('');
    const [filterDurationHours, setFilterDurationHours] = useState<string>('1');
    const [filterDurationMinutes, setFilterDurationMinutes] = useState<string>('0');

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                await loadTimeSlots();
                await loadAvailability();
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [event.id]);

    useEffect(() => {
        if (userName.trim()) {
            loadUserSelections(userName.trim());
        } else {
            setSelectedCells(new Map());
            setIsEditingExisting(false);
            setHasExistingData(false);
            setIsEditMode(false);
        }
    }, [userName, availabilities]);

    const loadUserSelections = (name: string) => {
        const userCells = new Map<string, AvailabilityStatus>();

        availabilities
            .filter(a => a.userName.toLowerCase() === name.toLowerCase())
            .forEach(a => {
                userCells.set(a.timeSlotId, a.status);
            });

        if (userCells.size > 0) {
            setSelectedCells(userCells);
            setHasExistingData(true);
            setIsEditingExisting(true);
            setIsEditMode(false);
        } else {
            setSelectedCells(new Map());
            setHasExistingData(false);
            setIsEditingExisting(false);
            setIsEditMode(true);
        }
    };

    const [validCells, setValidCells] = useState<Set<string>>(new Set());
    const [dates, setDates] = useState<string[]>([]);

    const loadTimeSlots = async () => {
        try {
            const { data: timeSlots, error } = await supabase
                .from('time_slots')
                .select('*')
                .eq('event_id', event.id);

            if (error) throw error;

            const cellsSet = new Set<string>();
            const datesSet = new Set<string>();

            timeSlots?.forEach((slot) => {
                const startDate = new Date(slot.start_time);
                const endDate = new Date(slot.end_time);

                const year = startDate.getFullYear();
                const month = String(startDate.getMonth() + 1).padStart(2, '0');
                const day = String(startDate.getDate()).padStart(2, '0');
                const date = `${year}-${month}-${day}`;

                datesSet.add(date);

                const current = new Date(startDate);
                while (current < endDate) {
                    const hour = current.getHours();
                    const minute = current.getMinutes();
                    const cellId = `${date}-${hour}-${minute}`;
                    cellsSet.add(cellId);
                    current.setMinutes(current.getMinutes() + 15);
                }
            });

            const sortedDates = Array.from(datesSet).sort();
            setDates(sortedDates);
            setValidCells(cellsSet);
        } catch (error) {
            console.error('Error loading time slots:', error);
        }
    };

    const loadAvailability = async () => {
        try {
            const data = await availabilityApi.getEventAvailability(event.id);

            const loadedAvailability: Availability[] = [];

            data.forEach(item => {
                const selectedCells = item.selected_cells || [];

                selectedCells.forEach((cellData: { cellId: string; status: string }) => {
                    loadedAvailability.push({
                        userName: item.user_name,
                        timeSlotId: cellData.cellId,
                        status: cellData.status as AvailabilityStatus
                    });
                });
            });

            setAvailabilities(loadedAvailability);
        } catch (error) {
            console.error('Error loading availability:', error);
        }
    };

    const allHours = event.timeSlots.flatMap(s => [s.startHour, s.endHour]);
    const minHour = Math.min(...allHours);
    const maxHour = Math.max(...allHours);

    const timeSlots: Array<{ hour: number; minute: number }> = [];
    for (let h = minHour; h < maxHour; h++) {
        for (let m = 0; m < 60; m += 15) {
            timeSlots.push({ hour: h, minute: m });
        }
    }

    const users = Array.from(new Set(availabilities.map(a => a.userName)));

    const getCellId = (date: string, hour: number, minute: number) => `${date}-${hour}-${minute}`;

    const isValidCell = (date: string, hour: number, minute: number) => {
        const cellId = getCellId(date, hour, minute);
        return validCells.has(cellId);
    };

    const getUsersForCell = (date: string, hour: number, minute: number) => {
        const cellId = getCellId(date, hour, minute);

        if (isEditMode && userName) {
            return availabilities
                .filter(a => a.timeSlotId === cellId && a.userName.toLowerCase() !== userName.toLowerCase());
        } else {
            return availabilities
                .filter(a => a.timeSlotId === cellId);
        }
    };

    const isUserAvailableForCell = (cellId: string, user: string) => {
        return availabilities.some(
            a => a.timeSlotId === cellId && a.userName === user
        );
    };

    const getUserStatusForCell = (cellId: string, user: string): AvailabilityStatus | null => {
        const availability = availabilities.find(
            a => a.timeSlotId === cellId && a.userName === user
        );
        return availability?.status || null;
    };

    const handleMouseDown = (date: string, hour: number, minute: number) => {
        if (!userName || !isEditMode) {
            return;
        }

        if (!isValidCell(date, hour, minute)) return;

        const cellId = getCellId(date, hour, minute);
        setIsDragging(true);
        draggedCellsRef.current = new Set([cellId]);

        const currentCellStatus = selectedCells.get(cellId);
        const newCells = new Map(selectedCells);

        if (!currentCellStatus) {
            newCells.set(cellId, currentStatus);
        } else if (currentCellStatus === currentStatus) {
            newCells.delete(cellId);
        } else {
            newCells.set(cellId, currentStatus);
        }

        setSelectedCells(newCells);
    };

    const handleMouseEnter = (date: string, hour: number, minute: number) => {
        if (!isDragging || !isValidCell(date, hour, minute) || !isEditMode) return;

        const cellId = getCellId(date, hour, minute);
        if (draggedCellsRef.current.has(cellId)) return;

        draggedCellsRef.current.add(cellId);

        const newCells = new Map(selectedCells);
        newCells.set(cellId, currentStatus);
        setSelectedCells(newCells);
    };

    const handleCellHover = (date: string, hour: number, minute: number) => {
        const cellId = getCellId(date, hour, minute);
        const usersInCell = getUsersForCell(date, hour, minute);

        if (usersInCell.length > 0 || selectedCells.has(cellId)) {
            setHoveredCell(cellId);
        }
    };

    const handleCellLeave = () => {
        setHoveredCell(null);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        draggedCellsRef.current.clear();
    };

    const handleSave = async () => {
        if (!userName || selectedCells.size === 0) {
            alert('Please enter your name and select available times');
            return;
        }

        setIsSaving(true);

        try {
            const cellData = Array.from(selectedCells.entries()).map(([cellId, status]) => ({
                cellId,
                status
            }));

            await availabilityApi.saveAvailability(
                event.id,
                userName.trim(),
                cellData
            );

            await loadAvailability();

            const action = isEditingExisting ? 'Updated' : 'Saved';
            alert(`${action} availability for ${userName}!`);

            setIsEditMode(false);
            setHasExistingData(true);
            setIsEditingExisting(true);
        } catch (error) {
            console.error('Error saving availability:', error);
            alert('Failed to save availability. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditClick = () => {
        setIsEditMode(true);
    };

    const findBestMeetingTimes = () => {
        if (users.length === 0) {
            setBestTimes([]);
            return;
        }

        // Calculate meeting duration in minutes from the filter
        const meetingDuration = (parseInt(filterDurationHours) || 0) * 60 + (parseInt(filterDurationMinutes) || 0);

        if (meetingDuration === 0) {
            alert('Please select a meeting duration');
            return;
        }

        const slotsNeeded = Math.ceil(meetingDuration / 15); // Number of 15-min slots needed
        const timeSlotScores: Array<{
            date: string;
            startHour: number;
            startMinute: number;
            score: number;
            availableUsers: string[];
            ifNeededUsers: string[];
            unavailableUsers: string[];
        }> = [];

        // Parse filter criteria
        const hasDateFilter = filterStartDate !== '';
        const hasTimeFilter = filterStartHour !== '' && filterStartMinute !== '';

        let filterDateTime: Date | null = null;
        if (hasDateFilter && hasTimeFilter) {
            filterDateTime = new Date(`${filterStartDate}T${filterStartHour.padStart(2, '0')}:${filterStartMinute.padStart(2, '0')}`);
        }

        const filterDateOnly = hasDateFilter && !hasTimeFilter ? new Date(filterStartDate) : null;

        // Check each possible starting time
        for (const date of dates) {
            // Apply date filter
            if (hasDateFilter) {
                if (filterStartDate !== date) {
                    // If date filter is set and doesn't match, skip this date
                    if (!filterDateOnly || new Date(date) < filterDateOnly) {
                        continue;
                    }
                }
            }

            for (const { hour, minute } of timeSlots) {
                // Apply time filter
                if (filterDateTime) {
                    const slotDateTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
                    if (slotDateTime < filterDateTime) {
                        continue; // Skip times before the filter date-time
                    }
                } else if (hasTimeFilter) {
                    // Time filter without date filter - apply to all dates
                    const filterHour = parseInt(filterStartHour);
                    const filterMinute = parseInt(filterStartMinute);
                    if (hour < filterHour || (hour === filterHour && minute < filterMinute)) {
                        continue;
                    }
                }

                // Check if we have enough consecutive slots for the meeting duration
                let allSlotsValid = true;
                const slotIds: string[] = [];

                for (let i = 0; i < slotsNeeded; i++) {
                    const slotMinute = minute + (i * 15);
                    const slotHour = hour + Math.floor(slotMinute / 60);
                    const adjustedMinute = slotMinute % 60;

                    const cellId = getCellId(date, slotHour, adjustedMinute);
                    if (!validCells.has(cellId)) {
                        allSlotsValid = false;
                        break;
                    }
                    slotIds.push(cellId);
                }

                if (!allSlotsValid) continue;

                // Calculate score for this time slot
                let availableCount = 0;
                let ifNeededCount = 0;
                let unavailableCount = 0;
                const availableUsers = new Set<string>();
                const ifNeededUsers = new Set<string>();
                const unavailableUsers = new Set<string>();

                // Check each user's availability across all slots needed
                for (const user of users) {
                    let userAvailable = true;
                    let userIfNeeded = false;
                    let userUnavailable = false;

                    for (const slotId of slotIds) {
                        const userStatus = availabilities.find(
                            a => a.userName === user && a.timeSlotId === slotId
                        )?.status;

                        if (userStatus === 'unavailable') {
                            userUnavailable = true;
                            userAvailable = false;
                            userIfNeeded = false;
                            break;
                        } else if (userStatus === 'if-needed') {
                            userIfNeeded = true;
                            userAvailable = false;
                        } else if (!userStatus) {
                            // No response from this user
                            userAvailable = false;
                        }
                    }

                    if (userUnavailable) {
                        unavailableUsers.add(user);
                        unavailableCount++;
                    } else if (userIfNeeded) {
                        ifNeededUsers.add(user);
                        ifNeededCount++;
                    } else if (userAvailable) {
                        availableUsers.add(user);
                        availableCount++;
                    }
                }

                // Skip times where everyone is unavailable or no one is available
                if (unavailableCount === users.length || (availableCount === 0 && ifNeededCount === 0)) {
                    continue;
                }

                // Calculate score: prioritize available users, then if-needed users
                // Score: available users * 10 + if-needed users * 5 - unavailable users * 20
                const score = (availableCount * 10) + (ifNeededCount * 5) - (unavailableCount * 20);

                timeSlotScores.push({
                    date,
                    startHour: hour,
                    startMinute: minute,
                    score,
                    availableUsers: Array.from(availableUsers),
                    ifNeededUsers: Array.from(ifNeededUsers),
                    unavailableUsers: Array.from(unavailableUsers)
                });
            }
        }

        // Sort by score (highest first), then by date/time (earliest first)
        timeSlotScores.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // If scores are equal, prefer earlier times
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            if (a.startHour !== b.startHour) {
                return a.startHour - b.startHour;
            }
            return a.startMinute - b.startMinute;
        });

        // Get top 5 best times
        const topTimes = timeSlotScores.slice(0, 5);
        setBestTimes(topTimes);
    };

    const formatTime = (hour: number, minute: number) => {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    const formatTimeRange = (startHour: number, startMinute: number, duration: number) => {
        const endMinutes = startMinute + duration;
        const endHour = startHour + Math.floor(endMinutes / 60);
        const endMinute = endMinutes % 60;

        return `${formatTime(startHour, startMinute)} - ${formatTime(endHour, endMinute)}`;
    };

    const isCellInBestTime = (date: string, hour: number, minute: number) => {
        if (!hoveredBestTime) return false;

        if (date !== hoveredBestTime.date) return false;

        const meetingDuration = (parseInt(filterDurationHours) || 0) * 60 + (parseInt(filterDurationMinutes) || 0);
        const slotsNeeded = Math.ceil(meetingDuration / 15);

        for (let i = 0; i < slotsNeeded; i++) {
            const slotMinute = hoveredBestTime.startMinute + (i * 15);
            const slotHour = hoveredBestTime.startHour + Math.floor(slotMinute / 60);
            const adjustedMinute = slotMinute % 60;

            if (hour === slotHour && minute === adjustedMinute) {
                return true;
            }
        }

        return false;
    };

    const isFirstCellInBestTime = (date: string, hour: number, minute: number) => {
        if (!hoveredBestTime) return false;
        return date === hoveredBestTime.date &&
            hour === hoveredBestTime.startHour &&
            minute === hoveredBestTime.startMinute;
    };

    const isLastCellInBestTime = (date: string, hour: number, minute: number) => {
        if (!hoveredBestTime) return false;

        const meetingDuration = (parseInt(filterDurationHours) || 0) * 60 + (parseInt(filterDurationMinutes) || 0);
        const slotsNeeded = Math.ceil(meetingDuration / 15);
        const lastSlotMinute = hoveredBestTime.startMinute + ((slotsNeeded - 1) * 15);
        const lastSlotHour = hoveredBestTime.startHour + Math.floor(lastSlotMinute / 60);
        const lastAdjustedMinute = lastSlotMinute % 60;

        return date === hoveredBestTime.date &&
            hour === lastSlotHour &&
            minute === lastAdjustedMinute;
    };

    const isMiddleCellInBestTime = (date: string, hour: number, minute: number) => {
        return isCellInBestTime(date, hour, minute) &&
            !isFirstCellInBestTime(date, hour, minute) &&
            !isLastCellInBestTime(date, hour, minute);
    };

    const getBestTimeUsersForCell = (date: string, hour: number, minute: number) => {
        if (!hoveredBestTime || !isCellInBestTime(date, hour, minute)) {
            return { available: [], ifNeeded: [], unavailable: [] };
        }

        const bestTime = bestTimes.find(
            t => t.date === hoveredBestTime.date &&
                t.startHour === hoveredBestTime.startHour &&
                t.startMinute === hoveredBestTime.startMinute
        );

        if (!bestTime) {
            return { available: [], ifNeeded: [], unavailable: [] };
        }

        const allUsers = new Set(users);
        const unavailableUsers = Array.from(allUsers).filter(
            user => !bestTime.availableUsers.includes(user) && !bestTime.ifNeededUsers.includes(user)
        );

        return {
            available: bestTime.availableUsers,
            ifNeeded: bestTime.ifNeededUsers,
            unavailable: unavailableUsers
        };
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const shareableLink = `${window.location.origin}?event=${event.id}`;

    // Generate options for hours (0-23)
    const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

    // Generate options for minutes (0, 15, 30, 45)
    const minuteOptions = ['00', '15', '30', '45'];

    if (isLoading) {
        return (
            <div className="event-view-container">
                <button onClick={onBack} className="btn-back mb-6">
                    ← Back to Home
                </button>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--gray-600)' }}>Loading event...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="event-view-container" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <button onClick={onBack} className="btn-back mb-6">
                ← Back to Home
            </button>

            <div className="event-view-layout">
                {/* Left Sidebar */}
                <div className="event-view-sidebar">
                    {/* Event Info Card */}
                    <div className="card">
                        <h2 className="event-view-title">{event.title}</h2>
                        {event.description && (
                            <p className="event-view-description">{event.description}</p>
                        )}

                        <div className="share-box">
                            <p className="share-box-label">Share this event:</p>
                            <div className="share-input-group">
                                <input
                                    type="text"
                                    value={shareableLink}
                                    readOnly
                                    className="input share-input"
                                />
                                <button
                                    onClick={() => navigator.clipboard.writeText(shareableLink)}
                                    className="btn-copy"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Warning if no name */}
                    {!userName && (
                        <div className="calendar-instructions" style={{
                            background: '#fef3c7',
                            borderColor: '#fbbf24',
                            color: '#92400e'
                        }}>
                            ⚠️ Please enter your name below to select your availability
                        </div>
                    )}

                    {/* User Input Card */}
                    <div className="card">
                        <label className="form-label">Your Name</label>
                        <div className="user-input-group">
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Enter your name"
                                className="input user-input-flex"
                                disabled={isSaving}
                            />
                            {hasExistingData && !isEditMode ? (
                                <button
                                    onClick={handleEditClick}
                                    className="btn btn-secondary btn-nowrap"
                                >
                                    Edit Availability
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    disabled={!userName || selectedCells.size === 0 || isSaving}
                                    className="btn btn-save btn-nowrap"
                                    style={{
                                        opacity: !userName || selectedCells.size === 0 || isSaving ? 0.5 : 1,
                                        cursor: !userName || selectedCells.size === 0 || isSaving ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isSaving ? 'Saving...' : isEditingExisting ? 'Update Availability' : 'Save Availability'}
                                </button>
                            )}
                        </div>

                        {userName && isEditMode && (
                            <div className="status-selector-container">
                                <label className="form-label">Select status to paint:</label>
                                <div className="status-selector-buttons">
                                    <button
                                        onClick={() => setCurrentStatus('available')}
                                        className={`status-btn status-btn-available ${currentStatus === 'available' ? 'status-btn-active' : ''}`}
                                    >
                                        <span className="status-emoji">🟢</span>
                                        Available
                                    </button>
                                    <button
                                        onClick={() => setCurrentStatus('if-needed')}
                                        className={`status-btn status-btn-if-needed ${currentStatus === 'if-needed' ? 'status-btn-active' : ''}`}
                                    >
                                        <span className="status-emoji">🟡</span>
                                        If Needed
                                    </button>
                                    <button
                                        onClick={() => setCurrentStatus('unavailable')}
                                        className={`status-btn status-btn-unavailable ${currentStatus === 'unavailable' ? 'status-btn-active' : ''}`}
                                    >
                                        <span className="status-emoji">⚫</span>
                                        Unavailable
                                    </button>
                                </div>
                            </div>
                        )}

                        {hasExistingData && !isEditMode && (
                            <p style={{
                                marginTop: '0.75rem',
                                fontSize: '0.875rem',
                                color: 'var(--green-500)',
                                fontWeight: '500'
                            }}>
                                ✓ Your availability is saved
                            </p>
                        )}
                        {isEditMode && isEditingExisting && (
                            <p style={{
                                marginTop: '0.75rem',
                                fontSize: '0.875rem',
                                color: 'var(--primary-blue)',
                                fontWeight: '500'
                            }}>
                                ✏️ Editing mode - select a status and click cells to update
                            </p>
                        )}
                    </div>

                    {/* Participants Card */}
                    {users.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                                Participants ({users.length})
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.75rem' }}>
                                Hover to highlight their availability
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {users.map(user => (
                                    <span
                                        key={user}
                                        className={`tag participant-tag ${hoveredUser === user ? 'participant-tag-active' : ''}`}
                                        onMouseEnter={() => setHoveredUser(user)}
                                        onMouseLeave={() => setHoveredUser(null)}
                                    >
                                        {user}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Best Meeting Times */}
                    {users.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
                                Find Best Meeting Time (Beta)
                            </h3>

                            {/* Start Date Filter */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Start Date (Optional)</label>
                                <select
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className="input select"
                                >
                                    <option value="">Any date</option>
                                    {dates.map(date => (
                                        <option key={date} value={date}>
                                            {formatDate(date)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Start Time Filter */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Start Time (Optional)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <select
                                        value={filterStartHour}
                                        onChange={(e) => setFilterStartHour(e.target.value)}
                                        className="input select"
                                    >
                                        <option value="">Hour</option>
                                        {hourOptions.map(hour => (
                                            <option key={hour} value={hour}>{hour}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filterStartMinute}
                                        onChange={(e) => setFilterStartMinute(e.target.value)}
                                        className="input select"
                                    >
                                        <option value="">Min</option>
                                        {minuteOptions.map(minute => (
                                            <option key={minute} value={minute}>{minute}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Meeting Duration Filter */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Meeting Duration</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <select
                                        value={filterDurationHours}
                                        onChange={(e) => setFilterDurationHours(e.target.value)}
                                        className="input select"
                                    >
                                        <option value="0">0 hours</option>
                                        {Array.from({ length: 24 }, (_, i) => i + 1).map(hour => (
                                            <option key={hour} value={hour.toString()}>
                                                {hour} {hour === 1 ? 'hour' : 'hours'}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={filterDurationMinutes}
                                        onChange={(e) => setFilterDurationMinutes(e.target.value)}
                                        className="input select"
                                    >
                                        {minuteOptions.map(minute => (
                                            <option key={minute} value={parseInt(minute).toString()}>
                                                {parseInt(minute)} min
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Active Filters Display */}
                            {(filterStartDate || (filterStartHour && filterStartMinute) || filterDurationHours !== '1' || filterDurationMinutes !== '0') && (
                                <div style={{
                                    marginBottom: '1rem',
                                    padding: '0.75rem',
                                    background: 'var(--gray-50)',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: 'var(--gray-700)'
                                }}>
                                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                        Search Filters:
                                    </div>
                                    {filterStartDate && (
                                        <div>📅 From: {formatDate(filterStartDate)}</div>
                                    )}
                                    {filterStartHour && filterStartMinute && (
                                        <div>🕐 At: {filterStartHour}:{filterStartMinute}</div>
                                    )}
                                    <div>⏱️ Duration: {filterDurationHours}h {filterDurationMinutes}m</div>
                                    <button
                                        onClick={() => {
                                            setFilterStartDate('');
                                            setFilterStartHour('');
                                            setFilterStartMinute('');
                                            setFilterDurationHours('1');
                                            setFilterDurationMinutes('0');
                                        }}
                                        style={{
                                            marginTop: '0.5rem',
                                            padding: '0.25rem 0.5rem',
                                            fontSize: '0.75rem',
                                            background: 'white',
                                            border: '1px solid var(--gray-300)',
                                            borderRadius: '0.25rem',
                                            cursor: 'pointer',
                                            color: 'var(--gray-600)'
                                        }}
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={findBestMeetingTimes}
                                className="btn btn-primary w-full"
                                style={{ marginBottom: '1rem' }}
                            >
                                🔍 Find Best Times
                            </button>

                            {bestTimes.length > 0 && (
                                <div className="best-times-list">
                                    <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--gray-700)' }}>
                                        Top {bestTimes.length} suggested times:
                                    </p>
                                    {bestTimes.map((time, index) => {
                                        const meetingDuration = (parseInt(filterDurationHours) || 0) * 60 + (parseInt(filterDurationMinutes) || 0);
                                        return (
                                            <div
                                                key={`${time.date}-${time.startHour}-${time.startMinute}`}
                                                className="best-time-item"
                                                onMouseEnter={() => setHoveredBestTime({
                                                    date: time.date,
                                                    startHour: time.startHour,
                                                    startMinute: time.startMinute
                                                })}
                                                onMouseLeave={() => setHoveredBestTime(null)}
                                            >
                                                <div className="best-time-header">
                                                    <span className="best-time-rank">#{index + 1}</span>
                                                    <div className="best-time-info">
                                                        <div className="best-time-date">
                                                            {formatDate(time.date)}
                                                        </div>
                                                        <div className="best-time-time">
                                                            {formatTimeRange(time.startHour, time.startMinute, meetingDuration)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="best-time-details">
                                                    {time.availableUsers.length > 0 && (
                                                        <div className="best-time-status">
                                                            <span className="status-emoji">🟢</span>
                                                            <span className="best-time-count">{time.availableUsers.length} available</span>
                                                        </div>
                                                    )}
                                                    {time.ifNeededUsers.length > 0 && (
                                                        <div className="best-time-status">
                                                            <span className="status-emoji">🟡</span>
                                                            <span className="best-time-count">{time.ifNeededUsers.length} if needed</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {bestTimes.length === 0 && users.length > 0 && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', textAlign: 'center', padding: '1rem' }}>
                                    Click "Find Best Times" to see suggested meeting times
                                </p>
                            )}
                        </div>
                    )}

                    {/* Instructions */}
                    {userName && !isSaving && isEditMode && !isEditingExisting && (
                        <div className="calendar-instructions">
                            💡 Select a status above, then click and drag to mark your availability. Hover over cells to see who's available.
                        </div>
                    )}

                    {userName && !isSaving && isEditMode && isEditingExisting && (
                        <div className="calendar-instructions" style={{
                            background: '#dbeafe',
                            borderColor: '#3b82f6',
                            color: '#1e40af'
                        }}>
                            ✏️ You're editing your previous selections. Choose a status and click cells to update, then click "Update Availability" to save.
                        </div>
                    )}

                    {userName && hasExistingData && !isEditMode && (
                        <div className="calendar-instructions" style={{
                            background: '#f0fdf4',
                            borderColor: '#86efac',
                            color: '#166534'
                        }}>
                            ✓ Your availability is displayed. Click "Edit Availability" to make changes.
                        </div>
                    )}
                </div>

                {/* Right Side - Calendar */}
                <div className="event-view-calendar-container">
                    <div className="calendar-week-container">
                        <div className="calendar-week-grid" style={{
                            gridTemplateColumns: `80px repeat(${dates.length}, 1fr)`
                        }}>
                            <div style={{ background: 'var(--gray-100)' }}></div>
                            {dates.map(date => (
                                <div key={date} className="calendar-day-header">
                                    {formatDate(date)}
                                </div>
                            ))}

                            {timeSlots.map(({ hour, minute }) => (
                                <React.Fragment key={`${hour}-${minute}`}>
                                    <div className="calendar-time-label">
                                        {minute === 0 ? `${hour.toString().padStart(2, '0')}:00` : ''}
                                    </div>
                                    {dates.map(date => {
                                        const cellId = getCellId(date, hour, minute);
                                        const cellStatus = selectedCells.get(cellId);
                                        const isValid = isValidCell(date, hour, minute);
                                        const usersInCell = getUsersForCell(date, hour, minute);

                                        const isHoveredUserCell = hoveredUser && isUserAvailableForCell(cellId, hoveredUser);
                                        const hoveredUserStatus = hoveredUser ? getUserStatusForCell(cellId, hoveredUser) : null;

                                        const isBestTimeCell = isCellInBestTime(date, hour, minute);
                                        const isFirstBestTimeCell = isFirstCellInBestTime(date, hour, minute);
                                        const isLastBestTimeCell = isLastCellInBestTime(date, hour, minute);
                                        const isMiddleBestTimeCell = isMiddleCellInBestTime(date, hour, minute);
                                        const bestTimeUsers = getBestTimeUsersForCell(date, hour, minute);

                                        const availableCount = usersInCell.filter(a => a.status === 'available').length;
                                        const ifNeededCount = usersInCell.filter(a => a.status === 'if-needed').length;
                                        const unavailableCount = usersInCell.filter(a => a.status === 'unavailable').length;

                                        const totalAvailable = isEditMode && cellStatus === 'available' ? availableCount + 1 : availableCount;
                                        const totalIfNeeded = isEditMode && cellStatus === 'if-needed' ? ifNeededCount + 1 : ifNeededCount;
                                        const totalUnavailable = isEditMode && cellStatus === 'unavailable' ? unavailableCount + 1 : unavailableCount;

                                        const isLocked = !userName || isSaving || !isEditMode;
                                        const isHovered = hoveredCell === cellId;
                                        const showTooltip = (isHovered && (usersInCell.length > 0 || cellStatus)) || isFirstBestTimeCell;

                                        let backgroundColor = 'white';
                                        let borderColor = 'var(--gray-200)';

                                        if (cellStatus) {
                                            if (isEditMode) {
                                                switch (cellStatus) {
                                                    case 'available':
                                                        backgroundColor = 'rgba(34, 197, 94, 0.4)';
                                                        borderColor = 'var(--green-500)';
                                                        break;
                                                    case 'if-needed':
                                                        backgroundColor = 'rgba(234, 179, 8, 0.4)';
                                                        borderColor = '#eab308';
                                                        break;
                                                    case 'unavailable':
                                                        backgroundColor = 'rgba(107, 114, 128, 0.4)';
                                                        borderColor = 'var(--gray-500)';
                                                        break;
                                                }
                                            } else {
                                                switch (cellStatus) {
                                                    case 'available':
                                                        backgroundColor = 'rgba(34, 197, 94, 0.3)';
                                                        borderColor = 'var(--green-500)';
                                                        break;
                                                    case 'if-needed':
                                                        backgroundColor = 'rgba(234, 179, 8, 0.3)';
                                                        borderColor = '#eab308';
                                                        break;
                                                    case 'unavailable':
                                                        backgroundColor = 'rgba(107, 114, 128, 0.3)';
                                                        borderColor = 'var(--gray-500)';
                                                        break;
                                                }
                                            }
                                        } else if (availableCount > 0 || ifNeededCount > 0 || unavailableCount > 0) {
                                            if (availableCount >= ifNeededCount && availableCount >= unavailableCount) {
                                                const intensity = Math.min(availableCount / (users.length || 1), 1);
                                                backgroundColor = `rgba(34, 197, 94, ${0.1 + intensity * 0.2})`;
                                            } else if (ifNeededCount > availableCount && ifNeededCount >= unavailableCount) {
                                                const intensity = Math.min(ifNeededCount / (users.length || 1), 1);
                                                backgroundColor = `rgba(234, 179, 8, ${0.1 + intensity * 0.2})`;
                                            } else if (unavailableCount > 0) {
                                                const intensity = Math.min(unavailableCount / (users.length || 1), 1);
                                                backgroundColor = `rgba(107, 114, 128, ${0.1 + intensity * 0.2})`;
                                            }
                                        }

                                        // Override styling if this is part of a hovered best time
                                        if (isBestTimeCell && !isHoveredUserCell) {
                                            backgroundColor = 'rgba(37, 99, 235, 0.2)';
                                        }

                                        // Custom border styling for best time range (vertical orientation)
                                        let customBorderStyle: React.CSSProperties = {};
                                        if (isBestTimeCell && !isHoveredUserCell) {
                                            if (isFirstBestTimeCell) {
                                                // Top cell: left, top, right borders
                                                customBorderStyle = {
                                                    borderLeft: '3px solid var(--primary-blue)',
                                                    borderTop: '3px solid var(--primary-blue)',
                                                    borderRight: '3px solid var(--primary-blue)',
                                                    borderBottom: '1px solid rgba(37, 99, 235, 0.3)',
                                                };
                                            } else if (isLastBestTimeCell) {
                                                // Bottom cell: left, bottom, right borders
                                                customBorderStyle = {
                                                    borderLeft: '3px solid var(--primary-blue)',
                                                    borderBottom: '3px solid var(--primary-blue)',
                                                    borderRight: '3px solid var(--primary-blue)',
                                                    borderTop: '1px solid rgba(37, 99, 235, 0.3)',
                                                };
                                            } else if (isMiddleBestTimeCell) {
                                                // Middle cells: left and right borders only
                                                customBorderStyle = {
                                                    borderLeft: '3px solid var(--primary-blue)',
                                                    borderRight: '3px solid var(--primary-blue)',
                                                    borderTop: '1px solid rgba(37, 99, 235, 0.3)',
                                                    borderBottom: '1px solid rgba(37, 99, 235, 0.3)',
                                                };
                                            }
                                        }

                                        return (
                                            <div
                                                key={cellId}
                                                onMouseDown={() => !isLocked && handleMouseDown(date, hour, minute)}
                                                onMouseEnter={() => {
                                                    if (!isLocked) {
                                                        handleMouseEnter(date, hour, minute);
                                                    }
                                                    if (!isBestTimeCell) {
                                                        handleCellHover(date, hour, minute);
                                                    }
                                                }}
                                                onMouseLeave={handleCellLeave}
                                                className={`calendar-cell ${!isValid || isLocked ? 'calendar-cell-unavailable' : ''} ${isHoveredUserCell ? `calendar-cell-user-highlighted status-${hoveredUserStatus}` : ''} ${isBestTimeCell ? 'calendar-cell-best-time' : ''}`}
                                                style={{
                                                    backgroundColor: !isHoveredUserCell ? backgroundColor : undefined,
                                                    ...(isBestTimeCell && !isHoveredUserCell ? customBorderStyle : {
                                                        border: !isHoveredUserCell ? (cellStatus ? `2px solid ${borderColor}` : '1px solid var(--gray-200)') : undefined,
                                                    }),
                                                    cursor: isLocked ? 'not-allowed' : (isValid ? 'pointer' : 'not-allowed'),
                                                    opacity: isLocked && !cellStatus ? 0.6 : 1
                                                }}
                                            >
                                                {(totalAvailable > 0 || totalIfNeeded > 0 || totalUnavailable > 0) && (
                                                    <div className="calendar-cell-counts">
                                                        {totalAvailable > 0 && (
                                                            <span className="count-available">{totalAvailable}</span>
                                                        )}
                                                        {totalIfNeeded > 0 && (
                                                            <span className="count-if-needed">{totalIfNeeded}</span>
                                                        )}
                                                        {totalUnavailable > 0 && (
                                                            <span className="count-unavailable">{totalUnavailable}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {showTooltip && (
                                                    <div className={`calendar-cell-tooltip ${showTooltip ? 'visible' : ''}`}>
                                                        <div className="tooltip-users">
                                                            {/* Available Section */}
                                                            {(cellStatus === 'available' || usersInCell.some(a => a.status === 'available')) && (
                                                                <div className="tooltip-section">
                                                                    <div className="tooltip-section-header">
                                                                        <span className="status-emoji">🟢</span>
                                                                        <span className="tooltip-section-title">Available</span>
                                                                    </div>
                                                                    <div className="tooltip-user-list">
                                                                        {cellStatus === 'available' && (
                                                                            <div className="tooltip-user">
                                                                                <div className="tooltip-user-dot"></div>
                                                                                <span className="tooltip-username">
                                                                                    You{hasExistingData && !isEditMode ? '' : isEditMode ? ' (editing)' : ' (not saved)'}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {usersInCell
                                                                            .filter(a => a.status === 'available')
                                                                            .map(avail => (
                                                                                <div key={avail.userName} className="tooltip-user">
                                                                                    <div className="tooltip-user-dot"></div>
                                                                                    <span className="tooltip-username">
                                                                                        {avail.userName}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* If Needed Section */}
                                                            {(cellStatus === 'if-needed' || usersInCell.some(a => a.status === 'if-needed')) && (
                                                                <div className="tooltip-section">
                                                                    <div className="tooltip-section-header">
                                                                        <span className="status-emoji">🟡</span>
                                                                        <span className="tooltip-section-title">If Needed</span>
                                                                    </div>
                                                                    <div className="tooltip-user-list">
                                                                        {cellStatus === 'if-needed' && (
                                                                            <div className="tooltip-user">
                                                                                <div className="tooltip-user-dot"></div>
                                                                                <span className="tooltip-username">
                                                                                    You{hasExistingData && !isEditMode ? '' : isEditMode ? ' (editing)' : ' (not saved)'}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {usersInCell
                                                                            .filter(a => a.status === 'if-needed')
                                                                            .map(avail => (
                                                                                <div key={avail.userName} className="tooltip-user">
                                                                                    <div className="tooltip-user-dot"></div>
                                                                                    <span className="tooltip-username">
                                                                                        {avail.userName}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Unavailable Section */}
                                                            {(cellStatus === 'unavailable' || usersInCell.some(a => a.status === 'unavailable')) && (
                                                                <div className="tooltip-section">
                                                                    <div className="tooltip-section-header">
                                                                        <span className="status-emoji">⚫</span>
                                                                        <span className="tooltip-section-title">Unavailable</span>
                                                                    </div>
                                                                    <div className="tooltip-user-list">
                                                                        {cellStatus === 'unavailable' && (
                                                                            <div className="tooltip-user">
                                                                                <div className="tooltip-user-dot"></div>
                                                                                <span className="tooltip-username">
                                                                                    You{hasExistingData && !isEditMode ? '' : isEditMode ? ' (editing)' : ' (not saved)'}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {usersInCell
                                                                            .filter(a => a.status === 'unavailable')
                                                                            .map(avail => (
                                                                                <div key={avail.userName} className="tooltip-user">
                                                                                    <div className="tooltip-user-dot"></div>
                                                                                    <span className="tooltip-username">
                                                                                        {avail.userName}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EventView;