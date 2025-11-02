// Flights Management Page Logic
let flightsData = [];
let flightsFiltered = [];
let flightsCurrentPage = 1;
let flightsPerPage = 25;
let flightsSearchTerm = '';
let flightsFilters = { status: '' };
let flightsSort = 'flightId-asc';

document.addEventListener('DOMContentLoaded', () => {
    initFlightsPage();
});

function initFlightsPage() {
    const searchInput = document.getElementById('flights-search');
    const statusFilter = document.getElementById('flights-status-filter');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            handleFlightsSearch({ key: 'Enter', target: searchInput });
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            filterFlights();
        });
    }

    loadFlights();
}

async function loadFlights() {
    toggleLoading(true);
    try {
        const flights = await api.getAllFlights();
        flightsData = Array.isArray(flights) ? flights : [];
        
        // Update stats
        updateFlightsStats(flightsData);
        
        applyFlightsFilters();
        renderFlightsTable();
        
        // Restore search/filter values
        restoreFlightsFilters();
    } catch (err) {
        console.error('Load flights error:', err);
        renderFlightsEmpty('Không tải được danh sách chuyến bay');
    } finally {
        toggleLoading(false);
    }
}

function restoreFlightsFilters() {
    const searchInput = document.getElementById('flights-search');
    const statusFilter = document.getElementById('flights-status-filter');
    const sortSelect = document.getElementById('flights-sort');
    const perPageSelect = document.getElementById('flights-per-page');
    
    // Restore search value from sessionStorage if available
    if (searchInput) {
        const storedValue = sessionStorage.getItem('flights-search-value');
        if (storedValue) {
            searchInput.value = storedValue;
        }
    }
    if (statusFilter && flightsFilters.status) {
        statusFilter.value = flightsFilters.status;
    }
    if (sortSelect && flightsSort) {
        sortSelect.value = flightsSort;
    }
    if (perPageSelect) {
        perPageSelect.value = flightsPerPage;
    }
}

function updateFlightsStats(flights) {
    const total = flights.length;
    const scheduled = flights.filter(f => f.status === 'SCHEDULED' || f.status === 'PREPARING' || f.status === 'DEPARTED').length;
    const delayed = flights.filter(f => f.status === 'DELAYED').length;
    const cancelled = flights.filter(f => f.status === 'CANCELLED').length;
    const completed = flights.filter(f => f.status === 'COMPLETED').length;
    
    const totalEl = document.getElementById('flights-total');
    const scheduledEl = document.getElementById('flights-scheduled');
    const delayedEl = document.getElementById('flights-delayed');
    const cancelledEl = document.getElementById('flights-cancelled');
    const completedEl = document.getElementById('flights-completed');
    
    if (totalEl) totalEl.textContent = total;
    if (scheduledEl) scheduledEl.textContent = scheduled;
    if (delayedEl) delayedEl.textContent = delayed;
    if (cancelledEl) cancelledEl.textContent = cancelled;
    if (completedEl) completedEl.textContent = completed;
}

// Airline stats table removed per requirements

// auto refresh when on flights page every 60s
let flightsAutoTimer = null;
function ensureFlightsAutoRefresh() {
    if (flightsAutoTimer) clearInterval(flightsAutoTimer);
    flightsAutoTimer = setInterval(() => {
        const container = document.getElementById('flights-page');
        if (container && container.classList.contains('active')) {
            loadFlights();
        }
    }, 60000);
}

document.addEventListener('DOMContentLoaded', ensureFlightsAutoRefresh);

