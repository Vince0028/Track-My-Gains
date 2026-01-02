
import React, { useState, useEffect } from 'react';
import { User, Scale, Shield, FileText, LogOut, ChevronRight, Moon, Sun, Trash2, X, Lock, Activity, Heart, Ruler, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const Settings = ({ isDarkMode, toggleTheme, confirmAction, onSignOut, onResetData, onDeleteAccount, userEmail, units, toggleUnits }) => {
    const [infoModal, setInfoModal] = useState(null);
    const [identityModalOpen, setIdentityModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

    const [profile, setProfile] = useState({
        full_name: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        blood_pressure: '',
        fitness_goals: ''
    });
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });

    useEffect(() => {
        if (identityModalOpen) {
            fetchProfile();
        }
    }, [identityModalOpen]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setProfile({
                        full_name: data.full_name || '',
                        age: data.age || '',
                        gender: data.gender || '',
                        height: data.height || '',
                        weight: data.weight || '',
                        blood_pressure: data.blood_pressure || '',
                        fitness_goals: data.fitness_goals || ''
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        ...profile,
                        updated_at: new Date()
                    });

                if (error) throw error;
                setNotification({ type: 'success', message: 'Profile updated successfully!' });
                setIdentityModalOpen(false);
            }
        } catch (error) {
            setNotification({ type: 'error', message: 'Error updating profile: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setNotification({ type: 'error', message: 'Passwords do not match!' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setNotification({ type: 'error', message: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;
            setNotification({ type: 'success', message: 'Password updated successfully!' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            setNotification({ type: 'error', message: 'Error updating password: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const sections = [
        {
            title: 'Profile',
            items: [
                {
                    id: 'profile',
                    label: 'Identity',
                    sub: userEmail || 'Athlete account details',
                    icon: <User size={20} />,
                    action: () => setIdentityModalOpen(true)
                },
            ]
        },
        {
            title: 'Experience',
            items: [
                {
                    id: 'dark',
                    label: isDarkMode ? 'Dark Mode' : 'Light Mode',
                    sub: 'Theme selection',
                    icon: isDarkMode ? <Moon size={20} /> : <Sun size={20} />,
                    action: toggleTheme,
                    active: isDarkMode
                },
                {
                    id: 'units',
                    label: 'Measurement',
                    sub: `Using ${units === 'kg' ? 'Kilograms (kg)' : 'Pounds (lbs)'}`,
                    icon: <Scale size={20} />,
                    action: toggleUnits,
                    active: units === 'lbs'
                },
            ]
        },
        {
            title: 'System',
            items: [
                {
                    id: 'privacy',
                    label: 'Privacy',
                    sub: 'Local storage & encryption',
                    icon: <Shield size={20} />,
                    action: () => setInfoModal({
                        title: 'Privacy Policy',
                        content: (
                            <div className="space-y-4 text-sm text-[var(--text-secondary)]">
                                <section>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-1">1. Data Collection</h4>
                                    <p>We collect workout logs, custom schedules, and basic profile info to provide analytics. All data is scoped to your user ID.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-1">2. Data Storage</h4>
                                    <p>Your data is securely stored in a Supabase PostgreSQL database. Local browser storage is used for preferences (theme, units) and temporary session caching.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-1">3. Security</h4>
                                    <p>Communication with our servers is encrypted via SSL. Authentication is handled via secure tokens.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-1">4. Third Parties</h4>
                                    <p>We do not share, sell, or trade your personal fitness data with any third-party advertisers.</p>
                                </section>
                            </div>
                        )
                    })
                },
                {
                    id: 'terms',
                    label: 'Policy',
                    sub: 'Usage guidelines',
                    icon: <FileText size={20} />,
                    action: () => setInfoModal({
                        title: 'Terms of Use',
                        content: (
                            <div className="space-y-4 text-sm text-[var(--text-secondary)]">
                                <section>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-1">1. Personal Use</h4>
                                    <p>TrackMyGains is granted for personal, non-commercial fitness tracking purposes only.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-1">2. Health Disclaimer</h4>
                                    <p className="text-rose-400">You should consult your physician or other health care professional before starting this or any other fitness program to determine if it is right for your needs.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-1">3. Liability</h4>
                                    <p>The creators of TrackMyGains are not responsible for any injuries or health issues that may result from using this application.</p>
                                </section>
                                <section>
                                    <h4 className="font-bold text-[var(--text-primary)] mb-1">4. Account Security</h4>
                                    <p>You are responsible for maintaining the confidentiality of your login credentials.</p>
                                </section>
                            </div>
                        )
                    })
                },
            ]
        },
        {
            title: 'Debug',
            items: [
                { id: 'reload', label: 'Reload App', sub: 'Force refresh', icon: <Activity size={20} />, action: () => window.location.reload() }
            ]
        }
    ];

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-[var(--text-secondary)]">Manage your local trackmygains experience</p>
            </div>

            <div className="space-y-8 pb-12">
                {sections.map((section) => (
                    <div key={section.title} className="space-y-4">
                        <h2 className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest ml-1">{section.title}</h2>
                        <div className="bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth overflow-hidden">
                            {section.items.map((item, i) => (
                                <div
                                    key={item.id}
                                    onClick={item.action}
                                    className={`flex items-center justify-between p-6 hover:bg-[var(--bg-primary)]/50 transition-organic cursor-pointer ${i !== section.items.length - 1 ? 'border-b border-[var(--border)]' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-[var(--bg-primary)] organic-shape border border-[var(--border)] text-[var(--text-secondary)]">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <div className="font-bold">{item.label}</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-0.5">{item.sub}</div>
                                        </div>
                                    </div>

                                    {item.id === 'dark' || item.id === 'units' ? (
                                        <div className={`w-12 h-6 rounded-full p-1 relative shadow-inner transition-colors ${item.active ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${item.active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </div>
                                    ) : (
                                        <ChevronRight size={20} className="text-[var(--text-secondary)] opacity-30" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="pt-8 space-y-4">
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-2 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] organic-shape text-[var(--text-primary)] font-bold hover:bg-[var(--bg-primary)] transition-organic shadow-sm"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>

                    <button
                        onClick={onResetData}
                        className="w-full flex items-center justify-center gap-2 p-4 bg-rose-500/10 border border-rose-500/30 organic-shape text-rose-500 font-bold hover:bg-rose-500 hover:text-white transition-organic text-sm"
                    >
                        <Trash2 size={16} />
                        Reset Account Data
                    </button>

                    <button
                        onClick={onDeleteAccount}
                        className="w-full flex items-center justify-center gap-2 p-4 bg-rose-600/20 border border-rose-600/40 organic-shape text-rose-600 font-bold hover:bg-rose-600 hover:text-white transition-organic text-sm"
                    >
                        <Shield size={16} />
                        Delete Account (Permanent)
                    </button>

                    <div className="text-center space-y-2 mt-8">
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed px-4">
                            TrackMyGains now syncs with the secure backend.
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Modal */}
            {infoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth p-8 max-w-sm w-full space-y-6 shadow-2xl relative">
                        <button
                            onClick={() => setInfoModal(null)}
                            className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">{infoModal.title}</h3>
                            <div className="leading-relaxed">
                                {infoModal.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Identity Modal */}
            {identityModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
                        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)] z-10">
                            <div>
                                <h3 className="text-2xl font-bold">Identity & Biometrics</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Manage your personal data for AI personalization</p>
                            </div>
                            <button
                                onClick={() => setIdentityModalOpen(false)}
                                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                                    <User size={16} /> Personal Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">Full Name</label>
                                        <input
                                            type="text"
                                            value={profile.full_name}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">Age</label>
                                        <input
                                            type="number"
                                            value={profile.age}
                                            onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                                            className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                            placeholder="25"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">Gender</label>
                                        <select
                                            value={profile.gender}
                                            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                            className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">Fitness Goal</label>
                                        <select
                                            value={profile.fitness_goals}
                                            onChange={(e) => setProfile({ ...profile, fitness_goals: e.target.value })}
                                            className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="">Select Goal</option>
                                            <option value="Muscle Gain">Muscle Gain</option>
                                            <option value="Fat Loss">Fat Loss</option>
                                            <option value="Strength">Strength</option>
                                            <option value="Endurance">Endurance</option>
                                            <option value="Maintenance">Maintenance</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Biometrics */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={16} /> Biometrics
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">Height ({units === 'kg' ? 'cm' : 'ft'})</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={profile.height}
                                                onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                                                className="w-full p-3 pl-10 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                                placeholder={units === 'kg' ? "175" : "5.9"}
                                            />
                                            <Ruler size={16} className="absolute left-3 top-3.5 text-[var(--text-secondary)]" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">Weight ({units === 'kg' ? 'kg' : 'lbs'})</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={profile.weight}
                                                onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                                                className="w-full p-3 pl-10 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                                placeholder={units === 'kg' ? "70" : "154"}
                                            />
                                            <Scale size={16} className="absolute left-3 top-3.5 text-[var(--text-secondary)]" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">Blood Pressure</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={profile.blood_pressure}
                                                onChange={(e) => setProfile({ ...profile, blood_pressure: e.target.value })}
                                                className="w-full p-3 pl-10 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                                placeholder="120/80"
                                            />
                                            <Heart size={16} className="absolute left-3 top-3.5 text-[var(--text-secondary)]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateProfile}
                                disabled={loading}
                                className="w-full py-3 bg-[var(--accent)] organic-shape text-white font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Profile Changes'}
                            </button>

                            <div className="border-t border-[var(--border)] my-6"></div>

                            {/* Security */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                    <Lock size={16} /> Security
                                </h4>
                                <div className="p-4 bg-[var(--bg-primary)] organic-shape border border-[var(--border)] space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-rose-500/50 focus:border-transparent outline-none transition-all"
                                            placeholder="Min. 6 characters"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)] font-bold">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-rose-500/50 focus:border-transparent outline-none transition-all"
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={loading || !passwordData.newPassword}
                                        className="w-full py-3 bg-rose-500/10 border border-rose-500/30 organic-shape text-rose-500 font-bold transition-all hover:bg-rose-500 hover:text-white disabled:opacity-50"
                                    >
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {notification && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-overlay animate-in fade-in zoom-in duration-200 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--bg-secondary)] organic-shape organic-border subtle-depth p-6 max-w-sm w-full space-y-6 shadow-2xl relative text-center">
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {notification.type === 'success' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">{notification.type === 'success' ? 'Success' : 'Error'}</h3>
                            <p className="text-[var(--text-secondary)]">{notification.message}</p>
                        </div>

                        <button
                            onClick={() => setNotification(null)}
                            className="w-full py-3 bg-[var(--bg-primary)] border border-[var(--border)] organic-shape font-bold hover:bg-[var(--accent)] hover:text-white hover:border-transparent transition-all"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
