// --- ALL BASE CATEGORIES ---
let ALL_CATEGORIES = [
    { id: 'cat1', name: 'JEE', weight: 1.5 },
    { id: 'cat2', name: 'School', weight: 1.1 },
    { id: 'cat3', name: 'Personal', weight: 0.8 }
];

const SYLLABUS_DATA = {
    "JEE Main - Physics": ["Kinematics", "Laws of Motion", "Work, Energy & Power", "Rotational Motion", "Gravitation", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics"],
    "JEE Main - Chemistry": ["Atomic Structure", "Chemical Bonding", "Thermodynamics", "Equilibrium", "Redox", "Kinetics", "Coordination", "Organic Basics", "Hydrocarbons"],
    "JEE Main - Mathematics": ["Sets & Relations", "Complex Numbers", "Matrices & Determinants", "Quadratic Equations", "Permutations & Combinations", "Calculus", "Vector & 3D Geometry", "Probability"],
    "JEE Advanced - Physics": ["Advanced Mechanics", "Advanced Thermal Physics", "Advanced Electromagnetism", "Advanced Optics", "Modern Physics Focus"],
    "JEE Advanced - Chemistry": ["Physical Chemistry Deep Dive", "Inorganic Reactions", "Advanced Organic Mechanisms", "Practical Chemistry"],
    "JEE Advanced - Mathematics": ["Advanced Calculus", "Advanced Coordinate Geometry", "Advanced Algebra", "Complex Variables"],
    "Class 12 - Physics": ["Electrostatics", "Current Electricity", "Magnetism", "EMI & AC", "EM Waves", "Ray Optics", "Wave Optics", "Dual Nature", "Atoms & Nuclei", "Electronic Devices"],
    "Class 12 - Chemistry": ["Solutions", "Electrochemistry", "Chemical Kinetics", "d and f Block Elements", "Coordination Compounds", "Haloalkanes", "Alcohols", "Aldehydes", "Amines", "Biomolecules"],
    "Class 12 - Mathematics": ["Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants", "Continuity and Differentiability", "Applications of Derivatives", "Integrals", "Differential Equations", "Vector Algebra", "3D Geometry", "Linear Programming", "Probability"]
};

// Data State Setup
const PREFIX = 'ghadi_v3_';
let users = [];
let currentUser = null;
let allTasks = [];
let userCategories = [];
let userSyllabus = {};
let sysLogs = [];
let activeFilter = 'Central';
let activeDate = new Date();
let monthlyDate = new Date(); 
let currentNoteTaskId = null;

// Auth Mode
let authMode = 'login'; 

// Admin State
let logoClicks = 0;
let logoTimer = null;

// Pomodoro / Focus Mode State
let focusTimer = null;
let focusModeType = 'work';
let focusTimeRemaining = 25 * 60; 
let currentFocusTaskId = null;
let elapsedFocusSeconds = 0;
let isPlayfulMode = false;
const playQuotes = [
    "Keep going, you're doing great! 🌟",
    "Focus on the step in front of you. 🧗",
    "Every minute counts. You got this! ⏳",
    "Stay sharp. Stay hungry. 🦊",
    "Unleash your inner beast! 🦁",
    "Small steps = Giant leaps. 🚀",
    "You are unstoppable today! ✨"
];

// Drag and Drop State
let draggedTaskId = null;

// DOM Elements
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const dateDisplay = document.getElementById('current-date-display');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const notesModal = document.getElementById('notes-modal');

// --- INITIALIZATION & AUTH ---
document.addEventListener('DOMContentLoaded', () => {
    initThemeAndColor();
    users = JSON.parse(localStorage.getItem(PREFIX+'users')) || [];
    sysLogs = JSON.parse(localStorage.getItem(PREFIX+'sys_logs')) || [];
    isPlayfulMode = localStorage.getItem(PREFIX+'playful') === 'true';
    
    if (!checkAuth()) {
        document.getElementById('login-modal').classList.remove('hidden');
        toggleAuthMode('login');
    } else {
        loadUserData();
    }
});

function logSystemEvent(msg) {
    const timestamp = new Date().toISOString();
    sysLogs.unshift(`[${timestamp}] ${msg}`);
    if(sysLogs.length > 200) sysLogs.pop();
    localStorage.setItem(PREFIX+'sys_logs', JSON.stringify(sysLogs));
}

function checkAuth() {
    currentUser = localStorage.getItem(PREFIX+'session_user');
    return !!currentUser;
}

function toggleAuthMode(mode) {
    authMode = mode;
    const btnLogin = document.getElementById('tab-login');
    const btnRegister = document.getElementById('tab-register');
    const sitePassGroup = document.getElementById('auth-site-password-group');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (mode === 'login') {
        btnLogin.classList.add('text-primary', 'border-primary');
        btnLogin.classList.remove('text-gray-500', 'border-transparent');
        btnRegister.classList.remove('text-primary', 'border-primary');
        btnRegister.classList.add('text-gray-500', 'border-transparent');
        sitePassGroup.classList.add('hidden');
        document.getElementById('auth-site-password').removeAttribute('required');
        submitBtn.innerText = 'Access Session';
    } else {
        btnRegister.classList.add('text-primary', 'border-primary');
        btnRegister.classList.remove('text-gray-500', 'border-transparent');
        btnLogin.classList.remove('text-primary', 'border-primary');
        btnLogin.classList.add('text-gray-500', 'border-transparent');
        sitePassGroup.classList.remove('hidden');
        document.getElementById('auth-site-password').setAttribute('required', 'true');
        submitBtn.innerText = 'Register Account';
    }
}

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;

    if (authMode === 'register') {
        const sitePass = document.getElementById('auth-site-password').value;
        if (sitePass !== 'bhootnath') { alert('Invalid Site Password.'); return; }
        if (users.find(u => u.username === username)) { alert('Username already exists.'); return; }
        
        users.push({ username, password });
        localStorage.setItem(PREFIX+'users', JSON.stringify(users));
        logSystemEvent(`User created: ${username}`);
    } else {
        const user = users.find(u => u.username === username);
        if (!user || user.password !== password) {
            logSystemEvent(`Failed login attempt for: ${username}`);
            alert('Invalid Username or Password.');
            return;
        }
    }

    localStorage.setItem(PREFIX+'session_user', username);
    logSystemEvent(`Session started: ${username}`);
    document.getElementById('login-modal').classList.add('hidden');
    currentUser = username;
    loadUserData();
});

function logoutUser() {
    logSystemEvent(`Session ended: ${currentUser}`);
    localStorage.removeItem(PREFIX+'session_user');
    location.reload();
}

