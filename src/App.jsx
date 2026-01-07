import React, { useState, useEffect } from 'react';
import { Zap, Calendar, MessageSquare, AlertTriangle, Settings as SettingsIcon, ScanLine, TrendingUp } from 'lucide-react';
import Navigation from './components/layout/Navigation';
import MobileMenu from './components/layout/MobileMenu';
import Dashboard from './components/dashboard/Dashboard';
import CalendarView from './components/calendar/CalendarView';
import WeeklySchedule from './components/schedule/WeeklySchedule';
import AICoach from './components/coach/AICoach';
import FoodScanner from './components/scanner/FoodScanner';
import HistoryPage from './components/history/HistoryPage';
import Settings from './components/settings/Settings';
import Auth from './components/auth/Auth';
import { WEEKLY_DEFAULT_PLAN } from './constants';
import { supabase } from './services/supabaseClient';
import iconDashboard from './assets/icon_dashboard.png';
import iconCalendar from './assets/icon_calendar.png';
import iconSchedule from './assets/icon_schedule.png';
import iconCoach from './assets/icon_coach.png';
import iconSettings from './assets/icon_settings.png';
import iconScanner from './assets/icon_scanner.png';
import OnboardingTour from './components/onboarding/OnboardingTour';

const AppScreen = {
    Dashboard: 0,
    Calendar: 1,
    Exercises: 2,
    AICoach: 3,
    History: 6,
    Scanner: 5,
    Settings: 4
};

