// Global configuration
const API_BASE_URL = 'https://your-backend.onrender.com/api';

// Auth Check Helper
function checkAuth() {
    const token = localStorage.getItem('campus_auth_token');
    const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/'); // Handle root

    // Simple check: if not token and not on login page, redirect
    // Note: pathname might vary on localhost vs production, so checking filename is key
    const fileName = window.location.pathname.split('/').pop();

    if (!token && fileName !== 'login.html' && fileName !== 'index.html' && fileName !== '') {
        window.location.href = 'login.html';
    }
}

// Global Logout Function
function logout() {
    localStorage.removeItem('campus_auth_token');
    localStorage.removeItem('campus_user_id'); // Optional: clear user data
    window.location.href = 'login.html';
}

// Run auth check and situational loaders on load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth Page Entry
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

    // 2. Global Actions
    checkAuth();
    initTheme();
    initNotifications();

    // 3. Page Specific Initializations
    if (document.getElementById('totalEventsCount')) {
        loadDashboardStats();
    }
});

/**
 * Universal Skeleton Loader
 * @param {HTMLElement} container - The element to fill with skeletons
 * @param {number} count - How many skeletons to create
 */
function showSkeletons(container, count = 3) {
    if (!container) return;
    const skeletonHTML = Array(count).fill(`
        <div class="list-item" style="pointer-events: none;">
            <div class="skeleton" style="height: 1.5rem; width: 60%; margin-bottom: 1rem;"></div>
            <div class="skeleton" style="height: 0.8rem; width: 40%; margin-bottom: 0.8rem;"></div>
            <div class="skeleton" style="height: 3rem; width: 100%;"></div>
        </div>
    `).join('');
    container.innerHTML = skeletonHTML;
}

/**
 * Stage 1: Dark Mode / Theme System
 */
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('campus_theme') || 'light';
    
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('campus_theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (!icon) return;
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

/**
 * Stage 2: Notification System (Persistence Managed)
 */
let currentNotifications = [];

function initNotifications() {
    const bell = document.getElementById('notifBell');
    const dropdown = document.getElementById('notifDropdown');
    
    if (bell && dropdown) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        document.addEventListener('click', () => dropdown.classList.remove('active'));
    }

    // 1. Initial Load: Only from localStorage
    const cached = localStorage.getItem('campus_notifications');
    if (cached) {
        currentNotifications = JSON.parse(cached);
    } else {
        currentNotifications = [];
    }
    
    renderNotifications();

    // 2. Fetch Fresh Data (Once on mount)
    syncNotificationsWithServer();
}

/**
 * Global Helper to trigger a new notification from any part of the app
 * @param {string} title - The notification message
 * @param {string} icon - FontAwesome icon class (e.g., 'fa-plus-circle')
 * @param {string} customId - Optional custom ID to prevent duplicates during sync
 */
function pushNotification(title, icon = 'fa-info-circle', customId = null) {
    const id = customId || `custom-${Date.now()}`;
    
    // Check if notification already exists to prevent duplicates
    if (currentNotifications.some(n => n.id === id)) return;

    const newNotif = {
        id: id,
        title: title,
        time: 'Just now',
        icon: icon
    };

    // Update state immutably (Newest on top)
    currentNotifications = [newNotif, ...currentNotifications];
    
    // Auto-save and Update UI
    saveAndRender();
    
    console.log(`🔔 Notification Pushed: ${title} (ID: ${id})`);
}

