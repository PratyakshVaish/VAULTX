// Main Frontend SPA Application Logic (Bold Typography System)

// Backend API target initialization
let API_BASE = '/api';

if (window.location.hostname.endsWith('onrender.com')) {
    API_BASE = 'https://vaultx-backend.onrender.com/api';
}

// Allow stored or custom API override
const savedApi = localStorage.getItem('vault_api_base');
if (savedApi) {
    API_BASE = savedApi;
}

function setCustomApiUrl(val) {
    if (val && val.trim()) {
        let clean = val.trim().replace(/\/+$/, '');
        if (!clean.endsWith('/api')) {
            clean += '/api';
        }
        API_BASE = clean;
        localStorage.setItem('vault_api_base', API_BASE);
        console.log("Updated API Target:", API_BASE);
        
        // Instant visual feedback for custom API target setting
        const input = document.getElementById('api-url-input');
        if (input) input.value = API_BASE;
    }
}

let authMode = 'login'; // 'login' or 'register'
let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('api-url-input');
    if (input) input.value = API_BASE;
    checkAuthState();
});

// Auth State Check
function checkAuthState() {
    const token = localStorage.getItem('vault_token');
    const username = localStorage.getItem('vault_username');
    const publicKey = localStorage.getItem('vault_pubkey');

    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');

    if (token && username) {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        usernameDisplay.innerText = username.toUpperCase();

        if (typeof updateCryptoInspector === 'function') {
            updateCryptoInspector(publicKey);
        }

        loadUsers();
        loadFiles();
    } else {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        userInfo.classList.add('hidden');
    }
}

// Fetch all registered users to populate recipient dropdown
async function loadUsers() {
    const select = document.getElementById('recipient-select');
    if (!select) return;

    try {
        const response = await fetch(API_BASE + '/auth/users');
        if (!response.ok) return;

        const users = await response.json();
        const currentUsername = localStorage.getItem('vault_username');

        select.innerHTML = users.map(user => `
            <option value="${escapeHtml(user)}" ${user === currentUsername ? 'selected' : ''}>
                ${escapeHtml(user.toUpperCase())} ${user === currentUsername ? '(SELF)' : ''}
            </option>
        `).join('');

    } catch (err) {
        console.error("Error loading recipient users:", err);
    }
}