const App = () => {
    const [session, setSession] = useState(null);
    const [currentScreen, setCurrentScreen] = useState(AppScreen.Dashboard);
    const [sessions, setSessions] = useState([]);
    const [weeklyPlan, setWeeklyPlan] = useState(WEEKLY_DEFAULT_PLAN);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [units, setUnits] = useState(() => localStorage.getItem('track_my_gains_units') || 'kg');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [modal, setModal] = useState({ show: false, title: '', message: '', onConfirm: () => { } });
    const [showTour, setShowTour] = useState(false);
    const [tourShowSetup, setTourShowSetup] = useState(true); // Control whether to show Profile Setup loop
    const [loading, setLoading] = useState(true);


    // New State for Daily Tracker
    const [profile, setProfile] = useState(null);
    const [nutritionLogs, setNutritionLogs] = useState([]);


    useEffect(() => {
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            // Verify if user actually exists on server to prevent ghost logins
            if (session) {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    console.warn("Ghost session detected. Clearing...");
                    await supabase.auth.signOut();
                    setSession(null);
                    return;
                }
            }

            setSession(session);
            if (!session) setLoading(false);
        };

        checkSession();

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

            // Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileData) {
                setProfile(profileData);
            }


            // Fetch Nutrition Logs
            const { data: nutritionData, error: nutritionError } = await supabase
                .from('daily_nutrition')
                .select('*')
                .eq('user_id', userId);

            if (nutritionData) {
                setNutritionLogs(nutritionData);
            } else if (nutritionError) {
                console.error("Error fetching nutrition:", nutritionError);
            }

            setLoading(false);
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

    // Intelligent Onboarding Trigger Logic
    useEffect(() => {
        if (!loading && session && profile !== undefined) {
            const tourCompleted = localStorage.getItem('track_my_gains_tour_completed');

            // 1. Mandatory Profile Setup (If critical data is missing)
            if (!profile || !profile.age || !profile.weight || !profile.height) {
                console.log("Onboarding: Profile incomplete, showing Setup Mode.");
                setTourShowSetup(true);
                setShowTour(true);
            }
            // 2. New User Tutorial (If profile exists but no workouts ever recorded)
            else if (sessions.length === 0 && !tourCompleted) {
                console.log("Onboarding: New user detected, showing Tutorial Mode.");
                setTourShowSetup(false); // Skip setup, showing only tutorial
                setShowTour(true);
            }
        }
    }, [loading, session, profile, sessions]);

    const confirmAction = (title, message, onConfirm) => {
        setModal({ show: true, title, message, onConfirm });
    };

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const updateSession = async (updatedSession, shouldSyncToPlan = true) => {
        if (!session?.user?.id) return;

        // Optimistically update local state first to ensure UI reactivity
        setSessions(prev => {
            const exists = prev.find(s => s.id === updatedSession.id);
            if (exists) {
                // Update existing session
                return prev.map(s => s.id === updatedSession.id ? updatedSession : s);
            } else {
                // Append new session (this handles the "first check" case)
                return [...prev, updatedSession];
            }
        });

        const sessionPayload = { ...updatedSession, user_id: session.user.id };
        const { error } = await supabase
            .from('sessions')
            .upsert(sessionPayload);

        if (error) {
            console.error('Error updating session:', error);
            // We could revert state here if needed, but for now we log
        }


        // Sync weights to weekly plan if it's today's workout and flag is true
        if (shouldSyncToPlan) {
            const todayStr = new Date().toDateString();
            const sessionDateStr = new Date(updatedSession.date).toDateString();

            if (todayStr === sessionDateStr) {
                const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

                handleSetWeeklyPlan(prevPlan => {
                    const newPlan = { ...prevPlan };

                    // Iterate through all days in the plan to sync weights
                    Object.keys(newPlan).forEach(dayKey => {
                        const dayPlan = newPlan[dayKey];
                        if (dayPlan && dayPlan.exercises) {
                            const updatedExercises = dayPlan.exercises.map(planEx => {
                                // Find matching exercise in the current session
                                const sessionEx = updatedSession.exercises.find(sEx => sEx.name === planEx.name);

                                // If match found, update the weight
                                if (sessionEx && sessionEx.weight !== undefined) {
                                    return { ...planEx, weight: sessionEx.weight };
                                }
                                return planEx;
                            });

                            newPlan[dayKey] = {
                                ...dayPlan,
                                exercises: updatedExercises
                            };
                        }
                    });

                    return newPlan;
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
                    // We map session exercises and update them if they exist for the same name
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
                        updateSession(newSession, false);
                    }
                }
            }

            return newPlan;
        });
    };

    // New Log Meal Function
    const handleLogMeal = async (mealData) => {
        if (!session?.user?.id) return;

        // Optimistic Update
        const newLog = {
            id: crypto.randomUUID(),
            user_id: session.user.id,
            date: mealData.date || new Date().toISOString().split('T')[0], // Allow custom date
            meal_name: 'Scanned Meal',
            calories: Math.round(mealData.totals.calories),
            protein: Math.round(mealData.totals.protein),
            carbs: Math.round(mealData.totals.carbs),
            fats: Math.round(mealData.totals.fats),
            foods: mealData.foods,
            created_at: new Date().toISOString()
        };

        setNutritionLogs(prev => [...prev, newLog]);

        const { error } = await supabase
            .from('daily_nutrition')
            .insert({
                id: newLog.id, // Explicitly use the generated UUID
                user_id: session.user.id,
                date: newLog.date,
                meal_name: newLog.meal_name,
                calories: newLog.calories,
                protein: newLog.protein,
                carbs: newLog.carbs,
                fats: newLog.fats,
                foods: newLog.foods
            });

        if (error) {
            console.error("Failed to log meal:", error);
            alert(`Failed to save meal: ${error.message}`);
            // Revert optimistic update on failure
            setNutritionLogs(prev => prev.filter(l => l.id !== newLog.id));
            return null;
        }

        return newLog;
    };

    const handleUpdateLog = async (logId, updatedData) => {
        if (!session?.user?.id) return;

        // Optimistic Update
        setNutritionLogs(prev => prev.map(log =>
            log.id === logId ? { ...log, ...updatedData } : log
        ));

        const { error } = await supabase
            .from('daily_nutrition')
            .update({
                calories: Math.round(updatedData.calories),
                protein: Math.round(updatedData.protein),
                carbs: Math.round(updatedData.carbs),
                fats: Math.round(updatedData.fats),
                foods: updatedData.foods
            })
            .eq('id', logId);

        if (error) {
            console.error("Failed to update log:", error);
            alert(`Failed to update meal: ${error.message}`);
            // Revert would be complex here, assuming success for now or simple refresh needed
        }
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

    const handleSignOut = () => {
        confirmAction("Sign Out?", "Are you sure you want to sign out?", async () => {
            const { error } = await supabase.auth.signOut();
            if (error) console.error("Sign out error:", error);
            setSession(null); // Force local state clearing immediately
        });
    };

    const handleDeleteMeal = async (logId) => {
        confirmAction(
            "Delete Meal?",
            "This will remove this entry from your nutrition diary.",
            async () => {
                setNutritionLogs(prev => prev.filter(l => l.id !== logId));
                if (session?.user?.id) {
                    const { error } = await supabase.from('daily_nutrition').delete().eq('id', logId);
                    if (error) {
                        console.error("Delete meal error:", error);
                        alert("Failed to delete meal.");
                    }
                }
            }
        );
    };

    const renderScreen = () => {
        switch (currentScreen) {
            case AppScreen.Dashboard:
                return <Dashboard
                    sessions={sessions}
                    todayWorkout={getTodayWorkout()}
                    onUpdateSession={updateSession}
                    units={units}
                    onNavigateToHistory={() => setCurrentScreen(AppScreen.History)}
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
                            }
                        }}
                        units={units}
                    />
                );
            case AppScreen.Exercises:
                return <WeeklySchedule
                    weeklyPlan={weeklyPlan}
                    setWeeklyPlan={handleSetWeeklyPlan}
                    confirmAction={confirmAction}
                    units={units}
                />;
            case AppScreen.AICoach:
                return <AICoach sessions={sessions} weeklyPlan={weeklyPlan} nutritionLogs={nutritionLogs} />;
            case AppScreen.History:
                return <HistoryPage sessions={sessions} weeklyPlan={weeklyPlan} />;
            case AppScreen.Scanner:
                return <FoodScanner
                    onLogMeal={handleLogMeal}
                    onDeleteLog={handleDeleteMeal}
                    onUpdateLog={handleUpdateLog}
                    nutritionLogs={nutritionLogs}
                    profile={profile}
                    units={units}
                />;
            case AppScreen.Settings:
                return <Settings
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    confirmAction={confirmAction}
                    userEmail={session?.user?.email}
                    units={units}
                    toggleUnits={() => {
                        setUnits(prev => {
                            const newUnit = prev === 'kg' ? 'lbs' : 'kg';
                            localStorage.setItem('track_my_gains_units', newUnit);
                            return newUnit;
                        });
                    }}
                    onSignOut={handleSignOut}
                    onResetData={async () => {
                        confirmAction(
                            "Reset All Data?",
                            "This will permanently delete your workout history, custom schedule and nutrition logs. This action cannot be undone.",
                            async () => {
                                if (session?.user?.id) {
                                    const { error: e1 } = await supabase.from('sessions').delete().eq('user_id', session.user.id);
                                    const { error: e2 } = await supabase.from('weekly_plan').delete().eq('user_id', session.user.id);
                                    const { error: e3 } = await supabase.from('daily_nutrition').delete().eq('user_id', session.user.id);

                                    if (e1 || e2 || e3) {
                                        console.error("Reset error:", e1, e2, e3);
                                        alert("Failed to reset some data. Check console.");
                                    } else {
                                        // Reset local state only on success
                                        setSessions([]);
                                        setNutritionLogs([]);
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
                    onDeleteAccount={async () => {
                        confirmAction(
                            "DELETE PERMANENTLY?",
                            "Are you sure? This will WIPE all your data, profile, and effectively remove your account from our records. You will need to sign up again.",
                            async () => {
                                if (session?.user?.id) {
                                    // 1. Wipe Data
                                    await supabase.from('sessions').delete().eq('user_id', session.user.id);
                                    await supabase.from('weekly_plan').delete().eq('user_id', session.user.id);
                                    await supabase.from('daily_nutrition').delete().eq('user_id', session.user.id);

                                    // 2. Wipe Profile (Soft Delete of Account Identity)
                                    await supabase.from('profiles').delete().eq('id', session.user.id);

                                    // 3. Forced Sign Out
                                    const { error } = await supabase.auth.signOut();
                                    if (error) console.error("Sign out error:", error);
                                    setSession(null);
                                    window.location.reload(); // Hard refresh to clear any lingering state
                                }
                            }
                        );
                    }}
                />;
            default:
                return <Dashboard sessions={sessions} todayWorkout={getTodayWorkout()} onUpdateSession={updateSession} units={units} />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <ScanLine size={48} className="text-emerald-400 animate-spin-slow" />
                    <p className="text-emerald-400 font-bold tracking-widest text-sm">LOADING ASSETS...</p>
                </div>
            </div>
        );
    }

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
                onSignOut={handleSignOut}
                isMobileMenuOpen={isMobileMenuOpen}
                onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
            <MobileMenu
                currentScreen={currentScreen}
                onScreenChange={(screen) => {
                    setCurrentScreen(screen);
                    setIsMobileMenuOpen(false);
                }}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            >
                <main className="max-w-7xl mx-auto pb-24 md:pb-8">
                    {renderScreen()}
                </main>
            </MobileMenu>

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

            {showTour && (
                <OnboardingTour
                    showSetup={tourShowSetup}
                    onComplete={() => {
                        setShowTour(false);
                        localStorage.setItem('track_my_gains_tour_completed', 'true');
                        if (tourShowSetup) window.location.reload();
                    }}
                />
            )}
        </div>
    );
};

export default App;
