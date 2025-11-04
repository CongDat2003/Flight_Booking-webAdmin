// Admin Panel JavaScript
let currentPage = 'dashboard';
let revenueChart = null;
let paymentMethodChart = null;
let bookingStatusChart = null;
let newUsersChart = null;
let cancellationRateChart = null;
let airlineChart = null;
let deleteCallback = null;
let currentEditId = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

function initializeAdminPanel() {
    // Setup sidebar navigation
    setupSidebarNavigation();
    
    // Setup modals
    setupModals();
    
    // Setup form handlers
    setupFormHandlers();
    
    // Load initial page
    loadPage('dashboard');
}

// Sidebar Navigation
function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            loadPage(page);
        });
    });
}

// Load Page
function loadPage(page) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Update page title
    const titles = {
        'dashboard': 'Tổng quan',
        'bookings': 'Quản lý đặt vé',
        'users': 'Quản lý khách hàng',
        'payments': 'Quản lý thanh toán',
        'flights': 'Quản lý chuyến bay',
        'airline-revenue': 'Doanh thu hãng bay',
        'customer-support': 'Hỗ trợ khách hàng',
        'notifications': 'Quản lý thông báo',
        'reports': 'Báo cáo & Phân tích'
    };
    document.getElementById('page-title').textContent = titles[page];
    
    currentPage = page;
    
    // Load page data
    switch(page) {
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
            // function provided by flights.js
            if (typeof loadFlights === 'function') {
                loadFlights();
            }
            break;
        case 'airline-revenue':
            loadAirlineRevenue();
            break;
        case 'customer-support':
            loadChatConversations();
            setupChatAutoRefresh();
            break;
        case 'notifications':
            loadNotifications();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        showLoading('dashboard-page');
        
        // Initialize revenue filter dates
        if (!revenueStartDate) {
            updateRevenueDateInputs();
        }
        
        // Load stats
        const [bookings, users, payments] = await Promise.all([
            api.getBookings(),
            api.getUsers(),
            api.getPayments()
        ]);
        
        // Update stats
        updateDashboardStats(bookings, users, payments);
        
        // Load charts
        await loadCharts(bookings, payments);
        
        hideLoading('dashboard-page');
        
        } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('dashboard-page', 'Lỗi khi tải dashboard');
        hideLoading('dashboard-page');
    }
}

// ================= Airline Revenue =================
let airlineRevenueData = [];
let airlineRevenueCurrentPage = 1;
let airlineRevenuePerPage = 25;
let airlineRevenueSearchTerm = '';
let airlineRevenueSort = 'revenue-desc';

async function loadAirlineRevenue() {
    try {
        showLoading('airline-revenue-page');
        const stats = await api.dashboard.getAirlineStats();
        airlineRevenueData = stats || [];
        
        // Update stats
        updateAirlineRevenueStats(airlineRevenueData || []);
        
        airlineRevenueCurrentPage = 1;
        displayAirlineRevenue();
        hideLoading('airline-revenue-page');
    } catch (error) {
        console.error('Error loading airline revenue:', error);
        showError('airline-revenue-page', 'Lỗi khi tải doanh thu hãng bay');
        hideLoading('airline-revenue-page');
    }
}

function updateAirlineRevenueStats(airlineData) {
    const totalAirlines = airlineData.length;
    const totalRevenue = airlineData.reduce((sum, a) => sum + parseFloat(a.revenue || 0), 0);
    const totalBookings = airlineData.reduce((sum, a) => sum + parseFloat(a.totalBookings || 0), 0);
    const avgRevenue = totalAirlines > 0 ? totalRevenue / totalAirlines : 0;
    
    document.getElementById('airline-revenue-total-airlines').textContent = totalAirlines;
    document.getElementById('airline-revenue-total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('airline-revenue-total-bookings').textContent = totalBookings;
    document.getElementById('airline-revenue-avg-revenue').textContent = formatCurrency(avgRevenue);
}

function handleAirlineRevenueSearch(event) {
    if (event.key === 'Enter' || event.target.value === '') {
        airlineRevenueSearchTerm = event.target.value.toLowerCase();
        airlineRevenueCurrentPage = 1;
        displayAirlineRevenue();
    }
}

function sortAirlineRevenue() {
    airlineRevenueSort = document.getElementById('airline-revenue-sort').value;
    displayAirlineRevenue();
}

function changeAirlineRevenuePerPage() {
    airlineRevenuePerPage = parseInt(document.getElementById('airline-revenue-per-page').value);
    airlineRevenueCurrentPage = 1;
    displayAirlineRevenue();
}

function changeAirlineRevenuePage(page) {
    let totalPages = Math.ceil(getFilteredAirlineRevenue().length / airlineRevenuePerPage);
    if (page === 'prev') {
        airlineRevenueCurrentPage = Math.max(1, airlineRevenueCurrentPage - 1);
    } else if (page === 'next') {
        airlineRevenueCurrentPage = Math.min(totalPages, airlineRevenueCurrentPage + 1);
    } else if (page === 1) {
        airlineRevenueCurrentPage = 1;
    } else if (page === 999) {
        airlineRevenueCurrentPage = totalPages;
    }
    displayAirlineRevenue();
}

function getFilteredAirlineRevenue() {
    let filtered = airlineRevenueData.filter(item => {
        if (airlineRevenueSearchTerm && !(item.airlineName?.toLowerCase().includes(airlineRevenueSearchTerm))) {
            return false;
        }
        return true;
    });

    const [sortField, sortOrder] = airlineRevenueSort.split('-');
    filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === 'airlineName') {
            aVal = (aVal || '').toLowerCase();
            bVal = (bVal || '').toLowerCase();
        } else {
            aVal = Number(aVal || 0);
            bVal = Number(bVal || 0);
        }

        if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });

    return filtered;
}

function displayAirlineRevenue() {
    const tbody = document.getElementById('airline-revenue-table-body');
    if (!tbody) return;

    if (!airlineRevenueData || airlineRevenueData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-coins"></i><h3>Chưa có dữ liệu</h3></td></tr>';
        return;
    }

    const filtered = getFilteredAirlineRevenue();
    const start = (airlineRevenueCurrentPage - 1) * airlineRevenuePerPage;
    const end = start + airlineRevenuePerPage;
    const paginated = filtered.slice(start, end);

    tbody.innerHTML = paginated.map(item => `
        <tr>
            <td>${item.airlineName}</td>
            <td>${item.totalBookings || 0}</td>
            <td>${item.paidBookings || 0}</td>
            <td>${formatCurrency(item.revenue || 0)}</td>
        </tr>
    `).join('');

    const totalPages = Math.max(1, Math.ceil(filtered.length / airlineRevenuePerPage));
    document.getElementById('airline-revenue-page-info').textContent = `Trang ${airlineRevenueCurrentPage} / ${totalPages}`;
    document.getElementById('airline-revenue-page-prev').disabled = airlineRevenueCurrentPage === 1;
    document.getElementById('airline-revenue-page-next').disabled = airlineRevenueCurrentPage >= totalPages || totalPages === 0;
    document.getElementById('airline-revenue-page-first').disabled = airlineRevenueCurrentPage === 1;
    document.getElementById('airline-revenue-page-last').disabled = airlineRevenueCurrentPage >= totalPages || totalPages === 0;
}

function updateDashboardStats(bookings, users, payments) {
    // Total bookings
    document.getElementById('total-bookings').textContent = bookings.length || 0;
    
    // Total users
    document.getElementById('total-users').textContent = users.length || 0;
    
    // Total revenue (authoritative: bookings with PaymentStatus = PAID)
    const totalRevenue = (bookings || [])
        .filter(b => b.paymentStatus === 'PAID')
        .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0);
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
    
    // Success rate
    const successPayments = payments.filter(p => p.status === 'SUCCESS' || p.status === 'PAID').length;
    const successRate = payments.length > 0 ? (successPayments / payments.length * 100).toFixed(1) : 0;
    document.getElementById('success-rate').textContent = successRate + '%';
}

