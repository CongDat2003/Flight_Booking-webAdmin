// Login Page JavaScript
// API_BASE_URL is already declared in api.js
// Don't redeclare it here!

document.addEventListener('DOMContentLoaded', function() {
    initializeLoginPage();
});

function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        usernameOrEmail: formData.get('username'),
        password: formData.get('password')
    };
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('loginError');
    
    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Đang đăng nhập...';
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        
        console.log('Attempting login with:', { usernameOrEmail: loginData.usernameOrEmail });
        
        // Call login-admin API (chỉ cho Admin)
        const response = await fetch(`${API_BASE_URL}/Auth/login-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorText = await response.text();
                console.log('Error response text:', errorText);
                
                if (errorText) {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData.title || errorMessage;
                }
            } catch (parseError) {
                console.log('Failed to parse error response:', parseError);
                // Keep the default error message
            }
            
            if (response.status === 401) {
                errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
            } else if (response.status === 403) {
                errorMessage = 'Chỉ Admin mới có quyền truy cập Admin Panel';
            }
            
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('Login response:', result); // Debug log
        
        // Store user info (any valid response)
        if (result) {
            localStorage.setItem('adminUser', JSON.stringify(result));
            localStorage.setItem('adminToken', 'admin-logged-in'); // Simple flag
            localStorage.setItem('adminRole', result.role || 'Admin'); // Store role
            
            // Redirect to admin panel
            window.location.href = 'admin.html';
        } else {
            throw new Error('Đăng nhập thất bại');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message || 'Tên đăng nhập hoặc mật khẩu không đúng';
        errorDiv.style.display = 'block';
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Đăng nhập</span>';
    }
}

// Check if already logged in (only if on login page)
function checkAuth() {
    // Only redirect if we have a token and we're on the login page
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        const token = localStorage.getItem('adminToken');
        if (token && token !== 'undefined') {
            window.location.href = 'admin.html';
        }
    }
}

// Initialize auth check on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}
