/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                base: 'var(--bg-base)',
                surface: 'var(--bg-surface)',
                elevated: 'var(--bg-elevated)',
                sidebar: 'var(--sidebar-bg)',
                'sidebar-text': 'var(--sidebar-text)',
                'sidebar-muted': 'var(--sidebar-muted)',
                accent: {
                    DEFAULT: 'var(--accent-primary)',
                    hover: 'var(--accent-hover)',
                    success: 'var(--accent-success)',
                    danger: 'var(--accent-danger)',
                    warning: 'var(--accent-warning)',
                    info: 'var(--accent-info)',
                },
                txt: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    muted: 'var(--text-muted)',
                },
                border: 'var(--border)',
                'border-focus': 'var(--border-focus)',
            },
            fontFamily: {
                display: ['"DM Serif Display"', 'Georgia', 'serif'],
                body: ['"DM Sans"', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
            },
            borderRadius: {
                card: '12px',
            },
            animation: {
                'fade-up': 'fadeUp 0.4s ease-out forwards',
                'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
                'slide-in-right': 'slideInRight 0.3s ease-out forwards',
                shimmer: 'shimmer 1.5s infinite',
                'scale-in': 'scaleIn 0.2s ease-out forwards',
                'pulse-ring': 'pulseRing 1.5s infinite',
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInLeft: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(120%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.94)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                pulseRing: {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '100%': { transform: 'scale(1.5)', opacity: '0' },
                },
            },
        },
    },
    plugins: [],
};
