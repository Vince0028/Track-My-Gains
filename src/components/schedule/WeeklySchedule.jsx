import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, X, CheckCircle2, Check, ChevronDown } from 'lucide-react';
import { MUSCLE_ICONS, COMMON_EXERCISES, getExerciseMetricMeta, getMuscleGroup, normalizeExerciseMetrics, normalizeExerciseSearchText } from '../../constants';
import { convertWeight, toKg } from '../common/UnitConverter';

const WeeklySchedule = ({ weeklyPlan, setWeeklyPlan, confirmAction, units }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [editingDay, setEditingDay] = useState(null);
    const [editBuffer, setEditBuffer] = useState(null);
    const [activeMuscleDropdown, setActiveMuscleDropdown] = useState({ day: null, index: null });
    const [activeExerciseDropdown, setActiveExerciseDropdown] = useState({ day: null, index: null });
    const [exerciseDropdownQuery, setExerciseDropdownQuery] = useState('');
    const [exerciseDropdownFilter, setExerciseDropdownFilter] = useState('all');

    const startEditing = (day) => {
        const dayPlan = weeklyPlan[day];
        setEditBuffer({
            ...dayPlan,
            exercises: (dayPlan.exercises || []).map(ex => normalizeExerciseMetrics(ex))
        });
        setEditingDay(day);
    };

    const saveChanges = () => {
        if (editingDay && editBuffer) {
            setWeeklyPlan(prev => ({
                ...prev,
                [editingDay]: {
                    ...editBuffer,
                    exercises: editBuffer.exercises.map(ex => normalizeExerciseMetrics(ex))
                }
            }));
        }
        setEditingDay(null);
        setEditBuffer(null);
        setActiveMuscleDropdown({ day: null, index: null });
        setActiveExerciseDropdown({ day: null, index: null });
        setExerciseDropdownQuery('');
        setExerciseDropdownFilter('all');
    };

    const cancelEditing = () => {
        setEditingDay(null);
        setEditBuffer(null);
        setActiveMuscleDropdown({ day: null, index: null });
        setActiveExerciseDropdown({ day: null, index: null });
        setExerciseDropdownQuery('');
        setExerciseDropdownFilter('all');
    };

    const getExerciseSuggestions = (query = '', muscleFilter = 'all') => {
        const normalized = normalizeExerciseSearchText(query);
        const pool = muscleFilter === 'all'
            ? COMMON_EXERCISES
            : COMMON_EXERCISES.filter(exercise => getMuscleGroup(exercise) === muscleFilter);

        if (!normalized) return pool;

        const terms = normalized.split(' ').filter(Boolean);
        const ranked = pool
            .map((exercise) => {
                const lower = normalizeExerciseSearchText(exercise);
                const score = terms.reduce((total, term) => total + (lower.includes(term) ? 10 : 0), 0)
                    + (lower.includes(normalized) ? 100 : 0)
                    + (lower.startsWith(normalized) ? 25 : 0);
                return { exercise, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score || a.exercise.localeCompare(b.exercise))
            .map(item => item.exercise);

        return ranked.length > 0 ? ranked : pool;
    };

    const addExerciseToBuffer = () => {
        if (!editBuffer) return;
        const newExercise = normalizeExerciseMetrics({ name: 'New Exercise', sets: 3, reps: 10, weight: 0, muscleGroup: 'Core' });
        setEditBuffer(prev => ({ ...prev, exercises: [...prev.exercises, newExercise] }));
    };

    const updateExerciseInBuffer = (index, field, value) => {
        if (!editBuffer) return;

        setEditBuffer(prev => {
            const nextExercises = [...prev.exercises];

            if (field === 'name') {
                nextExercises[index] = normalizeExerciseMetrics({
                    ...nextExercises[index],
                    name: value,
                    muscleGroup: getMuscleGroup(value)
                });
            } else if (field === 'weight') {
                nextExercises[index] = { ...nextExercises[index], weight: Math.max(0, toKg(value, units)) };
            } else if (field === 'sets') {
                nextExercises[index] = { ...nextExercises[index], sets: Math.max(0, Number(value)) };
            } else if (field === 'reps') {
                nextExercises[index] = { ...nextExercises[index], reps: Math.max(0, Number(value)) };
            } else if (field === 'durationMinutes') {
                nextExercises[index] = { ...nextExercises[index], durationMinutes: Math.max(0, Number(value)), metricType: 'duration' };
            } else if (field === 'muscleGroup') {
                nextExercises[index] = { ...nextExercises[index], muscleGroup: value };
            } else {
                nextExercises[index] = { ...nextExercises[index], [field]: value };
            }

            return { ...prev, exercises: nextExercises };
        });
    };

    const removeExerciseFromDay = (day, exIndex) => {
        setWeeklyPlan(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                exercises: (prev[day].exercises || []).filter((_, i) => i !== exIndex)
            }
        }));
    };

    const removeExerciseFromAllDays = (exerciseName) => {
        setWeeklyPlan(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(day => {
                if (next[day]?.exercises) {
                    next[day] = {
                        ...next[day],
                        exercises: next[day].exercises.filter(ex => ex.name !== exerciseName)
                    };
                }
            });
            return next;
        });

        if (editBuffer) {
            setEditBuffer(prev => ({
                ...prev,
                exercises: prev.exercises.filter(ex => ex.name !== exerciseName)
            }));
        }
    };

    useEffect(() => {
        if (!editingDay) {
            setActiveMuscleDropdown({ day: null, index: null });
            setActiveExerciseDropdown({ day: null, index: null });
            setExerciseDropdownQuery('');
            setExerciseDropdownFilter('all');
        }
    }, [editingDay]);

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold">Training Plan</h1>
                    <p className="text-[var(--text-secondary)]">Your recurring weekly schedule</p>
                </div>
            </div>

            <div className="space-y-4">
                {days.map((day) => {
                    const plan = weeklyPlan[day];
                    const isEditing = editingDay === day;
                    const displayPlan = isEditing && editBuffer ? editBuffer : plan;

                    return (
                        <div key={day} className="bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth transition-organic">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4 min-w-0">
                                    <div className="w-12 h-12 organic-shape bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] text-sm font-bold shrink-0 rotate-[-2deg]">
                                        {day.substring(0, 3)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <input
                                                className="text-lg font-bold bg-transparent border-b border-[var(--accent)] focus:outline-none w-full mb-1"
                                                value={displayPlan.title}
                                                onChange={(e) => setEditBuffer(prev => ({ ...prev, title: e.target.value }))}
                                                placeholder="Day Title (e.g. Chest Day)"
                                            />
                                        ) : (
                                            <h3 className="text-lg font-bold truncate">{displayPlan.title}</h3>
                                        )}
                                        <p className="text-xs text-[var(--text-secondary)]">{displayPlan.exercises.length} activities planned</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                    {isEditing ? (
                                        <>
                                            <button onClick={saveChanges} className="p-2 organic-shape border border-emerald-500/50 bg-emerald-500/20 text-emerald-400 transition-organic hover:bg-emerald-500/30" title="Save changes">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={cancelEditing} className="p-2 organic-shape border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-organic hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30" title="Cancel changes">
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => startEditing(day)} className="p-2 organic-shape border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-organic">
                                            <Pencil size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {displayPlan.exercises.length === 0 ? (
                                displayPlan.isRestDay ? (
                                    <div className="p-8 border-2 border-dashed border-[var(--border)] organic-shape flex flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)]/50 mt-6">
                                        <div className="w-12 h-12 rounded-full bg-[var(--text-secondary)]/10 flex items-center justify-center text-[var(--text-secondary)]">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20" /><path d="M5 20v-8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8" /><path d="M10 10V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2v4" /></svg>
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-[var(--text-secondary)]">Rest Day Set</h4>
                                            <p className="text-xs text-[var(--text-secondary)]/70">Enjoy your recovery!</p>
                                        </div>
                                        {isEditing && (
                                            <button onClick={() => setEditBuffer(prev => ({ ...prev, isRestDay: false }))} className="px-4 py-2 mt-2 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors">
                                                Undo Rest Day
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 mt-6">
                                        {isEditing && (
                                            <div className="flex gap-3">
                                                <button onClick={addExerciseToBuffer} className="flex-1 py-4 bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)]/30 text-[var(--accent)] organic-shape flex items-center justify-center gap-2 font-bold hover:bg-[var(--accent)]/20 transition-organic">
                                                    <Plus size={20} /> Add Exercise
                                                </button>
                                                <button onClick={() => setEditBuffer(prev => ({ ...prev, isRestDay: true }))} className="px-6 py-4 bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border)] text-[var(--text-secondary)] organic-shape flex flex-col items-center justify-center gap-1 font-bold hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-organic" title="Set as Rest Day">
                                                    <span className="text-xl">☕</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="mt-6 space-y-3">
                                    {displayPlan.exercises.map((ex, i) => {
                                        const metric = getExerciseMetricMeta(ex);

                                        return (
                                            <div key={i} className="flex flex-col gap-4 p-4 bg-[var(--bg-primary)]/50 border border-[var(--border)] organic-shape sm:flex-row sm:items-center">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div
                                                        className={`relative p-2 bg-[var(--bg-secondary)] organic-shape border border-[var(--border)] transition-colors ${isEditing ? 'cursor-pointer hover:border-[var(--accent)]' : ''}`}
                                                        onClick={(e) => {
                                                            if (isEditing) {
                                                                e.stopPropagation();
                                                                setActiveMuscleDropdown(activeMuscleDropdown.day === day && activeMuscleDropdown.index === i ? { day: null, index: null } : { day, index: i });
                                                            }
                                                        }}
                                                    >
                                                        {MUSCLE_ICONS[ex.muscleGroup]}

                                                        {isEditing && activeMuscleDropdown.day === day && activeMuscleDropdown.index === i && (
                                                            <div className="absolute top-12 left-0 z-[100] w-48 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                                                <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                                                    {Object.keys(MUSCLE_ICONS).map(m => (
                                                                        <button
                                                                            key={m}
                                                                            onClick={() => {
                                                                                updateExerciseInBuffer(i, 'muscleGroup', m);
                                                                                if (activeExerciseDropdown.day === day && activeExerciseDropdown.index === i) {
                                                                                    setExerciseDropdownFilter(m);
                                                                                    setExerciseDropdownQuery('');
                                                                                }
                                                                                setActiveMuscleDropdown({ day: null, index: null });
                                                                            }}
                                                                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${ex.muscleGroup === m ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                                                        >
                                                                            {React.cloneElement(MUSCLE_ICONS[m], { size: 16 })} {m}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isEditing && activeMuscleDropdown.day === day && activeMuscleDropdown.index === i && (
                                                        <div className="fixed inset-0 z-[99]" onClick={(e) => { e.stopPropagation(); setActiveMuscleDropdown({ day: null, index: null }); }} />
                                                    )}

                                                    {isEditing ? (
                                                        <div className="relative flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    className="bg-transparent border-b border-[var(--accent)] font-medium w-full pr-1 text-base sm:text-sm"
                                                                    value={ex.name}
                                                                    onFocus={() => {
                                                                        setActiveExerciseDropdown({ day, index: i });
                                                                        setExerciseDropdownFilter(ex.muscleGroup || 'all');
                                                                        setExerciseDropdownQuery(ex.name === 'New Exercise' ? '' : ex.name || '');
                                                                    }}
                                                                    onChange={(e) => {
                                                                        updateExerciseInBuffer(i, 'name', e.target.value);
                                                                        setActiveExerciseDropdown({ day, index: i });
                                                                        setExerciseDropdownQuery(e.target.value);
                                                                    }}
                                                                    placeholder="Search exercise or type custom"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExerciseDropdownQuery(ex.name === 'New Exercise' ? '' : ex.name || '');
                                                                        setExerciseDropdownFilter(ex.muscleGroup || 'all');
                                                                        setActiveExerciseDropdown(
                                                                            activeExerciseDropdown.day === day && activeExerciseDropdown.index === i
                                                                                ? { day: null, index: null }
                                                                                : { day, index: i }
                                                                        );
                                                                    }}
                                                                    className="h-10 w-10 shrink-0 rounded-lg border-2 border-[var(--accent)]/50 bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors flex items-center justify-center"
                                                                    title="Open exercise list"
                                                                    aria-label="Open exercise dropdown"
                                                                >
                                                                    <ChevronDown size={18} className={`transition-transform ${activeExerciseDropdown.day === day && activeExerciseDropdown.index === i ? 'rotate-180' : ''}`} />
                                                                </button>
                                                            </div>

                                                            {activeExerciseDropdown.day === day && activeExerciseDropdown.index === i && (
                                                                <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/45 backdrop-blur-sm p-4 sm:absolute sm:inset-auto sm:top-[calc(100%+8px)] sm:left-0 sm:right-0 sm:bg-transparent sm:backdrop-blur-0 sm:p-0">
                                                                    <div className="relative w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 sm:w-full sm:max-w-none sm:shadow-2xl sm:mt-0 mt-12">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveExerciseDropdown({ day: null, index: null })}
                                                                            className="absolute top-2 right-2 z-10 h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors flex items-center justify-center"
                                                                            aria-label="Close exercise picker"
                                                                            title="Close"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>

                                                                        <div className="p-3 pr-14 border-b border-[var(--border)] space-y-2">
                                                                            <input
                                                                                type="text"
                                                                                value={exerciseDropdownQuery}
                                                                                onChange={(e) => setExerciseDropdownQuery(e.target.value)}
                                                                                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm"
                                                                                placeholder="Search in exercise list"
                                                                            />
                                                                            <div className="flex items-center gap-2">
                                                                                <select
                                                                                    value={exerciseDropdownFilter}
                                                                                    onChange={(e) => setExerciseDropdownFilter(e.target.value)}
                                                                                    className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-2 py-1.5 text-xs"
                                                                                >
                                                                                    <option value="all">All Muscles</option>
                                                                                    {Object.keys(MUSCLE_ICONS).map(muscle => (
                                                                                        <option key={muscle} value={muscle}>{muscle}</option>
                                                                                    ))}
                                                                                </select>
                                                                                <span className="text-[10px] text-[var(--text-secondary)]">{getExerciseSuggestions(exerciseDropdownQuery, exerciseDropdownFilter).length} exercises</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="max-h-[55vh] sm:max-h-64 overflow-y-auto p-1 custom-scrollbar">
                                                                        {getExerciseSuggestions(exerciseDropdownQuery, exerciseDropdownFilter).map((exerciseName) => (
                                                                            <button
                                                                                key={exerciseName}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    updateExerciseInBuffer(i, 'name', exerciseName);
                                                                                    setActiveExerciseDropdown({ day: null, index: null });
                                                                                    setExerciseDropdownQuery('');
                                                                                    setExerciseDropdownFilter('all');
                                                                                }}
                                                                                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${ex.name === exerciseName ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                                                            >
                                                                                {exerciseName}
                                                                            </button>
                                                                        ))}

                                                                        {getExerciseSuggestions(exerciseDropdownQuery, exerciseDropdownFilter).length === 0 && (
                                                                            <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                                                                                No matches for this filter. Try another search or muscle group.
                                                                            </div>
                                                                        )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="font-medium truncate">{ex.name}</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 sm:justify-end self-stretch sm:self-center">
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)] uppercase justify-end sm:justify-start">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="w-14 sm:w-16 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1 py-1 text-center"
                                                                value={convertWeight(ex.weight || 0, units).value === 0 ? '' : convertWeight(ex.weight || 0, units).value}
                                                                onChange={(e) => updateExerciseInBuffer(i, 'weight', e.target.value)}
                                                                placeholder="0"
                                                            />
                                                        ) : <span>{convertWeight(ex.weight || 0, units).value}</span>}
                                                        <span>{units}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)] uppercase justify-end sm:justify-start">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="w-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1 py-1 text-center"
                                                                value={ex.sets === 0 ? '' : ex.sets}
                                                                onChange={(e) => updateExerciseInBuffer(i, 'sets', Number(e.target.value))}
                                                                placeholder="0"
                                                            />
                                                        ) : <span>{ex.sets}</span>}
                                                        <span>sets</span>
                                                    </div>

                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)] uppercase justify-end sm:justify-start">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="w-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1 py-1 text-center"
                                                                value={metric.value === 0 ? '' : metric.value}
                                                                onChange={(e) => updateExerciseInBuffer(i, metric.field, Number(e.target.value))}
                                                                placeholder="0"
                                                            />
                                                        ) : <span>{metric.value}</span>}
                                                        <span>{metric.label}</span>
                                                    </div>

                                                    {isEditing && (
                                                        <button onClick={() => removeExerciseFromDay(day, i)} className="col-span-2 sm:col-span-1 p-2 text-rose-400 hover:text-rose-500 transition-organic justify-self-end sm:justify-self-auto" title="Remove exercise">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {isEditing && (
                                        <button onClick={addExerciseToBuffer} className="w-full py-4 bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)]/30 text-[var(--accent)] organic-shape flex items-center justify-center gap-2 font-bold hover:bg-[var(--accent)]/20 transition-organic">
                                            <Plus size={20} /> Add Exercise
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeeklySchedule;