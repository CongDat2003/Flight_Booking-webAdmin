// ============================================
// FLIGHT BOOKING ADMIN - API CALLS (FULL VERSION)
// ============================================

const API_BASE_URL = 'http://192.168.10.9:501/api';

// Lightweight 30s cache and in-flight de-dup for GET requests
const __apiCache = new Map();
const __inflight = new Map();

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    try {
        const method = (options.method || 'GET').toUpperCase();
        const key = `${method}:${endpoint}`;
        if (method === 'GET') {
            // Serve from cache if fresh
            const cached = __apiCache.get(key);
            if (cached && Date.now() - cached.t < 30000) {
                return cached.v;
            }
            // De-duplicate concurrent GETs
            if (__inflight.has(key)) return await __inflight.get(key);
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            mode: 'cors'
        });

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        if (response.status === 204) return true;
        const textPromise = response.text();
        if (method === 'GET') __inflight.set(key, textPromise);
        const text = await textPromise;
        if (method === 'GET') __inflight.delete(key);
        if (!text) return true;
        const parsed = JSON.parse(text);
        if (method === 'GET') __apiCache.set(key, { t: Date.now(), v: parsed });
        return parsed;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// AUTH API
// ============================================

class AuthAPI {
    async login(username, password) {
        const response = await apiCall('/Auth/login', {
            method: 'POST',
            body: JSON.stringify({
                usernameOrEmail: username,
                password: password
            })
        });
        return response;
    }
}

// ============================================
// DASHBOARD API
// ============================================

class DashboardAPI {
    async getStats() {
        return await apiCall('/admin/Dashboard/stats', { method: 'GET' });
    }

    async getRevenueByYear(year) {
        return await apiCall(`/admin/Dashboard/revenue/${year}`, { method: 'GET' });
    }

    async getPopularRoutes(topCount = 10) {
        return await apiCall(`/admin/Dashboard/popular-routes?topCount=${topCount}`, { method: 'GET' });
    }

    async getAirlineStats() {
        return await apiCall('/admin/Dashboard/airline-stats', { method: 'GET' });
    }
}

// ============================================
// USERS API
// ============================================

class UsersAPI {
    async getUsers() {
        return await apiCall('/admin/Users');
    }

    async getUserById(userId) {
        return await apiCall(`/admin/Users/${userId}`);
    }
    
