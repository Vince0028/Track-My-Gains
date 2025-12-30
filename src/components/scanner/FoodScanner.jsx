import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, ScanLine, X, Check, RefreshCcw } from 'lucide-react';
import { analyzeFoodImage } from '../../services/groqService';

const FoodScanner = () => {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isCameraActive, setIsCameraActive] = useState(false);

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            console.log("Requesting camera access...");
            setError('');

            // Explicitly requesting video with no constraints first to ensure access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true
            });

            console.log("Camera access granted. Stream:", stream);
            console.log("Video tracks:", stream.getVideoTracks());

            streamRef.current = stream;

            if (videoRef.current) {
                console.log("Setting video srcObject...");
                videoRef.current.srcObject = stream;

                // Add event listeners for debug
                videoRef.current.onloadeddata = () => console.log("Video data loaded");
                videoRef.current.onplaying = () => console.log("Video is playing");
                videoRef.current.onerror = (e) => console.error("Video error:", e);

                videoRef.current.onloadedmetadata = async () => {
                    console.log("Video metadata loaded. Attempting to play...");
                    try {
                        await videoRef.current.play();
                        console.log("Play successful");
                    } catch (e) {
                        console.error("Play error:", e);
                        setError("Camera started but failed to play: " + e.message);
                    }
                };
            }
            setIsCameraActive(true);
            setImage(null);
            setResult(null);
        } catch (err) {
            console.error("Camera error:", err);
            setError(`Unable to access camera: ${err.name} - ${err.message}`);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Match canvas size to video dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg');
            setImage(dataUrl);
            stopCamera();
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result);
            setResult(null);
            setError('');
            setIsCameraActive(false); // Ensure camera is off if uploading
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if (!image) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const data = await analyzeFoodImage(image);
            setResult(data);
        } catch (err) {
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
        <div className="h-full flex flex-col items-center justify-center p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Food Scanner</h2>
                <p className="text-[var(--text-secondary)]">Snap a photo to track your gains.</p>
            </div>

            <div className="w-full max-w-md bg-[var(--bg-secondary)] organic-shape organic-border p-6 shadow-2xl relative">

                {/* Image Preview / Camera Area */}
                <div className="aspect-square w-full bg-[var(--bg-primary)] rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden relative mb-6 group">

                    {isCameraActive ? (
                        <div className="relative w-full h-full bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted // Crucial for autoplay permissions on many browsers
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={stopCamera}
                                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors z-10"
                            >
                                <X size={20} />
                            </button>
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                <button
                                    onClick={capturePhoto}
                                    className="p-4 bg-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform border-4 border-[var(--accent)]"
                                >
                                    <div className="w-4 h-4 bg-[var(--accent)] rounded-full" />
                                </button>
                            </div>
                        </div>
                    ) : image ? (
                        <>
                            <img src={image} alt="Food Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={resetScanner}
                                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            {!result && !loading && (
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <ScanLine size={48} className="text-white/80" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center space-y-6 p-4 w-full">
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={startCamera}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all group"
                                >
                                    <div className="w-12 h-12 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                                        <Camera size={24} />
                                    </div>
                                    <span className="text-sm font-bold">Use Camera</span>
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all group"
                                >
                                    <div className="w-12 h-12 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                                        <Upload size={24} />
                                    </div>
                                    <span className="text-sm font-bold">Upload File</span>
                                </button>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">Supported formats: JPG, PNG</p>
                        </div>
                    )}

                    {loading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4 z-20">
                            <Loader2 size={48} className="animate-spin text-[var(--accent)]" />
                            <p className="font-bold tracking-widest animate-pulse">ANALYZING...</p>
                        </div>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />

                {/* Actions & Results */}
                {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm text-center mb-4 animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {result ? (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] text-center space-y-2">
                            <h3 className="text-2xl font-bold text-[var(--accent)]">{result.food_name}</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="p-2 bg-[var(--bg-secondary)] rounded-lg">
                                    <span className="block text-[var(--text-secondary)] text-xs uppercase">Calories</span>
                                    <span className="font-bold text-lg">{result.calories}</span>
                                </div>
                                <div className="p-2 bg-[var(--bg-secondary)] rounded-lg">
                                    <span className="block text-[var(--text-secondary)] text-xs uppercase">Serving</span>
                                    <span className="font-bold">{result.serving_size}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                                <div className="text-center">
                                    <span className="block text-emerald-400 font-bold">{result.protein}</span>
                                    <span className="text-[var(--text-secondary)]">Protein</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-amber-400 font-bold">{result.carbs}</span>
                                    <span className="text-[var(--text-secondary)]">Carbs</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-rose-400 font-bold">{result.fats}</span>
                                    <span className="text-[var(--text-secondary)]">Fats</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={resetScanner}
                            className="w-full py-3 bg-[var(--accent)] text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                            <ScanLine size={18} />
                            Scan Another
                        </button>
                    </div>
                ) : (
                    !isCameraActive && image && (
                        <button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2
                                ${loading
                                    ? 'bg-slate-700/50 cursor-not-allowed text-slate-500'
                                    : 'bg-[var(--accent)] hover:brightness-110 hover:shadow-[var(--accent)]/20 active:scale-95'
                                }`}
                        >
                            {loading ? 'Processing...' : 'Analyze Meal'}
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default FoodScanner;
