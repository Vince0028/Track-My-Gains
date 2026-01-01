import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Check, CircleDashed, X, Loader2 } from 'lucide-react';
import { MUSCLE_ICONS } from '../../constants';

const CalendarView = ({ sessions, onDeleteSession, weeklyPlan, onMarkComplete, units }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewModal, setViewModal] = useState(null);
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        // Convert to Mon=0, Sun=6
        return day === 0 ? 6 : day - 1;
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Create array with empty slots for padding
    const calendarGrid = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];

    const getSessionsForDay = (day) => {
        return sessions.filter(s => {
            const d = new Date(s.date);
            return d.getDate() === day &&
                d.getMonth() === currentDate.getMonth() &&
                d.getFullYear() === currentDate.getFullYear();
        });
    };

    const getScheduledForDay = (day) => {
        if (!weeklyPlan) return null;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const plan = weeklyPlan[dayName];

        // Return if has exercises OR is explicitly a rest day
        if (plan && (plan.exercises.length > 0 || plan.isRestDay)) {
            return { ...plan, dayName };
        }
        return null;
    };

    const getDayStyle = (day, hasSession, scheduled, isToday) => {
        let base = "bg-[var(--bg-primary)] border-[var(--border)]";

        if (hasSession) {
            const session = getSessionsForDay(day)[0];
            const allCompleted = session.exercises && session.exercises.every(e => e.completed);

            if (allCompleted) {
                return "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]";
            } else {
                if (isToday) {
                    // Today: Amber/Loading
                    return "bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_15px_-3px_rgba(234,179,8,0.2)]";
                } else {
                    // Past: Light Green (Slightly different to show it's done-ish but not perfect)
                    return "bg-emerald-500/5 border-emerald-500/20 opacity-80";
                }
            }
        }

        if (isToday) {
            return "bg-[var(--accent)]/5 border-[var(--accent)] ring-1 ring-[var(--accent)]";
        }

        if (scheduled) {
            // Handle Rest Day Style
            if (scheduled.isRestDay) {
                return "bg-blue-500/5 border-blue-500/20 opacity-60";
            }
            return "bg-[var(--bg-primary)] border-[var(--border)] border-dashed opacity-80 hover:opacity-100";
        }

        return base + " opacity-50";
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold">Training History</h1>
                <p className="text-[var(--text-secondary)]">Track your consistency over time</p>
            </div>

            <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-4 sm:p-8 subtle-depth overflow-hidden">
                <div className="flex items-center justify-between mb-8 px-2 max-w-3xl mx-auto">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-[var(--bg-primary)] organic-shape transition-organic border border-transparent hover:border-[var(--border)]"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-2xl font-bold tracking-tight min-w-[200px] text-center">
                        {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-[var(--bg-primary)] organic-shape transition-organic border border-transparent hover:border-[var(--border)]"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[700px] max-w-5xl mx-auto">
                        <div className="grid grid-cols-7 gap-3 mb-4">
                            {weekDays.map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest py-2">
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-3">
                            {calendarGrid.map((day, index) => {
                                if (!day) return <div key={`empty-${index}`} className="min-h-[120px]" />;

                                const daySessions = getSessionsForDay(day);
                                const scheduled = getScheduledForDay(day);

                                const isToday = day === new Date().getDate() &&
                                    currentDate.getMonth() === new Date().getMonth() &&
                                    currentDate.getFullYear() === new Date().getFullYear();
                                const hasSession = daySessions.length > 0;
                                const session = hasSession ? daySessions[0] : null;

                                // Determine muscle groups for icons
                                const workoutData = session || scheduled;
                                const uniqueMuscles = workoutData && workoutData.exercises ? [...new Set(workoutData.exercises.map(ex => ex.muscleGroup))].slice(0, 3) : [];

                                const cellStyle = getDayStyle(day, hasSession, scheduled, isToday);

                                // Logic for icons/badging
                                const allCompleted = session && session.exercises.every(e => e.completed);
                                const isAmber = hasSession && !allCompleted && isToday;
                                const isGreen = hasSession && (allCompleted || !isToday);

                                // Colors based on state
                                const textColor = isAmber ? 'text-yellow-400' : (hasSession ? 'text-emerald-400' : (isToday ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'));
                                const badgeColor = isAmber ? 'bg-yellow-500/20 text-yellow-500' : (hasSession ? 'bg-emerald-500/20 text-emerald-500' : '');
                                const badgeIcon = isAmber ? <Loader2 size={10} strokeWidth={4} className="animate-spin" /> : <Check size={10} strokeWidth={4} />;

                                // Special case: Fully completed gets solid green badge
                                const finalBadgeColor = (hasSession && allCompleted) ? 'bg-emerald-500 text-white' : badgeColor;

                                // Muscle Icon Colors
                                const muscleIconColor = isAmber ? 'text-yellow-300 bg-yellow-950/30' : (hasSession ? 'text-emerald-300 bg-emerald-950/30' : 'bg-[var(--bg-primary)] border border-[var(--border)]');

                                return (
                                    <div
                                        key={day}
                                        onClick={() => {
                                            if (workoutData) {
                                                setViewModal({
                                                    day,
                                                    data: workoutData || { title: 'Rest Day' },
                                                    isSession: hasSession,
                                                    dayName: new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-US', { weekday: 'long' })
                                                })
                                            }
                                        }}
                                        className={`min-h-[120px] p-3 organic-shape border transition-all duration-300 group relative flex flex-col justify-between cursor-pointer hover:translate-y-[-2px] hover:shadow-lg ${cellStyle}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-lg font-bold ${textColor}`}>
                                                {day}
                                            </span>
                                            {hasSession && (
                                                <div className={`p-1 rounded-full ${finalBadgeColor}`}>
                                                    {badgeIcon}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 mt-2">
                                            {/* Workout Title */}
                                            {workoutData && !workoutData.isRestDay && (
                                                <div className="text-[9px] font-bold uppercase truncate opacity-80 pl-1 border-l-2 border-current">
                                                    {workoutData.title}
                                                </div>
                                            )}

                                            {workoutData && workoutData.isRestDay && (
                                                <div className="flex items-center gap-1 text-[var(--text-secondary)] opacity-70">
                                                    <span className="text-lg">☕</span>
                                                    <div className="text-[9px] font-bold uppercase tracking-wider">Rest</div>
                                                </div>
                                            )}

                                            {/* Muscle Icons Row */}
                                            {uniqueMuscles.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {uniqueMuscles.map(m => (
                                                        <div key={m} className={`w-6 h-6 rounded-md flex items-center justify-center ${muscleIconColor}`} title={m}>
                                                            {React.cloneElement(MUSCLE_ICONS[m], { size: 14 })}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {hasSession && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteSession(session.id);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg z-10"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}

                                        {!hasSession && scheduled && isToday && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                                    onMarkComplete(date, scheduled);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-[var(--accent)] text-[var(--bg-primary)] rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg z-10"
                                                title="Mark as Done"
                                            >
                                                <Check size={12} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Day Details Modal */}
            {viewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth p-6 max-w-md w-full space-y-6 shadow-2xl relative">
                        <button
                            onClick={() => setViewModal(null)}
                            className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div>
                            <div className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-1">
                                {viewModal.dayName || new Date(currentDate.getFullYear(), currentDate.getMonth(), viewModal.day).toLocaleDateString('en-US', { weekday: 'long' })}
                            </div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-bold">{viewModal.data?.title || 'Daily Summary'}</h3>
                            </div>


                            {/* Session Status Badge */}
                            {viewModal.data && viewModal.data.exercises && (
                                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-1">
                                    {viewModal.isSession && viewModal.data.exercises.every(e => e.completed) ? (
                                        <>
                                            <Check size={14} className="text-emerald-500" />
                                            <span className="text-emerald-500 font-bold">Completed Session</span>
                                        </>
                                    ) : (viewModal.isSession && (viewModal.day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth())) ? (
                                        <>
                                            <Loader2 size={14} className="text-yellow-500 animate-spin" />
                                            <span className="text-yellow-500 font-bold">In Progress</span>
                                        </>
                                    ) : viewModal.isSession ? (
                                        <>
                                            <Check size={14} className="text-emerald-500/50" />
                                            <span className="text-emerald-500/70 font-bold">Session Recorded</span>
                                        </>
                                    ) : (
                                        <>
                                            <CircleDashed size={14} />
                                            <span>Scheduled Plan</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Exercises List */}
                        {viewModal.data && viewModal.data.exercises && (
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {viewModal.data.exercises.map((ex, i) => (
                                    <div key={i} className={`flex items-center gap-4 p-3 organic-shape border ${viewModal.isSession && ex.completed ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--bg-primary)] border-[var(--border)]'}`}>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center p-1.5 ${viewModal.isSession ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                                            {MUSCLE_ICONS[ex.muscleGroup]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-sm flex items-center gap-2">
                                                {ex.name}
                                                {viewModal.isSession && ex.completed && <Check size={12} className="text-emerald-500" />}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)] flex gap-3 mt-0.5">
                                                <span className="font-medium bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border)]">
                                                    {ex.sets} SETS
                                                </span>
                                                <span className="font-medium bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border)]">
                                                    {ex.reps} REPS
                                                </span>
                                                <span className="font-medium bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border)] text-[var(--accent)]">
                                                    {ex.weight} {units}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