async function syncNotificationsWithServer() {
    try {
        const events = await fetchData('/events');
        const notices = await fetchData('/notices');
        
        // 1. Fetch User Data for Personal Registrations
        let registrations = [];
        const userData = localStorage.getItem('campus_user');
        if (userData) {
            const user = JSON.parse(userData);
            if (user.studentId) {
                registrations = await fetchData(`/registrations/${user.studentId}`);
            }
        }
        
        // Load dismissed history to prevent old data from returning
        const dismissed = JSON.parse(localStorage.getItem('campus_dismissed_notifs') || '[]');
        
        const freshFromServer = [
            ...events.slice(0, 3).map(e => ({ id: `ev-${e.id}`, title: `New Event: ${e.name}`, time: 'Soon', icon: 'fa-calendar-alt' })),
            ...notices.slice(0, 3).map(n => ({ id: `nt-${n.id}`, title: `Notice: ${n.title}`, time: 'Today', icon: 'fa-bullhorn' })),
            ...registrations.map(r => ({ id: `reg-${r.id}`, title: `Registered: ${r.name}`, time: 'Confirmed', icon: 'fa-check-double' }))
        ];

        // FILTER: Only keep notifications that haven't been dismissed AND aren't already in state
        const newItems = freshFromServer.filter(item => {
            const isDismissed = dismissed.includes(item.id);
            const isAlreadyInList = currentNotifications.some(n => n.id === item.id);
            return !isDismissed && !isAlreadyInList;
        });

        if (newItems.length > 0) {
            // Update state without mutating (Add new to top)
            currentNotifications = [...newItems, ...currentNotifications];
            saveAndRender();
        }
    } catch (e) {
        console.error('Notification Sync Error:', e);
    }
}

function renderNotifications() {
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');
    if (!list) return;

    // Badge Updates (Direct Sync)
    if (badge) {
        const count = currentNotifications.length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        badge.style.animation = count > 0 ? 'pulse 2s infinite' : 'none';
    }

    // List Updates
    if (currentNotifications.length === 0) {
        list.innerHTML = `
            <div class="notif-item">
                <div class="notif-content">
                    <p style="text-align: center; color: var(--text-light); padding: 1rem; width: 100%;">No new notifications</p>
                </div>
            </div>`;
    } else {
        list.innerHTML = currentNotifications.map(n => `
            <div class="notif-item">
                <div class="notif-icon"><i class="fas ${n.icon}"></i></div>
                <div class="notif-content">
                    <p>${n.title}</p>
                    <div class="notif-time">${n.time}</div>
                </div>
            </div>
        `).join('');
    }
}

function clearNotifications() {
    // 1. Record current IDs as dismissed so they don't return on refresh
    const dismissed = JSON.parse(localStorage.getItem('campus_dismissed_notifs') || '[]');
    const currentIds = currentNotifications.map(n => n.id);
    const updatedDismissed = [...new Set([...dismissed, ...currentIds])];
    
    // 2. Clear state and cache
    currentNotifications = [];
    localStorage.setItem('campus_dismissed_notifs', JSON.stringify(updatedDismissed));
    localStorage.removeItem('campus_notifications');
    
    // 3. Update UI
    renderNotifications();
    console.log('🧹 Notifications cleared and dismissed');
}

function saveAndRender() {
    localStorage.setItem('campus_notifications', JSON.stringify(currentNotifications));
    renderNotifications();
}

/**
 * Loads dynamic stats for the dashboard
 */
async function loadDashboardStats() {
    console.log('📊 Loading dashboard stats...');
    
    try {
        // 1. Fetch Events & Notices in parallel
        const [events, notices] = await Promise.all([
            fetchData('/events'),
            fetchData('/notices')
        ]);

        // 2. Fetch Registrations for the logged-in user
        let registrations = [];
        const userData = localStorage.getItem('campus_user');
        if (userData) {
            const user = JSON.parse(userData);
            if (user.studentId) {
                registrations = await fetchData(`/registrations/${user.studentId}`);
            }
        }

        // 3. Update DOM with real counts
        const totalEventsElem = document.getElementById('totalEventsCount');
        const regEventsElem = document.getElementById('registeredEventsCount');
        const latestNoticesElem = document.getElementById('latestNoticesCount');

        if (totalEventsElem) totalEventsElem.textContent = events.length || 0;
        if (regEventsElem) regEventsElem.textContent = registrations.length || 0;
        if (latestNoticesElem) latestNoticesElem.textContent = notices.length || 0;

        console.log(`✅ Stats loaded: ${events.length} Events, ${registrations.length} Regs, ${notices.length} Notices`);
    } catch (error) {
        console.error('❌ Failed to load dashboard stats:', error);
    }
}