function updateCredentials() {
    const newUsername = document.getElementById('settings-username').value.trim();
    const newPassword = document.getElementById('settings-password').value;
    
    if(!newUsername && !newPassword) return;
    
    const user = users.find(u => u.username === currentUser);
    if(newUsername && newUsername !== currentUser) {
        if(users.find(u => u.username === newUsername)) {
            alert("Username already taken."); return;
        }
        user.username = newUsername;
        
        allTasks.forEach(t => { if(t.owner === currentUser) t.owner = newUsername; });
        saveData();
        
        localStorage.setItem(PREFIX+`categories_${newUsername}`, JSON.stringify(userCategories));
        localStorage.setItem(PREFIX+`syllabus_${newUsername}`, JSON.stringify(userSyllabus));
        
        localStorage.removeItem(PREFIX+`categories_${currentUser}`);
        localStorage.removeItem(PREFIX+`syllabus_${currentUser}`);
        
        currentUser = newUsername;
        localStorage.setItem(PREFIX+'session_user', currentUser);
    }
    
    if(newPassword) {
        user.password = newPassword;
    }
    
    localStorage.setItem(PREFIX+'users', JSON.stringify(users));
    alert("Credentials updated successfully.");
}

function loadUserData() {
    allTasks = JSON.parse(localStorage.getItem(PREFIX+'tasks')) || [];
    userCategories = JSON.parse(localStorage.getItem(PREFIX+`categories_${currentUser}`)) || [];
    userSyllabus = JSON.parse(localStorage.getItem(PREFIX+`syllabus_${currentUser}`)) || {};
    
    document.getElementById('settings-username').value = currentUser;
    document.getElementById('settings-playful-mode').checked = isPlayfulMode;
    document.getElementById('playful-mode-toggle').checked = isPlayfulMode;
    if(isPlayfulMode) togglePlayfulMode(true);
    
    if (userCategories.length === 0) {
        openOnboarding();
    } else {
        initializeAppUI();
    }
}

function getUserTasks() { return allTasks.filter(t => t.owner === currentUser); }

function initializeAppUI() {
    buildFilters();
    buildCategoryDropdown();
    updateDateDisplay();
    renderTasks();
    renderMonthlyCalendar();
    buildSyllabusUI();
    populateFocusTaskDropdown();
    renderSettingsCategories();
}

function openOnboarding() {
    renderOnboardingGrid();
    document.getElementById('onboarding-modal').classList.remove('hidden');
}

function renderOnboardingGrid() {
    const grid = document.getElementById('onboarding-grid');
    grid.innerHTML = '';
    const pool = Array.from(new Set([...ALL_CATEGORIES.map(c => c.name), ...userCategories]));
    
    pool.forEach(catName => {
        const isChecked = userCategories.includes(catName) ? 'checked' : '';
        grid.innerHTML += `
            <label class="flex items-center p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input type="checkbox" value="${catName}" class="onboarding-cb w-5 h-5 text-primary bg-white border-gray-300 rounded focus:ring-primary" ${isChecked} onchange="handleCatCheck(this)">
                <span class="ml-3 font-semibold text-gray-800 dark:text-gray-200">${catName}</span>
            </label>
        `;
    });
}

function handleCatCheck(cb) {
    const checked = document.querySelectorAll('.onboarding-cb:checked');
    if(checked.length > 5) {
        cb.checked = false;
        alert("Maximum of 5 categories allowed.");
    }
}

function addCustomCategoryOnboarding() {
    const inp = document.getElementById('onboarding-custom-cat');
    const val = inp.value.trim();
    if(!val) return;
    const checked = document.querySelectorAll('.onboarding-cb:checked');
    if(checked.length >= 5 && !userCategories.includes(val)) { alert("Maximum of 5 categories allowed."); return; }
    
    if(!ALL_CATEGORIES.find(c => c.name === val)) {
        ALL_CATEGORIES.push({ id: 'cat_' + Date.now(), name: val, weight: 1.0 });
    }
    
    if(!userCategories.includes(val) && userCategories.length < 5) {
        userCategories.push(val);
    }
    inp.value = '';
    renderOnboardingGrid();
}

function saveCategories() {
    const checkboxes = document.querySelectorAll('.onboarding-cb:checked');
    userCategories = Array.from(checkboxes).map(cb => cb.value);
    
    if (userCategories.length === 0) { alert("Please select at least one category."); return; }
    if (userCategories.length > 5) { alert("Maximum 5 categories allowed."); return; }
    
    localStorage.setItem(PREFIX+`categories_${currentUser}`, JSON.stringify(userCategories));
    document.getElementById('onboarding-modal').classList.add('hidden');
    
    activeFilter = 'Central'; 
    initializeAppUI();
}

function renderSettingsCategories() {
    const list = document.getElementById('settings-categories-list');
    list.innerHTML = '';
    userCategories.forEach(cat => {
        list.innerHTML += `
            <div class="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center font-bold text-sm text-gray-800 dark:text-gray-200 shadow-sm">
                ${cat}
                <button onclick="removeCategory('${cat}')" class="ml-2 text-red-500 hover:text-red-700 font-bold">&times;</button>
            </div>
        `;
    });
}

function removeCategory(cat) {
    userCategories = userCategories.filter(c => c !== cat);
    localStorage.setItem(PREFIX+`categories_${currentUser}`, JSON.stringify(userCategories));
    initializeAppUI();
}

function addCustomCategory() {
    if(userCategories.length >= 5) { alert("Maximum 5 categories allowed."); return; }
    const inp = document.getElementById('settings-new-category');
    const val = inp.value.trim();
    if(!val || userCategories.includes(val)) return;
    
    if(!ALL_CATEGORIES.find(c => c.name === val)) ALL_CATEGORIES.push({ id: 'cat_' + Date.now(), name: val, weight: 1.0 });
    userCategories.push(val);
    localStorage.setItem(PREFIX+`categories_${currentUser}`, JSON.stringify(userCategories));
    inp.value = '';
    initializeAppUI();
}

function buildFilters() {
    const container = document.getElementById('calendar-filters');
    container.innerHTML = `<button class="filter-btn active bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-full text-sm font-bold shadow-md transition-all whitespace-nowrap" data-filter="Central">Central (All)</button>`;
    
    userCategories.forEach(catName => {
        const catObj = ALL_CATEGORIES.find(c => c.name === catName);
        const key = catObj ? catObj.id : 'cat3';
        container.innerHTML += `<button class="filter-btn text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all whitespace-nowrap hover:border-primary border-b-2 cat-border-${key}" data-filter="${catName}">${catName}</button>`;
    });
    setupFilterListeners();
}

function buildCategoryDropdown() {
    const select = document.getElementById('task-category');
    select.innerHTML = '';
    userCategories.forEach(catName => {
        select.innerHTML += `<option value="${catName}">${catName}</option>`;
    });
}

function changeDate(days) {
    activeDate.setDate(activeDate.getDate() + days);
    updateDateDisplay();
    renderTasks();
}

function updateDateDisplay() {
    const today = new Date();
    const isToday = activeDate.toDateString() === today.toDateString();
    if (isToday) {
        dateDisplay.innerText = "Today";
    } else {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        dateDisplay.innerText = activeDate.toLocaleDateString(undefined, options);
    }
}

