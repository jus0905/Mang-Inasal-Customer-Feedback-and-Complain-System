const firebaseConfig = {
    apiKey: "dALshn0vgvj4dlZUYq4AF1ltMJgMsvqVLFqeVtlc",
    authDomain: "mang-inasal-ec7c5.firebaseapp.com",
    databaseURL: "https://mang-inasal-ec7c5-default-rtdb.firebaseio.com/",
    projectId: "mang-inasal-ec7c5",
    storageBucket: "mang-inasal-ec7c5.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const defaultUserAvatar = 'userimg.jpg';
const adminProfileSettingsKey = 'adminProfileSettings';
const adminProfilePictureKey = 'adminProfilePicture';
const adminCredentials = {
    username: 'admin.juandelacruz',
    password: '12341234'
};
const maxAdminAvatarSize = 2 * 1024 * 1024;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function inlineString(value) {
    return escapeHtml(JSON.stringify(String(value ?? '')));
}

function normalizeTicket(ticket) {
    const normalized = ticket || {};
    return {
        ...normalized,
        id: String(normalized.id || ''),
        datetime: String(normalized.datetime || 'Unknown date'),
        customer: String(normalized.customer || 'Unknown customer'),
        rating: String(normalized.rating || ''),
        sender: String(normalized.sender || 'Unknown'),
        branch: String(normalized.branch || 'Unknown branch'),
        category: String(normalized.category || 'Uncategorized'),
        status: String(normalized.status || 'Pending'),
        description: String(normalized.description || ''),
        priority: calculatePriority(normalized.rating)
    };
}

function calculatePriority(rating) {
    const num = parseInt(rating, 10);
    if (num === 1 || num === 2) return 'High';
    if (num === 3) return 'Medium';
    if (num === 4 || num === 5) return 'Low';
    return 'Medium';
}

function calculateCSAT(ticketsList) {
    if (!ticketsList || ticketsList.length === 0) return '0.0 / 5';
    const sumRatings = ticketsList.reduce((acc, t) => acc + (parseInt(t.rating, 10) || 0), 0);
    const avg = (sumRatings / ticketsList.length).toFixed(1);
    return `${avg} / 5`;
}

function getTicketTimestamp(ticket) {
    const value = String(ticket?.datetime || '');
    const match = value.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+-\s+(\d{2}):(\d{2})$/);

    if (match) {
        const [, monthName, day, year, hours, minutes] = match;
        const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
        const timestamp = Date.UTC(Number(year), monthIndex, Number(day), Number(hours), Number(minutes));
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function sortTicketsByNewest(tickets) {
    return [...tickets].sort((a, b) => getTicketTimestamp(b) - getTicketTimestamp(a));
}

let rawTicketsData = [
    { id: 'REF-10024', datetime: 'Aug 22, 2026 - 14:15', customer: 'Juan Dela Cruz', rating: '1', sender: 'Mobile App', branch: 'SM Megamall', category: 'Food Quality', status: 'Pending', description: 'Uncooked chicken served at counter, raw center.' },
    { id: 'REF-10025', datetime: 'Aug 22, 2026 - 11:30', customer: 'Maria Santos', rating: '2', sender: 'Web Portal', branch: 'Market! Market!', category: 'Service Speed', status: 'In Progress', description: 'Unli rice lead time took 20 minutes for refilling.' },
    { id: 'REF-10026', datetime: 'Aug 21, 2026 - 09:45', customer: 'Mark Reyes', rating: '4', sender: 'Kiosk', branch: 'Trinoma', category: 'Cleanliness', status: 'Resolved', description: 'Dining area table was uncleaned after previous guest.' },
    { id: 'REF-10027', datetime: 'Aug 21, 2026 - 16:00', customer: 'Anna Lim', rating: '2', sender: 'Mobile App', branch: 'Greenbelt', category: 'Staff Service', status: 'In Progress', description: 'Cashier was impolite when asking for receipt.' },
    { id: 'REF-10028', datetime: 'Aug 20, 2026 - 13:20', customer: 'Kenji Tanaka', rating: '3', sender: 'Web Portal', branch: 'MOA Complex', category: 'Store Facilities', status: 'Resolved', description: 'Restroom door lock was broken.' },
    { id: 'REF-10029', datetime: 'Aug 20, 2026 - 10:10', customer: 'Bea Alonzo', rating: '1', sender: 'Mobile App', branch: 'SM Megamall', category: 'Food Quality', status: 'Pending', description: 'Soup was served cold instead of hot.' },
    { id: 'REF-10030', datetime: 'Aug 19, 2026 - 18:40', customer: 'Dingdong Dantes', rating: '5', sender: 'Web Portal', branch: 'BGC High Street', category: 'Service Speed', status: 'Resolved', description: 'Long queue order wait time exceeding 30 mins.' }
];

let ticketsData = rawTicketsData.map(t => ({
    ...normalizeTicket(t)
}));

for(let i=1; i<=10; i++) {
    const ratingVal = `${(i % 5) + 1}`;
    ticketsData.push({
        id: `REF-ARC-900${i}`,
        datetime: `Aug 1${i<=9?'0':''}1, 2026 - 12:00`,
        customer: `Customer Old ${i}`,
        rating: ratingVal,
        sender: 'Kiosk',
        branch: 'SM Megamall',
        category: i % 2 === 0 ? 'Food Quality' : 'Cleanliness',
        status: 'Archived',
        priority: calculatePriority(ratingVal),
        description: `Historical archived feedback ticket record number ${i}.`
    });
}

function saveTicket(ticket) {
    ticket.priority = calculatePriority(ticket.rating);
    return db.ref(`tickets/${ticket.id}`).set(ticket);
}

async function updateTicket(ticket, changes, action) {
    const previousValues = Object.fromEntries(
        Object.keys(changes).map(key => [key, ticket[key]])
    );
    Object.assign(ticket, changes);

    try {
        await saveTicket(ticket);
        return true;
    } catch (error) {
        Object.assign(ticket, previousValues);
        console.error(`${action} failed`, error);
        alert(`${action} could not be saved. Please try again.`);
        return false;
    }
}

function syncTicketsFromDatabase() {
    db.ref('tickets').on('value', snapshot => {
        if(!snapshot.exists()) {
            const seedTickets = {};
            ticketsData.forEach(ticket => { 
                ticket.priority = calculatePriority(ticket.rating);
                seedTickets[ticket.id] = ticket; 
            });
            db.ref('tickets').set(seedTickets);
            return;
        }

        const data = Object.values(snapshot.val());
        ticketsData = data.map(normalizeTicket).filter(ticket => ticket.id);
        renderTables();
    }, error => {
        console.error('Ticket sync failed', error);
    });
}

let staffData = [
    { id: 'STF-101', name: 'Carlo Mendoza', age: 24, email: 'carlo.m@manginasal.com', role: 'Shift Lead / SM Megamall', status: 'Active', photo: defaultUserAvatar },
    { id: 'STF-102', name: 'Bea Santiago', age: 22, email: 'bea.s@manginasal.com', role: 'Service Crew / Market!', status: 'Breaktime', photo: defaultUserAvatar },
    { id: 'STF-103', name: 'Miguel Tan', age: 26, email: 'miguel.t@manginasal.com', role: 'Kitchen Supervisor / MOA', status: 'Active', photo: defaultUserAvatar },
    { id: 'STF-104', name: 'Jasmine Cruz', age: 25, email: 'jasmine.c@manginasal.com', role: 'Cashier Lead / Trinoma', status: 'Offline', photo: defaultUserAvatar },
    { id: 'STF-105', name: 'Rico Palmares', age: 29, email: 'rico.p@manginasal.com', role: 'Branch Assistant / BGC', status: 'Active', photo: defaultUserAvatar }
];

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const loginError = document.getElementById('loginError');
    const submitButton = document.querySelector('#loginForm button[type="submit"]');
    submitButton.disabled = true;
    loginError.classList.add('hidden');

    try {
        if (email !== adminCredentials.username || password !== adminCredentials.password) {
            loginError.innerText = 'Invalid username or password.';
            loginError.classList.remove('hidden');
            return;
        }

        document.getElementById('loginPass').value = '';
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('customerPage').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        renderTables();
    } finally {
        submitButton.disabled = false;
    }
}

function handleLogout() {
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('customerPage').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}

function showCustomerPortal() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('customerPage').classList.remove('hidden');
}

