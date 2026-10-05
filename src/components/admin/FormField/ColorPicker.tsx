import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import styles from '@/styles/admin.module.css';

interface ColorPickerProps {
  label?: string;
  error?: FieldError;
  register?: UseFormRegister<any>;
  name?: string;
  value?: string;
  onChange?: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  error,
  register,
  name,
  value,
  onChange,
}) => {
  const inputProps = register && name ? register(name) : {};
  const finalValue = value !== undefined ? value : (inputProps as any).value || '';

  return (
    <div className="mb-4">
      {label && <label className={styles.label}>{label}</label>}
      <div className="flex items-center gap-3">
        <input
          type="color"
          className="w-16 h-10 cursor-pointer"
          style={{ border: '1px solid #EFE9DC', background: '#fff' }}
          {...(value !== undefined ? {} : inputProps)}
          value={finalValue}
          onChange={(e) => {
            if (onChange) onChange(e.target.value);
            if (value === undefined && inputProps && 'onChange' in inputProps && typeof inputProps.onChange === 'function') {
              inputProps.onChange(e);
            }
          }}
        />
        <input
          type="text"
          className={styles.control}
          value={finalValue}
          onChange={(e) => {
            if (onChange) onChange(e.target.value);
            if (value === undefined && inputProps && 'onChange' in inputProps && typeof inputProps.onChange === 'function') {
              inputProps.onChange(e);
            }
          }}
          placeholder="#000000"
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-700">{error.message}</p>}
    </div>
  );
};
