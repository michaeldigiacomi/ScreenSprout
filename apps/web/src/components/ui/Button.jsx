import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled,
    type = 'button',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-gradient-to-r from-primary-blue to-primary-teal text-white shadow-lg shadow-primary-blue/25 hover:-translate-y-0.5 hover:shadow-primary-blue/35 active:translate-y-0',
        secondary: 'bg-bg-secondary text-text-main border border-border-color hover:bg-bg-tertiary hover:border-text-muted',
        danger: 'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-red-500/35 active:translate-y-0',
        ghost: 'bg-transparent text-text-muted hover:bg-bg-secondary hover:text-text-main',
        outline: 'bg-transparent border border-border-color text-text-main hover:bg-bg-secondary'
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm gap-2',
        md: 'px-6 py-3 text-[15px] gap-2',
        lg: 'px-8 py-4 text-base gap-3',
        icon: 'p-2'
    };

    return (
        <button
            type={type}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
}
