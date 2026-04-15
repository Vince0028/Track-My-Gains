
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
    const n = normalizeExerciseSearchText(name);
    if (n.includes('squat') || n.includes('leg') || n.includes('lunge') || n.includes('calf') || n.includes('deadlift') || n.includes('step up') || n.includes('hip thrust') || n.includes('glute') || n.includes('leg extension') || n.includes('leg curl')) return 'Legs';
    if (n.includes('shoulder') || n.includes('overhead') || n.includes('raise') || n.includes('military')) return 'Shoulder';
    if (n.includes('row') || n.includes('pull') || n.includes('back') || n.includes('lat') || n.includes('chin')) return 'Back';
    if (n.includes('bench') || n.includes('chest') || n.includes('push') || n.includes('dip') || n.includes('fly')) return 'Chest';
    if (n.includes('wrist') || n.includes('forearm') || n.includes('reverse curl') || n.includes('wrist curl') || n.includes('grip') || n.includes('pronation') || n.includes('supination') || n.includes('dead hang') || n.includes('farmer carry') || n.includes('suitcase carry') || n.includes('farmer hold') || n.includes('plate pinch') || n.includes('wrist roller')) return 'Forearm';
    if (n.includes('tricep') || n.includes('skull') || n.includes('pushdown') || n.includes('kickback') || n.includes('french press') || n.includes('close grip bench press') || n.includes('overhead cable extension') || n.includes('lying tricep extension')) return 'Tricep';
    if (n.includes('curl') || n.includes('bicep')) return 'Bicep';
    if (n.includes('plank') || n.includes('crunch') || n.includes('sit') || n.includes('abs') || n.includes('core')) return 'Core';
    if (n.includes('stretch') || n.includes('yoga') || n.includes('mobility')) return 'Stretches';
    return 'Core'; // Default
};

export const normalizeExerciseSearchText = (value = '') => {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/-/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(word => {
            if (word.endsWith('ies') && word.length > 3) return `${word.slice(0, -3)}y`;
            if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
            if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
            return word;
        })
        .join(' ');
};

const DURATION_EXERCISE_KEYWORDS = [
    'plank',
    'wall sit',
    'hollow hold',
    'dead hang',
    'isometric hold',
    'bridge hold',
    'side plank',
    'bird dog hold',
    'l-sit',
    'v-sit',
    'mountain climber',
    'jump rope',
    'running',
    'jog',
    'cycling',
    'bike',
    'walk',
    'stair climber',
    'rower',
    'rowing',
    'elliptical',
    'yoga',
    'stretch'
];

export const isDurationExercise = (name = '') => {
    const normalized = normalizeExerciseSearchText(name);
    return DURATION_EXERCISE_KEYWORDS.some(keyword => normalized.includes(keyword));
};

const toSafeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const inferDurationMinutes = (exercise = {}) => {
    const explicitMinutes = toSafeNumber(exercise.durationMinutes, -1);
    if (explicitMinutes >= 0) {
        return explicitMinutes;
    }

    const legacyReps = toSafeNumber(exercise.reps, 0);
    if (legacyReps <= 0) {
        return 1;
    }

    // Legacy plans often stored holds as seconds in reps (e.g. 60).
    if (legacyReps >= 30) {
        return Math.max(1, Math.round(legacyReps / 60));
    }

    return legacyReps;
};

export const normalizeExerciseMetrics = (exercise = {}) => {
    const shouldUseDuration = exercise.metricType === 'duration' || isDurationExercise(exercise.name);

    if (shouldUseDuration) {
        return {
            ...exercise,
            metricType: 'duration',
            durationMinutes: Math.max(0, inferDurationMinutes(exercise)),
            reps: Math.max(0, toSafeNumber(exercise.reps, 0))
        };
    }

    return {
        ...exercise,
        metricType: 'reps',
        reps: Math.max(0, toSafeNumber(exercise.reps, 10))
    };
};

export const getExerciseMetricMeta = (exercise = {}) => {
    const normalized = normalizeExerciseMetrics(exercise);

    if (normalized.metricType === 'duration') {
        return {
            isDuration: true,
            field: 'durationMinutes',
            label: 'min',
            labelCaps: 'MIN',
            value: normalized.durationMinutes
        };
    }

    return {
        isDuration: false,
        field: 'reps',
        label: 'reps',
        labelCaps: 'REPS',
        value: normalized.reps
    };
};

