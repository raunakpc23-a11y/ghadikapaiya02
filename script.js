// --- CONSTANTS & DATABASE SETUP ---
const SECRET_CODE = "WHAAT";
const MAX_USERS = 10;
let userDB = JSON.parse(localStorage.getItem('omnitrack_users_db')) || [];

// --- STATE & DATA MANAGEMENT ---
let currentUser = null; // Stores user object
let tasks = [];
let activeFilter = 'Central';
let activeDate = new Date();
let currentMonthDate = new Date();
let calendarMode = 'list';

// --- DOM ELEMENTS ---
const authScreen = document.getElementById('auth-screen');
const authError = document.getElementById('auth-error');
const userCountDisplay = document.getElementById('user-count-display');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    updateUserCountDisplay();
    
    // Check Active Session
    const sessionUserStr = sessionStorage.getItem('omnitrack_active_user');
    if (sessionUserStr) {
        const userObj = JSON.parse(sessionUserStr);
        loginUser(userObj);
    }
    
    setupFilters();
    setupStatusListener();
});

// --- AUTHENTICATION (Login / Register / DB limit) ---
function toggleAuth(mode) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');
    
    authError.classList.add('hidden'); // Clear errors on tab switch

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.classList.replace('text-gray-400', 'text-white');
        tabLogin.classList.add('bg-gray-800', 'shadow-sm');
        tabReg.classList.replace('text-white', 'text-gray-400');
        tabReg.classList.remove('bg-gray-800', 'shadow-sm');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabReg.classList.replace('text-gray-400', 'text-white');
        tabReg.classList.add('bg-gray-800', 'shadow-sm');
        tabLogin.classList.replace('text-white', 'text-gray-400');
        tabLogin.classList.remove('bg-gray-800', 'shadow-sm');
        updateUserCountDisplay();
    }
}

function showAuthError(msg) {
    authError.innerText = msg;
    authError.classList.remove('hidden');
}

function updateUserCountDisplay() {
    userCountDisplay.innerText = userDB.length;
}

// Handle Login Submit
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const secret = document.getElementById('login-secret').value.trim();

    if (secret !== SECRET_CODE) {
        return showAuthError("Invalid Secret Code.");
    }

    const foundUser = userDB.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (foundUser) {
        loginUser(foundUser);
    } else {
        showAuthError("User not found. Please register first.");
    }
});

// Handle Register Submit
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const fullname = document.getElementById('reg-fullname').value.trim();
    const role = document.getElementById('reg-role').value.trim();
    const secret = document.getElementById('reg-secret').value.trim();

    if (secret !== SECRET_CODE) {
        return showAuthError("Invalid Secret Registration Code.");
    }

    if (userDB.length >= MAX_USERS) {
        return showAuthError(`Database cap reached. Maximum of ${MAX_USERS} users allowed.`);
    }

    if (userDB.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return showAuthError("Username already exists. Choose another or Login.");
    }

    const newUser = { username, fullname, role, registeredAt: Date.now() };
    userDB.push(newUser);
    localStorage.setItem('omnitrack_users_db', JSON.stringify(userDB));
    
    loginUser(newUser);
});

// Perform Login Action
function loginUser(userObj) {
    currentUser = userObj;
    sessionStorage.setItem('omnitrack_active_user', JSON.stringify(userObj));
    
    // UI Updates
    document.getElementById('current-user-display').innerText = userObj.fullname;
    document.getElementById('current-user-role').innerText = userObj.role;
    document.getElementById('user-avatar').innerText = userObj.username.charAt(0).toUpperCase();
    
    // Check Admin Privileges
    if (userObj.username.toLowerCase() === 'admin') {
        document.getElementById('nav-admin-btn').classList.remove('hidden');
        document.getElementById('mobile-nav-admin').classList.remove('hidden');
        document.getElementById('mobile-nav-admin').classList.add('flex');
    } else {
        document.getElementById('nav-admin-btn').classList.add('hidden');
        document.getElementById('mobile-nav-admin').classList.add('hidden');
        document.getElementById('mobile-nav-admin').classList.remove('flex');
    }

    authScreen.style.opacity = '0';
    setTimeout(() => { authScreen.classList.add('hidden'); }, 300);
    
    // Load specific user's tasks
    const savedData = localStorage.getItem(`omnitrack_tasks_${userObj.username}`);
    tasks = savedData ? JSON.parse(savedData) : [];
    
    // Reset inputs and tabs
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    authError.classList.add('hidden');
    switchTab('calendar', document.querySelector('.nav-btn.active'));
}

