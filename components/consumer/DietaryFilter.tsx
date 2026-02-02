'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';

interface DietaryFilterProps {
  value: string;
  onChange: (value: string) => void;
  activeFilters: string[];
}

export const DietaryFilter: React.FC<DietaryFilterProps> = ({
  value,
  onChange,
  activeFilters,
}) => {
  const filterOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'nut-free', label: 'Nut-free' },
    { value: 'low-sodium', label: 'Low-Sodium' },
    { value: 'gluten-free', label: 'Gluten-Free' },
    { value: 'dairy-free', label: 'Dairy-Free' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
  ];

  return (
    <div className="mb-6">
      <Select
        label="Dietary Filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={filterOptions}
        className="w-full md:w-64"
      />
      {activeFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {activeFilters.map((filter) => (
            <span
              key={filter}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              {filter}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
