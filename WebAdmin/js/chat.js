// Chat/Support JavaScript Functions
let currentChatUserId = null;
let chatRefreshInterval = null;

// Load chat conversations
async function loadChatConversations() {
    try {
        showLoading('customer-support-page');
        
        // 1) Lấy toàn bộ tin nhắn (để hiển thị cả cuộc trò chuyện do ADMIN chủ động mở)
        // 2) Kết hợp với danh sách unread để tính badge
        let allMessages = [];
        let unreadForAdmin = [];

        try {
            const [allConvRes, unreadRes] = await Promise.all([
                apiCall('/Chat/conversation'), // không truyền userId => trả tất cả messages
                apiCall('/Chat/admin/unread').catch(() => [])
            ]);

            if (allConvRes && allConvRes.messages) {
                allMessages = allConvRes.messages;
            } else if (Array.isArray(allConvRes)) {
                allMessages = allConvRes;
            }

            unreadForAdmin = Array.isArray(unreadRes) ? unreadRes : [];
        } catch (err) {
            console.warn('Error loading conversations:', err);
            allMessages = [];
            unreadForAdmin = [];
        }
        
        const conversations = new Map();
        
        // Group theo userId từ allMessages
        (allMessages || []).forEach(m => {
            const userId = m.userId;
            if (!userId) return; // bỏ qua tin không gắn user

            const userName = m.userName || m.user?.fullName || (m.senderType === 'ADMIN' ? 'Admin' : 'Khách hàng');
            const userEmail = m.userEmail || m.user?.email || '';
            const msgTime = new Date(m.createdAt || m.CreatedAt || Date.now());
            const content = m.content || m.Content || '';

            if (!conversations.has(userId)) {
                conversations.set(userId, {
                    userId,
                    userName,
                    userEmail,
                    lastMessage: content,
                    lastMessageTime: msgTime,
                    unreadCount: 0,
                    messages: []
                });
            } else {
                const conv = conversations.get(userId);
                if (msgTime > conv.lastMessageTime) {
                    conv.lastMessageTime = msgTime;
                    conv.lastMessage = content;
                }
            }
        });

        // Cộng dồn badge unread từ danh sách unread dành cho admin
        (unreadForAdmin || []).forEach(u => {
            const userId = u.userId;
            if (!userId) return;
            if (!conversations.has(userId)) {
                conversations.set(userId, {
                    userId,
                    userName: u.userName || 'Khách hàng',
                    userEmail: u.userEmail || '',
                    lastMessage: u.content || 'Tin nhắn mới',
                    lastMessageTime: new Date(u.createdAt || Date.now()),
                    unreadCount: 1,
                    messages: []
                });
            } else {
                conversations.get(userId).unreadCount += 1;
            }
        });
        
        // Update stats
        updateSupportStats(Array.from(conversations.values()), unreadForAdmin || []);
        
        // Render conversations
        renderConversations(Array.from(conversations.values()));
        
        hideLoading('customer-support-page');
    } catch (error) {
        console.error('Error loading conversations:', error);
        showError('customer-support-page', 'Không thể tải danh sách trò chuyện');
        hideLoading('customer-support-page');
    }
}

