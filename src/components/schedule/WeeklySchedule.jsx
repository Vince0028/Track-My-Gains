
import React, { useState } from 'react';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import { MUSCLE_ICONS, getMuscleGroup, COMMON_EXERCISES } from '../../constants';
import { convertWeight, toKg } from '../common/UnitConverter';

const WeeklySchedule = ({ weeklyPlan, setWeeklyPlan, confirmAction, units }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [editingDay, setEditingDay] = useState(null);
    const [activeMuscleDropdown, setActiveMuscleDropdown] = useState({ day: null, index: null });







    const removeExercise = (day, exIndex) => {
        confirmAction(
            "Remove Exercise?",
            "This will remove this exercise from your recurring weekly schedule.",
            () => {
                setWeeklyPlan(prev => ({
                    ...prev,
                    [day]: {
                        ...prev[day],
                        exercises: prev[day].exercises.filter((_, i) => i !== exIndex)
                    }
                }));
            }
        );
    };

    const addExercise = (day) => {
        const newEx = { name: 'New Exercise', sets: 3, reps: 10, weight: 0, muscleGroup: 'Core' };
        setWeeklyPlan(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                exercises: [...prev[day].exercises, newEx]
            }
        }));
    };

    const updateExercise = (day, index, field, value) => {
        setWeeklyPlan(prev => {
            const dayPlan = prev[day];
            const newExs = [...dayPlan.exercises];


            if (field === 'name') {
                newExs[index] = {
                    ...newExs[index],
                    name: value,
                    muscleGroup: getMuscleGroup(value)
                };
            } else if (['weight', 'sets', 'reps'].includes(field)) {
                // Ensure no negative numbers logic
                let valueToStore = Number(value);

                if (field === 'weight') {
                    // Convert back to kg if needed
                    valueToStore = toKg(value, units);
                }

                const validValue = Math.max(0, valueToStore);
                newExs[index] = { ...newExs[index], [field]: validValue };

                // SYNC LOGIC: If updating weight, sync to all other days for the same exercise
                if (field === 'weight') {
                    const exerciseName = newExs[index].name;
                    const updatedWeight = validValue;

                    // Create a new full plan object
                    const newPlan = { ...prev };

                    // Iterate over all days to sync weight
                    Object.keys(newPlan).forEach(d => {
                        if (newPlan[d] && newPlan[d].exercises) {
                            // Map through exercises for this day
                            newPlan[d] = {
                                ...newPlan[d],
                                exercises: newPlan[d].exercises.map(ex => {
                                    // If name matches, update weight
                                    if (ex.name === exerciseName) {
                                        return { ...ex, weight: updatedWeight };
                                    }
                                    return ex;
                                })
                            };
                        }
                    });

                    // We've already updated the specific day's specific index in 'newExs', 
                    // but the loop above might have overwritten it or we need to ensure consistency.
                    // The loop above updates ALL matching exercises. The currently edited one is also matching.
                    // However, we started by creating `newExs` which is the array for the *current* day.
                    // The loop above updates `newPlan[d]`.
                    // So we should just return `newPlan` directly, but we need to ensure the *current* editing session
                    // works fine. 
                    // Actually, the loop updates `newPlan` based on `prev`. `newExs` was derived from `current day`.
                    // So we should effectively apply the sync to `newPlan`.

                    // Let's discard `newExs` local mutation for the return and rely on the global sync
                    // BUT for non-weight fields, we still need the local update.

                    // Refined approach:
                    // 1. Update the local exercise in the plan
                    newPlan[day] = { ...newPlan[day], exercises: newExs };

                    // 2. NOW sync that change to other days
                    Object.keys(newPlan).forEach(d => {
                        if (d === day) return; // Skip current day as we just updated it

                        if (newPlan[d] && newPlan[d].exercises) {
                            newPlan[d] = {
                                ...newPlan[d],
                                exercises: newPlan[d].exercises.map(ex => {
                                    if (ex.name === exerciseName) {
                                        return { ...ex, weight: updatedWeight };
                                    }
                                    return ex;
                                })
                            };
                        }
                    });

                    return newPlan;
                }
            } else {
                newExs[index] = { ...newExs[index], [field]: value };
            }

            return { ...prev, [day]: { ...dayPlan, exercises: newExs } };
        });
    };

    const updateDayTitle = (day, newTitle) => {
        setWeeklyPlan(prev => ({
            ...prev,
            [day]: { ...prev[day], title: newTitle }
        }));
    };

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
                    return (
                        <div key={day} className="bg-[var(--bg-secondary)] organic-shape organic-border p-6 subtle-depth transition-organic">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 organic-shape bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] text-sm font-bold rotate-[-2deg]">
                                        {day.substring(0, 3)}
                                    </div>
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <input
                                                className="text-lg font-bold bg-transparent border-b border-[var(--accent)] focus:outline-none w-full mb-1"
                                                value={plan.title}
                                                onChange={(e) => updateDayTitle(day, e.target.value)}
                                                placeholder="Day Title (e.g. Chest Day)"
                                            />
                                        ) : (
                                            <h3 className="text-lg font-bold">{plan.title}</h3>
                                        )}
                                        <p className="text-xs text-[var(--text-secondary)]">{plan.exercises.length} activities planned</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingDay(isEditing ? null : day)}
                                        className={`p-2 organic-shape border border-[var(--border)] transition-organic ${isEditing ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
                                    >
                                        {isEditing ? <X size={16} /> : <Pencil size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                {plan.exercises.map((ex, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[var(--bg-primary)]/50 border border-[var(--border)] organic-shape">
                                        <div className="flex items-center gap-3 flex-1">
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
                                                                        updateExercise(day, i, 'muscleGroup', m);
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
                                                <input
                                                    className="bg-transparent border-b border-[var(--accent)] font-medium w-full"
                                                    value={ex.name}
                                                    onChange={(e) => updateExercise(day, i, 'name', e.target.value)}
                                                    list="exercise-list"
                                                    placeholder="Exercise Name"
                                                />
                                            ) : (
                                                <span className="font-medium">{ex.name}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] uppercase">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="w-16 bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-1"
                                                        value={convertWeight(ex.weight || 0, units).value === 0 ? '' : convertWeight(ex.weight || 0, units).value}
                                                        onChange={(e) => updateExercise(day, i, 'weight', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                ) : <span>{convertWeight(ex.weight || 0, units).value}</span>}
                                                <span>{units}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] uppercase">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="w-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-1"
                                                        value={ex.sets === 0 ? '' : ex.sets}
                                                        onChange={(e) => updateExercise(day, i, 'sets', Number(e.target.value))}
                                                        placeholder="0"
                                                    />
                                                ) : <span>{ex.sets}</span>}
                                                <span>sets</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] uppercase">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="w-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-1"
                                                        value={ex.reps === 0 ? '' : ex.reps}
                                                        onChange={(e) => updateExercise(day, i, 'reps', Number(e.target.value))}
                                                        placeholder="0"
                                                    />
                                                ) : <span>{ex.reps}</span>}
                                                <span>reps</span>
                                            </div>

                                            {isEditing && (
                                                <button
                                                    onClick={() => removeExercise(day, i)}
                                                    className="p-2 text-rose-400 hover:text-rose-500 transition-organic"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {isEditing && (
                                    <button
                                        onClick={() => addExercise(day)}
                                        className="w-full py-4 bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)]/30 text-[var(--accent)] organic-shape flex items-center justify-center gap-2 font-bold hover:bg-[var(--accent)]/20 transition-organic"
                                    >
                                        <Plus size={20} /> Add Exercise
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <datalist id="exercise-list">
                {COMMON_EXERCISES.map((ex, i) => (
                    <option key={i} value={ex} />
                ))}
            </datalist>
        </div>
    );
};

export default WeeklySchedule;
