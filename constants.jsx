
import React from 'react';
import {
    Dumbbell,
    Target,
    User,
    Zap,
    Activity,
    ShieldCheck,
    Heart,
    Anchor,
    CircleDot
} from 'lucide-react';

export const WEEKLY_DEFAULT_PLAN = {
    'Monday': { title: 'Rest Day', exercises: [] },
    'Tuesday': { title: 'Rest Day', exercises: [] },
    'Wednesday': { title: 'Rest Day', exercises: [] },
    'Thursday': { title: 'Rest Day', exercises: [] },
    'Friday': { title: 'Rest Day', exercises: [] },
    'Saturday': { title: 'Rest Day', exercises: [] },
    'Sunday': { title: 'Rest Day', exercises: [] }
};

export const MUSCLE_ICONS = {
    Shoulder: <Zap size={18} className="text-amber-200/60" />,
    Back: <Anchor size={18} className="text-blue-200/60" />,
    Chest: <Heart size={18} className="text-rose-200/60" />,
    Tricep: <Zap size={18} className="text-emerald-200/60" />,
    Bicep: <Dumbbell size={18} className="text-indigo-200/60" />,
    Legs: <CircleDot size={18} className="text-orange-200/60" />,
    Core: <ShieldCheck size={18} className="text-purple-200/60" />,
    Forearm: <Activity size={18} className="text-cyan-200/60" />,
    Stretches: <Target size={18} className="text-lime-200/60" />
};
