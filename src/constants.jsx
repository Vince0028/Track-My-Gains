
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

// Muscle Icons
import shoulderIcon from './assets/shoulder.png';
import backIcon from './assets/back.png';
import chestIcon from './assets/chest.png';
import tricepIcon from './assets/tricep.png';
import bicepIcon from './assets/bicep.png';
import legsIcon from './assets/legs.png';
import coreIcon from './assets/core.png';
import forearmIcon from './assets/forearm.png';
import stretchesIcon from './assets/stretches.png';

export const WEEKLY_DEFAULT_PLAN = {
    'Monday': { title: 'Rest Day', exercises: [] },
    'Tuesday': { title: 'Rest Day', exercises: [] },
    'Wednesday': { title: 'Rest Day', exercises: [] },
    'Thursday': { title: 'Rest Day', exercises: [] },
    'Friday': { title: 'Rest Day', exercises: [] },
    'Saturday': { title: 'Rest Day', exercises: [] },
    'Sunday': { title: 'Rest Day', exercises: [] }
};

const MuscleIcon = ({ src, alt }) => (
    <div className="w-8 h-8 rounded-full bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden border border-slate-100">
        <img src={src} alt={alt} className="w-full h-full object-contain" />
    </div>
);

export const MUSCLE_ICONS = {
    Shoulder: <MuscleIcon src={shoulderIcon} alt="Shoulder" />,
    Back: <MuscleIcon src={backIcon} alt="Back" />,
    Chest: <MuscleIcon src={chestIcon} alt="Chest" />,
    Tricep: <MuscleIcon src={tricepIcon} alt="Tricep" />,
    Bicep: <MuscleIcon src={bicepIcon} alt="Bicep" />,
    Legs: <MuscleIcon src={legsIcon} alt="Legs" />,
    Core: <MuscleIcon src={coreIcon} alt="Core" />,
    Forearm: <MuscleIcon src={forearmIcon} alt="Forearm" />,
    Stretches: <MuscleIcon src={stretchesIcon} alt="Stretches" />
};

export const getMuscleGroup = (name) => {
    const n = name.toLowerCase();
    if (n.includes('shoulder') || n.includes('overhead') || n.includes('raise') || n.includes('military')) return 'Shoulder';
    if (n.includes('row') || n.includes('pull') || n.includes('back') || n.includes('lat') || n.includes('chin')) return 'Back';
    if (n.includes('bench') || n.includes('chest') || n.includes('push') || n.includes('dip') || n.includes('fly')) return 'Chest';
    if (n.includes('tricep') || n.includes('extension') || n.includes('skull')) return 'Tricep';
    if (n.includes('curl') || n.includes('bicep')) return 'Bicep';
    if (n.includes('squat') || n.includes('leg') || n.includes('lunge') || n.includes('calf') || n.includes('deadlift')) return 'Legs';
    if (n.includes('plank') || n.includes('crunch') || n.includes('sit') || n.includes('abs') || n.includes('core')) return 'Core';
    if (n.includes('wrist') || n.includes('forearm')) return 'Forearm';
    if (n.includes('stretch') || n.includes('yoga') || n.includes('mobility')) return 'Stretches';
    return 'Core'; // Default
};

export const COMMON_EXERCISES = [
    'Bench Press', 'Incline Bench Press', 'Dips', 'Push Ups',
    'Squat', 'Deadlift', 'Leg Press', 'Lunges', 'Calf Raise',
    'Pull Ups', 'Lat Pulldown', 'Barbell Row', 'Face Pulls',
    'Overhead Press', 'Lateral Raise', 'Front Raise',
    'Bicep Curl', 'Hammer Curl', 'Tricep Extension', 'Skullcrushers',
    'Plank', 'Crunches', 'Leg Raise', 'Russian Twist',
    'Running', 'Cycling', 'Jump Rope', 'Stretching'
];
