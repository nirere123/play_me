// Utility Functions

// Format timestamp for display
function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Format duration in milliseconds to MM:SS
function formatDuration(ms) {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = document.getElementById('loading-message');
    messageEl.textContent = message;
    overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
}

// Validate MBID format
function isValidMBID(mbid) {
    const mbidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return mbidRegex.test(mbid);
}

// Validate ISRC format
function isValidISRC(isrc) {
    const isrcRegex = /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/i;
    return isrcRegex.test(isrc.replace(/-/g, ''));
}

// Build artist credit string
function buildArtistCredit(artistCredit) {
    if (!artistCredit || !Array.isArray(artistCredit)) return '';
    return artistCredit.map(ac => {
        const name = ac.name || (ac.artist && ac.artist.name) || '';
        const joinphrase = ac.joinphrase || '';
        return name + joinphrase;
    }).join('');
}

// Get entity type label
function getEntityTypeLabel(type) {
    const labels = {
        'artist': 'Artist',
        'release': 'Release',
        'recording': 'Recording',
        'label': 'Label',
        'release-group': 'Release Group',
        'work': 'Work',
        'area': 'Area',
        'place': 'Place',
        'instrument': 'Instrument'
    };
    return labels[type] || type;
}

// Get release type color
function getReleaseTypeColor(type) {
    const colors = {
        'Album': '#4CAF50',
        'Single': '#2196F3',
        'EP': '#FF9800',
        'Compilation': '#9C27B0',
        'Live': '#F44336',
        'Soundtrack': '#00BCD4',
        'Broadcast': '#795548'
    };
    return colors[type] || '#757575';
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Local storage helpers
function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return defaultValue;
    }
}

function setToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Error writing to localStorage:', e);
    }
}

// Group array by key
function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key] || 'Other';
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
}

// Truncate text
function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Get cover art URL
function getCoverArtUrl(mbid, size = 250) {
    return `https://coverartarchive.org/release/${mbid}/front-${size}`;
}

// Parse life span
function parseLifeSpan(lifeSpan) {
    if (!lifeSpan) return '';
    const begin = lifeSpan.begin || '';
    const end = lifeSpan.end || '';
    const ended = lifeSpan.ended;
    
    if (begin && end) {
        return `${begin} - ${end}`;
    } else if (begin && ended) {
        return `${begin} - ?`;
    } else if (begin) {
        return `Active: ${begin}`;
    }
    return '';
}

// Extract URLs from relations
function extractUrls(relations) {
    if (!relations || !Array.isArray(relations)) return [];
    return relations
        .filter(rel => rel.type === 'url' || rel.url)
        .map(rel => ({
            type: rel.type || 'website',
            url: rel.url ? rel.url.resource : (rel.target || ''),
            label: rel.type || 'Website'
        }));
}

// Sort by date
function sortByDate(items, dateField = 'date', descending = true) {
    return items.sort((a, b) => {
        const dateA = a[dateField] || '';
        const dateB = b[dateField] || '';
        return descending ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });
}
