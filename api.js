const API_BASE_URL = 'https://student-life-backend-1.onrender.com';

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// Toast notification for cold start
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

async function apiFetch(endpoint, options = {}, timeoutMs = 55000) {
    const url = `${API_BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions = {
        ...options,
        headers: { ...getAuthHeaders(), ...(options.headers || {}) },
        cache: 'no-store',
        signal: controller.signal
    };

    console.log(`[API] ${fetchOptions.method || 'GET'} ${endpoint}`);

    try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        console.log(`[API] ${endpoint} - Status: ${response.status}`);

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
        if (error.name === 'AbortError') {
            showColdStartToast();
            const err = new Error(`Timeout: ${endpoint}`);
            err.endpoint = endpoint;
            err.isTimeout = true;
            throw err;
        }
        // Network errors (TypeError) also show cold start toast
        if (error.name === 'TypeError') {
            showColdStartToast();
        }
        error.endpoint = endpoint;
        console.error(`[API] ${endpoint} - Error:`, error.message);
        throw error;
    }
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
