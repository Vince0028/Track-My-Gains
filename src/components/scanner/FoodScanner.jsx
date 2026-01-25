import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, ScanLine, X, ChevronRight, PieChart, Flame, Beef, Wheat, Droplet, Camera, FlipHorizontal, CheckCircle2, Calendar as CalendarIcon, ChevronLeft, Utensils, ScanBarcode, Pencil, Info, Trash2, Scale, Save, History, Search, Plus } from 'lucide-react';
import { analyzeFood } from '../../services/scannerService';

const FoodScanner = ({ onLogMeal, onDeleteLog, onUpdateLog, nutritionLogs = [], profile = null, units = 'kg' }) => {
    const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'diary'
    const [scanMode, setScanMode] = useState('food'); // 'food' | 'label'
    const [scanDate, setScanDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [showTips, setShowTips] = useState(false);
    const [weightHint, setWeightHint] = useState(''); // New State for Weight Input
    const [plateEaten, setPlateEaten] = useState('all'); // 'half' | 'most' | 'all' | 'extra'
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historySearchQuery, setHistorySearchQuery] = useState('');

    // Plate eaten multipliers - how much of the plate did you actually eat?
    const PLATE_EATEN_OPTIONS = {
        half: { label: 'Half', multiplier: 0.5, desc: 'Ate ~50%', emoji: '🍽️½' },
        most: { label: 'Most', multiplier: 0.75, desc: 'Ate ~75%', emoji: '🍽️¾' },
        all: { label: 'All', multiplier: 1.0, desc: 'Finished plate', emoji: '🍽️✓' },
        extra: { label: 'Extra', multiplier: 1.5, desc: 'Had seconds', emoji: '🍽️+' }
    };

    // Scanner State
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isMirrored, setIsMirrored] = useState(true);
    const [saved, setSaved] = useState(false);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewModal, setViewModal] = useState(null);
    const [editState, setEditState] = useState(null); // { logId, foodIndex }
    const [editValues, setEditValues] = useState({}); // { name, calories, protein, carbs, fats }
    const cameraSectionRef = useRef(null);

    // Auto-scroll to camera when opened
    useEffect(() => {
        if (isCameraOpen && cameraSectionRef.current) {
            setTimeout(() => {
                cameraSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [isCameraOpen]);

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // --- Cleanup ---
    useEffect(() => {
        return () => stopCamera();
    }, []);

    // --- TDEE Calculation ---
    const calculateTargetCalories = () => {
        if (!profile || !profile.weight || !profile.height || !profile.age || !profile.gender) {
            return 2000;
        }

        let weightKg = parseFloat(profile.weight);
        let heightCm = parseFloat(profile.height);

        if (units === 'lbs') {
            weightKg = parseFloat(profile.weight) * 0.453592;
            heightCm = parseFloat(profile.height) * 30.48;
        }

        const age = parseFloat(profile.age);

        let bmr = 0;
        // Mifflin-St Jeor Equation
        if (profile.gender === 'Male') {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
        } else if (profile.gender === 'Female') {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
        } else {
            // Default/Fallback (standard practice often defaults to female or average)
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
        }

        let tdee = bmr * 1.55;
        if (profile.fitness_goals === 'Muscle Gain') tdee += 300;
        if (profile.fitness_goals === 'Fat Loss') tdee -= 400;

        return Math.round(tdee);
    };

    const targetCalories = calculateTargetCalories();

    // --- Camera / Scanner Logic ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result);
            setResult(null);
            setError('');
            setSaved(false);
        };
        reader.readAsDataURL(file);
    };

    const startCamera = async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;

            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            if (settings.facingMode === 'environment') setIsMirrored(false);
            else setIsMirrored(true);

            setIsCameraOpen(true);
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            }, 100);
        } catch (err) {
            console.error("Camera error:", err);
            setError("Unable to access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        setImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
        setResult(null);
        setError('');
        setSaved(false);
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setLoading(true);
        setError('');
        setResult(null);
        setSaved(false);

        try {
            // PASS THE MODE, WEIGHT HINT, AND USER PROFILE
            const data = await analyzeFood(image, scanMode, weightHint, profile);

            let foodsArray = [];
            if (data.foods && Array.isArray(data.foods)) foodsArray = data.foods;
            else if (data.food_name) foodsArray = [data];
            else throw new Error("Invalid response format from AI.");

            // Initialize with quantity = 1 (user can adjust after)
            foodsArray = foodsArray.map(f => ({ ...f, quantity: 1 }));

            // Calculate totals considering quantity
            const calculateTotals = (items) => {
                return items.reduce((acc, item) => {
                    const qty = item.quantity || 1;
                    return {
                        calories: acc.calories + (parseInt(item.calories) || 0) * qty,
                        protein: acc.protein + (parseFloat(item.protein) || 0) * qty,
                        carbs: acc.carbs + (parseFloat(item.carbs) || 0) * qty,
                        fats: acc.fats + (parseFloat(item.fats) || 0) * qty,
                    };
                }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
            };

            setResult({ foods: foodsArray, totals: calculateTotals(foodsArray), confidence: data.confidence, meal_context: data.meal_context });
        } catch (err) {
            console.error("Analysis failed:", err);
            setError(err.message || "Failed to analyze image. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Re-analyze with user corrections
    const handleReanalyze = async () => {
        if (!result || !result.foods) return;
        setLoading(true);
        setError('');

        try {
            // Build a correction hint from user's edits
            const corrections = result.foods.map(f => `${f.quantity || 1}x ${f.name}`).join(', ');
            
            // Call AI with the image again but with correction hints
            const data = await analyzeFood(image, scanMode, weightHint, profile, corrections);

            let foodsArray = [];
            if (data.foods && Array.isArray(data.foods)) foodsArray = data.foods;
            else if (data.food_name) foodsArray = [data];
            else throw new Error("Invalid response format from AI.");

            // Preserve user's quantity adjustments where food names match
            foodsArray = foodsArray.map(f => {
                const existingFood = result.foods.find(ef => 
                    ef.name.toLowerCase().includes(f.name.toLowerCase()) || 
                    f.name.toLowerCase().includes(ef.name.toLowerCase())
                );
                return { ...f, quantity: existingFood?.quantity || 1 };
            });

            const calculateTotals = (items) => {
                return items.reduce((acc, item) => {
                    const qty = item.quantity || 1;
                    return {
                        calories: acc.calories + (parseInt(item.calories) || 0) * qty,
                        protein: acc.protein + (parseFloat(item.protein) || 0) * qty,
                        carbs: acc.carbs + (parseFloat(item.carbs) || 0) * qty,
                        fats: acc.fats + (parseFloat(item.fats) || 0) * qty,
                    };
                }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
            };

            setResult({ foods: foodsArray, totals: calculateTotals(foodsArray), confidence: data.confidence, meal_context: data.meal_context });
        } catch (err) {
            console.error("Re-analysis failed:", err);
            setError(err.message || "Failed to re-analyze. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Recalculate totals helper
    const recalculateResultTotals = (items) => {
        const newTotals = items.reduce((acc, item) => {
            const qty = item.quantity || 1;
            return {
                calories: acc.calories + (parseInt(item.calories) || 0) * qty,
                protein: acc.protein + (parseFloat(item.protein) || 0) * qty,
                carbs: acc.carbs + (parseFloat(item.carbs) || 0) * qty,
                fats: acc.fats + (parseFloat(item.fats) || 0) * qty,
            };
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
        setResult(prev => ({ ...prev, foods: items, totals: newTotals }));
    };

    // Add a new food item manually
    const handleAddFoodItem = () => {
        const newFood = {
            name: 'New Food Item',
            calories: 0,
            protein: '0',
            carbs: '0',
            fats: '0',
            serving_size: '1 serving',
            quantity: 1
        };
        const updatedFoods = [...result.foods, newFood];
        recalculateResultTotals(updatedFoods);
    };

    // Remove a food item
    const handleRemoveFoodItem = (index) => {
        const updatedFoods = result.foods.filter((_, i) => i !== index);
        recalculateResultTotals(updatedFoods);
    };

    const handleSave = () => {
        if (onLogMeal && result) {
            onLogMeal({ ...result, date: scanDate });
            setSaved(true);
        }
    };

    const resetScanner = () => {
        setImage(null);
        setResult(null);
        setError('');
        setSaved(false);
        stopCamera();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };


    // New: Handle Quantity Update in Diary Modal
    const handleUpdateLogQuantity = async (log, foodIndex, delta) => {
        if (!onUpdateLog) return;

        const updatedFoods = [...log.foods];
        const item = updatedFoods[foodIndex];
        const currentQty = item.quantity || 1;
        const newQty = Math.max(0.5, currentQty + delta);

        updatedFoods[foodIndex] = { ...item, quantity: newQty };

        // Recalculate Log Totals
        const newTotals = updatedFoods.reduce((acc, f) => {
            const q = f.quantity || 1;
            return {
                calories: acc.calories + (parseInt(f.calories) || 0) * q,
                protein: acc.protein + (parseFloat(f.protein) || 0) * q,
                carbs: acc.carbs + (parseFloat(f.carbs) || 0) * q,
                fats: acc.fats + (parseFloat(f.fats) || 0) * q,
            };
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

        const updatedLog = {
            ...log,
            foods: updatedFoods,
            calories: newTotals.calories,
            protein: newTotals.protein,
            carbs: newTotals.carbs,
            fats: newTotals.fats
        };

        // Call Parent Update
        await onUpdateLog(log.id, updatedLog);

        // Update Local Modal State
        setViewModal(prev => {
            const newLogs = prev.logs.map(l => l.id === log.id ? updatedLog : l);
            const newTotal = newLogs.reduce((sum, l) => sum + (l.calories || 0), 0);
            return { ...prev, logs: newLogs, totalCals: newTotal };
        });
    };

    // New: Handle Renaming
    const handleNameChange = (index, newName) => {
        const updatedFoods = [...result.foods];
        updatedFoods[index].name = newName;
        recalculateResultTotals(updatedFoods);
    };

    // New: Handle Quantity Change
    const handleQuantityChange = (index, delta) => {
        const updatedFoods = [...result.foods];
        const currentQty = updatedFoods[index].quantity || 1;
        const newQty = Math.max(0.5, currentQty + delta); // Min 0.5
        updatedFoods[index].quantity = newQty;
        recalculateResultTotals(updatedFoods);
    };

    // New: Handle Deletion from Modal
    const handleDeleteLogItem = async (logId) => {
        if (onDeleteLog) {
            await onDeleteLog(logId);
            // Update the local modal view
            setViewModal(prev => {
                const newLogs = prev.logs.filter(l => l.id !== logId);
                const newTotals = calculateDailyTotals(newLogs);
                if (newLogs.length === 0) return null; // Close if empty
                return { ...prev, logs: newLogs, ...newTotals };
            });
        }
    };

    // New: Edit Logic
    const handleEditClick = (log, foodIndex, food) => {
        setEditState({ logId: log.id, foodIndex });
        setEditValues({
            name: food.name,
            calories: Math.round((parseInt(food.calories) || 0) * (food.quantity || 1)),
            protein: ((parseFloat(food.protein) || 0) * (food.quantity || 1)).toFixed(1),
            carbs: ((parseFloat(food.carbs) || 0) * (food.quantity || 1)).toFixed(1),
            fats: ((parseFloat(food.fats) || 0) * (food.quantity || 1)).toFixed(1)
        });
    };

    const handleCancelEdit = () => {
        setEditState(null);
        setEditValues({});
    };

    const handleSaveEdit = async () => {
        if (!editState || !onUpdateLog) return;

        const { logId, foodIndex } = editState;
        const log = viewModal.logs.find(l => l.id === logId);
        if (!log) return;

        const updatedFoods = [...log.foods];
        const currentQty = updatedFoods[foodIndex].quantity || 1;

        // The user edits the TOTAL values. We must divide by quantity to store the correct "per unit" values.
        updatedFoods[foodIndex] = {
            ...updatedFoods[foodIndex],
            name: editValues.name,
            quantity: currentQty, // Preserve formatting quantity
            calories: (parseInt(editValues.calories) || 0) / currentQty,
            protein: (parseFloat(editValues.protein) || 0) / currentQty,
            carbs: (parseFloat(editValues.carbs) || 0) / currentQty,
            fats: (parseFloat(editValues.fats) || 0) / currentQty
        };

        const newTotals = updatedFoods.reduce((acc, f) => {
            const q = f.quantity || 1;
            return {
                calories: acc.calories + (parseInt(f.calories) || 0) * q,
                protein: acc.protein + (parseFloat(f.protein) || 0) * q,
                carbs: acc.carbs + (parseFloat(f.carbs) || 0) * q,
                fats: acc.fats + (parseFloat(f.fats) || 0) * q,
            };
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

        const updatedLog = {
            ...log,
            foods: updatedFoods,
            calories: newTotals.calories,
            protein: newTotals.protein,
            carbs: newTotals.carbs,
            fats: newTotals.fats
        };

        await onUpdateLog(logId, updatedLog);

        setViewModal(prev => {
            const newLogs = prev.logs.map(l => l.id === logId ? updatedLog : l);
            const dailyTotals = calculateDailyTotals(newLogs);
            return { ...prev, logs: newLogs, ...dailyTotals };
        });

        handleCancelEdit();
    };

    const calculateDailyTotals = (logs) => {
        return logs.reduce((acc, log) => ({
            totalCals: acc.totalCals + (log.calories || 0),
            totalProtein: acc.totalProtein + (log.protein || 0),
            totalCarbs: acc.totalCarbs + (log.carbs || 0),
            totalFats: acc.totalFats + (log.fats || 0)
        }), { totalCals: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 });
    };

    // --- History / Past Meals Logic ---
    const getSmartMealName = (log) => {
        if (log.meal_name === 'Scanned Meal' && log.foods && log.foods.length > 0) {
            // Group duplicate items by normalized name
            const grouped = log.foods.reduce((acc, food) => {
                const key = food.name.trim().toLowerCase();
                if (!acc[key]) {
                    acc[key] = {
                        name: food.name.trim(), // Keep original case of first occurrence
                        count: 0,
                        serving: food.serving_size
                    };
                }
                acc[key].count += (food.quantity || 1);
                return acc;
            }, {});

            return Object.values(grouped).map(item => {
                const qtyStr = item.count % 1 === 0 ? item.count : item.count.toFixed(1);
                const servingStr = item.serving ? ` (${item.serving})` : '';
                return `${qtyStr}x ${item.name}${servingStr}`;
            }).join(', ');
        }
        return log.meal_name;
    };

    // Helper to get a stable key for deduplication (ignoring quantity)
    const getCanonicalMealKey = (log) => {
        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

        if (log.meal_name === 'Scanned Meal' && log.foods && log.foods.length > 0) {
            // Sor food names to handle order differences: "Apple, Banana" == "Banana, Apple"
            return log.foods
                .map(f => normalize(f.name))
                .sort()
                .join('|');
        }
        return normalize(log.meal_name);
    };

    const uniquePastMeals = React.useMemo(() => {
        const unique = new Map();
        [...nutritionLogs].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)).forEach(log => {
            // Use canonical key (food names only) to dedupe "1x Item" vs "2x Item"
            const key = getCanonicalMealKey(log);

            if (!unique.has(key)) {
                // Store the log with the smart name injected
                unique.set(key, { ...log, displayName: getSmartMealName(log) });
            }
        });
        return Array.from(unique.values());
    }, [nutritionLogs]);

    const filteredHistory = uniquePastMeals.filter(m =>
        m.displayName.toLowerCase().includes(historySearchQuery.toLowerCase())
    );

    const handleAddFromHistory = async (pastMeal) => {
        if (!onLogMeal || !viewModal) return;

        // Construct payload compatible with App.jsx handleLogMeal
        // App.jsx expects { date, totals: { calories, protein... }, foods, ... }
        const payload = {
            ...pastMeal,
            meal_name: pastMeal.displayName || pastMeal.meal_name, // Use the smart name for the new entry
            date: viewModal.dateStr,
            totals: {
                calories: pastMeal.calories,
                protein: pastMeal.protein,
                carbs: pastMeal.carbs,
                fats: pastMeal.fats
            }
        };

        // 1. Call Parent Log Function (Updates DB + App State)
        const newLog = await onLogMeal(payload);

        if (!newLog) return; // Stop if logging failed

        // 2. Optimistically update the VIEW MODAL list so user sees it instantly
        // Use the returned newLog which has the Real UUID, allowing immediate updates/edits
        setViewModal(prev => {
            const newLogs = [...prev.logs, newLog];
            const dailyTotals = calculateDailyTotals(newLogs);
            return {
                ...prev,
                logs: newLogs,
                ...dailyTotals
            };
        });

        setShowHistoryModal(false);
    };

    // --- Render Helpers ---
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const calendarGrid = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
        const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        return (
            <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6 px-4">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-[var(--bg-primary)] rounded-full transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                        {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-[var(--bg-primary)] rounded-full transition-colors">
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* TDEE Summary Box */}
                <div className="mb-8 p-6 bg-[var(--bg-secondary)]/50 organic-shape organic-border subtle-depth flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <Flame size={24} className="fill-current" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Daily Target</p>
                            <p className="text-2xl font-black">{targetCalories} <span className="text-sm font-medium opacity-60">kcal</span></p>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="bg-[var(--bg-secondary)] organic-shape organic-border p-4">
                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {weekDays.map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {calendarGrid.map((day, index) => {
                            if (!day) return <div key={`empty-${index}`} className="aspect-square" />;

                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const logs = nutritionLogs.filter(l => l.date === dateStr);
                            const dailyTotals = calculateDailyTotals(logs);

                            const hasLogs = logs.length > 0;
                            const isOver = dailyTotals.totalCals > targetCalories * 1.1;
                            const isGood = dailyTotals.totalCals >= targetCalories * 0.9 && !isOver;

                            // Determine if date is clickable (Today or Past)
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            const isFuture = dateStr > todayStr;
                            const isClickable = hasLogs || !isFuture;

                            // Color Logic
                            let bgClass = "bg-[var(--bg-primary)]";
                            let textClass = "text-[var(--text-secondary)]";
                            let borderClass = "border-transparent";

                            if (hasLogs) {
                                if (isOver) {
                                    bgClass = "bg-rose-500/10";
                                    textClass = "text-rose-500";
                                    borderClass = "border-rose-500/30";
                                } else if (isGood) {
                                    bgClass = "bg-emerald-500/10";
                                    textClass = "text-emerald-500";
                                    borderClass = "border-emerald-500/30";
                                } else {
                                    bgClass = "bg-amber-500/10";
                                    textClass = "text-amber-500";
                                    borderClass = "border-amber-500/30";
                                }
                            } else if (isClickable) {
                                // Style for empty clickable days
                                bgClass = "bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)]";
                                textClass = "text-[var(--text-secondary)]";
                                borderClass = "border-[var(--border)] border-dashed opacity-50";
                                if (dateStr === todayStr) {
                                    borderClass = "border-[var(--accent)] border opacity-100";
                                    textClass = "text-[var(--accent)]";
                                }
                            }

                            return (
                                <div
                                    key={day}
                                    onClick={() => isClickable && setViewModal({
                                        day,
                                        logs,
                                        totalCals: dailyTotals.totalCals,
                                        totalProtein: dailyTotals.totalProtein,
                                        totalCarbs: dailyTotals.totalCarbs,
                                        totalFats: dailyTotals.totalFats,
                                        dateStr
                                    })}
                                    className={`aspect-square rounded-xl border ${borderClass} ${bgClass} p-2 flex flex-col items-center justify-between transition-all ${isClickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default opacity-30'}`}
                                >
                                    <span className={`text-sm font-bold ${textClass}`}>{day}</span>
                                    {hasLogs && (
                                        <div className="flex flex-col items-center">
                                            <Flame size={12} className={`fill-current mb-0.5 ${textClass}`} />
                                            <span className={`text-[10px] font-black ${textClass}`}>{dailyTotals.totalCals}</span>
                                        </div>
                                    )}
                                    {!hasLogs && isClickable && dateStr === todayStr && (
                                        <div className="flex flex-col items-center opacity-50">
                                            <Plus size={12} className="text-[var(--accent)]" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };


    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-500 overflow-y-auto pb-24">

            {/* Main Tabs */}
            <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full mb-4 relative z-10">
                <button
                    onClick={() => setActiveTab('scan')}
                    className={`px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'scan' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    <ScanLine size={16} /> Scan Meal
                </button>
                <button
                    onClick={() => setActiveTab('diary')}
                    className={`px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'diary' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    <CalendarIcon size={16} /> Nutrition Diary
                </button>
            </div>

            {activeTab === 'diary' ? (
                <>
                    {renderCalendar()}
                    {/* View Details Modal */}
                    {viewModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200">
                            <div className="bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth p-6 max-w-sm w-full space-y-6 shadow-2xl relative">
                                <button onClick={() => setViewModal(null)} className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={20} /></button>

                                <div>
                                    <div className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-1">{viewModal.dateStr}</div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-2xl font-bold flex items-center gap-2">
                                            Diary Entry
                                        </h3>
                                        <span className={`text-sm px-2 py-0.5 rounded-full border ${viewModal.totalCals > targetCalories ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-emerald-500 text-emerald-500 bg-emerald-500/10'}`}>
                                            {Math.round(viewModal.totalCals)} / {targetCalories} kcal
                                        </span>
                                    </div>

                                    {/* Add From History Button */}
                                    <button
                                        onClick={() => setShowHistoryModal(true)}
                                        className="w-full mb-4 py-3 bg-[var(--bg-primary)] border border-dashed border-[var(--accent)] text-[var(--accent)] rounded-xl font-bold text-sm hover:bg-[var(--accent)]/5 hover:border-solid transition-all flex items-center justify-center gap-2"
                                    >
                                        <History size={16} /> Add from History
                                    </button>

                                    {/* Daily Macro Summary */}
                                    <div className="flex justify-between bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border)]">
                                        <MacroRing label="Protein" value={viewModal.totalProtein} color="text-emerald-400" icon={<Beef size={14} />} />
                                        <MacroRing label="Carbs" value={viewModal.totalCarbs} color="text-amber-400" icon={<Wheat size={14} />} />
                                        <MacroRing label="Fats" value={viewModal.totalFats} color="text-rose-400" icon={<Droplet size={14} />} />
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {viewModal.logs.map((log, i) => (
                                        <div key={i} className="p-4 bg-[var(--bg-primary)] organic-shape border border-[var(--border)] relative group">
                                            {/* DELETE BUTTON */}
                                            {onDeleteLog && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteLogItem(log.id); }}
                                                    className="absolute top-2 right-2 p-1.5 bg-rose-500/10 text-rose-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}

                                            <div className="flex justify-between items-start mb-2 pr-6">
                                                <h4 className="font-bold text-lg leading-tight">{log.meal_name}</h4>
                                                <span className="font-black text-[var(--accent)]">{log.calories}</span>
                                            </div>

                                            {/* Logged Foods List */}
                                            {log.foods && (
                                                <div className="space-y-1 mb-3">
                                                    {log.foods.map((food, fi) => {
                                                        const isEditing = editState && editState.logId === log.id && editState.foodIndex === fi;

                                                        if (isEditing) {
                                                            return (
                                                                <div key={fi} className="flex flex-col gap-2 p-2 bg-[var(--bg-secondary)] border border-[var(--accent)] rounded-lg">
                                                                    <input
                                                                        type="text"
                                                                        value={editValues.name}
                                                                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                                                        className="bg-transparent font-bold text-sm border-b border-[var(--border)] focus:border-[var(--accent)] outline-none"
                                                                        placeholder="Food Name"
                                                                    />
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        <div className="flex flex-col">
                                                                            <label className="text-[8px] text-[var(--text-secondary)] uppercase">Cal</label>
                                                                            <input type="number" value={editValues.calories} onChange={(e) => setEditValues({ ...editValues, calories: e.target.value })} className="bg-transparent text-xs font-mono border-b border-[var(--border)] focus:border-[var(--accent)] outline-none" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <label className="text-[8px] text-emerald-500 uppercase">Pro</label>
                                                                            <input type="number" value={editValues.protein} onChange={(e) => setEditValues({ ...editValues, protein: e.target.value })} className="bg-transparent text-xs font-mono border-b border-emerald-500/30 focus:border-emerald-500 outline-none text-emerald-500" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <label className="text-[8px] text-amber-500 uppercase">Carb</label>
                                                                            <input type="number" value={editValues.carbs} onChange={(e) => setEditValues({ ...editValues, carbs: e.target.value })} className="bg-transparent text-xs font-mono border-b border-amber-500/30 focus:border-amber-500 outline-none text-amber-500" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <label className="text-[8px] text-rose-500 uppercase">Fat</label>
                                                                            <input type="number" value={editValues.fats} onChange={(e) => setEditValues({ ...editValues, fats: e.target.value })} className="bg-transparent text-xs font-mono border-b border-rose-500/30 focus:border-rose-500 outline-none text-rose-500" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2 mt-1">
                                                                        <button onClick={handleSaveEdit} className="flex-1 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded py-1 flex items-center justify-center transition-colors"><Save size={14} /></button>
                                                                        <button onClick={handleCancelEdit} className="flex-1 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded py-1 flex items-center justify-center transition-colors"><X size={14} /></button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div key={fi} className="flex flex-col gap-1 border-b border-[var(--border)]/50 pb-2 last:border-0 group/item">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm font-medium">{food.name}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(log, fi, food); }}
                                                                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent)] opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                        >
                                                                            <Pencil size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-md px-1 py-0.5 border border-[var(--border)]">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateLogQuantity(log, fi, -0.5); }} className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded font-bold">-</button>
                                                                        <span className="text-[10px] font-bold w-6 text-center">{food.quantity || 1}x</span>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateLogQuantity(log, fi, 0.5); }} className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded font-bold">+</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
                                                {/* Calculate precise macros from foods array if available to show decimals */}
                                                <span className="text-emerald-500">
                                                    {log.foods ? log.foods.reduce((sum, f) => sum + (parseFloat(f.protein) || 0) * (f.quantity || 1), 0).toFixed(1) : log.protein}g P
                                                </span>
                                                <span className="text-amber-500">
                                                    {log.foods ? log.foods.reduce((sum, f) => sum + (parseFloat(f.carbs) || 0) * (f.quantity || 1), 0).toFixed(1) : log.carbs}g C
                                                </span>
                                                <span className="text-rose-500">
                                                    {log.foods ? log.foods.reduce((sum, f) => sum + (parseFloat(f.fats) || 0) * (f.quantity || 1), 0).toFixed(1) : log.fats}g F
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Modal Overlay - Moved to Correct Place */}
                    {showHistoryModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200">
                            <div className="bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
                                <button onClick={() => setShowHistoryModal(false)} className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={20} /></button>
                                <h3 className="text-xl font-bold">Past Meals</h3>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search history..."
                                        value={historySearchQuery}
                                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
                                    />
                                </div>

                                {/* List */}
                                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredHistory.map((meal, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAddFromHistory(meal)}
                                            className="w-full text-left p-3 bg-[var(--bg-primary)] organic-shape border border-[var(--border)] hover:border-[var(--accent)] transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm truncate pr-2 text-[var(--text-primary)]">{meal.displayName}</span>
                                                <span className="text-[var(--accent)] font-bold text-xs">{meal.calories}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                                                <span>{meal.protein}P • {meal.carbs}C • {meal.fats}F</span>
                                                <span className="group-hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                    <Plus size={10} /> Add
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <p className="text-center text-[var(--text-secondary)] text-xs py-4">No matching meals found.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Scanner View */
                <>
                    <div className="text-center space-y-2 mb-4">
                        <h2 className="text-4xl font-black bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">Food Scanner</h2>
                        <p className="text-[var(--text-secondary)] font-medium">AI-Powered Nutrition Analysis</p>
                    </div>

                    {/* --- MODE SELECTOR --- */}
                    <div className="flex flex-col gap-2 mb-4 w-full max-w-sm mx-auto">
                        <div className="bg-[var(--bg-secondary)] p-1 rounded-xl flex gap-1 border border-[var(--border)]">
                            <button onClick={() => setScanMode('food')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${scanMode === 'food' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/50'}`}>
                                <Utensils size={18} /> Food Plate
                            </button>
                            <button onClick={() => setScanMode('label')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${scanMode === 'label' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/50'}`}>
                                <ScanBarcode size={18} /> Nutrition Label
                            </button>
                        </div>

                        <button onClick={() => setShowTips(!showTips)} className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors py-2">
                            <Info size={14} /> Tips for best results
                        </button>

                        {showTips && (
                            <div className="bg-[var(--bg-secondary)]/50 border border-[var(--border)] rounded-xl p-4 text-sm animate-in slide-in-from-top-2">
                                <h4 className="font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                    {scanMode === 'food' ? <Utensils size={14} className="text-[var(--accent)]" /> : <ScanBarcode size={14} className="text-[var(--accent)]" />}
                                    {scanMode === 'food' ? "Food Mode Tips" : "Label Mode Tips"}
                                </h4>
                                <ul className="space-y-1 text-[var(--text-secondary)] list-disc pl-4 marker:text-[var(--accent)]">
                                    {scanMode === 'food' ? (
                                        <>
                                            <li><strong>Lighting:</strong> Natural light works best. Avoid harsh shadows.</li>
                                            <li><strong>Angle:</strong> Shoot from 45° above to show depth and portions.</li>
                                            <li><strong>Full plate:</strong> Include the entire plate edges for size reference.</li>
                                            <li><strong>Separate items:</strong> Spread out food if piled up for better detection.</li>
                                            <li><strong>Include sauces:</strong> Show dressings and sauces for accurate calories.</li>
                                            <li><strong>Brand visible:</strong> If packaged food, show the brand label.</li>
                                        </>
                                    ) : (
                                        <>
                                            <li>Ensure the "Nutrition Facts" table is clearly visible.</li>
                                            <li>Avoid glare or reflections on shiny packaging.</li>
                                            <li>Hold the camera steady to keep text sharp.</li>
                                            <li>Flatten the package if possible to avoid distorted text.</li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="w-full max-w-2xl flex flex-col gap-6">
                        <div ref={cameraSectionRef} className="bg-[var(--bg-secondary)]/50 backdrop-blur-xl border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl relative group transition-all duration-500 hover:shadow-[var(--accent)]/10">
                            <div className={`aspect-video w-full bg-black/20 flex items-center justify-center relative overflow-hidden transition-all duration-500 ${image || isCameraOpen ? 'h-full min-h-[400px]' : 'h-80'}`}>
                                {isCameraOpen ? (
                                    <div className="relative w-full h-full bg-black">
                                        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`} />
                                        <div className="absolute top-6 left-0 right-0 z-20 text-center">
                                            <span className="bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20">
                                                {scanMode === 'food' ? "Point at your meal" : "Perform Valid OCR Scan on Label"}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8 z-20">
                                            <button onClick={stopCamera} className="p-4 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all border border-white/10"><X size={24} /></button>
                                            <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"><div className="w-16 h-16 rounded-full bg-white transition-all active:scale-90" /></button>
                                            <button onClick={() => setIsMirrored(!isMirrored)} className={`p-4 backdrop-blur-md rounded-full transition-all border border-white/10 ${isMirrored ? 'bg-[var(--accent)]/80 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}><FlipHorizontal size={24} /></button>
                                        </div>
                                    </div>
                                ) : image ? (
                                    <>
                                        <img src={image} alt="Food Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                        <button onClick={resetScanner} className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-rose-500 transition-all active:scale-95 z-10 border border-white/10"><X size={20} /></button>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-8">
                                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-8">{scanMode === 'food' ? "Upload or Snap your Meal" : "Scan Nutrition Facts Label"}</h3>
                                        <div className="flex gap-8 w-full max-w-md justify-center">
                                            <div onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-[var(--bg-primary)]/40 border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer transition-all group/opt">
                                                <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center group-hover/opt:scale-110 transition-transform"><Upload size={28} /></div>
                                                <span className="font-bold text-[var(--text-primary)]">Upload Photo</span>
                                            </div>
                                            <div onClick={startCamera} className="flex-1 flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-[var(--bg-primary)]/40 border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer transition-all group/opt">
                                                <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center group-hover/opt:scale-110 transition-transform"><Camera size={28} /></div>
                                                <span className="font-bold text-[var(--text-primary)]">Open Camera</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {loading && (
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4 z-20">
                                        <div className="relative"><div className="absolute inset-0 bg-[var(--accent)] blur-xl opacity-20 animate-pulse"></div><Loader2 size={56} className="animate-spin text-[var(--accent)] relative z-10" /></div>
                                        <p className="font-bold tracking-[0.2em] text-sm animate-pulse text-[var(--accent)]">{scanMode === 'food' ? "ANALYZING FOOD..." : "READING LABEL..."}</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />

                            {result && (
                                <div className="p-8 animate-in slide-in-from-bottom-4 duration-500">
                                    {/* Confidence & Context Badge */}
                                    {(result.confidence || result.meal_context) && (
                                        <div className="flex items-center gap-2 mb-4">
                                            {result.confidence && (
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    result.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' :
                                                    result.confidence === 'medium' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                                                    'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                                                }`}>
                                                    {result.confidence} confidence
                                                </span>
                                            )}
                                            {result.meal_context && (
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)]">
                                                    {result.meal_context.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between gap-4 mb-8">
                                        <div className="flex flex-col items-start">
                                            <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Flame size={12} className="text-orange-500" /> Calories</span>
                                            <span className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{result.totals.calories}</span>
                                        </div>
                                        <div className="flex-1 flex gap-4 justify-end">
                                            <MacroRing label="Protein" value={result.totals.protein} color="text-emerald-400" icon={<Beef size={14} />} />
                                            <MacroRing label="Carbs" value={result.totals.carbs} color="text-amber-400" icon={<Wheat size={14} />} />
                                            <MacroRing label="Fats" value={result.totals.fats} color="text-rose-400" icon={<Droplet size={14} />} />
                                        </div>
                                    </div>
                                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex mb-2">
                                        <div style={{ width: getRatio(result.totals, 'protein') }} className="h-full bg-emerald-500/80" />
                                        <div style={{ width: getRatio(result.totals, 'carbs') }} className="h-full bg-amber-500/80" />
                                        <div style={{ width: getRatio(result.totals, 'fats') }} className="h-full bg-rose-500/80" />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-medium px-1">
                                        <span className="text-emerald-400">Protein</span><span className="text-amber-400">Carbs</span><span className="text-rose-400">Fats</span>
                                    </div>
                                </div>
                            )}

                            {image && !result && !loading && !isCameraOpen && (
                                <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-primary)]/30 space-y-4">
                                    {scanMode === 'food' && (
                                        <>
                                            {/* Optional Weight Input - collapsed by default */}
                                            <details className="group">
                                                <summary className="flex items-center gap-2 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
                                                    <Scale size={16} />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Advanced: Enter weight (optional)</span>
                                                    <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                                                </summary>
                                                <div className="mt-3 flex items-center gap-3 bg-[var(--bg-secondary)] px-4 py-3 rounded-xl border border-[var(--border)]">
                                                    <div className="flex-1">
                                                        <input
                                                            type="number"
                                                            placeholder="Total plate weight in grams (e.g. 450)"
                                                            value={weightHint}
                                                            onChange={(e) => setWeightHint(e.target.value)}
                                                            className="w-full bg-transparent font-bold text-[var(--text-primary)] placeholder:font-normal placeholder:text-sm focus:outline-none"
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--text-secondary)]">g</span>
                                                </div>
                                            </details>
                                        </>
                                    )}

                                    <button onClick={handleAnalyze} className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--bg-primary)] font-black text-lg rounded-2xl shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                                        <ScanLine className="group-hover:rotate-180 transition-transform duration-500" /> Analyze Nutrition
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 font-medium text-center animate-in shake">{error}</div>}

                        {result && (
                            <div className="space-y-4">
                                {/* Detected Items Header */}
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Detected Items</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">{result.foods.length}</span>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-secondary)]">Tap name to edit</p>
                                </div>

                                {/* Edit hint */}
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
                                    <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-300/80">
                                        <strong>Wrong food detected?</strong> Edit the name below, adjust the quantity, then tap "Re-analyze" for accurate nutrition data.
                                    </p>
                                </div>

                                <div className="grid gap-3">
                                    {result.foods.map((item, index) => (
                                        <div key={index} className="flex flex-col p-4 bg-[var(--bg-secondary)]/30 backdrop-blur-md rounded-2xl border border-[var(--border)] relative group" style={{ animationDelay: `${index * 100} ms` }}>
                                            {/* Delete button */}
                                            {!saved && result.foods.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveFoodItem(index)}
                                                    className="absolute top-2 right-2 p-1.5 bg-rose-500/10 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] font-bold shadow-sm">{index + 1}</div>
                                                    <div className="flex-1">
                                                        {/* Always editable food name */}
                                                        <div className="flex items-center gap-2 group/edit">
                                                            <input
                                                                type="text"
                                                                value={item.name}
                                                                onChange={(e) => handleNameChange(index, e.target.value)}
                                                                className="bg-transparent font-bold text-[var(--text-primary)] text-lg leading-tight w-full focus:outline-none focus:border-b-2 border-[var(--accent)] transition-all placeholder:opacity-50"
                                                                placeholder="Enter food name..."
                                                            />
                                                            <Pencil size={12} className="opacity-30 group-hover/edit:opacity-70 text-[var(--accent)] flex-shrink-0" />
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-xs text-[var(--text-secondary)] font-medium">{item.serving_size}</p>
                                                            {item.cooking_method && item.cooking_method !== 'added' && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] capitalize">{item.cooking_method}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 pr-6">
                                                    <span className="font-black text-[var(--text-primary)]">{Math.round((parseInt(item.calories) || 0) * (item.quantity || 1))} <span className="text-[10px] text-[var(--text-secondary)] font-medium uppercase">cal</span></span>
                                                </div>
                                            </div>

                                            {/* Quantity Control Row */}
                                            <div className="flex items-center justify-between pl-14">
                                                <div className="flex items-center gap-3 bg-[var(--bg-primary)] rounded-lg p-1 border border-[var(--border)]">
                                                    <button onClick={() => handleQuantityChange(index, -0.5)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-bold">-</button>
                                                    <span className="text-xs font-bold w-8 text-center">{item.quantity || 1}x</span>
                                                    <button onClick={() => handleQuantityChange(index, 0.5)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold">+</button>
                                                </div>
                                                <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                                                    {(parseFloat(item.protein) * (item.quantity || 1)).toFixed(1)}g P • {(parseFloat(item.carbs) * (item.quantity || 1)).toFixed(1)}g C • {(parseFloat(item.fats) * (item.quantity || 1)).toFixed(1)}g F
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add food item button */}
                                    {!saved && (
                                        <button
                                            onClick={handleAddFoodItem}
                                            className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-2xl text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> Add missing food item
                                        </button>
                                    )}
                                </div>

                                {/* Re-analyze Button */}
                                {!saved && (
                                    <button 
                                        onClick={handleReanalyze} 
                                        disabled={loading}
                                        className="w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" /> Re-analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <ScanLine size={18} /> Re-analyze with my corrections
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-3 mt-4">
                                    {onLogMeal && !saved && (
                                        <button onClick={handleSave} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                            <CheckCircle2 size={20} /> Log to Daily Diary
                                        </button>
                                    )}
                                    {saved && <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 font-bold rounded-2xl flex items-center justify-center gap-2 animate-in fade-in"><CheckCircle2 size={20} /> Saved to Diary!</div>}

                                    {!saved && (
                                        <div className="flex items-center gap-2 bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--border)]">
                                            <CalendarIcon size={16} className="text-[var(--text-secondary)]" />
                                            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Log Date:</span>
                                            <input
                                                type="date"
                                                value={scanDate}
                                                onChange={(e) => setScanDate(e.target.value)}
                                                className="bg-transparent text-sm font-bold text-[var(--text-primary)] focus:outline-none flex-1 text-right"
                                            />
                                        </div>
                                    )}

                                    <button onClick={resetScanner} className="w-full py-4 text-[var(--text-secondary)] font-bold hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-2 hover:bg-[var(--bg-secondary)]/30 rounded-2xl"><ScanLine size={18} /> Scan Another Meal</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )
            }
        </div >
    );
};

// Helper Component for Macro Circles
const MacroRing = ({ label, value, color, icon }) => (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
        <div className={`text-xl font-black ${color}`}>{typeof value === 'number' ? Math.round(value * 10) / 10 : value}<span className="text-xs text-[var(--text-secondary)] font-bold">g</span></div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{icon} {label}</div>
    </div>
);

// Helper for bar widths
const getRatio = (totals, key) => {
    const p = parseFloat(totals.protein) || 0;
    const c = parseFloat(totals.carbs) || 0;
    const f = parseFloat(totals.fats) || 0;
    const total = p + c + f;
    if (total === 0) return '33%';
    return `${((parseFloat(totals[key]) || 0) / total) * 100}%`;
};

export default FoodScanner;
