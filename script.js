/* Premium typography and colors */
:root {
    color-scheme: dark;
}

/* Base resets & utilities */
body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* Custom Scrollbar for sleekness */
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #374151;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #4b5563; 
}
.hide-scroll::-webkit-scrollbar {
    display: none;
}
.hide-scroll {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

/* Mobile safe area for bottom nav */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
    .pb-safe {
        padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
    }
}

/* Animations */
.fade-in {
    animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Category Colors (Dots & Soft text) */
.cat-dot-jee { background-color: #3b82f6; }
.cat-dot-societies { background-color: #a855f7; }
.cat-dot-college { background-color: #22c55e; }
.cat-dot-personal { background-color: #f97316; }

/* Status Text Colors */
.status-text-Pending { color: #9ca3af; }
.status-text-Completed { color: #22c55e; }
.status-text-Partially { color: #eab308; }
.status-text-Delayed { color: #f97316; }
.status-text-Abandoned { color: #ef4444; }

/* Invert default date/time picker icons for dark mode */
::-webkit-calendar-picker-indicator {
    filter: invert(1) opacity(0.5);
    cursor: pointer;
}
