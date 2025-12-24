import React from 'react';

interface InputProps {
  label?: string;
  id?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  required?: boolean;
  autoFocus?: boolean;
  step?: string | number;
  min?: string | number;
  max?: string | number;
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  error,
  required = false,
  autoFocus = false,
  step,
  min,
  max,
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        step={step}
        min={min}
        max={max}
        className={`themed-ring ${error ? 'border-red-500' : ''} ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Input;