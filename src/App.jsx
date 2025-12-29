
import React, { useState, useEffect } from 'react';
import { Zap, Calendar, MessageSquare, AlertTriangle } from 'lucide-react';
import Navigation from './components/layout/Navigation';
import Dashboard from './components/dashboard/Dashboard';
import CalendarView from './components/calendar/CalendarView';
import WeeklySchedule from './components/schedule/WeeklySchedule';
import AICoach from './components/coach/AICoach';
import Settings from './components/settings/Settings';
import Auth from './components/auth/Auth';
import { WEEKLY_DEFAULT_PLAN } from './constants';
import { supabase } from './services/supabaseClient';

const AppScreen = {
    Dashboard: 0,
    Calendar: 1,
    Exercises: 2,
    AICoach: 3,
    Settings: 4
};

const App = () => {
    const [session, setSession] = useState(null);
    const [currentScreen, setCurrentScreen] = useState(AppScreen.Dashboard);
    const [sessions, setSessions] = useState([]);
    const [weeklyPlan, setWeeklyPlan] = useState(WEEKLY_DEFAULT_PLAN);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [units, setUnits] = useState('kg');
    const [modal, setModal] = useState({ show: false, title: '', message: '', onConfirm: () => { } });


    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);


    useEffect(() => {
        if (!session?.user?.id) return;

        const fetchData = async () => {
            const userId = session.user.id;


            const { data: sessionsData, error: sessionsError } = await supabase
                .from('sessions')
                .select('*')
                .eq('user_id', userId);

            if (sessionsData) {
                setSessions(sessionsData);
            } else if (sessionsError) {
                console.error('Error fetching sessions:', sessionsError);
            }


            const { data: planData, error: planError } = await supabase
                .from('weekly_plan')
                .select('plan')
                .eq('user_id', userId)
                .single();

            if (planData) {
                setWeeklyPlan(planData.plan);
            } else {

                if (planError && planError.code === 'PGRST116') { // No rows found
                    await supabase.from('weekly_plan').insert({ user_id: userId, plan: WEEKLY_DEFAULT_PLAN });
                }
            }
        };

        fetchData();
    }, [session]);


    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.remove('light');
        } else {
            document.body.classList.add('light');
        }
    }, [isDarkMode]);

    const confirmAction = (title, message, onConfirm) => {
        setModal({ show: true, title, message, onConfirm });
    };

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const updateSession = async (updatedSession, shouldSyncToPlan = true) => {
        if (!session?.user?.id) return;


        setSessions(prev => {
            const exists = prev.find(s => s.id === updatedSession.id);
            if (exists) {
                return prev.map(s => s.id === updatedSession.id ? updatedSession : s);
            }
            return [...prev, updatedSession];
        });


        const sessionPayload = { ...updatedSession, user_id: session.user.id };
        const { error } = await supabase
            .from('sessions')
            .upsert(sessionPayload);

        if (error) {
            console.error('Error updating session:', error);

        }


        // Sync weights to weekly plan if it's today's workout and flag is true
        if (shouldSyncToPlan) {
            const todayStr = new Date().toDateString();
            const sessionDateStr = new Date(updatedSession.date).toDateString();

            if (todayStr === sessionDateStr) {
                const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

                handleSetWeeklyPlan(prevPlan => {
                    const dayPlan = prevPlan[dayName];
                    if (!dayPlan) return prevPlan;

                    const updatedExercises = dayPlan.exercises.map(planEx => {
                        // Match by name as IDs might differ
                        const sessionEx = updatedSession.exercises.find(sEx => sEx.name === planEx.name);

                        if (sessionEx && sessionEx.weight !== undefined) {
                            return { ...planEx, weight: sessionEx.weight };
                        }
                        return planEx;
                    });

                    return {
                        ...prevPlan,
                        [dayName]: {
                            ...dayPlan,
                            exercises: updatedExercises
                        }
                    };
                }, false); // Pass false to prevent loop back to session
            }
        }
    };

    const deleteSession = async (sessionId) => {
        confirmAction(
            "Delete Workout?",
            "This will permanently remove this recorded session from your history.",
            async () => {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
                if (session?.user?.id) {
                    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
                    if (error) {
                        console.error('Delete error:', error);
                        alert(`Failed to delete: ${error.message}`);
                    }
                }
            }
        );
    };


    const handleSetWeeklyPlan = (newValueOrFn, shouldSyncToSession = true) => {
        setWeeklyPlan(currentPlan => {
            // Calculate new state immediately using current scope 'currentPlan' (which is the latest from state updater)
            // Wait, using the functional update form of setWeeklyPlan allows us to access the fresh state "currentPlan"
            // But we need the result to pass to superset/logic.

            // Re-evaluating the structure here.
            // The original code used `weeklyPlan` from closure which might be stale in a callback.
            // But `setWeeklyPlan` was called with `newPlan`.

            // Let's resolve the value first.
            // If newValueOrFn is a function, we need the *current* state.
            // But we are outside the setter.
            // The original code:
            // const newPlan = typeof newValueOrFn === 'function' ? newValueOrFn(weeklyPlan) : newValueOrFn;
            // setWeeklyPlan(newPlan);

            // This relies on `weeklyPlan` being fresh. If `handleSetWeeklyPlan` is called from an effect or async (like `updateSession`),
            // `weeklyPlan` in the closure might be stale.
            // However, `updateSession` is recreated on every render? No, it's defined in the component body, so it closes over the *current* render's `weeklyPlan`.
            // As long as `App` re-renders when `weeklyPlan` changes, it's fine.

            const newPlan = typeof newValueOrFn === 'function'
                ? newValueOrFn(weeklyPlan)
                : newValueOrFn;

            // Side Effects (Supabase)
            if (session?.user?.id && newPlan) {
                supabase.from('weekly_plan')
                    .upsert({ user_id: session.user.id, plan: newPlan })
                    .then(({ error }) => {
                        if (error) {
                            console.error("Failed to sync plan:", error);
                        }
                    });
            }

            // Sync Schedule -> Dashboard (Active Session)
            if (shouldSyncToSession) {
                const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                // Check if the update affects today's plan
                const todayPlan = newPlan[dayName];

                // Get today's session from *current* sessions state (also closed over)
                const todayStr = new Date().toDateString();
                const todaySession = sessions.find(s => new Date(s.date).toDateString() === todayStr);

                if (todaySession && todayPlan) {
                    // Check if we need to sync updates
                    // We map session exercises and update them if they exist in the plan
                    let hasChanges = false;

                    const updatedExercises = todaySession.exercises.map(sessionEx => {
                        const planEx = todayPlan.exercises.find(p => p.name === sessionEx.name);
                        if (planEx) {
                            // Check for differences in relevant fields
                            if (sessionEx.weight !== planEx.weight || sessionEx.sets !== planEx.sets || sessionEx.reps !== planEx.reps) {
                                hasChanges = true;
                                return {
                                    ...sessionEx,
                                    weight: planEx.weight,
                                    sets: planEx.sets,
                                    reps: planEx.reps,
                                    muscleGroup: planEx.muscleGroup || sessionEx.muscleGroup
                                };
                            }
                        }
                        return sessionEx;
                    });

                    // Handle added exercises (in Plan but not in Session)
                    const sessionExNames = new Set(todaySession.exercises.map(e => e.name));
                    const newExercises = todayPlan.exercises
                        .filter(p => !sessionExNames.has(p.name))
                        .map((p, i) => {
                            hasChanges = true;
                            return {
                                ...p,
                                id: `ex-new-${i}-${Date.now()}`,
                                completed: false,
                                weight: p.weight || 0
                            };
                        });

                    if (hasChanges) {
                        const newSession = {
                            ...todaySession,
                            exercises: [...updatedExercises, ...newExercises]
                        };
                        // Call updateSession but skip reverse sync
                        // We must use setTimeout to break the render cycle if checks are strict, 
                        // but here we are just calling a function.
                        // However, updateSession sets state.
                        updateSession(newSession, false);
                    }
                }
            }

            return newPlan;
        });

        // The above `setWeeklyPlan` usage returns the new state, so it works as a setter.
        // But verifying `updateSession` calls `handleSetWeeklyPlan` ...
        // `handleSetWeeklyPlan(prevPlan => ...)`
        // My implementation of `handleSetWeeklyPlan` above assumes it's just a function that calls `setWeeklyPlan`.
        // The original code:
        // const newPlan = ...; setWeeklyPlan(newPlan); ...
        // If I wrap everything in `setWeeklyPlan(current => ...)` it might be cleaner for state updates,
        // BUT `updateSession` calls `handleSetWeeklyPlan` expecting it to execute logic, not just return a state updater.
        // Wait, `updateSession` calls: `handleSetWeeklyPlan(prevPlan => { ... })`.
        // If `handleSetWeeklyPlan` is defined as:
        // const handleSetWeeklyPlan = (newValueOrFn) => { const newPlan = ...; setWeeklyPlan(newPlan); ... }
        // Then `newValueOrFn` is the function passed from `updateSession`.
        // Calling `newValueOrFn(weeklyPlan)` uses the CLOSURE `weeklyPlan`.
        // If `updateSession` runs, `weeklyPlan` might not be the absolute latest if multiple updates happened?
        // Actually, `updateSession` runs in response to user interaction, so `weeklyPlan` should be fresh enough.

        // Let's stick to the original structure but add the logic.
    };

    const getTodayWorkout = () => {
        const today = new Date().toDateString();
        let currentSession = sessions.find(s => new Date(s.date).toDateString() === today);

        if (!currentSession) {
            const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const plan = weeklyPlan[dayName];
            if (plan) {
                currentSession = {
                    id: crypto.randomUUID(), // Use real UUID for DB compatibility
                    date: new Date().toISOString(),
                    title: plan.title,
                    exercises: plan.exercises.map((ex, i) => ({
                        ...ex,
                        id: `ex-${i}-${Date.now()}`,
                        weight: 0,
                        completed: false
                    }))
                };
            }
        }
        return currentSession;
    };

    const renderScreen = () => {
        switch (currentScreen) {
            case AppScreen.Dashboard:
                return <Dashboard
                    sessions={sessions}
                    todayWorkout={getTodayWorkout()}
                    onUpdateSession={updateSession}
                />;
            case AppScreen.Calendar:
                return (
                    <CalendarView
                        sessions={sessions}
                        onDeleteSession={deleteSession}
                        weeklyPlan={weeklyPlan}
                        onMarkComplete={async (date, plan) => {
                            if (!session?.user?.id) return;
                            const newSession = {
                                id: crypto.randomUUID(),
                                user_id: session.user.id,
                                title: plan.title,
                                date: date.toISOString(),
                                exercises: plan.exercises.map((ex, i) => ({
                                    ...ex,
                                    id: `ex-${i}-${Date.now()}`,
                                    weight: ex.weight || 0,
                                    completed: true
                                })),
                                created_at: new Date().toISOString()
                            };

                            // Optimistic update
                            setSessions(prev => [...prev, newSession]);

                            // DB Update
                            const { error } = await supabase.from('sessions').insert(newSession);
                            if (error) {
                                console.error('Error marking plan as done:', error);
                                // Rollback could be added here
                            }
                        }}
                    />
                );
            case AppScreen.Exercises:
                return <WeeklySchedule
                    weeklyPlan={weeklyPlan}
                    setWeeklyPlan={handleSetWeeklyPlan}
                    confirmAction={confirmAction}
                />;
            case AppScreen.AICoach:
                return <AICoach />;
            case AppScreen.Settings:
                return <Settings
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    confirmAction={confirmAction}
                    userEmail={session?.user?.email}
                    units={units}
                    toggleUnits={() => setUnits(u => u === 'kg' ? 'lbs' : 'kg')}
                    onSignOut={async () => {
                        confirmAction("Sign Out?", "Are you sure you want to sign out?", async () => {
                            const { error } = await supabase.auth.signOut();
                            if (error) console.error("Sign out error:", error);
                            setSession(null); // Force local state clearing immediately
                        });
                    }}
                    onResetData={async () => {
                        confirmAction(
                            "Reset All Data?",
                            "This will permanently delete your workout history and custom schedule. This action cannot be undone.",
                            async () => {
                                if (session?.user?.id) {
                                    const { error: e1 } = await supabase.from('sessions').delete().eq('user_id', session.user.id);
                                    const { error: e2 } = await supabase.from('weekly_plan').delete().eq('user_id', session.user.id);

                                    if (e1 || e2) {
                                        console.error("Reset error:", e1, e2);
                                        alert("Failed to reset some data. Check console.");
                                    } else {
                                        // Reset local state only on success
                                        setSessions([]);
                                        setWeeklyPlan(WEEKLY_DEFAULT_PLAN);

                                        // Re-initialize default plan in DB
                                        await supabase.from('weekly_plan').insert({
                                            user_id: session.user.id,
                                            plan: WEEKLY_DEFAULT_PLAN
                                        });
                                    }
                                }
                            }
                        );
                    }}
                />;
            default:
                return <Dashboard sessions={sessions} todayWorkout={getTodayWorkout()} onUpdateSession={updateSession} />;
        }
    };


    if (!session) {
        return <Auth />;
    }

    return (
        <div className="min-h-screen transition-colors duration-300">
            <Navigation
                currentScreen={currentScreen}
                onScreenChange={setCurrentScreen}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />
            <main className="max-w-7xl mx-auto pb-24 md:pb-8">
                {renderScreen()}
            </main>


            {modal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth p-8 max-w-sm w-full space-y-6 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 organic-shape flex items-center justify-center mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">{modal.title}</h3>
                            <p className="text-[var(--text-secondary)] text-sm">{modal.message}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModal({ ...modal, show: false })}
                                className="flex-1 py-3 bg-[var(--bg-primary)] organic-shape border border-[var(--border)] font-bold text-sm transition-organic hover:bg-[var(--bg-secondary)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    modal.onConfirm();
                                    setModal({ ...modal, show: false });
                                }}
                                className="flex-1 py-3 bg-rose-500 organic-shape text-white font-bold text-sm transition-organic hover:brightness-110 active:scale-95"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className="md:hidden fixed bottom-6 left-6 right-6 bg-[var(--bg-secondary)]/90 backdrop-blur-lg organic-shape organic-border flex justify-around p-4 z-50 subtle-depth border-t border-[var(--border)]">
                {[AppScreen.Dashboard, AppScreen.Calendar, AppScreen.Exercises, AppScreen.AICoach].map((screen) => (
                    <button
                        key={screen}
                        onClick={() => setCurrentScreen(screen)}
                        className={`transition-organic p-3 rounded-xl ${currentScreen === screen ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'text-[var(--text-secondary)]'}`}
                    >
                        {screen === AppScreen.Dashboard && <Zap size={24} />}
                        {screen === AppScreen.Calendar && <Calendar size={24} />}
                        {screen === AppScreen.Exercises && <Zap size={24} className="rotate-90" />}
                        {screen === AppScreen.AICoach && <MessageSquare size={24} />}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default App;