function switchTab(tab) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white', 'shadow-md');
        btn.classList.add('text-gray-500', 'dark:text-gray-400');
    });
    const activeDesktopBtn = document.getElementById(`nav-${tab}`);
    if(activeDesktopBtn) {
        activeDesktopBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
        activeDesktopBtn.classList.add('bg-primary', 'text-white', 'shadow-md');
    }

    document.querySelectorAll('.mob-nav-btn').forEach(btn => {
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-500', 'dark:text-gray-400');
    });
    const activeMobileBtn = document.getElementById(`mob-nav-${tab}`);
    if(activeMobileBtn) {
        activeMobileBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
        activeMobileBtn.classList.add('text-primary');
    }
    
    const views = ['calendar', 'monthly', 'focus', 'syllabus', 'analytics', 'settings', 'admin'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if(el) {
            el.classList.add('hidden');
            if (v === 'focus') el.classList.remove('flex'); 
        }
    });
    
    const targetView = document.getElementById(`view-${tab}`);
    if(targetView) {
        if(tab === 'focus') {
            targetView.classList.remove('hidden');
            targetView.classList.add('flex');
            populateFocusTaskDropdown();
        } else {
            targetView.classList.remove('hidden');
        }
    }

    const header = document.getElementById('main-header');
    if (tab === 'calendar') {
        header.style.display = 'flex';
        renderTasks();
    } else {
        header.style.display = 'none';
        if (tab === 'monthly') {
            header.style.display = 'flex';
            renderMonthlyCalendar();
        }
        if (tab === 'analytics') renderAnalytics();
        if (tab === 'admin') renderAdminDashboard();
    }
}

function setupFilterListeners() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            buttons.forEach(b => {
                b.classList.remove('active', 'bg-gray-900', 'dark:bg-white', 'text-white', 'dark:text-gray-900');
                b.classList.add('text-gray-500', 'dark:text-gray-400', 'bg-white', 'dark:bg-gray-800');
            });
            e.target.classList.remove('text-gray-500', 'dark:text-gray-400', 'bg-white', 'dark:bg-gray-800');
            e.target.classList.add('active', 'bg-gray-900', 'dark:bg-white', 'text-white', 'dark:text-gray-900');
            
            activeFilter = e.target.getAttribute('data-filter');
            renderTasks();
        });
    });
}