async function loadCharts(bookings, payments) {
    try {
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart');
        if (!revenueCtx) {
            console.error('Element revenueChart not found');
            return;
        }
        
        if (revenueChart) revenueChart.destroy();
        
        const monthlyRevenue = getMonthlyRevenueFromBookings(bookings);
        
        // Update chart title
        const titleMap = {
            'day': 'Doanh thu theo ngày',
            'week': 'Doanh thu theo tuần',
            'month': 'Doanh thu theo tháng',
            'year': 'Doanh thu theo năm'
        };
        const titleEl = document.getElementById('revenue-chart-title');
        if (titleEl) {
            titleEl.textContent = titleMap[revenueTimeFilter] || 'Doanh thu theo tháng';
        }
        
        revenueChart = new Chart(revenueCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: monthlyRevenue.labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: monthlyRevenue.data.length > 0 ? monthlyRevenue.data : [0],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
    
    // Payment Method Chart
    const paymentCanvas = document.getElementById('paymentMethodChart');
    if (paymentMethodChart) paymentMethodChart.destroy();
    if (!paymentCanvas) return;
    const paymentCtx = paymentCanvas.getContext('2d');
    const paymentMethods = getPaymentMethodStats(payments);
    paymentMethodChart = new Chart(paymentCtx, {
        type: 'doughnut',
        data: {
            labels: paymentMethods.labels,
            datasets: [{
                data: paymentMethods.data,
                backgroundColor: [
                    '#667eea',
                    '#f093fb',
                    '#4facfe',
                    '#43e97b'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Booking Status Chart
    const bookingStatusCanvas = document.getElementById('bookingStatusChart');
    if (bookingStatusChart) bookingStatusChart.destroy();
    if (!bookingStatusCanvas) return;
    const bookingStatusCtx = bookingStatusCanvas.getContext('2d');
    const bookingStatusData = getBookingStatusStats(bookings);
    bookingStatusChart = new Chart(bookingStatusCtx, {
        type: 'pie',
        data: {
            labels: bookingStatusData.labels,
            datasets: [{
                data: bookingStatusData.data,
                backgroundColor: [
                    '#28a745',
                    '#ffc107',
                    '#dc3545',
                    '#17a2b8'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // New Users Chart
    const newUsersCanvas = document.getElementById('newUsersChart');
    if (newUsersChart) newUsersChart.destroy();
    if (!newUsersCanvas) return;
    const newUsersCtx = newUsersCanvas.getContext('2d');
    const newUsersData = getNewUsersStats(bookings);
    newUsersChart = new Chart(newUsersCtx, {
        type: 'bar',
        data: {
            labels: newUsersData.labels,
            datasets: [{
                label: 'Khách hàng mới',
                data: newUsersData.data,
                backgroundColor: '#4facfe',
                borderColor: '#4facfe',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Cancellation Rate Chart
    const cancellationCanvas = document.getElementById('cancellationRateChart');
    if (cancellationRateChart) cancellationRateChart.destroy();
    if (!cancellationCanvas) return;
    const cancellationCtx = cancellationCanvas.getContext('2d');
    const cancellationData = getCancellationRateStats(bookings);
    cancellationRateChart = new Chart(cancellationCtx, {
        type: 'doughnut',
        data: {
            labels: ['Thành công', 'Hủy vé'],
            datasets: [{
                data: [cancellationData.success, cancellationData.cancelled],
                backgroundColor: ['#28a745', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Airline Chart
    const airlineCanvas = document.getElementById('airlineChart');
    if (airlineChart) airlineChart.destroy();
    if (!airlineCanvas) return;
    const airlineCtx = airlineCanvas.getContext('2d');
    const airlineData = getAirlineStats(bookings);
    airlineChart = new Chart(airlineCtx, {
        type: 'bar',
        data: {
            labels: airlineData.labels,
            datasets: [{
                label: 'Số chuyến bay',
                data: airlineData.data,
                backgroundColor: '#43e97b',
                borderColor: '#43e97b',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    } catch (error) {
        console.error('Error loading charts:', error);
        // Hiển thị thông báo lỗi cho từng chart
        const chartElements = ['revenueChart', 'paymentMethodChart', 'bookingStatusChart', 'newUsersChart', 'cancellationRateChart', 'airlineChart'];
        chartElements.forEach(chartId => {
            const element = document.getElementById(chartId);
            if (element) {
                element.innerHTML = '<div class="chart-error"><i class="fas fa-exclamation-triangle"></i><p>Lỗi tải biểu đồ</p></div>';
            }
        });
    }
}

let revenueTimeFilter = 'month';
let revenueStartDate = null;
let revenueEndDate = null;

function changeRevenueTimeFilter() {
    revenueTimeFilter = document.getElementById('revenue-time-filter').value;
    updateRevenueDateInputs();
}

function updateRevenueDateInputs() {
    const startDateEl = document.getElementById('revenue-start-date');
    const endDateEl = document.getElementById('revenue-end-date');
    const today = new Date();
    
    if (!startDateEl || !endDateEl) return;
    
    switch(revenueTimeFilter) {
        case 'day':
            startDateEl.type = 'date';
            endDateEl.type = 'date';
            startDateEl.value = formatDateInput(today);
            endDateEl.value = formatDateInput(today);
            break;
        case 'week':
            startDateEl.type = 'week';
            endDateEl.type = 'week';
            const week = getWeekNumber(today);
            startDateEl.value = `${today.getFullYear()}-W${week}`;
            endDateEl.value = `${today.getFullYear()}-W${week}`;
            break;
        case 'month':
            startDateEl.type = 'month';
            endDateEl.type = 'month';
            startDateEl.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            endDateEl.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            break;
        case 'year':
            startDateEl.type = 'number';
            endDateEl.type = 'number';
            startDateEl.value = today.getFullYear();
            endDateEl.value = today.getFullYear();
            break;
    }
}

function formatDateInput(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function applyRevenueFilter() {
    revenueStartDate = document.getElementById('revenue-start-date').value;
    revenueEndDate = document.getElementById('revenue-end-date').value;
    
    // Reload charts with filter
    loadDashboard();
}

function getMonthlyRevenueFromBookings(bookings) {
    let filteredBookings = bookings || [];
    
    // Apply date filter if set
    if (revenueStartDate && revenueEndDate) {
        const start = new Date(revenueStartDate);
        const end = new Date(revenueEndDate);
        
        if (revenueTimeFilter === 'year') {
            start.setFullYear(parseInt(revenueStartDate));
            start.setMonth(0, 1);
            end.setFullYear(parseInt(revenueEndDate));
            end.setMonth(11, 31);
        } else if (revenueTimeFilter === 'month') {
            const [year, month] = revenueStartDate.split('-').map(Number);
            start.setFullYear(year, month - 1, 1);
            end.setFullYear(year, month - 1, 31);
        } else if (revenueTimeFilter === 'week') {
            // Parse week format YYYY-Www
            const [year, week] = revenueStartDate.match(/(\d{4})-W(\d{2})/).slice(1).map(Number);
            start.setFullYear(year, 0, 1);
            const daysToAdd = (week - 1) * 7;
            start.setDate(start.getDate() + daysToAdd);
            end.setTime(start.getTime());
            end.setDate(end.getDate() + 6);
        }
        
        end.setHours(23, 59, 59, 999);
        
        filteredBookings = filteredBookings.filter(b => {
            if (!b.bookingDate) return false;
            const bookingDate = new Date(b.bookingDate);
            return bookingDate >= start && bookingDate <= end;
        });
    }
    
    const data = {};
    const currentDate = new Date();
    
    // Group by time period
    if (revenueTimeFilter === 'day') {
        // Daily data
        filteredBookings
            .filter(b => b.paymentStatus === 'PAID' && b.bookingDate)
            .forEach(booking => {
                const date = new Date(booking.bookingDate);
                const key = date.toISOString().substring(0, 10);
                data[key] = (data[key] || 0) + parseFloat(booking.totalAmount || 0);
            });
    } else if (revenueTimeFilter === 'week') {
        // Weekly data
        filteredBookings
            .filter(b => b.paymentStatus === 'PAID' && b.bookingDate)
            .forEach(booking => {
                const date = new Date(booking.bookingDate);
                const week = getWeekNumber(date);
                const key = `${date.getFullYear()}-W${week}`;
                data[key] = (data[key] || 0) + parseFloat(booking.totalAmount || 0);
            });
    } else if (revenueTimeFilter === 'month') {
        // Monthly data
        filteredBookings
            .filter(b => b.paymentStatus === 'PAID' && b.bookingDate)
            .forEach(booking => {
                const date = new Date(booking.bookingDate);
                const key = date.toISOString().substring(0, 7);
                data[key] = (data[key] || 0) + parseFloat(booking.totalAmount || 0);
            });
    } else if (revenueTimeFilter === 'year') {
        // Yearly data
        filteredBookings
            .filter(b => b.paymentStatus === 'PAID' && b.bookingDate)
            .forEach(booking => {
                const date = new Date(booking.bookingDate);
                const key = date.getFullYear().toString();
                data[key] = (data[key] || 0) + parseFloat(booking.totalAmount || 0);
            });
    }
    
    // Sort keys and format labels
    const sortedKeys = Object.keys(data).sort();
    const labels = sortedKeys.map(key => {
        if (revenueTimeFilter === 'day') {
            return new Date(key).toLocaleDateString('vi-VN');
        } else if (revenueTimeFilter === 'week') {
            return key;
        } else if (revenueTimeFilter === 'month') {
            const date = new Date(key + '-01');
            return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
        } else {
            return key;
        }
    });
    
    return {
        labels: labels.length > 0 ? labels : ['Chưa có dữ liệu'],
        data: sortedKeys.map(key => data[key])
    };
}

function getPaymentMethodStats(payments) {
    const methods = {};
    payments.forEach(payment => {
        const method = payment.paymentMethod || 'UNKNOWN';
        methods[method] = (methods[method] || 0) + 1;
    });
    
    // Nếu không có dữ liệu, trả về dữ liệu mẫu
    if (Object.keys(methods).length === 0) {
        return {
            labels: ['Chưa có dữ liệu'],
            data: [1]
        };
    }
    
    return {
        labels: Object.keys(methods),
        data: Object.values(methods)
    };
}

function getBookingStatusStats(bookings) {
    const statuses = {};
    bookings.forEach(booking => {
        const status = booking.bookingStatus || 'UNKNOWN';
        statuses[status] = (statuses[status] || 0) + 1;
    });
    
    const statusMap = {
        'CONFIRMED': 'Đã xác nhận',
        'PENDING': 'Chờ xử lý',
        'CANCELLED': 'Đã hủy',
        'UNKNOWN': 'Không xác định'
    };
    
    // Nếu không có dữ liệu, trả về dữ liệu mẫu
    if (Object.keys(statuses).length === 0) {
        return {
            labels: ['Chưa có dữ liệu'],
            data: [1]
        };
    }
    
    return {
        labels: Object.keys(statuses).map(status => statusMap[status] || status),
        data: Object.values(statuses)
    };
}

function getNewUsersStats(bookings) {
    const monthlyData = {};
    const currentDate = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const key = date.toISOString().substring(0, 7);
        monthlyData[key] = 0;
    }
    
    // Count new users by month
    const userMonths = new Set();
    if (bookings && bookings.length > 0) {
        bookings.forEach(booking => {
            if (booking.user && booking.user.createdAt) {
                const date = new Date(booking.user.createdAt);
                const key = date.toISOString().substring(0, 7);
                if (monthlyData.hasOwnProperty(key)) {
                    const userKey = `${booking.user.userId}-${key}`;
                    if (!userMonths.has(userKey)) {
                        monthlyData[key]++;
                        userMonths.add(userKey);
                    }
                }
            }
        });
    }
    
    return {
        labels: Object.keys(monthlyData).map(key => {
            const date = new Date(key + '-01');
            return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
        }),
        data: Object.values(monthlyData)
    };
}

function getCancellationRateStats(bookings) {
    const total = bookings ? bookings.length : 0;
    const cancelled = bookings ? bookings.filter(b => b.bookingStatus === 'CANCELLED').length : 0;
    const success = total - cancelled;
    
    return {
        success: success,
        cancelled: cancelled
    };
}

function getAirlineStats(bookings) {
    const airlines = {};
    if (bookings && bookings.length > 0) {
        bookings.forEach(booking => {
            if (booking.flight && booking.flight.airline) {
                const airlineName = booking.flight.airline.airlineName || 'Unknown';
                airlines[airlineName] = (airlines[airlineName] || 0) + 1;
            }
        });
    }
    
    // Sort by count and take top 5
    const sortedAirlines = Object.entries(airlines)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    // Nếu không có dữ liệu, trả về dữ liệu mẫu
    if (sortedAirlines.length === 0) {
        return {
            labels: ['Chưa có dữ liệu'],
            data: [1]
        };
    }
    
    return {
        labels: sortedAirlines.map(([name]) => name),
        data: sortedAirlines.map(([,count]) => count)
    };
}

// Bookings
async function loadBookings() {
    try {
        showLoading('bookings-page');
        // Use admin endpoint for proper User info
        const bookings = await api.bookings.getAdminBookings();
        // Lưu vào global array để dùng cho search/filter/sort/pagination
        allBookingsData = bookings || [];
        
        // Update stats
        updateBookingsStats(bookings || []);
        
        // Gọi hàm display mới với pagination
        displayBookings();
        
        // Restore search/filter values
        restoreBookingsFilters();

        // Bind status tabs for bookings (once DOM available)
        const bookingTabs = document.querySelectorAll('#bookings-status-tabs .tab-btn');
        const statusFilter = document.getElementById('bookings-filter-status');
        bookingTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                bookingTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const status = tab.getAttribute('data-status') || '';
                bookingsFilters.status = status;
                if (statusFilter) statusFilter.value = status;
                bookingsCurrentPage = 1;
                displayBookings();
            });
        });
        
        hideLoading('bookings-page');
    } catch (error) {
        console.error('Error loading bookings:', error);
        showError('bookings-page', 'Lỗi khi tải danh sách đặt vé');
        hideLoading('bookings-page');
    }
}

function restoreBookingsFilters() {
    const searchInput = document.getElementById('bookings-search');
    const statusFilter = document.getElementById('bookings-filter-status');
    const sortSelect = document.getElementById('bookings-sort');
    const perPageSelect = document.getElementById('bookings-per-page');
    
    // Restore search value from sessionStorage if available
    if (searchInput) {
        const storedValue = sessionStorage.getItem('bookings-search-value');
        if (storedValue) {
            searchInput.value = storedValue;
        }
    }
    if (statusFilter && bookingsFilters.status) {
        statusFilter.value = bookingsFilters.status;
    }
    if (sortSelect && bookingsSort) {
        sortSelect.value = bookingsSort;
    }
    if (perPageSelect) {
        perPageSelect.value = bookingsPerPage;
    }
}

function updateBookingsStats(bookings) {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.bookingStatus === 'CONFIRMED').length;
    const totalRevenue = bookings
        .filter(b => b.paymentStatus === 'PAID')
        .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0);
    const successRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    
    document.getElementById('bookings-total-bookings').textContent = total;
    document.getElementById('bookings-confirmed').textContent = confirmed;
    document.getElementById('bookings-total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('bookings-success-rate').textContent = successRate + '%';
}

// Display function được thay thế bởi displayBookings() mới ở cuối file

function getSeatClasses(seats) {
    if (!seats || seats.length === 0) return 'N/A';
    const classes = [...new Set(seats.map(seat => seat.seatClassName))];
    return classes.join(', ');
}

// Users
async function loadUsers() {
    try {
        showLoading('users-page');
        const users = await api.getUsers();
        // Lưu vào global array để dùng cho search/filter/sort/pagination
        allUsersData = users;
        
        // Update stats
        updateUsersStats(users || []);
        
        // Gọi hàm display mới với pagination
        displayUsers();
        
        // Restore search/filter values
        restoreUsersFilters();
        
        hideLoading('users-page');
    } catch (error) {
        console.error('Error loading users:', error);
        showError('users-page', 'Lỗi khi tải danh sách khách hàng');
        hideLoading('users-page');
    }
}

function restoreUsersFilters() {
    const searchInput = document.getElementById('users-search');
    const sortSelect = document.getElementById('users-sort');
    const perPageSelect = document.getElementById('users-per-page');
    
    // Restore search value from sessionStorage if available
    if (searchInput) {
        const storedValue = sessionStorage.getItem('users-search-value');
        if (storedValue) {
            searchInput.value = storedValue;
        }
    }
    if (sortSelect && usersSort) {
        sortSelect.value = usersSort;
    }
    if (perPageSelect) {
        perPageSelect.value = usersPerPage;
    }
}

function updateUsersStats(users) {
    const total = users.length;
    const active = users.filter(u => u.isActive !== false).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = users.filter(u => {
        if (!u.createdAt) return false;
        const createdDate = new Date(u.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate.getTime() === today.getTime();
    }).length;
    
    // Calculate total bookings for all users
    let totalBookings = 0;
    Promise.all(users.map(async u => {
        try {
            const userBookings = await api.getUserBookings(u.userId).catch(() => []);
            totalBookings += (userBookings || []).length;
        } catch (e) {}
    })).then(() => {
        document.getElementById('users-total-bookings').textContent = totalBookings;
    });
    
    document.getElementById('users-total-users').textContent = total;
    document.getElementById('users-active-users').textContent = active;
    document.getElementById('users-new-today').textContent = newToday;
}

// Display function được thay thế bởi displayUsers() mới ở cuối file

// Payments
async function loadPayments() {
    try {
        showLoading('payments-page');
        const payments = await api.getPayments();
        // Lưu vào global array để dùng cho search/filter/sort/pagination
        allPaymentsData = payments;
        
        // Update stats
        updatePaymentsStats(payments || []);
        
        // Gọi hàm display mới với pagination
        displayPayments();
        
        // Restore search/filter values
        restorePaymentsFilters();
        
        hideLoading('payments-page');
    } catch (error) {
        console.error('Error loading payments:', error);
        showError('payments-page', 'Lỗi khi tải danh sách thanh toán');
        hideLoading('payments-page');
    }
}

function restorePaymentsFilters() {
    const searchInput = document.getElementById('payments-search');
    const methodFilter = document.getElementById('payments-filter-method');
    const statusFilter = document.getElementById('payments-filter-status');
    const sortSelect = document.getElementById('payments-sort');
    const perPageSelect = document.getElementById('payments-per-page');
    
    // Restore search value from sessionStorage if available
    if (searchInput) {
        const storedValue = sessionStorage.getItem('payments-search-value');
        if (storedValue) {
            searchInput.value = storedValue;
        }
    }
    if (methodFilter && paymentsFilters.method) {
        methodFilter.value = paymentsFilters.method;
    }
    if (statusFilter && paymentsFilters.status) {
        statusFilter.value = paymentsFilters.status;
    }
    if (sortSelect && paymentsSort) {
        sortSelect.value = paymentsSort;
    }
    if (perPageSelect) {
        perPageSelect.value = paymentsPerPage;
    }
}

function updatePaymentsStats(payments) {
    const total = payments.length;
    const success = payments.filter(p => p.status === 'SUCCESS').length;
    const totalRevenue = payments
        .filter(p => p.status === 'SUCCESS')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    
    document.getElementById('payments-total').textContent = total;
    document.getElementById('payments-success').textContent = success;
    document.getElementById('payments-total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('payments-success-rate').textContent = successRate + '%';
}

// Display function được thay thế bởi displayPayments() mới ở cuối file

// Modals
function setupModals() {
    // Close modals when clicking X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                const modalId = modal.id;
                closeModal(modalId);
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            closeModal(modalId);
        }
    });
    
    // Handle closeFlightDetailModal
    window.closeFlightDetailModal = function() {
        closeModal('flightDetailModal');
    };
}

// View Booking Detail
async function viewBookingDetail(bookingId) {
    try {
        // Use admin endpoint to get full seat info (including PassengerIdNumber)
        let booking = null;
        try {
            booking = await apiCall(`/admin/Bookings/${bookingId}`);
        } catch (e) {
            booking = await api.getBookingById(bookingId);
        }
        const modal = document.getElementById('booking-detail-modal');
        const content = document.getElementById('booking-detail-content');
        
        content.innerHTML = `
            <div class="booking-detail">
                <h4>Thông tin đặt vé</h4>
                <p><strong>Mã đặt vé:</strong> ${booking.bookingReference}</p>
                <p><strong>Khách hàng:</strong> ${booking.user?.fullName || 'N/A'}</p>
                <p><strong>Chuyến bay:</strong> ${booking.flight?.flightNumber || 'N/A'}</p>
                <p><strong>Tổng tiền:</strong> ${formatCurrency(booking.totalAmount)}</p>
                <p><strong>Trạng thái:</strong> ${getStatusText(booking.bookingStatus)}</p>
                <p><strong>Ngày đặt:</strong> ${formatDate(booking.bookingDate)}</p>
                
                <h4>Danh sách ghế</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Số ghế</th>
                            <th>Hạng ghế</th>
                            <th>Tên hành khách</th>
                            <th>CCCD/CMND</th>
                            <th>Giá</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${booking.seats?.map(seat => `
                            <tr>
                                <td>${seat.seatNumber}</td>
                                <td>${seat.seatClassName || seat.seatClass}</td>
                                <td>${seat.passengerName}</td>
                                <td>${seat.passengerIdNumber || 'N/A'}</td>
                                <td>${formatCurrency(seat.seatPrice)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4">Không có dữ liệu</td></tr>'}
                    </tbody>
                </table>
        </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading booking detail:', error);
        alert('Lỗi khi tải chi tiết đặt vé');
    }
}

// View User Detail
async function viewUserDetail(userId) {
    try {
        const [user, unreadCount] = await Promise.all([
            api.getUserById(userId),
            api.getUnreadNotificationCount(userId).catch(() => 0)
        ]);
        
        const modal = document.getElementById('user-detail-modal');
        const content = document.getElementById('user-detail-content');
        
        content.innerHTML = `
            <div class="user-detail">
                <div class="detail-tabs">
                    <button class="tab-btn active" onclick="showUserTab('info', ${userId})">Thông tin</button>
                    <button class="tab-btn" onclick="showUserTab('notifications', ${userId})">
                        Thông báo 
                        ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ''}
                    </button>
                    <button class="tab-btn" onclick="showUserTab('bookings', ${userId})">Đặt vé</button>
                </div>
                
                <div id="user-info-tab" class="tab-content active">
                <h4>Thông tin tài khoản</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>ID:</strong> ${user.userId}
                    </div>
                    <div class="detail-item">
                        <strong>Tên đăng nhập:</strong> ${user.username}
                    </div>
                    <div class="detail-item">
                        <strong>Email:</strong> ${user.email}
                    </div>
                    <div class="detail-item">
                        <strong>Họ tên:</strong> ${user.fullName || 'N/A'}
                    </div>
                    <div class="detail-item">
                        <strong>Số điện thoại:</strong> ${user.phone || 'N/A'}
                    </div>
                    <div class="detail-item">
                        <strong>Ngày sinh:</strong> ${user.dateOfBirth ? formatDate(user.dateOfBirth) : 'N/A'}
                    </div>
                    <div class="detail-item">
                        <strong>Giới tính:</strong> ${user.gender || 'N/A'}
                    </div>
                    <div class="detail-item">
                        <strong>Trạng thái:</strong> <span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Hoạt động' : 'Không hoạt động'}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Ngày tạo:</strong> ${formatDate(user.createdAt)}
                    </div>
                    <div class="detail-item">
                        <strong>Ngày cập nhật:</strong> ${formatDate(user.updatedAt)}
                    </div>
                    <div class="detail-item">
                        <strong>Tổng đặt vé:</strong> ${user.totalBookings || 0}
                    </div>
                    <div class="detail-item">
                        <strong>Tổng chi tiêu:</strong> ${formatCurrency(user.totalSpent || 0)}
                    </div>
                    </div>
                </div>
                
                <div id="user-notifications-tab" class="tab-content" style="display: none;">
                    <h4>Thông báo của khách hàng</h4>
                    <div id="user-notifications-list">Đang tải...</div>
                </div>
                
                <div id="user-bookings-tab" class="tab-content" style="display: none;">
                    <h4>Lịch sử đặt vé</h4>
                    <div id="user-bookings-list">Đang tải...</div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading user detail:', error);
        showAlert('Lỗi khi tải chi tiết khách hàng', 'error');
    }
}

async function showUserTab(tabName, userId) {
    // Update tab buttons
    const allTabs = document.querySelectorAll('.tab-btn');
    const allContents = document.querySelectorAll('.tab-content');
    
    allTabs.forEach(btn => btn.classList.remove('active'));
    allContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // Set active button
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Nếu không có event, tìm button theo tabName
        allTabs.forEach(btn => {
            if (btn.textContent.includes(tabName === 'info' ? 'Thông tin' : tabName === 'notifications' ? 'Thông báo' : 'Đặt vé')) {
                btn.classList.add('active');
            }
        });
    }
    
    if (tabName === 'notifications') {
        const tabContent = document.getElementById('user-notifications-tab');
        tabContent.style.display = 'block';
        tabContent.classList.add('active');
        
        try {
            const notifications = await api.getUserNotifications(userId, 1, 20);
            const listDiv = document.getElementById('user-notifications-list');
            
            if (!notifications || notifications.length === 0) {
                listDiv.innerHTML = '<p>Khách hàng chưa có thông báo nào.</p>';
            } else {
                listDiv.innerHTML = `
                    <div class="notifications-list">
                        ${notifications.map(notif => `
                            <div class="notification-item ${notif.isRead ? 'read' : 'unread'}">
                                <div class="notification-header">
                                    <strong>${notif.title || 'Thông báo'}</strong>
                                    <span class="notification-date">${formatDate(notif.createdAt)}</span>
                                </div>
                                <div class="notification-body">${notif.message || ''}</div>
                                ${!notif.isRead ? `<button class="btn btn-sm" onclick="markUserNotificationAsRead(${notif.notificationId}, ${userId})">Đánh dấu đã đọc</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('user-notifications-list').innerHTML = '<p class="error">Lỗi khi tải thông báo</p>';
        }
    } else if (tabName === 'bookings') {
        const tabContent = document.getElementById('user-bookings-tab');
        tabContent.style.display = 'block';
        tabContent.classList.add('active');
        
        try {
            const bookings = await api.getUserBookingHistory(userId, 1, 20);
            const listDiv = document.getElementById('user-bookings-list');
            
            if (!bookings || bookings.length === 0) {
                listDiv.innerHTML = '<p>Khách hàng chưa có đặt vé nào.</p>';
            } else {
                listDiv.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Mã đặt vé</th>
                                <th>Chuyến bay</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Ngày đặt</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.map(booking => `
                                <tr>
                                    <td>${booking.bookingReference || booking.bookingId}</td>
                                    <td>${booking.flight?.flightNumber || 'N/A'}</td>
                                    <td>${formatCurrency(booking.totalAmount)}</td>
                                    <td><span class="status-badge status-${booking.bookingStatus?.toLowerCase()}">${getStatusText(booking.bookingStatus)}</span></td>
                                    <td>${formatDate(booking.bookingDate)}</td>
                                    <td>
                                        <button class="btn btn-sm" onclick="viewUserBookingDetail(${userId}, ${booking.bookingId})">Chi tiết</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        } catch (error) {
            document.getElementById('user-bookings-list').innerHTML = '<p class="error">Lỗi khi tải lịch sử đặt vé</p>';
        }
    } else {
        const tabContent = document.getElementById('user-info-tab');
        tabContent.style.display = 'block';
        tabContent.classList.add('active');
    }
}

async function markUserNotificationAsRead(notificationId, userId) {
    try {
        await api.markNotificationAsRead(notificationId, userId);
        showUserTab('notifications', userId);
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function viewUserBookingDetail(userId, bookingId) {
    try {
        const booking = await api.getUserBookingDetail(userId, bookingId);
        const modal = document.getElementById('booking-detail-modal');
        const content = document.getElementById('booking-detail-content');
        
        content.innerHTML = `
            <div class="booking-detail">
                <h4>Chi tiết đặt vé</h4>
                <div class="detail-grid">
                    <div class="detail-item"><strong>Mã đặt vé:</strong> ${booking.bookingReference || booking.bookingId}</div>
                    <div class="detail-item"><strong>Chuyến bay:</strong> ${booking.flight?.flightNumber || 'N/A'}</div>
                    <div class="detail-item"><strong>Tổng tiền:</strong> ${formatCurrency(booking.totalAmount)}</div>
                    <div class="detail-item"><strong>Trạng thái:</strong> <span class="status-badge status-${booking.bookingStatus?.toLowerCase()}">${getStatusText(booking.bookingStatus)}</span></div>
                    <div class="detail-item"><strong>Ngày đặt:</strong> ${formatDate(booking.bookingDate)}</div>
                    ${booking.passengers ? `<div class="detail-item"><strong>Hành khách:</strong> ${booking.passengers.length}</div>` : ''}
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading booking detail:', error);
        showAlert('Lỗi khi tải chi tiết đặt vé', 'error');
    }
}

// View User History - Sử dụng API mới getUserBookingHistory
async function viewUserHistory(userId) {
    try {
        const bookings = await api.getUserBookingHistory(userId, 1, 50);
        const modal = document.getElementById('user-history-modal');
        const content = document.getElementById('user-history-content');
        
        content.innerHTML = `
            <div class="user-history">
                <h4>Lịch sử đặt vé</h4>
                ${!bookings || bookings.length === 0 ? 
                    '<p>Khách hàng chưa có đặt vé nào.</p>' :
                    `<table class="data-table">
                        <thead>
                            <tr>
                                <th>Mã đặt vé</th>
                                <th>Chuyến bay</th>
                                <th>Số ghế</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Ngày đặt</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.map(booking => `
                                <tr>
                                    <td>${booking.bookingReference || booking.bookingId}</td>
                                    <td>${booking.flight?.flightNumber || 'N/A'}</td>
                                    <td>${booking.seats?.length || 0}</td>
                                    <td>${formatCurrency(booking.totalAmount)}</td>
                                    <td><span class="status-badge status-${booking.bookingStatus?.toLowerCase()}">${getStatusText(booking.bookingStatus)}</span></td>
                                    <td>${formatDate(booking.bookingDate)}</td>
                                    <td>
                                        <button class="btn btn-sm" onclick="viewUserBookingDetail(${userId}, ${booking.bookingId})">Chi tiết</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
                }
        </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading user history:', error);
        alert('Lỗi khi tải lịch sử đặt vé');
    }
}

// View Payment Detail - Thêm check payment status
async function viewPaymentDetail(paymentId) {
    try {
        const payment = await api.getPaymentById(paymentId);
        const modal = document.getElementById('booking-detail-modal');
        const content = document.getElementById('booking-detail-content');
        
        // Nếu có transactionId, check payment status
        let paymentStatusInfo = '';
        if (payment.transactionId) {
            try {
                const status = await api.getPaymentStatus(payment.transactionId);
                paymentStatusInfo = `
                    <div class="payment-status-info">
                        <p><strong>Trạng thái kiểm tra:</strong> <span class="status-badge status-${status.status?.toLowerCase()}">${getStatusText(status.status)}</span></p>
                        ${status.processedAt ? `<p><strong>Thời gian xử lý:</strong> ${formatDate(status.processedAt)}</p>` : ''}
                    </div>
                `;
            } catch (e) {
                console.warn('Could not fetch payment status:', e);
            }
        }
        
        content.innerHTML = `
            <div class="payment-detail">
                <h4>Chi tiết thanh toán</h4>
                <div class="detail-grid">
                    <div class="detail-item"><strong>ID:</strong> ${payment.paymentId}</div>
                    <div class="detail-item"><strong>Mã giao dịch:</strong> ${payment.transactionId || 'N/A'}</div>
                    <div class="detail-item"><strong>Phương thức:</strong> ${getPaymentMethodText(payment.paymentMethod)}</div>
                    <div class="detail-item"><strong>Số tiền:</strong> ${formatCurrency(payment.amount)}</div>
                    <div class="detail-item"><strong>Trạng thái:</strong> <span class="status-badge status-${payment.status?.toLowerCase()}">${getStatusText(payment.status)}</span></div>
                    <div class="detail-item"><strong>Ngày tạo:</strong> ${formatDate(payment.createdAt)}</div>
                    ${payment.paymentUrl ? `<div class="detail-item"><strong>URL thanh toán:</strong> <a href="${payment.paymentUrl}" target="_blank">Xem</a></div>` : ''}
                    ${payment.transactionId ? `<div class="detail-item"><button class="btn btn-sm" onclick="checkPaymentStatus('${payment.transactionId}')">Kiểm tra trạng thái</button></div>` : ''}
                </div>
                ${paymentStatusInfo}
        </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading payment detail:', error);
        alert('Lỗi khi tải chi tiết thanh toán');
    }
}

async function checkPaymentStatus(transactionId) {
    try {
        const status = await api.getPaymentStatus(transactionId);
        showAlert(`Trạng thái thanh toán: ${getStatusText(status.status)}`, 'info');
    } catch (error) {
        console.error('Error checking payment status:', error);
        showAlert('Lỗi khi kiểm tra trạng thái thanh toán', 'error');
    }
}

// Utility Functions
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    const existingLoading = container.querySelector('.loading');
    if (!existingLoading) {
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.style.textAlign = 'center';
        loading.style.padding = '20px';
        container.appendChild(loading);
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${message}</h3>
        </div>
    `;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
}

function getStatusText(status) {
    const statusMap = {
        'CONFIRMED': 'Đã xác nhận',
        'PENDING': 'Chờ xử lý',
        'CANCELLED': 'Đã hủy',
        'RESTORE_PENDING': 'Chờ duyệt khôi phục',
        'SUCCESS': 'Thành công',
        'FAILED': 'Thất bại',
        'REFUNDED': 'Đã hoàn tiền'
    };
    return statusMap[status] || status;
}

function getPaymentMethodText(method) {
    const methodMap = {
        'VNPAY': 'VNPay',
        'MOMO': 'MoMo',
        'ZALOPAY': 'ZaloPay',
        'CARD': 'Thẻ tín dụng'
    };
    return methodMap[method] || method;
}

// ========== Loading and Error Functions ==========

function showLoading(pageId) {
    const page = document.getElementById(pageId);
    if (page) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-' + pageId;
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tải...</p>
        </div>
        `;
        page.appendChild(loadingDiv);
    }
}

function hideLoading(pageId) {
    const loadingDiv = document.getElementById('loading-' + pageId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showError(pageId, message) {
    const page = document.getElementById(pageId);
    if (page) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${message}</h3>
            </div>
        `;
        
        // Remove existing error messages
        const existingError = page.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        page.appendChild(errorDiv);
    }
}

// Refresh functions
function refreshCurrentPage() {
    loadPage(currentPage);
}

function refreshBookings() {
    loadBookings();
}

function refreshUsers() {
    loadUsers();
}

function refreshPayments() {
    loadPayments();
}

// ============================================
// FORM HANDLERS
// ============================================

function setupFormHandlers() {
    // Booking form
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
    
    // User form
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', handleUserSubmit);
    }
    
    // Payment form
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }
}

async function toggleUserActive(userId, isActive) {
    try {
        await apiCall(`/admin/Users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: isActive })
        });
        showAlert(isActive ? 'Đã kích hoạt khách hàng' : 'Đã vô hiệu hóa khách hàng', 'success');
        loadUsers();
    } catch (e) {
        console.error('Toggle user active error:', e);
        showAlert('Lỗi cập nhật trạng thái khách hàng: ' + (e.message || ''), 'error');
    }
}

// ============================================
// BOOKING CRUD
// ============================================

async function showCreateBookingModal() {
    currentEditId = null;
    document.getElementById('booking-form-title').textContent = 'Thêm đặt vé mới';
    document.getElementById('booking-form').reset();
    
    // Load users and flights for dropdowns
    await loadBookingDropdowns();
    
    document.getElementById('booking-form-modal').style.display = 'block';
}

async function showEditBookingModal(bookingId) {
    try {
        currentEditId = bookingId;
        document.getElementById('booking-form-title').textContent = 'Chỉnh sửa đặt vé';
        
        const booking = await api.getBookingById(bookingId);
        
        // Fill form with booking data
        document.getElementById('booking-id').value = booking.bookingId;
        document.getElementById('booking-user-id').value = booking.userId;
        document.getElementById('booking-flight-id').value = booking.flightId;
        document.getElementById('booking-status').value = booking.bookingStatus;
        document.getElementById('booking-notes').value = booking.notes || '';
        
        // Load dropdowns
        await loadBookingDropdowns();
        
        document.getElementById('booking-form-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading booking:', error);
        showAlert('Lỗi khi tải thông tin đặt vé', 'error');
    }
}

async function loadBookingDropdowns() {
    try {
        const [users, flights] = await Promise.all([
            api.getUsers(),
            api.getAllFlights()
        ]);
        
        // Load users
        const userSelect = document.getElementById('booking-user-id');
        userSelect.innerHTML = '<option value="">Chọn khách hàng</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.userId;
            option.textContent = `${user.fullName} (${user.email})`;
            userSelect.appendChild(option);
        });
        
        // Load flights
        const flightSelect = document.getElementById('booking-flight-id');
        flightSelect.innerHTML = '<option value="">Chọn chuyến bay</option>';
        flights.forEach(flight => {
            const option = document.createElement('option');
            option.value = flight.flightId;
            option.textContent = `${flight.flightNumber} - ${flight.departureAirport} → ${flight.arrivalAirport}`;
            flightSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading dropdowns:', error);
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    // Validation
    const userIdEl = document.getElementById('booking-user-id');
    const flightIdEl = document.getElementById('booking-flight-id');
    const seatClassIdEl = document.getElementById('booking-seat-class-id');
    const passengersEl = document.getElementById('booking-passengers');
    const bookingStatusEl = document.getElementById('booking-status');
    const notesEl = document.getElementById('booking-notes');
    
    const userId = userIdEl ? userIdEl.value : '';
    const flightId = flightIdEl ? flightIdEl.value : '';
    const seatClassId = seatClassIdEl ? seatClassIdEl.value : '';
    const passengers = passengersEl ? passengersEl.value : '';
    const bookingStatus = bookingStatusEl ? bookingStatusEl.value : '';
    const notes = notesEl ? notesEl.value.trim() : '';
    
    if (!userId || userId === '') {
        showAlert('Vui lòng chọn khách hàng', 'error');
        if (userIdEl) userIdEl.focus();
        return;
    }
    
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum) || userIdNum <= 0) {
        showAlert('Khách hàng không hợp lệ', 'error');
        if (userIdEl) userIdEl.focus();
        return;
    }
    
    if (!flightId || flightId === '') {
        showAlert('Vui lòng chọn chuyến bay', 'error');
        if (flightIdEl) flightIdEl.focus();
        return;
    }
    
    const flightIdNum = parseInt(flightId);
    if (isNaN(flightIdNum) || flightIdNum <= 0) {
        showAlert('Chuyến bay không hợp lệ', 'error');
        if (flightIdEl) flightIdEl.focus();
        return;
    }
    
    if (!seatClassId || seatClassId === '') {
        showAlert('Vui lòng chọn hạng ghế', 'error');
        if (seatClassIdEl) seatClassIdEl.focus();
        return;
    }
    
    const seatClassIdNum = parseInt(seatClassId);
    if (isNaN(seatClassIdNum) || seatClassIdNum <= 0) {
        showAlert('Hạng ghế không hợp lệ', 'error');
        if (seatClassIdEl) seatClassIdEl.focus();
        return;
    }
    
    if (!passengers || passengers === '') {
        showAlert('Vui lòng nhập số lượng hành khách', 'error');
        if (passengersEl) passengersEl.focus();
        return;
    }
    
    const passengersNum = parseInt(passengers);
    if (isNaN(passengersNum) || passengersNum < 1 || passengersNum > 9) {
        showAlert('Số lượng hành khách phải từ 1 đến 9', 'error');
        if (passengersEl) passengersEl.focus();
        return;
    }
    
    if (!bookingStatus || bookingStatus === '') {
        showAlert('Vui lòng chọn trạng thái đặt vé', 'error');
        if (bookingStatusEl) bookingStatusEl.focus();
        return;
    }
    
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];
    if (!validStatuses.includes(bookingStatus)) {
        showAlert('Trạng thái đặt vé không hợp lệ', 'error');
        if (bookingStatusEl) bookingStatusEl.focus();
        return;
    }
    
    // Notes validation
    if (notes.length > 1000) {
        showAlert('Ghi chú không được vượt quá 1000 ký tự', 'error');
        if (notesEl) notesEl.focus();
        return;
    }
    
    try {
        if (currentEditId) {
            // Update existing booking - only allow status and notes update
            const bookingData = {
                bookingStatus: bookingStatus,
                notes: notes || null
            };
            await api.updateBooking(currentEditId, bookingData);
            showAlert('Cập nhật đặt vé thành công!', 'success');
        } else {
            // Create new booking - need full data
            // Generate passenger details automatically
            const passengerDetails = [];
            for (let i = 1; i <= passengersNum; i++) {
                passengerDetails.push({
                    passengerName: `Hành khách ${i}`,
                    passengerIdNumber: null
                });
            }
            
            const bookingData = {
                userId: userIdNum,
                flightId: flightIdNum,
                seatClassId: seatClassIdNum,
                passengers: passengersNum,
                passengerDetails: passengerDetails,
                notes: notes || null
            };
            
            await api.createBooking(bookingData);
            showAlert('Tạo đặt vé thành công!', 'success');
        }
        
        closeModal('booking-form-modal');
        loadBookings();
    } catch (error) {
        console.error('Error saving booking:', error);
        const errorMsg = error.message || 'Lỗi không xác định';
        showAlert('Lỗi khi lưu đặt vé: ' + errorMsg, 'error');
        // Don't close modal on error - keep form values
    }
}

async function deleteBooking(bookingId) {
    try {
        // Luôn hủy (đổi trạng thái), không xóa vĩnh viễn
        await api.cancelBooking(bookingId);
        showAlert('Hủy đặt vé thành công!', 'success');
        loadBookings();
    } catch (error) {
        console.error('Error deleting booking:', error);
        showAlert('Lỗi khi hủy đặt vé: ' + error.message, 'error');
    }
}

// ============================================
// USER CRUD
// ============================================

async function showCreateUserModal() {
    currentEditId = null;
    document.getElementById('user-form-title').textContent = 'Thêm khách hàng mới';
    document.getElementById('user-form').reset();
    document.getElementById('user-password').required = true;
    
    document.getElementById('user-form-modal').style.display = 'block';
}

async function showEditUserModal(userId) {
    try {
        currentEditId = userId;
        document.getElementById('user-form-title').textContent = 'Chỉnh sửa khách hàng';
        
        const user = await api.getUserById(userId);
        
        // Fill form with user data
        document.getElementById('user-id').value = user.userId;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-password').required = false;
        document.getElementById('user-password').placeholder = 'Để trống nếu không đổi mật khẩu';
        document.getElementById('user-fullname').value = user.fullName;
        document.getElementById('user-phone').value = user.phone || '';
        document.getElementById('user-active').value = user.isActive ? 'true' : 'false';
        
        document.getElementById('user-form-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading user:', error);
        showAlert('Lỗi khi tải thông tin khách hàng', 'error');
    }
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    // Validation
    const username = document.getElementById('user-username').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password').value;
    const fullNameEl = document.getElementById('user-fullname') || document.getElementById('user-full-name');
    const fullName = fullNameEl ? fullNameEl.value.trim() : '';
    const phoneEl = document.getElementById('user-phone');
    const phone = phoneEl ? phoneEl.value.trim() : '';
    
    if (!username || username === '') {
        showAlert('Vui lòng nhập tên đăng nhập', 'error');
        document.getElementById('user-username').focus();
        return;
    }
    
    // Username validation
    if (username.length < 3) {
        showAlert('Tên đăng nhập phải có ít nhất 3 ký tự', 'error');
        document.getElementById('user-username').focus();
        return;
    }
    
    if (username.length > 50) {
        showAlert('Tên đăng nhập không được vượt quá 50 ký tự', 'error');
        document.getElementById('user-username').focus();
        return;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        showAlert('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới', 'error');
        document.getElementById('user-username').focus();
        return;
    }
    
    // Email validation
    if (!email || email === '') {
        showAlert('Vui lòng nhập email', 'error');
        document.getElementById('user-email').focus();
        return;
    }
    
    if (email.length > 100) {
        showAlert('Email không được vượt quá 100 ký tự', 'error');
        document.getElementById('user-email').focus();
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Email không hợp lệ. Ví dụ: user@example.com', 'error');
        document.getElementById('user-email').focus();
        return;
    }
    
    // Password validation
    if (!currentEditId && (!password || password === '')) {
        showAlert('Vui lòng nhập mật khẩu', 'error');
        document.getElementById('user-password').focus();
        return;
    }
    
    if (!currentEditId && password.length < 6) {
        showAlert('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        document.getElementById('user-password').focus();
        return;
    }
    
    if (!currentEditId && password.length > 100) {
        showAlert('Mật khẩu không được vượt quá 100 ký tự', 'error');
        document.getElementById('user-password').focus();
        return;
    }
    
    // Full name validation
    if (!fullName || fullName === '') {
        showAlert('Vui lòng nhập họ tên', 'error');
        if (fullNameEl) fullNameEl.focus();
        return;
    }
    
    if (fullName.length < 2) {
        showAlert('Họ tên phải có ít nhất 2 ký tự', 'error');
        if (fullNameEl) fullNameEl.focus();
        return;
    }
    
    if (fullName.length > 100) {
        showAlert('Họ tên không được vượt quá 100 ký tự', 'error');
        if (fullNameEl) fullNameEl.focus();
        return;
    }
    
    // Phone validation
    if (phone && phone !== '') {
        const cleanPhone = phone.replace(/[\s-]/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            showAlert('Số điện thoại phải có 10-11 chữ số', 'error');
            if (phoneEl) phoneEl.focus();
            return;
        }
        
        const phoneRegex = /^[0-9]+$/;
        if (!phoneRegex.test(cleanPhone)) {
            showAlert('Số điện thoại chỉ được chứa chữ số', 'error');
            if (phoneEl) phoneEl.focus();
            return;
        }
        
        if (!cleanPhone.startsWith('0')) {
            showAlert('Số điện thoại phải bắt đầu bằng số 0', 'error');
            if (phoneEl) phoneEl.focus();
            return;
        }
    }
    
    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData.entries());
    
    // Remove empty password if editing
    if (currentEditId && !userData.password) {
        delete userData.password;
    }
    
    // Convert isActive to boolean
    userData.isActive = userData.isActive === 'true';
    
    try {
        if (currentEditId) {
            // Update existing user
            await api.updateUser(currentEditId, userData);
            showAlert('Cập nhật khách hàng thành công!', 'success');
        } else {
            // Create new user
            await api.createUser(userData);
            showAlert('Tạo khách hàng thành công!', 'success');
        }
        
        closeModal('user-form-modal');
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        const errorMsg = error.message || 'Lỗi không xác định';
        showAlert('Lỗi khi lưu khách hàng: ' + errorMsg, 'error');
        // Don't close modal on error - keep form values
    }
}

async function deleteUser(userId) {
    // Không còn xóa user. Dùng toggle kích hoạt/vô hiệu hóa thay thế.
    showAlert('Không hỗ trợ xóa khách hàng. Vui lòng dùng nút Kích hoạt/Vô hiệu hóa.', 'info');
}

// ============================================
// PAYMENT CRUD
// ============================================

async function showCreatePaymentModal() {
    currentEditId = null;
    document.getElementById('payment-form-title').textContent = 'Thêm thanh toán mới';
    document.getElementById('payment-form').reset();
    
    // Load bookings for dropdown
    await loadPaymentDropdowns();
    
    document.getElementById('payment-form-modal').style.display = 'block';
}

async function showEditPaymentModal(paymentId) {
    try {
        currentEditId = paymentId;
        document.getElementById('payment-form-title').textContent = 'Chỉnh sửa thanh toán';
        
        const payment = await api.getPaymentById(paymentId);
        
        // Fill form with payment data
        document.getElementById('payment-id').value = payment.paymentId;
        document.getElementById('payment-booking-id').value = payment.bookingId;
        document.getElementById('payment-method').value = payment.paymentMethod;
        document.getElementById('payment-amount').value = payment.amount;
        document.getElementById('payment-status').value = payment.status;
        document.getElementById('payment-notes').value = payment.notes || '';
        // Store current status to control submit behavior
        let hidden = document.getElementById('payment-current-status');
        if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.id = 'payment-current-status';
            document.getElementById('payment-form').appendChild(hidden);
        }
        hidden.value = payment.status;
        
        // Load dropdowns
        await loadPaymentDropdowns();
        // Lock booking selection in edit mode
        const bookingSelect = document.getElementById('payment-booking-id');
        if (bookingSelect) bookingSelect.disabled = true;
        // If payment SUCCESS: lock amount only, allow changing method per new rule
        const lockAmount = payment.status === 'SUCCESS';
        document.getElementById('payment-method').disabled = false;
        document.getElementById('payment-amount').disabled = lockAmount;
        
        document.getElementById('payment-form-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading payment:', error);
        showAlert('Lỗi khi tải thông tin thanh toán', 'error');
    }
}

async function loadPaymentDropdowns() {
    try {
        const bookings = await api.getBookings();
        
        // Load bookings
        const bookingSelect = document.getElementById('payment-booking-id');
        bookingSelect.innerHTML = '<option value="">Chọn đặt vé</option>';
        bookings.forEach(booking => {
            const option = document.createElement('option');
            option.value = booking.bookingId;
            option.textContent = `${booking.bookingReference} - ${booking.user?.fullName || 'N/A'} (${formatCurrency(booking.totalAmount)})`;
            bookingSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading payment dropdowns:', error);
    }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    
    // Validation
    const bookingId = document.getElementById('payment-booking-id').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const amountEl = document.getElementById('payment-amount');
    const amount = amountEl ? amountEl.value : '';
    const status = document.getElementById('payment-status').value;
    const notesEl = document.getElementById('payment-notes');
    const notes = notesEl ? notesEl.value.trim() : '';
    
    if (!currentEditId) {
        if (!bookingId || bookingId === '') {
            showAlert('Vui lòng chọn đặt vé', 'error');
            document.getElementById('payment-booking-id').focus();
            return;
        }
        
        if (!paymentMethod || paymentMethod === '') {
            showAlert('Vui lòng chọn phương thức thanh toán', 'error');
            document.getElementById('payment-method').focus();
            return;
        }
        
        if (!amount || amount === '') {
            showAlert('Vui lòng nhập số tiền', 'error');
            if (amountEl) amountEl.focus();
            return;
        }
        
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum)) {
            showAlert('Số tiền phải là một số hợp lệ', 'error');
            if (amountEl) amountEl.focus();
            return;
        }
        
        if (amountNum <= 0) {
            showAlert('Số tiền phải lớn hơn 0', 'error');
            if (amountEl) amountEl.focus();
            return;
        }
        
        if (amountNum > 999999999999) {
            showAlert('Số tiền quá lớn (tối đa 999,999,999,999 VNĐ)', 'error');
            if (amountEl) amountEl.focus();
            return;
        }
        
        // Check decimal places
        const decimalPlaces = (amount.split('.')[1] || []).length;
        if (decimalPlaces > 2) {
            showAlert('Số tiền chỉ được có tối đa 2 chữ số thập phân', 'error');
            if (amountEl) amountEl.focus();
            return;
        }
    } else {
        // Edit mode: validate amount if editable
        const amountInput = document.getElementById('payment-amount');
        if (amountInput && !amountInput.disabled && amount) {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum)) {
                showAlert('Số tiền phải là một số hợp lệ', 'error');
                amountInput.focus();
                return;
            }
            if (amountNum <= 0) {
                showAlert('Số tiền phải lớn hơn 0', 'error');
                amountInput.focus();
                return;
            }
        }
    }
    
    if (!status || status === '') {
        showAlert('Vui lòng chọn trạng thái thanh toán', 'error');
        document.getElementById('payment-status').focus();
        return;
    }
    
    // Notes validation
    if (notes.length > 500) {
        showAlert('Ghi chú không được vượt quá 500 ký tự', 'error');
        if (notesEl) notesEl.focus();
        return;
    }
    
    const formData = new FormData(e.target);
    const paymentData = Object.fromEntries(formData.entries());
    
    // Convert amount to number only if present
    if (paymentData.amount !== undefined && paymentData.amount !== '') {
        const parsed = parseFloat(paymentData.amount);
        if (!isNaN(parsed) && parsed > 0) {
            paymentData.amount = parsed;
        } else {
            showAlert('Số tiền phải là số dương', 'error');
            document.getElementById('payment-amount').focus();
            return;
        }
    } else if (!currentEditId) {
        delete paymentData.amount;
    }
    
    try {
        if (currentEditId) {
            // Update existing payment
            // If current payment is SUCCESS, don't send amount or method
            const currentStatusEl = document.getElementById('payment-current-status');
            const currentStatus = currentStatusEl ? currentStatusEl.value : '';
            if (currentStatus === 'SUCCESS') {
                delete paymentData.amount;
                delete paymentData.paymentMethod;
            }
            await api.updatePayment(currentEditId, paymentData);
            showAlert('Cập nhật thanh toán thành công!', 'success');
        } else {
            // Create new payment
            await api.createPayment(paymentData);
            showAlert('Tạo thanh toán thành công!', 'success');
        }
        
        closeModal('payment-form-modal');
        loadPayments();
    } catch (error) {
        console.error('Error saving payment:', error);
        const errorMsg = error.message || 'Lỗi không xác định';
        showAlert('Lỗi khi lưu thanh toán: ' + errorMsg, 'error');
        // Don't close modal on error - keep form values
    }
}

async function deletePayment(paymentId) {
    try {
        await api.deletePayment(paymentId);
        showAlert('Xóa thanh toán thành công!', 'success');
        loadPayments();
    } catch (error) {
        console.error('Error deleting payment:', error);
        showAlert('Lỗi khi xóa thanh toán: ' + error.message, 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function closeModal(modalId) {
    // Handle both with and without parameter
    if (!modalId) {
        // Try to find open modal
        const openModal = document.querySelector('.modal[style*="block"]');
        if (openModal) {
            openModal.style.display = 'none';
        }
        return;
    }
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Insert at top of current page
    const currentPageElement = document.querySelector('.page.active');
    currentPageElement.insertBefore(alert, currentPageElement.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function showDeleteConfirm(message, callback) {
    document.getElementById('delete-confirm-message').textContent = message;
    deleteCallback = callback;
    document.getElementById('delete-confirm-modal').style.display = 'block';
}

async function approveRestore(bookingId) {
    try {
        await apiCall(`/admin/Bookings/${bookingId}/restore-approve`, { method: 'POST' });
        showAlert('Đã duyệt khôi phục vé!', 'success');
        loadBookings();
    } catch (e) {
        console.error('Approve restore error:', e);
        showAlert('Lỗi duyệt khôi phục: ' + (e.message || ''), 'error');
    }
}

async function rejectRestore(bookingId) {
    try {
        await apiCall(`/admin/Bookings/${bookingId}/restore-reject`, { method: 'POST' });
        showAlert('Đã từ chối khôi phục vé!', 'info');
        loadBookings();
    } catch (e) {
        console.error('Reject restore error:', e);
        showAlert('Lỗi từ chối khôi phục: ' + (e.message || ''), 'error');
    }
}

function confirmDelete() {
    if (deleteCallback) {
        deleteCallback();
        deleteCallback = null;
    }
    closeModal('delete-confirm-modal');
}

// ============================================
// AUTH FUNCTIONS
// ============================================

function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = 'index.html';
    }
}

// Check authentication on page load
function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'undefined') {
        window.location.href = 'index.html';
    }
}

// Initialize auth check
checkAdminAuth();

// ============================================
// AUTO-APPROVAL FUNCTIONS
// ============================================

async function loadAutoApprovalStats() {
    try {
        showLoading('auto-approval-page');
        
        const [stats, bookings] = await Promise.all([
            api.getAutoApprovalStats(),
            api.getBookings()
        ]);
        
        // Update stats
        document.getElementById('today-approved').textContent = stats.todayApproved || 0;
        document.getElementById('today-rejected').textContent = stats.todayRejected || 0;
        document.getElementById('approval-rate').textContent = (stats.todayApprovalRate || 0).toFixed(1) + '%';
        
        // Count pending bookings
        const pendingCount = bookings.filter(b => b.bookingStatus === 'PENDING').length;
        document.getElementById('pending-count').textContent = pendingCount;
        
    } catch (error) {
        console.error('Error loading auto-approval stats:', error);
        showError('auto-approval-page', 'Lỗi khi tải thống kê duyệt tự động');
    }
}

async function processAutoApproval() {
    try {
        const button = event.target;
        const originalText = button.innerHTML;
        
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> Đang xử lý...';
        
        await api.processAutoApproval();
        
        showAlert('Duyệt tự động hoàn thành!', 'success');
        loadAutoApprovalStats();
        
    } catch (error) {
        console.error('Error processing auto-approval:', error);
        showAlert('Lỗi khi chạy duyệt tự động: ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-magic"></i> Chạy duyệt tự động';
    }
}

// ========== Search, Filter, Sort, Pagination Functions ==========

// Global state for table data
let allBookingsData = [];
let allUsersData = [];
let allPaymentsData = [];
let bookingsCurrentPage = 1;
let usersCurrentPage = 1;
let paymentsCurrentPage = 1;
let bookingsPerPage = 25;
let usersPerPage = 25;
let paymentsPerPage = 25;
let bookingsSearchTerm = '';
let usersSearchTerm = '';
let paymentsSearchTerm = '';
let bookingsFilters = { status: '', startDate: '', endDate: '', minPrice: '', maxPrice: '' };
let usersFilters = {};
let paymentsFilters = { method: '', status: '', startDate: '', endDate: '', minAmount: '', maxAmount: '' };
let bookingsSort = 'bookingDate-desc';
let usersSort = 'createdAt-desc';
let paymentsSort = 'createdAt-desc';

// ========== BOOKINGS ==========

function handleBookingsSearch(event) {
    // Always update search term to preserve input
    bookingsSearchTerm = event.target.value.toLowerCase();
    
    if (event.key === 'Enter' || event.target.value === '') {
        bookingsCurrentPage = 1;
        displayBookings();
    }
    // Keep input value
}

function filterBookings() {
    const statusFilter = document.getElementById('bookings-filter-status');
    const startDate = document.getElementById('bookings-start-date');
    const endDate = document.getElementById('bookings-end-date');
    const minPrice = document.getElementById('bookings-min-price');
    const maxPrice = document.getElementById('bookings-max-price');
    
    bookingsFilters.status = statusFilter ? statusFilter.value : '';
    bookingsFilters.startDate = startDate ? startDate.value : '';
    bookingsFilters.endDate = endDate ? endDate.value : '';
    bookingsFilters.minPrice = minPrice ? minPrice.value : '';
    bookingsFilters.maxPrice = maxPrice ? maxPrice.value : '';
    
    bookingsCurrentPage = 1;
    displayBookings();
}

function sortBookings() {
    bookingsSort = document.getElementById('bookings-sort').value;
    displayBookings();
}

function changeBookingsPerPage() {
    bookingsPerPage = parseInt(document.getElementById('bookings-per-page').value);
    bookingsCurrentPage = 1;
    displayBookings();
}

function changeBookingsPage(page) {
    let totalPages = Math.ceil(getFilteredBookings().length / bookingsPerPage);
    
    if (page === 'prev') {
        bookingsCurrentPage = Math.max(1, bookingsCurrentPage - 1);
    } else if (page === 'next') {
        bookingsCurrentPage = Math.min(totalPages, bookingsCurrentPage + 1);
    } else if (page === 1) {
        bookingsCurrentPage = 1;
    } else if (page === 999) {
        bookingsCurrentPage = totalPages;
    }
    
    displayBookings();
}

function getFilteredBookings() {
    let filtered = allBookingsData.filter(booking => {
        // Search filter
        if (bookingsSearchTerm && !(
            booking.bookingReference?.toLowerCase().includes(bookingsSearchTerm) ||
            booking.userName?.toLowerCase().includes(bookingsSearchTerm)
        )) {
            return false;
        }
        
        // Status filter
        if (bookingsFilters.status && booking.bookingStatus !== bookingsFilters.status) {
            return false;
        }
        
        // Date range filter
        if (bookingsFilters.startDate || bookingsFilters.endDate) {
            const bookingDate = new Date(booking.bookingDate || booking.createdAt);
            if (bookingsFilters.startDate) {
                const startDate = new Date(bookingsFilters.startDate);
                if (bookingDate < startDate) return false;
            }
            if (bookingsFilters.endDate) {
                const endDate = new Date(bookingsFilters.endDate + 'T23:59:59');
                if (bookingDate > endDate) return false;
            }
        }
        
        // Price range filter
        const bookingPrice = parseFloat(booking.totalAmount || 0);
        if (bookingsFilters.minPrice) {
            const minPrice = parseFloat(bookingsFilters.minPrice);
            if (bookingPrice < minPrice) return false;
        }
        if (bookingsFilters.maxPrice) {
            const maxPrice = parseFloat(bookingsFilters.maxPrice);
            if (bookingPrice > maxPrice) return false;
        }
        
        return true;
    });
    
    // Sort
    const [sortField, sortOrder] = bookingsSort.split('-');
    filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === 'bookingDate') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        
        if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    return filtered;
}

function displayBookings() {
    // Kiểm tra nếu allBookingsData chưa được load hoặc rỗng
    if (!allBookingsData || allBookingsData.length === 0) {
        const tbody = document.getElementById('bookings-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-ticket-alt"></i><h3>Chưa có đặt vé nào</h3></td></tr>';
        }
        return;
    }
    
    const filtered = getFilteredBookings();
    const start = (bookingsCurrentPage - 1) * bookingsPerPage;
    const end = start + bookingsPerPage;
    const paginated = filtered.slice(start, end);
    
    const tbody = document.getElementById('bookings-table-body');
    
    if (!tbody) {
        console.error('Element bookings-table-body not found');
        return;
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-ticket-alt"></i><h3>Chưa có đặt vé nào</h3></td></tr>';
    } else {
        tbody.innerHTML = paginated.map(booking => `
            <tr>
                <td><input type="checkbox" class="booking-checkbox" value="${booking.bookingId}" onchange="updateBulkActionsBookings()"></td>
                <td>${booking.bookingReference || 'N/A'}</td>
                <td>${booking.userName || booking.user?.fullName || 'N/A'}</td>
                <td>${booking.flight?.flightNumber || booking.route || 'N/A'}</td>
                <td>${formatCurrency(booking.totalAmount)}</td>
                <td><span class="status-badge status-${booking.bookingStatus?.toLowerCase()}">${getStatusText(booking.bookingStatus)}</span></td>
                <td>${formatDate(booking.bookingDate)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewBookingDetail(${booking.bookingId})" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${booking.bookingStatus === 'RESTORE_PENDING' ? `
                            <button class="action-btn edit" onclick="approveRestore(${booking.bookingId})" title="Duyệt khôi phục">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="action-btn delete" onclick="rejectRestore(${booking.bookingId})" title="Từ chối khôi phục">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : `
                        <button class="action-btn delete" onclick="showDeleteConfirm('Bạn có chắc chắn muốn hủy đặt vé này?', () => deleteBooking(${booking.bookingId}))" title="Hủy đặt vé">
                            <i class="fas fa-ban"></i>
                        </button>
                        `}
                    </div>
            </td>
        </tr>
    `).join('');
}

    // Update pagination info
    const totalPages = Math.max(1, Math.ceil(filtered.length / bookingsPerPage));
    document.getElementById('bookings-page-info').textContent = `Trang ${bookingsCurrentPage} / ${totalPages}`;
    
    // Update pagination buttons
    document.getElementById('bookings-page-prev').disabled = bookingsCurrentPage === 1;
    document.getElementById('bookings-page-next').disabled = bookingsCurrentPage >= totalPages || totalPages === 0;
    document.getElementById('bookings-page-first').disabled = bookingsCurrentPage === 1;
    document.getElementById('bookings-page-last').disabled = bookingsCurrentPage >= totalPages || totalPages === 0;
}

// ========== USERS ==========

function handleUsersSearch(event) {
    // Always update search term to preserve input
    const searchValue = event.target.value;
    usersSearchTerm = searchValue.toLowerCase();
    
    // Store original value for restoration
    sessionStorage.setItem('users-search-value', searchValue);
    
    if (event.key === 'Enter' || event.target.value === '') {
        usersCurrentPage = 1;
        displayUsers();
    }
    // Input value is already preserved in the input field
}

function sortUsers() {
    usersSort = document.getElementById('users-sort').value;
    displayUsers();
}

function changeUsersPerPage() {
    usersPerPage = parseInt(document.getElementById('users-per-page').value);
    usersCurrentPage = 1;
    displayUsers();
}

function changeUsersPage(page) {
    let totalPages = Math.ceil(getFilteredUsers().length / usersPerPage);
    
    if (page === 'prev') {
        usersCurrentPage = Math.max(1, usersCurrentPage - 1);
    } else if (page === 'next') {
        usersCurrentPage = Math.min(totalPages, usersCurrentPage + 1);
    } else if (page === 1) {
        usersCurrentPage = 1;
    } else if (page === 999) {
        usersCurrentPage = totalPages;
    }
    
    displayUsers();
}

function getFilteredUsers() {
    let filtered = allUsersData.filter(user => {
        // Search filter
        if (usersSearchTerm && !(
            user.username?.toLowerCase().includes(usersSearchTerm) ||
            user.email?.toLowerCase().includes(usersSearchTerm) ||
            user.fullName?.toLowerCase().includes(usersSearchTerm) ||
            user.phone?.includes(usersSearchTerm)
        )) {
            return false;
        }
        
        return true;
    });
    
    // Sort
    const [sortField, sortOrder] = usersSort.split('-');
    filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === 'createdAt') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        
        if (aVal && bVal) {
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        }
        return 0;
    });
    
    return filtered;
}

function displayUsers() {
    // Kiểm tra nếu allUsersData chưa được load hoặc rỗng
    if (!allUsersData || allUsersData.length === 0) {
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-users"></i><h3>Chưa có khách hàng nào</h3></td></tr>';
        }
        return;
    }
    
    const filtered = getFilteredUsers();
    const start = (usersCurrentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const paginated = filtered.slice(start, end);
    
    const tbody = document.getElementById('users-table-body');
    
    if (!tbody) {
        console.error('Element users-table-body not found');
        return;
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-users"></i><h3>Chưa có khách hàng nào</h3></td></tr>';
    } else {
        tbody.innerHTML = paginated.map(user => `
            <tr>
                <td><input type="checkbox" class="user-checkbox" value="${user.userId}" onchange="updateBulkActionsUsers()"></td>
                <td>${user.userId}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.fullName || user.username || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td><span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Hoạt động' : 'Không hoạt động'}</span></td>
                <td>${user.totalBookings || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewUserDetail(${user.userId})" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn view" onclick="viewUserHistory(${user.userId})" title="Xem lịch sử">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="action-btn edit" onclick="showEditUserModal(${user.userId})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="toggleUserActive(${user.userId}, ${user.isActive ? 'false' : 'true'})" title="${user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}">
                            <i class="fas ${user.isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        </button>
                    </div>
            </td>
        </tr>
    `).join('');
}

    // Update pagination info
    const totalPages = Math.max(1, Math.ceil(filtered.length / usersPerPage));
    document.getElementById('users-page-info').textContent = `Trang ${usersCurrentPage} / ${totalPages}`;
    
    // Update pagination buttons
    document.getElementById('users-page-prev').disabled = usersCurrentPage === 1;
    document.getElementById('users-page-next').disabled = usersCurrentPage >= totalPages || totalPages === 0;
    document.getElementById('users-page-first').disabled = usersCurrentPage === 1;
    document.getElementById('users-page-last').disabled = usersCurrentPage >= totalPages || totalPages === 0;
}

// ========== PAYMENTS ==========

function handlePaymentsSearch(event) {
    // Always update search term to preserve input
    const searchValue = event.target.value;
    paymentsSearchTerm = searchValue.toLowerCase();
    
    // Store original value for restoration
    sessionStorage.setItem('payments-search-value', searchValue);
    
    if (event.key === 'Enter' || event.target.value === '') {
        paymentsCurrentPage = 1;
        displayPayments();
    }
    // Input value is already preserved in the input field
}

function filterPayments() {
    const methodFilter = document.getElementById('payments-filter-method');
    const statusFilter = document.getElementById('payments-filter-status');
    const startDate = document.getElementById('payments-start-date');
    const endDate = document.getElementById('payments-end-date');
    const minAmount = document.getElementById('payments-min-amount');
    const maxAmount = document.getElementById('payments-max-amount');
    
    paymentsFilters.method = methodFilter ? methodFilter.value : '';
    paymentsFilters.status = statusFilter ? statusFilter.value : '';
    paymentsFilters.startDate = startDate ? startDate.value : '';
    paymentsFilters.endDate = endDate ? endDate.value : '';
    paymentsFilters.minAmount = minAmount ? minAmount.value : '';
    paymentsFilters.maxAmount = maxAmount ? maxAmount.value : '';
    
    paymentsCurrentPage = 1;
    displayPayments();
}

function sortPayments() {
    paymentsSort = document.getElementById('payments-sort').value;
    displayPayments();
}

function changePaymentsPerPage() {
    paymentsPerPage = parseInt(document.getElementById('payments-per-page').value);
    paymentsCurrentPage = 1;
    displayPayments();
}

function changePaymentsPage(page) {
    let totalPages = Math.ceil(getFilteredPayments().length / paymentsPerPage);
    
    if (page === 'prev') {
        paymentsCurrentPage = Math.max(1, paymentsCurrentPage - 1);
    } else if (page === 'next') {
        paymentsCurrentPage = Math.min(totalPages, paymentsCurrentPage + 1);
    } else if (page === 1) {
        paymentsCurrentPage = 1;
    } else if (page === 999) {
        paymentsCurrentPage = totalPages;
    }
    
    displayPayments();
}

function getFilteredPayments() {
    let filtered = allPaymentsData.filter(payment => {
        // Search filter
        if (paymentsSearchTerm && !(
            payment.transactionId?.toLowerCase().includes(paymentsSearchTerm) ||
            payment.paymentReference?.toLowerCase().includes(paymentsSearchTerm)
        )) {
            return false;
        }
        
        // Method filter
        if (paymentsFilters.method && payment.paymentMethod !== paymentsFilters.method) {
            return false;
        }
        
        // Status filter
        if (paymentsFilters.status && payment.status !== paymentsFilters.status) {
            return false;
        }
        
        // Date range filter
        if (paymentsFilters.startDate || paymentsFilters.endDate) {
            const paymentDate = new Date(payment.createdAt || payment.paymentDate);
            if (paymentsFilters.startDate) {
                const startDate = new Date(paymentsFilters.startDate);
                if (paymentDate < startDate) return false;
            }
            if (paymentsFilters.endDate) {
                const endDate = new Date(paymentsFilters.endDate + 'T23:59:59');
                if (paymentDate > endDate) return false;
            }
        }
        
        // Amount range filter
        const paymentAmount = parseFloat(payment.amount || 0);
        if (paymentsFilters.minAmount) {
            const minAmount = parseFloat(paymentsFilters.minAmount);
            if (paymentAmount < minAmount) return false;
        }
        if (paymentsFilters.maxAmount) {
            const maxAmount = parseFloat(paymentsFilters.maxAmount);
            if (paymentAmount > maxAmount) return false;
        }
        
        return true;
    });
    
    // Sort
    const [sortField, sortOrder] = paymentsSort.split('-');
    filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === 'createdAt' || sortField === 'paymentDate') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        
        if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    return filtered;
}

function displayPayments() {
    // Kiểm tra nếu allPaymentsData chưa được load hoặc rỗng
    if (!allPaymentsData || allPaymentsData.length === 0) {
        const tbody = document.getElementById('payments-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-credit-card"></i><h3>Chưa có thanh toán nào</h3></td></tr>';
        }
        return;
    }
    
    const filtered = getFilteredPayments();
    const start = (paymentsCurrentPage - 1) * paymentsPerPage;
    const end = start + paymentsPerPage;
    const paginated = filtered.slice(start, end);
    
    const tbody = document.getElementById('payments-table-body');
    
    if (!tbody) {
        console.error('Element payments-table-body not found');
        return;
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-credit-card"></i><h3>Chưa có thanh toán nào</h3></td></tr>';
    } else {
        tbody.innerHTML = paginated.map(payment => `
            <tr>
                <td><input type="checkbox" class="payment-checkbox" value="${payment.paymentId}" onchange="updateBulkActionsPayments()"></td>
                <td>${payment.paymentId}</td>
                <td>${payment.transactionId || payment.paymentReference || 'N/A'}</td>
                <td>${getPaymentMethodText(payment.paymentMethod)}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td><span class="status-badge status-${payment.status?.toLowerCase()}">${getPaymentStatusText(payment.status)}</span></td>
                <td>${formatDate(payment.createdAt || payment.paymentDate)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewPaymentDetail(${payment.paymentId})" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${payment.status === 'PENDING' ? `
                        <button class="action-btn approve" onclick="approvePayment(${payment.paymentId})" title="Duyệt">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn cancel" onclick="cancelPayment(${payment.paymentId})" title="Hủy">
                            <i class="fas fa-times"></i>
                        </button>
                        ` : `
                        <button class="action-btn edit" onclick="showEditPaymentModal(${payment.paymentId})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="showDeleteConfirm('Bạn có chắc chắn muốn xóa thanh toán này?', () => deletePayment(${payment.paymentId}))" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Update pagination info
    const totalPages = Math.max(1, Math.ceil(filtered.length / paymentsPerPage));
    document.getElementById('payments-page-info').textContent = `Trang ${paymentsCurrentPage} / ${totalPages}`;
    
    // Update pagination buttons
    document.getElementById('payments-page-prev').disabled = paymentsCurrentPage === 1;
    document.getElementById('payments-page-next').disabled = paymentsCurrentPage >= totalPages || totalPages === 0;
    document.getElementById('payments-page-first').disabled = paymentsCurrentPage === 1;
    document.getElementById('payments-page-last').disabled = paymentsCurrentPage >= totalPages || totalPages === 0;
}

// Payment actions for PENDING status
async function approvePayment(paymentId) {
    try {
        if (!confirm('Xác nhận duyệt thanh toán này?')) return;
        await api.updatePayment(paymentId, { status: 'SUCCESS' });
        showToast('Đã duyệt thanh toán', 'success');
        await loadPayments();
    } catch (err) {
        showToast('Duyệt thanh toán thất bại: ' + (err?.message || ''), 'error');
    }
}

async function cancelPayment(paymentId) {
    try {
        if (!confirm('Xác nhận hủy thanh toán này?')) return;
        await api.updatePayment(paymentId, { status: 'FAILED' });
        showToast('Đã hủy thanh toán', 'success');
        await loadPayments();
    } catch (err) {
        showToast('Hủy thanh toán thất bại: ' + (err?.message || ''), 'error');
    }
}

// ========== Helper Functions ==========

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
}

function getStatusText(status) {
    const statusMap = {
        'PENDING': 'Chờ xử lý',
        'CONFIRMED': 'Đã xác nhận',
        'CANCELLED': 'Đã hủy',
        'RESTORE_PENDING': 'Chờ duyệt khôi phục',
        'PAID': 'Đã thanh toán'
    };
    return statusMap[status] || status;
}

function getPaymentStatusText(status) {
    const statusMap = {
        'PENDING': 'Chờ xử lý',
        'SUCCESS': 'Thành công',
        'FAILED': 'Thất bại',
        'REFUNDED': 'Đã hoàn tiền'
    };
    return statusMap[status] || status;
}

function getPaymentMethodText(method) {
    const methodMap = {
        'VNPAY': 'VNPay',
        'MOMO': 'MoMo',
        'ZALOPAY': 'ZaloPay',
        'CARD': 'Thẻ tín dụng'
    };
    return methodMap[method] || method;
}

// ========== Loading and Error Functions ==========

function showLoading(pageId) {
    const page = document.getElementById(pageId);
    if (page) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-' + pageId;
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tải...</p>
            </div>
        `;
        page.appendChild(loadingDiv);
    }
}

function hideLoading(pageId) {
    const loadingDiv = document.getElementById('loading-' + pageId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showError(pageId, message) {
    const page = document.getElementById(pageId);
    if (page) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${message}</h3>
            </div>
        `;
        
        // Remove existing error messages
        const existingError = page.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        page.appendChild(errorDiv);
    }
}