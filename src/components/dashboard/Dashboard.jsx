
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, Flame, Target, CalendarDays, CheckCircle2, Circle, Edit3, Trash2, X, ChevronDown, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MUSCLE_ICONS } from '../../constants';
import { convertWeight, toKg } from '../common/UnitConverter';

// Pie chart colors - premium color palette
const PIE_COLORS = [
    '#A8C686', // Accent green
    '#7CB4B0', // Teal
    '#E5B877', // Gold
    '#C9A0DC', // Lavender
    '#F0A68E', // Coral
    '#8AACA8', // Muted teal
    '#D4A574', // Sand
    '#9DB5B2', // Sage
];

const Dashboard = ({ sessions, todayWorkout, onUpdateSession, onDeleteExercise, units, onNavigateToHistory, weeklyPlan }) => {
    const [editingExercise, setEditingExercise] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, exercise: null });
    const [selectedWeek, setSelectedWeek] = useState('all');
    const [weekDropdownOpen, setWeekDropdownOpen] = useState(false);
    const weekDropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (weekDropdownRef.current && !weekDropdownRef.current.contains(event.target)) {
                setWeekDropdownOpen(false);
            }
        };

        if (weekDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [weekDropdownOpen]);

    // Generate list of weeks from sessions data
    const availableWeeks = useMemo(() => {
        const weekMap = new Map();

        sessions.forEach(session => {
            if (!session.exercises) return;
            const sessionDate = new Date(session.date);
            const weekStart = new Date(sessionDate);
            const day = weekStart.getDay();
            const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
            weekStart.setDate(diff);
            weekStart.setHours(0, 0, 0, 0);

            const weekKey = weekStart.toISOString().split('T')[0];
            if (!weekMap.has(weekKey)) {
                const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                weekMap.set(weekKey, { key: weekKey, label: `Week of ${weekLabel}`, startDate: weekStart });
            }
        });

        return Array.from(weekMap.values()).sort((a, b) => b.startDate - a.startDate);
    }, [sessions]);

    // Calculate exercise completion counts for pie chart
    const exerciseCompletionData = useMemo(() => {
        const exerciseCount = {};

        sessions.forEach(session => {
            if (!session.exercises) return;

            // Filter by week if a specific week is selected
            if (selectedWeek !== 'all') {
                const sessionDate = new Date(session.date);
                const weekStart = new Date(sessionDate);
                const day = weekStart.getDay();
                const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
                weekStart.setDate(diff);
                weekStart.setHours(0, 0, 0, 0);
                const weekKey = weekStart.toISOString().split('T')[0];

                if (weekKey !== selectedWeek) return;
            }

            session.exercises.forEach(exercise => {
                if (exercise.completed) {
                    const name = exercise.name;
                    exerciseCount[name] = (exerciseCount[name] || 0) + 1;
                }
            });
        });

        // Convert to array and sort by count descending
        const sortedData = Object.entries(exerciseCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Take top 8 exercises, group rest as "Others"
        if (sortedData.length > 8) {
            const top7 = sortedData.slice(0, 7);
            const othersValue = sortedData.slice(7).reduce((sum, item) => sum + item.value, 0);
            return [...top7, { name: 'Others', value: othersValue }];
        }

        return sortedData;
    }, [sessions, selectedWeek]);

    const totalCompletions = exerciseCompletionData.reduce((sum, item) => sum + item.value, 0);


    const getWeeklyProgress = () => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const today = new Date();
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)

        const currentDayIndex = day === 0 ? 6 : day - 1;
        startOfWeek.setDate(today.getDate() - currentDayIndex);

        return days.map((dayName, index) => {
            const dateToCheck = new Date(startOfWeek);
            dateToCheck.setDate(startOfWeek.getDate() + index);


            const session = sessions.find(s => {
                const sDate = new Date(s.date);
                return sDate.getDate() === dateToCheck.getDate() &&
                    sDate.getMonth() === dateToCheck.getMonth() &&
                    sDate.getFullYear() === dateToCheck.getFullYear();
            });

            if (!session || !session.exercises || session.exercises.length === 0) return { day: dayName, progress: 0 };

            const completed = session.exercises.filter(e => e.completed).length;
            const total = session.exercises.length;
            return { day: dayName, progress: Math.round((completed / total) * 100) };
        });
    };

    const getConsistencyTrends = () => {
        if (!weeklyPlan) return [];

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
        const getLocalDateStr = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        while (tempDate <= now) {
            const dateStr = getLocalDateStr(tempDate);
            const foundSession = sessions.find(s => getLocalDateStr(s.date) === dateStr);

            if (foundSession && foundSession.exercises && foundSession.exercises.length > 0) {
                combinedSessions.push(foundSession);
            } else if (weeklyPlan) {
                const dayName = tempDate.toLocaleDateString('en-US', { weekday: 'long' });
                const plan = weeklyPlan[dayName];

                if (plan && !plan.isRestDay && plan.exercises && plan.exercises.length > 0) {
                    const isToday = dateStr === getLocalDateStr(now);
                    if (!isToday) { // Only count as missed if it's in the past
                        combinedSessions.push({
                            id: `missed-${dateStr}`,
                            date: new Date(tempDate).toISOString(),
                            isMissed: true,
                            exercises: plan.exercises.map(ex => ({ ...ex, completed: false }))
                        });
                    }
                }
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }

        // 3. Group by Week (Monday Start)
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
                weekMap.set(weekKey, { startDate: weekStart, total: 0, completed: 0 });
            }

            const week = weekMap.get(weekKey);
            if (session.exercises) {
                week.total += session.exercises.length;
                if (!session.isMissed) {
                    week.completed += session.exercises.filter(e => e.completed).length;
                }
            }
        });

        const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => a.startDate - b.startDate);

        // Take last 5 weeks for the chart
        return sortedWeeks.slice(-5).map(week => {
            const consistency = week.total > 0 ? Math.round((week.completed / week.total) * 100) : 0;
            const startStr = week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return {
                name: `Week of ${startStr}`,
                consistency: consistency,
                fullDate: week.startDate
            };
        });
    };

    const weeklyProgress = getWeeklyProgress();
    const consistencyTrends = getConsistencyTrends();


    const todayCompleted = todayWorkout?.exercises.filter(e => e.completed).length || 0;
    const todayTotal = todayWorkout?.exercises.length || 0;
    const completionPercentage = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;


    const totalLogs = sessions.filter(s => s.exercises && s.exercises.some(e => e.completed)).length;
    const weeklyStreak = weeklyProgress.filter(d => d.progress > 0).length;

    const stats = [
        { label: 'Total Logs', value: totalLogs.toString(), icon: <Target size={20} className="text-emerald-400" />, sub: 'Workouts logged' },
        { label: 'Weekly Streak', value: `${weeklyStreak} Day${weeklyStreak !== 1 ? 's' : ''}`, icon: <Flame size={20} className="text-orange-400" />, sub: 'Keep it going!' },
        { label: 'Active Exercises', value: todayWorkout?.exercises.length.toString() || '0', icon: <TrendingUp size={20} className="text-blue-400" />, sub: 'Today' },
        { label: 'Progress', value: `${completionPercentage}%`, icon: <CalendarDays size={20} className="text-[var(--accent)]" />, sub: 'Consistency' },
    ];

    const handleToggleComplete = (exerciseId) => {
        if (!todayWorkout) return;
        const updated = {
            ...todayWorkout,
            exercises: todayWorkout.exercises.map(ex =>
                ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
            )
        };
        onUpdateSession(updated);
    };

    const handleWeightChange = (exerciseId, val) => {
        if (!todayWorkout) return;

        // Convert input value to KG for storage if unit is lbs
        const valueInKg = toKg(val, units);
        const validWeight = Math.max(0, valueInKg);
        const updated = {
            ...todayWorkout,
            exercises: todayWorkout.exercises.map(ex =>
                ex.id === exerciseId ? { ...ex, weight: validWeight } : ex
            )
        };
        onUpdateSession(updated);
    };

    // Delete exercise from today's session only
    const handleDeleteFromToday = (exerciseId) => {
        if (!todayWorkout) return;
        const updated = {
            ...todayWorkout,
            exercises: todayWorkout.exercises.filter(ex => ex.id !== exerciseId)
        };
        onUpdateSession(updated);
        setDeleteModal({ show: false, exercise: null });
    };

    // Delete exercise from today AND from the weekly schedule
    const handleDeleteFromAll = (exercise) => {
        if (!todayWorkout || !onDeleteExercise) return;

        // First remove from today's session
        const updated = {
            ...todayWorkout,
            exercises: todayWorkout.exercises.filter(ex => ex.id !== exercise.id)
        };
        onUpdateSession(updated);

        // Then remove from weekly plan (via parent callback)
        onDeleteExercise(exercise.name);
        setDeleteModal({ show: false, exercise: null });
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold">Good Day</h1>
                <p className="text-[var(--text-secondary)]">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-[var(--bg-secondary)] p-6 organic-shape organic-border subtle-depth transition-organic hover:translate-y-[-2px]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-[var(--bg-primary)] rounded-xl">{stat.icon}</div>
                        </div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-sm text-[var(--text-secondary)] font-medium">{stat.label}</div>
                        <div className="text-xs text-[var(--text-secondary)] opacity-60 mt-1">{stat.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold px-1">Today's Focus</h2>
                        <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth">
                            {todayWorkout ? (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold">{todayWorkout.title}</h3>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full text-xs font-bold uppercase tracking-wider mt-2">
                                                <CheckCircle2 size={12} /> Active Session
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {todayWorkout.exercises.map((ex, idx) => (
                                            <div key={idx} className={`flex items-center justify-between p-4 bg-[var(--bg-primary)]/50 organic-border rounded-[18px_22px_15px_20px] group transition-organic ${ex.completed ? 'opacity-50 border-[var(--accent)]/40' : 'hover:bg-[var(--bg-primary)]'}`}>
                                                <div className="flex items-center gap-4 flex-1">
                                                    <button
                                                        onClick={() => handleToggleComplete(ex.id)}
                                                        className={`p-2 transition-organic ${ex.completed ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent)]'}`}
                                                    >
                                                        {ex.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                                    </button>
                                                    <div className="p-2 bg-[var(--bg-secondary)] organic-shape border border-[var(--border)]">
                                                        {MUSCLE_ICONS[ex.muscleGroup]}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-semibold">{ex.name}</div>
                                                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                                            <span>{ex.sets}×{ex.reps}</span>
                                                            <span>•</span>
                                                            {editingExercise === ex.id ? (
                                                                <input
                                                                    type="number"
                                                                    autoFocus
                                                                    className="w-16 bg-[var(--bg-secondary)] border border-[var(--accent)] rounded px-1 text-center"
                                                                    value={convertWeight(ex.weight, units).value === 0 ? '' : convertWeight(ex.weight, units).value}
                                                                    onBlur={() => setEditingExercise(null)}
                                                                    onChange={(e) => handleWeightChange(ex.id, e.target.value)}
                                                                    placeholder="0"
                                                                />
                                                            ) : (
                                                                <span
                                                                    onClick={() => setEditingExercise(ex.id)}
                                                                    className="cursor-pointer hover:text-[var(--accent)] underline decoration-dotted"
                                                                >
                                                                    {convertWeight(ex.weight, units).value} {units}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditingExercise(ex.id)}
                                                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-organic"
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({ show: true, exercise: ex })}
                                                        className="p-2 text-[var(--text-secondary)] hover:text-rose-400 transition-organic"
                                                        title="Delete exercise"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 text-[var(--text-secondary)]">
                                    <p>No workout scheduled for today. Take a breather!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-bold px-1">Consistency Trends</h2>
                        <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth">
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={consistencyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 'bold' }}
                                            axisLine={false}
                                            tickLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-xl shadow-2xl">
                                                            <p className="text-xs font-bold text-[var(--text-primary)] mb-1">{payload[0].payload.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                                                <p className="text-xs text-[var(--text-secondary)]">
                                                                    Avg. Consistency: <span className="text-[var(--accent)] font-bold">{payload[0].value}%</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="consistency"
                                            stroke="var(--accent)"
                                            strokeWidth={3}
                                            dot={{ fill: 'var(--bg-secondary)', stroke: 'var(--accent)', strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, fill: 'var(--accent)' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Exercise Completion Pie Chart */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <PieChartIcon size={20} className="text-[var(--accent)]" />
                                Top Exercises
                            </h2>

                            {/* Week Filter Dropdown */}
                            <div className="relative" ref={weekDropdownRef}>
                                <button
                                    onClick={() => setWeekDropdownOpen(!weekDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)] transition-organic"
                                >
                                    <span className="text-[var(--text-secondary)]">
                                        {selectedWeek === 'all'
                                            ? 'All Weeks'
                                            : availableWeeks.find(w => w.key === selectedWeek)?.label || 'All Weeks'}
                                    </span>
                                    <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${weekDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {weekDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            <button
                                                onClick={() => {
                                                    setSelectedWeek('all');
                                                    setWeekDropdownOpen(false);
                                                }}
                                                className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-[var(--bg-primary)] transition-colors ${selectedWeek === 'all' ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--text-primary)]'}`}
                                            >
                                                All Weeks
                                            </button>
                                            {availableWeeks.map(week => (
                                                <button
                                                    key={week.key}
                                                    onClick={() => {
                                                        setSelectedWeek(week.key);
                                                        setWeekDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-[var(--bg-primary)] transition-colors ${selectedWeek === week.key ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[var(--text-primary)]'}`}
                                                >
                                                    {week.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth">
                            {exerciseCompletionData.length > 0 ? (
                                <div className="flex flex-col lg:flex-row items-center gap-6">
                                    {/* Pie Chart */}
                                    <div className="w-full lg:w-1/2 h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={exerciseCompletionData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={90}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    stroke="var(--bg-primary)"
                                                    strokeWidth={2}
                                                >
                                                    {exerciseCompletionData.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                            className="transition-all duration-300 hover:opacity-80"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            const percentage = totalCompletions > 0
                                                                ? Math.round((data.value / totalCompletions) * 100)
                                                                : 0;
                                                            return (
                                                                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-xl shadow-2xl">
                                                                    <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{data.name}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            className="w-3 h-3 rounded-full"
                                                                            style={{ backgroundColor: PIE_COLORS[exerciseCompletionData.indexOf(data) % PIE_COLORS.length] }}
                                                                        />
                                                                        <p className="text-xs text-[var(--text-secondary)]">
                                                                            <span className="text-[var(--accent)] font-bold">{data.value}</span> completions ({percentage}%)
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Legend */}
                                    <div className="w-full lg:w-1/2 space-y-2">
                                        <div className="text-center lg:text-left mb-4">
                                            <p className="text-2xl font-bold text-[var(--accent)]">{totalCompletions}</p>
                                            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Total Completions</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                                            {exerciseCompletionData.map((entry, index) => (
                                                <div
                                                    key={entry.name}
                                                    className="flex items-center justify-between p-2 bg-[var(--bg-primary)]/50 rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                                        />
                                                        <span className="text-sm font-medium truncate max-w-[120px]">{entry.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-[var(--accent)]">{entry.value}</span>
                                                        <span className="text-xs text-[var(--text-secondary)]">
                                                            ({totalCompletions > 0 ? Math.round((entry.value / totalCompletions) * 100) : 0}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-[var(--text-secondary)]">
                                    <PieChartIcon size={48} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No completed exercises yet</p>
                                    <p className="text-sm opacity-70">Complete some exercises to see your progress!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold px-1">Weekly Flow</h2>
                    <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth">
                        <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-6 uppercase tracking-widest">Progress Tracker</h3>
                        <div className="space-y-4">
                            {weeklyProgress.map((item) => (
                                <div key={item.day} className="flex items-center gap-3">
                                    <div className="w-8 text-[10px] font-bold text-[var(--text-secondary)] opacity-50 uppercase">{item.day.slice(0, 3)}</div>
                                    <div className="flex-1 h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--accent)] transition-all duration-1000 ease-out"
                                            style={{ width: `${item.progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-[10px] font-bold text-[var(--text-secondary)] w-6 text-right">{item.progress}%</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 p-4 bg-[var(--accent)]/5 rounded-xl border border-[var(--accent)]/20">
                            <p className="text-xs text-[var(--accent)] font-medium italic">
                                "Small efforts repeated daily lead to great achievements."
                            </p>
                        </div>
                        <button
                            onClick={onNavigateToHistory}
                            className="w-full mt-6 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-bold rounded-lg transition-organic hover:brightness-110 active:scale-95"
                        >
                            View Full History
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Exercise Modal */}
            {deleteModal.show && deleteModal.exercise && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModal({ show: false, exercise: null })} />
                    <div className="relative bg-[var(--bg-secondary)] border border-[var(--border)] organic-shape p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setDeleteModal({ show: false, exercise: null })}
                            className="absolute top-4 right-4 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-rose-500/10 rounded-full">
                                <Trash2 size={24} className="text-rose-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Remove Exercise?</h3>
                                <p className="text-sm text-[var(--text-secondary)]">"{deleteModal.exercise.name}"</p>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
                            <p className="text-xs text-amber-200/80">
                                Choose how you want to remove this exercise:
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleDeleteFromToday(deleteModal.exercise.id)}
                                className="w-full py-3 px-4 bg-[var(--bg-primary)] border border-[var(--border)] organic-shape font-semibold hover:bg-[var(--bg-secondary)] transition-organic text-left"
                            >
                                <div className="font-bold">Remove from Today Only</div>
                                <div className="text-xs text-[var(--text-secondary)] mt-1">Keep in schedule for future weeks</div>
                            </button>
                            {onDeleteExercise && (
                                <button
                                    onClick={() => handleDeleteFromAll(deleteModal.exercise)}
                                    className="w-full py-3 px-4 bg-rose-500/20 border border-rose-500/30 text-rose-400 organic-shape font-semibold hover:bg-rose-500/30 transition-organic text-left"
                                >
                                    <div className="font-bold">Remove from All Future Workouts</div>
                                    <div className="text-xs text-rose-300/70 mt-1">Delete from today + weekly schedule</div>
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setDeleteModal({ show: false, exercise: null })}
                            className="w-full mt-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