function logout() {
    sessionStorage.removeItem('omnitrack_active_user');
    currentUser = null;
    tasks = [];
    authScreen.classList.remove('hidden');
    setTimeout(() => { authScreen.style.opacity = '1'; toggleAuth('login'); }, 10);
}

function saveData() {
    if(currentUser) {
        localStorage.setItem(`omnitrack_tasks_${currentUser.username}`, JSON.stringify(tasks));
    }
}

// --- NAVIGATION & TABS ---
function switchTab(tab, btnElement) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-white', 'text-red-400');
        if(btn.id === 'nav-admin-btn') btn.classList.add('text-red-400');
        else btn.classList.add('text-gray-400');
    });
    
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-brand', 'text-red-500');
        if(btn.id === 'mobile-nav-admin') btn.classList.add('text-red-500');
        else btn.classList.add('text-gray-500');
    });

    if (btnElement) {
        if(btnElement.classList.contains('nav-btn')) {
            btnElement.classList.remove('text-gray-400', 'text-red-400');
            btnElement.classList.add('bg-gray-800', 'text-white');
        } else {
            btnElement.classList.remove('text-gray-500', 'text-red-500');
            if(tab === 'admin') btnElement.classList.add('text-red-500');
            else btnElement.classList.add('text-brand');
        }
    }

    document.getElementById('view-calendar').classList.add('hidden');
    document.getElementById('view-analytics').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');

    if (tab === 'calendar') {
        document.getElementById('view-calendar').classList.remove('hidden');
        document.getElementById('view-calendar').classList.add('flex');
        refreshViews();
    } else if (tab === 'analytics') {
        document.getElementById('view-analytics').classList.remove('hidden');
        document.getElementById('view-analytics').classList.add('flex');
        renderAnalytics();
    } else if (tab === 'admin') {
        document.getElementById('view-admin').classList.remove('hidden');
        document.getElementById('view-admin').classList.add('flex');
        renderAdminPanel();
    }
}

// --- CALENDAR LOGIC (Grid vs List) ---
function setCalendarMode(mode) {
    calendarMode = mode;
    const btnList = document.getElementById('toggle-list');
    const btnGrid = document.getElementById('toggle-grid');
    
    if (mode === 'list') {
        btnList.classList.add('bg-gray-700', 'text-white');
        btnList.classList.remove('text-gray-400');
        btnGrid.classList.remove('bg-gray-700', 'text-white');
        btnGrid.classList.add('text-gray-400');
        
        document.getElementById('mode-list').classList.remove('hidden');
        document.getElementById('mode-grid').classList.add('hidden');
    } else {
        btnGrid.classList.add('bg-gray-700', 'text-white');
        btnGrid.classList.remove('text-gray-400');
        btnList.classList.remove('bg-gray-700', 'text-white');
        btnList.classList.add('text-gray-400');
        
        document.getElementById('mode-grid').classList.remove('hidden');
        document.getElementById('mode-list').classList.add('hidden');
    }
    refreshViews();
}

function navigateDate(dir) {
    if (calendarMode === 'list') activeDate.setDate(activeDate.getDate() + dir);
    else currentMonthDate.setMonth(currentMonthDate.getMonth() + dir);
    refreshViews();
}

function refreshViews() {
    if (calendarMode === 'list') {
        const today = new Date();
        const isToday = activeDate.toDateString() === today.toDateString();
        document.getElementById('calendar-header-title').innerText = isToday ? "Today" : activeDate.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' });
        renderList();
    } else {
        document.getElementById('calendar-header-title').innerText = currentMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        renderGrid();
    }
}

// --- FILTERING ---
function setupFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            buttons.forEach(b => {
                b.classList.remove('bg-gray-700', 'text-white');
                b.classList.add('text-gray-400');
            });
            e.target.classList.remove('text-gray-400');
            e.target.classList.add('bg-gray-700', 'text-white');
            activeFilter = e.target.getAttribute('data-filter');
            refreshViews();
        });
    });
}

