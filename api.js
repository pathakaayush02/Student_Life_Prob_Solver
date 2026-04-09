const API_BASE_URL = 'https://student-life-backend-1.onrender.com';

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function apiFetch(endpoint, options = {}, timeoutMs = 10000) {
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
            const err = new Error(`Timeout: ${endpoint}`);
            err.endpoint = endpoint;
            err.isTimeout = true;
            throw err;
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
