import React from 'react';

export default function Input({
    label,
    error,
    className = '',
    id,
    type = 'text',
    ...props
}) {
    const inputId = id || props.name;

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                type={type}
                className={`
          flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 
          file:border-0 file:bg-transparent file:text-sm file:font-medium 
          placeholder:text-gray-500 
          focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue
          disabled:cursor-not-allowed disabled:opacity-50
          dark:border-gray-600 dark:bg-slate-900 dark:text-gray-100 dark:focus:ring-primary-blue/50
          transition-all duration-200
          ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}
        `}
                {...props}
            />
            {error && (
                <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
        </div>
    );
}
