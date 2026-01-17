
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithGroq } from '../../services/groqService';

const AICoach = ({ sessions = [], weeklyPlan = null, nutritionLogs = [] }) => {
    const [messages, setMessages] = useState([
        { id: '1', role: 'coach', text: "Yo! I'm your Gym Bro. Let's get massive. Ask me about your split, form, or macros. What are we crushing today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await import('../../services/supabaseClient').then(m => m.supabase.auth.getUser());
                if (user) {
                    const { data } = await import('../../services/supabaseClient').then(m => m.supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single());
                    if (data) setProfile(data);
                }
            } catch (e) {
                console.error("Error fetching profile for AI:", e);
            }
        };
        fetchProfile();
    }, []);

    const calculateHistorySummary = () => {
        if (!sessions) return null;

        // --- ROBUST HISTORY CALCULATION START ---
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let startDate = new Date();
        if (sessions.length > 0) {
            const earliest = new Date(Math.min(...sessions.map(s => new Date(s.date).getTime())));
            startDate = earliest;
        } else {
            startDate.setDate(now.getDate() - 28);
        }
        startDate.setHours(0, 0, 0, 0);

        const missedSessions = [];
        const tempDate = new Date(startDate);
        const getLocalDateStr = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        while (tempDate < now) { // < now (strictly before today, today is pending not missed)
            const dateStr = getLocalDateStr(tempDate);
            const foundSession = sessions.find(s => getLocalDateStr(s.date) === dateStr);

            // If no session found for this past date...
            if (!foundSession || !foundSession.exercises || foundSession.exercises.length === 0) {
                // ...check if one was planned
                if (weeklyPlan) {
                    const dayName = tempDate.toLocaleDateString('en-US', { weekday: 'long' });
                    const plan = weeklyPlan[dayName];
                    if (plan && !plan.isRestDay && plan.exercises && plan.exercises.length > 0) {
                        missedSessions.push({
                            date: dateStr,
                            day: dayName,
                            title: plan.title
                        });
                    }
                }
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }
        // --- ROBUST HISTORY CALCULATION END ---

        const totalWorkouts = sessions.length;
        const lastWorkout = sessions.length > 0
            ? sessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            : null;

        const lastDate = lastWorkout ? new Date(lastWorkout.date).toLocaleDateString() : "Never";

        // Calculate simplified consistency (sessions in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const recentSessions = sessions.filter(s => new Date(s.date) >= thirtyDaysAgo);
        const consistencyRating = recentSessions.length > 12 ? "High (Beast Mode)" : recentSessions.length > 4 ? "Moderate (Getting There)" : "Low (Needs Motivation)";

        return {
            totalWorkouts,
            lastWorkoutDate: lastDate,
            recentSessionCount: recentSessions.length,
            consistencyRating,
            lastWorkoutName: lastWorkout?.title || "None",
            missedSessionsCount: missedSessions.length,
            missedSessionsDetails: missedSessions.slice(-3) // Send last 3 missed for context
        };
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const historySummary = calculateHistorySummary();
        const response = await chatWithGroq(input, profile, historySummary, weeklyPlan, nutritionLogs);
        const coachMsg = { id: (Date.now() + 1).toString(), role: 'coach', text: response || '' };
        setMessages(prev => [...prev, coachMsg]);
        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8 h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-500">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">AI Coach</h1>
                <p className="text-[var(--text-secondary)]">Your personal fitness advisor</p>
            </div>

            <div className="flex-1 bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth overflow-hidden flex flex-col mb-4">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((m) => (
                        <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-10 h-10 shrink-0 organic-shape flex items-center justify-center border subtle-depth ${m.role === 'coach' ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]' : 'bg-[var(--text-secondary)]/10 border-[var(--text-secondary)]/30 text-[var(--text-secondary)]'
                                }`}>
                                {m.role === 'coach' ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'coach'
                                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-tl-none organic-shape'
                                : 'bg-[var(--accent)] text-[var(--bg-primary)] rounded-tr-none organic-shape rotate-[0.5deg] font-medium'
                                }`}>
                                <div className="text-sm leading-relaxed markdown-content">
                                    <ReactMarkdown>{m.text}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 organic-shape flex items-center justify-center bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]">
                                <Bot size={20} />
                            </div>
                            <div className="bg-[var(--bg-primary)] p-4 organic-shape rounded-tl-none border border-[var(--border)]">
                                <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-[var(--bg-primary)]/50 border-t border-[var(--border)]">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask me anything about fitness..."
                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] organic-shape px-6 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-organic text-[var(--text-primary)]"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading}
                            className="w-12 h-12 bg-[var(--accent)] organic-shape flex items-center justify-center text-[var(--bg-primary)] hover:brightness-110 active:scale-95 transition-organic disabled:opacity-50"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                        {['Form tips', 'Nutrition advice', 'Rest & recovery', 'Stay motivated'].map((tip) => (
                            <button
                                key={tip}
                                onClick={() => setInput(tip)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] organic-shape text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider hover:border-[var(--accent)] hover:text-[var(--accent)] transition-organic"
                            >
                                <Sparkles size={12} /> {tip}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICoach;
