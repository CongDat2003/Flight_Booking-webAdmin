// Seat Management for Admin

let currentSeatManagerFlightId = null;

async function openSeatManager(flightId, flightNumber) {
    currentSeatManagerFlightId = flightId;
    const titleEl = document.getElementById('seatManagerFlightNumber');
    if (titleEl) titleEl.textContent = flightNumber || '';
    const modal = document.getElementById('seatManagerModal');
    if (modal) modal.style.display = 'block';
    await loadSeats(flightId);
    wireSeatManagerEvents();
}

async function loadSeats(flightId) {
    try {
        const seatMap = await apiCall(`/admin/Seats/by-flight/${flightId}`, { method: 'GET' });
        renderSeatGrid(seatMap?.seats || []);
    } catch (e) {
        showAlert('Không tải được danh sách ghế', 'error');
        console.error(e);
    }
}

function renderSeatGrid(seats) {
    const grid = document.getElementById('seatGrid');
    if (!grid) return;

    const filterClass = (document.getElementById('seatFilterClass')?.value || '').toUpperCase();
    const filtered = filterClass ? seats.filter(s => (s.seatClassName || '').toUpperCase() === filterClass) : seats;

    const rows = {};
    filtered.forEach(s => { rows[s.seatRow] = rows[s.seatRow] || []; rows[s.seatRow].push(s); });
    Object.values(rows).forEach(r => r.sort((a,b) => a.seatColumn.localeCompare(b.seatColumn)));

    let html = '';
    Object.keys(rows).sort((a,b)=>Number(a)-Number(b)).forEach(row => {
        html += `<div class="row"><span class="row-label">${row}</span>`;
        rows[row].forEach(s => {
            const cls = (s.seatClassName || '').toLowerCase().replace(/\s+/g, '_');
            const avail = s.isAvailable ? 'available' : 'unavailable';
            html += `<div class="seat ${cls} ${avail}" data-seat-id="${s.seatId}" title="${s.seatNumber} - ${s.seatClassName}">${s.seatNumber}</div>`;
        });
        html += `</div>`;
    });
    grid.innerHTML = html || '<p style="opacity:.7">Không có ghế phù hợp bộ lọc.</p>';

    grid.querySelectorAll('.seat').forEach(el => {
        el.addEventListener('click', () => el.classList.toggle('selected'));
        el.addEventListener('dblclick', async () => {
            const seatId = parseInt(el.dataset.seatId);
            await toggleSeatAvailability(seatId);
        });
    });
}

function selectedSeatIds() {
    return Array.from(document.querySelectorAll('#seatGrid .seat.selected')).map(el => parseInt(el.dataset.seatId));
}

function wireSeatManagerEvents() {
    const closeEl = document.getElementById('seatManagerClose');
    if (closeEl) closeEl.onclick = () => {
        const modal = document.getElementById('seatManagerModal');
        if (modal) modal.style.display = 'none';
    };

    const filter = document.getElementById('seatFilterClass');
    if (filter) filter.onchange = () => loadSeats(currentSeatManagerFlightId);

    const btnOpen = document.getElementById('bulkSetAvailable');
    if (btnOpen) btnOpen.onclick = () => bulkUpdateSeats({ seatIds: selectedSeatIds(), isAvailable: true });

    const btnLock = document.getElementById('bulkSetUnavailable');
    if (btnLock) btnLock.onclick = () => bulkUpdateSeats({ seatIds: selectedSeatIds(), isAvailable: false });

    const btnFee = document.getElementById('bulkSetExtraFee');
    if (btnFee) btnFee.onclick = async () => {
        const val = prompt('Nhập phụ phí (VND):', '0');
        if (val == null) return;
        const fee = Number(val);
        if (isNaN(fee) || fee < 0) { showAlert('Phụ phí không hợp lệ', 'error'); return; }
        await bulkUpdateSeats({ seatIds: selectedSeatIds(), extraFee: fee });
    };

    const btnRegen = document.getElementById('regenerateSeats');
    if (btnRegen) btnRegen.onclick = async () => {
        if (!confirm('Tạo lại ghế sẽ ghi đè khi chưa có ghế. Tiếp tục?')) return;
        try {
            await apiCall(`/admin/Flights/${currentSeatManagerFlightId}/generate-seats`, { method: 'POST' });
            showAlert('Đã tạo lại ghế', 'success');
            await loadSeats(currentSeatManagerFlightId);
        } catch (e) {
            showAlert('Tạo lại ghế thất bại', 'error');
        }
    };
}

async function toggleSeatAvailability(seatId) {
    try {
        // Get current class from DOM state
        const el = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
        if (!el) return;
        const willBeAvailable = !el.classList.contains('available');
        await apiCall(`/admin/Seats/${seatId}`, {
            method: 'PUT',
            body: JSON.stringify({ isAvailable: willBeAvailable })
        });
        el.classList.toggle('available', willBeAvailable);
        el.classList.toggle('unavailable', !willBeAvailable);
        showAlert('Đã cập nhật ghế', 'success');
    } catch (e) {
        showAlert('Cập nhật ghế thất bại', 'error');
    }
}

async function bulkUpdateSeats(payload) {
    try {
        if (!payload.seatIds || !payload.seatIds.length) {
            showAlert('Chưa chọn ghế', 'warning');
            return;
        }
        await apiCall('/admin/Seats/bulk', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        showAlert('Đã cập nhật', 'success');
        await loadSeats(currentSeatManagerFlightId);
    } catch (e) {
        showAlert('Cập nhật hàng loạt thất bại', 'error');
    }
}

// Expose to global
window.openSeatManager = openSeatManager;






















