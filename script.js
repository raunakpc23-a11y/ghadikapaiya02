// --- CONFIG & CONSTANTS ---
const ALL_CATEGORIES = [
    { id: 'jee', name: 'JEE', weight: 1.5 },
    { id: 'societies', name: 'Societies', weight: 1.0 },
    { id: 'college', name: 'College', weight: 1.2 },
    { id: 'personal', name: 'Personal', weight: 0.8 },
    { id: 'school', name: 'School', weight: 1.0 },
    { id: 'competitive', name: 'Competitive Exams (WBJEE/BITSAT)', weight: 1.5 },
    { id: 'interviews', name: 'Interviews & Recruitment', weight: 1.3 },
    { id: 'event', name: 'Event Organizing', weight: 1.1 },
    { id: 'trading', name: 'Trading & Finance', weight: 1.2 },
    { id: 'household', name: 'Household & Errands', weight: 0.5 }
];
const MAX_USERS = 10;
const REG_PASSCODE = "Bhootnath";
const ADMIN_PASSCODE = "Project3Clock";

// Data State Setup
let systemUsers = JSON.parse(localStorage.getItem('omnitrack_users')) || [];
let currentUser = localStorage.getItem('omnitrack_session');
let tasks = [];
let userCategories = [];
let activeFilter = 'Central';
let activeDate = new Date();
let currentMonth = new Date();
let currentNoteTaskId = null;
let authMode = 'login';
let adminClickCount = 0;
let adminClickTimer = null;

// Focus Mode State
let isFocusMode = false;
let pomodoroTimer = null;
let pomodoroSeconds = 25 * 60;
let focusTargetId = null;

// Drag & Drop State
let draggedTaskId = null;

// DOM Elements
const taskList = document.getElementById('task-list');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const notesModal = document.getElementById('notes-modal');

// --- INITIALIZATION & AUTH ---
document.addEventListener('DOMContentLoaded', () => {
    initThemeAndColor();
    if (!currentUser) {
        document.getElementById('login-modal').classList.remove('hidden');
        setAuthMode('login');
    } else {
        loadUserData();
    }
});

function setAuthMode(mode) {
    authMode = mode;
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-site-code').value = '';
    
    if (mode === 'login') {
        document.getElementById('tab-login').classList.add('border-primary', 'text-primary');
        document.getElementById('tab-login').classList.remove('border-transparent', 'text-gray-500');
        document.getElementById('tab-register').classList.add('border-transparent', 'text-gray-500');
        document.getElementById('tab-register').classList.remove('border-primary', 'text-primary');
        document.getElementById('auth-site-code-group').classList.add('hidden');
        document.getElementById('auth-submit-btn').innerText = 'Log In';
        document.getElementById('capacity-warning').classList.add('hidden');
        document.getElementById('auth-submit-btn').disabled = false;
    } else {
        document.getElementById('tab-register').classList.add('border-primary', 'text-primary');
        document.getElementById('tab-register').classList.remove('border-transparent', 'text-gray-500');
        document.getElementById('tab-login').classList.add('border-transparent', 'text-gray-500');
        document.getElementById('tab-login').classList.remove('border-primary', 'text-primary');
        document.getElementById('auth-site-code-group').classList.remove('hidden');
        document.getElementById('auth-submit-btn').innerText = 'Register';
        
        if (systemUsers.length >= MAX_USERS) {
            document.getElementById('capacity-warning').classList.remove('hidden');
            document.getElementById('auth-submit-btn').disabled = true;
            document.getElementById('auth-submit-btn').classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value;
    
    if (authMode === 'register') {
        const sc = document.getElementById('auth-site-code').value;
        if (sc !== REG_PASSCODE) return alert("Invalid Site Access Code.");
        if (systemUsers.find(user => user.username === u)) return alert("Username already exists.");
        if (systemUsers.length >= MAX_USERS) return alert("System at full capacity.");
        
        systemUsers.push({ username: u, password: p });
        localStorage.setItem('omnitrack_users', JSON.stringify(systemUsers));
        alert("Registration successful. Logging in.");
    } else {
        const user = systemUsers.find(user => user.username === u && user.password === p);
        if (!user) return alert("Invalid username or password.");
    }
    
    localStorage.setItem('omnitrack_session', u);
    currentUser = u;
    document.getElementById('login-modal').classList.add('hidden');
    loadUserData();
});

function logoutUser() {
    localStorage.removeItem('omnitrack_session');
    location.reload();
}

function loadUserData() {
    tasks = JSON.parse(localStorage.getItem(`omnitrack_tasks_${currentUser}`)) || [];
    userCategories = JSON.parse(localStorage.getItem(`omnitrack_categories_${currentUser}`)) || [];
    
    if (userCategories.length === 0) {
        openOnboarding();
    } else {
        initializeAppUI();
    }
}

function initializeAppUI() {
    buildFilters();
    buildCategoryDropdown();
    updateDateDisplay();
    renderTasks();
}

// --- HIDDEN ADMIN LOGIC ---
function handleSecretAdminClick() {
    adminClickCount++;
    if(adminClickCount === 1) {
        adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 2000);
    }
    if(adminClickCount >= 5) {
        clearTimeout(adminClickTimer);
        adminClickCount = 0;
        document.getElementById('admin-pass-modal').classList.remove('hidden');
    }
}

