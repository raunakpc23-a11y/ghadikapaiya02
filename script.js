// --- ALL 10 AVAILABLE CATEGORIES ---
const ALL_CATEGORIES = [
    { id: 'jee', name: 'JEE' },
    { id: 'societies', name: 'Societies' },
    { id: 'college', name: 'College' },
    { id: 'personal', name: 'Personal' },
    { id: 'school', name: 'School' },
    { id: 'competitive', name: 'Competitive Exams (WBJEE/BITSAT)' },
    { id: 'interviews', name: 'Interviews & Recruitment' },
    { id: 'event', name: 'Event Organizing' },
    { id: 'trading', name: 'Trading & Finance' },
    { id: 'household', name: 'Household & Errands' }
];

// Data State Setup
let tasks = [];
let userCategories = [];
let activeFilter = 'Central';
let activeDate = new Date();
let currentNoteTaskId = null;

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
    if (!checkAuth()) {
        document.getElementById('login-modal').classList.remove('hidden');
    } else {
        loadUserData();
    }
});

function checkAuth() {
    return localStorage.getItem('omnitrack_session') === 'active';
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.setItem('omnitrack_session', 'active');
    document.getElementById('login-modal').classList.add('hidden');
    loadUserData();
});

function logoutUser() {
    localStorage.removeItem('omnitrack_session');
    location.reload();
}

function loadUserData() {
    tasks = JSON.parse(localStorage.getItem('omnitrack_tasks')) || [];
    userCategories = JSON.parse(localStorage.getItem('omnitrack_categories')) || [];
    
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
    setupStatusListener();
}

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
    
    if (userCategories.length === 0) {
        alert("Please select at least one category.");
        return;
    }
    
    localStorage.setItem('omnitrack_categories', JSON.stringify(userCategories));
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
        const key = catObj.id;
        
        container.innerHTML += `<button class="filter-btn text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all whitespace-nowrap hover:border-primary border-b-2 cat-border-${key}" data-filter="${catName}">${catName}</button>`;
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
    if (isToday) {
        dateDisplay.innerText = "Today";
    } else {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        dateDisplay.innerText = activeDate.toLocaleDateString(undefined, options);
    }
}

// --- TAB SWITCHING (Calendar / Analytics / Settings) ---
function switchTab(tab) {
    // Desktop Nav update
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white', 'shadow-md');
        btn.classList.add('text-gray-500', 'dark:text-gray-400');
    });
    const activeDesktopBtn = document.getElementById(`nav-${tab}`);
    if(activeDesktopBtn) {
        activeDesktopBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
        activeDesktopBtn.classList.add('bg-primary', 'text-white', 'shadow-md');
    }

    // Mobile Nav update
    document.querySelectorAll('.mob-nav-btn').forEach(btn => {
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-500', 'dark:text-gray-400');
    });
    const activeMobileBtn = document.getElementById(`mob-nav-${tab}`);
    if(activeMobileBtn) {
        activeMobileBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
        activeMobileBtn.classList.add('text-primary');
    }
    
    // Hide all views
    document.getElementById('view-calendar').classList.add('hidden');
    document.getElementById('view-analytics').classList.add('hidden');
    document.getElementById('view-settings').classList.add('hidden');
    
    // Show specific view
    document.getElementById(`view-${tab}`).classList.remove('hidden');

    // Header Controls logic
    const header = document.getElementById('main-header');
    if (tab === 'calendar') {
        header.style.display = 'flex';
        renderTasks();
    } else {
        header.style.display = 'none';
        if (tab === 'analytics') renderAnalytics();
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

// --- RENDERING TASKS ---
function renderTasks() {
    taskList.innerHTML = '';
    
    let filteredTasks = tasks.filter(t => t.date === formatDateForInput(activeDate));
    if (activeFilter !== 'Central') {
        filteredTasks = filteredTasks.filter(t => t.category === activeFilter);
    }
    filteredTasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
    } else {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
        
        filteredTasks.forEach((task, index) => {
            const catObj = ALL_CATEGORIES.find(c => c.name === task.category);
            const key = catObj ? catObj.id : 'personal';
            const statusKey = task.status.split(' ')[0]; // E.g., Partially
            
            const card = document.createElement('div');
            // Adding subtle gradients and glass effects, hover scale micro-interactions
            card.className = `bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-100 dark:border-gray-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 border-l-4 cat-border-${key} transform hover:-translate-y-0.5 cursor-pointer animate-fade-in-up`;
            card.style.animationDelay = `${index * 0.05}s`;
            
            // Allow opening Notes Window by clicking anywhere on the card
            card.onclick = () => openNotes(task.id);
            
            const timeStr = `${formatAmPm(task.startTime)} - ${formatAmPm(task.endTime)}`;
            
            let noteIndicator = '';
            if (task.notes && task.notes.trim() !== '') {
                noteIndicator = `<svg class="w-4 h-4 ml-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>`;
            }

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
                <div class="mt-4 md:mt-0 flex items-center space-x-2" onclick="event.stopPropagation()">
                    <select onchange="quickUpdateStatus('${task.id}', this.value)" class="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-shadow cursor-pointer">
                        <option value="Pending" ${task.status==='Pending'?'selected':''}>Pending</option>
                        <option value="Completed" ${task.status==='Completed'?'selected':''}>Completed</option>
                        <option value="Partially Completed" ${task.status==='Partially Completed'?'selected':''}>Partially</option>
                        <option value="Delayed" ${task.status==='Delayed'?'selected':''}>Delayed</option>
                        <option value="Abandoned" ${task.status==='Abandoned'?'selected':''}>Abandoned</option>
                    </select>
                    <!-- Edit Pencil Icon -->
                    <button onclick="editTask('${task.id}')" class="p-2 text-gray-400 hover:text-primary bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <!-- Delete Icon -->
                    <button onclick="deleteTask('${task.id}')" class="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            taskList.appendChild(card);
        });
    }
}

