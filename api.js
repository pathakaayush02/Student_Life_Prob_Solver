const API_BASE_URL = 'https://student-life-backend-1.onrender.com';

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// Toast notification for cold start - only shows after 15s delay
let coldStartToastTimeout = null;

function scheduleColdStartToast() {
    // Cancel any existing scheduled toast
    if (coldStartToastTimeout) {
        clearTimeout(coldStartToastTimeout);
    }
    // Schedule toast after 15 seconds
    coldStartToastTimeout = setTimeout(() => {
        showColdStartToast();
    }, 15000);
}

function cancelColdStartToast() {
    if (coldStartToastTimeout) {
        clearTimeout(coldStartToastTimeout);
        coldStartToastTimeout = null;
    }
}

function showColdStartToast() {
    const existing = document.getElementById('cold-start-toast');
    if (existing) return;

    const toast = document.createElement('div');
    toast.id = 'cold-start-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #B8860B;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideDown 0.3s ease;
    `;
    toast.textContent = 'Server is waking up, please wait a moment and try again.';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

async function apiFetch(endpoint, options = {}, timeoutMs = 60000) {
    const url = `${API_BASE_URL}${endpoint}`;
    const isRetryableMethod = !options.method || options.method === 'GET' || options.method === 'POST';
    const isRetryableError = (error) => {
        // Don't retry auth errors
        if (error.status === 401 || error.status === 403) return false;
        // Retry network errors and timeouts
        return error.name === 'TypeError' || 
               error.name === 'AbortError' || 
               error.message?.includes('Failed to fetch') ||
               error.isTimeout;
    };

    const attemptFetch = async (isRetry = false) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (!isRetry) {
            scheduleColdStartToast();
        }

        const fetchOptions = {
            ...options,
            headers: { ...getAuthHeaders(), ...(options.headers || {}) },
            cache: 'no-store',
            signal: controller.signal
        };

        try {
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            cancelColdStartToast();

            let data = {};
            try { data = await response.json(); } catch (e) {}

            if (!response.ok) {
                const error = new Error(data.message || `Failed: ${response.status}`);
                error.status = response.status;
                error.endpoint = endpoint;
                throw error;
            }
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Check if we should retry
            if (!isRetry && isRetryableMethod && isRetryableError(error)) {
                // Wait 3 seconds then retry once
                await new Promise(resolve => setTimeout(resolve, 3000));
                return attemptFetch(true);
            }
            
            // Transform error messages for network/timeout errors
            if (error.name === 'AbortError') {
                const err = new Error('Server is warming up, please wait a moment...');
                err.endpoint = endpoint;
                err.isTimeout = true;
                err.isWarming = true;
                throw err;
            }
            
            if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
                const err = new Error('Still connecting... please try again in a moment');
                err.endpoint = endpoint;
                err.isNetworkError = true;
                throw err;
            }
            
            error.endpoint = endpoint;
            throw error;
        }
    };

    return attemptFetch(false);
}

const apiLogin = (email, password) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
const apiVerifyToken = () => apiFetch('/api/auth/me');
const apiGetStudyPlans = async () => { const d = await apiFetch('/api/study-plans'); return d.data || []; };
const apiCreateStudyPlan = (plan) => apiFetch('/api/study-plans', { method: 'POST', body: JSON.stringify(plan) });
const apiUpdateStudyPlan = (id, updates) => apiFetch(`/api/study-plans/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
const apiDeleteStudyPlan = (id) => apiFetch(`/api/study-plans/${id}`, { method: 'DELETE' });
const apiAddXP = (xp) => apiFetch('/api/xp', { method: 'POST', body: JSON.stringify({ xp }) });

function clearAllUserState() {
    ['token', 'clutch_exp', 'sl_study_tasks', 'slps_expenses', 'sl_savings_amount', 'sl_savings_points', 'slps_stress', 'slps_career_saved'].forEach(k => localStorage.removeItem(k));
    console.log('[Auth] All user state cleared');
}

// Keep-alive ping every 8 minutes to prevent Render free tier from sleeping (under 10 min threshold)
function keepServerAwake() {
    try {
        fetch(`${API_BASE_URL}/health`, { method: 'GET', cache: 'no-store' }).catch(() => {});
    } catch (e) {
        // Silently ignore all errors
    }
}
// Ping every 8 minutes (480000 ms)
setInterval(keepServerAwake, 480000);
// Initial ping on script load
keepServerAwake();
