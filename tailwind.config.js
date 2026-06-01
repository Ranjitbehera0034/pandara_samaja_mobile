/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Match web portal exactly
        primary: '#2563eb',       // blue-600
        primaryLight: '#3b82f6',  // blue-500
        accent: '#4f46e5',        // indigo-600
        bgDark: '#0f172a',        // slate-900
        bgCard: '#1e293b',        // slate-800
        bgBorder: '#334155',      // slate-700
        textPrimary: '#f8fafc',   // slate-50
        textSecondary: '#94a3b8', // slate-400
        textMuted: '#64748b',     // slate-500
        success: '#22c55e',       // green-500
        danger: '#ef4444',        // red-500
        pink: '#ec4899',          // pink-500 (female users)
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
