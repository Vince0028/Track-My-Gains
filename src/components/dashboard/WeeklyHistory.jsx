import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { isDurationExercise } from '../../constants';

const WeeklyHistory = ({ sessions }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
    const weeksPerPage = 4;

    // Calculate all weeks from sessions
    const allWeeks = useMemo(() => {
        if (sessions.length === 0) return [];

        // Group sessions by week
        const weekMap = new Map();

        sessions.forEach(session => {
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
                    completedExercises: 0
                });
            }

            const week = weekMap.get(weekKey);

            // Aggregate exercise data - count each exercise
            if (session.exercises) {
                session.exercises.forEach(exercise => {
                    week.totalExercises += 1;
                    if (exercise.completed) {
                        week.completedExercises += 1;
                    }

                    const existingExercise = week.exercises.find(ex => ex.name === exercise.name);
                    if (existingExercise) {
                        existingExercise.completedReps += exercise.reps || 0;
                        existingExercise.completedSets += exercise.sets || 0;
                        existingExercise.count += 1;
                        if (exercise.completed) existingExercise.timesCompleted += 1;
                    } else {
                        week.exercises.push({
                            name: exercise.name,
                            plannedSets: exercise.sets || 0,
                            plannedReps: exercise.reps || 0,
                            completedSets: exercise.sets || 0,
                            completedReps: exercise.reps || 0,
                            timesCompleted: exercise.completed ? 1 : 0,
                            count: 1
                        });
                    }
                });
            }
        });

        // Sort weeks by start date (most recent first)
        const weeksArray = Array.from(weekMap.values());
        weeksArray.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

        // Calculate week numbers and consistency scores based on completed exercises
        return weeksArray.map((week, index) => {
            const consistencyScore = week.totalExercises > 0
                ? Math.round((week.completedExercises / week.totalExercises) * 100)
                : 0;
            return {
                ...week,
                weekNumber: weeksArray.length - index,
                consistencyScore: isNaN(consistencyScore) ? 0 : consistencyScore
            };
        });
    }, [sessions]);

    const paginatedWeeks = useMemo(() => {
        return allWeeks.slice(
            currentPage * weeksPerPage,
            (currentPage + 1) * weeksPerPage
        );
    }, [allWeeks, currentPage]);

    const selectedWeek = useMemo(() => {
        const index = Math.min(selectedWeekIndex, allWeeks.length - 1);
        return allWeeks[index] || null;
    }, [allWeeks, selectedWeekIndex]);

    const totalPages = Math.ceil(allWeeks.length / weeksPerPage);

    if (allWeeks.length === 0) {
        return (
            <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-8 text-center subtle-depth">
                <TrendingUp size={40} className="text-[var(--text-secondary)] mx-auto mb-4 opacity-40" />
                <p className="text-[var(--text-secondary)]">No weekly data yet. Complete a workout to see your history!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Week Selector */}
            <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth">
                <h3 className="text-white text-lg font-semibold mb-4 uppercase tracking-wide">Your Weeks</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {paginatedWeeks.map((week, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedWeekIndex(currentPage * weeksPerPage + idx)}
                            className={`p-3 rounded-lg transition-all text-sm font-medium ${
                                selectedWeekIndex === currentPage * weeksPerPage + idx
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

                {/* Pagination Controls */}
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
                        </div>
                    </div>

                    {/* Exercise Details */}
                    <div className="space-y-3">
                        <h5 className="text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-widest">
                            Exercise Breakdown
                        </h5>
                        {selectedWeek.exercises.length > 0 ? (
                            selectedWeek.exercises.map((exercise, idx) => {
                                const completionRate = Math.round(
                                    (exercise.timesCompleted / exercise.count) * 100
                                );
                                const metricLabel = isDurationExercise(exercise.name) ? 'Minutes Done' : 'Reps Done';
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
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[var(--bg-secondary)] rounded p-3 text-center">
                                                <div className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wide">Sets Done</div>
                                                <div className="font-semibold text-white text-lg">
                                                    {Math.round(exercise.completedSets / exercise.count)}
                                                </div>
                                                <div className="text-[var(--text-secondary)] text-xs">
                                                    × {exercise.count} times
                                                </div>
                                            </div>
                                            <div className="bg-[var(--bg-secondary)] rounded p-3 text-center">
                                                <div className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wide">{metricLabel}</div>
                                                <div className="font-semibold text-white text-lg">
                                                    {Math.round(exercise.completedReps / exercise.count)}
                                                </div>
                                                <div className="text-[var(--text-secondary)] text-xs">
                                                    per set avg
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-[var(--text-secondary)] text-sm text-center py-4">
                                No exercises recorded this week
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeklyHistory;