function renderTasks() {
    taskList.innerHTML = '';
    const myTasks = getUserTasks();
    
    let filteredTasks = myTasks.filter(t => t.date === formatDateForInput(activeDate));
    if (activeFilter !== 'Central') {
        filteredTasks = filteredTasks.filter(t => t.category === activeFilter);
    }
    
    filteredTasks.sort((a, b) => {
        if(a.customOrder !== undefined && b.customOrder !== undefined) return a.customOrder - b.customOrder;
        if(!a.startTime) return -1;
        if(!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
    });

    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
    } else {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
        
        filteredTasks.forEach((task, index) => {
            const catObj = ALL_CATEGORIES.find(c => c.name === task.category);
            const key = catObj ? catObj.id : 'cat3';
            const statusKey = task.status.split(' ')[0]; 
            
            const card = document.createElement('div');
            card.draggable = true;
            card.dataset.id = task.id;
            card.className = `task-card bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-100 dark:border-gray-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 border-l-4 cat-border-${key} cursor-pointer animate-fade-in-up`;
            card.style.animationDelay = `${index * 0.05}s`;
            
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('dragleave', handleDragLeave);
            card.addEventListener('drop', handleDrop);
            card.onclick = () => openNotes(task.id);
            
            const timeStr = (task.startTime && task.endTime) ? `${formatAmPm(task.startTime)} - ${formatAmPm(task.endTime)}` : "Anytime / All Day";
            
            card.innerHTML = `
                <div class="flex-1 pr-4">
                    <div class="flex items-center space-x-3 mb-2">
                        <div class="cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-500 mr-1" title="Drag to reorder">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>
                        </div>
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide cat-tag-${key}">${task.category}</span>
                        <span class="text-sm font-bold status-${statusKey}">• ${task.status}</span>
                        ${task.groupId ? '<span class="text-xs text-blue-500 font-bold ml-2">↻ Recurring</span>' : ''}
                    </div>
                    <h4 class="text-xl font-extrabold text-gray-900 dark:text-white mb-1 flex items-center">${task.title}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeStr}
                    </p>
                </div>
                <div class="mt-4 md:mt-0 flex items-center space-x-2" onclick="event.stopPropagation()">
                    <select onchange="quickUpdateStatus('${task.id}', this.value)" class="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                        <option value="Pending" ${task.status==='Pending'?'selected':''}>Pending</option>
                        <option value="Completed" ${task.status==='Completed'?'selected':''}>Completed</option>
                        <option value="Partially Completed" ${task.status==='Partially Completed'?'selected':''}>Partially</option>
                        <option value="Delayed" ${task.status==='Delayed'?'selected':''}>Delayed</option>
                        <option value="Abandoned" ${task.status==='Abandoned'?'selected':''}>Abandoned</option>
                    </select>
                    <button onclick="editTask('${task.id}')" class="p-2 text-gray-400 hover:text-primary bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onclick="deleteTask('${task.id}')" class="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            taskList.appendChild(card);
        });
    }
}

function handleDragStart(e) { draggedTaskId = this.dataset.id; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => this.classList.add('opacity-50', 'scale-95'), 0); }
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const card = e.target.closest('.task-card'); if(card && card.dataset.id !== draggedTaskId) card.classList.add('border-primary', 'border-2'); }
function handleDragLeave(e) { const card = e.target.closest('.task-card'); if(card) card.classList.remove('border-primary', 'border-2'); }
function handleDrop(e) {
    e.preventDefault();
    const card = e.target.closest('.task-card');
    if(card) card.classList.remove('border-primary', 'border-2');
    document.querySelectorAll('.task-card').forEach(c => c.classList.remove('opacity-50', 'scale-95'));
    
    const targetId = card ? card.dataset.id : null;
    if(!targetId || targetId === draggedTaskId) return;

    const currentViewIds = Array.from(document.querySelectorAll('.task-card')).map(c => c.dataset.id);
    const dragIdx = currentViewIds.indexOf(draggedTaskId);
    const dropIdx = currentViewIds.indexOf(targetId);
    
    currentViewIds.splice(dragIdx, 1);
    currentViewIds.splice(dropIdx, 0, draggedTaskId);
    
    currentViewIds.forEach((id, index) => {
        const t = allTasks.find(x => x.id === id);
        if(t) t.customOrder = index;
    });
    saveData();
    renderTasks();
}

document.getElementById('task-untimed').addEventListener('change', (e) => {
    const timeInputs = document.querySelectorAll('#task-start, #task-end');
    timeInputs.forEach(inp => {
        inp.disabled = e.target.checked;
        if(e.target.checked) inp.classList.add('opacity-50');
        else inp.classList.remove('opacity-50');
    });
});

function openModal() {
    document.getElementById('modal-title').innerText = 'Add New Task';
    taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-date').value = formatDateForInput(activeDate);
    
    document.getElementById('task-untimed').checked = false;
    document.querySelectorAll('#task-start, #task-end').forEach(inp => {
        inp.disabled = false;
        inp.classList.remove('opacity-50');
    });

    document.getElementById('status-container').classList.add('hidden');
    document.getElementById('recurrence-container').classList.remove('hidden');
    taskModal.classList.remove('hidden');
}

function closeModal() { taskModal.classList.add('hidden'); }

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const isNew = !id;
    const recurrence = document.getElementById('task-recurrence').value;
    const isUntimed = document.getElementById('task-untimed').checked;
    
    const baseTaskObj = {
        title: document.getElementById('task-title').value,
        category: document.getElementById('task-category').value,
        startTime: isUntimed ? "" : document.getElementById('task-start').value,
        endTime: isUntimed ? "" : document.getElementById('task-end').value,
        owner: currentUser
    };

    const dateBase = document.getElementById('task-date').value;

    if (isNew) {
        if (recurrence === 'none') {
            allTasks.push({ ...baseTaskObj, id: Date.now().toString(), date: dateBase, status: 'Pending', notes: '', customOrder: 0, actualFocusTime: 0 });
        } else {
            const startD = new Date(dateBase);
            const groupId = 'group_' + Date.now().toString();
            for(let i=0; i<90; i++) {
                const currentD = new Date(startD);
                currentD.setDate(startD.getDate() + i);
                const dayOfWeek = currentD.getDay(); 
                
                let shouldAdd = false;
                if (recurrence === 'daily') shouldAdd = true;
                if (recurrence === 'weekly' && i % 7 === 0) shouldAdd = true;
                if (recurrence === 'weekdays' && dayOfWeek !== 0 && dayOfWeek !== 6) shouldAdd = true;

                if (shouldAdd) {
                    allTasks.push({ ...baseTaskObj, id: (Date.now() + i).toString(), date: formatDateForInput(currentD), status: 'Pending', notes: '', customOrder: 0, actualFocusTime: 0, groupId: groupId });
                }
            }
        }
        logSystemEvent(`Task added: ${baseTaskObj.title}`);
    } else {
        const index = allTasks.findIndex(t => t.id === id);
        const prevTask = allTasks[index];
        allTasks[index] = { ...baseTaskObj, id: id, date: dateBase, status: document.getElementById('task-status').value, notes: prevTask.notes || '', customOrder: prevTask.customOrder || 0, actualFocusTime: prevTask.actualFocusTime || 0, groupId: prevTask.groupId };
    }

    saveData();
    closeModal();
    renderTasks();
    populateFocusTaskDropdown();
    if(!document.getElementById('view-monthly').classList.contains('hidden')) renderMonthlyCalendar();
});

function editTask(id) {
    const task = allTasks.find(t => t.id === id);
    if(!task) return;
    document.getElementById('modal-title').innerText = 'Edit Task Details';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-date').value = task.date;
    document.getElementById('task-category').value = task.category;
    
    if(!task.startTime || task.startTime === "") {
        document.getElementById('task-untimed').checked = true;
        document.getElementById('task-start').disabled = true;
        document.getElementById('task-end').disabled = true;
        document.getElementById('task-start').classList.add('opacity-50');
        document.getElementById('task-end').classList.add('opacity-50');
        document.getElementById('task-start').value = "";
        document.getElementById('task-end').value = "";
    } else {
        document.getElementById('task-untimed').checked = false;
        document.getElementById('task-start').disabled = false;
        document.getElementById('task-end').disabled = false;
        document.getElementById('task-start').classList.remove('opacity-50');
        document.getElementById('task-end').classList.remove('opacity-50');
        document.getElementById('task-start').value = task.startTime;
        document.getElementById('task-end').value = task.endTime;
    }
    
    document.getElementById('status-container').classList.remove('hidden');
    document.getElementById('recurrence-container').classList.add('hidden'); 
    document.getElementById('task-status').value = task.status;
    taskModal.classList.remove('hidden');
}

function quickUpdateStatus(id, newStatus) {
    const index = allTasks.findIndex(t => t.id === id);
    if(index > -1) {
        allTasks[index].status = newStatus;
        saveData();
        renderTasks();
        populateFocusTaskDropdown();
        if (newStatus === 'Delayed' || newStatus === 'Abandoned') setTimeout(() => { openNotes(id); }, 300);
    }
}

function deleteTask(id) {
    const task = allTasks.find(t => t.id === id);
    if(!task) return;

    if(task.groupId) {
        const res = confirm("This is a recurring task.\n\nClick OK to delete ALL upcoming instances in this series.\nClick Cancel to delete ONLY this specific task.");
        if(res) {
            allTasks = allTasks.filter(t => !(t.groupId === task.groupId && t.date >= task.date));
        } else {
            allTasks = allTasks.filter(t => t.id !== id);
        }
    } else {
        if(!confirm("Are you sure you want to delete this task?")) return;
        allTasks = allTasks.filter(t => t.id !== id);
    }
    
    logSystemEvent(`Task(s) deleted by ${currentUser}.`);
    saveData();
    renderTasks();
    populateFocusTaskDropdown();
    if(!document.getElementById('view-monthly').classList.contains('hidden')) renderMonthlyCalendar();
}

function openNotes(id) {
    const task = allTasks.find(t => t.id === id);
    if(!task) return;
    currentNoteTaskId = id;
    
    const catObj = ALL_CATEGORIES.find(c => c.name === task.category);
    const key = catObj ? catObj.id : 'cat3';
    
    document.getElementById('note-title').innerText = task.title;
    document.getElementById('task-notes-input').value = task.notes || '';
    notesModal.classList.remove('hidden');
}

function closeNotes() { notesModal.classList.add('hidden'); currentNoteTaskId = null; }
function saveNotes() {
    if(currentNoteTaskId) {
        const index = allTasks.findIndex(t => t.id === currentNoteTaskId);
        if(index > -1) {
            allTasks[index].notes = document.getElementById('task-notes-input').value;
            saveData();
            renderTasks();
        }
    }
    closeNotes();
}

function saveData() { localStorage.setItem(PREFIX+'tasks', JSON.stringify(allTasks)); }

function toggleSettingsPlayfulMode() {
    isPlayfulMode = document.getElementById('settings-playful-mode').checked;
    document.getElementById('playful-mode-toggle').checked = isPlayfulMode;
    localStorage.setItem(PREFIX+'playful', isPlayfulMode);
    togglePlayfulMode(isPlayfulMode);
}

function togglePlayfulModeUI() {
    isPlayfulMode = document.getElementById('playful-mode-toggle').checked;
    document.getElementById('settings-playful-mode').checked = isPlayfulMode;
    localStorage.setItem(PREFIX+'playful', isPlayfulMode);
    togglePlayfulMode(isPlayfulMode);
}

function togglePlayfulMode(active) {
    const uiContainer = document.getElementById('focus-ui-container');
    const qc = document.getElementById('playful-quote-container');
    const mascot = document.getElementById('playful-mascot');
    const title = document.getElementById('focus-title');
    
    if(active) {
        uiContainer.classList.add('playful-mode');
        qc.classList.remove('hidden');
        mascot.classList.remove('hidden');
        title.classList.add('text-pink-500');
        changeQuote();
    } else {
        uiContainer.classList.remove('playful-mode');
        qc.classList.add('hidden');
        mascot.classList.add('hidden');
        title.classList.remove('text-pink-500');
    }
}

function changeQuote() { document.getElementById('playful-quote').innerText = playQuotes[Math.floor(Math.random() * playQuotes.length)]; }
document.getElementById('playful-quote-container')?.addEventListener('click', changeQuote);

function shootEmojis() {
    const emojis = ['🦊', '🐼', '🦁', '🐸', '🦄', '🎉', '⭐', '🚀', '🍰', '🎈'];
    for(let i=0; i<30; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
            el.className = 'emoji-particle';
            el.style.left = (Math.random() * 80 + 10) + 'vw';
            el.style.top = '100vh';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3000);
        }, i * 80);
    }
}

function populateFocusTaskDropdown() {
    const select = document.getElementById('focus-task-select');
    if (!select) return;
    select.innerHTML = '<option value="">Select a task to focus on...</option>';
    const todayStr = formatDateForInput(new Date());
    const pendingTasks = getUserTasks().filter(t => t.date === todayStr && t.status === 'Pending');
    pendingTasks.sort((a,b) => {
        if(!a.startTime) return -1;
        if(!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
    });
    pendingTasks.forEach(t => { select.innerHTML += `<option value="${t.id}">${t.title} (${t.category})</option>`; });
}

document.getElementById('focus-task-select')?.addEventListener('change', (e) => { currentFocusTaskId = e.target.value; });

function togglePomodoro() {
    const btn = document.getElementById('focus-start-btn');
    const lengthSelect = document.getElementById('focus-timer-length').value;
    const isUntimed = lengthSelect === 'untimed';
    
    if(focusTimer) { 
        clearInterval(focusTimer);
        focusTimer = null;
        btn.innerText = "Resume Timer";
        return;
    }
    
    if(elapsedFocusSeconds === 0 && !isUntimed) {
        focusTimeRemaining = parseInt(lengthSelect) * 60;
        focusModeType = 'work';
    } else if (elapsedFocusSeconds === 0 && isUntimed) {
        focusModeType = 'untimed';
        focusTimeRemaining = 0;
    }

    btn.innerText = "Pause Timer";
    focusTimer = setInterval(() => {
        elapsedFocusSeconds++;
        
        if(focusModeType === 'untimed') {
            focusTimeRemaining++;
            updatePomodoroDisplay();
        } else {
            focusTimeRemaining--;
            updatePomodoroDisplay();
            
            if(focusTimeRemaining <= 0) {
                clearInterval(focusTimer);
                focusTimer = null;
                btn.innerText = "Start Timer";
                if (focusModeType === 'work') {
                    alert("Focus session complete! Time for a short break.");
                    focusModeType = 'break';
                    focusTimeRemaining = 5 * 60;
                    document.getElementById('focus-state-label').innerText = "Short Break";
                } else {
                    alert("Break is over! Time to get back to work.");
                    focusModeType = 'work';
                    focusTimeRemaining = parseInt(document.getElementById('focus-timer-length').value) * 60;
                    document.getElementById('focus-state-label').innerText = "Work Session";
                }
                updatePomodoroDisplay();
            }
        }
    }, 1000);
}

function resetPomodoro() {
    clearInterval(focusTimer);
    focusTimer = null;
    elapsedFocusSeconds = 0;
    const len = document.getElementById('focus-timer-length').value;
    focusTimeRemaining = len === 'untimed' ? 0 : parseInt(len) * 60;
    focusModeType = len === 'untimed' ? 'untimed' : 'work';
    
    document.getElementById('focus-start-btn').innerText = "Start Timer";
    document.getElementById('focus-state-label').innerText = "Ready";
    updatePomodoroDisplay(true);
}

function updatePomodoroDisplay(resetUI=false) {
    let displayVal = focusTimeRemaining;
    if(focusModeType === 'untimed') displayVal = elapsedFocusSeconds;
    
    const m = Math.floor(displayVal / 60);
    const s = displayVal % 60;
    document.getElementById('focus-timer-display').innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    const ring = document.getElementById('focus-timer-ring');
    if(focusModeType === 'untimed' || resetUI) {
        ring.style.strokeDashoffset = 0;
    } else {
        let total = 25 * 60;
        if(focusModeType === 'work') {
            const len = parseInt(document.getElementById('focus-timer-length').value);
            if(!isNaN(len)) total = len * 60;
        } else { total = 5 * 60; }
        ring.style.strokeDashoffset = 728 - (focusTimeRemaining / total) * 728;
    }
}

function markFocusTaskComplete() {
    if(currentFocusTaskId) {
        const index = allTasks.findIndex(t => t.id === currentFocusTaskId);
        if(index > -1) {
            allTasks[index].status = 'Completed';
            allTasks[index].actualFocusTime = (allTasks[index].actualFocusTime || 0) + Math.floor(elapsedFocusSeconds / 60);
            saveData();
            
            if(isPlayfulMode) shootEmojis();
            
            alert("Awesome! Task marked as completed.");
            document.getElementById('focus-task-select').value = "";
            currentFocusTaskId = null;
            resetPomodoro();
            renderTasks();
            populateFocusTaskDropdown();
        }
    } else {
        alert("Please select a target task from the dropdown first.");
    }
}

window.toggleSyllabusAccordion = function(headerElem) {
    const content = headerElem.nextElementSibling;
    const isHidden = content.classList.contains('hidden');
    document.querySelectorAll('.syllabus-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.syllabus-icon').forEach(icon => icon.classList.remove('rotate-180'));
    if (isHidden) {
        content.classList.remove('hidden');
        headerElem.querySelector('.syllabus-icon').classList.add('rotate-180');
    }
};

function buildSyllabusUI() {
    const container = document.getElementById('syllabus-container');
    container.innerHTML = '';
    
    Object.keys(SYLLABUS_DATA).forEach(examName => {
        const chapters = SYLLABUS_DATA[examName];
        let mastered = 0;
        chapters.forEach(ch => { if(userSyllabus[`${examName}_${ch}`] === 'Mastered') mastered++; });
        const progressPct = chapters.length > 0 ? Math.round((mastered / chapters.length) * 100) : 0;

        let chapHTML = '';
        chapters.forEach(ch => {
            const val = userSyllabus[`${examName}_${ch}`] || 'Not Started';
            chapHTML += `
                <div class="flex justify-between items-center p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${ch}</span>
                    <select onchange="updateSyllabus('${examName}', '${ch}', this.value)" class="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 focus:ring-primary shadow-sm">
                        <option value="Not Started" ${val==='Not Started'?'selected':''}>Not Started</option>
                        <option value="Theory Done" ${val==='Theory Done'?'selected':''}>Theory Done</option>
                        <option value="PYQs Completed" ${val==='PYQs Completed'?'selected':''}>PYQs Completed</option>
                        <option value="Mastered" ${val==='Mastered'?'selected':''}>Mastered</option>
                    </select>
                </div>
            `;
        });

        container.innerHTML += `
            <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden mb-4">
                <div class="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center transition-colors" onclick="toggleSyllabusAccordion(this)">
                    <div class="flex flex-col">
                        <h3 class="font-extrabold text-lg text-gray-900 dark:text-white">${examName}</h3>
                        <div class="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                            <div class="bg-primary h-1.5 rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
                        </div>
                    </div>
                    <svg class="syllabus-icon w-6 h-6 text-gray-400 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div class="syllabus-content hidden bg-gray-50/50 dark:bg-gray-900/50 p-2 border-t border-gray-200 dark:border-gray-700 transition-all duration-300">
                    ${chapHTML}
                </div>
            </div>
        `;
    });
}

function updateSyllabus(exam, chapter, val) {
    userSyllabus[`${exam}_${chapter}`] = val;
    localStorage.setItem(PREFIX+`syllabus_${currentUser}`, JSON.stringify(userSyllabus));
    buildSyllabusUI(); 
}

function changeMonth(dir) { monthlyDate.setMonth(monthlyDate.getMonth() + dir); renderMonthlyCalendar(); }

function renderMonthlyCalendar() {
    const year = monthlyDate.getFullYear();
    const month = monthlyDate.getMonth();
    document.getElementById('month-display').innerText = monthlyDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.getElementById('monthly-grid');
    grid.innerHTML = '';
    
    for(let i=0; i<firstDay; i++) grid.innerHTML += `<div class="p-2 md:p-4 rounded-xl border border-transparent"></div>`;
    
    const myTasks = getUserTasks();
    const todayStr = formatDateForInput(new Date());

    for(let d=1; d<=daysInMonth; d++) {
        const dateStr = formatDateForInput(new Date(year, month, d));
        const dayTasks = myTasks.filter(t => t.date === dateStr);
        let taskHTML = '';
        dayTasks.slice(0, 4).forEach(t => {
            const isDone = t.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200';
            taskHTML += `<div class="text-[10px] md:text-xs truncate font-medium bg-white/50 dark:bg-gray-700/50 rounded px-1 py-0.5 mb-1 w-full text-left ${isDone}" title="${t.title}">${t.title}</div>`;
        });
        if(dayTasks.length > 4) taskHTML += `<div class="text-[10px] text-primary font-bold w-full text-left pl-1">+${dayTasks.length - 4} more</div>`;
        
        const isTodayClass = dateStr === todayStr ? 'bg-primary/5 border-primary/40 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700';
        grid.innerHTML += `
            <div class="p-1 md:p-2 rounded-xl border flex flex-col items-start justify-start cursor-pointer transition-colors h-24 md:h-32 overflow-hidden ${isTodayClass}" onclick="jumpToDate('${dateStr}')">
                <span class="text-sm md:text-base mb-1 ${dateStr === todayStr ? 'text-primary font-black' : 'font-semibold text-gray-500'}">${d}</span>
                <div class="w-full flex-1 overflow-hidden">${taskHTML}</div>
            </div>
        `;
    }
}
function jumpToDate(dateStr) { activeDate = new Date(dateStr); updateDateDisplay(); switchTab('calendar'); }

function renderAnalytics() {
    const myTasks = getUserTasks();
    const totalTasks = myTasks.length;
    
    if(totalTasks === 0) {
        document.getElementById('stat-efficiency').innerText = `0%`;
        return;
    }

    const today = new Date();
    const last7 = getTasksInRange(myTasks, new Date(today.getTime() - 7*24*60*60*1000), today);
    const p7Comp = getTasksInRange(myTasks, new Date(today.getTime() - 14*24*60*60*1000), new Date(today.getTime() - 7*24*60*60*1000)).filter(t => t.status === 'Completed').length;
    const l7Comp = last7.filter(t => t.status === 'Completed').length;
    
    const efficiency = Math.round((myTasks.filter(t => t.status === 'Completed').length / totalTasks) * 100);
    document.getElementById('stat-efficiency').innerText = `${efficiency}%`;
    document.getElementById('stat-velocity').innerText = l7Comp;

    // Total focus
    let focusMins = 0;
    myTasks.forEach(t => { if(t.actualFocusTime) focusMins += t.actualFocusTime; });
    document.getElementById('stat-focus').innerText = focusMins;

    const wowEl = document.getElementById('wow-trend');
    if (p7Comp === 0) { wowEl.innerHTML = `N/A vs last week`; wowEl.className = "text-xs mt-2 font-medium text-gray-500"; } 
    else {
        const diff = Math.round(((l7Comp - p7Comp) / p7Comp) * 100);
        if(diff >= 0) { wowEl.innerHTML = `+${diff}% vs last week`; wowEl.className = "text-xs mt-2 font-medium text-green-500"; } 
        else { wowEl.innerHTML = `${diff}% vs last week`; wowEl.className = "text-xs mt-2 font-medium text-red-500"; }
    }

    const delayedAbandoned = last7.filter(t => t.status === 'Delayed' || t.status === 'Abandoned').length;
    const burnoutPct = last7.length > 0 ? Math.round((delayedAbandoned / last7.length) * 100) : 0;
    document.getElementById('stat-burnout').innerText = `${burnoutPct}%`;
    const burnoutBg = document.getElementById('burnout-bg');
    burnoutBg.style.width = `${burnoutPct}%`;
    if(burnoutPct < 20) burnoutBg.className = 'absolute bottom-0 left-0 h-2 transition-colors bg-green-500';
    else if(burnoutPct < 50) burnoutBg.className = 'absolute bottom-0 left-0 h-2 transition-colors bg-yellow-500';
    else burnoutBg.className = 'absolute bottom-0 left-0 h-2 transition-colors bg-red-500';

    let scheduledTotal = 0; let actualTotal = 0;
    myTasks.forEach(t => {
        if(t.status === 'Completed' && t.actualFocusTime > 0 && t.startTime && t.endTime) {
            const s = new Date(`1970-01-01T${t.startTime}:00Z`);
            const e = new Date(`1970-01-01T${t.endTime}:00Z`);
            let diffMins = (e - s) / 60000;
            if (diffMins < 0) diffMins += (24*60);
            scheduledTotal += diffMins;
            actualTotal += t.actualFocusTime;
        }
    });
    if(scheduledTotal > 0) {
        const ratio = (actualTotal / scheduledTotal);
        document.getElementById('stat-estimation').innerText = ratio.toFixed(2) + 'x';
    }

    let counts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    myTasks.filter(t => t.status === 'Completed' && t.endTime).forEach(t => {
        const hr = parseInt(t.endTime.split(':')[0]);
        if(hr >= 5 && hr < 12) counts.morning++;
        else if(hr >= 12 && hr < 17) counts.afternoon++;
        else if(hr >= 17 && hr < 21) counts.evening++;
        else counts.night++;
    });
    let maxBlock = Math.max(counts.morning, counts.afternoon, counts.evening, counts.night) || 1;
    document.getElementById('heatmap-container').innerHTML = Object.keys(counts).map(k => {
        const op = Math.max(0.1, counts[k]/maxBlock);
        return `<div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center relative overflow-hidden">
            <div class="absolute inset-0 bg-primary opacity-${Math.round(op*100)}" style="opacity: ${op}"></div>
            <span class="z-10 font-bold uppercase text-xs text-gray-900 dark:text-white drop-shadow-md">${k}</span>
            <span class="z-10 font-black text-xl text-gray-900 dark:text-white drop-shadow-md">${counts[k]}</span>
        </div>`;
    }).join('');

    const streakGraph = document.getElementById('streak-graph'); streakGraph.innerHTML = '';
    let currentStreak = 0;
    for(let i=0; i<100; i++) { 
        const d = new Date(); d.setDate(d.getDate() - i);
        if(myTasks.filter(t => t.date === formatDateForInput(d)).some(t => t.status === 'Completed')) currentStreak++;
        else if (i !== 0) break;
    }
    document.getElementById('current-streak').innerText = currentStreak;

    for (let i = 41; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const comps = myTasks.filter(t => t.date === formatDateForInput(d) && t.status === 'Completed').length;
        let cClass = 'bg-gray-100 dark:bg-gray-700';
        if(comps > 0) cClass = 'bg-orange-300 dark:bg-orange-600/50';
        if(comps > 2) cClass = 'bg-orange-400 dark:bg-orange-500';
        if(comps > 4) cClass = 'bg-orange-500 dark:bg-orange-400';
        streakGraph.innerHTML += `<div class="w-4 h-4 rounded-sm ${cClass}" title="${comps} completed"></div>`;
    }

    const delayCounts = {}; const compCounts = {};
    userCategories.forEach(c => { delayCounts[c] = 0; compCounts[c] = 0; });
    myTasks.forEach(t => {
        if(t.status === 'Delayed' || t.status === 'Abandoned') { if(delayCounts[t.category] !== undefined) delayCounts[t.category]++; }
        if(t.status === 'Completed') { if(compCounts[t.category] !== undefined) compCounts[t.category]++; }
    });

    const ratioContainer = document.getElementById('ratio-container'); ratioContainer.innerHTML = '';
    userCategories.forEach(cat => {
        const delays = delayCounts[cat]; const comps = compCounts[cat]; const total = delays + comps;
        if(total === 0) return;
        const delayPct = Math.round((delays / total) * 100);
        ratioContainer.innerHTML += `
            <div class="mb-3">
                <div class="flex justify-between text-xs font-bold mb-1 uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <span>${cat}</span>
                    <span class="flex space-x-3"><span class="text-green-500">${comps} done</span> <span class="text-red-500">${delays} delay</span></span>
                </div>
                <div class="flex w-full h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <div style="width: ${100-delayPct}%" class="bg-green-500"></div>
                    <div style="width: ${delayPct}%" class="bg-red-500"></div>
                </div>
            </div>`;
    });

    const timeSpent = {}; userCategories.forEach(c => timeSpent[c] = 0);
    let maxTime = 0;
    myTasks.forEach(t => {
        if(timeSpent[t.category] === undefined || !t.startTime || !t.endTime) return;
        const start = new Date(`1970-01-01T${t.startTime}:00Z`);
        const end = new Date(`1970-01-01T${t.endTime}:00Z`);
        let diffHours = (end - start) / 3600000;
        if (diffHours < 0) diffHours += 24; 
        timeSpent[t.category] += diffHours;
    });
    for (const cat in timeSpent) if (timeSpent[cat] > maxTime) maxTime = timeSpent[cat];

    const barsContainer = document.getElementById('time-allocation-bars'); barsContainer.innerHTML = '';
    for (const [cat, hours] of Object.entries(timeSpent)) {
        if(hours === 0 && maxTime > 0) continue; 
        const percentage = maxTime === 0 ? 0 : Math.round((hours / maxTime) * 100);
        barsContainer.innerHTML += `
            <div>
                <div class="flex justify-between text-sm mb-1.5 font-bold"><span class="text-gray-800 dark:text-white">${cat}</span><span class="text-gray-500 dark:text-gray-400">${hours.toFixed(1)} hrs</span></div>
                <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3.5 shadow-inner"><div class="h-3.5 rounded-full bg-primary transition-all duration-1000 ease-out" style="width: ${percentage}%"></div></div>
            </div>`;
    }
}
function getTasksInRange(tasks, startDate, endDate) { return tasks.filter(t => { const taskD = new Date(t.date); return taskD >= startDate && taskD <= endDate; }); }

function exportData(format) {
    const myTasks = getUserTasks();
    if(myTasks.length === 0) { alert("No data available to export."); return; }
    if(format === 'json') { triggerDownload(JSON.stringify(myTasks, null, 2), 'application/json', `ghadi_export_${currentUser}.json`); } 
    else if (format === 'csv') {
        const headers = ['ID', 'Title', 'Date', 'Category', 'StartTime', 'EndTime', 'Status', 'Notes', 'ActualFocusTime'];
        const rows = myTasks.map(t => `${t.id},"${t.title}",${t.date},"${t.category}",${t.startTime||''},${t.endTime||''},${t.status},"${(t.notes||'').replace(/"/g, '""')}",${t.actualFocusTime||0}`);
        triggerDownload([headers.join(','), ...rows].join('\n'), 'text/csv', `ghadi_export_${currentUser}.csv`);
    }
}
function triggerDownload(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function handleLogoClick() {
    logoClicks++; clearTimeout(logoTimer);
    if(logoClicks >= 5) { logoClicks = 0; document.getElementById('admin-auth-modal').classList.remove('hidden'); document.getElementById('admin-passcode').value = ''; } 
    else { logoTimer = setTimeout(() => { logoClicks = 0; }, 2000); }
}
function closeAdminAuth() { document.getElementById('admin-auth-modal').classList.add('hidden'); }
function verifyAdminPasscode() {
    if(document.getElementById('admin-passcode').value === "Project3Clock") {
        closeAdminAuth(); switchTab('admin'); logSystemEvent("Admin panel accessed.");
    } else { alert("ACCESS DENIED"); closeAdminAuth(); }
}

function renderAdminDashboard() {
    const tbody = document.getElementById('admin-user-list'); tbody.innerHTML = '';
    users.forEach((u) => {
        const uTasks = allTasks.filter(t => t.owner === u.username);
        let totalHrs = 0;
        uTasks.forEach(t => { if(t.actualFocusTime) totalHrs += (t.actualFocusTime/60); });
        tbody.innerHTML += `
            <tr class="hover:bg-purple-800/30 transition-colors">
                <td class="p-4 font-medium text-purple-100 flex items-center gap-2">
                    ${u.username}
                    ${u.username === currentUser ? '<span class="px-2 py-0.5 bg-green-900 text-green-300 text-[10px] rounded border border-green-500">ACTIVE</span>' : ''}
                </td>
                <td class="p-4 font-mono text-purple-400 text-sm opacity-50 hover:opacity-100 transition-opacity">•••••• (Hidden)</td>
                <td class="p-4 font-bold text-green-400">${totalHrs.toFixed(1)} hrs</td>
                <td class="p-4 flex space-x-2">
                    <button onclick="adminDeleteUser('${u.username}')" class="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-500 shadow-md">Wipe User</button>
                </td>
            </tr>`;
    });
}

function adminDeleteUser(uname) {
    if(confirm(`WARNING: Deleting user ${uname} will free a slot but destroy their access. Proceed?`)) {
        users = users.filter(u => u.username !== uname); localStorage.setItem(PREFIX+'users', JSON.stringify(users));
        allTasks = allTasks.filter(t => t.owner !== uname); localStorage.setItem(PREFIX+'tasks', JSON.stringify(allTasks));
        localStorage.removeItem(PREFIX+`categories_${uname}`); localStorage.removeItem(PREFIX+`syllabus_${uname}`);
        logSystemEvent(`Admin wiped user data: ${uname}`);
        if(currentUser === uname) logoutUser(); else renderAdminDashboard();
    }
}

function nukeDatabase() {
    if(document.getElementById('nuke-input').value === "CONFIRM_NUKE_ALL") {
        localStorage.clear(); alert("System Reset Complete."); location.reload();
    } else { alert("Nuke aborted. Invalid confirmation code."); }
}

function startDeleteAccount() { document.getElementById('delete-modal-1').classList.remove('hidden'); }
function proceedDeleteStep2() { document.getElementById('delete-modal-1').classList.add('hidden'); document.getElementById('delete-confirm-input').value = ''; document.getElementById('delete-modal-2').classList.remove('hidden'); }
function cancelDelete() { document.getElementById('delete-modal-1').classList.add('hidden'); document.getElementById('delete-modal-2').classList.add('hidden'); }
function executeFinalDelete() {
    if (document.getElementById('delete-confirm-input').value.trim() === 'DELETE') {
        users = users.filter(u => u.username !== currentUser); localStorage.setItem(PREFIX+'users', JSON.stringify(users));
        allTasks = allTasks.filter(t => t.owner !== currentUser); localStorage.setItem(PREFIX+'tasks', JSON.stringify(allTasks));
        localStorage.removeItem(PREFIX+`categories_${currentUser}`); localStorage.removeItem(PREFIX+`syllabus_${currentUser}`);
        localStorage.removeItem(PREFIX+'session_user');
        location.reload();
    } else { alert("You must type exact 'DELETE' to confirm."); }
}

const ACCENT_COLORS = {
    ocean: { primary: '59 130 246', hover: '37 99 235' },     
    emerald: { primary: '16 185 129', hover: '5 150 105' },   
    amethyst: { primary: '139 92 246', hover: '124 58 237' }, 
    amber: { primary: '245 158 11', hover: '217 119 6' }      
};

function initThemeAndColor() {
    const savedTheme = localStorage.getItem('omnitrack_theme') || 'system';
    const savedColor = localStorage.getItem('omnitrack_color') || 'ocean';
    const savedLightLum = localStorage.getItem('omnitrack_light_lum') || 248;
    const savedDarkLum = localStorage.getItem('omnitrack_dark_lum') || 31;
    
    document.getElementById('light-luminosity').value = savedLightLum;
    document.getElementById('dark-luminosity').value = savedDarkLum;
    updateLuminosity();
    document.getElementById('light-luminosity').addEventListener('input', updateLuminosity);
    document.getElementById('dark-luminosity').addEventListener('input', updateLuminosity);
    applyTheme(savedTheme); applyColor(savedColor);
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => { if(localStorage.getItem('omnitrack_theme') === 'system') applyTheme('system'); });
}

