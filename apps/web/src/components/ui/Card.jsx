import React from 'react';

export default function Card({
    children,
    className = '',
    padding = 'p-6',
    ...props
}) {
    return (
        <div
            className={`bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 transition-shadow hover:shadow-lg ${padding} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