function apiCall(endpoint, options = {}) {
    // Load API_BASE_URL from config.js hoặc dùng default
    // Chỉ khai báo nếu chưa có từ config.js
    var apiBaseUrl = (typeof window !== 'undefined' && window.API_BASE_URL) 
        ? window.API_BASE_URL 
        : (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://192.168.10.9:501/api');
    
    const fullUrl = `${apiBaseUrl}${endpoint}`;
    console.log(`[Chat API] ${options.method || 'GET'} ${fullUrl}`);
    
    return fetch(fullUrl, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        mode: 'cors'
    }).then(async res => {
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[Chat API Error] ${fullUrl} - Status: ${res.status}`, errorText);
            throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
        }
        const text = await res.text();
        if (!text) {
            return {};
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON response:', text);
            throw new Error('Invalid JSON response');
        }
    });
}

function updateSupportStats(conversations, unreadMessages) {
    const totalConversations = conversations.length;
    // Count unread messages - check !isRead
    const unreadCount = (unreadMessages || []).filter(m => 
        m.senderType === 'USER' && !m.isRead
    ).length;
    const pendingReplies = conversations.filter(c => c.unreadCount > 0).length;
    const responseRate = totalConversations > 0 ? 
        Math.round((totalConversations - pendingReplies) / totalConversations * 100) : 0;
    
    const totalConvEl = document.getElementById('support-total-conversations');
    const unreadEl = document.getElementById('support-unread-messages');
    const pendingEl = document.getElementById('support-pending-replies');
    const rateEl = document.getElementById('support-response-rate');
    
    if (totalConvEl) totalConvEl.textContent = totalConversations;
    if (unreadEl) unreadEl.textContent = unreadCount;
    if (pendingEl) pendingEl.textContent = pendingReplies;
    if (rateEl) rateEl.textContent = responseRate + '%';
}

function renderConversations(conversations) {
    const container = document.getElementById('conversations-container');
    if (!container) return;
    
    // Sort by last message time
    conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    
    if (conversations.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Chưa có cuộc trò chuyện nào</div>';
        return;
    }
    
    container.innerHTML = conversations.map(conv => `
        <div class="conversation-item" data-user-id="${conv.userId || ''}" data-user-name="${escapeHtmlAttribute(conv.userName || 'Khách hàng')}" data-email="${escapeHtmlAttribute(conv.userEmail || '')}">
            <div class="conversation-item-header">
                <span class="conversation-user-name">${escapeHtml(conv.userName || 'Khách hàng')}</span>
                <span class="conversation-time">${formatTime(conv.lastMessageTime)}</span>
            </div>
            <div class="conversation-preview">${escapeHtml(conv.lastMessage || 'Chưa có tin nhắn')}</div>
            ${conv.unreadCount > 0 ? `<span class="conversation-badge">${conv.unreadCount}</span>` : ''}
        </div>
    `).join('');
    
    // Add event listeners after rendering
    container.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            const userName = this.dataset.userName || 'Khách hàng';
            if (userId) {
                selectConversation(parseInt(userId), userName);
            }
        });
    });
}

async function selectConversation(userId, userName) {
    if (!userId) {
        console.error('Invalid userId:', userId);
        return;
    }
    
    currentChatUserId = userId;
    
    // Update active state
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.userId == userId) {
            item.classList.add('active');
        }
    });
    
    // Show chat window
    const noConvEl = document.getElementById('no-conversation-selected');
    const chatActiveEl = document.getElementById('chat-active');
    if (noConvEl) noConvEl.style.display = 'none';
    if (chatActiveEl) chatActiveEl.style.display = 'flex';
    
    // Update header
    const nameEl = document.getElementById('chat-user-name');
    const emailEl = document.getElementById('chat-user-email');
    if (nameEl) nameEl.textContent = userName || 'Khách hàng';
    if (emailEl) {
        // Try to get email from conversation item
        const convItem = document.querySelector(`.conversation-item[data-user-id="${userId}"]`);
        const email = convItem ? convItem.dataset.email : '';
        emailEl.textContent = email || `User ID: ${userId}`;
    }
    
    // Load messages
    await loadMessages(userId);
}

// Fix for onclick handler
window.selectConversation = selectConversation;

async function loadMessages(userId) {
    try {
        console.log(`Loading messages for userId: ${userId}`);
        const conversation = await apiCall(`/Chat/conversation?userId=${userId}`);
        
        // Handle different response formats
        let messages = [];
        if (conversation && conversation.messages) {
            messages = conversation.messages;
        } else if (Array.isArray(conversation)) {
            messages = conversation;
        } else if (conversation) {
            messages = [conversation];
        }
        
        console.log(`Loaded ${messages.length} messages for userId: ${userId}`);
        renderMessages(messages);
        
        // Mark messages as read
        try {
            await apiCall(`/Chat/mark-read/${userId}`, { method: 'POST' });
        } catch (e) {
            console.error('Error marking messages as read:', e);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        showError('chat-active', 'Không thể tải tin nhắn: ' + error.message);
    }
}

function renderMessages(messages) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Chưa có tin nhắn nào</div>';
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        // Handle different property names (camelCase vs PascalCase)
        const senderType = msg.senderType || msg.SenderType || 'USER';
        const content = msg.content || msg.Content || '';
        const createdAt = msg.createdAt || msg.CreatedAt;
        const isAutoReply = msg.isAutoReply || msg.IsAutoReply || false;
        
        const isUser = senderType.toUpperCase() === 'USER';
        const time = createdAt ? formatTime(new Date(createdAt)) : '';
        
        if (isUser) {
            return `
                <div class="message-item user">
                    <div class="message-bubble">
                        <div class="message-content">${escapeHtml(content)}</div>
                        <div class="message-meta">
                            <span>${time}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="message-item admin">
                    <div class="message-bubble">
                        <div class="message-sender">${senderType === 'SYSTEM' ? 'Hệ thống' : 'Admin'}</div>
                        <div class="message-content">${escapeHtml(content)}</div>
                        <div class="message-meta">
                            <span>${time}</span>
                            ${isAutoReply ? '<span class="auto-reply-badge">Tự động</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    // Scroll to bottom
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

async function sendAdminMessage() {
    const input = document.getElementById('message-input');
    if (!input) {
        console.error('Message input not found');
        return;
    }
    
    const content = input.value.trim();
    
    if (!content) {
        alert('Vui lòng nhập tin nhắn');
        return;
    }
    
    if (!currentChatUserId) {
        alert('Vui lòng chọn một cuộc trò chuyện');
        return;
    }
    
    try {
        console.log(`Sending message to userId: ${currentChatUserId}, content: ${content}`);
        
        const response = await apiCall('/Chat/admin/reply', {
            method: 'POST',
            body: JSON.stringify({ userId: currentChatUserId, content })
        });
        
        console.log('Message sent successfully:', response);
        
        input.value = '';
        
        // Reload messages
        await loadMessages(currentChatUserId);
        
        // Reload conversations
        await loadChatConversations();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Không thể gửi tin nhắn: ' + (error.message || error));
    }
}

// Make sendAdminMessage available globally
window.sendAdminMessage = sendAdminMessage;

async function markAllAsRead() {
    if (!currentChatUserId) return;
    
    try {
        await apiCall(`/Chat/mark-read/${currentChatUserId}`, { method: 'POST' });
        
        await loadMessages(currentChatUserId);
        await loadChatConversations();
    } catch (error) {
        console.error('Error marking as read:', error);
    }
}

async function refreshMessages() {
    if (currentChatUserId) {
        await loadMessages(currentChatUserId);
    }
}

function refreshChatConversations() {
    loadChatConversations();
}

function searchConversations() {
    const searchInput = document.getElementById('conversations-search');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('.conversation-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function setupChatAutoRefresh() {
    // Clear existing interval
    if (chatRefreshInterval) {
        clearInterval(chatRefreshInterval);
    }
    
    // Refresh every 5 seconds
    chatRefreshInterval = setInterval(() => {
        if (currentPage === 'customer-support') {
            if (currentChatUserId) {
                loadMessages(currentChatUserId);
            }
            loadChatConversations();
        }
    }, 5000);
}

function formatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
    
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeHtmlAttribute(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