// Helper function to fetch data
async function fetchData(endpoint) {
    const token = localStorage.getItem('campus_auth_token');
    const headers = { 'Content-Type': 'application/json' };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

// Global Search Functionality (for index.html)
const globalSearchInput = document.getElementById('globalSearch');
const searchResultsContainer = document.getElementById('searchResults');

if (globalSearchInput) {
    let searchTimeout;

    globalSearchInput.addEventListener('input', function (e) {
        const query = e.target.value.toLowerCase().trim();
        
        // 1. Filter Dashboard Cards Immediately (Visual Filtering)
        const dashboardGrid = document.querySelector('.dashboard-grid');
        const cards = document.querySelectorAll('.dashboard-grid .card');
        let visibleCardsCount = 0;

        if (dashboardGrid) {
            cards.forEach(card => {
                const title = card.querySelector('h2').textContent.toLowerCase();
                const desc = card.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(query) || desc.includes(query)) {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeIn 0.4s ease-out';
                    visibleCardsCount++;
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // 2. Perform Deep Search (API) with Debounce
        clearTimeout(searchTimeout);
        if (query.length === 0) {
            if (searchResultsContainer) {
                searchResultsContainer.style.display = 'none';
                searchResultsContainer.innerHTML = '';
            }
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(query, visibleCardsCount);
        }, 300);
    });
}

async function performSearch(query, visibleCardsCount) {
    const results = await fetchData(`/search?q=${encodeURIComponent(query)}`);
    displaySearchResults(results, visibleCardsCount);
}

function displaySearchResults(results, visibleCardsCount) {
    const container = document.getElementById('searchResults');
    if (!container) return;

    const totalApiResults = (results.notices?.length || 0) + (results.events?.length || 0) + (results.faqs?.length || 0);

    // If absolutely nothing found (no cards and no API results)
    if (totalApiResults === 0 && visibleCardsCount === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: 1/-1; padding: 3rem; background: rgba(255, 255, 255, 0.4);">
                <i class="fas fa-search-minus" style="font-size: 3rem; color: var(--secondary-color); margin-bottom: 1rem;"></i>
                <h2>No results found</h2>
                <p>We couldn't find anything matching "${document.getElementById('globalSearch').value}"</p>
                <button class="btn" style="margin-top: 1rem;" onclick="document.getElementById('globalSearch').value=''; document.getElementById('globalSearch').dispatchEvent(new Event('input'))">Clear Search</button>
            </div>`;
        container.style.display = 'block';
        return;
    }

    // If no API results but some cards are visible, just hide the results container
    if (totalApiResults === 0) {
        container.style.display = 'none';
        return;
    }

    let html = `
        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.3);">
            <h2 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-stars" style="color: #f59e0b;"></i> Deep Search Results
            </h2>
            <div class="list-container">`;

    // Display Notices
    if (results.notices && results.notices.length > 0) {
        html += '<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;"><i class="fas fa-bullhorn"></i> Matches in Notices</h3>';
        results.notices.forEach(notice => {
            html += `
                <div class="list-item">
                    <h3>${notice.title}</h3>
                    <div class="meta-info">
                        <span><i class="far fa-calendar"></i> ${new Date(notice.date).toLocaleDateString()}</span>
                    </div>
                    <p>${notice.description}</p>
                </div>
            `;
        });
    }

    // Display Events
    if (results.events && results.events.length > 0) {
        html += '<h3 style="color: var(--primary-color); margin: 1.5rem 0 0.5rem;"><i class="fas fa-calendar-alt"></i> Matches in Events</h3>';
        results.events.forEach(event => {
            html += `
                <div class="list-item">
                    <h3>${event.name}</h3>
                    <div class="meta-info">
                        <span><i class="far fa-calendar"></i> ${new Date(event.date).toLocaleDateString()}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                    </div>
                    <p>${event.description}</p>
                </div>
            `;
        });
    }

    // Display FAQs
    if (results.faqs && results.faqs.length > 0) {
        html += '<h3 style="color: var(--primary-color); margin: 1.5rem 0 0.5rem;"><i class="fas fa-question-circle"></i> Matches in FAQs</h3>';
        results.faqs.forEach(faq => {
            html += `
                <div class="list-item">
                    <h3>${faq.question}</h3>
                    <p>${faq.answer}</p>
                </div>
            `;
        });
    }

    html += '</div></div>';
    container.innerHTML = html;
    container.style.display = 'block';
}