// --- RENDER DAILY LIST ---
function renderList() {
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
        
        filteredTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `bg-bgpanel border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between hover:border-gray-700 transition-colors group`;
            
            const timeStr = `${formatAmPm(task.startTime)} - ${formatAmPm(task.endTime)}`;
            const statusClass = `status-text-${task.status.split(' ')[0]}`;
            const catClass = `cat-dot-${task.category.toLowerCase()}`;
            
            let reflectionHtml = '';
            if ((task.status === 'Delayed' || task.status === 'Abandoned') && task.reflection) {
                reflectionHtml = `<div class="mt-3 text-xs text-red-300 bg-red-900/10 p-2.5 rounded-lg border border-red-900/30"><b>Reflection:</b> ${task.reflection}</div>`;
            }

            card.innerHTML = `
                <div class="flex-1 cursor-pointer pr-4" onclick="editTask('${task.id}')">
                    <div class="flex items-center space-x-2 mb-1.5">
                        <div class="w-2 h-2 rounded-full ${catClass}"></div>
                        <span class="text-xs font-medium text-gray-400">${task.category}</span>
                        <span class="text-gray-600 text-xs">•</span>
                        <span class="text-xs font-medium ${statusClass}">${task.status}</span>
                    </div>
                    <h4 class="text-base font-semibold text-white mb-1 leading-snug">${task.title}</h4>
                    <p class="text-xs text-gray-500 font-medium">${timeStr}</p>
                    ${reflectionHtml}
                </div>
                <div class="mt-4 md:mt-0 flex items-center space-x-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <select onchange="quickUpdateStatus('${task.id}', this.value)" class="bg-bgbase border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand appearance-none cursor-pointer">
                        <option value="Pending" ${task.status==='Pending'?'selected':''}>Pending</option>
                        <option value="Completed" ${task.status==='Completed'?'selected':''}>Completed</option>
                        <option value="Partially Completed" ${task.status==='Partially Completed'?'selected':''}>Partial</option>
                        <option value="Delayed" ${task.status==='Delayed'?'selected':''}>Delayed</option>
                        <option value="Abandoned" ${task.status==='Abandoned'?'selected':''}>Abandoned</option>
                    </select>
                    <button onclick="deleteTask('${task.id}')" class="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            taskList.appendChild(card);
        });
    }
}

// --- RENDER MONTH GRID ---
function renderGrid() {
    const gridEl = document.getElementById('calendar-grid');
    gridEl.innerHTML = '';
    
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDateForInput(new Date());

    for(let i = 0; i < firstDay; i++) {
        gridEl.innerHTML += `<div class="bg-bgbase min-h-[100px]"></div>`;
    }

    for(let d = 1; d <= daysInMonth; d++) {
        const cellDate = new Date(year, month, d);
        const dateStr = formatDateForInput(cellDate);
        const isToday = dateStr === todayStr;
        
        let dayTasks = tasks.filter(t => t.date === dateStr);
        if (activeFilter !== 'Central') dayTasks = dayTasks.filter(t => t.category === activeFilter);
        
        let dotsHtml = '';
        const maxDots = 4;
        dayTasks.slice(0, maxDots).forEach(t => {
            const catClass = `cat-dot-${t.category.toLowerCase()}`;
            const opacity = t.status === 'Completed' ? 'opacity-100' : (t.status === 'Abandoned' ? 'opacity-20 bg-red-500' : 'opacity-70');
            dotsHtml += `<div class="w-1.5 h-1.5 rounded-full ${catClass} ${opacity} mb-1" title="${t.title}"></div>`;
        });
        if(dayTasks.length > maxDots) dotsHtml += `<div class="text-[9px] text-gray-500 font-bold">+${dayTasks.length - maxDots}</div>`;

        const dateClass = isToday ? 'bg-brand text-white w-6 h-6 flex items-center justify-center rounded-full mx-auto shadow-lg shadow-indigo-500/50' : 'text-gray-400 text-center';

        gridEl.innerHTML += `
            <div class="bg-bgpanel min-h-[100px] p-1.5 border-b border-r border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors" onclick="jumpToList('${dateStr}')">
                <div class="text-xs font-medium mb-1.5 ${dateClass}">${d}</div>
                <div class="flex flex-col items-center">${dotsHtml}</div>
            </div>
        `;
    }
    
    const totalCells = firstDay + daysInMonth;
    const paddingEnd = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for(let i = 0; i < paddingEnd; i++) {
        gridEl.innerHTML += `<div class="bg-bgbase min-h-[100px] border-b border-r border-gray-800"></div>`;
    }
}

function jumpToList(dateString) {
    const [y, m, d] = dateString.split('-');
    activeDate = new Date(y, m - 1, d);
    setCalendarMode('list');
}

// --- MODAL LOGIC ---
const taskModal = document.getElementById('task-modal');
const taskModalContent = document.getElementById('task-modal-content');
const taskForm = document.getElementById('task-form');

function openModal() {
    document.getElementById('modal-title').innerText = 'New Task';
    taskForm.reset();
    document.getElementById('task-id').value = '';
    const targetDate = calendarMode === 'list' ? activeDate : new Date();
    document.getElementById('task-date').value = formatDateForInput(targetDate);
    
    document.getElementById('status-container').classList.add('hidden');
    document.getElementById('reflection-container').classList.add('hidden');
    
    taskModal.classList.remove('hidden');
    setTimeout(() => { taskModalContent.classList.remove('scale-95'); }, 10);
}

function closeModal() {
    taskModalContent.classList.add('scale-95');
    setTimeout(() => { taskModal.classList.add('hidden'); }, 200);
}

function setupStatusListener() {
    document.getElementById('task-status').addEventListener('change', (e) => {
        if (e.target.value === 'Delayed' || e.target.value === 'Abandoned') {
            document.getElementById('reflection-container').classList.remove('hidden');
        } else {
            document.getElementById('reflection-container').classList.add('hidden');
        }
    });
}

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const isNew = !id;
    
    const taskObj = {
        id: isNew ? Date.now().toString() : id,
        title: document.getElementById('task-title').value,
        date: document.getElementById('task-date').value,
        category: document.getElementById('task-category').value,
        startTime: document.getElementById('task-start').value,
        endTime: document.getElementById('task-end').value,
        status: isNew ? 'Pending' : document.getElementById('task-status').value,
        reflection: document.getElementById('task-reflection').value
    };

    if (isNew) tasks.push(taskObj);
    else {
        const idx = tasks.findIndex(t => t.id === id);
        tasks[idx] = taskObj;
    }

    saveData();
    closeModal();
    if(calendarMode === 'list') {
        const [y,m,d] = taskObj.date.split('-');
        activeDate = new Date(y, m-1, d);
    }
    refreshViews();
});

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if(!task) return;
    document.getElementById('modal-title').innerText = 'Edit Task';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-date').value = task.date;
    document.getElementById('task-category').value = task.category;
    document.getElementById('task-start').value = task.startTime;
    document.getElementById('task-end').value = task.endTime;
    document.getElementById('status-container').classList.remove('hidden');
    document.getElementById('task-status').value = task.status;
    if (task.status === 'Delayed' || task.status === 'Abandoned') {
        document.getElementById('reflection-container').classList.remove('hidden');
        document.getElementById('task-reflection').value = task.reflection || '';
    } else {
        document.getElementById('reflection-container').classList.add('hidden');
        document.getElementById('task-reflection').value = '';
    }
    taskModal.classList.remove('hidden');
    setTimeout(() => { taskModalContent.classList.remove('scale-95'); }, 10);
}

function quickUpdateStatus(id, newStatus) {
    const index = tasks.findIndex(t => t.id === id);
    if(index > -1) {
        tasks[index].status = newStatus;
        if(newStatus === 'Delayed' || newStatus === 'Abandoned') editTask(id);
        else {
            tasks[index].reflection = '';
            saveData();
            refreshViews();
        }
    }
}

function deleteTask(id) {
    if(confirm("Are you sure you want to delete this task?")) {
        tasks = tasks.filter(t => t.id !== id);
        saveData();
        refreshViews();
    }
}

// --- ADMIN DASHBOARD ---
function renderAdminPanel() {
    document.getElementById('admin-user-count').innerText = userDB.length;
    const adminList = document.getElementById('admin-user-list');
    adminList.innerHTML = '';

    userDB.forEach((u, index) => {
        // Prevent deleting the admin account itself
        const deleteBtn = u.username.toLowerCase() === 'admin' 
            ? `<span class="text-xs text-gray-500 italic">Protected</span>` 
            : `<button onclick="adminDeleteUser(${index})" class="text-xs text-red-400 hover:text-red-300 font-medium bg-red-900/20 px-3 py-1 rounded-md transition-colors">Remove</button>`;

        adminList.innerHTML += `
            <tr class="hover:bg-gray-800/30 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-white">${u.username}</td>
                <td class="py-3 px-4 text-sm text-gray-400">${u.fullname}</td>
                <td class="py-3 px-4 text-sm text-brand">${u.role}</td>
                <td class="py-3 px-4 text-right">${deleteBtn}</td>
            </tr>
        `;
    });
}

function adminDeleteUser(index) {
    const userToDelete = userDB[index];
    if(confirm(`Are you sure you want to delete user "${userToDelete.username}"? This frees up a space in the 10-user limit. Their tasks will also be deleted permanently.`)) {
        // Remove from DB
        userDB.splice(index, 1);
        localStorage.setItem('omnitrack_users_db', JSON.stringify(userDB));
        // Remove their specific task data
        localStorage.removeItem(`omnitrack_tasks_${userToDelete.username}`);
        renderAdminPanel();
    }
}

// --- ANALYTICS DASHBOARD ---
function renderAnalytics() {
    const totalTasks = tasks.length;
    document.getElementById('stat-total-tasks').innerText = totalTasks;

    if(totalTasks === 0) {
        document.getElementById('stat-overall-rate').innerText = '0%';
        document.getElementById('stat-most-delayed').innerText = 'None';
        document.getElementById('stat-top-cat').innerText = 'None';
        document.getElementById('analytics-categories').innerHTML = '<p class="text-sm text-gray-500">No data available yet.</p>';
        document.getElementById('analytics-time').innerHTML = '<p class="text-sm text-gray-500">No data available yet.</p>';
        return;
    }

    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    document.getElementById('stat-overall-rate').innerText = `${Math.round((completedTasks / totalTasks) * 100)}%`;

    const catData = {
        JEE: { total: 0, completed: 0, delayed: 0, hours: 0, color: 'bg-blue-500' },
        Societies: { total: 0, completed: 0, delayed: 0, hours: 0, color: 'bg-purple-500' },
        College: { total: 0, completed: 0, delayed: 0, hours: 0, color: 'bg-green-500' },
        Personal: { total: 0, completed: 0, delayed: 0, hours: 0, color: 'bg-orange-500' }
    };

    tasks.forEach(t => {
        catData[t.category].total++;
        if(t.status === 'Completed') catData[t.category].completed++;
        if(t.status === 'Delayed' || t.status === 'Abandoned') catData[t.category].delayed++;
        
        const start = new Date(`1970-01-01T${t.startTime}:00Z`);
        const end = new Date(`1970-01-01T${t.endTime}:00Z`);
        let diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours < 0) diffHours += 24;
        catData[t.category].hours += diffHours;
    });

    let maxDelayedCat = 'None', maxDelayedVal = -1;
    let maxTopCat = 'None', maxTopVal = -1;
    let maxHours = 0;

    for (const [cat, data] of Object.entries(catData)) {
        if (data.delayed > maxDelayedVal && data.delayed > 0) { maxDelayedVal = data.delayed; maxDelayedCat = cat; }
        if (data.completed > maxTopVal && data.completed > 0) { maxTopVal = data.completed; maxTopCat = cat; }
        if (data.hours > maxHours) maxHours = data.hours;
    }

    document.getElementById('stat-most-delayed').innerText = maxDelayedCat;
    document.getElementById('stat-top-cat').innerText = maxTopCat;

    const catContainer = document.getElementById('analytics-categories');
    const timeContainer = document.getElementById('analytics-time');
    catContainer.innerHTML = '';
    timeContainer.innerHTML = '';

    for (const [cat, data] of Object.entries(catData)) {
        const rate = data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100);
        catContainer.innerHTML += `
            <div>
                <div class="flex justify-between items-center text-xs mb-2">
                    <span class="font-semibold text-gray-300">${cat}</span>
                    <span class="text-gray-500">${rate}% Success (${data.completed}/${data.total})</span>
                </div>
                <div class="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div class="${data.color} h-full rounded-full" style="width: ${rate}%"></div>
                </div>
            </div>`;
        const timePercent = maxHours === 0 ? 0 : Math.round((data.hours / maxHours) * 100);
        timeContainer.innerHTML += `
            <div>
                <div class="flex justify-between items-center text-xs mb-2">
                    <span class="font-semibold text-gray-300">${cat}</span>
                    <span class="text-gray-500">${data.hours.toFixed(1)} hrs</span>
                </div>
                <div class="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden flex">
                    <div class="${data.color} h-full rounded-r-full" style="width: ${timePercent}%"></div>
                </div>
            </div>`;
    }
}

function formatDateForInput(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatAmPm(timeStr) {
    let [hours, minutes] = timeStr.split(':');
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
}
