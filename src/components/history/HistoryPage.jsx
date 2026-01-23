import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, Filter, X, Menu, ChevronDown, Search, AlertCircle } from 'lucide-react';
import { getMuscleGroup } from '../../constants';

const HistoryPage = ({ sessions, weeklyPlan }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
    const [filterExercise, setFilterExercise] = useState('all');
    const [filterMuscle, setFilterMuscle] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const weeksPerPage = 4;

    // Calculate all weeks from sessions (including missed ones)
    const allWeeks = useMemo(() => {
        // 1. Determine Date Range
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let startDate = new Date();
        if (sessions.length > 0) {
            // Start from earliest session
            const earliest = new Date(Math.min(...sessions.map(s => new Date(s.date).getTime())));
            startDate = earliest;
        } else {
            // Default to 4 weeks ago if no sessions
            startDate.setDate(now.getDate() - 28);
        }
        startDate.setHours(0, 0, 0, 0);

        // 2. Generate Full List of Days (Recorded OR Missed)
        const combinedSessions = [];
        const tempDate = new Date(startDate);

        // Helper to get local YYYY-MM-DD strings
        const getLocalDateStr = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Iterate from start date until today
        while (tempDate <= now) {
            const dateStr = getLocalDateStr(tempDate);
            const foundSession = sessions.find(s => getLocalDateStr(s.date) === dateStr);

            // Only consider the session "found" if it actually has exercises.
            // If it's empty, we treat it as if it doesn't exist so we can show the "Missed Plan" instead.
            if (foundSession && foundSession.exercises && foundSession.exercises.length > 0) {
                combinedSessions.push(foundSession);
            } else if (weeklyPlan) {
                // Check if we missed a planned workout
                const dayName = tempDate.toLocaleDateString('en-US', { weekday: 'long' });
                const plan = weeklyPlan[dayName];

                if (plan && !plan.isRestDay && plan.exercises && plan.exercises.length > 0) {
                    const isToday = dateStr === getLocalDateStr(now);

                    // Create a "Missed" session (or Pending if it's today)
                    combinedSessions.push({
                        id: `missed-${dateStr}`,
                        date: new Date(tempDate).toISOString(),
                        isMissed: !isToday,
                        isPending: isToday,
                        title: plan.title || 'Missed Workout',
                        exercises: plan.exercises.map(ex => ({
                            name: ex.name,
                            sets: ex.sets,
                            reps: ex.reps,
                            weight: ex.weight || 0,
                            completed: false, // Explicitly failed
                            muscleGroup: ex.muscleGroup
                        }))
                    });
                }
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }

        // 3. Reverse to show newest first for processing
        combinedSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (combinedSessions.length === 0) return [];

        // 4. Group sessions by week
        const weekMap = new Map();

        combinedSessions.forEach(session => {
            const sessionDate = new Date(session.date);
            const weekStart = new Date(sessionDate);
            const day = weekStart.getDay();
            const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
            weekStart.setDate(diff);
            weekStart.setHours(0, 0, 0, 0);

            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, {
                    startDate: weekStart,
                    exercises: [],
                    totalExercises: 0,
                    completedExercises: 0,
                    sessions: []
                });
            }

            const week = weekMap.get(weekKey);
            week.sessions.push(session); // Keep track of raw sessions too

            // Aggregate exercise data
            if (session.exercises) {
                session.exercises.forEach(exercise => {
                    const normalizedName = exercise.name.trim();

                    // Only count towards consistency if not a pending session (today's incomplete workout)
                    if (!session.isPending) {
                        week.totalExercises += 1;
                        
                        // For recorded sessions (not missed), count as completed
                        // For missed sessions, only count if explicitly marked completed (which won't happen)
                        if (!session.isMissed) {
                            // User logged this workout, so count exercises as completed
                            // Either they have completed:true OR it's a recorded session
                            week.completedExercises += (exercise.completed !== false) ? 1 : 0;
                        }
                    }

                    const existingExercise = week.exercises.find(ex => ex.name === normalizedName);
                    
                    // Determine if this exercise counts as completed
                    const isCompleted = !session.isMissed && !session.isPending && (exercise.completed !== false);
                    
                    if (existingExercise) {
                        if (!session.isMissed && !session.isPending) {
                            existingExercise.completedReps += exercise.reps || 0;
                            existingExercise.completedSets += exercise.sets || 0;
                            existingExercise.timesCompleted += isCompleted ? 1 : 0;
                        }
                        if (!session.isPending) {
                            existingExercise.count += 1;
                            existingExercise.missedCount += (session.isMissed ? 1 : 0);
                        }
                    } else {
                        week.exercises.push({
                            name: normalizedName,
                            plannedSets: exercise.sets || 0,
                            plannedReps: exercise.reps || 0,
                            completedSets: (!session.isMissed && !session.isPending) ? (exercise.sets || 0) : 0,
                            completedReps: (!session.isMissed && !session.isPending) ? (exercise.reps || 0) : 0,
                            timesCompleted: isCompleted ? 1 : 0,
                            count: session.isPending ? 0 : 1,
                            missedCount: session.isMissed ? 1 : 0
                        });
                    }
                });
            }
        });

        const weeksArray = Array.from(weekMap.values());
        weeksArray.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

        return weeksArray.map((week, index) => {
            const consistencyScore = week.totalExercises > 0
                ? Math.round((week.completedExercises / week.totalExercises) * 100)
                : 0;
            return {
                ...week,
                weekNumber: weeksArray.length - index,
                consistencyScore: isNaN(consistencyScore) ? 0 : consistencyScore,
                // Add a "Missed Sessions" count for UI if needed
                missedSessionsCount: week.sessions.filter(s => s.isMissed).length
            };
        });
    }, [sessions, weeklyPlan]);

    // Get all unique exercises for filter (filtered by muscle)
    const allExercises = useMemo(() => {
        const exerciseSet = new Set();
        allWeeks.forEach(week => {
            week.exercises.forEach(ex => {
                // Filter by muscle first if selected
                if (filterMuscle === 'all' || getMuscleGroup(ex.name) === filterMuscle) {
                    exerciseSet.add(ex.name);
                }
            });
        });
        return Array.from(exerciseSet).sort();
    }, [allWeeks, filterMuscle]);

    // Filter exercises in selected week
    const selectedWeek = useMemo(() => {
        const index = Math.min(selectedWeekIndex, allWeeks.length - 1);
        const week = allWeeks[index] || null;

        if (!week) return null;

        let filteredExercises = week.exercises;

        // 1. Muscle Filter
        if (filterMuscle !== 'all') {
            filteredExercises = filteredExercises.filter(ex => getMuscleGroup(ex.name) === filterMuscle);
        }

        // 2. Exercise Filter
        if (filterExercise !== 'all') {
            filteredExercises = filteredExercises.filter(ex => ex.name === filterExercise);
        }

        // 3. Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredExercises = filteredExercises.filter(ex => ex.name.toLowerCase().includes(query));
        }

        return {
            ...week,
            exercises: filteredExercises
        };
    }, [allWeeks, selectedWeekIndex, filterExercise, filterMuscle, searchQuery]);

    const paginatedWeeks = useMemo(() => {
        return allWeeks.slice(
            currentPage * weeksPerPage,
            (currentPage + 1) * weeksPerPage
        );
    }, [allWeeks, currentPage]);

    const totalPages = Math.ceil(allWeeks.length / weeksPerPage);

    if (allWeeks.length === 0) {
        return (
            <div className="p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div>
                    <h1 className="text-3xl font-bold">Workout History</h1>
                    <p className="text-[var(--text-secondary)]">Track all your training sessions and progress</p>
                </div>
                <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-8 text-center subtle-depth">
                    <TrendingUp size={40} className="text-[var(--text-secondary)] mx-auto mb-4 opacity-40" />
                    <p className="text-[var(--text-secondary)]">No workout history yet. Start training to see your progress!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold">Workout History</h1>
                <p className="text-[var(--text-secondary)]">Track all your training sessions and progress</p>
            </div>

            {/* Search & Muscle Filters */}
            <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg py-3 pl-10 pr-4 text-white placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-all"
                    />
                </div>

                {/* Muscle Group Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {['all', 'Shoulder', 'Chest', 'Back', 'Legs', 'Bicep', 'Tricep', 'Core'].map(muscle => (
                        <button
                            key={muscle}
                            onClick={() => {
                                setFilterMuscle(muscle);
                                setFilterExercise('all'); // Reset specific exercise when changing muscle group
                            }}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${filterMuscle === muscle
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]'
                                }`}
                        >
                            {muscle === 'all' ? 'All Muscles' : muscle}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile Filter Section */}
            <div className="md:hidden space-y-3 relative z-30">
                <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="flex items-center justify-between w-full text-left bg-[var(--bg-secondary)] p-3 rounded-lg organic-border"
                >
                    <span className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        Filter Exercise {filterExercise !== 'all' && `• ${filterExercise}`}
                    </span>
                    <ChevronDown size={20} className={`text-[var(--text-secondary)] transition-transform duration-300 ${showFilterMenu ? 'rotate-180' : ''}`} />
                </button>

                {showFilterMenu && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-secondary)] organic-shape organic-border p-3 subtle-depth shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => {
                                    setFilterExercise('all');
                                    setShowFilterMenu(false);
                                }}
                                className={`block w-full text-left px-3 py-2 rounded transition-organic ${filterExercise === 'all'
                                    ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/80'
                                    }`}
                            >
                                All Exercises
                            </button>
                            {allExercises.map(exercise => (
                                <button
                                    key={exercise}
                                    onClick={() => {
                                        setFilterExercise(exercise);
                                        setShowFilterMenu(false);
                                    }}
                                    className={`block w-full text-left px-3 py-2 rounded transition-organic mt-1 ${filterExercise === exercise
                                        ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/80'
                                        }`}
                                >
                                    {exercise}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Week Selector */}
            <div className="md:hidden mb-4">
                <h3 className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-2">Select Week</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {paginatedWeeks.map((week, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedWeekIndex(currentPage * weeksPerPage + idx)}
                            className={`flex flex-col items-center justify-center min-w-[100px] p-3 rounded-lg border transition-all ${selectedWeekIndex === currentPage * weeksPerPage + idx
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)] shadow-lg'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)]'
                                }`}
                        >
                            <span className="text-sm font-bold whitespace-nowrap">Week {week.weekNumber}</span>
                            <span className="text-[10px] opacity-80 whitespace-nowrap">
                                {week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop Filter Section */}
            <div className="hidden md:block relative">
                <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] organic-shape organic-border text-[var(--text-secondary)] hover:text-[var(--accent)] transition-organic"
                >
                    <Filter size={18} />
                    <span className="text-sm font-medium">
                        {filterExercise === 'all' ? 'All Exercises' : filterExercise}
                    </span>
                </button>

                {showFilterMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-[var(--bg-secondary)] organic-shape organic-border p-3 subtle-depth z-50 min-w-[200px]">
                        <button
                            onClick={() => {
                                setFilterExercise('all');
                                setShowFilterMenu(false);
                            }}
                            className={`block w-full text-left px-3 py-2 rounded mb-2 transition-organic ${filterExercise === 'all'
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                                }`}
                        >
                            All Exercises
                        </button>
                        {allExercises.map(exercise => (
                            <button
                                key={exercise}
                                onClick={() => {
                                    setFilterExercise(exercise);
                                    setShowFilterMenu(false);
                                }}
                                className={`block w-full text-left px-3 py-2 rounded mb-2 transition-organic ${filterExercise === exercise
                                    ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                                    }`}
                            >
                                {exercise}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop Week Selector - Hidden on Mobile */}
            <div className="hidden md:block bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth">
                <h3 className="text-white text-lg font-semibold mb-4 uppercase tracking-wide">Select Week</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {paginatedWeeks.map((week, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedWeekIndex(currentPage * weeksPerPage + idx)}
                            className={`p-3 rounded-lg transition-all text-sm font-medium ${selectedWeekIndex === currentPage * weeksPerPage + idx
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg'
                                : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/80'
                                }`}
                        >
                            <div className="font-bold">Week {week.weekNumber}</div>
                            <div className="text-xs opacity-75">
                                {week.startDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </div>
                        </button>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                        <button
                            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            className="p-2 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-primary)]/80 transition-organic"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-[var(--text-secondary)] text-sm">
                            Page {currentPage + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                            disabled={currentPage === totalPages - 1}
                            className="p-2 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-primary)]/80 transition-organic"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Week Statistics */}
            {selectedWeek && (
                <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth space-y-4">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-white text-lg font-semibold uppercase tracking-wide">
                                Week {selectedWeek.weekNumber}
                            </h4>
                            <p className="text-[var(--text-secondary)] text-sm">
                                {selectedWeek.startDate.toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold text-[var(--accent)]">
                                {selectedWeek.consistencyScore}%
                            </div>
                            <div className="text-[var(--text-secondary)] text-sm">Consistency</div>
                            {selectedWeek.missedSessionsCount > 0 && (
                                <div className="text-rose-500 text-xs font-bold mt-1">
                                    {selectedWeek.missedSessionsCount} Missed Workout{selectedWeek.missedSessionsCount !== 1 ? 's' : ''}
                                </div>
                            )}

                            {/* Detailed List of Missed Workouts */}
                            {selectedWeek.sessions.filter(s => s.isMissed).length > 0 && (
                                <div className="mt-2 flex flex-col items-end gap-1">
                                    {selectedWeek.sessions.filter(s => s.isMissed).map((session, i) => (
                                        <div key={i} className="flex items-center gap-1.5 bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md text-[10px] font-medium border border-rose-500/20">
                                            <AlertCircle size={10} />
                                            <span>
                                                {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short' })}: {session.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Exercise Details */}
                    <div className="space-y-3">
                        <h5 className="text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-widest">
                            Exercise Breakdown {filterExercise !== 'all' && `- ${filterExercise}`}
                        </h5>
                        {selectedWeek.exercises.length > 0 ? (
                            selectedWeek.exercises.map((exercise, idx) => {
                                const completionRate = Math.round(
                                    (exercise.timesCompleted / exercise.count) * 100
                                );
                                return (
                                    <div key={idx} className="bg-[var(--bg-primary)] rounded-lg p-4 border border-[var(--border)]">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-white font-medium">{exercise.name}</span>
                                            <span className="text-[var(--accent)] font-semibold text-sm">
                                                {isNaN(completionRate) ? 0 : completionRate}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 mb-4">
                                            <div
                                                className="bg-[var(--accent)] h-2 rounded-full transition-all"
                                                style={{ width: `${isNaN(completionRate) ? 0 : completionRate}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="bg-[var(--bg-secondary)] rounded p-3">
                                                <div className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wide">Sets Avg</div>
                                                <div className="font-semibold text-white text-lg">
                                                    {Math.round(exercise.completedSets / exercise.count)}
                                                </div>
                                            </div>
                                            <div className="bg-[var(--bg-secondary)] rounded p-3">
                                                <div className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wide">Reps Avg</div>
                                                <div className="font-semibold text-white text-lg">
                                                    {Math.round(exercise.completedReps / exercise.count)}
                                                </div>
                                            </div>
                                            <div className="bg-[var(--bg-secondary)] rounded p-3">
                                                <div className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wide">Times Done</div>
                                                <div className="font-semibold text-white text-lg">
                                                    {exercise.timesCompleted}/{exercise.count}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-[var(--text-secondary)] text-sm text-center py-4">
                                No exercises recorded for this filter
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;