// --- TASK MODAL & FORMS (Edit logic separate from Notes) ---
function openModal() {
    document.getElementById('modal-title').innerText = 'Add New Task';
    taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-date').value = formatDateForInput(activeDate);
    document.getElementById('status-container').classList.add('hidden');
    
    taskModal.classList.remove('hidden');
}

function closeModal() {
    taskModal.classList.add('hidden');
}

function setupStatusListener() {
    // Status change listener no longer triggers reflection field in modal, reflection moved to Notes.
}

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('task-id').value;
    const isNew = !id;
    
    const prevTask = isNew ? {} : tasks.find(t => t.id === id);

    const taskObj = {
        id: isNew ? Date.now().toString() : id,
        title: document.getElementById('task-title').value,
        date: document.getElementById('task-date').value,
        category: document.getElementById('task-category').value,
        startTime: document.getElementById('task-start').value,
        endTime: document.getElementById('task-end').value,
        status: isNew ? 'Pending' : document.getElementById('task-status').value,
        notes: prevTask.notes || ''
    };

    if (isNew) {
        tasks.push(taskObj);
    } else {
        const index = tasks.findIndex(t => t.id === id);
        tasks[index] = taskObj;
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
    
    taskModal.classList.remove('hidden');
}

function quickUpdateStatus(id, newStatus) {
    const index = tasks.findIndex(t => t.id === id);
    if(index > -1) {
        tasks[index].status = newStatus;
        saveData();
        renderTasks();
        
        // Suggest opening notes if delayed/abandoned
        if (newStatus === 'Delayed' || newStatus === 'Abandoned') {
            setTimeout(() => {
                openNotes(id);
            }, 300);
        }
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
    document.getElementById('note-time').innerHTML = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${formatAmPm(task.startTime)} - ${formatAmPm(task.endTime)}`;
    
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
    localStorage.setItem('omnitrack_tasks', JSON.stringify(tasks));
}

// --- ANALYTICS DASHBOARD ---
function renderAnalytics() {
    const totalTasks = tasks.length;
    document.getElementById('stat-total').innerText = totalTasks;

    if(totalTasks === 0) {
        document.getElementById('stat-efficiency').innerText = `0%`;
        document.getElementById('stat-delayed').innerText = `None`;
        document.getElementById('time-allocation-bars').innerHTML = `<p class="text-gray-500">No data available yet.</p>`;
        return;
    }

    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const efficiency = Math.round((completedTasks / totalTasks) * 100);
    document.getElementById('stat-efficiency').innerText = `${efficiency}%`;

    const delayCounts = {};
    userCategories.forEach(c => delayCounts[c] = 0);
    
    tasks.forEach(t => {
        if(t.status === 'Delayed' || t.status === 'Abandoned') {
            if(delayCounts[t.category] !== undefined) {
                delayCounts[t.category]++;
            }
        }
    });
    
    let maxDelayCat = 'None';
    let maxDelayVal = 0;
    for (const [cat, count] of Object.entries(delayCounts)) {
        if (count > maxDelayVal) {
            maxDelayVal = count;
            maxDelayCat = cat;
        }
    }
    document.getElementById('stat-delayed').innerText = maxDelayCat;

    const timeSpent = {};
    userCategories.forEach(c => timeSpent[c] = 0);
    let maxTime = 0;

    tasks.forEach(t => {
        if(timeSpent[t.category] === undefined) return;
        const start = new Date(`1970-01-01T${t.startTime}:00Z`);
        const end = new Date(`1970-01-01T${t.endTime}:00Z`);
        let diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours < 0) diffHours += 24; 
        
        timeSpent[t.category] += diffHours;
    });

    for (const cat in timeSpent) {
        if (timeSpent[cat] > maxTime) maxTime = timeSpent[cat];
    }

    const barsContainer = document.getElementById('time-allocation-bars');
    barsContainer.innerHTML = '';
    
    for (const [cat, hours] of Object.entries(timeSpent)) {
        if(hours === 0 && maxTime > 0) continue; 
        const percentage = maxTime === 0 ? 0 : Math.round((hours / maxTime) * 100);
        const displayHours = hours.toFixed(1);
        
        const catObj = ALL_CATEGORIES.find(c => c.name === cat);
        const key = catObj ? catObj.id : 'personal';

        barsContainer.innerHTML += `
            <div>
                <div class="flex justify-between text-sm mb-1.5 font-bold">
                    <span class="text-gray-800 dark:text-white">${cat}</span>
                    <span class="text-gray-500 dark:text-gray-400">${displayHours} hrs</span>
                </div>
                <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3.5 shadow-inner">
                    <div class="h-3.5 rounded-full bg-primary transition-all duration-1000 ease-out" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }
}

