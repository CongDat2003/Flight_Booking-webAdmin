// ============================================
// TOAST NOTIFICATIONS SYSTEM
// ============================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.add('toast-remove');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Wrapper functions for convenience
function showSuccess(message, duration) { showToast(message, 'success', duration); }
function showError(message, duration) { showToast(message, 'error', duration); }
function showWarning(message, duration) { showToast(message, 'warning', duration); }
function showInfo(message, duration) { showToast(message, 'info', duration); }

// ============================================
// AUTO-REFRESH SYSTEM
// ============================================

let autoRefreshInterval = null;
let autoRefreshEnabled = false;

function toggleAutoRefresh() {
    const toggle = document.getElementById('auto-refresh-toggle');
    autoRefreshEnabled = toggle?.checked || false;
    
    if (autoRefreshEnabled) {
        startAutoRefresh();
        showInfo('Tự động làm mới đã bật (mỗi 30 giây)');
    } else {
        stopAutoRefresh();
        showInfo('Tự động làm mới đã tắt');
    }
}

function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing interval
    autoRefreshInterval = setInterval(() => {
        if (autoRefreshEnabled) {
            refreshCurrentPage();
        }
    }, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

function refreshCurrentPage() {
    switch(currentPage) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'users':
            loadUsers();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'flights':
            if (typeof loadFlights === 'function') loadFlights();
            break;
        case 'airline-revenue':
            loadAirlineRevenue();
            break;
        case 'notifications':
            loadNotifications();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// ============================================
// NOTIFICATIONS MANAGEMENT
// ============================================

let allNotificationsData = [];
let notificationsCurrentPage = 1;
let notificationsPerPage = 25;
let notificationsSearchTerm = '';
let notificationsFilterType = '';
let notificationsFilterStatus = '';
let notificationsSort = 'createdAt-desc';
let notificationsUsersMap = {}; // Cache user info

async function loadNotifications() {
    try {
        showLoading('notifications-page');
        
        // Load all users first to map user IDs to names
        if (Object.keys(notificationsUsersMap).length === 0) {
            const users = await api.getUsers();
            users.forEach(user => {
                notificationsUsersMap[user.userId] = user;
            });
        }
        
        // Get all notifications for all users
        const notifications = await api.getAllNotificationsForAdmin(1, 10000);
        allNotificationsData = notifications.map(notif => ({
            ...notif,
            user: notificationsUsersMap[notif.userId] || { username: 'Unknown', email: '' }
        }));
        
        // Update stats
        updateNotificationsStats(allNotificationsData);
        
        notificationsCurrentPage = 1;
        displayNotifications();
        
        hideLoading('notifications-page');
        showSuccess('Đã tải thông báo thành công');
    } catch (error) {
        console.error('Error loading notifications:', error);
        showError('Lỗi khi tải thông báo: ' + error.message);
        hideLoading('notifications-page');
    }
}

function updateNotificationsStats(notifications) {
    const total = notifications.length;
    const unread = notifications.filter(n => n.status === 'UNREAD').length;
    const booking = notifications.filter(n => n.type === 'BOOKING').length;
    const flight = notifications.filter(n => n.type === 'FLIGHT_UPDATE').length;
    
    document.getElementById('notifications-total').textContent = total;
    document.getElementById('notifications-unread').textContent = unread;
    document.getElementById('notifications-booking').textContent = booking;
    document.getElementById('notifications-flight').textContent = flight;
    
    // Update badge in sidebar
    const badge = document.getElementById('notifications-badge');
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread > 99 ? '99+' : unread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function handleNotificationsSearch(event) {
    if (event.key === 'Enter' || event.target.value === '') {
        notificationsSearchTerm = event.target.value.toLowerCase();
        notificationsCurrentPage = 1;
        displayNotifications();
    }
}

function filterNotifications() {
    notificationsFilterType = document.getElementById('notifications-filter-type').value;
    notificationsFilterStatus = document.getElementById('notifications-filter-status').value;
    notificationsCurrentPage = 1;
    displayNotifications();
}

function sortNotifications() {
    notificationsSort = document.getElementById('notifications-sort').value;
    displayNotifications();
}

function changeNotificationsPerPage() {
    notificationsPerPage = parseInt(document.getElementById('notifications-per-page').value);
    notificationsCurrentPage = 1;
    displayNotifications();
}

function changeNotificationsPage(page) {
    const filtered = getFilteredNotifications();
    const totalPages = Math.ceil(filtered.length / notificationsPerPage);
    
    if (page === 'prev') {
        notificationsCurrentPage = Math.max(1, notificationsCurrentPage - 1);
    } else if (page === 'next') {
        notificationsCurrentPage = Math.min(totalPages, notificationsCurrentPage + 1);
    } else if (page === 1) {
        notificationsCurrentPage = 1;
    } else if (page === 999) {
        notificationsCurrentPage = totalPages;
    }
    
    displayNotifications();
}

function getFilteredNotifications() {
    let filtered = [...allNotificationsData];
    
    // Search
    if (notificationsSearchTerm) {
        filtered = filtered.filter(n => 
            (n.title && n.title.toLowerCase().includes(notificationsSearchTerm)) ||
            (n.message && n.message.toLowerCase().includes(notificationsSearchTerm))
        );
    }
    
    // Filter by type
    if (notificationsFilterType) {
        filtered = filtered.filter(n => n.type === notificationsFilterType);
    }
    
    // Filter by status
    if (notificationsFilterStatus) {
        filtered = filtered.filter(n => n.status === notificationsFilterStatus);
    }
    
    // Sort
    const [field, order] = notificationsSort.split('-');
    filtered.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];
        
        if (field === 'createdAt') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        
        if (order === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    return filtered;
}

function displayNotifications() {
    const filtered = getFilteredNotifications();
    const totalPages = Math.ceil(filtered.length / notificationsPerPage);
    const start = (notificationsCurrentPage - 1) * notificationsPerPage;
    const end = start + notificationsPerPage;
    const pageData = filtered.slice(start, end);
    
    const tbody = document.getElementById('notifications-table-body');
    if (!tbody) return;
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Không có dữ liệu</td></tr>';
        updateNotificationsPagination(totalPages);
        return;
    }
    
    tbody.innerHTML = pageData.map((notif, index) => {
        const user = notif.user || {};
        const typeText = {
            'BOOKING': 'Đặt vé',
            'FLIGHT_UPDATE': 'Cập nhật chuyến bay',
            'PAYMENT': 'Thanh toán',
            'REMINDER': 'Nhắc nhở'
        }[notif.type] || notif.type;
        
        return `
            <tr class="${notif.status === 'UNREAD' ? 'unread-notification' : ''}">
                <td><input type="checkbox" class="notification-checkbox" value="${notif.notificationId}" onchange="updateBulkActionsNotifications()"></td>
                <td><strong>${escapeHtml(notif.title || '')}</strong></td>
                <td>${escapeHtml(notif.message || '').substring(0, 100)}${(notif.message || '').length > 100 ? '...' : ''}</td>
                <td><span class="badge badge-info">${typeText}</span></td>
                <td>
                    <span class="badge ${notif.status === 'UNREAD' ? 'badge-warning' : 'badge-success'}">
                        ${notif.status === 'UNREAD' ? 'Chưa đọc' : 'Đã đọc'}
                    </span>
                </td>
                <td>${escapeHtml(user.username || user.email || 'N/A')}</td>
                <td>${formatDate(notif.createdAt)}</td>
                <td>
                    ${notif.status === 'UNREAD' && notif.userId ? 
                        `<button class="btn btn-sm btn-primary" onclick="markNotificationAsRead(${notif.notificationId}, ${notif.userId})" title="Đánh dấu đã đọc">
                            <i class="fas fa-check"></i>
                        </button>` : ''
                    }
                    ${notif.relatedBookingId ? 
                        `<button class="btn btn-sm btn-info" onclick="viewBooking(${notif.relatedBookingId})" title="Xem đặt vé">
                            <i class="fas fa-ticket-alt"></i>
                        </button>` : ''
                    }
                </td>
            </tr>
        `;
    }).join('');
    
    updateNotificationsPagination(totalPages);
}

function updateNotificationsPagination(totalPages) {
    const pageInfo = document.getElementById('notifications-page-info');
    if (pageInfo) {
        pageInfo.textContent = `Trang ${notificationsCurrentPage} / ${totalPages || 1}`;
    }
    
    // Update button states
    const firstBtn = document.getElementById('notifications-page-first');
    const prevBtn = document.getElementById('notifications-page-prev');
    const nextBtn = document.getElementById('notifications-page-next');
    const lastBtn = document.getElementById('notifications-page-last');
    
    if (firstBtn) firstBtn.disabled = notificationsCurrentPage <= 1;
    if (prevBtn) prevBtn.disabled = notificationsCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = notificationsCurrentPage >= totalPages;
    if (lastBtn) lastBtn.disabled = notificationsCurrentPage >= totalPages;
}

async function markNotificationAsRead(notificationId, userId) {
    try {
        await api.markNotificationAsRead(notificationId, userId);
        showSuccess('Đã đánh dấu đã đọc');
        loadNotifications();
    } catch (error) {
        showError('Lỗi: ' + error.message);
    }
}

async function markAllNotificationsAsRead() {
    const unread = allNotificationsData.filter(n => n.status === 'UNREAD' && n.userId);
    if (unread.length === 0) {
        showInfo('Không có thông báo chưa đọc');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn đánh dấu ${unread.length} thông báo là đã đọc?`)) {
        return;
    }
    
    try {
        let success = 0;
        for (const notif of unread) {
            try {
                await api.markNotificationAsRead(notif.notificationId, notif.userId);
                success++;
            } catch (error) {
                console.error(`Error marking notification ${notif.notificationId}:`, error);
            }
        }
        showSuccess(`Đã đánh dấu ${success}/${unread.length} thông báo là đã đọc`);
        loadNotifications();
    } catch (error) {
        showError('Lỗi: ' + error.message);
    }
}

function refreshNotifications() {
    loadNotifications();
}

function toggleSelectAllNotifications() {
    const selectAll = document.getElementById('notifications-select-all');
    const checkboxes = document.querySelectorAll('.notification-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBulkActionsNotifications();
}

function updateBulkActionsNotifications() {
    const selected = document.querySelectorAll('.notification-checkbox:checked');
    // Could add bulk action buttons here
}

// ============================================
// REPORTS & ANALYTICS
// ============================================

let reportStartDate = null;
let reportEndDate = null;
let reportPeriod = 'month';

async function loadReports() {
    try {
        showLoading('reports-page');
        
        // Load stats first (most important)
        await loadReportStats();
        
        // Load charts
        await loadReportCharts().catch(err => {
            console.error('Error loading charts:', err);
            showWarning('Không thể tải biểu đồ: ' + err.message);
        });
        
        // Load top data for tabs (only if tabs are visible)
        // These will load when user clicks on the tabs
        // But we can preload them in background
        Promise.all([
            loadTopCustomers().catch(err => console.error('Error loading top customers:', err)),
            loadTopRoutes().catch(err => console.error('Error loading top routes:', err)),
            loadTopAirlines().catch(err => console.error('Error loading top airlines:', err))
        ]).catch(err => console.error('Error loading top data:', err));
        
        hideLoading('reports-page');
        showSuccess('Đã tải báo cáo thành công');
    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Lỗi khi tải báo cáo: ' + error.message);
        hideLoading('reports-page');
    }
}

async function loadReportStats() {
    try {
        const [bookings, users, payments] = await Promise.all([
            api.getBookings().catch(() => []),
            api.getUsers().catch(() => []),
            api.getPayments().catch(() => [])
        ]);
        
        // Calculate date range
        const { start, end } = getReportDateRange();
        
        const filteredBookings = bookings.filter(b => {
            if (!b) return false;
            const date = new Date(b.bookingDate || b.createdAt || Date.now());
            return date >= start && date <= end;
        });
        
        const filteredPayments = payments.filter(p => {
            if (!p) return false;
            const date = new Date(p.createdAt || p.paymentDate || Date.now());
            return date >= start && date <= end;
        });
        
        const totalRevenue = filteredPayments
            .filter(p => p.status === 'SUCCESS' || p.status === 'PAID')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        const newUsers = users.filter(u => {
            if (!u || !u.createdAt) return false;
            const date = new Date(u.createdAt);
            return date >= start && date <= end;
        }).length;
        
        const conversionRate = users.length > 0 
            ? ((filteredBookings.length / users.length) * 100).toFixed(1) 
            : (filteredBookings.length > 0 ? '100.0' : '0.0');
        
        // Update DOM elements
        const revenueEl = document.getElementById('report-total-revenue');
        const bookingsEl = document.getElementById('report-total-bookings');
        const usersEl = document.getElementById('report-new-users');
        const conversionEl = document.getElementById('report-conversion-rate');
        
        if (revenueEl) revenueEl.textContent = formatCurrency(totalRevenue);
        if (bookingsEl) bookingsEl.textContent = filteredBookings.length;
        if (usersEl) usersEl.textContent = newUsers;
        if (conversionEl) conversionEl.textContent = conversionRate + '%';
        
        // Calculate and show change percentages (compared to previous period)
        // This would require loading previous period data - simplified for now
        const revenueChangeEl = document.getElementById('report-revenue-change');
        const bookingsChangeEl = document.getElementById('report-bookings-change');
        const usersChangeEl = document.getElementById('report-users-change');
        
        if (revenueChangeEl) revenueChangeEl.textContent = '';
        if (bookingsChangeEl) bookingsChangeEl.textContent = '';
        if (usersChangeEl) usersChangeEl.textContent = '';
    } catch (error) {
        console.error('Error loading report stats:', error);
        showError('Lỗi khi tải thống kê: ' + error.message);
    }
}

function getReportDateRange() {
    const now = new Date();
    let start, end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    switch(reportPeriod) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            const dayOfWeek = now.getDay();
            start = new Date(now);
            start.setDate(now.getDate() - dayOfWeek);
            start.setHours(0, 0, 0, 0);
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            break;
        case 'custom':
            start = reportStartDate ? new Date(reportStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
            end = reportEndDate ? new Date(reportEndDate + 'T23:59:59') : end;
            break;
    }
    
    return { start, end };
}

let reportRevenueChart = null;
let reportBookingsChart = null;

async function loadReportCharts() {
    try {
        const [bookings, payments] = await Promise.all([
            api.getBookings().catch(() => []),
            api.getPayments().catch(() => [])
        ]);
        
        if (!bookings || !Array.isArray(bookings)) {
            console.warn('Bookings data is invalid:', bookings);
            return;
        }
        
        if (!payments || !Array.isArray(payments)) {
            console.warn('Payments data is invalid:', payments);
            return;
        }
        
        const { start, end } = getReportDateRange();
        
        // Filter data by date range
        const filteredBookings = bookings.filter(b => {
            if (!b) return false;
            try {
                const date = new Date(b.bookingDate || b.createdAt || Date.now());
                return date >= start && date <= end;
            } catch (e) {
                console.error('Error parsing booking date:', b, e);
                return false;
            }
        });
        
        const filteredPayments = payments.filter(p => {
            if (!p) return false;
            try {
                const date = new Date(p.createdAt || p.paymentDate || Date.now());
                const validStatus = p.status === 'SUCCESS' || p.status === 'PAID' || p.status === 'COMPLETED';
                return date >= start && date <= end && validStatus;
            } catch (e) {
                console.error('Error parsing payment date:', p, e);
                return false;
            }
        });
        
        // Revenue Chart - Daily revenue
        const revenueData = getDailyRevenueData(filteredPayments, start, end);
        renderRevenueChart(revenueData);
        
        // Bookings Chart - Daily bookings
        const bookingsData = getDailyBookingsData(filteredBookings, start, end);
        renderBookingsChart(bookingsData);
    } catch (error) {
        console.error('Error loading report charts:', error);
        showError('Lỗi khi tải biểu đồ: ' + error.message);
    }
}

function getDailyRevenueData(payments, start, end) {
    try {
        const dailyData = {};
        const current = new Date(start);
        
        // Calculate days difference for appropriate grouping
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        // Initialize all days in range
        while (current <= end) {
            const key = current.toISOString().split('T')[0];
            dailyData[key] = 0;
            current.setDate(current.getDate() + 1);
        }
        
        // Add payment data
        payments.forEach(payment => {
            try {
                const date = new Date(payment.createdAt || payment.paymentDate || Date.now());
                const key = date.toISOString().split('T')[0];
                if (dailyData.hasOwnProperty(key)) {
                    dailyData[key] += parseFloat(payment.amount || 0);
                }
            } catch (e) {
                console.error('Error processing payment:', payment, e);
            }
        });
        
        // If period is longer than 30 days, group by week
        // If longer than 365 days, group by month
        let labels, data;
        if (daysDiff > 365) {
            // Group by month
            const monthlyData = {};
            Object.keys(dailyData).sort().forEach(key => {
                const monthKey = key.substring(0, 7); // YYYY-MM
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = 0;
                }
                monthlyData[monthKey] += dailyData[key];
            });
            labels = Object.keys(monthlyData).sort().map(monthKey => {
                const d = new Date(monthKey + '-01');
                return d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
            });
            data = Object.keys(monthlyData).sort().map(key => monthlyData[key]);
        } else if (daysDiff > 30) {
            // Group by week
            const weeklyData = {};
            Object.keys(dailyData).sort().forEach(key => {
                const date = new Date(key);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const weekKey = weekStart.toISOString().split('T')[0].substring(0, 7) + '-W' + Math.ceil(date.getDate() / 7);
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = 0;
                }
                weeklyData[weekKey] += dailyData[key];
            });
            labels = Object.keys(weeklyData).sort();
            data = Object.keys(weeklyData).sort().map(key => weeklyData[key]);
        } else {
            // Daily
            labels = Object.keys(dailyData).sort().map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            });
            data = Object.keys(dailyData).sort().map(key => dailyData[key]);
        }
        
        return { labels, data };
    } catch (error) {
        console.error('Error in getDailyRevenueData:', error);
        return { labels: [], data: [] };
    }
}

function getDailyBookingsData(bookings, start, end) {
    try {
        const dailyData = {};
        const current = new Date(start);
        
        // Calculate days difference for appropriate grouping
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        // Initialize all days in range
        while (current <= end) {
            const key = current.toISOString().split('T')[0];
            dailyData[key] = 0;
            current.setDate(current.getDate() + 1);
        }
        
        // Add booking data
        bookings.forEach(booking => {
            try {
                const date = new Date(booking.bookingDate || booking.createdAt || Date.now());
                const key = date.toISOString().split('T')[0];
                if (dailyData.hasOwnProperty(key)) {
                    dailyData[key]++;
                }
            } catch (e) {
                console.error('Error processing booking:', booking, e);
            }
        });
        
        // If period is longer than 30 days, group by week
        // If longer than 365 days, group by month
        let labels, data;
        if (daysDiff > 365) {
            // Group by month
            const monthlyData = {};
            Object.keys(dailyData).sort().forEach(key => {
                const monthKey = key.substring(0, 7);
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = 0;
                }
                monthlyData[monthKey] += dailyData[key];
            });
            labels = Object.keys(monthlyData).sort().map(monthKey => {
                const d = new Date(monthKey + '-01');
                return d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
            });
            data = Object.keys(monthlyData).sort().map(key => monthlyData[key]);
        } else if (daysDiff > 30) {
            // Group by week
            const weeklyData = {};
            Object.keys(dailyData).sort().forEach(key => {
                const date = new Date(key);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const weekKey = weekStart.toISOString().split('T')[0].substring(0, 7) + '-W' + Math.ceil(date.getDate() / 7);
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = 0;
                }
                weeklyData[weekKey] += dailyData[key];
            });
            labels = Object.keys(weeklyData).sort();
            data = Object.keys(weeklyData).sort().map(key => weeklyData[key]);
        } else {
            // Daily
            labels = Object.keys(dailyData).sort().map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            });
            data = Object.keys(dailyData).sort().map(key => dailyData[key]);
        }
        
        return { labels, data };
    } catch (error) {
        console.error('Error in getDailyBookingsData:', error);
        return { labels: [], data: [] };
    }
}

function getBookingStatusData(bookings) {
    const statusCounts = {
        'CONFIRMED': 0,
        'PENDING': 0,
        'CANCELLED': 0
    };
    
    bookings.forEach(booking => {
        const status = booking.bookingStatus || 'PENDING';
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
    });
    
    return {
        labels: ['Đã xác nhận', 'Chờ xử lý', 'Đã hủy'],
        data: [statusCounts.CONFIRMED, statusCounts.PENDING, statusCounts.CANCELLED],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
    };
}

function renderRevenueChart(revenueData) {
    const canvas = document.getElementById('reportRevenueChart');
    if (!canvas) {
        console.warn('reportRevenueChart canvas not found');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        canvas.parentElement.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Chart.js chưa được tải. Vui lòng reload trang.</p>';
        return;
    }
    
    // Destroy existing chart if any
    if (reportRevenueChart) {
        reportRevenueChart.destroy();
        reportRevenueChart = null;
    }
    
    // Ensure we have data
    if (!revenueData || !revenueData.labels || revenueData.labels.length === 0 ||
        (revenueData.data && revenueData.data.every(val => val === 0))) {
        // Create a simple empty chart with message
        const ctx = canvas.getContext('2d');
        reportRevenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Chưa có dữ liệu'],
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: [0],
                    borderColor: '#e0e0e0',
                    backgroundColor: 'rgba(224, 224, 224, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    reportRevenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: revenueData.labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: revenueData.data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Doanh thu: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) {
                                return (value / 1000000).toFixed(1) + 'M';
                            } else if (value >= 1000) {
                                return (value / 1000).toFixed(0) + 'K';
                            }
                            return value;
                        }
                    }
                }
            }
        }
    });
}

function renderBookingsChart(bookingsData) {
    const canvas = document.getElementById('reportBookingsChart');
    if (!canvas) {
        console.warn('reportBookingsChart canvas not found');
        return;
    }
    
    // Destroy existing chart if any
    if (reportBookingsChart) {
        reportBookingsChart.destroy();
        reportBookingsChart = null;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        canvas.parentElement.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Chart.js chưa được tải. Vui lòng reload trang.</p>';
        return;
    }
    
    // Ensure we have data
    if (!bookingsData || !bookingsData.labels || bookingsData.labels.length === 0 ||
        (bookingsData.data && bookingsData.data.every(val => val === 0))) {
        // Create a simple empty chart with message
        const ctx = canvas.getContext('2d');
        reportBookingsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Chưa có dữ liệu'],
                datasets: [{
                    label: 'Số đặt vé',
                    data: [0],
                    backgroundColor: '#e0e0e0',
                    borderColor: '#e0e0e0',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    reportBookingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: bookingsData.labels,
            datasets: [{
                label: 'Số đặt vé',
                data: bookingsData.data,
                backgroundColor: '#4facfe',
                borderColor: '#4facfe',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Số đặt vé: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

async function loadTopCustomers() {
    try {
        const [bookings, users] = await Promise.all([
            api.getBookings().catch(() => []),
            api.getUsers().catch(() => [])
        ]);
        
        if (!Array.isArray(bookings) || !Array.isArray(users)) {
            console.warn('Invalid data format:', { bookings, users });
            return;
        }
        
        // Filter by date range
        const { start, end } = getReportDateRange();
        const filteredBookings = bookings.filter(b => {
            if (!b) return false;
            try {
                const date = new Date(b.bookingDate || b.createdAt || Date.now());
                return date >= start && date <= end;
            } catch (e) {
                return false;
            }
        });
        
        // Group by user and calculate totals
        const customerStats = {};
        filteredBookings.forEach(booking => {
            const userId = booking.userId || booking.user?.userId;
            if (!userId) return;
            
            if (!customerStats[userId]) {
                const user = users.find(u => (u.userId || u.id) === userId);
                customerStats[userId] = { bookings: 0, total: 0, user: user };
            }
            customerStats[userId].bookings++;
            customerStats[userId].total += parseFloat(booking.totalAmount || 0);
        });
        
        const topCustomers = Object.values(customerStats)
            .filter(stat => stat.user) // Only include customers that exist
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
        
        const tbody = document.getElementById('report-customers-body');
        if (tbody) {
            if (topCustomers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Chưa có dữ liệu trong kỳ này</td></tr>';
            } else {
                tbody.innerHTML = topCustomers.map((stat, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(stat.user?.username || stat.user?.fullName || stat.user?.email || 'N/A')}</td>
                        <td>${stat.bookings}</td>
                        <td>${typeof formatCurrency !== 'undefined' ? formatCurrency(stat.total) : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stat.total || 0)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading top customers:', error);
        showError('Lỗi khi tải Top Khách hàng: ' + error.message);
        const tbody = document.getElementById('report-customers-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Lỗi khi tải dữ liệu</td></tr>';
        }
    }
}

async function loadTopRoutes() {
    try {
        const [flights, bookings] = await Promise.all([
            api.getAllFlights().catch(() => []),
            api.getBookings().catch(() => [])
        ]);
        
        if (!Array.isArray(flights) || !Array.isArray(bookings)) {
            console.warn('Invalid data format:', { flights, bookings });
            return;
        }
        
        // Filter by date range
        const { start, end } = getReportDateRange();
        const filteredBookings = bookings.filter(b => {
            if (!b) return false;
            try {
                const date = new Date(b.bookingDate || b.createdAt || Date.now());
                return date >= start && date <= end;
            } catch (e) {
                return false;
            }
        });
        
        // Group by route
        const routeStats = {};
        filteredBookings.forEach(booking => {
            const flightId = booking.flightId || booking.flight?.flightId;
            if (!flightId) return;
            
            const flight = flights.find(f => (f.flightId || f.id) === flightId);
            if (flight) {
                const departure = flight.departureAirport || flight.departureAirportCode || flight.departureAirportName || 'N/A';
                const arrival = flight.arrivalAirport || flight.arrivalAirportCode || flight.arrivalAirportName || 'N/A';
                const route = `${departure} → ${arrival}`;
                if (!routeStats[route]) {
                    routeStats[route] = { flights: new Set(), bookings: 0 };
                }
                routeStats[route].flights.add(flight.flightId || flight.id);
                routeStats[route].bookings++;
            }
        });
        
        const topRoutes = Object.entries(routeStats)
            .map(([route, stats]) => ({ route, flights: stats.flights.size, bookings: stats.bookings }))
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 10);
        
        const tbody = document.getElementById('report-routes-body');
        if (tbody) {
            if (topRoutes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Chưa có dữ liệu trong kỳ này</td></tr>';
            } else {
                tbody.innerHTML = topRoutes.map((stat, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(stat.route)}</td>
                        <td>${stat.flights}</td>
                        <td>${stat.bookings}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading top routes:', error);
        showError('Lỗi khi tải Top Tuyến đường: ' + error.message);
        const tbody = document.getElementById('report-routes-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Lỗi khi tải dữ liệu</td></tr>';
        }
    }
}

async function loadTopAirlines() {
    try {
        const [flights, bookings] = await Promise.all([
            api.getAllFlights().catch(() => []),
            api.getBookings().catch(() => [])
        ]);
        
        if (!Array.isArray(flights) || !Array.isArray(bookings)) {
            console.warn('Invalid data format:', { flights, bookings });
            return;
        }
        
        // Filter by date range
        const { start, end } = getReportDateRange();
        const filteredBookings = bookings.filter(b => {
            if (!b) return false;
            try {
                const date = new Date(b.bookingDate || b.createdAt || Date.now());
                return date >= start && date <= end;
            } catch (e) {
                return false;
            }
        });
        
        // Group by airline
        const airlineStats = {};
        filteredBookings.forEach(booking => {
            const flightId = booking.flightId || booking.flight?.flightId;
            if (!flightId) return;
            
            const flight = flights.find(f => (f.flightId || f.id) === flightId);
            if (flight) {
                const airlineName = flight.airlineName || flight.airline?.airlineName || 
                                   (flight.airline && typeof flight.airline === 'object' ? flight.airline.name : null) || 
                                   'Unknown';
                if (!airlineStats[airlineName]) {
                    airlineStats[airlineName] = { flights: new Set(), revenue: 0 };
                }
                airlineStats[airlineName].flights.add(flight.flightId || flight.id);
                airlineStats[airlineName].revenue += parseFloat(booking.totalAmount || 0);
            }
        });
        
        const topAirlines = Object.entries(airlineStats)
            .map(([airline, stats]) => ({ airline, flights: stats.flights.size, revenue: stats.revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        
        const tbody = document.getElementById('report-airlines-body');
        if (tbody) {
            if (topAirlines.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Chưa có dữ liệu trong kỳ này</td></tr>';
            } else {
                tbody.innerHTML = topAirlines.map((stat, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(stat.airline)}</td>
                        <td>${stat.flights}</td>
                        <td>${typeof formatCurrency !== 'undefined' ? formatCurrency(stat.revenue) : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stat.revenue || 0)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading top airlines:', error);
        showError('Lỗi khi tải Top Hãng bay: ' + error.message);
        const tbody = document.getElementById('report-airlines-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Lỗi khi tải dữ liệu</td></tr>';
        }
    }
}

function changeReportPeriod() {
    const period = document.getElementById('report-period').value;
    reportPeriod = period;
    
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    const separator = document.getElementById('report-date-separator');
    
    if (period === 'custom') {
        startDateInput.style.display = 'inline-block';
        endDateInput.style.display = 'inline-block';
        separator.style.display = 'inline';
    } else {
        startDateInput.style.display = 'none';
        endDateInput.style.display = 'none';
        separator.style.display = 'none';
    }
}

function applyReportFilter() {
    if (reportPeriod === 'custom') {
        const startDateInput = document.getElementById('report-start-date');
        const endDateInput = document.getElementById('report-end-date');
        reportStartDate = startDateInput ? startDateInput.value : null;
        reportEndDate = endDateInput ? endDateInput.value : null;
        
        if (!reportStartDate || !reportEndDate) {
            showWarning('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc');
            return;
        }
    }
    loadReports();
}

function switchReportTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.report-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.report-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const content = document.getElementById(`report-${tab}`);
    if (content) {
        content.style.display = 'block';
        
        // Load data for the tab if not loaded yet
        if (tab === 'customers') {
            const tbody = document.getElementById('report-customers-body');
            if (tbody && (!tbody.innerHTML || tbody.innerHTML.includes('Chưa có dữ liệu'))) {
                loadTopCustomers();
            }
        } else if (tab === 'routes') {
            const tbody = document.getElementById('report-routes-body');
            if (tbody && (!tbody.innerHTML || tbody.innerHTML.includes('Chưa có dữ liệu'))) {
                loadTopRoutes();
            }
        } else if (tab === 'airlines') {
            const tbody = document.getElementById('report-airlines-body');
            if (tbody && (!tbody.innerHTML || tbody.innerHTML.includes('Chưa có dữ liệu'))) {
                loadTopAirlines();
            }
        }
    }
    
    // Activate button
    const button = document.querySelector(`[data-tab="${tab}"]`);
    if (button) {
        button.classList.add('active');
    }
}

function refreshReports() {
    loadReports();
}

function exportReport() {
    showInfo('Tính năng xuất Excel đang được phát triển');
    // TODO: Implement Excel export using SheetJS or similar library
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

// Update loadDashboard to show notification badge
const originalLoadDashboard = loadDashboard;
loadDashboard = async function() {
    await originalLoadDashboard();
    // Update notification badge
    try {
        const users = await api.getUsers();
        let totalUnread = 0;
        for (const user of users) {
            try {
                const count = await api.getUnreadCount(user.userId);
                totalUnread += count;
            } catch (error) {
                console.error(`Error getting unread count for user ${user.userId}:`, error);
            }
        }
        const badge = document.getElementById('notifications-badge');
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating notification badge:', error);
    }
};

// ============================================
// BULK OPERATIONS
// ============================================

// Bulk operations for Bookings
function toggleSelectAllBookings() {
    const selectAll = document.getElementById('bookings-select-all');
    const checkboxes = document.querySelectorAll('.booking-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll?.checked || false);
    updateBulkActionsBookings();
}

function updateBulkActionsBookings() {
    const selected = document.querySelectorAll('.booking-checkbox:checked');
    const bulkBar = document.getElementById('bookings-bulk-actions');
    if (bulkBar) {
        if (selected.length > 0) {
            bulkBar.classList.remove('hidden');
            bulkBar.querySelector('.selected-count').textContent = selected.length;
        } else {
            bulkBar.classList.add('hidden');
        }
    }
}

async function bulkDeleteBookings() {
    const selected = Array.from(document.querySelectorAll('.booking-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selected.length === 0) {
        showWarning('Vui lòng chọn ít nhất một bản ghi');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${selected.length} đặt vé đã chọn?`)) {
        return;
    }
    
    try {
        let success = 0;
        for (const id of selected) {
            try {
                await api.deleteBooking(id);
                success++;
            } catch (error) {
                console.error(`Error deleting booking ${id}:`, error);
            }
        }
        showSuccess(`Đã xóa ${success}/${selected.length} đặt vé`);
        loadBookings();
    } catch (error) {
        showError('Lỗi: ' + error.message);
    }
}

async function bulkUpdateBookingStatus(status) {
    const selected = Array.from(document.querySelectorAll('.booking-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selected.length === 0) {
        showWarning('Vui lòng chọn ít nhất một bản ghi');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn cập nhật trạng thái ${selected.length} đặt vé thành "${getStatusText(status)}"?`)) {
        return;
    }
    
    try {
        let success = 0;
        for (const id of selected) {
            try {
                await api.updateBookingStatus(id, status);
                success++;
            } catch (error) {
                console.error(`Error updating booking ${id}:`, error);
            }
        }
        showSuccess(`Đã cập nhật ${success}/${selected.length} đặt vé`);
        loadBookings();
    } catch (error) {
        showError('Lỗi: ' + error.message);
    }
}

// Bulk operations for Users
function toggleSelectAllUsers() {
    const selectAll = document.getElementById('users-select-all');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll?.checked || false);
    updateBulkActionsUsers();
}

function updateBulkActionsUsers() {
    const selected = document.querySelectorAll('.user-checkbox:checked');
    const bulkBar = document.getElementById('users-bulk-actions');
    if (bulkBar) {
        if (selected.length > 0) {
            bulkBar.classList.remove('hidden');
            bulkBar.querySelector('.selected-count').textContent = selected.length;
        } else {
            bulkBar.classList.add('hidden');
        }
    }
}

async function bulkDeleteUsers() {
    const selected = Array.from(document.querySelectorAll('.user-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selected.length === 0) {
        showWarning('Vui lòng chọn ít nhất một bản ghi');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${selected.length} khách hàng đã chọn?`)) {
        return;
    }
    
    try {
        let success = 0;
        for (const id of selected) {
            try {
                await api.deleteUser(id);
                success++;
            } catch (error) {
                console.error(`Error deleting user ${id}:`, error);
            }
        }
        showSuccess(`Đã xóa ${success}/${selected.length} khách hàng`);
        loadUsers();
    } catch (error) {
        showError('Lỗi: ' + error.message);
    }
}

// Bulk operations for Payments
function toggleSelectAllPayments() {
    const selectAll = document.getElementById('payments-select-all');
    const checkboxes = document.querySelectorAll('.payment-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll?.checked || false);
    updateBulkActionsPayments();
}

function updateBulkActionsPayments() {
    const selected = document.querySelectorAll('.payment-checkbox:checked');
    const bulkBar = document.getElementById('payments-bulk-actions');
    if (bulkBar) {
        if (selected.length > 0) {
            bulkBar.classList.remove('hidden');
            bulkBar.querySelector('.selected-count').textContent = selected.length;
        } else {
            bulkBar.classList.add('hidden');
        }
    }
}

async function bulkDeletePayments() {
    const selected = Array.from(document.querySelectorAll('.payment-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selected.length === 0) {
        showWarning('Vui lòng chọn ít nhất một bản ghi');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${selected.length} thanh toán đã chọn?`)) {
        return;
    }
    
    try {
        let success = 0;
        for (const id of selected) {
            try {
                await api.deletePayment(id);
                success++;
            } catch (error) {
                console.error(`Error deleting payment ${id}:`, error);
            }
        }
        showSuccess(`Đã xóa ${success}/${selected.length} thanh toán`);
        loadPayments();
    } catch (error) {
        showError('Lỗi: ' + error.message);
    }
}

