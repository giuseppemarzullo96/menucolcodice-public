import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import styles from '@/styles/admin.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError;
  register?: UseFormRegister<any>;
  name?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  register,
  name,
  className = '',
  ...props
}) => {
  const inputProps = register && name ? register(name) : {};
  const finalValue = props.value !== undefined ? props.value : (inputProps as any).value;

  return (
    <div className="mb-4">
      {label && <label className={styles.label}>{label}</label>}
      <input
        className={`${styles.control} ${className}`}
        {...(props.value !== undefined ? {} : inputProps)}
        value={finalValue}
        onChange={(e) => {
          if (props.onChange) props.onChange(e);
          else if (inputProps && 'onChange' in inputProps && typeof inputProps.onChange === 'function') {
            inputProps.onChange(e);
          }
        }}
        {...(props.value !== undefined ? props : {})}
      />
      {error && <p className="mt-1 text-sm text-red-700">{error.message}</p>}
    </div>
  );
};