// --- ACCOUNT DELETION (Double Confirmation) ---
function startDeleteAccount() {
    document.getElementById('delete-modal-1').classList.remove('hidden');
}

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
    const input = document.getElementById('delete-confirm-input').value;
    if (input.trim() === 'DELETE') {
        localStorage.removeItem('omnitrack_tasks');
        localStorage.removeItem('omnitrack_categories');
        localStorage.removeItem('omnitrack_session');
        // keep theme preferences optional, but let's clear them too for full reset
        localStorage.removeItem('omnitrack_theme');
        localStorage.removeItem('omnitrack_color');
        location.reload();
    } else {
        alert("You must type exact 'DELETE' to confirm.");
    }
}

// --- THEME AND SHADE SELECTION ---
const ACCENT_COLORS = {
    ocean: { primary: '59 130 246', hover: '37 99 235' },     // Blue
    emerald: { primary: '16 185 129', hover: '5 150 105' },   // Emerald
    amethyst: { primary: '139 92 246', hover: '124 58 237' }, // Violet
    amber: { primary: '245 158 11', hover: '217 119 6' }      // Amber
};

function initThemeAndColor() {
    const savedTheme = localStorage.getItem('omnitrack_theme') || 'system';
    const savedColor = localStorage.getItem('omnitrack_color') || 'ocean';
    
    applyTheme(savedTheme);
    applyColor(savedColor);
    
    // Listen for OS theme changes if set to system
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if(localStorage.getItem('omnitrack_theme') === 'system') applyTheme('system');
    });
}

function setTheme(theme) {
    localStorage.setItem('omnitrack_theme', theme);
    applyTheme(theme);
}

function applyTheme(theme) {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    // Update button visual states in Settings
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

function setColor(colorKey) {
    localStorage.setItem('omnitrack_color', colorKey);
    applyColor(colorKey);
}

function applyColor(colorKey) {
    const colorVals = ACCENT_COLORS[colorKey] || ACCENT_COLORS.ocean;
    document.documentElement.style.setProperty('--color-primary', colorVals.primary);
    document.documentElement.style.setProperty('--color-primary-hover', colorVals.hover);
    
    // Update button visual states in Settings
    document.querySelectorAll('.color-btn').forEach(btn => {
        if(btn.dataset.color === colorKey) {
            btn.classList.add('border-primary', 'shadow-md');
            btn.classList.remove('border-transparent');
        } else {
            btn.classList.remove('border-primary', 'shadow-md');
            btn.classList.add('border-transparent');
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
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
}