// Switch Auth Tabs
function switchAuthTab(mode) {
    authMode = mode;
    document.getElementById('tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('tab-register').classList.toggle('active', mode === 'register');
    
    const notice = document.getElementById('auth-notice');
    const btn = document.getElementById('auth-submit-btn');

    if (mode === 'register') {
        notice.classList.remove('hidden');
        btn.innerHTML = 'GENERATE RSA KEYPAIR & REGISTER &rarr;';
    } else {
        notice.classList.add('hidden');
        btn.innerHTML = 'AUTHENTICATE & ENTER &rarr;';
    }
}

// Direct Auth Form Submission Handler with Automatic Render Free-Tier Wake-Up Retry Loop
async function submitAuthForm() {
    console.log("Auth Submit Triggered. Mode:", authMode, "Target URL:", API_BASE);

    const usernameInput = document.getElementById('auth-username').value.trim();
    const passwordInput = document.getElementById('auth-password').value.trim();
    const errorEl = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!usernameInput || !passwordInput) {
        if (errorEl) {
            errorEl.innerText = "PLEASE ENTER BOTH USERNAME AND PASSWORD.";
            errorEl.classList.remove('hidden');
        } else {
            alert("Please enter both username and password.");
        }
        return;
    }

    if (errorEl) errorEl.classList.add('hidden');

    const originalBtnText = submitBtn ? submitBtn.innerText : '';
    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';

    const maxRetries = 4;
    let attempt = 0;
    let success = false;
    let response = null;

    while (attempt < maxRetries && !success) {
        attempt++;
        if (submitBtn) {
            submitBtn.disabled = true;
            if (attempt === 1) {
                submitBtn.innerText = 'GENERATING CRYPTO KEYS & AUTHENTICATING...';
            } else {
                submitBtn.innerText = `WAKING UP CLOUD BACKEND (ATTEMPT ${attempt}/${maxRetries})... PLEASE WAIT`;
            }
        }

        try {
            response = await fetch(API_BASE + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });

            if (response.ok) {
                success = true;
            } else {
                const errText = await response.text();
                throw new Error(errText || 'Authentication failed');
            }
        } catch (err) {
            console.warn(`Auth attempt ${attempt} failed:`, err.message);

            if (err.message.toLowerCase().includes('already taken') || err.message.toLowerCase().includes('invalid username')) {
                if (errorEl) {
                    errorEl.innerText = err.message.toUpperCase();
                    errorEl.classList.remove('hidden');
                }
                break;
            }

            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 2500));
            } else {
                if (errorEl) {
                    errorEl.innerHTML = `CANNOT CONNECT TO BACKEND AT <a href="${API_BASE}/health" target="_blank" style="color:var(--accent); text-decoration:underline;">${API_BASE}</a>. PLEASE VERIFY API ENDPOINT BELOW.`;
                    errorEl.classList.remove('hidden');
                }
            }
        }
    }

    if (success && response) {
        try {
            const data = await response.json();
            localStorage.setItem('vault_token', data.token);
            localStorage.setItem('vault_username', data.username);
            localStorage.setItem('vault_pubkey', data.publicKey);

            checkAuthState();
        } catch (e) {
            console.error("JSON parse error:", e);
        }
    }

    if (submitBtn) {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Backward compatibility wrapper
function handleAuthSubmit(event) {
    if (event) event.preventDefault();
    submitAuthForm();
}

// Logout
function logout() {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_username');
    localStorage.removeItem('vault_pubkey');
    checkAuthState();
}

// Switch Dashboard Tabs
function switchDashTab(tabName) {
    const tabs = ['files', 'upload', 'audit'];
    tabs.forEach(t => {
        document.getElementById(`tab-content-${t}`).classList.toggle('hidden', t !== tabName);
    });

    const dashTabBtns = document.querySelectorAll('.dash-tab');
    dashTabBtns.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (tabName === 'files') loadFiles();
    if (tabName === 'upload') loadUsers();
    if (tabName === 'audit') loadAuditLogs();
}

// File Selection & Drag & Drop
function updateSelectedFile() {
    const fileInput = document.getElementById('file-input');
    if (fileInput.files.length > 0) {
        selectedFile = fileInput.files[0];
        document.getElementById('selected-filename').innerText = selectedFile.name;
        document.getElementById('selected-filesize').innerText = formatBytes(selectedFile.size);
        document.getElementById('file-details').classList.remove('hidden');
        document.getElementById('upload-btn').disabled = false;
    }
}

// Drag and drop events
const dropZone = document.getElementById('drop-zone');
if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent)';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border)';
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt.files.length > 0) {
            selectedFile = dt.files[0];
            document.getElementById('selected-filename').innerText = selectedFile.name;
            document.getElementById('selected-filesize').innerText = formatBytes(selectedFile.size);
            document.getElementById('file-details').classList.remove('hidden');
            document.getElementById('upload-btn').disabled = false;
        }
    });
}

// Upload & Encrypt File for Selected Recipient
async function handleFileUpload(event) {
    event.preventDefault();
    if (!selectedFile) return;

    const token = localStorage.getItem('vault_token');
    const recipientSelect = document.getElementById('recipient-select');
    const recipientUsername = recipientSelect ? recipientSelect.value : '';

    const progressBar = document.getElementById('upload-progress-bar');
    const progressContainer = document.getElementById('upload-progress-container');
    const statusText = document.getElementById('upload-status-text');

    progressContainer.classList.remove('hidden');
    progressBar.style.width = '30%';
    statusText.innerText = `ENCRYPTING PAYLOAD WITH AES-256-GCM & WRAPPING KEY WITH ${recipientUsername.toUpperCase()}'S RSA-2048 PUBLIC KEY...`;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('recipientUsername', recipientUsername);

    try {
        progressBar.style.width = '70%';
        const response = await fetch(API_BASE + '/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'Upload failed');
        }

        progressBar.style.width = '100%';
        statusText.innerText = `TRANSFER SUCCESS: FILE ENCRYPTED FOR ${recipientUsername.toUpperCase()}`;

        setTimeout(() => {
            progressContainer.classList.add('hidden');
            progressBar.style.width = '0%';
            selectedFile = null;
            document.getElementById('file-details').classList.add('hidden');
            document.getElementById('upload-btn').disabled = true;
            switchDashTab('files');
        }, 1000);

    } catch (err) {
        alert('Upload Error: ' + err.message);
        progressContainer.classList.add('hidden');
    }
}