function updateLuminosity() {
    const lVal = document.getElementById('light-luminosity').value;
    const dVal = document.getElementById('dark-luminosity').value;
    localStorage.setItem('omnitrack_light_lum', lVal); localStorage.setItem('omnitrack_dark_lum', dVal);
    const lHex = `#${Number(lVal).toString(16)}${Number(lVal).toString(16)}${Number(lVal).toString(16)}`;
    const dHex = `#${Number(dVal).toString(16).padStart(2,'0')}${Number(dVal).toString(16).padStart(2,'0')}${Number(dVal).toString(16).padStart(2,'0')}`;
    document.getElementById('light-lum-val').innerText = lHex; document.getElementById('dark-lum-val').innerText = dHex;
    document.documentElement.style.setProperty('--bg-light-hex', lHex); document.documentElement.style.setProperty('--bg-dark-hex', dHex);
}

function setTheme(theme) { localStorage.setItem('omnitrack_theme', theme); applyTheme(theme); }
function applyTheme(theme) {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); }
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if(btn.dataset.theme === theme) { btn.classList.add('bg-gray-200', 'dark:bg-gray-600', 'border-gray-400', 'dark:border-gray-400'); btn.classList.remove('border-gray-300', 'dark:border-gray-600'); } 
        else { btn.classList.remove('bg-gray-200', 'dark:bg-gray-600', 'border-gray-400', 'dark:border-gray-400'); btn.classList.add('border-gray-300', 'dark:border-gray-600'); }
    });
}
function setColor(colorKey) { localStorage.setItem('omnitrack_color', colorKey); applyColor(colorKey); }
function applyColor(colorKey) {
    const colorVals = ACCENT_COLORS[colorKey] || ACCENT_COLORS.ocean;
    document.documentElement.style.setProperty('--color-primary', colorVals.primary);
    document.documentElement.style.setProperty('--color-primary-hover', colorVals.hover);
    document.querySelectorAll('.color-btn').forEach(btn => {
        if(btn.dataset.color === colorKey) { btn.classList.add('border-primary', 'shadow-md'); btn.classList.remove('border-transparent'); } 
        else { btn.classList.remove('border-primary', 'shadow-md'); btn.classList.add('border-transparent'); }
    });
}

function formatDateForInput(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function formatAmPm(timeStr) {
    if(!timeStr) return '';
    let [hours, minutes] = timeStr.split(':');
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
}
