import { TimeBlockDef, TimeBlockId } from './types';
import { Sun, Sunrise, Sunset, Moon, Coffee, Utensils, MoonStar, AlarmClock } from 'lucide-react';
import React from 'react';

export const TIME_BLOCKS: Record<TimeBlockId, TimeBlockDef> = {
  waking: { id: 'waking', label: 'Upon Waking', icon: 'Sun', color: 'bg-yellow-100 text-yellow-800', sortOrder: 1, isMeal: false },
  breakfast: { id: 'breakfast', label: 'Breakfast', icon: 'Coffee', color: 'bg-orange-100 text-orange-800', sortOrder: 2, isMeal: true },
  morning: { id: 'morning', label: 'Morning', icon: 'Sunrise', color: 'bg-blue-100 text-blue-800', sortOrder: 3, isMeal: false },
  lunch: { id: 'lunch', label: 'Lunch', icon: 'Utensils', color: 'bg-green-100 text-green-800', sortOrder: 4, isMeal: true },
  afternoon: { id: 'afternoon', label: 'Afternoon', icon: 'Sun', color: 'bg-sky-100 text-sky-800', sortOrder: 5, isMeal: false },
  dinner: { id: 'dinner', label: 'Dinner', icon: 'Utensils', color: 'bg-indigo-100 text-indigo-800', sortOrder: 6, isMeal: true },
  evening: { id: 'evening', label: 'Evening', icon: 'Sunset', color: 'bg-purple-100 text-purple-800', sortOrder: 7, isMeal: false },
  bedtime: { id: 'bedtime', label: 'Bedtime', icon: 'MoonStar', color: 'bg-slate-200 text-slate-800', sortOrder: 8, isMeal: false },
};

export const FREQUENCIES = [
  { id: 'daily', label: 'Once a Day' },
  { id: 'twice_daily', label: 'Twice a Day' },
  { id: '3x_daily', label: '3x per Day' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'prn', label: 'As Needed (PRN)' },
];

export const MEDICATION_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export const getIcon = (name: string) => {
  switch (name) {
    case 'Sun': return <Sun className="w-5 h-5" />;
    case 'Sunrise': return <Sunrise className="w-5 h-5" />;
    case 'Sunset': return <Sunset className="w-5 h-5" />;
    case 'Moon': return <Moon className="w-5 h-5" />;
    case 'Coffee': return <Coffee className="w-5 h-5" />;
    case 'Utensils': return <Utensils className="w-5 h-5" />;
    case 'MoonStar': return <MoonStar className="w-5 h-5" />;
    default: return <AlarmClock className="w-5 h-5" />;
  }
};