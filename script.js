// --- ALL 10 CATEGORIES MAP & COLORS ---
const MASTER_CATEGORIES = {
    "JEE": { id: "cat-jee", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800", dot: "bg-blue-500" },
    "Societies": { id: "cat-soc", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-200 dark:border-purple-800", dot: "bg-purple-500" },
    "College": { id: "cat-col", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-200 dark:border-green-800", dot: "bg-green-500" },
    "Personal": { id: "cat-per", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
    "School": { id: "cat-sch", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", border: "border-red-200 dark:border-red-800", dot: "bg-red-500" },
    "Competitive Exams (WBJEE/BITSAT)": { id: "cat-comp", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-200 dark:border-yellow-800", dot: "bg-yellow-500" },
    "Interviews & Recruitment": { id: "cat-int", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-900/30", border: "border-cyan-200 dark:border-cyan-800", dot: "bg-cyan-500" },
    "Event Organizing": { id: "cat-evt", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-200 dark:border-pink-800", dot: "bg-pink-500" },
    "Trading & Finance": { id: "cat-trd", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
    "Household & Errands": { id: "cat-hse", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-200 dark:border-indigo-800", dot: "bg-indigo-500" }
};

// --- STATE ---
let userDB = JSON.parse(localStorage.getItem('omnitrack_users_db')) || [];
let currentUser = null;
let tasks = [];
let activeFilter = 'Central';
let activeDate = new Date();
let currentNoteTaskId = null;

// --- DOM ELEMENTS ---
const authScreen = document.getElementById('auth-screen');
const authError = document.getElementById('auth-error');

// --- INIT & THEME ---
document.addEventListener('DOMContentLoaded', () => {
    initThemeUI();
    
    // Check Session Auth
    const localSession = localStorage.getItem('omnitrack_session');
    const tempSession = sessionStorage.getItem('omnitrack_session');
    if (localSession) attemptAutoLogin(JSON.parse(localSession));
    else if (tempSession) attemptAutoLogin(JSON.parse(tempSession));
    else authScreen.classList.remove('hidden');
});

function initThemeUI() {
    const savedTheme = localStorage.getItem('omnitrack_theme') || 'system';
    const savedShade = localStorage.getItem('omnitrack_shade') || 'ocean';
    
    document.querySelectorAll('[id^="btn-theme-"]').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-brand', 'bg-brand/10');
    });
    const themeBtn = document.getElementById(`btn-theme-${savedTheme}`);
    if(themeBtn) themeBtn.classList.add('ring-2', 'ring-brand', 'bg-brand/10');
}

// --- AUTHENTICATION ---
function toggleAuth(mode) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');
    
    authError.classList.add('hidden');
    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.className = "flex-1 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-gray-800 text-slate-900 dark:text-white shadow-sm transition-all";
        tabReg.className = "flex-1 py-2 text-sm font-semibold rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabReg.className = "flex-1 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-gray-800 text-slate-900 dark:text-white shadow-sm transition-all";
        tabLogin.className = "flex-1 py-2 text-sm font-semibold rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all";
    }
}

function showAuthError(msg) {
    authError.innerText = msg;
    authError.classList.remove('hidden');
}

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-password').value;

    if (userDB.find(u => u.email === email)) return showAuthError("Email already registered.");
    
    const newUser = { name, email, pass, categories: [] };
    userDB.push(newUser);
    localStorage.setItem('omnitrack_users_db', JSON.stringify(userDB));
    loginUser(newUser, false);
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;

    const user = userDB.find(u => u.email === email && u.pass === pass);
    if(user) loginUser(user, remember);
    else showAuthError("Invalid credentials.");
});

function attemptAutoLogin(sessionUser) {
    const user = userDB.find(u => u.email === sessionUser.email);
    if(user) loginUser(user, !!localStorage.getItem('omnitrack_session'));
    else authScreen.classList.remove('hidden');
}

function loginUser(user, remember) {
    currentUser = user;
    if(remember) localStorage.setItem('omnitrack_session', JSON.stringify(user));
    else sessionStorage.setItem('omnitrack_session', JSON.stringify(user));
    
    document.getElementById('current-user-display').innerText = user.name;
    document.getElementById('user-avatar').innerText = user.name.charAt(0).toUpperCase();

    authScreen.style.opacity = '0';
    setTimeout(() => { authScreen.classList.add('hidden'); }, 300);

    // Onboarding Check
    if (!user.categories || user.categories.length === 0) {
        showOnboarding();
    } else {
        initWorkspace();
    }
}

function logout() {
    localStorage.removeItem('omnitrack_session');
    sessionStorage.removeItem('omnitrack_session');
    currentUser = null; tasks = [];
    window.location.reload();
}

// --- ONBOARDING (Expanded Categories) ---
function showOnboarding() {
    const grid = document.getElementById('onboarding-grid');
    grid.innerHTML = '';
    
    Object.keys(MASTER_CATEGORIES).forEach((cat, index) => {
        const d = MASTER_CATEGORIES[cat];
        grid.innerHTML += `
            <label class="cursor-pointer border border-slate-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-gray-800 transition-all has-[:checked]:ring-2 has-[:checked]:ring-brand has-[:checked]:bg-brand/5 stagger-${(index%4)+1} fade-in">
                <input type="checkbox" value="${cat}" class="onboard-chk hidden">
                <div class="w-4 h-4 rounded-full ${d.dot} mb-2"></div>
                <span class="text-xs font-bold text-slate-700 dark:text-gray-300">${cat}</span>
            </label>
        `;
    });
    
    document.getElementById('onboarding-modal').classList.remove('hidden');
    document.getElementById('onboarding-modal').classList.add('flex');
}

function saveOnboarding() {
    const checks = document.querySelectorAll('.onboard-chk:checked');
    if(checks.length === 0) return alert("Please select at least one category.");
    
    const selected = Array.from(checks).map(c => c.value);
    currentUser.categories = selected;
    updateUserInDB();
    
    document.getElementById('onboarding-modal').classList.add('hidden');
    initWorkspace();
}

function updateUserInDB() {
    const idx = userDB.findIndex(u => u.email === currentUser.email);
    userDB[idx] = currentUser;
    localStorage.setItem('omnitrack_users_db', JSON.stringify(userDB));
    
    if(localStorage.getItem('omnitrack_session')) localStorage.setItem('omnitrack_session', JSON.stringify(currentUser));
    else sessionStorage.setItem('omnitrack_session', JSON.stringify(currentUser));
}

// --- WORKSPACE INIT ---
function initWorkspace() {
    const savedData = localStorage.getItem(`omnitrack_tasks_${currentUser.email}`);
    tasks = savedData ? JSON.parse(savedData) : [];
    
    // Inject Categories into Add Modal Dropdown
    const select = document.getElementById('task-category');
    select.innerHTML = '';
    currentUser.categories.forEach(cat => {
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    // Inject Categories into Filter Bar
    const filterContainer = document.getElementById('calendar-filters');
    filterContainer.innerHTML = `<button class="filter-btn active bg-slate-200 dark:bg-gray-700 text-slate-900 dark:text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all" data-filter="Central">All</button>`;
    currentUser.categories.forEach(cat => {
        filterContainer.innerHTML += `<button class="filter-btn text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all" data-filter="${cat}">${cat}</button>`;
    });
    setupFilters();

    refreshCalendarView();
}

// --- NAVIGATION ---
function switchTab(tab, btnElement) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = "nav-btn w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-semibold text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-all";
    });
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.className = "mobile-nav-btn flex flex-col items-center space-y-1 text-slate-400 dark:text-gray-500 transition-colors";
    });

    if (btnElement) {
        if(btnElement.classList.contains('nav-btn')) {
            btnElement.className = "nav-btn active w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all bg-brand/10 text-brand";
        } else {
            btnElement.className = "mobile-nav-btn active flex flex-col items-center space-y-1 text-brand transition-colors";
        }
    }

    document.getElementById('view-calendar').classList.add('hidden');
    document.getElementById('view-analytics').classList.add('hidden');
    document.getElementById('view-settings').classList.add('hidden');

    if (tab === 'calendar') {
        document.getElementById('view-calendar').classList.remove('hidden');
        document.getElementById('view-calendar').classList.add('flex');
        refreshCalendarView();
    } else if (tab === 'analytics') {
        document.getElementById('view-analytics').classList.remove('hidden');
        document.getElementById('view-analytics').classList.add('flex');
        renderAnalytics();
    } else if (tab === 'settings') {
        document.getElementById('view-settings').classList.remove('hidden');
        document.getElementById('view-settings').classList.add('flex');
    }
}

// --- CALENDAR RENDERING ---
function navigateDate(dir) {
    activeDate.setDate(activeDate.getDate() + dir);
    refreshCalendarView();
}

function setupFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            buttons.forEach(b => {
                b.classList.remove('bg-slate-200', 'dark:bg-gray-700', 'text-slate-900', 'dark:text-white', 'active');
                b.classList.add('text-slate-500', 'dark:text-gray-400');
            });
            e.target.classList.remove('text-slate-500', 'dark:text-gray-400');
            e.target.classList.add('bg-slate-200', 'dark:bg-gray-700', 'text-slate-900', 'dark:text-white', 'active');
            activeFilter = e.target.getAttribute('data-filter');
            refreshCalendarView();
        });
    });
}

