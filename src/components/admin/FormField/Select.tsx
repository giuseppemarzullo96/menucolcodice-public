import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import styles from '@/styles/admin.module.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: FieldError;
  register?: UseFormRegister<any>;
  name?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  register,
  name,
  options,
  className = '',
  ...props
}) => {
  const selectProps = register && name ? register(name) : {};
  const finalValue = props.value !== undefined ? props.value : (selectProps as any).value;

  return (
    <div className="mb-4">
      {label && <label className={styles.label}>{label}</label>}
      <select
        className={`${styles.control} ${className}`}
        {...(props.value !== undefined ? {} : selectProps)}
        value={finalValue}
        onChange={(e) => {
          if (props.onChange) props.onChange(e);
          else if (selectProps && 'onChange' in selectProps && typeof selectProps.onChange === 'function') {
            selectProps.onChange(e);
          }
        }}
        {...(props.value !== undefined ? props : {})}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-700">{error.message}</p>}
    </div>
  );
};