function resetFeedbackForm() {
    document.getElementById('feedbackForm').reset();
    document.getElementById('feedbackForm').classList.add('hidden');
    document.getElementById('feedbackSuccess').classList.add('hidden');
    document.getElementById('feedbackIntro').classList.remove('hidden');
}

async function submitCustomerFeedback(e) {
    e.preventDefault();
    const numericReferences = ticketsData
        .map(ticket => Number((ticket.id.match(/^REF-(\d+)$/) || [])[1]))
        .filter(Number.isFinite);
    const nextNumber = Math.max(10000, ...numericReferences) + 1;
    const referenceId = `REF-${nextNumber}`;
    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const ratingVal = document.getElementById('customerRating').value;

    const newTicket = {
        id: referenceId,
        datetime: `${dateLabel} - ${timeLabel}`,
        customer: document.getElementById('customerName').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        rating: ratingVal,
        sender: 'Customer Portal',
        branch: document.getElementById('feedbackBranch').value,
        category: document.getElementById('feedbackCategory').value,
        status: 'Pending',
        priority: calculatePriority(ratingVal),
        description: document.getElementById('feedbackMessage').value.trim()
    };

    try {
        await saveTicket(newTicket);
    } catch(error) {
        console.error('Feedback write failed', error);
        alert('We could not submit your feedback. Please try again.');
        return;
    }

    document.getElementById('customerReference').innerText = referenceId;
    document.getElementById('feedbackForm').classList.add('hidden');
    document.getElementById('feedbackSuccess').classList.remove('hidden');
    document.getElementById('feedbackIntro').classList.add('hidden');
}

