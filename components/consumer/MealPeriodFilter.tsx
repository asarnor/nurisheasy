'use client';

import React from 'react';
import {
  MEAL_CATEGORIES,
  MEAL_CATEGORY_LABELS,
  type MealCategory,
} from '@/lib/meal-categories';

export type MealPeriodView = MealCategory | 'all';

interface MealPeriodFilterProps {
  value: MealPeriodView;
  onChange: (value: MealPeriodView) => void;
  showAll?: boolean;
  label?: string;
}

export const MealPeriodFilter: React.FC<MealPeriodFilterProps> = ({
  value,
  onChange,
  showAll = false,
  label = 'Meal period',
}) => {
  const options: { value: MealPeriodView; label: string }[] = showAll
    ? [{ value: 'all', label: 'All Menus' }, ...MEAL_CATEGORIES.map((meal) => ({
        value: meal,
        label: MEAL_CATEGORY_LABELS[meal],
      }))]
    : MEAL_CATEGORIES.map((meal) => ({
        value: meal,
        label: MEAL_CATEGORY_LABELS[meal],
      }));

  return (
    <div className="mb-6">
      <p className="mb-3 text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              value === option.value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