function refreshCalendarView() {
    const today = new Date();
    const isToday = activeDate.toDateString() === today.toDateString();
    document.getElementById('calendar-header-title').innerText = isToday ? "Today" : activeDate.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' });
    
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    taskList.innerHTML = '';
    
    let targetDateStr = formatDateForInput(activeDate);
    let filteredTasks = tasks.filter(t => t.date === targetDateStr);
    
    if (activeFilter !== 'Central') filteredTasks = filteredTasks.filter(t => t.category === activeFilter);
    filteredTasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
    } else {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
        
        filteredTasks.forEach((task, index) => {
            const catStyle = MASTER_CATEGORIES[task.category] || MASTER_CATEGORIES["Personal"];
            const timeStr = `${formatAmPm(task.startTime)} - ${formatAmPm(task.endTime)}`;
            const statusClass = `status-text-${task.status.split(' ')[0]}`;
            const stagger = `stagger-${(index%4)+1}`;

            const card = document.createElement('div');
            card.className = `bg-white dark:bg-bgPanelDark border border-slate-200/60 dark:border-gray-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between hover:border-slate-300 dark:hover:border-gray-700 transition-all shadow-sm shadow-slate-200/50 dark:shadow-none hover:shadow-md fade-in ${stagger}`;
            
            card.innerHTML = `
                <div class="flex-1 cursor-pointer pr-4" onclick="openNotesModal('${task.id}')">
                    <div class="flex items-center space-x-3 mb-2">
                        <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${catStyle.color} ${catStyle.bg} border ${catStyle.border}">${Here is the complete, upgraded codebase for the OmniTrack application, implementing all 7 features including the centralized authentication, mobile-responsive bottom navigation, multi-step account deletion, and dynamic theme/accent engines.

### `index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OmniTrack - Productivity Engine</title>
    <script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>
    <link rel="stylesheet" href="[https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)">
    <link rel="stylesheet" href="styles.css">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: 'var(--color-primary)',
                        'primary-hover': 'var(--color-primary-hover)',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col md:flex-row transition-colors duration-300 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800" data-theme="system" data-accent="ocean">

    <!-- Sidebar (Desktop) -->
    <aside class="hidden md:flex flex-col w-64 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 shadow-xl h-screen sticky top-0 z-10">
        <div class="p-6 flex items-center gap-3">
            <i class="fas fa-layer-group text-2xl text-primary"></i>
            <h1 class="text-2xl font-bold tracking-tight">OmniTrack</h1>
        </div>
        <nav class="flex-1 px-4 space-y-2 mt-4">
            <button onclick="switchView('tasks')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 font-medium active-nav"><i class="fas fa-tasks w-5"></i> Tasks</button>
            <button onclick="switchView('calendar')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 font-medium"><i class="fas fa-calendar-alt w-5"></i> Calendar</button>
            <button onclick="switchView('analytics')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 font-medium"><i class="fas fa-chart-pie w-5"></i> Analytics</button>
        </nav>
        <div class="p-4 border-t border-gray-200 dark:border-gray-700">
            <button onclick="openSettings()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 font-medium">
                <i class="fas fa-cog w-5"></i> Settings
            </button>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-4 md:p-8 overflow-y-auto mb-16 md:mb-0">
        <header class="flex justify-between items-center mb-8 fade-in">
            <div>
                <h2 class="text-3xl font-bold" id="greeting">Good Morning!</h2>
                <p class="text-gray-500 dark:text-gray-400 mt-1">Let's crush your goals today.</p>
            </div>
            <button onclick="openCreateTask()" class="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 font-medium flex items-center gap-2">
                <i class="fas fa-plus"></i> <span class="hidden sm:inline">New Task</span>
            </button>
        </header>

        <!-- Task Grid -->
        <div id="tasks-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
            <!-- Tasks rendered via JS -->
        </div>
    </main>

    <!-- Bottom Nav (Mobile) -->
    <nav class="md:hidden fixed bottom-0 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 flex justify-around py-3 pb-safe z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button onclick="switchView('tasks')" class="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"><i class="fas fa-tasks text-xl"></i><span class="text-xs">Tasks</span></button>
        <button onclick="switchView('calendar')" class="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"><i class="fas fa-calendar-alt text-xl"></i><span class="text-xs">Calendar</span></button>
        <button onclick="switchView('analytics')" class="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"><i class="fas fa-chart-pie text-xl"></i><span class="text-xs">Stats</span></button>
        <button onclick="openSettings()" class="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"><i class="fas fa-cog text-xl"></i><span class="text-xs">Settings</span></button>
    </nav>

    <!-- MODALS -->

    <!-- Login Modal -->
    <div id="login-modal" class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-95 opacity-0 duration-300">
            <div class="text-center mb-6">
                <i class="fas fa-layer-group text-4xl text-primary mb-3"></i>
                <h2 class="text-2xl font-bold">Welcome to OmniTrack</h2>
                <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">Sign in to sync your productivity</p>
            </div>
            <form id="login-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Email</label>
                    <input type="email" required class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none transition-all">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Password</label>
                    <input type="password" required class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none transition-all">
                </div>
                <div class="flex items-center justify-between text-sm">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="remember-me" class="rounded text-primary focus:ring-primary bg-gray-50 dark:bg-gray-900 border-gray-300">
                        <span>Remember Me</span>
                    </label>
                    <a href="#" class="text-primary hover:underline">Forgot Password?</a>
                </div>
                <button type="submit" class="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5">Sign In</button>
            </form>
        </div>
    </div>

    <!-- Onboarding / Category Selection Modal -->
    <div id="onboarding-modal" class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 class="text-2xl font-bold mb-2">Set Up Your Spaces</h2>
            <p class="text-gray-500 dark:text-gray-400 mb-6">Select the categories relevant to your life to customize your workspace.</p>
            <div id="category-selection-grid" class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <!-- Populated via JS -->
            </div>
            <button onclick="finishOnboarding()" class="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold shadow-lg transition-all">Start Tracking</button>
        </div>
    </div>

    <!-- Task Details & Notes Modal -->
    <div id="task-details-modal" class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <span id="detail-category" class="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"></span>
                        <span id="detail-status" class="text-xs font-medium px-2 py-0.5 rounded-md border"></span>
                    </div>
                    <h2 id="detail-title" class="text-2xl font-bold"></h2>
                    <p id="detail-time" class="text-sm text-gray-500 dark:text-gray-400 mt-1"><i class="far fa-clock"></i> </p>
                </div>
                <button onclick="closeModal('task-details-modal')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><i class="fas fa-times text-xl"></i></button>
            </div>
            <div class="p-6 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                <label class="block text-sm font-medium mb-2">Task Notes</label>
                <textarea id="detail-notes" class="w-full h-64 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none resize-none transition-all" placeholder="Add rich notes, links, or sub-tasks here..."></textarea>
            </div>
            <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
                <button onclick="closeModal('task-details-modal')" class="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">Close</button>
                <button onclick="saveNotes()" class="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-xl shadow-md transition-all">Save Notes</button>
            </div>
        </div>
    </div>

    <!-- Create/Edit Task Modal -->
    <div id="edit-task-modal" class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <div class="flex justify-between items-center mb-4">
                <h2 id="edit-modal-title" class="text-xl font-bold">Create Task</h2>
                <button onclick="closeModal('edit-task-modal')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><i class="fas fa-times"></i></button>
            </div>
            <form id="task-form" class="space-y-4">
                <input type="hidden" id="task-id">
                <div>
                    <label class="block text-sm font-medium mb-1">Title</label>
                    <input type="text" id="task-title" required class="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Category</label>
                    <select id="task-category" class="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none">
                        <!-- Populated via JS -->
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Date</label>
                        <input type="date" id="task-date" class="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Status</label>
                        <select id="task-status" class="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none">
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-bold mt-2 shadow-lg transition-all">Save Task</button>
            </form>
        </div>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 class="text-xl font-bold"><i class="fas fa-cog mr-2"></i> Account Settings</h2>
                <button onclick="closeModal('settings-modal')" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-6">
                <!-- Theme Settings -->
                <div>
                    <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Appearance</h3>
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <button onclick="setTheme('light')" class="py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-colors text-sm">Light</button>
                        <button onclick="setTheme('dark')" class="py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-colors text-sm">Dark</button>
                        <button onclick="setTheme('system')" class="py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-colors text-sm">System</button>
                    </div>
                    <label class="block text-sm font-medium mb-2">Accent Shade</label>
                    <div class="flex gap-3">
                        <button onclick="setAccent('ocean')" class="w-8 h-8 rounded-full bg-blue-500 ring-2 ring-offset-2 ring-transparent focus:ring-blue-500 dark:ring-offset-gray-800 transition-all"></button>
                        <button onclick="setAccent('emerald')" class="w-8 h-8 rounded-full bg-emerald-500 ring-2 ring-offset-2 ring-transparent focus:ring-emerald-500 dark:ring-offset-gray-800 transition-all"></button>
                        <button onclick="setAccent('amethyst')" class="w-8 h-8 rounded-full bg-purple-500 ring-2 ring-offset-2 ring-transparent focus:ring-purple-500 dark:ring-offset-gray-800 transition-all"></button>
                        <button onclick="setAccent('amber')" class="w-8 h-8 rounded-full bg-amber-500 ring-2 ring-offset-2 ring-transparent focus:ring-amber-500 dark:ring-offset-gray-800 transition-all"></button>
                    </div>
                </div>
                <!-- Danger Zone -->
                <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 class="text-sm font-bold text-red-500 uppercase tracking-wider mb-3">Danger Zone</h3>
                    <button onclick="initiateDelete()" class="w-full border border-red-500 text-red-500 hover:bg-red-500 hover:text-white py-2.5 rounded-xl transition-all font-medium">Delete Account & Data</button>
                    <button onclick="logout()" class="w-full mt-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 py-2.5 rounded-xl transition-all font-medium">Log Out</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Confirm Step 1 -->
    <div id="delete-step1-modal" class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center">
            <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <h2 class="text-xl font-bold mb-2">Are you sure?</h2>
            <p class="text-gray-500 dark:text-gray-400 mb-6 text-sm">Are you sure you want to delete all tasks and account data? This cannot be undone.</p>
            <div class="flex gap-3">
                <button onclick="closeModal('delete-step1-modal')" class="flex-1 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 transition-all">Cancel</button>
                <button onclick="proceedToDeleteStep2()" class="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all">Yes, Proceed</button>
            </div>
        </div>
    </div>

    <!-- Delete Confirm Step 2 -->
    <div id="delete-step2-modal" class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full
