
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle } from 'lucide-react';

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [checkEmail, setCheckEmail] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password
                });
                if (error) throw error;
                setCheckEmail(true);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4 animate-in fade-in duration-700">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">TrackMyGains</h1>
                    <p className="text-[var(--text-secondary)]">Your personal growth journey starts here.</p>
                </div>

                <div className="bg-[var(--bg-secondary)] p-8 organic-shape organic-border subtle-depth transition-all duration-300">
                    {checkEmail ? (
                        <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--accent)]/30">
                                <CheckCircle size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Check your email</h3>
                                <p className="text-[var(--text-secondary)] text-sm px-4">
                                    We've sent a confirmation link to <span className="font-bold text-[var(--text-primary)]">{email}</span>.
                                    Please check your inbox to activate your account.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setCheckEmail(false);
                                    setIsLogin(true);
                                }}
                                className="w-full py-3 bg-[var(--bg-primary)] border border-[var(--border)] font-bold organic-shape hover:bg-[var(--bg-secondary)] transition-organic text-sm"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-4 mb-8 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                                <button
                                    onClick={() => setIsLogin(true)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-[var(--bg-secondary)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                >
                                    Log In
                                </button>
                                <button
                                    onClick={() => setIsLogin(false)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-[var(--bg-secondary)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            <form onSubmit={handleAuth} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase ml-1">Email</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] organic-shape pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic"
                                            placeholder="hello@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase ml-1">Password</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] organic-shape pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-organic"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-bold organic-shape hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : (
                                        <>
                                            {isLogin ? 'Welcome Back' : 'Create Account'}
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