function applyFlightsFilters() {
    const q = flightsSearchTerm;
    const status = flightsFilters.status;

    flightsFiltered = flightsData.filter(f => {
        const matchesQuery = !q ||
            f.flightNumber?.toLowerCase().includes(q) ||
            f.airlineName?.toLowerCase().includes(q) ||
            f.departureAirport?.toLowerCase().includes(q) ||
            f.arrivalAirport?.toLowerCase().includes(q);
        
        // Handle status filter - group PREPARING and DEPARTED with SCHEDULED
        let matchesStatus = true;
        if (status) {
            if (status === 'SCHEDULED') {
                // Match SCHEDULED, PREPARING, or DEPARTED
                matchesStatus = f.status === 'SCHEDULED' || f.status === 'PREPARING' || f.status === 'DEPARTED';
            } else {
                matchesStatus = f.status === status;
            }
        }
        
        return matchesQuery && matchesStatus;
    });

    // Sort
    const [field, order] = flightsSort.split('-');
    flightsFiltered.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];
        if (field === 'departureTime' || field === 'arrivalTime') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        if (aVal == null || bVal == null) return 0;
        if (order === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });
}

function renderFlightsTable() {
    const tbody = document.getElementById('flightsTableBody');
    if (!tbody) return;

    if (!flightsFiltered.length) {
        renderFlightsEmpty('Chưa có chuyến bay');
        renderPagination(0);
        return;
    }

    const start = (flightsCurrentPage - 1) * flightsPerPage;
    const pageData = flightsFiltered.slice(start, start + flightsPerPage);

    tbody.innerHTML = pageData.map(f => `
        <tr>
            <td>${f.flightId}</td>
            <td>${f.flightNumber}</td>
            <td>${f.departureAirport} → ${f.arrivalAirport}</td>
            <td>${formatDateTime(f.departureTime)}</td>
            <td>${formatTimeRange(f.departureTime, f.arrivalTime)}</td>
            <td>${f.airlineName}</td>
            <td>${formatCurrency(f.basePrice)}</td>
            <td><span class="status-badge status-${(f.status || 'SCHEDULED').toLowerCase()}">${f.status || 'SCHEDULED'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewFlightDetail(${f.flightId})">👁️</button>
                    <button class="action-btn edit" onclick="showEditFlightModal(${f.flightId})">✏️</button>
                    <button class="action-btn delete" onclick="confirmDeleteFlight(${f.flightId})">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    renderPagination(Math.ceil(flightsFiltered.length / flightsPerPage));
}

function renderFlightsEmpty(message) {
    const tbody = document.getElementById('flightsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">${message}</td></tr>`;
}

function renderPagination(totalPages) {
    const pageInfo = document.getElementById('flights-page-info');
    const prevBtn = document.getElementById('flights-page-prev');
    const nextBtn = document.getElementById('flights-page-next');
    const firstBtn = document.getElementById('flights-page-first');
    const lastBtn = document.getElementById('flights-page-last');
    if (!pageInfo) return;
    const total = Math.max(1, totalPages);
    pageInfo.textContent = `Trang ${flightsCurrentPage} / ${total}`;
    if (prevBtn) prevBtn.disabled = flightsCurrentPage === 1;
    if (firstBtn) firstBtn.disabled = flightsCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = flightsCurrentPage >= total;
    if (lastBtn) lastBtn.disabled = flightsCurrentPage >= total;
}

function changeFlightsPage(page) {
    const totalPages = Math.max(1, Math.ceil(flightsFiltered.length / flightsPerPage));
    if (page === 'prev') {
        flightsCurrentPage = Math.max(1, flightsCurrentPage - 1);
    } else if (page === 'next') {
        flightsCurrentPage = Math.min(totalPages, flightsCurrentPage + 1);
    } else if (page === 999) {
        flightsCurrentPage = totalPages;
    } else {
        flightsCurrentPage = Math.max(1, Math.min(totalPages, page));
    }
    renderFlightsTable();
}

function toggleLoading(show) {
    const loading = document.getElementById('loadingIndicator');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatDateTime(val) {
    if (!val) return 'N/A';
    const d = new Date(val);
    return d.toLocaleString('vi-VN');
}

function formatTimeRange(start, end) {
    if (!start || !end) return 'N/A';
    const s = new Date(start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const e = new Date(end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${s} - ${e}`;
}

function closeModal(modalId) {
    // Support both with and without parameter for compatibility
    const modal = modalId ? document.getElementById(modalId) : document.getElementById('flightModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

async function showAddFlightModal() {
    await openFlightModal('Add Flight');
}

async function showEditFlightModal(flightId) {
    await openFlightModal('Edit Flight', flightId);
}

async function openFlightModal(title, flightId) {
    const modal = document.getElementById('flightModal');
    const form = document.getElementById('flightForm');
    const modalTitle = document.getElementById('modalTitle');

    if (!modal || !form || !modalTitle) return;
    modalTitle.textContent = title;

    // Load dropdown data
    const [airlines, airports, aircraftTypes] = await Promise.all([
        api.getAllAirlines().catch(() => []),
        api.getAllAirports().catch(() => []),
        api.getAllAircraftTypes().catch(() => [])
    ]);

    let flight = null;
    if (flightId) {
        flight = await api.getFlightById(flightId).catch(() => null);
    }

    form.innerHTML = `
        <input type="hidden" id="flightId" value="${flight?.flightId || ''}">
        <div class="form-row">
            <div class="form-group">
                <label>Flight Number *</label>
                <input type="text" id="flightNumber" value="${flight?.flightNumber || ''}" required>
            </div>
            <div class="form-group">
                <label>Airline *</label>
                <select id="airlineId" required>
                    ${airlines.map(a => `<option value="${a.airlineId}" ${flight && a.airlineName===flight.airlineName ? 'selected' : ''}>${a.airlineName}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Aircraft Type *</label>
                <select id="aircraftTypeId" required>
                    ${aircraftTypes.map(t => `<option value="${t.aircraftTypeId}">${t.aircraftModel}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Departure Airport *</label>
                <select id="departureAirportId" required>
                    ${airports.map(ap => `<option value="${ap.airportId}">${ap.airportName} (${ap.airportCode})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Arrival Airport *</label>
                <select id="arrivalAirportId" required>
                    ${airports.map(ap => `<option value="${ap.airportId}">${ap.airportName} (${ap.airportCode})</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Departure Time *</label>
                <input type="datetime-local" id="departureTime" value="${toLocalInputValue(flight?.departureTime)}" required>
            </div>
            <div class="form-group">
                <label>Arrival Time *</label>
                <input type="datetime-local" id="arrivalTime" value="${toLocalInputValue(flight?.arrivalTime)}" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Base Price (VND) *</label>
                <input type="number" id="basePrice" step="0.01" value="${flight?.basePrice || ''}" required>
            </div>
            <div class="form-group">
                <label>Gate</label>
                <input type="text" id="gate" value="${flight?.gate || ''}">
            </div>
        </div>
        ${flight ? `
        <div class="form-row">
            <div class="form-group">
                <label>Trạng thái</label>
                <select id="status">
                    <option value="">Tự động</option>
                    <option value="SCHEDULED" ${flight?.status === 'SCHEDULED' ? 'selected' : ''}>Scheduled</option>
                    
                    <option value="DELAYED" ${flight?.status === 'DELAYED' ? 'selected' : ''}>Delayed</option>
                    <option value="COMPLETED" ${flight?.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                    <option value="CANCELLED" ${flight?.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
        </div>
        ` : ''}
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal('flightModal')">Hủy</button>
            <button type="submit" class="btn btn-primary">Lưu</button>
        </div>
    `;

    // Preselect dropdowns if editing
    if (flight) {
        selectByText('aircraftTypeId', flight.aircraftModel);
        selectByText('departureAirportId', flight.departureAirport);
        selectByText('arrivalAirportId', flight.arrivalAirport);
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        const flightNumber = document.getElementById('flightNumber').value.trim();
        const airlineId = document.getElementById('airlineId').value;
        const aircraftTypeId = document.getElementById('aircraftTypeId').value;
        const departureAirportId = document.getElementById('departureAirportId').value;
        const arrivalAirportId = document.getElementById('arrivalAirportId').value;
        const departureTime = document.getElementById('departureTime').value;
        const arrivalTime = document.getElementById('arrivalTime').value;
        const basePrice = document.getElementById('basePrice').value;
        
        // Flight Number validation
        if (!flightNumber || flightNumber === '') {
            showToast('Vui lòng nhập số hiệu chuyến bay', 'error');
            document.getElementById('flightNumber').focus();
            return;
        }
        
        if (flightNumber.length < 2) {
            showToast('Số hiệu chuyến bay phải có ít nhất 2 ký tự', 'error');
            document.getElementById('flightNumber').focus();
            return;
        }
        
        if (flightNumber.length > 20) {
            showToast('Số hiệu chuyến bay không được vượt quá 20 ký tự', 'error');
            document.getElementById('flightNumber').focus();
            return;
        }
        
        const flightNumberRegex = /^[A-Z0-9]+$/i;
        if (!flightNumberRegex.test(flightNumber)) {
            showToast('Số hiệu chuyến bay chỉ được chứa chữ cái và số', 'error');
            document.getElementById('flightNumber').focus();
            return;
        }
        
        // Airline validation
        if (!airlineId || airlineId === '') {
            showToast('Vui lòng chọn hãng hàng không', 'error');
            document.getElementById('airlineId').focus();
            return;
        }
        
        const airlineIdNum = parseInt(airlineId);
        if (isNaN(airlineIdNum) || airlineIdNum <= 0) {
            showToast('Hãng hàng không không hợp lệ', 'error');
            document.getElementById('airlineId').focus();
            return;
        }
        
        // Aircraft Type validation
        if (!aircraftTypeId || aircraftTypeId === '') {
            showToast('Vui lòng chọn loại máy bay', 'error');
            document.getElementById('aircraftTypeId').focus();
            return;
        }
        
        const aircraftTypeIdNum = parseInt(aircraftTypeId);
        if (isNaN(aircraftTypeIdNum) || aircraftTypeIdNum <= 0) {
            showToast('Loại máy bay không hợp lệ', 'error');
            document.getElementById('aircraftTypeId').focus();
            return;
        }
        
        // Airports validation
        if (!departureAirportId || departureAirportId === '') {
            showToast('Vui lòng chọn sân bay khởi hành', 'error');
            document.getElementById('departureAirportId').focus();
            return;
        }
        
        const departureAirportIdNum = parseInt(departureAirportId);
        if (isNaN(departureAirportIdNum) || departureAirportIdNum <= 0) {
            showToast('Sân bay khởi hành không hợp lệ', 'error');
            document.getElementById('departureAirportId').focus();
            return;
        }
        
        if (!arrivalAirportId || arrivalAirportId === '') {
            showToast('Vui lòng chọn sân bay đến', 'error');
            document.getElementById('arrivalAirportId').focus();
            return;
        }
        
        const arrivalAirportIdNum = parseInt(arrivalAirportId);
        if (isNaN(arrivalAirportIdNum) || arrivalAirportIdNum <= 0) {
            showToast('Sân bay đến không hợp lệ', 'error');
            document.getElementById('arrivalAirportId').focus();
            return;
        }
        
        if (departureAirportId === arrivalAirportId) {
            showToast('Sân bay khởi hành và sân bay đến không được trùng nhau', 'error');
            document.getElementById('arrivalAirportId').focus();
            return;
        }
        
        // Time validation
        if (!departureTime || departureTime === '') {
            showToast('Vui lòng chọn thời gian khởi hành', 'error');
            document.getElementById('departureTime').focus();
            return;
        }
        
        if (!arrivalTime || arrivalTime === '') {
            showToast('Vui lòng chọn thời gian đến', 'error');
            document.getElementById('arrivalTime').focus();
            return;
        }
        
        const depTime = new Date(departureTime);
        const arrTime = new Date(arrivalTime);
        
        if (isNaN(depTime.getTime())) {
            showToast('Thời gian khởi hành không hợp lệ', 'error');
            document.getElementById('departureTime').focus();
            return;
        }
        
        if (isNaN(arrTime.getTime())) {
            showToast('Thời gian đến không hợp lệ', 'error');
            document.getElementById('arrivalTime').focus();
            return;
        }
        
        if (arrTime <= depTime) {
            showToast('Thời gian đến phải sau thời gian khởi hành', 'error');
            document.getElementById('arrivalTime').focus();
            return;
        }
        
        // Check minimum flight duration (at least 30 minutes)
        const durationMinutes = (arrTime - depTime) / (1000 * 60);
        if (durationMinutes < 30) {
            showToast('Thời gian bay phải ít nhất 30 phút', 'error');
            document.getElementById('arrivalTime').focus();
            return;
        }
        
        // Check maximum flight duration (reasonable limit: 24 hours)
        if (durationMinutes > 1440) {
            showToast('Thời gian bay không được vượt quá 24 giờ', 'error');
            document.getElementById('arrivalTime').focus();
            return;
        }
        
        // Base Price validation
        if (!basePrice || basePrice === '') {
            showToast('Vui lòng nhập giá vé', 'error');
            document.getElementById('basePrice').focus();
            return;
        }
        
        const basePriceNum = parseFloat(basePrice);
        if (isNaN(basePriceNum)) {
            showToast('Giá vé phải là một số hợp lệ', 'error');
            document.getElementById('basePrice').focus();
            return;
        }
        
        if (basePriceNum <= 0) {
            showToast('Giá vé phải lớn hơn 0', 'error');
            document.getElementById('basePrice').focus();
            return;
        }
        
        if (basePriceNum < 10000) {
            showToast('Giá vé phải ít nhất 10,000 VNĐ', 'error');
            document.getElementById('basePrice').focus();
            return;
        }
        
        if (basePriceNum > 100000000) {
            showToast('Giá vé quá lớn (tối đa 100,000,000 VNĐ)', 'error');
            document.getElementById('basePrice').focus();
            return;
        }
        
        // Check decimal places
        const decimalPlaces = (basePrice.split('.')[1] || []).length;
        if (decimalPlaces > 2) {
            showToast('Giá vé chỉ được có tối đa 2 chữ số thập phân', 'error');
            document.getElementById('basePrice').focus();
            return;
        }
        
        // Gate validation (optional)
        const gateEl = document.getElementById('gate');
        if (gateEl && gateEl.value) {
            const gate = gateEl.value.trim();
            if (gate.length > 10) {
                showToast('Cổng không được vượt quá 10 ký tự', 'error');
                gateEl.focus();
                return;
            }
        }
        
        try {
            const payload = collectFlightPayload();
            if (flight?.flightId) {
                await api.updateFlight(flight.flightId, payload);
                showToast('Cập nhật chuyến bay thành công!', 'success');
            } else {
                await api.createFlight(payload);
                showToast('Tạo chuyến bay thành công!', 'success');
            }
            closeModal('flightModal');
            await loadFlights();
        } catch (err) {
            const errorMsg = err?.message || 'Lỗi không xác định';
            showToast('Lưu chuyến bay thất bại: ' + errorMsg, 'error');
            // Don't close modal on error - keep form values
        }
    };

    modal.style.display = 'block';
}

function collectFlightPayload() {
    const statusEl = document.getElementById('status');
    const payload = {
        flightNumber: document.getElementById('flightNumber').value,
        airlineId: parseInt(document.getElementById('airlineId').value),
        aircraftTypeId: parseInt(document.getElementById('aircraftTypeId').value),
        departureAirportId: parseInt(document.getElementById('departureAirportId').value),
        arrivalAirportId: parseInt(document.getElementById('arrivalAirportId').value),
        departureTime: new Date(document.getElementById('departureTime').value).toISOString(),
        arrivalTime: new Date(document.getElementById('arrivalTime').value).toISOString(),
        basePrice: parseFloat(document.getElementById('basePrice').value),
        gate: document.getElementById('gate').value || null
    };
    // Chỉ thêm status nếu có field (khi edit)
    if (statusEl && statusEl.value) {
        payload.status = statusEl.value;
    }
    return payload;
}

function selectByText(selectId, text) {
    const sel = document.getElementById(selectId);
    if (!sel || !text) return;
    const options = Array.from(sel.options);
    const found = options.find(o => text.includes(o.text));
    if (found) sel.value = found.value;
}

function toLocalInputValue(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function confirmDeleteFlight(flightId) {
    if (confirm('Bạn có chắc chắn muốn xóa chuyến bay này?')) {
        deleteFlight(flightId);
    }
}

async function deleteFlight(flightId) {
    try {
        await api.deleteFlight(flightId);
        showToast('Xóa chuyến bay thành công!', 'success');
        await loadFlights();
    } catch (err) {
        showToast('Xóa chuyến bay thất bại: ' + (err?.message || ''), 'error');
    }
}

async function viewFlightDetail(flightId) {
    try {
        const flight = await api.getFlightById(flightId);
        const modal = document.getElementById('flightDetailModal');
        const body = document.getElementById('flightDetailBody');
        if (!modal || !body) return;

        body.innerHTML = `
            <div class="booking-detail">
                <h4>Thông tin chuyến bay</h4>
                <p><strong>Mã chuyến bay:</strong> ${flight.flightNumber}</p>
                <p><strong>Tuyến:</strong> ${flight.departureAirport} → ${flight.arrivalAirport}</p>
                <p><strong>Hãng:</strong> ${flight.airlineName}</p>
                <p><strong>Máy bay:</strong> ${flight.aircraftModel}</p>
                <p><strong>Giờ đi:</strong> ${formatDateTime(flight.departureTime)}</p>
                <p><strong>Giờ đến:</strong> ${formatDateTime(flight.arrivalTime)}</p>
                <p><strong>Giá cơ bản:</strong> ${formatCurrency(flight.basePrice)}</p>
                <p><strong>Trạng thái:</strong> ${flight.status}</p>
                ${flight.gate ? `<p><strong>Cửa:</strong> ${flight.gate}</p>` : ''}
                <h4>Ghế</h4>
                <p><strong>Tổng ghế:</strong> ${flight.totalSeats} | <strong>Đã đặt:</strong> ${flight.bookedSeats} | <strong>Còn trống:</strong> ${flight.availableSeats}</p>
                <h4>Doanh thu</h4>
                <p>${formatCurrency(flight.revenue || 0)}</p>
            </div>
        `;
        modal.style.display = 'block';
    } catch (err) {
        showToast('Không tải được chi tiết chuyến bay', 'error');
    }
}

function closeFlightDetailModal() {
    const modal = document.getElementById('flightDetailModal');
    if (modal) modal.style.display = 'none';
}

// Toast notifications (local for flights page)
function showToast(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(a => a.remove());

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    const main = document.querySelector('.main-content') || document.body;
    main.insertBefore(alert, main.firstChild);

    setTimeout(() => alert.remove(), 4000);
}

// Flights table controls handlers
function handleFlightsSearch(event) {
    if (event.key === 'Enter' || event.target.value === '') {
        flightsSearchTerm = (event.target.value || '').toLowerCase();
        flightsCurrentPage = 1;
        applyFlightsFilters();
        renderFlightsTable();
    }
}

function filterFlights() {
    const status = document.getElementById('flights-status-filter')?.value || '';
    flightsFilters.status = status;
    flightsCurrentPage = 1;
    applyFlightsFilters();
    renderFlightsTable();
}

function sortFlights() {
    flightsSort = document.getElementById('flights-sort').value;
    applyFlightsFilters();
    renderFlightsTable();
}

function changeFlightsPerPage() {
    flightsPerPage = parseInt(document.getElementById('flights-per-page').value);
    flightsCurrentPage = 1;
    renderFlightsTable();
}



