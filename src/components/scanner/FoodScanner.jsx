import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, ScanLine, X, ChevronRight, PieChart, Flame, Beef, Wheat, Droplet, Camera, FlipHorizontal, CheckCircle2, Calendar as CalendarIcon, ChevronLeft } from 'lucide-react';
import { analyzeFoodImage } from '../../services/groqService';

const FoodScanner = ({ onLogMeal, nutritionLogs = [], profile = null, units = 'kg' }) => {
    const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'diary'
    const [scanMode, setScanMode] = useState('food'); // 'food' | 'label'

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
        if (profile.gender === 'Male') {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
        } else {
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
            // PASS THE MODE
            const data = await analyzeFoodImage(image, scanMode);

            let foodsArray = [];
            if (data.foods && Array.isArray(data.foods)) foodsArray = data.foods;
            else if (data.food_name) foodsArray = [data];
            else throw new Error("Invalid response format from AI.");

            // Calculate totals by simple summation of the AI's detected items
            // This ensures the Big Number matches the list items perfectly.
            const totals = foodsArray.reduce((acc, item) => ({
                calories: acc.calories + (parseInt(item.calories) || 0),
                protein: acc.protein + (parseInt(item.protein) || 0),
                carbs: acc.carbs + (parseInt(item.carbs) || 0),
                fats: acc.fats + (parseInt(item.fats) || 0),
            }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

            setResult({ foods: foodsArray, totals });
        } catch (err) {
            console.error("Analysis failed:", err);
            setError(err.message || "Failed to analyze image. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        if (onLogMeal && result) {
            onLogMeal(result);
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
                            const totalCals = logs.reduce((sum, l) => sum + (l.calories || 0), 0);

                            const hasLogs = logs.length > 0;
                            const isOver = totalCals > targetCalories * 1.1;
                            const isGood = totalCals >= targetCalories * 0.9 && !isOver;

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
                            }

                            return (
                                <div
                                    key={day}
                                    onClick={() => hasLogs && setViewModal({ day, logs, totalCals, dateStr })}
                                    className={`aspect-square rounded-xl border ${borderClass} ${bgClass} p-2 flex flex-col items-center justify-between cursor-pointer hover:brightness-110 transition-all`}
                                >
                                    <span className={`text-sm font-bold ${hasLogs ? textClass : 'opacity-50'}`}>{day}</span>
                                    {hasLogs && (
                                        <div className="flex flex-col items-center">
                                            <Flame size={12} className={`fill-current mb-0.5 ${textClass}`} />
                                            <span className={`text-[10px] font-black ${textClass}`}>{totalCals}</span>
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
        <div className="h-full w-full flex flex-col items-center justify-start p-6 animate-in fade-in zoom-in-95 duration-500 overflow-y-auto pb-24">

            {/* Main Tabs */}
            <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full mb-8 relative z-10">
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
                                    <h3 className="text-2xl font-bold flex items-center gap-2">
                                        Diary Entry
                                        <span className={`text-sm px-2 py-0.5 rounded-full border ${viewModal.totalCals > targetCalories ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-emerald-500 text-emerald-500 bg-emerald-500/10'}`}>
                                            {viewModal.totalCals} / {targetCalories} kcal
                                        </span>
                                    </h3>
                                </div>

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {viewModal.logs.map((log, i) => (
                                        <div key={i} className="p-4 bg-[var(--bg-primary)] organic-shape border border-[var(--border)]">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-lg leading-tight">{log.meal_name}</h4>
                                                <span className="font-black text-[var(--accent)]">{log.calories}</span>
                                            </div>

                                            {/* Logged Foods List */}
                                            {log.foods && (
                                                <div className="space-y-1 mb-3">
                                                    {log.foods.map((food, fi) => (
                                                        <div key={fi} className="text-xs text-[var(--text-secondary)] flex justify-between">
                                                            <span>{food.name}</span>
                                                            <span className="opacity-70">{food.calories} cal</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
                                                <span className="text-emerald-500">{log.protein}g P</span>
                                                <span className="text-amber-500">{log.carbs}g C</span>
                                                <span className="text-rose-500">{log.fats}g F</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Scanner View */
                <>
                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-4xl font-black bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">Food Scanner</h2>
                        <p className="text-[var(--text-secondary)] font-medium">AI-Powered Nutrition Analysis</p>
                    </div>

                    {/* --- MODE SELECTOR --- */}
                    <div className="bg-[var(--bg-secondary)] p-1 rounded-xl flex gap-1 mb-6 border border-[var(--border)]">
                        <button
                            onClick={() => setScanMode('food')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${scanMode === 'food' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/50'}`}
                        >
                            🍎 Food Plate
                        </button>
                        <button
                            onClick={() => setScanMode('label')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${scanMode === 'label' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/50'}`}
                        >
                            📜 Nutrition Label
                        </button>
                    </div>

                    <div className="w-full max-w-2xl flex flex-col gap-6">
                        <div className="bg-[var(--bg-secondary)]/50 backdrop-blur-xl border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl relative group transition-all duration-500 hover:shadow-[var(--accent)]/10">
                            <div className={`aspect-video w-full bg-black/20 flex items-center justify-center relative overflow-hidden transition-all duration-500 ${image || isCameraOpen ? 'h-full min-h-[400px]' : 'h-80'}`}>
                                {isCameraOpen ? (
                                    <div className="relative w-full h-full bg-black">
                                        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`} />
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
                                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-8">Choose an option</h3>
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
                                        <p className="font-bold tracking-[0.2em] text-sm animate-pulse text-[var(--accent)]">ANALYZING...</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />

                            {result && (
                                <div className="p-8 animate-in slide-in-from-bottom-4 duration-500">
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
                                <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-primary)]/30">
                                    <button onClick={handleAnalyze} className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--bg-primary)] font-black text-lg rounded-2xl shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                                        <ScanLine className="group-hover:rotate-180 transition-transform duration-500" /> Analyze Nutrition
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 font-medium text-center animate-in shake">{error}</div>}

                        {result && (
                            <div className="space-y-4">
                                {/* Detected Items */}
                                <div className="flex items-center gap-2 px-2">
                                    <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Detected Items</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">{result.foods.length}</span>
                                </div>
                                <div className="grid gap-3">
                                    {result.foods.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/30 backdrop-blur-md rounded-2xl border border-[var(--border)]" style={{ animationDelay: `${index * 100}ms` }}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] font-bold shadow-sm">{index + 1}</div>
                                                <div><p className="font-bold text-[var(--text-primary)] text-lg leading-tight">{item.name}</p><p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">{item.serving_size}</p></div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-black text-[var(--text-primary)]">{item.calories} <span className="text-[10px] text-[var(--text-secondary)] font-medium uppercase">cal</span></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-3 mt-4">
                                    {onLogMeal && !saved && (
                                        <button onClick={handleSave} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                            <CheckCircle2 size={20} /> Log to Daily Diary
                                        </button>
                                    )}
                                    {saved && <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 font-bold rounded-2xl flex items-center justify-center gap-2 animate-in fade-in"><CheckCircle2 size={20} /> Saved to Diary!</div>}
                                    <button onClick={resetScanner} className="w-full py-4 text-[var(--text-secondary)] font-bold hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-2 hover:bg-[var(--bg-secondary)]/30 rounded-2xl"><ScanLine size={18} /> Scan Another Meal</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// Helper Component for Macro Circles
const MacroRing = ({ label, value, color, icon }) => (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
        <div className={`text-xl font-black ${color}`}>{parseInt(value)}<span className="text-xs text-[var(--text-secondary)] font-bold">g</span></div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{icon} {label}</div>
    </div>
);

// Helper for bar widths
const getRatio = (totals, key) => {
    const p = parseInt(totals.protein) || 0;
    const c = parseInt(totals.carbs) || 0;
    const f = parseInt(totals.fats) || 0;
    const total = p + c + f;
    if (total === 0) return '33%';
    return `${((parseInt(totals[key]) || 0) / total) * 100}%`;
};

export default FoodScanner;
