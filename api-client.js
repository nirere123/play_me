// MusicBrainz API Client Module

const API_BASE_URL = 'https://musicbrainz.org/ws/2';
const DEFAULT_USER_AGENT = 'MusicBrainzExplorer/1.0 ( musicbrainz@example.com )';

// Request queue and cache
const requestQueue = [];
let isProcessing = false;
const cache = new Map();

// Settings
let userAgent = getFromStorage('userAgent', DEFAULT_USER_AGENT);
let cachingEnabled = getFromStorage('cachingEnabled', true);

// Update queue status in UI
function updateQueueStatus() {
    const queueStatus = document.getElementById('queue-status');
    if (queueStatus) {
        queueStatus.textContent = `Queue: ${requestQueue.length} requests`;
    }
}

// Build URL with parameters
function buildURL(endpoint, params = {}) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            url.searchParams.append(key, params[key]);
        }
    });
    // Always add JSON format
    if (!url.searchParams.has('fmt')) {
        url.searchParams.append('fmt', 'json');
    }
    return url.toString();
}

// Cache functions
function getCacheKey(endpoint, params) {
    return `${endpoint}?${JSON.stringify(params)}`;
}

function getCached(endpoint, params) {
    if (!cachingEnabled) return null;
    const key = getCacheKey(endpoint, params);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < 600000) { // 10 minutes
        return cached.data;
    }
    return null;
}

function setCached(endpoint, params, data) {
    if (!cachingEnabled) return;
    const key = getCacheKey(endpoint, params);
    cache.set(key, {
        data: data,
        timestamp: Date.now()
    });
    updateCacheStats();
}

function clearCache() {
    cache.clear();
    updateCacheStats();
    showToast('Cache cleared', 'success');
}

function updateCacheStats() {
    const cacheCount = document.getElementById('cache-count');
    if (cacheCount) {
        cacheCount.textContent = cache.size;
    }
}

// Queue request
async function queueRequest(endpoint, params = {}) {
    // Check cache first
    const cached = getCached(endpoint, params);
    if (cached) {
        return cached;
    }
    
    return new Promise((resolve, reject) => {
        requestQueue.push({ endpoint, params, resolve, reject });
        updateQueueStatus();
        processQueue();
    });
}

// Process queue
async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;
    
    isProcessing = true;
    const { endpoint, params, resolve, reject } = requestQueue.shift();
    updateQueueStatus();
    
    try {
        const url = buildURL(endpoint, params);
        const response = await fetch(url, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setCached(endpoint, params, data);
        resolve(data);
    } catch (error) {
        console.error('API Error:', error);
        reject(error);
    } finally {
        setTimeout(() => {
            isProcessing = false;
            processQueue();
        }, 1000); // 1 second rate limit
    }
}

// API Methods

// Search endpoints
async function searchArtist(query, limit = 25, offset = 0) {
    return queueRequest('/artist', { query, limit, offset });
}

async function searchRelease(query, limit = 25, offset = 0) {
    return queueRequest('/release', { query, limit, offset });
}

async function searchRecording(query, limit = 25, offset = 0) {
    return queueRequest('/recording', { query, limit, offset });
}

async function searchLabel(query, limit = 25, offset = 0) {
    return queueRequest('/label', { query, limit, offset });
}

async function searchReleaseGroup(query, limit = 25, offset = 0) {
    return queueRequest('/release-group', { query, limit, offset });
}

async function searchWork(query, limit = 25, offset = 0) {
    return queueRequest('/work', { query, limit, offset });
}

async function searchArea(query, limit = 25, offset = 0) {
    return queueRequest('/area', { query, limit, offset });
}

async function searchPlace(query, limit = 25, offset = 0) {
    return queueRequest('/place', { query, limit, offset });
}

async function searchInstrument(query, limit = 25, offset = 0) {
    return queueRequest('/instrument', { query, limit, offset });
}

// Lookup endpoints
async function lookupArtist(mbid) {
    const inc = 'releases+release-groups+recordings+works+url-rels+tags+ratings+genres';
    return queueRequest(`/artist/${mbid}`, { inc });
}

async function lookupRelease(mbid) {
    const inc = 'recordings+artists+labels+release-groups+media+discids+tags+ratings';
    return queueRequest(`/release/${mbid}`, { inc });
}