function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('bg-slate-800', 'text-white', 'border-red-600'));
    
    const target = document.getElementById(`page-${pageId}`);
    if(target) target.classList.remove('hidden');
    
    const navBtn = document.getElementById(`nav-${pageId}`);
    if(navBtn) navBtn.classList.add('bg-slate-800', 'text-white', 'border-red-600');

    renderTables();
}

function switchCategory(catName) {
    switchPage('categories');
    document.getElementById('categorySelector').value = catName;
    document.getElementById('catTitle').innerText = `${catName} Analytics Deep Dive`;
    document.getElementById('currentCatNameText').innerText = catName;
    
    const nonArchivedCategoryTickets = ticketsData.filter(t => t.category === catName && t.status !== 'Archived');
    const catCSAT = calculateCSAT(nonArchivedCategoryTickets);

    document.getElementById('catCardTitle1').innerText = `ACTIVE ${catName.toUpperCase()} TICKETS`;
    document.getElementById('catMetric1').innerText = nonArchivedCategoryTickets.length;
    document.getElementById('catMetric2').innerText = 'Operational Review';
    document.getElementById('catCardTitle3').innerText = 'CATEGORY CSAT';
    document.getElementById('catMetric3').innerText = catCSAT;

    renderCategoryTickets(catName);
}

function formatRatingStars(rating) {
    const num = parseInt(rating, 10);
    if(isNaN(num) || num < 1) return '<span class="text-slate-400">N/A</span>';
    return `<span class="text-amber-500 font-bold">${'★'.repeat(num)}</span> <span class="text-slate-400 text-[10px]">(${num}/5)</span>`;
}

function getPriorityBadge(priority) {
    if (priority === 'High') return `<span class="bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded font-bold text-[10px]"><i class="fa-solid fa-fire mr-1"></i>High</span>`;
    if (priority === 'Medium') return `<span class="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[10px]">Medium</span>`;
    return `<span class="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold text-[10px]">Low</span>`;
}

function renderDashboardMetrics() {
    document.getElementById('statTotal').innerText = ticketsData.length;
    
    const activeCount = ticketsData.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
    document.getElementById('statActive').innerText = activeCount;
    
    const resolvedCount = ticketsData.filter(t => t.status === 'Resolved').length;
    document.getElementById('statResolved').innerText = resolvedCount;

    document.getElementById('statCSAT').innerText = calculateCSAT(ticketsData);
}

function renderTables() {
    renderDashboardMetrics();
    renderDashboardTable(currentFilterStatus);
    renderAllTicketsTable();
    renderStatusTable('Pending', 'pendingTableBody');
    renderStatusTable('In Progress', 'inprogressTableBody');
    renderStatusTable('Resolved', 'resolvedTableBody');
    renderStatusTable('Archived', 'archivedTableBody');
    renderStaffTable();
    renderNotifications();
    renderReportsPage();
}

let currentFilterStatus = 'All';
function filterTicketStatus(status) {
    currentFilterStatus = status;
    renderDashboardTable(status);
}

