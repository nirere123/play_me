// Main Application Logic

// State
let currentSearchType = 'artist';
let currentSearchTerm = '';
let currentPage = 1;
let totalResults = 0;
let resultsPerPage = 25;
let currentResults = [];
let currentDetailEntity = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadSettings();
    renderRecentSearches();
});

// Initialize event listeners
function initializeEventListeners() {
    // Search
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Search type change
    document.getElementById('search-type').addEventListener('change', (e) => {
        currentSearchType = e.target.value;
        updateSearchPlaceholder();
    });
    
    // Filter toggle
    document.getElementById('filter-toggle').addEventListener('click', toggleFilters);
    
    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
    
    // Settings
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-settings').addEventListener('click', closeSettings);
    document.getElementById('cancel-settings').addEventListener('click', closeSettings);
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // Cache
    document.getElementById('clear-cache-btn').addEventListener('click', clearCache);
}

// Update search placeholder
function updateSearchPlaceholder() {
    const input = document.getElementById('search-input');
    const placeholders = {
        'artist': 'Search for artists (e.g., The Beatles)',
        'release': 'Search for releases (e.g., Abbey Road)',
        'recording': 'Search for recordings (e.g., Come Together)',
        'label': 'Search for labels (e.g., Apple Records)',
        'release-group': 'Search for release groups',
        'work': 'Search for works (e.g., Yesterday)',
        'area': 'Search for areas (e.g., London)',
        'place': 'Search for places (e.g., Abbey Road Studios)',
        'instrument': 'Search for instruments (e.g., guitar)',
        'isrc': 'Enter ISRC code (e.g., USRC17607839)',
        'genre': 'Click Search to browse all genres'
    };
    input.placeholder = placeholders[currentSearchType] || 'Search MusicBrainz...';
}

// Toggle filters
function toggleFilters() {
    const content = document.getElementById('filter-content');
    const toggle = document.getElementById('filter-toggle');
    if (content.style.display === 'none') {
        content.style.display = 'flex';
        toggle.textContent = 'Advanced Filters ▲';
    } else {
        content.style.display = 'none';
        toggle.textContent = 'Advanced Filters ▼';
    }
}

// Handle search
async function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.trim();
    
    currentSearchType = document.getElementById('search-type').value;
    
    // Special case: genre browsing
    if (currentSearchType === 'genre') {
        await browseGenres();
        return;
    }
    
    // Validate input
    if (!searchTerm && currentSearchType !== 'genre') {
        showToast('Please enter a search query', 'warning');
        return;
    }
    
    // Validate ISRC format
    if (currentSearchType === 'isrc' && !isValidISRC(searchTerm)) {
        showToast('Invalid ISRC format. Expected: XX-XXX-YY-NNNNN', 'error');
        return;
    }
    
    currentSearchTerm = searchTerm;
    currentPage = 1;
    
    await performSearch();
    addRecentSearch(searchTerm, currentSearchType);
}

