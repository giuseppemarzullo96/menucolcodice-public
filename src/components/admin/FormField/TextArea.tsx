import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import styles from '@/styles/admin.module.css';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: FieldError;
  register?: UseFormRegister<any>;
  name?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  register,
  name,
  className = '',
  ...props
}) => {
  const textareaProps = register && name ? register(name) : {};
  const finalValue = props.value !== undefined ? props.value : (textareaProps as any).value;

  return (
    <div className="mb-4">
      {label && <label className={styles.label}>{label}</label>}
      <textarea
        className={`${styles.control} ${className}`}
        {...(props.value !== undefined ? {} : textareaProps)}
        value={finalValue}
        onChange={(e) => {
          if (props.onChange) props.onChange(e);
          else if (textareaProps && 'onChange' in textareaProps && typeof textareaProps.onChange === 'function') {
            textareaProps.onChange(e);
          }
        }}
        {...(props.value !== undefined ? props : {})}
      />
      {error && <p className="mt-1 text-sm text-red-700">{error.message}</p>}
    </div>
  );
};
