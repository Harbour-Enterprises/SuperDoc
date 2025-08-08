window.__IS_DEBUG__ = false;

const debugMode = true;
const logMessage = (...message) => {
    if (!debugMode) return;
    console.log(...message);
}

logMessage('Editor page loaded - waiting for WebSocket authentication');

// Global state
let superdocInstance = null;
let isAuthenticated = false;
let authToken = null;
let authTimeout = null;
let currentDocumentMode = 'editing'; // Track current document mode

// Connection status indicator
function createConnectionStatus() {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'connection-status';
    statusIndicator.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: white;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        font-family: "Segoe UI", sans-serif;
        font-size: 14px;
        font-weight: 500;
    `;
    
    statusIndicator.innerHTML = `
        <div id="connection-dot" style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ccc;
            animation: connectionPulse 2s ease-in-out infinite;
        "></div>
        <span id="connection-text">Connecting...</span>
    `;
    
    // CSS animations are now in editor.css
    
    
    document.body.appendChild(statusIndicator);
}

function updateConnectionStatus(status, color) {
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-text');
    
    if (dot && text) {
        dot.style.background = color;
        dot.style.animation = ''; // Remove any existing animation
        text.textContent = status;
        text.style.color = color;
    }
}

function showSyncingStatus() {
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-text');
    
    if (dot && text) {
        dot.style.background = '#28a745';
        dot.style.animation = 'syncPulse 1.5s ease-out';
        text.textContent = 'Syncing...';
        text.style.color = '#28a745';
        
        // Revert to Connected after animation
        setTimeout(() => {
            if (dot && text) {
                dot.style.animation = '';
                text.textContent = 'Connected';
            }
        }, 1500);
    }
}


// Utility function
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// SuperDoc configuration
const baseConfig = {
    selector: '#superdoc',
    toolbar: '#my-toolbar',
    modules: {
        toolbar: {
            selector: '#my-toolbar',
            responsiveToContainer: true,
            excludeItems: ['documentMode']
        },
        comments: {}
    },
    role: 'editor',
    documentMode: 'editing',
    user: {
        name: 'Superdoc User',
        email: 'superdoc@example.com',
        image: 'image-url.jpg',
    },
    pagination: true,
    rulers: true,
    onReady: () => logMessage('SuperDoc is ready'),
    onEditorUpdate: debounce(async () => {
        if (!window.documentWebSocket || window.documentWebSocket.readyState !== WebSocket.OPEN || !authToken) {
            return;
        }

        try {
            const docxBlob = await superdocInstance.activeEditor.exportDocx();
            const base64Document = await blobToBase64(docxBlob);
            
            window.documentWebSocket.send(JSON.stringify({
                type: 'document_update',
                token: authToken,
                document: base64Document,
                mode: currentDocumentMode
            }));
            
            logMessage('📤 Document update sent via WebSocket');
        } catch (error) {
            console.error('❌ Error sending document update:', error);
        }
    }, 1000),
    onEditorCreate: () => logMessage('Editor created')
};

// Utility functions
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(base64, mimeType) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
}

function hideAllContainers() {
    const containers = ['superdoc-container', 'auth-required-container', 'loading-container', 'error-container', 'timeout-container'];
    containers.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
}

function createContainer(id, content, styles = '') {
    let container = document.getElementById(id);
    if (!container) {
        container = document.createElement('div');
        container.id = id;
        container.style.cssText = `
            display: block;
            margin-top: -40px;
            width: 100%;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
            padding: 0 20px;
            position: relative;
            z-index: 5;
            ${styles}
        `;
        document.body.appendChild(container);
    }
    container.innerHTML = content;
    container.style.display = 'block';
    return container;
}

// UI state functions
function showLoadingState() {
    hideAllContainers();
    createContainer('loading-container', `
        <div class="state-card">
            <div class="loading-spinner">
                <div class="loading-spinner-inner"></div>
            </div>
            <div class="state-title">Loading Document Editor</div>
            <div id="loading-message" class="state-message">Connecting and authenticating...</div>
        </div>
    `);
}

function showTimeoutState() {
    hideAllContainers();
    createContainer('timeout-container', `
        <div class="state-card">
            <div class="timeout-icon">!</div>
            <div class="state-title">Couldn't Load Document</div>
            <div class="state-message">Make sure you're authenticated.</div>
        </div>
    `);
}

function showErrorState(errorMessage) {
    hideAllContainers();
    createContainer('error-container', `
        <div class="state-card">
            <div class="error-icon">✗</div>
            <div class="state-title">Authentication Error</div>
            <div class="state-message">${errorMessage}</div>
        </div>
    `);
}

function showAuthenticatedUI(user) {
    hideAllContainers();
    document.getElementById('superdoc-container').style.display = 'block';
    
    // Populate user card
    const userCardContainer = document.querySelector('.user-card');
    if (userCardContainer) {
        const userName = user.name || 'User';
        const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        const avatarHTML = user.picture && user.picture.trim() !== '' 
            ? `<img src="${user.picture}" alt="User Avatar">`
            : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #8968f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">${initials}</div>`;
        
        userCardContainer.innerHTML = `
            <div class="user-avatar">${avatarHTML}</div>
            <div class="user-details">
                <div class="user-name">${userName}</div>
                <div class="user-email">${user.email}</div>
            </div>
        `;
    }
}