// Perform search
async function performSearch(offset = 0) {
    showLoading('Searching...');
    
    try {
        const filters = {
            year: document.getElementById('year-filter').value,
            country: document.getElementById('country-filter').value,
            type: document.getElementById('type-filter').value
        };
        
        let data;
        
        if (currentSearchType === 'isrc') {
            data = await lookupByISRC(currentSearchTerm);
        } else {
            const query = buildSearchQuery(currentSearchType, currentSearchTerm, filters);
            
            switch (currentSearchType) {
                case 'artist':
                    data = await searchArtist(query, resultsPerPage, offset);
                    break;
                case 'release':
                    data = await searchRelease(query, resultsPerPage, offset);
                    break;
                case 'recording':
                    data = await searchRecording(query, resultsPerPage, offset);
                    break;
                case 'label':
                    data = await searchLabel(query, resultsPerPage, offset);
                    break;
                case 'release-group':
                    data = await searchReleaseGroup(query, resultsPerPage, offset);
                    break;
                case 'work':
                    data = await searchWork(query, resultsPerPage, offset);
                    break;
                case 'area':
                    data = await searchArea(query, resultsPerPage, offset);
                    break;
                case 'place':
                    data = await searchPlace(query, resultsPerPage, offset);
                    break;
                case 'instrument':
                    data = await searchInstrument(query, resultsPerPage, offset);
                    break;
            }
        }
        
        const resultsKey = `${currentSearchType}s`;
        currentResults = data[resultsKey] || data.recordings || [];
        totalResults = data.count || currentResults.length;
        
        renderResults();
        updatePagination();
        
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

// Render results
function renderResults() {
    const resultsList = document.getElementById('results-list');
    const resultsCount = document.getElementById('results-count');
    
    resultsCount.textContent = `${totalResults} results found`;
    
    if (currentResults.length === 0) {
        resultsList.innerHTML = `
            <div class="empty-state">
                <p>No results found for "${escapeHtml(currentSearchTerm)}"</p>
                <p>Try: searching with fewer terms, checking spelling, using English terms</p>
            </div>
        `;
        return;
    }
    
    resultsList.innerHTML = currentResults.map(result => createResultCard(result)).join('');
    
    // Add click listeners
    resultsList.querySelectorAll('.result-card').forEach((card, index) => {
        card.addEventListener('click', () => loadDetail(currentResults[index]));
    });
}

// Create result card
function createResultCard(result) {
    const name = result.name || result.title || '';
    const mbid = result.id;
    const disambiguation = result.disambiguation || '';
    const score = result.score || 0;
    
    let meta = [];
    if (result.type) meta.push(`Type: ${result.type}`);
    if (result.country) meta.push(`Country: ${result.country}`);
    if (result.date || result['first-release-date']) {
        meta.push(`Date: ${result.date || result['first-release-date']}`);
    }
    if (result['artist-credit']) {
        meta.push(`Artist: ${buildArtistCredit(result['artist-credit'])}`);
    }
    
    return `
        <div class="result-card" data-mbid="${mbid}">
            <div class="result-card-header">
                <div>
                    <div class="result-card-title">${escapeHtml(name)}</div>
                    ${disambiguation ? `<div class="disambiguation">${escapeHtml(disambiguation)}</div>` : ''}
                </div>
                <span class="type-badge">${getEntityTypeLabel(currentSearchType)}</span>
            </div>
            <div class="result-card-meta">
                ${meta.map(m => `<span>${escapeHtml(m)}</span>`).join('')}
            </div>
            <div class="mbid">${mbid}</div>
            ${score > 0 ? `<span class="score">${score}%</span>` : ''}
        </div>
    `;
}

// Update pagination
function updatePagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalResults / resultsPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalResults} total)`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// Change page
async function changePage(direction) {
    currentPage += direction;
    const offset = (currentPage - 1) * resultsPerPage;
    await performSearch(offset);
    window.scrollTo(0, 0);
}

// Load detail
async function loadDetail(entity) {
    showLoading('Loading details...');
    
    try {
        const mbid = entity.id;
        let detailData;
        
        switch (currentSearchType) {
            case 'artist':
                detailData = await lookupArtist(mbid);
                renderArtistDetail(detailData);
                break;
            case 'release':
                detailData = await lookupRelease(mbid);
                renderReleaseDetail(detailData);
                break;
            case 'recording':
            case 'isrc':
                detailData = await lookupRecording(mbid);
                renderRecordingDetail(detailData);
                break;
            case 'label':
                detailData = await lookupLabel(mbid);
                renderLabelDetail(detailData);
                break;
            case 'release-group':
                detailData = await lookupReleaseGroup(mbid);
                renderReleaseGroupDetail(detailData);
                break;
            case 'work':
                detailData = await lookupWork(mbid);
                renderWorkDetail(detailData);
                break;
            case 'area':
                detailData = await lookupArea(mbid);
                renderAreaDetail(detailData);
                break;
            case 'place':
                detailData = await lookupPlace(mbid);
                renderPlaceDetail(detailData);
                break;
            case 'instrument':
                detailData = await lookupInstrument(mbid);
                renderInstrumentDetail(detailData);
                break;
        }
        
        currentDetailEntity = detailData;
        
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

// Render Artist Detail
function renderArtistDetail(artist) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(artist.name)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
        
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${artist.type ? `<div class="detail-info-row"><span class="detail-info-label">Type:</span><span class="detail-info-value">${artist.type}</span></div>` : ''}
                ${artist.country ? `<div class="detail-info-row"><span class="detail-info-label">Country:</span><span class="detail-info-value">${artist.country}</span></div>` : ''}
                ${artist['life-span'] ? `<div class="detail-info-row"><span class="detail-info-label">Life Span:</span><span class="detail-info-value">${parseLifeSpan(artist['life-span'])}</span></div>` : ''}
                ${artist.gender ? `<div class="detail-info-row"><span class="detail-info-label">Gender:</span><span class="detail-info-value">${artist.gender}</span></div>` : ''}
                ${artist.disambiguation ? `<div class="detail-info-row"><span class="detail-info-label">Disambiguation:</span><span class="detail-info-value">${escapeHtml(artist.disambiguation)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${artist.id}</span></div>
            </div>
        </div>
    `;
    
    // Releases
    if (artist.releases && artist.releases.length > 0) {
        const grouped = groupBy(artist.releases.slice(0, 10), 'type');
        html += `<div class="detail-section"><h3>Releases (showing first 10)</h3>`;
        Object.keys(grouped).forEach(type => {
            html += `<h4>${type}</h4><div class="related-list">`;
            grouped[type].forEach(release => {
                html += `
                    <div class="related-item" onclick="loadReleaseFromDetail('${release.id}')">
                        <div class="related-item-title">${escapeHtml(release.title)}</div>
                        <div class="related-item-meta">${release.date || 'Unknown date'} • ${release.country || 'Unknown country'}</div>
                    </div>
                `;
            });
            html += `</div>`;
        });
        html += `<button class="btn-primary" onclick="browseArtistReleases('${artist.id}')" style="margin-top: 15px;">Browse All Releases</button></div>`;
    }
    
    // Release Groups
    if (artist['release-groups'] && artist['release-groups'].length > 0) {
        html += `<div class="detail-section"><h3>Release Groups</h3><div class="related-list">`;
        artist['release-groups'].slice(0, 10).forEach(rg => {
            html += `
                <div class="related-item" onclick="loadReleaseGroupFromDetail('${rg.id}')">
                    <div class="related-item-title">${escapeHtml(rg.title)}</div>
                    <div class="related-item-meta">${rg['primary-type'] || 'Unknown type'} • ${rg['first-release-date'] || 'Unknown date'}</div>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    
    // Tags
    if (artist.tags && artist.tags.length > 0) {
        html += `<div class="detail-section"><h3>Tags</h3><div class="tag-list">`;
        artist.tags.slice(0, 20).forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    // Genres
    if (artist.genres && artist.genres.length > 0) {
        html += `<div class="detail-section"><h3>Genres</h3><div class="tag-list">`;
        artist.genres.forEach(genre => {
            html += `<span class="tag">${escapeHtml(genre.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    // Relations/URLs
    if (artist.relations && artist.relations.length > 0) {
        const urls = artist.relations.filter(rel => rel.url);
        if (urls.length > 0) {
            html += `<div class="detail-section"><h3>Links</h3><div class="link-list">`;
            urls.forEach(rel => {
                html += `<a href="${rel.url.resource}" target="_blank" rel="noopener" class="link-item">${rel.type || 'Website'}</a>`;
            });
            html += `</div></div>`;
        }
    }
    
    detailPanel.innerHTML = html;
}

// Render Release Detail
function renderReleaseDetail(release) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(release.title)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
    `;
    
    // Cover Art
    html += `<img src="${getCoverArtUrl(release.id)}" alt="Cover art" class="cover-art" onerror="this.style.display='none'">`;
    
    html += `
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${release['artist-credit'] ? `<div class="detail-info-row"><span class="detail-info-label">Artist:</span><span class="detail-info-value">${escapeHtml(buildArtistCredit(release['artist-credit']))}</span></div>` : ''}
                ${release.date ? `<div class="detail-info-row"><span class="detail-info-label">Date:</span><span class="detail-info-value">${release.date}</span></div>` : ''}
                ${release.country ? `<div class="detail-info-row"><span class="detail-info-label">Country:</span><span class="detail-info-value">${release.country}</span></div>` : ''}
                ${release.status ? `<div class="detail-info-row"><span class="detail-info-label">Status:</span><span class="detail-info-value">${release.status}</span></div>` : ''}
                ${release.packaging ? `<div class="detail-info-row"><span class="detail-info-label">Packaging:</span><span class="detail-info-value">${release.packaging}</span></div>` : ''}
                ${release.barcode ? `<div class="detail-info-row"><span class="detail-info-label">Barcode:</span><span class="detail-info-value">${release.barcode}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${release.id}</span></div>
            </div>
        </div>
    `;
    
    // Label Info
    if (release['label-info'] && release['label-info'].length > 0) {
        html += `<div class="detail-section"><h3>Labels</h3><div class="detail-info">`;
        release['label-info'].forEach(li => {
            if (li.label) {
                html += `<div class="detail-info-row"><span class="detail-info-label">${escapeHtml(li.label.name)}:</span><span class="detail-info-value">${li['catalog-number'] || 'No catalog number'}</span></div>`;
            }
        });
        html += `</div></div>`;
    }
    
    // Media/Tracklist
    if (release.media && release.media.length > 0) {
        html += `<div class="detail-section"><h3>Tracklist</h3>`;
        release.media.forEach((medium, idx) => {
            html += `<h4>Disc ${medium.position || idx + 1} (${medium.format || 'Unknown format'}, ${medium['track-count']} tracks)</h4>`;
            if (medium.tracks && medium.tracks.length > 0) {
                html += `<ul class="tracklist">`;
                medium.tracks.forEach(track => {
                    html += `
                        <li class="track-item">
                            <span class="track-position">${track.position}</span>
                            <span class="track-title" onclick="loadRecordingFromDetail('${track.recording.id}')">${escapeHtml(track.title)}</span>
                            <span class="track-length">${formatDuration(track.length || track.recording.length)}</span>
                        </li>
                    `;
                });
                html += `</ul>`;
            }
        });
        html += `</div>`;
    }
    
    // Tags
    if (release.tags && release.tags.length > 0) {
        html += `<div class="detail-section"><h3>Tags</h3><div class="tag-list">`;
        release.tags.forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    detailPanel.innerHTML = html;
}

// Render Recording Detail
function renderRecordingDetail(recording) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(recording.title)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
        
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${recording['artist-credit'] ? `<div class="detail-info-row"><span class="detail-info-label">Artist:</span><span class="detail-info-value">${escapeHtml(buildArtistCredit(recording['artist-credit']))}</span></div>` : ''}
                ${recording.length ? `<div class="detail-info-row"><span class="detail-info-label">Length:</span><span class="detail-info-value">${formatDuration(recording.length)}</span></div>` : ''}
                ${recording.disambiguation ? `<div class="detail-info-row"><span class="detail-info-label">Disambiguation:</span><span class="detail-info-value">${escapeHtml(recording.disambiguation)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${recording.id}</span></div>
            </div>
        </div>
    `;
    
    // ISRCs
    if (recording.isrcs && recording.isrcs.length > 0) {
        html += `<div class="detail-section"><h3>ISRCs</h3>`;
        recording.isrcs.forEach(isrc => {
            html += `<span class="isrc-code">${isrc}</span>`;
        });
        html += `</div>`;
    }
    
    // Appears On
    if (recording.releases && recording.releases.length > 0) {
        html += `<div class="detail-section"><h3>Appears On</h3><div class="related-list">`;
        recording.releases.slice(0, 20).forEach(release => {
            html += `
                <div class="related-item" onclick="loadReleaseFromDetail('${release.id}')">
                    <div class="related-item-title">${escapeHtml(release.title)}</div>
                    <div class="related-item-meta">${release.date || 'Unknown date'} • ${release.country || 'Unknown country'}</div>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    
    // Tags
    if (recording.tags && recording.tags.length > 0) {
        html += `<div class="detail-section"><h3>Tags</h3><div class="tag-list">`;
        recording.tags.forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    detailPanel.innerHTML = html;
}

// Render Label Detail
function renderLabelDetail(label) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(label.name)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
        
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${label.type ? `<div class="detail-info-row"><span class="detail-info-label">Type:</span><span class="detail-info-value">${label.type}</span></div>` : ''}
                ${label.country ? `<div class="detail-info-row"><span class="detail-info-label">Country:</span><span class="detail-info-value">${label.country}</span></div>` : ''}
                ${label['label-code'] ? `<div class="detail-info-row"><span class="detail-info-label">Label Code:</span><span class="detail-info-value">${label['label-code']}</span></div>` : ''}
                ${label['life-span'] ? `<div class="detail-info-row"><span class="detail-info-label">Life Span:</span><span class="detail-info-value">${parseLifeSpan(label['life-span'])}</span></div>` : ''}
                ${label.disambiguation ? `<div class="detail-info-row"><span class="detail-info-label">Disambiguation:</span><span class="detail-info-value">${escapeHtml(label.disambiguation)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${label.id}</span></div>
            </div>
        </div>
    `;
    
    // Releases
    if (label.releases && label.releases.length > 0) {
        html += `<div class="detail-section"><h3>Releases (showing first 10)</h3><div class="related-list">`;
        label.releases.slice(0, 10).forEach(release => {
            html += `
                <div class="related-item" onclick="loadReleaseFromDetail('${release.id}')">
                    <div class="related-item-title">${escapeHtml(release.title)}</div>
                    <div class="related-item-meta">${release.date || 'Unknown date'}</div>
                </div>
            `;
        });
        html += `</div><button class="btn-primary" onclick="browseLabelReleases('${label.id}')" style="margin-top: 15px;">Browse All Releases</button></div>`;
    }
    
    // Tags
    if (label.tags && label.tags.length > 0) {
        html += `<div class="detail-section"><h3>Tags</h3><div class="tag-list">`;
        label.tags.forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    detailPanel.innerHTML = html;
}

// Render Release Group Detail
function renderReleaseGroupDetail(releaseGroup) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(releaseGroup.title)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
        
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${releaseGroup['primary-type'] ? `<div class="detail-info-row"><span class="detail-info-label">Type:</span><span class="detail-info-value">${releaseGroup['primary-type']}</span></div>` : ''}
                ${releaseGroup['artist-credit'] ? `<div class="detail-info-row"><span class="detail-info-label">Artist:</span><span class="detail-info-value">${escapeHtml(buildArtistCredit(releaseGroup['artist-credit']))}</span></div>` : ''}
                ${releaseGroup['first-release-date'] ? `<div class="detail-info-row"><span class="detail-info-label">First Release:</span><span class="detail-info-value">${releaseGroup['first-release-date']}</span></div>` : ''}
                ${releaseGroup.disambiguation ? `<div class="detail-info-row"><span class="detail-info-label">Disambiguation:</span><span class="detail-info-value">${escapeHtml(releaseGroup.disambiguation)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${releaseGroup.id}</span></div>
            </div>
        </div>
    `;
    
    // Releases
    if (releaseGroup.releases && releaseGroup.releases.length > 0) {
        html += `<div class="detail-section"><h3>Releases</h3><div class="related-list">`;
        releaseGroup.releases.forEach(release => {
            html += `
                <div class="related-item" onclick="loadReleaseFromDetail('${release.id}')">
                    <div class="related-item-title">${escapeHtml(release.title)}</div>
                    <div class="related-item-meta">${release.date || 'Unknown date'} • ${release.country || 'Unknown country'} • ${release.status || 'Unknown status'}</div>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    
    // Tags
    if (releaseGroup.tags && releaseGroup.tags.length > 0) {
        html += `<div class="detail-section"><h3>Tags</h3><div class="tag-list">`;
        releaseGroup.tags.forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    detailPanel.innerHTML = html;
}

// Render Work Detail
function renderWorkDetail(work) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(work.title)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
        
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${work.type ? `<div class="detail-info-row"><span class="detail-info-label">Type:</span><span class="detail-info-value">${work.type}</span></div>` : ''}
                ${work.language ? `<div class="detail-info-row"><span class="detail-info-label">Language:</span><span class="detail-info-value">${work.language}</span></div>` : ''}
                ${work.disambiguation ? `<div class="detail-info-row"><span class="detail-info-label">Disambiguation:</span><span class="detail-info-value">${escapeHtml(work.disambiguation)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${work.id}</span></div>
            </div>
        </div>
    `;
    
    // ISWCs
    if (work.iswcs && work.iswcs.length > 0) {
        html += `<div class="detail-section"><h3>ISWCs</h3>`;
        work.iswcs.forEach(iswc => {
            html += `<span class="isrc-code">${iswc}</span>`;
        });
        html += `</div>`;
    }
    
    // Aliases
    if (work.aliases && work.aliases.length > 0) {
        html += `<div class="detail-section"><h3>Aliases</h3><div class="tag-list">`;
        work.aliases.forEach(alias => {
            html += `<span class="tag">${escapeHtml(alias.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    // Relations
    if (work.relations && work.relations.length > 0) {
        const composers = work.relations.filter(rel => rel.type === 'composer');
        if (composers.length > 0) {
            html += `<div class="detail-section"><h3>Composers</h3><div class="related-list">`;
            composers.forEach(rel => {
                if (rel.artist) {
                    html += `
                        <div class="related-item" onclick="loadArtistFromDetail('${rel.artist.id}')">
                            <div class="related-item-title">${escapeHtml(rel.artist.name)}</div>
                        </div>
                    `;
                }
            });
            html += `</div></div>`;
        }
    }
    
    detailPanel.innerHTML = html;
}

// Render Area Detail
function renderAreaDetail(area) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(area.name)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
        
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${area.type ? `<div class="detail-info-row"><span class="detail-info-label">Type:</span><span class="detail-info-value">${area.type}</span></div>` : ''}
                ${area['iso-3166-1-codes'] && area['iso-3166-1-codes'].length > 0 ? `<div class="detail-info-row"><span class="detail-info-label">ISO Code:</span><span class="detail-info-value">${area['iso-3166-1-codes'].join(', ')}</span></div>` : ''}
                ${area.disambiguation ? `<div class="detail-info-row"><span class="detail-info-label">Disambiguation:</span><span class="detail-info-value">${escapeHtml(area.disambiguation)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${area.id}</span></div>
            </div>
        </div>
    `;
    
    // Aliases
    if (area.aliases && area.aliases.length > 0) {
        html += `<div class="detail-section"><h3>Aliases</h3><div class="tag-list">`;
        area.aliases.forEach(alias => {
            html += `<span class="tag">${escapeHtml(alias.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    // Tags
    if (area.tags && area.tags.length > 0) {
        html += `<div class="detail-section"><h3>Tags</h3><div class="tag-list">`;
        area.tags.forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    detailPanel.innerHTML = html;
}

// Render Place Detail
function renderPlaceDetail(place) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(place.name)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
        
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${place.type ? `<div class="detail-info-row"><span class="detail-info-label">Type:</span><span class="detail-info-value">${place.type}</span></div>` : ''}
                ${place.address ? `<div class="detail-info-row"><span class="detail-info-label">Address:</span><span class="detail-info-value">${escapeHtml(place.address)}</span></div>` : ''}
                ${place.area ? `<div class="detail-info-row"><span class="detail-info-label">Area:</span><span class="detail-info-value">${escapeHtml(place.area.name)}</span></div>` : ''}
                ${place['life-span'] ? `<div class="detail-info-row"><span class="detail-info-label">Life Span:</span><span class="detail-info-value">${parseLifeSpan(place['life-span'])}</span></div>` : ''}
                ${place.disambiguation ? `<div class="detail-info-row"><span class="detail-info-label">Disambiguation:</span><span class="detail-info-value">${escapeHtml(place.disambiguation)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${place.id}</span></div>
            </div>
        </div>
    `;
    
    // Aliases
    if (place.aliases && place.aliases.length > 0) {
        html += `<div class="detail-section"><h3>Aliases</h3><div class="tag-list">`;
        place.aliases.forEach(alias => {
            html += `<span class="tag">${escapeHtml(alias.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    // Tags
    if (place.tags && place.tags.length > 0) {
        html += `<div class="detail-section"><h3>Tags</h3><div class="tag-list">`;
        place.tags.forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    detailPanel.innerHTML = html;
}

// Render Instrument Detail
function renderInstrumentDetail(instrument) {
    const detailPanel = document.getElementById('detail-panel');
    
    let html = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(instrument.name)}</h2>
            <button class="btn-close" onclick="closeDetail()">×</button>
        </div>
        
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-info">
                ${instrument.type ? `<div class="detail-info-row"><span class="detail-info-label">Type:</span><span class="detail-info-value">${instrument.type}</span></div>` : ''}
                ${instrument.description ? `<div class="detail-info-row"><span class="detail-info-label">Description:</span><span class="detail-info-value">${escapeHtml(instrument.description)}</span></div>` : ''}
                ${instrument.disambiguation ? `<div class="detail-info-row"><span class="detail-info-label">Disambiguation:</span><span class="detail-info-value">${escapeHtml(instrument.disambiguation)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">MBID:</span><span class="detail-info-value mbid">${instrument.id}</span></div>
            </div>
        </div>
    `;
    
    // Aliases
    if (instrument.aliases && instrument.aliases.length > 0) {
        html += `<div class="detail-section"><h3>Aliases</h3><div class="tag-list">`;
        instrument.aliases.forEach(alias => {
            html += `<span class="tag">${escapeHtml(alias.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    // Tags
    if (instrument.tags && instrument.tags.length > 0) {
        html += `<div class="detail-section"><h3>Tags</h3><div class="tag-list">`;
        instrument.tags.forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag.name)}</span>`;
        });
        html += `</div></div>`;
    }
    
    detailPanel.innerHTML = html;
}

// Close detail panel
function closeDetail() {
    const detailPanel = document.getElementById('detail-panel');
    detailPanel.innerHTML = '<div class="detail-content"><div class="empty-state"><p>Select an item to view details</p></div></div>';
}

// Browse functions
async function browseArtistReleases(artistMbid) {
    showLoading('Loading releases...');
    try {
        const data = await browseReleasesByArtist(artistMbid, 100, 0);
        currentResults = data.releases || [];
        totalResults = data['release-count'] || currentResults.length;
        currentSearchType = 'release';
        renderResults();
        updatePagination();
        showToast(`Found ${totalResults} releases`, 'success');
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

async function browseLabelReleases(labelMbid) {
    showLoading('Loading releases...');
    try {
        const data = await browseReleasesByLabel(labelMbid, 100, 0);
        currentResults = data.releases || [];
        totalResults = data['release-count'] || currentResults.length;
        currentSearchType = 'release';
        renderResults();
        updatePagination();
        showToast(`Found ${totalResults} releases`, 'success');
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

// Load entity from detail panel
async function loadArtistFromDetail(mbid) {
    showLoading('Loading artist...');
    try {
        const artist = await lookupArtist(mbid);
        currentSearchType = 'artist';
        renderArtistDetail(artist);
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

async function loadReleaseFromDetail(mbid) {
    showLoading('Loading release...');
    try {
        const release = await lookupRelease(mbid);
        currentSearchType = 'release';
        renderReleaseDetail(release);
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

async function loadRecordingFromDetail(mbid) {
    showLoading('Loading recording...');
    try {
        const recording = await lookupRecording(mbid);
        currentSearchType = 'recording';
        renderRecordingDetail(recording);
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

async function loadReleaseGroupFromDetail(mbid) {
    showLoading('Loading release group...');
    try {
        const releaseGroup = await lookupReleaseGroup(mbid);
        currentSearchType = 'release-group';
        renderReleaseGroupDetail(releaseGroup);
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

// Browse genres
async function browseGenres() {
    showLoading('Loading genres...');
    try {
        const data = await getAllGenres(100, 0);
        const genres = data.genres || [];
        
        const resultsList = document.getElementById('results-list');
        const resultsCount = document.getElementById('results-count');
        
        resultsCount.textContent = `${genres.length} genres found`;
        
        resultsList.innerHTML = genres.map(genre => `
            <div class="result-card">
                <div class="result-card-header">
                    <div>
                        <div class="result-card-title">${escapeHtml(genre.name)}</div>
                    </div>
                    <span class="type-badge">Genre</span>
                </div>
                <div class="mbid">${genre.id}</div>
            </div>
        `).join('');
        
        showToast(`Loaded ${genres.length} genres`, 'success');
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

// Recent searches
function addRecentSearch(query, type) {
    let recent = getFromStorage('recentSearches', []);
    recent.unshift({
        query: query,
        type: type,
        timestamp: Date.now()
    });
    // Keep only last 10
    recent = recent.slice(0, 10);
    setToStorage('recentSearches', recent);
    renderRecentSearches();
}

function renderRecentSearches() {
    const recent = getFromStorage('recentSearches', []);
    const container = document.getElementById('recent-searches');
    
    if (recent.length === 0) {
        container.innerHTML = '<li style="padding: 10px; color: #999;">No recent searches</li>';
        return;
    }
    
    container.innerHTML = recent.map(item => `
        <li class="recent-search-item" data-query="${escapeHtml(item.query)}" data-type="${item.type}">
            <span class="type-badge">${getEntityTypeLabel(item.type)}</span>
            <span class="query">${escapeHtml(item.query)}</span>
            <span class="timestamp">${formatTimestamp(item.timestamp)}</span>
        </li>
    `).join('');
    
    // Add click listeners
    container.querySelectorAll('.recent-search-item').forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('search-input').value = item.dataset.query;
            document.getElementById('search-type').value = item.dataset.type;
            currentSearchType = item.dataset.type;
            updateSearchPlaceholder();
            handleSearch();
        });
    });
}

// Settings
function openSettings() {
    const modal = document.getElementById('settings-modal');
    const userAgentInput = document.getElementById('user-agent-input');
    const enableCache = document.getElementById('enable-cache');
    const resultsPerPageSelect = document.getElementById('results-per-page');
    
    userAgentInput.value = getFromStorage('userAgent', DEFAULT_USER_AGENT);
    enableCache.checked = getFromStorage('cachingEnabled', true);
    resultsPerPageSelect.value = getFromStorage('resultsPerPage', 25);
    
    modal.style.display = 'flex';
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'none';
}

function saveSettings() {
    const userAgentInput = document.getElementById('user-agent-input');
    const enableCache = document.getElementById('enable-cache');
    const resultsPerPageSelect = document.getElementById('results-per-page');
    
    const newUserAgent = userAgentInput.value.trim();
    
    // Validate User-Agent format
    if (!newUserAgent || !newUserAgent.includes('/') || !newUserAgent.includes('(')) {
        showToast('Invalid User-Agent format. Expected: AppName/Version ( contact )', 'error');
        return;
    }
    
    updateUserAgent(newUserAgent);
    updateCachingEnabled(enableCache.checked);
    resultsPerPage = parseInt(resultsPerPageSelect.value);
    setToStorage('resultsPerPage', resultsPerPage);
    
    closeSettings();
    showToast('Settings saved', 'success');
}

function loadSettings() {
    resultsPerPage = getFromStorage('resultsPerPage', 25);
}

// Error handling
function handleError(error) {
    console.error('Error:', error);
    
    let message = 'An error occurred';
    
    if (error.message.includes('CORS')) {
        message = 'CORS error detected. To run this app locally, use a static server: npx serve . or python -m http.server';
    } else if (error.message.includes('404')) {
        message = 'Entity not found. Please verify the MBID.';
    } else if (error.message.includes('400')) {
        message = 'Invalid search query. Please check syntax.';
    } else if (error.message.includes('503')) {
        message = 'MusicBrainz is temporarily unavailable. Please try again later.';
    } else if (error.message.includes('Failed to fetch')) {
        message = 'Network error. Please check your connection.';
    } else {
        message = error.message;
    }
    
    showToast(message, 'error');
}

// Initialize
updateSearchPlaceholder();