// Bind to main logo too
document.getElementById('omni-logo').addEventListener('click', handleSecretAdminClick);

function verifyAdminPass() {
    const pass = document.getElementById('admin-passcode-input').value;
    if(pass === ADMIN_PASSCODE) {
        document.getElementById('admin-pass-modal').classList.add('hidden');
        document.getElementById('login-modal').classList.add('hidden');
        // Hide standard view elements
        document.getElementById('main-sidebar').style.display = 'none';
        document.getElementById('main-header').style.display = 'none';
        document.getElementById('views-container').children.forEach(c => c.classList.add('hidden'));
        // Show Admin
        document.getElementById('view-admin').classList.remove('hidden');
        renderAdminDashboard();
    } else {
        alert("Access Denied.");
    }
}

function renderAdminDashboard() {
    document.getElementById('admin-capacity').innerText = `${systemUsers.length}/${MAX_USERS}`;
    const tbody = document.getElementById('admin-user-list');
    tbody.innerHTML = '';
    systemUsers.forEach((u, index) => {
        const userTasks = JSON.parse(localStorage.getItem(`omnitrack_tasks_${u.username}`)) || [];
        tbody.innerHTML += `
            <tr class="border-b border-gray-200 dark:border-gray-700">
                <td class="p-3 font-medium dark:text-gray-300">${u.username}</td>
                <td class="p-3 dark:text-gray-400">${userTasks.length} tasks</td>
                <td class="p-3 text-right space-x-2">
                    <button onclick="adminResetPass('${u.username}')" class="text-blue-500 hover:underline">Reset Pass</button>
                    <button onclick="adminDeleteUser(${index})" class="text-red-500 hover:underline">Delete</button>
                </td>
            </tr>
        `;
    });
}

function adminResetPass(username) {
    const newP = prompt(`Enter new password for ${username}:`);
    if(newP) {
        const u = systemUsers.find(user => user.username === username);
        if(u) { u.password = newP; localStorage.setItem('omnitrack_users', JSON.stringify(systemUsers)); alert('Reset successful.'); }
    }
}

function adminDeleteUser(index) {
    if(confirm(`Are you sure you want to delete ${systemUsers[index].username}? This frees up a slot.`)) {
        const u = systemUsers[index].username;
        localStorage.removeItem(`omnitrack_tasks_${u}`);
        localStorage.removeItem(`omnitrack_categories_${u}`);
        systemUsers.splice(index, 1);
        localStorage.setItem('omnitrack_users', JSON.stringify(systemUsers));
        renderAdminDashboard();
    }
}
function closeAdmin() { location.reload(); }

// --- CATEGORY ONBOARDING ---
function openOnboarding() {
    const grid = document.getElementById('onboarding-grid');
    grid.innerHTML = '';
    ALL_CATEGORIES.forEach(cat => {
        const isChecked = userCategories.includes(cat.name) ? 'checked' : '';
        grid.innerHTML += `
            <label class="flex items-center p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input type="checkbox" value="${cat.name}" class="onboarding-cb w-5 h-5 text-primary bg-white border-gray-300 rounded focus:ring-primary dark:bg-gray-900 dark:border-gray-600" ${isChecked}>
                <span class="ml-3 font-semibold text-gray-800 dark:text-gray-200">${cat.name}</span>
            </label>
        `;
    });
    document.getElementById('onboarding-modal').classList.remove('hidden');
}

function saveCategories() {
    const checkboxes = document.querySelectorAll('.onboarding-cb:checked');
    userCategories = Array.from(checkboxes).map(cb => cb.value);
    if (userCategories.length === 0) return alert("Please select at least one category.");
    localStorage.setItem(`omnitrack_categories_${currentUser}`, JSON.stringify(userCategories));
    document.getElementById('onboarding-modal').classList.add('hidden');
    activeFilter = 'Central'; 
    initializeAppUI();
}