    async createUser(data) {
        return await apiCall('/admin/Users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async updateUser(id, data) {
        return await apiCall(`/admin/Users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteUser(id) {
        return await apiCall(`/admin/Users/${id}`, {
            method: 'DELETE'
        });
    }
}

// ============================================
// FLIGHTS API
// ============================================

class FlightsAPI {
    async getFlights(page = 1, pageSize = 1000) {
        return await apiCall(`/admin/Flights?page=${page}&pageSize=${pageSize}`);
    }

    async getFlightById(flightId) {
        return await apiCall(`/admin/Flights/${flightId}`);
    }

    async createFlight(flightData) {
        return await apiCall('/admin/Flights', {
            method: 'POST',
            body: JSON.stringify(flightData)
        });
    }

    async updateFlight(flightId, flightData) {
        return await apiCall(`/admin/Flights/${flightId}`, {
            method: 'PUT',
            body: JSON.stringify(flightData)
        });
    }

    async deleteFlight(flightId) {
        return await apiCall(`/admin/Flights/${flightId}`, {
            method: 'DELETE'
        });
    }
}

// ============================================
// BOOKINGS API
// ============================================

class BookingsAPI {
    async getBookings() {
        return await apiCall('/Bookings');
    }

    async getAdminBookings() {
        return await apiCall('/admin/Bookings');
    }

    async getBookingById(bookingId) {
        return await apiCall(`/Bookings/${bookingId}`);
    }
    
    async getUserBookings(userId) {
        return await apiCall(`/Bookings/user/${userId}`);
    }
    
    async createBooking(data) {
        return await apiCall('/Bookings', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async updateBooking(id, data) {
        return await apiCall(`/Bookings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async updateBookingStatus(bookingId, status) {
        return await apiCall(`/Bookings/${bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ bookingStatus: status })
        });
    }
    
    async deleteBooking(bookingId) {
        return await apiCall(`/Bookings/${bookingId}`, {
            method: 'DELETE'
        });
    }

    async cancelBooking(bookingId) {
        return await apiCall(`/Bookings/${bookingId}`, {
            method: 'DELETE'
        });
    }
}

// ============================================
// AIRLINES API
// ============================================

class AirlinesAPI {
    async getAirlines() {
        return await apiCall('/Airlines');
    }
    
    async getAirlineById(airlineId) {
        return await apiCall(`/Airlines/${airlineId}`);
    }
    
    async createAirline(airlineData) {
        return await apiCall('/Airlines', {
            method: 'POST',
            body: JSON.stringify(airlineData)
        });
    }
    
    async updateAirline(airlineId, airlineData) {
        return await apiCall(`/Airlines/${airlineId}`, {
            method: 'PUT',
            body: JSON.stringify(airlineData)
        });
    }
    
    async deleteAirline(airlineId) {
        return await apiCall(`/Airlines/${airlineId}`, {
            method: 'DELETE'
        });
    }
}

// ============================================
// AIRPORTS API
// ============================================

class AirportsAPI {
    async getAirports() {
        return await apiCall('/Airports');
    }
    
    async getAirportById(airportId) {
        return await apiCall(`/Airports/${airportId}`);
    }
    
    async createAirport(airportData) {
        return await apiCall('/Airports', {
            method: 'POST',
            body: JSON.stringify(airportData)
        });
    }
    
    async updateAirport(airportId, airportData) {
        return await apiCall(`/Airports/${airportId}`, {
            method: 'PUT',
            body: JSON.stringify(airportData)
        });
    }
    
    async deleteAirport(airportId) {
        return await apiCall(`/Airports/${airportId}`, {
            method: 'DELETE'
        });
    }
}

// ============================================
// AIRCRAFT TYPES API
// ============================================

class AircraftTypesAPI {
    async getAircraftTypes() {
        return await apiCall('/AircraftTypes');
    }
    
    async getAircraftTypeById(typeId) {
        return await apiCall(`/AircraftTypes/${typeId}`);
    }
    
    async createAircraftType(typeData) {
        return await apiCall('/AircraftTypes', {
            method: 'POST',
            body: JSON.stringify(typeData)
        });
    }
    
    async updateAircraftType(typeId, typeData) {
        return await apiCall(`/AircraftTypes/${typeId}`, {
            method: 'PUT',
            body: JSON.stringify(typeData)
        });
    }
    
    async deleteAircraftType(typeId) {
        return await apiCall(`/AircraftTypes/${typeId}`, {
            method: 'DELETE'
        });
    }
}

// ============================================
// PAYMENTS API
// ============================================

class PaymentsAPI {
    async getPayments() {
        return await apiCall('/Payment');
    }
    
    async getPaymentById(paymentId) {
        return await apiCall(`/Payment/${paymentId}`);
    }
    
    async createPayment(data) {
        return await apiCall('/Payment', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async updatePayment(id, data) {
        return await apiCall(`/Payment/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async deletePayment(id) {
        return await apiCall(`/Payment/${id}`, {
            method: 'DELETE'
        });
    }
}

// ============================================
// NOTIFICATIONS API
// ============================================

class NotificationsAPI {
    async getUserNotifications(userId, page = 1, pageSize = 20) {
        return await apiCall(`/Notification/user/${userId}?page=${page}&pageSize=${pageSize}`, { method: 'GET' });
    }
    
    async markAsRead(notificationId, userId) {
        return await apiCall(`/Notification/${notificationId}/read?userId=${userId}`, {
            method: 'POST'
        });
    }
    
    async getUnreadCount(userId) {
        return await apiCall(`/Notification/user/${userId}/unread-count`, { method: 'GET' });
    }
    
    // Get all notifications for all users (admin view)
    async getAllNotificationsForAdmin(page = 1, pageSize = 50) {
        // This requires getting all users first, then their notifications
        // For now, we'll implement a helper that gets all users and aggregates
        const users = await new UsersAPI().getUsers();
        const allNotifications = [];
        for (const user of users) {
            try {
                const notifications = await this.getUserNotifications(user.userId, 1, 1000);
                // Inject userId for admin mapping later
                const withUser = Array.isArray(notifications)
                    ? notifications.map(n => ({ ...n, userId: user.userId }))
                    : [];
                allNotifications.push(...withUser);
            } catch (error) {
                console.error(`Error getting notifications for user ${user.userId}:`, error);
            }
        }
        // Sort by CreatedAt descending
        allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // Paginate
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return allNotifications.slice(start, end);
    }
}

// Auto-Approval API
class AutoApprovalAPI {
    async getAutoApprovalStats() {
        return await apiCall('/admin/AutoApproval/stats');
    }
    
    async processAutoApproval() {
        return await apiCall('/admin/AutoApproval/process', {
            method: 'POST'
        });
    }
}

// ============================================
// CHAT API
// ============================================

class ChatAPI {
    async sendMessage(userId, content, senderType = "USER") {
        return await apiCall('/Chat/send', {
            method: 'POST',
            body: JSON.stringify({ userId, content, senderType })
        });
    }
    
    async getConversation(userId = null) {
        const url = userId ? `/Chat/conversation?userId=${userId}` : '/Chat/conversation';
        return await apiCall(url);
    }
    
    async markAsRead(messageId) {
        return await apiCall(`/Chat/${messageId}/read`, { method: 'PUT' });
    }
    
    async getUnreadMessages(userId = null) {
        const url = userId ? `/Chat/unread?userId=${userId}` : '/Chat/unread';
        return await apiCall(url);
    }
    
    async getUnreadMessagesForAdmin() {
        return await apiCall('/Chat/admin/unread');
    }
    
    async markMessagesAsRead(userId) {
        return await apiCall(`/Chat/mark-read/${userId}`, { method: 'POST' });
    }
    
    async sendAdminReply(userId, content) {
        return await apiCall('/Chat/admin/reply', {
            method: 'POST',
            body: JSON.stringify({ userId, content })
        });
    }
}

// ============================================
// EXPORT API INSTANCES
// ============================================

const api = {
    auth: new AuthAPI(),
    dashboard: new DashboardAPI(),
    users: new UsersAPI(),
    flights: new FlightsAPI(),
    bookings: new BookingsAPI(),
    airlines: new AirlinesAPI(),
    airports: new AirportsAPI(),
    aircraftTypes: new AircraftTypesAPI(),
    payments: new PaymentsAPI(),
    notifications: new NotificationsAPI(),
    chat: new ChatAPI(),
    
    // Alias functions for backward compatibility
    login: (username, password) => new AuthAPI().login(username, password),
    getDashboardStats: async () => {
        try {
            return await new DashboardAPI().getStats();
        } catch (error) {
            // Fallback: Calculate stats from available data
            console.error('Dashboard API error, using fallback:', error);
            const [users, flights, bookings, payments] = await Promise.all([
                new UsersAPI().getUsers().catch(() => []),
                new FlightsAPI().getFlights().catch(() => []),
                new BookingsAPI().getBookings().catch(() => []),
                new PaymentsAPI().getPayments().catch(() => [])
            ]);
            
            return {
                totalUsers: users.length || 0,
                totalFlights: flights.length || 0,
                totalBookings: bookings.length || 0,
                totalRevenue: payments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + (p.amount || 0), 0) || 
                             bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) || 0
            };
        }
    },
    getAllUsers: () => new UsersAPI().getUsers(),
    getUserById: (id) => new UsersAPI().getUserById(id),
    getAllFlights: () => new FlightsAPI().getFlights(),
    getFlightById: (id) => new FlightsAPI().getFlightById(id),
    createFlight: (data) => new FlightsAPI().createFlight(data),
    updateFlight: (id, data) => new FlightsAPI().updateFlight(id, data),
    deleteFlight: (id) => new FlightsAPI().deleteFlight(id),
    getAllBookings: () => new BookingsAPI().getBookings(),
    getBookingById: (id) => new BookingsAPI().getBookingById(id),
    updateBookingStatus: (id, status) => new BookingsAPI().updateBookingStatus(id, status),
    cancelBooking: (id) => new BookingsAPI().cancelBooking(id),
    getAllAirlines: () => new AirlinesAPI().getAirlines(),
    getAirlineById: (id) => new AirlinesAPI().getAirlineById(id),
    createAirline: (data) => new AirlinesAPI().createAirline(data),
    updateAirline: (id, data) => new AirlinesAPI().updateAirline(id, data),
    deleteAirline: (id) => new AirlinesAPI().deleteAirline(id),
    getAllAirports: () => new AirportsAPI().getAirports(),
    getAirportById: (id) => new AirportsAPI().getAirportById(id),
    createAirport: (data) => new AirportsAPI().createAirport(data),
    updateAirport: (id, data) => new AirportsAPI().updateAirport(id, data),
    deleteAirport: (id) => new AirportsAPI().deleteAirport(id),
    getAllAircraftTypes: () => new AircraftTypesAPI().getAircraftTypes(),
    getAircraftTypeById: (id) => new AircraftTypesAPI().getAircraftTypeById(id),
    createAircraftType: (data) => new AircraftTypesAPI().createAircraftType(data),
    updateAircraftType: (id, data) => new AircraftTypesAPI().updateAircraftType(id, data),
    deleteAircraftType: (id) => new AircraftTypesAPI().deleteAircraftType(id),
    getAllPayments: () => new PaymentsAPI().getPayments(),
    getPaymentById: (id) => new PaymentsAPI().getPaymentById(id),
    
    // Convenience methods for admin panel
    getBookings: () => new BookingsAPI().getBookings(),
    getBookingById: (id) => new BookingsAPI().getBookingById(id),
    getUserBookings: (userId) => new BookingsAPI().getUserBookings(userId),
    getUsers: () => new UsersAPI().getUsers(),
    getUserById: (id) => new UsersAPI().getUserById(id),
    getPayments: () => new PaymentsAPI().getPayments(),
    
    // CRUD operations
    createBooking: (data) => new BookingsAPI().createBooking(data),
    updateBooking: (id, data) => new BookingsAPI().updateBooking(id, data),
    deleteBooking: (id) => new BookingsAPI().deleteBooking(id),
    
    createUser: (data) => new UsersAPI().createUser(data),
    updateUser: (id, data) => new UsersAPI().updateUser(id, data),
    deleteUser: (id) => new UsersAPI().deleteUser(id),
    
    createPayment: (data) => new PaymentsAPI().createPayment(data),
    updatePayment: (id, data) => new PaymentsAPI().updatePayment(id, data),
    deletePayment: (id) => new PaymentsAPI().deletePayment(id),
    
    // Notifications
    getUserNotifications: (userId, page, pageSize) => new NotificationsAPI().getUserNotifications(userId, page, pageSize),
    markNotificationAsRead: (notificationId, userId) => new NotificationsAPI().markAsRead(notificationId, userId),
    getUnreadCount: (userId) => new NotificationsAPI().getUnreadCount(userId),
    getAllNotificationsForAdmin: (page, pageSize) => new NotificationsAPI().getAllNotificationsForAdmin(page, pageSize),
    
    // Auto-Approval
    getAutoApprovalStats: () => new AutoApprovalAPI().getAutoApprovalStats(),
    processAutoApproval: () => new AutoApprovalAPI().processAutoApproval()
};