// Load Files List (Sent & Received)
async function loadFiles() {
    const token = localStorage.getItem('vault_token');
    const currentUsername = localStorage.getItem('vault_username');
    const tableBody = document.getElementById('files-table-body');

    try {
        const response = await fetch(API_BASE + '/files', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch files');

        const files = await response.json();
        if (files.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center">NO ENCRYPTED FILE RECORDS FOUND IN VAULT.</td></tr>`;
            return;
        }

        tableBody.innerHTML = files.map(file => {
            const isReceived = file.recipientUsername === currentUsername;
            const isSender = file.senderUsername === currentUsername;

            let transferBadge = '';
            if (isSender && isReceived) {
                transferBadge = '<span class="badge badge-info">SELF VAULT</span>';
            } else if (isReceived) {
                transferBadge = '<span class="badge badge-success">&swarr; RECEIVED</span>';
            } else {
                transferBadge = '<span class="badge badge-security">&nearr; SENT</span>';
            }

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(file.originalFilename)}</strong>
                        <div style="margin-top:6px;">${transferBadge}</div>
                    </td>
                    <td><span class="code-snippet">${escapeHtml(file.senderUsername.toUpperCase())}</span></td>
                    <td><span class="code-snippet">${escapeHtml(file.recipientUsername.toUpperCase())}</span></td>
                    <td>${formatBytes(file.fileSize)}</td>
                    <td><span class="code-snippet">${escapeHtml(file.ivBase64)}</span></td>
                    <td>${new Date(file.uploadedAt).toLocaleString()}</td>
                    <td>
                        <div class="action-group">
                            <button class="btn btn-primary btn-sm" onclick="downloadFile(${file.id}, '${escapeHtml(file.originalFilename)}', '${file.ivBase64}')">
                                DECRYPT & DOWNLOAD
                            </button>
                            <button class="btn btn-delete btn-sm" onclick="deleteFile(${file.id})">
                                DELETE
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:#ef4444;">${err.message.toUpperCase()}</td></tr>`;
    }
}

// Download & Decrypt File
async function downloadFile(fileId, filename, ivBase64) {
    const token = localStorage.getItem('vault_token');
    const publicKey = localStorage.getItem('vault_pubkey');

    if (typeof updateCryptoInspector === 'function') {
        updateCryptoInspector(publicKey, ivBase64, "UNWRAPPING AES KEY WITH RECIPIENT'S RSA PRIVATE KEY...");
    }

    try {
        const response = await fetch(`${API_BASE}/files/${fileId}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Decryption download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (err) {
        alert('Download Error: ' + err.message);
    }
}

// Delete File
async function deleteFile(fileId) {
    if (!confirm('CONFIRM DELETE: Remove this encrypted payload record?')) return;
    const token = localStorage.getItem('vault_token');

    try {
        const response = await fetch(`${API_BASE}/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Delete failed');
        loadFiles();
    } catch (err) {
        alert(err.message);
    }
}

// Load Security Audit Logs
async function loadAuditLogs() {
    const token = localStorage.getItem('vault_token');
    const tableBody = document.getElementById('audit-table-body');

    try {
        const response = await fetch(API_BASE + '/audit', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch audit logs');

        const logs = await response.json();
        if (logs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center">NO AUDIT LOGS RECORDED.</td></tr>`;
            return;
        }

        tableBody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td><span class="code-snippet">${escapeHtml(log.username.toUpperCase())}</span></td>
                <td><strong>${escapeHtml(log.filename)}</strong></td>
                <td><span class="badge ${log.action === 'SEND_FILE' ? 'badge-info' : 'badge-success'}">${log.action}</span></td>
                <td><span class="badge ${log.status === 'SUCCESS' ? 'badge-status' : 'badge-danger'}">${log.status}</span></td>
            </tr>
        `).join('');

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:#ef4444;">${err.message.toUpperCase()}</td></tr>`;
    }
}

// Helper Utilities
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}
