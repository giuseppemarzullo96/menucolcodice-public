import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';

interface ToggleProps {
  label?: string;
  error?: FieldError;
  register?: UseFormRegister<any>;
  name?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  error,
  register,
  name,
  checked,
  onChange,
}) => {
  const toggleProps = register && name ? register(name) : {};

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          {...toggleProps}
          checked={checked}
          onChange={(e) => {
            if (onChange) {
              onChange(e.target.checked);
            }
            if (toggleProps && 'onChange' in toggleProps && typeof toggleProps.onChange === 'function') {
              toggleProps.onChange(e);
            }
          }}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
          {checked ? 'Attivo' : 'Disattivo'}
        </span>
      </label>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error.message}
        </p>
      )}
    </div>
  );
};
