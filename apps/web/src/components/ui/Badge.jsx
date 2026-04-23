import React from 'react';

const variants = {
    success: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

export default function Badge({
    children,
    variant = 'default',
    className = '',
    ...props
}) {
    return (
        <span
            className={`
        inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${variants[variant] || variants.default}
        ${className}
      `}
            {...props}
        >
            {children}
        </span>
    );
}
