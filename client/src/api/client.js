const BASE = '/api';

function tokenFor(role) {
  return localStorage.getItem(`${role}_token`);
}

export function setToken(role, token) {
  if (token) localStorage.setItem(`${role}_token`, token);
  else localStorage.removeItem(`${role}_token`);
}

export function getToken(role) {
  return tokenFor(role);
}

export async function api(path, { method = 'GET', body, role, isForm } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  const token = role ? tokenFor(role) : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.blob();

  if (!res.ok) {
    throw new Error(isJson ? data.error || 'Erreur inconnue' : 'Erreur inconnue');
  }
  return data;
}