function renderDashboardTable(statusFilter) {
    const tbody = document.getElementById('dashboardTicketTableBody');
    const activeTickets = sortTicketsByNewest(ticketsData.filter(t => t.status !== 'Archived'));
    const filtered = statusFilter === 'All' ? activeTickets : activeTickets.filter(t => t.status === statusFilter);
    
    tbody.innerHTML = filtered.map(t => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-bold text-red-700">${escapeHtml(t.id)}</td>
            <td class="p-3 text-slate-500">${escapeHtml(t.datetime)}</td>
            <td class="p-3 font-semibold">${escapeHtml(t.customer)}</td>
            <td class="p-3">${formatRatingStars(t.rating)}</td>
            <td class="p-3">${getPriorityBadge(t.priority)}</td>
            <td class="p-3">${escapeHtml(t.category)}</td>
            <td class="p-3">${escapeHtml(t.branch)}</td>
            <td class="p-3">${getStatusBadge(t.status)}</td>
            <td class="p-3 text-center">
                <button onclick="openTicketModal(${inlineString(t.id)})" class="bg-mangGreen text-white px-2.5 py-1 rounded hover:bg-green-800 font-bold text-[10px] shadow">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

function renderAllTicketsTable() {
    const tbody = document.getElementById('allTicketsTableBody');
    const active = sortTicketsByNewest(ticketsData.filter(t => t.status !== 'Archived'));
    tbody.innerHTML = active.map(t => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-bold text-red-700">${escapeHtml(t.id)}</td>
            <td class="p-3 text-slate-500">${escapeHtml(t.datetime)}</td>
            <td class="p-3 font-semibold">${escapeHtml(t.customer)}</td>
            <td class="p-3">${formatRatingStars(t.rating)}</td>
            <td class="p-3">${getPriorityBadge(t.priority)}</td>
            <td class="p-3">${escapeHtml(t.sender)}</td>
            <td class="p-3">${escapeHtml(t.branch)}</td>
            <td class="p-3">${escapeHtml(t.category)}</td>
            <td class="p-3">${getStatusBadge(t.status)}</td>
            <td class="p-3 text-center">
                <button onclick="openTicketModal(${inlineString(t.id)})" class="bg-mangGreen text-white px-2.5 py-1 rounded font-bold text-[10px]">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

function renderStatusTable(statusName, elementId) {
    const tbody = document.getElementById(elementId);
    const filtered = sortTicketsByNewest(ticketsData.filter(t => t.status === statusName));
    tbody.innerHTML = filtered.map(t => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-bold text-red-700">${escapeHtml(t.id)}</td>
            <td class="p-3 text-slate-500">${escapeHtml(t.datetime)}</td>
            <td class="p-3 font-semibold">${escapeHtml(t.customer)}</td>
            <td class="p-3">${formatRatingStars(t.rating)}</td>
            <td class="p-3">${getPriorityBadge(t.priority)}</td>
            <td class="p-3">${escapeHtml(t.branch)}</td>
            <td class="p-3">${escapeHtml(t.category)}</td>
            <td class="p-3">${getStatusBadge(t.status)}</td>
            <td class="p-3 text-center">
                <button onclick="openTicketModal(${inlineString(t.id)})" class="bg-mangGreen text-white px-2.5 py-1 rounded font-bold text-[10px]">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

function renderCategoryTickets(catName) {
    const tbody = document.getElementById('categoryTicketsTableBody');
    const filtered = sortTicketsByNewest(ticketsData.filter(t => t.category === catName && t.status !== 'Archived'));
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400 italic">No active non-archived tickets found in this category.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(t => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-bold text-red-700">${escapeHtml(t.id)}</td>
            <td class="p-3 text-slate-500">${escapeHtml(t.datetime)}</td>
            <td class="p-3 font-semibold">${escapeHtml(t.customer)}</td>
            <td class="p-3">${formatRatingStars(t.rating)}</td>
            <td class="p-3">${getPriorityBadge(t.priority)}</td>
            <td class="p-3">${escapeHtml(t.branch)}</td>
            <td class="p-3">${getStatusBadge(t.status)}</td>
            <td class="p-3 text-center">
                <button onclick="openTicketModal(${inlineString(t.id)})" class="bg-mangGreen text-white px-2.5 py-1 rounded font-bold text-[10px]">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

function renderReportsPage() {
    const totalCount = ticketsData.length || 1;
    
    const pending = ticketsData.filter(t => t.status === 'Pending').length;
    const inProgress = ticketsData.filter(t => t.status === 'In Progress').length;
    const resolved = ticketsData.filter(t => t.status === 'Resolved').length;
    const archived = ticketsData.filter(t => t.status === 'Archived').length;

    const statusContainer = document.getElementById('reportsStatusBreakdownContainer');
    statusContainer.innerHTML = `
        <div>
            <div class="flex justify-between text-xs font-semibold mb-1"><span>Pending Tickets</span> <span class="text-amber-600 font-bold">${pending} Tickets</span></div>
            <div class="w-full bg-slate-200 h-3 rounded-full overflow-hidden"><div class="bg-amber-500 h-full rounded-full" style="width: ${(pending/totalCount)*100}%"></div></div>
        </div>
        <div>
            <div class="flex justify-between text-xs font-semibold mb-1"><span>In-Progress Tickets</span> <span class="text-blue-600 font-bold">${inProgress} Tickets</span></div>
            <div class="w-full bg-slate-200 h-3 rounded-full overflow-hidden"><div class="bg-blue-500 h-full rounded-full" style="width: ${(inProgress/totalCount)*100}%"></div></div>
        </div>
        <div>
            <div class="flex justify-between text-xs font-semibold mb-1"><span>Resolved Tickets</span> <span class="text-green-600 font-bold">${resolved} Tickets</span></div>
            <div class="w-full bg-slate-200 h-3 rounded-full overflow-hidden"><div class="bg-green-600 h-full rounded-full" style="width: ${(resolved/totalCount)*100}%"></div></div>
        </div>
        <div>
            <div class="flex justify-between text-xs font-semibold mb-1"><span>Archived Tickets</span> <span class="text-slate-600 font-bold">${archived} Tickets</span></div>
            <div class="w-full bg-slate-200 h-3 rounded-full overflow-hidden"><div class="bg-slate-600 h-full rounded-full" style="width: ${(archived/totalCount)*100}%"></div></div>
        </div>
    `;

    const categories = ['Food Quality', 'Service Speed', 'Staff Service', 'Cleanliness', 'Store Facilities'];
    const categoryColors = ['text-red-600', 'text-amber-600', 'text-blue-600', 'text-green-600', 'text-purple-600'];
    const categoryContainer = document.getElementById('reportsCategoryBreakdownContainer');

    categoryContainer.innerHTML = categories.map((cat, idx) => {
        const count = ticketsData.filter(t => t.category === cat).length;
        const pct = Math.round((count / totalCount) * 100);
        return `
            <div class="flex items-center justify-between bg-white p-2 rounded border">
                <span class="font-medium">${cat} (${count} tickets)</span>
                <span class="font-bold ${categoryColors[idx]}">${pct}%</span>
            </div>
        `;
    }).join('');
}

function renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');
    tbody.innerHTML = staffData.map(s => `
        <tr class="hover:bg-slate-50">
            <td class="p-3">
                <img src="${escapeHtml(s.photo)}" class="w-8 h-8 rounded-full border object-cover shadow-sm bg-white">
            </td>
            <td class="p-3 font-bold text-slate-800">${escapeHtml(s.name)}</td>
            <td class="p-3">${escapeHtml(s.age)} yrs old</td>
            <td class="p-3 text-slate-500">${escapeHtml(s.email)}</td>
            <td class="p-3">${escapeHtml(s.role)}</td>
            <td class="p-3">${getStatusBadge(s.status)}</td>
            <td class="p-3 text-center space-x-1">
                <button onclick="openEditStaffModal(${inlineString(s.id)})" class="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[10px] font-bold shadow transition">Edit</button>
                <button onclick="openSuspendModal(${inlineString(s.id)})" class="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded text-[10px] font-bold shadow transition">Suspend</button>
            </td>
        </tr>
    `).join('');
}

function getNextStaffId() {
    const highestId = staffData.reduce((highest, staff) => {
        const match = staff.id.match(/^STF-(\d+)$/);
        return match ? Math.max(highest, Number(match[1])) : highest;
    }, 100);
    return `STF-${highestId + 1}`;
}

let currentEditingStaffId = null;
let staffToSuspendId = null;

function openAddStaffModal() {
    currentEditingStaffId = null;
    document.getElementById('staffModalTitle').innerText = 'Add New Staff / User';
    document.getElementById('staffForm').reset();
    document.getElementById('staffFormPhotoPreview').src = defaultUserAvatar;
    document.getElementById('staffModal').classList.remove('hidden');
}

function openEditStaffModal(staffId) {
    const s = staffData.find(item => item.id === staffId);
    if (!s) return;

    currentEditingStaffId = staffId;
    document.getElementById('staffModalTitle').innerText = 'Edit Staff / User';
    document.getElementById('staffFullName').value = s.name;
    document.getElementById('staffAge').value = s.age;
    document.getElementById('staffEmail').value = s.email;
    document.getElementById('staffRole').value = s.role;
    document.getElementById('staffFormPhotoPreview').src = defaultUserAvatar;

    document.getElementById('staffModal').classList.remove('hidden');
}

function closeStaffModal() {
    document.getElementById('staffModal').classList.add('hidden');
    document.getElementById('staffForm').reset();
    currentEditingStaffId = null;
}

function handleStaffFormSubmit(e) {
    e.preventDefault();
    const fullName = document.getElementById('staffFullName').value.trim();
    const age = parseInt(document.getElementById('staffAge').value, 10);
    const email = document.getElementById('staffEmail').value.trim();
    const role = document.getElementById('staffRole').value.trim();

    if (currentEditingStaffId) {
        const staffIndex = staffData.findIndex(s => s.id === currentEditingStaffId);
        if (staffIndex !== -1) {
            staffData[staffIndex].name = fullName;
            staffData[staffIndex].age = age;
            staffData[staffIndex].email = email;
            staffData[staffIndex].role = role;
        }
    } else {
        const newStaff = {
            id: getNextStaffId(),
            name: fullName,
            age: age,
            email: email,
            role: role,
            status: 'Active',
            photo: defaultUserAvatar
        };
        staffData.push(newStaff);
    }

    closeStaffModal();
    renderStaffTable();
}

function openSuspendModal(staffId) {
    const s = staffData.find(item => item.id === staffId);
    if (!s) return;

    staffToSuspendId = staffId;
    document.getElementById('suspendStaffName').innerText = s.name;
    document.getElementById('suspendModal').classList.remove('hidden');
}

function closeSuspendModal() {
    document.getElementById('suspendModal').classList.add('hidden');
    staffToSuspendId = null;
}

function confirmSuspendStaff() {
    if (staffToSuspendId) {
        staffData = staffData.filter(s => s.id !== staffToSuspendId);
        renderStaffTable();
    }
    closeSuspendModal();
}

function renderNotifications() {
    const list = document.getElementById('notificationList');
    const notifications = ticketsData
        .filter(ticket => ticket.sender === 'Customer Portal')
        .sort((a, b) => {
            const dateDifference = getTicketTimestamp(b) - getTicketTimestamp(a);
            if (dateDifference !== 0) return dateDifference;
            return Number(b.id.replace(/\D/g, '')) - Number(a.id.replace(/\D/g, ''));
        });

    list.innerHTML = notifications.length ? notifications.map(ticket => `
        <div class="p-3 hover:bg-slate-50 cursor-pointer" onclick="openTicketModal(${inlineString(ticket.id)})">
            <div class="flex items-center justify-between gap-2">
                <div class="font-bold text-red-700">New feedback received</div>
                ${getPriorityBadge(ticket.priority)}
            </div>
            <div class="mt-1 grid gap-1 text-slate-600">
                <div><span class="font-semibold text-slate-500">Customer:</span> ${escapeHtml(ticket.customer)}</div>
                <div><span class="font-semibold text-slate-500">Category:</span> ${escapeHtml(ticket.category)}</div>
                <div><span class="font-semibold text-slate-500">Date &amp; Time:</span> ${escapeHtml(ticket.datetime)}</div>
            </div>
            <div class="mt-1 text-slate-400 text-[10px]">Reference: ${escapeHtml(ticket.id)}</div>
        </div>
    `).join('') : '<div class="p-4 text-center text-slate-500">No new feedback received.</div>';
    document.getElementById('notifBadge').innerText = notifications.length;
}

function toggleNotificationPopup() {
    const pop = document.getElementById('notificationPopup');
    pop.classList.toggle('hidden');
}

function handleGlobalSearch(query) {
    if(!query) {
        switchPage('dashboard');
        return;
    }
    switchPage('tickets');
    const tbody = document.getElementById('allTicketsTableBody');
    const q = query.toLowerCase();
    const filtered = sortTicketsByNewest(ticketsData.filter(t => t.id.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || t.branch.toLowerCase().includes(q)));
    
    tbody.innerHTML = filtered.map(t => `
        <tr class="bg-yellow-50 hover:bg-slate-50">
            <td class="p-3 font-bold text-red-700">${escapeHtml(t.id)}</td>
            <td class="p-3 text-slate-500">${escapeHtml(t.datetime)}</td>
            <td class="p-3 font-semibold">${escapeHtml(t.customer)}</td>
            <td class="p-3">${formatRatingStars(t.rating)}</td>
            <td class="p-3">${getPriorityBadge(t.priority)}</td>
            <td class="p-3">${escapeHtml(t.sender)}</td>
            <td class="p-3">${escapeHtml(t.branch)}</td>
            <td class="p-3">${escapeHtml(t.category)}</td>
            <td class="p-3">${getStatusBadge(t.status)}</td>
            <td class="p-3 text-center">
                <button onclick="openTicketModal(${inlineString(t.id)})" class="bg-mangGreen text-white px-2.5 py-1 rounded font-bold text-[10px]">View Details</button>
            </td>
        </tr>
    `).join('');
}

function getStatusBadge(status) {
    if(status === 'Pending') return `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">Pending</span>`;
    if(status === 'In Progress') return `<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[10px]">In Progress</span>`;
    if(status === 'Resolved') return `<span class="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold text-[10px]">Resolved</span>`;
    if(status === 'Archived') return `<span class="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">Archived</span>`;
    if(status === 'Active') return `<span class="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold text-[10px]">Active</span>`;
    if(status === 'Breaktime') return `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">Breaktime</span>`;
    return `<span class="bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-bold text-[10px]">Offline</span>`;
}

let activeModalTicketId = null;
let ticketToResolveId = null;
let ticketToArchiveId = null;

function openTicketModal(ticketId) {
    activeModalTicketId = ticketId;
    const t = ticketsData.find(item => item.id === ticketId);
    if(!t) return;

    const body = document.getElementById('modalContentBody');
    body.innerHTML = `
        <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border">
            <div><span class="font-semibold text-slate-500">Reference ID:</span> <span class="font-bold text-red-600">${escapeHtml(t.id)}</span></div>
            <div><span class="font-semibold text-slate-500">Date & Time:</span> ${escapeHtml(t.datetime)}</div>
            <div><span class="font-semibold text-slate-500">Customer:</span> ${escapeHtml(t.customer)}</div>
            <div><span class="font-semibold text-slate-500">Rating:</span> ${formatRatingStars(t.rating)}</div>
            <div><span class="font-semibold text-slate-500">Branch:</span> ${escapeHtml(t.branch)}</div>
            <div><span class="font-semibold text-slate-500">Category:</span> ${escapeHtml(t.category)}</div>
            <div><span class="font-semibold text-slate-500">Status:</span> <span id="modalStatusText">${getStatusBadge(t.status)}</span></div>
            <div><span class="font-semibold text-slate-500">Ticket Sender:</span> ${escapeHtml(t.sender)}</div>
            <div><span class="font-semibold text-slate-500">Priority:</span> ${getPriorityBadge(t.priority)}</div>
        </div>
        <div class="mt-3">
            <span class="font-semibold text-slate-500 block mb-1">Customer Description / Message:</span>
            <p class="bg-amber-50 p-3 rounded border border-amber-200 text-slate-700 italic">"${escapeHtml(t.description)}"</p>
        </div>
    `;

    const actionContainer = document.getElementById('modalActionContainer');

    if (t.status === 'Pending') {
        actionContainer.innerHTML = `
            <button onclick="openMakeReportModal(${inlineString(t.id)})" class="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3.5 py-1.5 rounded text-xs shadow flex items-center gap-1">
                <i class="fa-solid fa-file-signature"></i> Make a report
            </button>
        `;
    } else if (t.status === 'In Progress') {
        actionContainer.innerHTML = `
            <div class="flex gap-2">
                <button onclick="openMakeReportModal(${inlineString(t.id)})" class="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded text-xs shadow">
                    <i class="fa-solid fa-pen-to-square mr-1"></i> Continue Report
                </button>
                <button onclick="promptMarkAsResolved(${inlineString(t.id)})" class="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded text-xs shadow">
                    <i class="fa-solid fa-circle-check mr-1"></i> Mark as Resolved
                </button>
            </div>
        `;
    } else if(t.status === 'Resolved') {
        actionContainer.innerHTML = `
            <button onclick="promptMoveToArchive(${inlineString(t.id)})" class="bg-slate-700 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded text-xs shadow">
                <i class="fa-solid fa-box-archive mr-1"></i> Put in Archived
            </button>
        `;
    } else {
        actionContainer.innerHTML = `<span class="text-slate-400 text-xs italic">Archived Record (Read-Only)</span>`;
    }

    document.getElementById('ticketModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('ticketModal').classList.add('hidden');
}

let currentReportTicketId = null;

async function openMakeReportModal(ticketId) {
    const t = ticketsData.find(item => item.id === ticketId);
    if (!t) return;

    if (t.status === 'Pending') {
        if (!await updateTicket(t, { status: 'In Progress' }, 'Ticket status update')) return;
        renderTables();
    }

    currentReportTicketId = ticketId;
    closeModal();

    document.getElementById('reportRating').innerHTML = formatRatingStars(t.rating);
    document.getElementById('reportCategory').innerText = t.category;
    document.getElementById('reportBranch').innerText = t.branch;
    document.getElementById('reportDateTime').innerText = t.datetime;
    document.getElementById('reportCustomerComplaint').innerText = `"${t.description}"`;
    document.getElementById('adminReportText').value = t.adminReport || '';

    document.getElementById('makeReportModal').classList.remove('hidden');
}

function promptConfirmReport() {
    document.getElementById('reportConfirmModal').classList.remove('hidden');
}

function closeReportConfirmModal() {
    document.getElementById('reportConfirmModal').classList.add('hidden');
}

async function confirmSubmitReport() {
    if (!currentReportTicketId) return;
    const t = ticketsData.find(item => item.id === currentReportTicketId);
    if (!t) return;

    const reportContent = document.getElementById('adminReportText').value.trim();
    if (!await updateTicket(t, { adminReport: reportContent, status: 'Resolved' }, 'Report submission')) return;

    closeReportConfirmModal();
    document.getElementById('makeReportModal').classList.add('hidden');
    currentReportTicketId = null;
    renderTables();
    alert(`Report for ticket ${t.id} successfully sent to ${t.branch} branch and marked as Resolved!`);
}

function cancelReport() {
    if (!currentReportTicketId) return;
    const t = ticketsData.find(item => item.id === currentReportTicketId);
    if (t) {
        t.status = 'In Progress';
    }
    if (t) renderTables();
    document.getElementById('makeReportModal').classList.add('hidden');
    currentReportTicketId = null;
}

function promptMarkAsResolved(ticketId) {
    ticketToResolveId = ticketId;
    document.getElementById('resolveTicketIdText').innerText = ticketId;
    document.getElementById('resolveConfirmModal').classList.remove('hidden');
}

function closeResolveModal() {
    document.getElementById('resolveConfirmModal').classList.add('hidden');
    ticketToResolveId = null;
}

async function confirmResolveTicket() {
    if (!ticketToResolveId) return;
    const t = ticketsData.find(item => item.id === ticketToResolveId);
    if (!t || !await updateTicket(t, { status: 'Resolved' }, 'Status update')) return;

    closeResolveModal();
    closeModal();
    renderTables();
}

function promptMoveToArchive(ticketId) {
    ticketToArchiveId = ticketId;
    document.getElementById('archiveTicketIdText').innerText = ticketId;
    document.getElementById('archiveConfirmModal').classList.remove('hidden');
}

function closeArchiveModal() {
    document.getElementById('archiveConfirmModal').classList.add('hidden');
    ticketToArchiveId = null;
}

async function confirmArchiveTicket() {
    if (!ticketToArchiveId) return;
    const t = ticketsData.find(item => item.id === ticketToArchiveId);
    if (!t || !await updateTicket(t, { status: 'Archived' }, 'Archive update')) return;

    closeArchiveModal();
    closeModal();
    renderTables();
}

async function handleAdminAvatarChange(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please choose an image file.');
        fileInput.value = '';
        return;
    }

    if (file.size > maxAdminAvatarSize) {
        alert('Please choose an image smaller than 2 MB.');
        fileInput.value = '';
        return;
    }

    const changePictureButton = document.querySelector('#page-settings button[onclick*="adminAvatarFile"]');
    if (changePictureButton) changePictureButton.disabled = true;
    try {
        const photoData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === 'string'
                ? resolve(reader.result)
                : reject(new Error('Image reader returned an unsupported result.'));
            reader.onerror = () => reject(reader.error || new Error('Image could not be read.'));
            reader.readAsDataURL(file);
        });
        localStorage.setItem(adminProfilePictureKey, photoData);
        document.getElementById('profilePreviewImg').src = photoData;
        document.getElementById('headerAvatar').src = photoData;
    } catch (error) {
        console.error('Admin profile picture save failed', error);
        alert('We could not save the profile picture in this browser. Choose a smaller image or try again.');
    } finally {
        if (changePictureButton) changePictureButton.disabled = false;
        fileInput.value = '';
    }
}

async function saveSettings() {
    const fields = [
        document.getElementById('inputAdminAge'),
        document.getElementById('inputAdminMobile'),
        document.getElementById('inputAdminEmail')
    ];
    const invalidField = fields.find(field => !field.checkValidity());
    if (invalidField) {
        invalidField.reportValidity();
        return;
    }

    const settings = {
        age: document.getElementById('inputAdminAge').value,
        mobile: document.getElementById('inputAdminMobile').value.trim(),
        email: document.getElementById('inputAdminEmail').value.trim()
    };

    try {
        localStorage.setItem(adminProfileSettingsKey, JSON.stringify(settings));
        alert('Admin profile and system settings successfully saved in this browser.');
    } catch (error) {
        console.error('Admin profile settings save failed', error);
        alert('We could not save the admin profile and system settings in this browser. Please try again.');
    }
}

function loadAdminProfile() {
    try {
        const photoData = localStorage.getItem(adminProfilePictureKey);
        document.getElementById('profilePreviewImg').src = photoData || defaultUserAvatar;
        document.getElementById('headerAvatar').src = photoData || defaultUserAvatar;

        const rawSettings = localStorage.getItem(adminProfileSettingsKey);
        const settings = rawSettings ? JSON.parse(rawSettings) : null;
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return;
        if (typeof settings.age === 'string') document.getElementById('inputAdminAge').value = settings.age;
        if (typeof settings.mobile === 'string') document.getElementById('inputAdminMobile').value = settings.mobile;
        if (typeof settings.email === 'string') document.getElementById('inputAdminEmail').value = settings.email;
    } catch (error) {
        console.error('Admin profile settings load failed', error);
        alert('The saved admin profile settings could not be loaded in this browser.');
    }
}

window.onload = function() {
    document.getElementById('openFeedbackBtn').addEventListener('click', function() {
        document.getElementById('feedbackIntro').classList.add('hidden');
        document.getElementById('feedbackForm').classList.remove('hidden');
        document.getElementById('customerName').focus();
    });
    document.getElementById('cancelFeedbackBtn').addEventListener('click', resetFeedbackForm);
    document.getElementById('newFeedbackBtn').addEventListener('click', resetFeedbackForm);
    document.getElementById('feedbackForm').addEventListener('submit', submitCustomerFeedback);
    document.getElementById('goToAdminLoginBtn').addEventListener('click', function() {
        document.getElementById('customerPage').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
    });
    document.getElementById('goToCustomerFeedbackBtn').addEventListener('click', showCustomerPortal);
    loadAdminProfile();
    syncTicketsFromDatabase();
    renderTables();
};
