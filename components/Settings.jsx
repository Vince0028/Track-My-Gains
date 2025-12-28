
import React from 'react';
import { User, Scale, Shield, FileText, LogOut, ChevronRight, Moon, Sun, Trash2 } from 'lucide-react';

const Settings = ({ isDarkMode, toggleTheme, confirmAction, onClearData, onResetData }) => {
    const sections = [
        {
            title: 'Profile',
            items: [
                { id: 'profile', label: 'Identity', sub: 'Athlete account details', icon: <User size={20} /> },
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
                    active: true
                },
                { id: 'units', label: 'Measurement', sub: 'Using Kilograms (kg)', icon: <Scale size={20} />, action: () => alert('Weight units coming soon!') },
            ]
        },
        {
            title: 'System',
            items: [
                { id: 'privacy', label: 'Privacy', sub: 'Local storage & encryption', icon: <Shield size={20} /> },
                { id: 'terms', label: 'Policy', sub: 'Usage guidelines', icon: <FileText size={20} /> },
            ]
        },
        {
            title: 'Debug',
            items: [
                { id: 'reload', label: 'Reload App', sub: 'Force refresh', icon: <Shield size={20} />, action: () => window.location.reload() }
            ]
        }
    ];

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-[var(--text-secondary)]">Manage your local fitflow experience</p>
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

                                    {item.id === 'dark' ? (
                                        <div className={`w-12 h-6 rounded-full p-1 relative shadow-inner transition-colors ${isDarkMode ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
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
                        onClick={onClearData}
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

                    <div className="text-center space-y-2 mt-8">
                        <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-50">Local Deployment v1.1.0</p>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed px-4">
                            FitFlow Pro now syncs with the secure backend.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
