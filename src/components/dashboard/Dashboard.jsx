
import React, { useState } from 'react';
import { TrendingUp, Flame, Target, CalendarDays, CheckCircle2, Circle, Edit3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MUSCLE_ICONS } from '../../constants';
import { convertWeight, toKg } from '../common/UnitConverter';

const Dashboard = ({ sessions, todayWorkout, onUpdateSession, units, onNavigateToHistory, weeklyPlan }) => {
    const [editingExercise, setEditingExercise] = useState(null);


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
                                                <button
                                                    onClick={() => setEditingExercise(ex.id)}
                                                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-organic"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
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
        </div>
    );
};

export default Dashboard;