export const COMMON_EXERCISES = [
    'Push Up', 'Incline Push Up', 'Decline Push Up', 'Diamond Push Up', 'Wide Push Up', 'Close Grip Push Up', 'Archer Push Up', 'Pike Push Up', 'Handstand Push Up',
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Bench Press', 'Machine Chest Press', 'Smith Machine Bench Press', 'Chest Fly', 'Cable Fly', 'Pec Deck Fly',
    'Dips', 'Weighted Dip', 'Bench Dip', 'Landmine Press', 'Svend Press',
    'Overhead Press', 'Arnold Press', 'Seated Dumbbell Press', 'Push Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Face Pull', 'Upright Row', 'Shoulder Press Machine',
    'Pull Up', 'Chin Up', 'Neutral Grip Pull Up', 'Lat Pulldown', 'Close Grip Lat Pulldown', 'Wide Grip Pulldown', 'Barbell Row', 'Dumbbell Row', 'Seated Cable Row', 'T Bar Row', 'Inverted Row', 'Straight Arm Pulldown', 'Meadow Row', 'Chest Supported Row',
    'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Concentration Curl', 'Spider Curl', '21 Curl', 'Reverse Curl', 'Zottman Curl', 'Wrist Curl', 'Reverse Wrist Curl', 'Behind The Back Wrist Curl', 'Wrist Roller', 'Plate Pinch', 'Farmer Hold', 'Towel Pull Up', 'Dead Hang', 'Pronated Bar Hold', 'Supinated Bar Hold', 'Hammer Hold', 'Grip Crush',
    'Close Grip Bench Press', 'Skullcrusher', 'EZ Bar Skullcrusher', 'Tricep Pushdown', 'Rope Pushdown', 'Single Arm Pushdown', 'Reverse Grip Pushdown', 'Overhead Tricep Extension', 'Overhead Cable Extension', 'Rope Overhead Extension', 'Bench Dip', 'Kickback', 'Cable Kickback', 'Dumbbell Kickback', 'French Press', 'Lying Tricep Extension', 'Tricep Extension Machine', 'JM Press', 'Tricep Dips',
    'Squat', 'Front Squat', 'Hack Squat', 'Goblet Squat', 'Bulgarian Split Squat', 'Box Squat', 'Pause Squat', 'Sissy Squat', 'Leg Press', 'Belt Squat',
    'Lunge', 'Walking Lunge', 'Reverse Lunge', 'Side Lunge', 'Curtsy Lunge', 'Step Up', 'Romanian Deadlift', 'Deadlift', 'Sumo Deadlift', 'Trap Bar Deadlift', 'Stiff Leg Deadlift',
    'Leg Extension', 'Leg Curl', 'Seated Leg Curl', 'Lying Leg Curl', 'Hip Thrust', 'Glute Bridge', 'Cable Kickback', 'Back Extension', 'Good Morning', 'Calf Raise', 'Seated Calf Raise', 'Single Leg Calf Raise',
    'Plank', 'Side Plank', 'Plank Shoulder Tap', 'Hollow Hold', 'Dead Bug', 'Bird Dog', 'Superman Hold', 'Bear Crawl', 'Bear Plank', 'Hollow Rock',
    'Crunch', 'Bicycle Crunch', 'Reverse Crunch', 'Leg Raise', 'Hanging Leg Raise', 'Russian Twist', 'Mountain Climber', 'Ab Wheel Rollout', 'Sit Up', 'V Sit', 'Toe Touch Crunch', 'Cable Crunch',
    'Farmer Carry', 'Suitcase Carry', 'Front Rack Carry', 'Overhead Carry', 'Sled Push', 'Sled Pull', 'Battle Rope', 'Kettlebell Swing', 'Turkish Get Up', 'Medicine Ball Slam', 'Farmer Walk',
    'Jump Squat', 'Box Jump', 'Burpee', 'High Knees', 'Skater Jump', 'Broad Jump', 'Jumping Jack', 'Assault Bike Sprint',
    'Running', 'Jogging', 'Sprinting', 'Cycling', 'Stationary Bike', 'Rowing', 'Elliptical', 'Stair Climber', 'Jump Rope', 'Brisk Walking', 'Incline Walk',
    'Yoga Flow', 'Sun Salutation', 'Cat Cow Stretch', 'Child Pose', 'Cobra Stretch', 'Hip Flexor Stretch', 'Hamstring Stretch', 'Quad Stretch', 'Calf Stretch', 'Thoracic Rotation', 'Mobility Flow', 'Shoulder Dislocates', 'Worlds Greatest Stretch', 'Ankle Mobility', 'Pigeon Stretch', 'Butterfly Stretch', 'Figure Four Stretch', 'Seated Forward Fold', 'Standing Forward Fold', 'Chest Opener', 'Thread the Needle', 'Couch Stretch', 'Frog Stretch', 'Lat Stretch', 'Tricep Stretch', 'Overhead Tricep Stretch', 'Wrist Flexor Stretch', 'Wrist Extensor Stretch', 'Prayer Stretch', 'Reverse Prayer Stretch', 'Wrist Rolls', 'Banded Shoulder Stretch', 'Upper Trap Stretch', 'Neck Stretch',
    'Wall Sit', 'Dead Hang', 'L Sit Hold', 'Glute Bridge Hold', 'Isometric Squat Hold', 'Split Squat Hold', 'Hollow Hold', 'Handstand Hold', 'Forearm Plank', 'Side Plank Reach', 'Open Book Stretch', '90 90 Stretch', 'Deep Squat Hold'
];
