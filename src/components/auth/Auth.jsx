import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle, X } from 'lucide-react';
import authBg1 from '../../assets/auth_bg_1.png';
import authBg2 from '../../assets/auth_bg_2.png';
import authBg3 from '../../assets/auth_bg_3.png';
import authBg4 from '../../assets/auth_bg_4.png';
import authBg5 from '../../assets/auth_bg_5.png';
import authBg6 from '../../assets/auth_bg_6.png'; // Restored

const QUOTES = [
    "Light weight baby!", "Zero Excuses", "One more rep", "No pain no gain",
    "Believe to achieve", "Sweat is just fat crying", "Train insane", "Focus",
    "Consistency is Key", "Earn your shower", "Be a beast", "Limitless",
    "Gains incoming"
];

const FloatingQuotes = () => {
    // Generate static initial positions to avoid re-renders causing jumps
    const [floatingItems] = useState(() => QUOTES.map((text, i) => ({
        text,
        id: i,
        left: Math.random() * 90 + 5 + '%', // 5-95%
        animationDelay: Math.random() * 5 + 's', // Reduced delay for faster appearance check
        animationDuration: Math.random() * 20 + 8 + 's', // 8s - 28s range
        fontSize: Math.random() * 1 + 1 + 'rem', // Bigger: 1rem - 2rem
    })));

    return (
        <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
            {floatingItems.map((item) => (
                <div
                    key={item.id}
                    className="absolute text-white font-bold whitespace-nowrap select-none animate-float-up"
                    style={{
                        left: item.left,
                        bottom: '-10vh', // Start slightly lower
                        animationDelay: item.animationDelay,
                        animationDuration: item.animationDuration,
                        fontSize: item.fontSize,
                        textShadow: '0 0 20px rgba(139, 148, 122, 0.5)' // Add glow
                    }}
                >
                    {item.text}
                </div>
            ))}
        </div>
    );
};

const AuthBackground = () => {
    const images = [authBg1, authBg2, authBg3, authBg4, authBg5, authBg6];
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 5000); // Faster cycle
        return () => clearInterval(interval);
    }, [images.length]);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden">
            {images.map((img, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                >
                    <div className="absolute inset-0 bg-black/60 z-10" /> {/* Dark overlay for text readability */}
                    <img
                        src={img}
                        alt="Background"
                        className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-linear ${index === currentIndex ? 'scale-110' : 'scale-100'}`}
                    />
                </div>
            ))}
            <FloatingQuotes />
        </div>
    );
};

const VerificationModal = ({ email, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-black/80 backdrop-blur-xl p-8 organic-shape organic-border border-white/10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="text-center space-y-6 py-4">
                    <div className="w-20 h-20 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--accent)]/30">
                        <CheckCircle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Check your email</h3>
                        <p className="text-slate-300 text-sm px-4">
                            We've sent a confirmation link to <span className="font-bold text-white">{email}</span>.
                            Please check your inbox to activate your account.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[var(--accent)] text-white font-bold organic-shape hover:brightness-110 transition-all shadow-lg shadow-[var(--accent)]/20"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [checkEmail, setCheckEmail] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Sign Up Fields
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [bloodPressure, setBloodPressure] = useState('');
    const [gender, setGender] = useState('');

    const isValidEmail = (email) => {
        // Strict email validation regex
        // Checks for: non-whitespace chars + @ + non-whitespace chars + . + non-whitespace chars
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate email format
        if (!isValidEmail(email)) {
            setError('Please enter a valid email address (e.g., user@example.com)');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            } else {
                // Sign Up Flow
                if (!age || !height || !weight || !gender) {
                    throw new Error("Please fill in all required fields (Age, Gender, Height, Weight).");
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password
                });
                if (error) throw error;

                // Update Profile immediately
                if (data?.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: data.user.id,
                            email: email,
                            age: parseInt(age),
                            height: parseFloat(height),
                            weight: parseFloat(weight),
                            gender: gender,
                            blood_pressure: bloodPressure,
                            updated_at: new Date()
                        });

                    if (profileError) {
                        console.error("Error saving profile details:", profileError);
                        // We don't block sign up success, but maybe warn user?
                    }
                }
                setCheckEmail(true);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setCheckEmail(false);
        setIsLogin(true);
        // Optional: clear form fields or leave them
        // setEmail(''); 
        // setPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative bg-[var(--bg-primary)] overflow-hidden">
            <AuthBackground />

            {/* Verification Popup Modal */}
            {checkEmail && (
                <VerificationModal email={email} onClose={handleCloseModal} />
            )}

            <div className="w-full max-w-md space-y-8 relative z-10 p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-2">
                    <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">TrackMyGains</h1>
                    <p className="text-slate-200 drop-shadow-md text-lg">Your personal growth journey starts here.</p>
                </div>

                <div className="bg-black/40 backdrop-blur-xl p-8 organic-shape organic-border border-white/10 shadow-2xl transition-all duration-300 max-h-[85vh] overflow-y-auto">
                    <div className="flex gap-4 mb-8 p-1 bg-black/20 rounded-xl border border-white/5">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-300 uppercase ml-1">Email</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 organic-shape pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic"
                                    placeholder="hello@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-300 uppercase ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 organic-shape pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Additional Fields for Sign Up */}
                        {!isLogin && (
                            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-300 uppercase ml-1">Age *</label>
                                        <input
                                            type="number"
                                            required={!isLogin}
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 organic-shape px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic"
                                            placeholder="25"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-300 uppercase ml-1">Gender *</label>
                                        <select
                                            required={!isLogin}
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 organic-shape px-4 py-3 text-white focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic appearance-none"
                                        >
                                            <option value="" className="text-black">Select</option>
                                            <option value="Male" className="text-black">Male</option>
                                            <option value="Female" className="text-black">Female</option>
                                            <option value="Other" className="text-black">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-300 uppercase ml-1">Height (cm) *</label>
                                        <input
                                            type="number"
                                            required={!isLogin}
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 organic-shape px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic"
                                            placeholder="175"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-300 uppercase ml-1">Weight (kg) *</label>
                                        <input
                                            type="number"
                                            required={!isLogin}
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 organic-shape px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic"
                                            placeholder="70"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-300 uppercase ml-1">Blood Pressure <span className="text-slate-500 normal-case">(Optional)</span></label>
                                    <input
                                        type="text"
                                        value={bloodPressure}
                                        onChange={(e) => setBloodPressure(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 organic-shape px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic"
                                        placeholder="120/80"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm rounded-lg backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-[var(--accent)] text-white font-bold organic-shape hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-[var(--accent)]/20"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : (
                                <>
                                    {isLogin ? 'Welcome Back' : 'Create Account'}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Auth;
