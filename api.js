// Lapisan akses API (pola sama dengan db.js di app-lms): /public tanpa sesi, /api dengan token.
const SESSION_TOKEN_KEY = 'presensiSessionToken';
const SESSION_USER_KEY = 'presensiSessionUser';
const getToken = () => sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
const currentUser = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_USER_KEY) || 'null'); } catch (e) { return null; } };
function setSession(token, user) {
    if (token) { sessionStorage.setItem(SESSION_TOKEN_KEY, token); sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user)); }
    else { sessionStorage.removeItem(SESSION_TOKEN_KEY); sessionStorage.removeItem(SESSION_USER_KEY); }
}
class ApiError extends Error { constructor(m, status) { super(m); this.status = status; } }

async function request(path, params, { method = 'GET', body, auth } = {}) {
    const url = new URL(CONFIG.API_ORIGIN + path);
    for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null) url.searchParams.set(k, v);
    const token = auth ? getToken() : '';
    const res = await fetch(url, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch (e) { /* kosong */ }
    if (res.status === 401 && auth) { setSession(null); throw new ApiError('SESSION_EXPIRED', 401); }
    if (!res.ok) throw new ApiError(data?.error || `Permintaan gagal (${res.status})`, res.status);
    return data;
}
const apiPublic = (view, opts) => request('/public', { view }, opts);
const apiAuth = (view, params, opts) => request('/api', { view, ...params }, { ...opts, auth: true });
