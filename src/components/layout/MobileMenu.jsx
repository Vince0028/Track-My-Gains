import React, { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import iconDashboard from '../../assets/icon_dashboard.png';
import iconCalendar from '../../assets/icon_calendar.png';
import iconSchedule from '../../assets/icon_schedule.png';
import iconCoach from '../../assets/icon_coach.png';
import iconScanner from '../../assets/icon_scanner.png';
import iconSettings from '../../assets/icon_settings.png';
import { TrendingUp } from 'lucide-react';

const MobileMenu = ({
    currentScreen,
    onScreenChange,
    children,
    isOpen,
    onClose,
    onSignOut
}) => {

    const menuItems = [
        { id: 0, icon: <img src={iconDashboard} alt="Dashboard" className="w-6 h-6 object-contain" />, label: 'Dashboard' },
        { id: 1, icon: <img src={iconCalendar} alt="Calendar" className="w-6 h-6 object-contain" />, label: 'Calendar' },
        { id: 2, icon: <img src={iconSchedule} alt="Schedule" className="w-6 h-6 object-contain" />, label: 'Schedule' },
        { id: 3, icon: <img src={iconCoach} alt="Coach" className="w-6 h-6 object-contain" />, label: 'Coach' },
        { id: 6, icon: <TrendingUp size={24} />, label: 'History' },
        { id: 5, icon: <img src={iconScanner} alt="Scanner" className="w-6 h-6 object-contain" />, label: 'Scanner' },
        { id: 4, icon: <img src={iconSettings} alt="Settings" className="w-6 h-6 object-contain" />, label: 'Settings' },
    ];

    return (
        <>
            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={onClose}
                />
            )}

            {/* Mobile Burger Menu - Slide out from bottom */}
            {isOpen && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] organic-border p-6 space-y-4 z-50 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Navigation</h2>
                        {/* Close button handled by main header toggle */}
                    </div>

                    <div className="space-y-2">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onScreenChange(item.id);
                                    if (onClose) onClose();
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-organic ${currentScreen === item.id
                                    ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                                    }`}
                            >
                                {item.icon}
                                <span className="font-medium">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {onSignOut && (
                        <div className="pt-3 border-t border-[var(--border)]">
                            <button
                                onClick={() => {
                                    onSignOut();
                                    if (onClose) onClose();
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-rose-500/20 bg-rose-500/8 text-rose-400 hover:bg-rose-500/15 transition-organic text-sm"
                            >
                                <LogOut size={16} />
                                <span className="font-medium leading-none">Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content - No more internal header */}
            <div className="md:hidden">
                {children}
            </div>

            {/* Desktop - No Menu Header */}
            <div className="hidden md:block">
                {children}
            </div>
        </>
    );
};

export default MobileMenu;

