/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'primary-blue': '#2563EB',
                'primary-teal': '#14B8A6',
                'bg-color': '#f8fafc', // slate-50
                'bg-secondary': '#ffffff',
                'text-main': '#374151', // gray-700
                'text-heading': '#111827', // gray-900
                'text-muted': '#6b7280', // gray-500
                'border-color': '#e5e7eb', // gray-200
                'card-bg': '#ffffff',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
