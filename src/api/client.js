const TOKEN_KEY = 'folio_quill_session_token';
const DRAFT_PREFIX = 'folio_quill_draft_';

// In-memory storage ensures full functionality even when browser iframe policies block localStorage
let memoryToken = '';
const memoryDrafts = new Map();

export function getStoredToken() {
  if (memoryToken) return memoryToken;
  try {
    const stored = localStorage.getItem(TOKEN_KEY) || '';
    if (stored) memoryToken = stored;
    return stored;
  } catch {
    return memoryToken;
  }
}

export function setStoredToken(token) {
  memoryToken = token || '';
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore iframe localStorage restriction
  }
}

// Local draft recovery supplement (works in-memory + localStorage when available)
export function saveLocalDraftBackup(chapterId, payload) {
  if (!chapterId) return;
  const entry = {
    ...payload,
    backedUpAt: new Date().toISOString()
  };
  memoryDrafts.set(chapterId, entry);
  try {
    localStorage.setItem(`${DRAFT_PREFIX}${chapterId}`, JSON.stringify(entry));
  } catch {
    // ignore quota or iframe storage restrictions
  }
}

export function getLocalDraftBackup(chapterId) {
  if (!chapterId) return null;
  if (memoryDrafts.has(chapterId)) {
    return memoryDrafts.get(chapterId);
  }
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${chapterId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearLocalDraftBackup(chapterId) {
  if (!chapterId) return;
  memoryDrafts.delete(chapterId);
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${chapterId}`);
  } catch {
    // ignore
  }
}

export async function apiRequest(path, options = {}) {
  const token = getStoredToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.error) errorMessage = errData.error;
    } catch {
      // ignore json parse failure
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response;
}

export async function downloadExportFile(projectId, format, fallbackFilename) {
  const token = getStoredToken();
  const response = await fetch(`/api/publishing/${projectId}/export/${format}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    let errorMessage = `Export failed (${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.error) errorMessage = errData.error;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    // A JSON body on an export response is an error payload, not a book file.
    let errorMessage = 'Export failed. Please try again.';
    try {
      const errData = await response.json();
      if (errData?.error) errorMessage = errData.error;
    } catch {
      // keep the friendly fallback message
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error('The export came back empty. Please try again.');
  }
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : fallbackFilename;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  // Revoking the object URL immediately can cancel the download before the
  // browser starts reading the blob (notably Firefox/Safari). Keep the link
  // and URL alive briefly so every browser can begin the transfer.
  window.setTimeout(() => {
    a.remove();
    window.URL.revokeObjectURL(url);
  }, 4000);
  return { filename, size: blob.size };
}
