import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, ScanLine, X, ChevronRight, PieChart, Flame, Beef, Wheat, Droplet, Camera, FlipHorizontal } from 'lucide-react';
import { analyzeFoodImage } from '../../services/groqService';

const FoodScanner = () => {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isMirrored, setIsMirrored] = useState(true); // Default to mirrored for natural feel

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Stop camera when component unmounts
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result);
            setResult(null);
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const startCamera = async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;

            // Auto-detect if we should mirror (User facing = mirror, Env facing = no mirror)
            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            // If facingMode is available and is 'environment', don't mirror by default
            if (settings.facingMode === 'environment') {
                setIsMirrored(false);
            } else {
                setIsMirrored(true); // Webcams/Front cams usually better mirrored
            }

            setIsCameraOpen(true);
            // Small delay to ensure video element is rendered
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
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

        // If mirrored, we need to flip the capture too so it matches the preview OR capture it straight?
        // Usually scanners capture 'reality' (straight), but if user frame aimed using mirror...
        // Let's capture exactly what's on the video element (straight) to ensure text readability.
        // Wait, if I mirror the video via CSS, the actual video data is NOT mirrored.
        // So drawing video to canvas will be STRAIGHT (Readable Code). This is correct for Scanner.
        // The Preview is Mirrored (Natural User Feel), Capture is Straight (Readability).

        ctx.drawImage(videoRef.current, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
        setResult(null);
        setError('');
    };

    const handleAnalyze = async () => {
        if (!image) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const data = await analyzeFoodImage(image);

            // Normalize data
            let foodsArray = [];
            if (data.foods && Array.isArray(data.foods)) {
                foodsArray = data.foods;
            } else if (data.food_name) {
                foodsArray = [data];
            } else {
                throw new Error("Invalid response format from AI.");
            }

            // Calculate totals
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

    const resetScanner = () => {
        setImage(null);
        setResult(null);
        setError('');
        stopCamera();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-start p-6 animate-in fade-in zoom-in-95 duration-500 overflow-y-auto pb-24">

            {/* Header */}
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-4xl font-black bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">Food Scanner</h2>
                <p className="text-[var(--text-secondary)] font-medium">AI-Powered Nutrition Analysis</p>
            </div>

            <div className="w-full max-w-2xl flex flex-col gap-6">

                {/* Main Card: Image & Upload */}
                <div className="bg-[var(--bg-secondary)]/50 backdrop-blur-xl border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl relative group transition-all duration-500 hover:shadow-[var(--accent)]/10">

                    {/* Image Area / Camera View */}
                    <div className={`aspect-video w-full bg-black/20 flex items-center justify-center relative overflow-hidden transition-all duration-500 ${image || isCameraOpen ? 'h-full min-h-[400px]' : 'h-80'}`}>
                        {isCameraOpen ? (
                            <div className="relative w-full h-full bg-black">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className={`w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`}
                                />
                                {/* Camera Controls */}
                                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8 z-20">
                                    <button
                                        onClick={stopCamera}
                                        className="p-4 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all border border-white/10"
                                    >
                                        <X size={24} />
                                    </button>
                                    <button
                                        onClick={capturePhoto}
                                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white transition-all active:scale-90" />
                                    </button>
                                    {/* Mirror Toggle */}
                                    <button
                                        onClick={() => setIsMirrored(!isMirrored)}
                                        className={`p-4 backdrop-blur-md rounded-full transition-all border border-white/10 ${isMirrored ? 'bg-[var(--accent)]/80 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                        title="Flip Camera View"
                                    >
                                        <FlipHorizontal size={24} />
                                    </button>
                                </div>
                            </div>
                        ) : image ? (
                            <>
                                <img src={image} alt="Food Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                <button
                                    onClick={resetScanner}
                                    className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-rose-500 transition-all active:scale-95 z-10 border border-white/10"
                                >
                                    <X size={20} />
                                </button>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8">
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-8">Choose an option</h3>

                                <div className="flex gap-8 w-full max-w-md justify-center">
                                    {/* Upload Option */}
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-[var(--bg-primary)]/40 border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer transition-all group/opt"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center group-hover/opt:scale-110 transition-transform">
                                            <Upload size={28} />
                                        </div>
                                        <span className="font-bold text-[var(--text-primary)]">Upload Photo</span>
                                    </div>

                                    {/* Camera Option */}
                                    <div
                                        onClick={startCamera}
                                        className="flex-1 flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-[var(--bg-primary)]/40 border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer transition-all group/opt"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center group-hover/opt:scale-110 transition-transform">
                                            <Camera size={28} />
                                        </div>
                                        <span className="font-bold text-[var(--text-primary)]">Open Camera</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4 z-20">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[var(--accent)] blur-xl opacity-20 animate-pulse"></div>
                                    <Loader2 size={56} className="animate-spin text-[var(--accent)] relative z-10" />
                                </div>
                                <p className="font-bold tracking-[0.2em] text-sm animate-pulse text-[var(--accent)]">ANALYZING...</p>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />

                    {/* Result Summary */}
                    {result && (
                        <div className="p-8 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Total Macros Row */}
                            <div className="flex items-center justify-between gap-4 mb-8">
                                <div className="flex flex-col items-start">
                                    <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Flame size={12} className="text-orange-500" /> Calories
                                    </span>
                                    <span className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{result.totals.calories}</span>
                                </div>

                                <div className="flex-1 flex gap-4 justify-end">
                                    <MacroRing label="Protein" value={result.totals.protein} color="text-emerald-400" icon={<Beef size={14} />} />
                                    <MacroRing label="Carbs" value={result.totals.carbs} color="text-amber-400" icon={<Wheat size={14} />} />
                                    <MacroRing label="Fats" value={result.totals.fats} color="text-rose-400" icon={<Droplet size={14} />} />
                                </div>
                            </div>

                            {/* Macro Balance Bar */}
                            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex mb-2">
                                <div style={{ width: getRatio(result.totals, 'protein') }} className="h-full bg-emerald-500/80" />
                                <div style={{ width: getRatio(result.totals, 'carbs') }} className="h-full bg-amber-500/80" />
                                <div style={{ width: getRatio(result.totals, 'fats') }} className="h-full bg-rose-500/80" />
                            </div>
                            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-medium px-1">
                                <span className="text-emerald-400">Protein</span>
                                <span className="text-amber-400">Carbs</span>
                                <span className="text-rose-400">Fats</span>
                            </div>
                        </div>
                    )}

                    {/* Action Button (Analyze) */}
                    {image && !result && !loading && !isCameraOpen && (
                        <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-primary)]/30">
                            <button
                                onClick={handleAnalyze}
                                className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--bg-primary)] font-black text-lg rounded-2xl shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                <ScanLine className="group-hover:rotate-180 transition-transform duration-500" />
                                Analyze Nutrition
                            </button>
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 font-medium text-center animate-in shake">
                        {error}
                    </div>
                )}

                {/* Detected Items List */}
                {result && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Detected Items</h3>
                            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">
                                {result.foods.length}
                            </span>
                        </div>

                        <div className="grid gap-3">
                            {result.foods.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/30 backdrop-blur-md rounded-2xl border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-secondary)]/50 transition-all duration-300 group animate-in slide-in-from-bottom-2 fade-in"
                                    style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] font-bold shadow-sm group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/30 transition-colors">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)] text-lg leading-tight group-hover:text-[var(--accent)] transition-colors">{item.name}</p>
                                            <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">{item.serving_size}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-black text-[var(--text-primary)]">{item.calories} <span className="text-[10px] text-[var(--text-secondary)] font-medium uppercase">cal</span></span>
                                        <div className="flex items-center gap-2 text-xs font-bold font-mono">
                                            <span className="text-emerald-400">{parseInt(item.protein)}p</span>
                                            <span className="w-0.5 h-3 bg-[var(--border)]"></span>
                                            <span className="text-amber-400">{parseInt(item.carbs)}c</span>
                                            <span className="w-0.5 h-3 bg-[var(--border)]"></span>
                                            <span className="text-rose-400">{parseInt(item.fats)}f</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={resetScanner}
                            className="w-full py-4 mt-4 text-[var(--text-secondary)] font-bold hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-2 hover:bg-[var(--bg-secondary)]/30 rounded-2xl"
                        >
                            <ScanLine size={18} />
                            Scan Another Meal
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper Component for Macro Circles
const MacroRing = ({ label, value, color, icon }) => (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
        <div className={`text-xl font-black ${color}`}>{parseInt(value)}<span className="text-xs text-[var(--text-secondary)] font-bold">g</span></div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            {icon} {label}
        </div>
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