async function lookupRecording(mbid) {
    const inc = 'artists+releases+isrcs+url-rels+work-rels+tags+ratings';
    return queueRequest(`/recording/${mbid}`, { inc });
}

async function lookupLabel(mbid) {
    const inc = 'releases+artists+tags+ratings';
    return queueRequest(`/label/${mbid}`, { inc });
}

async function lookupReleaseGroup(mbid) {
    const inc = 'artists+releases+tags+ratings';
    return queueRequest(`/release-group/${mbid}`, { inc });
}

async function lookupWork(mbid) {
    const inc = 'artist-rels+recording-rels+aliases';
    return queueRequest(`/work/${mbid}`, { inc });
}

async function lookupArea(mbid) {
    const inc = 'aliases+tags';
    return queueRequest(`/area/${mbid}`, { inc });
}

async function lookupPlace(mbid) {
    const inc = 'aliases+tags';
    return queueRequest(`/place/${mbid}`, { inc });
}

async function lookupInstrument(mbid) {
    const inc = 'aliases+tags';
    return queueRequest(`/instrument/${mbid}`, { inc });
}

// Browse endpoints
async function browseReleasesByArtist(artistMbid, limit = 25, offset = 0) {
    return queueRequest('/release', { artist: artistMbid, limit, offset });
}

async function browseRecordingsByRelease(releaseMbid, limit = 100, offset = 0) {
    return queueRequest('/recording', { release: releaseMbid, limit, offset });
}

async function browseReleasesByLabel(labelMbid, limit = 25, offset = 0) {
    return queueRequest('/release', { label: labelMbid, limit, offset });
}

async function browseReleaseGroupsByArtist(artistMbid, limit = 25, offset = 0) {
    return queueRequest('/release-group', { artist: artistMbid, limit, offset });
}

async function browseWorksByArtist(artistMbid, limit = 25, offset = 0) {
    return queueRequest('/work', { artist: artistMbid, limit, offset });
}

// Non-MBID lookups
async function lookupByISRC(isrc) {
    const query = `isrc:${isrc.replace(/-/g, '')}`;
    return queueRequest('/recording', { query });
}

async function lookupByDiscID(discId) {
    const query = `discid:${discId}`;
    return queueRequest('/release', { query });
}

async function lookupByISWC(iswc) {
    const query = `iswc:${iswc}`;
    return queueRequest('/work', { query });
}

// Special endpoints
async function getAllGenres(limit = 100, offset = 0) {
    return queueRequest('/genre/all', { limit, offset });
}

// Build search query with filters
function buildSearchQuery(searchType, searchTerm, filters = {}) {
    let query = '';
    
    // Base query
    if (searchType === 'artist') {
        query = `artist:"${searchTerm}"`;
    } else if (searchType === 'release') {
        query = `release:"${searchTerm}"`;
    } else if (searchType === 'recording') {
        query = `recording:"${searchTerm}"`;
    } else if (searchType === 'label') {
        query = `label:"${searchTerm}"`;
    } else if (searchType === 'release-group') {
        query = `releasegroup:"${searchTerm}"`;
    } else if (searchType === 'work') {
        query = `work:"${searchTerm}"`;
    } else if (searchType === 'area') {
        query = `area:"${searchTerm}"`;
    } else if (searchType === 'place') {
        query = `place:"${searchTerm}"`;
    } else if (searchType === 'instrument') {
        query = `instrument:"${searchTerm}"`;
    }
    
    // Add filters
    if (filters.year) {
        query += ` AND date:${filters.year}`;
    }
    if (filters.country) {
        query += ` AND country:${filters.country.toUpperCase()}`;
    }
    if (filters.type) {
        query += ` AND type:${filters.type}`;
    }
    
    return query;
}

// Update settings
function updateUserAgent(newUserAgent) {
    userAgent = newUserAgent;
    setToStorage('userAgent', newUserAgent);
}

function updateCachingEnabled(enabled) {
    cachingEnabled = enabled;
    setToStorage('cachingEnabled', enabled);
    if (!enabled) {
        clearCache();
    }
}

// Initialize cache stats
updateCacheStats();
