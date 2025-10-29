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
        'flights': 'Quản lý chuyến bay'
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
    }
}

// Dashboard
async function loadDashboard() {
    try {
        showLoading('dashboard-page');
        
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

function updateDashboardStats(bookings, users, payments) {
    // Total bookings
    document.getElementById('total-bookings').textContent = bookings.length || 0;
    
    // Total users
    document.getElementById('total-users').textContent = users.length || 0;
    
    // Total revenue
    const totalRevenue = payments
        .filter(p => p.status === 'SUCCESS' || p.status === 'PAID')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
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
        
        const monthlyRevenue = getMonthlyRevenue(payments);
        revenueChart = new Chart(revenueCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: monthlyRevenue.labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: monthlyRevenue.data,
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

function getMonthlyRevenue(payments) {
    const monthlyData = {};
    const currentDate = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const key = date.toISOString().substring(0, 7);
        monthlyData[key] = 0;
    }
    
    // Sum revenue by month
    if (payments && payments.length > 0) {
        payments
            .filter(p => p.status === 'SUCCESS' || p.status === 'PAID')
            .forEach(payment => {
                const date = new Date(payment.createdAt || payment.paymentDate);
                const key = date.toISOString().substring(0, 7);
                if (monthlyData.hasOwnProperty(key)) {
                    monthlyData[key] += parseFloat(payment.amount || 0);
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
        const bookings = await api.getBookings();
        // Lưu vào global array để dùng cho search/filter/sort/pagination
        allBookingsData = bookings;
        // Gọi hàm display mới với pagination
        displayBookings();
        hideLoading('bookings-page');
    } catch (error) {
        console.error('Error loading bookings:', error);
        showError('bookings-page', 'Lỗi khi tải danh sách đặt vé');
        hideLoading('bookings-page');
    }
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
        // Gọi hàm display mới với pagination
        displayUsers();
        hideLoading('users-page');
    } catch (error) {
        console.error('Error loading users:', error);
        showError('users-page', 'Lỗi khi tải danh sách khách hàng');
        hideLoading('users-page');
    }
}

// Display function được thay thế bởi displayUsers() mới ở cuối file

// Payments
async function loadPayments() {
    try {
        showLoading('payments-page');
        const payments = await api.getPayments();
        // Lưu vào global array để dùng cho search/filter/sort/pagination
        allPaymentsData = payments;
        // Gọi hàm display mới với pagination
        displayPayments();
        hideLoading('payments-page');
    } catch (error) {
        console.error('Error loading payments:', error);
        showError('payments-page', 'Lỗi khi tải danh sách thanh toán');
        hideLoading('payments-page');
    }
}

// Display function được thay thế bởi displayPayments() mới ở cuối file

// Modals
function setupModals() {
    // Close modals when clicking X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// View Booking Detail
async function viewBookingDetail(bookingId) {
    try {
        const booking = await api.getBookingById(bookingId);
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
                            <th>Giá</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${booking.seats?.map(seat => `
                            <tr>
                                <td>${seat.seatNumber}</td>
                                <td>${seat.seatClassName}</td>
                                <td>${seat.passengerName}</td>
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

// View User History
async function viewUserHistory(userId) {
    try {
        const bookings = await api.getUserBookings(userId);
        const modal = document.getElementById('user-history-modal');
        const content = document.getElementById('user-history-content');
        
        content.innerHTML = `
            <div class="user-history">
                <h4>Lịch sử đặt vé</h4>
                ${bookings.length === 0 ? 
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
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.map(booking => `
                                <tr>
                                    <td>${booking.bookingReference}</td>
                                    <td>${booking.flight?.flightNumber || 'N/A'}</td>
                                    <td>${booking.seats?.length || 0}</td>
                                    <td>${formatCurrency(booking.totalAmount)}</td>
                                    <td><span class="status-badge status-${booking.bookingStatus?.toLowerCase()}">${getStatusText(booking.bookingStatus)}</span></td>
                                    <td>${formatDate(booking.bookingDate)}</td>
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

// View Payment Detail
async function viewPaymentDetail(paymentId) {
    try {
        const payment = await api.getPaymentById(paymentId);
        const modal = document.getElementById('booking-detail-modal');
        const content = document.getElementById('booking-detail-content');
        
        content.innerHTML = `
            <div class="payment-detail">
                <h4>Chi tiết thanh toán</h4>
                <p><strong>ID:</strong> ${payment.paymentId}</p>
                <p><strong>Mã giao dịch:</strong> ${payment.transactionId}</p>
                <p><strong>Phương thức:</strong> ${getPaymentMethodText(payment.paymentMethod)}</p>
                <p><strong>Số tiền:</strong> ${formatCurrency(payment.amount)}</p>
                <p><strong>Trạng thái:</strong> ${getStatusText(payment.status)}</p>
                <p><strong>Ngày tạo:</strong> ${formatDate(payment.createdAt)}</p>
                ${payment.paymentUrl ? `<p><strong>URL thanh toán:</strong> <a href="${payment.paymentUrl}" target="_blank">Xem</a></p>` : ''}
        </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading payment detail:', error);
        alert('Lỗi khi tải chi tiết thanh toán');
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
            api.getFlights()
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
    
    const formData = new FormData(e.target);
    const bookingData = Object.fromEntries(formData.entries());
    
    try {
        if (currentEditId) {
            // Update existing booking
            await api.updateBooking(currentEditId, bookingData);
            showAlert('Cập nhật đặt vé thành công!', 'success');
        } else {
            // Create new booking
            await api.createBooking(bookingData);
            showAlert('Tạo đặt vé thành công!', 'success');
        }
        
        closeModal('booking-form-modal');
        loadBookings();
    } catch (error) {
        console.error('Error saving booking:', error);
        showAlert('Lỗi khi lưu đặt vé: ' + error.message, 'error');
    }
}

async function deleteBooking(bookingId) {
    try {
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
        showAlert('Lỗi khi lưu khách hàng: ' + error.message, 'error');
    }
}

async function deleteUser(userId) {
    try {
        await api.deleteUser(userId);
        showAlert('Xóa khách hàng thành công!', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Lỗi khi xóa khách hàng: ' + error.message, 'error');
    }
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
        
        // Load dropdowns
        await loadPaymentDropdowns();
        
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
    
    const formData = new FormData(e.target);
    const paymentData = Object.fromEntries(formData.entries());
    
    // Convert amount to number
    paymentData.amount = parseFloat(paymentData.amount);
    
    try {
        if (currentEditId) {
            // Update existing payment
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
        showAlert('Lỗi khi lưu thanh toán: ' + error.message, 'error');
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
    document.getElementById(modalId).style.display = 'none';
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
let bookingsFilters = { status: '' };
let usersFilters = {};
let paymentsFilters = { method: '', status: '' };
let bookingsSort = 'bookingDate-desc';
let usersSort = 'createdAt-desc';
let paymentsSort = 'createdAt-desc';

// ========== BOOKINGS ==========

function handleBookingsSearch(event) {
    if (event.key === 'Enter' || event.target.value === '') {
        bookingsSearchTerm = event.target.value.toLowerCase();
        bookingsCurrentPage = 1;
        displayBookings();
    }
}

function filterBookings() {
    const statusFilter = document.getElementById('bookings-filter-status').value;
    bookingsFilters.status = statusFilter;
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
                <td>${booking.bookingReference || 'N/A'}</td>
                <td>${booking.user?.fullName || booking.userName || 'N/A'}</td>
                <td>${booking.seats?.length || booking.passengerCount || 0}</td>
                <td>${booking.flight?.flightNumber || booking.route || 'N/A'}</td>
                <td>${getSeatClasses(booking.seats) || booking.seatClass || 'N/A'}</td>
                <td>${formatCurrency(booking.totalAmount)}</td>
                <td><span class="status-badge status-${booking.bookingStatus?.toLowerCase()}">${getStatusText(booking.bookingStatus)}</span></td>
                <td>${formatDate(booking.bookingDate)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewBookingDetail(${booking.bookingId})" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn delete" onclick="showDeleteConfirm('Bạn có chắc chắn muốn hủy đặt vé này?', () => deleteBooking(${booking.bookingId}))" title="Hủy đặt vé">
                            <i class="fas fa-ban"></i>
                        </button>
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
    if (event.key === 'Enter' || event.target.value === '') {
        usersSearchTerm = event.target.value.toLowerCase();
        usersCurrentPage = 1;
        displayUsers();
    }
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
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-users"></i><h3>Chưa có khách hàng nào</h3></td></tr>';
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
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-users"></i><h3>Chưa có khách hàng nào</h3></td></tr>';
    } else {
        tbody.innerHTML = paginated.map(user => `
            <tr>
                <td>${user.userId}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.fullName || user.username || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td><span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Hoạt động' : 'Không hoạt động'}</span></td>
                <td>${user.totalBookings || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewUserHistory(${user.userId})" title="Xem lịch sử">
                            <i class="fas fa-history"></i>
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
    if (event.key === 'Enter' || event.target.value === '') {
        paymentsSearchTerm = event.target.value.toLowerCase();
        paymentsCurrentPage = 1;
        displayPayments();
    }
}

function filterPayments() {
    paymentsFilters.method = document.getElementById('payments-filter-method').value;
    paymentsFilters.status = document.getElementById('payments-filter-status').value;
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
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-credit-card"></i><h3>Chưa có thanh toán nào</h3></td></tr>';
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
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-credit-card"></i><h3>Chưa có thanh toán nào</h3></td></tr>';
    } else {
        tbody.innerHTML = paginated.map(payment => `
            <tr>
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
                        <button class="action-btn edit" onclick="showEditPaymentModal(${payment.paymentId})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
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