function buildFilters() {
    const container = document.getElementById('calendar-filters');
    container.innerHTML = `<button class="filter-btn active bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2 rounded-full text-sm font-bold shadow-md transition-all whitespace-nowrap" data-filter="Central">Central (All)</button>`;
    userCategories.forEach(catName => {
        const catObj = ALL_CATEGORIES.find(c => c.name === catName);
        if(!catObj) return;
        container.innerHTML += `<button class="filter-btn text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all whitespace-nowrap hover:border-primary border-b-2 cat-border-${catObj.id}" data-filter="${catName}">${catName}</button>`;
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

// --- DATE NAVIGATION ---
function changeDate(days) {
    activeDate.setDate(activeDate.getDate() + days);
    updateDateDisplay();
    renderTasks();
}

function updateDateDisplay() {
    const today = new Date();
    const isToday = activeDate.toDateString() === today.toDateString();
    document.getElementById('current-date-display').innerText = isToday ? "Today" : activeDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// --- TAB SWITCHING ---
function switchTab(tab) {
    if(isFocusMode && tab !== 'calendar') toggleFocusMode(); // exit focus mode if navigating

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white', 'shadow-md');
        btn.classList.add('text-gray-500', 'dark:text-gray-400');
    });
    const activeDesktopBtn = document.getElementById(`nav-${tab}`);
    if(activeDesktopBtn) {
        activeDesktopBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
        activeDesktopBtn.classList.add('bg-primary', 'text-white', 'shadow-md');
    }
    
    const views = ['calendar', 'monthly', 'analytics', 'settings'];
    views.forEach(v => document.getElementById(`view-${v}`).classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');

    const header = document.getElementById('main-header');
    if (tab === 'calendar') {
        header.style.display = 'flex';
        renderTasks();
    } else {
        header.style.display = 'none';
        if (tab === 'analytics') renderAnalytics();
        if (tab === 'monthly') renderMonthlyCalendar();
    }
}

// --- FILTERING ---
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

// --- DRAG & DROP LOGIC ---
function handleDragStart(e) {
    draggedTaskId = e.target.dataset.id;
    e.target.classList.add('opacity-50');
}
function handleDragOver(e) {
    e.preventDefault();
    const card = e.target.closest('.task-card');
    if(card && card.dataset.id !== draggedTaskId) {
        card.classList.add('border-primary', 'dark:border-primary', 'border-dashed');
    }
}
function handleDragLeave(e) {
    const card = e.target.closest('.task-card');
    if(card) card.classList.remove('border-primary', 'dark:border-primary', 'border-dashed');
}
function handleDrop(e) {
    e.preventDefault();
    const targetCard = e.target.closest('.task-card');
    if(!targetCard) return;
    targetCard.classList.remove('border-primary', 'dark:border-primary', 'border-dashed');
    
    const targetId = targetCard.dataset.id;
    if(draggedTaskId === targetId) return;

    // Reorder data array
    const dateStr = formatDateForInput(activeDate);
    let dayTasks = tasks.filter(t => t.date === dateStr);
    
    // Sort logically first before move
    dayTasks.sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0) || a.startTime.localeCompare(b.startTime));
    
    const fromIdx = dayTasks.findIndex(t => t.id === draggedTaskId);
    const toIdx = dayTasks.findIndex(t => t.id === targetId);
    
    const movedTask = dayTasks.splice(fromIdx, 1)[0];
    dayTasks.splice(toIdx, 0, movedTask);
    
    // Assign explicit order indexes to day tasks
    dayTasks.forEach((t, i) => {
        const realTask = tasks.find(rt => rt.id === t.id);
        if(realTask) realTask.orderIndex = i;
    });

    saveData();
    renderTasks();
}
function handleDragEnd(e) {
    e.target.classList.remove('opacity-50');
    draggedTaskId = null;
}

// --- RENDERING TASKS ---
function renderTasks() {
    taskList.innerHTML = '';
    
    let filteredTasks = tasks.filter(t => t.date === formatDateForInput(activeDate));
    if (activeFilter !== 'Central') {
        filteredTasks = filteredTasks.filter(t => t.category === activeFilter);
    }
    
    // Sort by orderIndex first, then chronological
    filteredTasks.sort((a, b) => (a.orderIndex !== undefined && b.orderIndex !== undefined) ? a.orderIndex - b.orderIndex : a.startTime.localeCompare(b.startTime));

    if (filteredTasks.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        document.getElementById('empty-state').classList.add('flex');
    } else {
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('flex');
        
        filteredTasks.forEach((task, index) => {
            const catObj = ALL_CATEGORIES.find(c => c.name === task.category);
            const key = catObj ? catObj.id : 'personal';
            const statusKey = task.status.split(' ')[0]; 
            
            const card = document.createElement('div');
            card.className = `task-card bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-100 dark:border-gray-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 border-l-4 cat-border-${key} transform hover:-translate-y-0.5 cursor-move animate-fade-in-up`;
            card.style.animationDelay = `${index * 0.05}s`;
            card.dataset.id = task.id;
            card.draggable = true;
            
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('dragleave', handleDragLeave);
            card.addEventListener('drop', handleDrop);
            card.addEventListener('dragend', handleDragEnd);
            
            // Allow clicking non-interactive parts to open notes
            card.onclick = (e) => {
                if(!['SELECT', 'BUTTON', 'SVG', 'PATH'].includes(e.target.tagName)) openNotes(task.id);
            };
            
            const timeStr = `${formatAmPm(task.startTime)} - ${formatAmPm(task.endTime)}`;
            let noteIndicator = task.notes && task.notes.trim() !== '' ? `<svg class="w-4 h-4 ml-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>` : '';

            card.innerHTML = `
                <div class="flex-1 pr-4">
                    <div class="flex items-center space-x-3 mb-2">
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide cat-tag-${key}">${task.category}</span>
                        <span class="text-sm font-bold status-${statusKey}">• ${task.status}</span>
                    </div>
                    <h4 class="text-xl font-extrabold text-gray-900 dark:text-white mb-1 flex items-center">${task.title} ${noteIndicator}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeStr}
                    </p>
                </div>
                <div class="mt-4 md:mt-0 flex items-center space-x-2">
                    <select onchange="quickUpdateStatus('${task.id}', this.value)" class="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-shadow cursor-pointer">
                        <option value="Pending" ${task.status==='Pending'?'selected':''}>Pending</option>
                        <option value="Completed" ${task.status==='Completed'?'selected':''}>Completed</option>
                        <option value="Partially Completed" ${task.status==='Partially Completed'?'selected':''}>Partially</option>
                        <option value="Delayed" ${task.status==='Delayed'?'selected':''}>Delayed</option>
                        <option value="Abandoned" ${task.status==='Abandoned'?'selected':''}>Abandoned</option>
                    </select>
                    <button onclick="editTask('${task.id}')" class="p-2 text-gray-400 hover:text-primary bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onclick="deleteTask('${task.id}')" class="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            taskList.appendChild(card);
        });
    }
    checkWorkload(tasks.filter(t => t.date === formatDateForInput(activeDate)));
}

// --- ALGORITHMIC SCHEDULE BALANCING ---
function checkWorkload(dayTasks) {
    let totalIntensityMins = 0;
    let overlapFound = false;

    // Convert times to minutes for overlap check
    const sorted = [...dayTasks].sort((a,b) => a.startTime.localeCompare(b.startTime));
    for(let i=0; i<sorted.length; i++) {
        const t = sorted[i];
        const [sh, sm] = t.startTime.split(':').map(Number);
        const [eh, em] = t.endTime.split(':').map(Number);
        let sMins = sh*60 + sm;
        let eMins = eh*60 + em;
        if(eMins < sMins) eMins += 24*60; // over midnight
        
        const cat = ALL_CATEGORIES.find(c => c.name === t.category);
        const weight = cat ? cat.weight : 1;
        totalIntensityMins += (eMins - sMins) * weight;

        if(i < sorted.length - 1) {
            const next = sorted[i+1];
            const [nsh, nsm] = next.startTime.split(':').map(Number);
            let nsMins = nsh*60 + nsm;
            if(nsMins < eMins) overlapFound = true;
        }
    }

    const banner = document.getElementById('workload-banner');
    const msg = document.getElementById('workload-msg');
    const hours = totalIntensityMins / 60;

    if(overlapFound || hours > 8) {
        banner.classList.remove('hidden');
        if(overlapFound) msg.innerText = "Schedule Conflict: You have overlapping tasks!";
        else msg.innerText = `High Intensity (${hours.toFixed(1)} weighted hrs). Consider redistributing tasks for a balanced day.`;
    } else {
        banner.classList.add('hidden');
    }
}

// --- TASK MODAL & RECURRENCE ---
function openModal() {
    document.getElementById('modal-title').innerText = 'Add New Task';
    taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-date').value = formatDateForInput(activeDate);
    document.getElementById('status-container').classList.add('hidden');
    document.getElementById('recurrence-container').classList.remove('hidden');
    taskModal.classList.remove('hidden');
}

function closeModal() {
    taskModal.classList.add('hidden');
}

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const isNew = !id;
    const baseDate = document.getElementById('task-date').value;
    const recurType = document.getElementById('task-recurrence').value;
    
    let generatedTasks = [];
    const baseTask = {
        id: isNew ? Date.now().toString() : id,
        title: document.getElementById('task-title').value,
        date: baseDate,
        category: document.getElementById('task-category').value,
        startTime: document.getElementById('task-start').value,
        endTime: document.getElementById('task-end').value,
        status: isNew ? 'Pending' : document.getElementById('task-status').value,
        notes: isNew ? '' : (tasks.find(t=>t.id===id)?.notes || ''),
        orderIndex: 0
    };

    if(isNew && recurType !== 'none') {
        const startDate = new Date(baseDate);
        // Rolling 3 months approx 90 days
        for(let i=0; i<90; i++) {
            let add = false;
            if(recurType === 'daily') add = true;
            else if(recurType === 'weekly' && i%7 === 0) add = true;
            else if(recurType === 'weekdays' && startDate.getDay() !== 0 && startDate.getDay() !== 6) add = true;
            
            if(add) {
                generatedTasks.push({...baseTask, id: Date.now().toString() + Math.floor(Math.random()*1000), date: formatDateForInput(startDate)});
            }
            startDate.setDate(startDate.getDate() + 1);
        }
    } else {
        generatedTasks.push(baseTask);
    }

    if (isNew) {
        tasks.push(...generatedTasks);
    } else {
        const index = tasks.findIndex(t => t.id === id);
        if(index > -1) tasks[index] = baseTask;
    }

    saveData();
    closeModal();
    renderTasks();
});

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if(!task) return;
    document.getElementById('modal-title').innerText = 'Edit Task Details';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-date').value = task.date;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-start').value = task.startTime;
    document.getElementById('task-end').value = task.endTime;
    
    document.getElementById('status-container').classList.remove('hidden');
    document.getElementById('task-status').value = task.status;
    document.getElementById('recurrence-container').classList.add('hidden'); // Disable recur edit on existing
    
    taskModal.classList.remove('hidden');
}

function quickUpdateStatus(id, newStatus) {
    const index = tasks.findIndex(t => t.id === id);
    if(index > -1) {
        tasks[index].status = newStatus;
        saveData();
        renderTasks();
        if (newStatus === 'Delayed' || newStatus === 'Abandoned') setTimeout(() => openNotes(id), 300);
    }
}

function deleteTask(id) {
    if(confirm("Are you sure you want to delete this task?")) {
        tasks = tasks.filter(t => t.id !== id);
        saveData();
        renderTasks();
    }
}

// --- DEDICATED NOTES WINDOW ---
function openNotes(id) {
    const task = tasks.find(t => t.id === id);
    if(!task) return;
    currentNoteTaskId = id;
    const catObj = ALL_CATEGORIES.find(c => c.name === task.category);
    const key = catObj ? catObj.id : 'personal';
    const statusKey = task.status.split(' ')[0];

    const tag = document.getElementById('note-cat-tag');
    tag.innerText = task.category;
    tag.className = `text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide cat-tag-${key}`;
    
    const status = document.getElementById('note-status');
    status.innerText = `• ${task.status}`;
    status.className = `text-sm font-bold status-${statusKey}`;
    
    document.getElementById('note-title').innerText = task.title;
    document.getElementById('task-notes-input').value = task.notes || '';
    notesModal.classList.remove('hidden');
}

function closeNotes() {
    notesModal.classList.add('hidden');
    currentNoteTaskId = null;
}

function saveNotes() {
    if(currentNoteTaskId) {
        const index = tasks.findIndex(t => t.id === currentNoteTaskId);
        if(index > -1) {
            tasks[index].notes = document.getElementById('task-notes-input').value;
            saveData();
            renderTasks();
        }
    }
    closeNotes();
}

function saveData() {
    localStorage.setItem(`omnitrack_tasks_${currentUser}`, JSON.stringify(tasks));
}

// --- FULL CALENDAR VIEW (MONTHLY) ---
function changeMonth(dir) {
    currentMonth.setMonth(currentMonth.getMonth() + dir);
    renderMonthlyCalendar();
}

function renderMonthlyCalendar() {
    const grid = document.getElementById('month-grid');
    grid.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const options = { month: 'long', year: 'numeric' };
    document.getElementById('month-title').innerText = currentMonth.toLocaleDateString(undefined, options);
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for(let i=0; i<firstDay; i++) {
        grid.innerHTML += `<div class="p-2 min-h-[80px] bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-lg"></div>`;
    }
    
    for(let d=1; d<=daysInMonth; d++) {
        const dateStr = formatDateForInput(new Date(year, month, d));
        const dayTasks = tasks.filter(t => t.date === dateStr);
        
        let dotsHtml = '';
        dayTasks.slice(0, 4).forEach(t => {
            const catObj = ALL_CATEGORIES.find(c => c.name === t.category);
            const key = catObj ? catObj.id : 'personal';
            dotsHtml += `<div class="w-2 h-2 rounded-full mb-1 mx-0.5 cat-bg-${key}"></div>`;
        });
        if(dayTasks.length > 4) dotsHtml += `<span class="text-[10px] text-gray-500 font-bold">+${dayTasks.length-4}</span>`;
        
        const isToday = dateStr === formatDateForInput(new Date());
        const dateClass = isToday ? "bg-primary text-white shadow-md rounded-full w-7 h-7 flex items-center justify-center font-bold" : "text-gray-700 dark:text-gray-300 font-bold ml-1";
        
        grid.innerHTML += `
            <div class="p-2 min-h-[80px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm hover:border-primary transition-colors cursor-pointer" onclick="jumpToDate('${dateStr}')">
                <div class="${dateClass} mb-2">${d}</div>
                <div class="flex flex-wrap">${dotsHtml}</div>
            </div>
        `;
    }
}

function jumpToDate(dateStr) {
    const parts = dateStr.split('-');
    activeDate = new Date(parts[0], parts[1]-1, parts[2]);
    switchTab('calendar');
}

// --- FOCUS MODE (ZEN) ---
function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    const overlay = document.getElementById('focus-overlay');
    const mainViews = document.getElementById('views-container');
    const headerControls = document.getElementById('calendar-filters');
    const sidebar = document.getElementById('main-sidebar');

    if(isFocusMode) {
        const todayStr = formatDateForInput(activeDate);
        let pending = tasks.filter(t => t.date === todayStr && t.status === 'Pending');
        pending.sort((a,b) => a.startTime.localeCompare(b.startTime));
        
        if(pending.length > 0) {
            focusTargetId = pending[0].id;
            document.getElementById('focus-task-title').innerText = pending[0].title;
            document.getElementById('focus-complete-btn').classList.add('hidden');
            document.getElementById('focus-timer-btn').classList.remove('hidden');
            resetPomodoro();
        } else {
            document.getElementById('focus-task-title').innerText = "No Pending Tasks!";
            document.getElementById('focus-timer-btn').classList.add('hidden');
            document.getElementById('focus-complete-btn').classList.add('hidden');
        }

        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        mainViews.classList.add('hidden');
        headerControls.classList.add('invisible');
        sidebar.classList.add('hidden');
    } else {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        mainViews.classList.remove('hidden');
        headerControls.classList.remove('invisible');
        sidebar.classList.remove('hidden');
    }
}

function togglePomodoro() {
    const btn = document.getElementById('focus-timer-btn');
    if(pomodoroTimer) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
        btn.innerText = "Resume Timer";
    } else {
        btn.innerText = "Pause Timer";
        pomodoroTimer = setInterval(() => {
            pomodoroSeconds--;
            updatePomodoroDisplay();
            if(pomodoroSeconds <= 0) {
                clearInterval(pomodoroTimer);
                document.getElementById('focus-timer-btn').classList.add('hidden');
                document.getElementById('focus-complete-btn').classList.remove('hidden');
                new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play();
            }
        }, 1000);
    }
}

function updatePomodoroDisplay() {
    const m = Math.floor(pomodoroSeconds / 60).toString().padStart(2, '0');
    const s = (pomodoroSeconds % 60).toString().padStart(2, '0');
    document.getElementById('focus-timer-display').innerText = `${m}:${s}`;
}

function resetPomodoro() {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
    pomodoroSeconds = 25 * 60;
    updatePomodoroDisplay();
    document.getElementById('focus-timer-btn').innerText = "Start Timer";
}

function completeFocusTask() {
    if(focusTargetId) {
        quickUpdateStatus(focusTargetId, 'Completed');
        toggleFocusMode(); // exit
        setTimeout(() => switchTab('calendar'), 100);
    }
}


// --- EXPANDED ANALYTICS DASHBOARD ---
function renderAnalytics() {
    const totalTasks = tasks.length;
    
    // Total Efficiency
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const efficiency = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    document.getElementById('stat-efficiency').innerText = `${efficiency}%`;

    // WOW Trend
    const today = new Date();
    const oneWeekAgo = new Date(today); oneWeekAgo.setDate(today.getDate() - 7);
    const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(today.getDate() - 14);
    
    const lastWeekTasks = tasks.filter(t => new Date(t.date) >= oneWeekAgo && new Date(t.date) <= today);
    const prevWeekTasks = tasks.filter(t => new Date(t.date) >= twoWeeksAgo && new Date(t.date) < oneWeekAgo);
    
    const lwEff = lastWeekTasks.length ? (lastWeekTasks.filter(t=>t.status==='Completed').length / lastWeekTasks.length)*100 : 0;
    const pwEff = prevWeekTasks.length ? (prevWeekTasks.filter(t=>t.status==='Completed').length / prevWeekTasks.length)*100 : 0;
    const wow = Math.round(lwEff - pwEff);
    const wowEl = document.getElementById('wow-trend');
    wowEl.innerHTML = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${wow>=0 ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6'}"></path></svg> ${wow>=0?'+':''}${wow}% vs last week`;
    wowEl.className = `text-sm font-semibold flex items-center ${wow>=0?'text-green-500':'text-red-500'}`;

    // Streak Grid (GitHub style - last 30 days)
    const streakGrid = document.getElementById('streak-grid');
    streakGrid.innerHTML = '';
    let currentStreak = 0;
    let streakActive = true;
    
    for(let i=29; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = formatDateForInput(d);
        const dTasks = tasks.filter(t => t.date === dStr);
        const comp = dTasks.filter(t => t.status === 'Completed').length;
        
        let intensity = 0;
        if(comp > 0) intensity = 1;
        if(comp > 2) intensity = 2;
        if(comp > 4) intensity = 3;
        if(comp > 7) intensity = 4;
        
        streakGrid.innerHTML += `<div class="w-3.5 h-3.5 rounded-[2px] streak-level-${intensity}" title="${dStr}: ${comp} completed"></div>`;
    }
    
    // Calculate current streak backwards from today
    for(let i=0; i<365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dTasks = tasks.filter(t => t.date === formatDateForInput(d));
        if(dTasks.length > 0 && dTasks.some(t => t.status === 'Completed')) {
            currentStreak++;
        } else {
            if(i !== 0) break; // if today is 0 it's ok, maybe haven't done yet.
        }
    }
    document.getElementById('current-streak-text').innerText = `${currentStreak} Days`;

    // Delay Ratio & Time Allocation
    const delayCounts = {}; const compCounts = {}; const timeSpent = {};
    userCategories.forEach(c => { delayCounts[c] = 0; compCounts[c] = 0; timeSpent[c] = 0; });
    let maxTime = 0;

    tasks.forEach(t => {
        if(t.status === 'Delayed' || t.status === 'Abandoned') delayCounts[t.category]++;
        if(t.status === 'Completed') compCounts[t.category]++;
        
        const start = new Date(`1970-01-01T${t.startTime}:00Z`);
        const end = new Date(`1970-01-01T${t.endTime}:00Z`);
        let diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours < 0) diffHours += 24; 
        if(timeSpent[t.category] !== undefined) timeSpent[t.category] += diffHours;
    });

    const barsContainer = document.getElementById('time-allocation-bars');
    const ratioContainer = document.getElementById('ratio-bars');
    barsContainer.innerHTML = ''; ratioContainer.innerHTML = '';

    for (const cat in timeSpent) if (timeSpent[cat] > maxTime) maxTime = timeSpent[cat];

    for (const cat of userCategories) {
        // Time allocation
        const hours = timeSpent[cat];
        if(hours > 0) {
            const percentage = Math.round((hours / maxTime) * 100);
            barsContainer.innerHTML += `
                <div>
                    <div class="flex justify-between text-sm mb-1.5 font-bold">
                        <span class="text-gray-800 dark:text-white">${cat}</span>
                        <span class="text-gray-500 dark:text-gray-400">${hours.toFixed(1)} hrs</span>
                    </div>
                    <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3.5 shadow-inner">
                        <div class="h-3.5 rounded-full bg-primary transition-all" style="width: ${percentage}%"></div>
                    </div>
                </div>`;
        }

        // Ratio Breakdown
        const dCount = delayCounts[cat];
        const cCount = compCounts[cat];
        const total = dCount + cCount;
        if(total > 0) {
            const cPct = (cCount / total) * 100;
            const dPct = (dCount / total) * 100;
            ratioContainer.innerHTML += `
                <div>
                    <div class="flex justify-between text-sm mb-1.5 font-bold">
                        <span class="text-gray-800 dark:text-white">${cat}</span>
                        <span class="text-gray-500 text-xs">${cCount} Comp / ${dCount} Del</span>
                    </div>
                    <div class="w-full bg-red-400 rounded-full h-3.5 shadow-inner flex overflow-hidden">
                        <div class="h-3.5 bg-green-500 transition-all" style="width: ${cPct}%" title="Completed"></div>
                        <div class="h-3.5 bg-red-500 transition-all" style="width: ${dPct}%" title="Delayed/Abandoned"></div>
                    </div>
                </div>`;
        }
    }
}

// --- DATA EXPORT / BACKUP ---
function exportData(format) {
    if(tasks.length === 0) return alert("No tasks to export.");
    let content, mime, filename;
    
    if(format === 'json') {
        content = JSON.stringify(tasks, null, 2);
        mime = "application/json";
        filename = `omnitrack_backup_${currentUser}_${formatDateForInput(new Date())}.json`;
    } else if(format === 'csv') {
        const headers = ["ID", "Title", "Date", "Category", "Start Time", "End Time", "Status", "Notes"];
        const rows = tasks.map(t => [
            t.id, 
            `"${t.title.replace(/"/g, '""')}"`, 
            t.date, 
            t.category, 
            t.startTime, 
            t.endTime, 
            t.status, 
            `"${(t.notes||'').replace(/"/g, '""')}"`
        ].join(','));
        content = [headers.join(','), ...rows].join('\n');
        mime = "text/csv";
        filename = `omnitrack_backup_${currentUser}_${formatDateForInput(new Date())}.csv`;
    }
    
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- ACCOUNT DELETION ---
function startDeleteAccount() { document.getElementById('delete-modal-1').classList.remove('hidden'); }
function proceedDeleteStep2() {
    document.getElementById('delete-modal-1').classList.add('hidden');
    document.getElementById('delete-confirm-input').value = '';
    document.getElementById('delete-modal-2').classList.remove('hidden');
}
function cancelDelete() {
    document.getElementById('delete-modal-1').classList.add('hidden');
    document.getElementById('delete-modal-2').classList.add('hidden');
}
function executeFinalDelete() {
    if (document.getElementById('delete-confirm-input').value.trim() === 'DELETE') {
        localStorage.removeItem(`omnitrack_tasks_${currentUser}`);
        localStorage.removeItem(`omnitrack_categories_${currentUser}`);
        systemUsers = systemUsers.filter(u => u.username !== currentUser);
        localStorage.setItem('omnitrack_users', JSON.stringify(systemUsers));
        logoutUser();
    } else {
        alert("You must type exact 'DELETE' to confirm.");
    }
}

// --- THEME AND SHADE SELECTION ---
const ACCENT_COLORS = {
    ocean: { primary: '59 130 246', hover: '37 99 235' },
    emerald: { primary: '16 185 129', hover: '5 150 105' },
    amethyst: { primary: '139 92 246', hover: '124 58 237' },
    amber: { primary: '245 158 11', hover: '217 119 6' }
};

function initThemeAndColor() {
    const savedTheme = localStorage.getItem('omnitrack_theme') || 'system';
    const savedColor = localStorage.getItem('omnitrack_color') || 'ocean';
    applyTheme(savedTheme); applyColor(savedColor);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if(localStorage.getItem('omnitrack_theme') === 'system') applyTheme('system');
    });
}
function setTheme(theme) { localStorage.setItem('omnitrack_theme', theme); applyTheme(theme); }
function applyTheme(theme) {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else { document.documentElement.classList.remove('dark'); }
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if(btn.dataset.theme === theme) {
            btn.classList.add('bg-gray-200', 'dark:bg-gray-600', 'border-gray-400', 'dark:border-gray-400');
            btn.classList.remove('border-gray-300', 'dark:border-gray-600');
        } else {
            btn.classList.remove('bg-gray-200', 'dark:bg-gray-600', 'border-gray-400', 'dark:border-gray-400');
            btn.classList.add('border-gray-300', 'dark:border-gray-600');
        }
    });
}
function setColor(colorKey) { localStorage.setItem('omnitrack_color', colorKey); applyColor(colorKey); }
function applyColor(colorKey) {
    const colorVals = ACCENT_COLORS[colorKey] || ACCENT_COLORS.ocean;
    document.documentElement.style.setProperty('--color-primary', colorVals.primary);
    document.documentElement.style.setProperty('--color-primary-hover', colorVals.hover);
    document.querySelectorAll('.color-btn').forEach(btn => {
        if(btn.dataset.color === colorKey) {
            btn.classList.add('border-primary', 'shadow-md'); btn.classList.remove('border-transparent');
        } else {
            btn.classList.remove('border-primary', 'shadow-md'); btn.classList.add('border-transparent');
        }
    });
}

// --- UTILS ---
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
    hours = hours % 12; hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
}