// WebSocket message handlers
const messageHandlers = {
    client_ready: () => {
        // Another client is ready - nothing to do for browser
        logMessage('📡 Another client is ready');
    },
    
    token_transfer: async (message) => {
        // Clear the auth timeout since we received a response
        if (authTimeout) {
            clearTimeout(authTimeout);
            authTimeout = null;
        }
        
        if (message.error) {
            logMessage('❌ Token transfer failed:', message.error);
            updateConnectionStatus('Disconnected', '#ff8800');
            showErrorState('Authentication failed. Please try again from the Word add-in.');
            return;
        }
        
        if (message.token && message.user) {
            logMessage('✅ Token received and authenticated');
            isAuthenticated = true;
            authToken = message.token;
            updateConnectionStatus('Connected', '#28a745');
            
            // Update SuperDoc baseConfig with user info
            baseConfig.user = {
                name: message.user.name || 'SuperDoc User',
                email: message.user.email || 'superdoc@example.com',
                image: message.user.picture || 'image-url.jpg'
            };
            
            showAuthenticatedUI(message.user);
            await loadDocumentFromServer();
        }
    },
    
    document_update: (message) => {
        if (!message.document || !isAuthenticated) return;
        
        try {
            logMessage('📡 Received document update from:', message.author);
            showSyncingStatus(); // Show syncing animation
            
            const documentBlob = base64ToBlob(message.document, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            const documentFile = new File([documentBlob], 'document.docx', { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
            
            // Use the mode from the message if available, otherwise use current mode
            const documentMode = message.mode || currentDocumentMode;
            
            superdocInstance = new SuperDocLibrary.SuperDoc({
                ...baseConfig, 
                document: documentFile,
                documentMode: documentMode
            });
            
            // Update our tracked mode and dropdown
            currentDocumentMode = documentMode;
            updateModeDropdown(documentMode);
            
            logMessage('🔄 SuperDoc reinitialized with updated document');
        } catch (error) {
            console.error('❌ Error updating document:', error);
        }
    },
    
    close: () => {
        logMessage('📡 Another client disconnected');
        updateConnectionStatus('Disconnected', '#ff8800');
    },
    
    error: () => {
        logMessage('❌ Connection error occurred');
        updateConnectionStatus('Connection Error', '#dc3545');
    },
    
    update_mode: async (message) => {
        logMessage('🎯 Mode update received from:', message.author);
        console.log(`📝 Document mode changed: ${message.previousMode} → ${message.mode} (from ${message.author})`);
        
        // Re-initialize SuperDoc with the new document mode
        const mode = message.mode;
        if (['editing', 'suggesting', 'viewing'].includes(mode)) {
            if (superdocInstance) {
                console.log(`📝 Re-initializing SuperDoc with mode: ${mode}`);
                
                // Save current document before re-initialization
                let currentDocument = null;
                try {
                    const docxBlob = await superdocInstance.activeEditor.exportDocx();
                    currentDocument = new File([docxBlob], 'document.docx', {
                        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                    console.log('📄 Current document saved for re-initialization');
                } catch (error) {
                    console.log('⚠️ Could not export current document:', error.message);
                }
                
                // Re-create SuperDoc instance with new documentMode and preserved document
                const config = {
                    ...baseConfig,
                    documentMode: mode
                };
                
                if (currentDocument) {
                    config.document = currentDocument;
                }
                
                superdocInstance = new SuperDocLibrary.SuperDoc(config);
                console.log('🔄 SuperDoc re-initialized with new mode', superdocInstance);
                setTimeout(() => superdocInstance.toolbar.updateToolbarState(), 500);

                // Update our tracked mode and dropdown
                currentDocumentMode = mode;
                updateModeDropdown(mode);
                window.superdocInstance = superdocInstance;
                console.log(`✅ SuperDoc re-initialized with mode: ${mode}`);
            } else {
                console.log('⚠️ SuperDoc instance not available');
            }
        } else {
            console.log(`⚠️ Invalid mode received: ${mode}`);
        }
    }
};

// Document loading
async function loadDocumentFromServer() {
    logMessage('📄 Loading document from server...');
    
    if (!authToken) {
        console.error('❌ No auth token available');
        superdocInstance = new SuperDocLibrary.SuperDoc(baseConfig);
        return;
    }
    
    try {
        const response = await fetch('/document', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Document request failed:', response.status, errorText);
            showErrorState(`Failed to load document: ${response.status}`);
            return;
        }
        
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/vnd.openxmlformats-officedocument')) {
            const blob = await response.blob();
            const documentFile = new File([blob], 'document.docx', {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            
            superdocInstance = new SuperDocLibrary.SuperDoc({
                ...baseConfig, 
                document: documentFile
            });

                    window.superdocInstance = superdocInstance;
            
            logMessage('SuperDoc initialized with document');
        } else {
            superdocInstance = new SuperDocLibrary.SuperDoc(baseConfig);
            logMessage('SuperDoc initialized with empty document');
        }
    } catch (error) {
        console.error('Error loading document:', error);
        showErrorState(`Failed to load document: ${error.message}`);
    }
}

// WebSocket initialization
function initializeWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
        logMessage('🔌 WebSocket connection opened');
        createConnectionStatus();
        updateConnectionStatus('Connecting...', '#ccc');
        showLoadingState();
        
        // Set timeout for token_transfer event
        authTimeout = setTimeout(() => {
            logMessage('❌ Authentication timeout - no token received');
            updateConnectionStatus('Disconnected', '#ff8800');
            showTimeoutState();
        }, 2000);
        
        // Send ready message to trigger authentication flow
        websocket.send(JSON.stringify({
            type: 'client_ready'
        }));
    };
    
    websocket.onmessage = async (event) => {
        try {
            const message = JSON.parse(event.data);
            logMessage('📨 WebSocket message received:', message.type);
            
            const handler = messageHandlers[message.type];
            if (handler) {
                await handler(message);
            } else {
                logMessage('📨 Unhandled message type:', message.type);
            }
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
        }
    };
    
    websocket.onclose = () => logMessage('🔌 WebSocket connection closed');
    websocket.onerror = (error) => console.error('❌ WebSocket error:', error);
    
    window.documentWebSocket = websocket;
}

// Update document mode dropdown
function updateModeDropdown(mode) {
    const modeText = document.getElementById('mode-text');
    const modeOptions = document.querySelectorAll('.mode-option');
    
    if (modeText) {
        // Update the button text with appropriate icon
        const icons = {
            'editing': '<i class="fas fa-pencil-alt"></i> Editing',
            'suggesting': '<i class="fas fa-comment"></i> Suggesting',
            'viewing': '<i class="fas fa-eye"></i> Viewing'
        };
        modeText.innerHTML = icons[mode] || mode;
        
        // Update selected state in options
        modeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === mode) {
                option.classList.add('selected');
            }
        });
        
        console.log(`📋 Dropdown updated to: ${mode}`);
    }
}

// Handle document mode dropdown changes
function setupModeDropdown() {
    const modeButton = document.getElementById('mode-button');
    const modeOptions = document.getElementById('mode-options');
    const modeOptionElements = document.querySelectorAll('.mode-option');
    
    if (modeButton && modeOptions) {
        // Set initial value
        updateModeDropdown(currentDocumentMode);
        
        // Toggle dropdown visibility
        modeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isVisible = modeOptions.style.display === 'block';
            modeOptions.style.display = isVisible ? 'none' : 'block';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            modeOptions.style.display = 'none';
        });
        
        // Handle option selection
        modeOptionElements.forEach(option => {
            option.addEventListener('click', async (event) => {
                event.stopPropagation();
                const newMode = option.dataset.value;
                console.log(`📋 User selected mode: ${newMode}`);
                
                // Hide dropdown
                modeOptions.style.display = 'none';
                
                if (newMode !== currentDocumentMode && superdocInstance) {
                    // Re-initialize SuperDoc with new mode (preserve document)
                    try {
                        // Save current document before re-initialization
                        let currentDocument = null;
                        try {
                            const docxBlob = await superdocInstance.activeEditor.exportDocx();
                            currentDocument = new File([docxBlob], 'document.docx', {
                                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                            });
                            console.log('📄 Current document saved for mode change');
                        } catch (error) {
                            console.log('⚠️ Could not export current document:', error.message);
                        }
                        
                        // Re-create SuperDoc instance with new mode
                        const config = {
                            ...baseConfig,
                            documentMode: newMode
                        };
                        
                        if (currentDocument) {
                            config.document = currentDocument;
                        }
                        
                        const previousMode = currentDocumentMode;
                        
                        superdocInstance = new SuperDocLibrary.SuperDoc(config);
                        currentDocumentMode = newMode;
                        updateModeDropdown(newMode);
                        window.superdocInstance = superdocInstance;
                        
                        // Send mode update via WebSocket
                        if (window.documentWebSocket && window.documentWebSocket.readyState === WebSocket.OPEN && authToken) {
                            window.documentWebSocket.send(JSON.stringify({
                                type: 'update_mode',
                                token: authToken,
                                mode: newMode,
                                previousMode: previousMode
                            }));
                            console.log(`📤 Sent mode update via WebSocket: ${previousMode} → ${newMode}`);
                        }
                        
                        console.log(`✅ SuperDoc mode changed to: ${newMode}`);
                    } catch (error) {
                        console.error('❌ Error changing mode:', error);
                        // Revert dropdown to previous state
                        updateModeDropdown(currentDocumentMode);
                    }
                }
            });
        });
        
        console.log('📋 Document mode dropdown initialized');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupModeDropdown();
        initializeWebSocket();
    });
} else {
    setupModeDropdown();
    initializeWebSocket();
}