# MusicBrainz Explorer

Professional web application for searching and exploring the MusicBrainz music database.

## Features

- Search artists, releases, recordings, labels, works, and more
- Detailed entity views with comprehensive metadata
- Browse related entities (artist releases, release tracks, etc.)
- Non-MBID lookups (ISRC, Disc ID, ISWC)
- Genre browsing
- Advanced filtering (year, country, type)
- Request queuing with rate limit compliance (1 req/sec)
- In-memory caching for better performance
- Recent searches history
- Fully responsive design

## Usage

1. Start a local server (required to avoid CORS issues):
   ```bash
   # Using Node.js
   npx serve .
   
   # Using Python 3
   python -m http.server
   
   # Using Python 2
   python -m SimpleHTTPServer
   ```

2. Open http://localhost:3000 (or appropriate port)

3. Search for music entities using the search box

4. Click results to view detailed information

5. Browse related entities and explore the database

## API Compliance

This application strictly follows MusicBrainz API rules:

- **User-Agent**: All requests include proper User-Agent header (configurable in settings)
- **Rate Limiting**: Maximum 1 request per second enforced via request queue
- **Format**: All responses requested in JSON format
- **Attribution**: Powered by MusicBrainz (https://musicbrainz.org)

## Technical Details

- Pure vanilla JavaScript (ES6+)
- No external dependencies
- No backend required
- Client-side caching
- Responsive design (mobile, tablet, desktop)

## API Endpoints Used

### Search
- `/artist?query=...&fmt=json`
- `/release?query=...&fmt=json`
- `/recording?query=...&fmt=json`
- `/label?query=...&fmt=json`
- `/release-group?query=...&fmt=json`
- `/work?query=...&fmt=json`
- `/area?query=...&fmt=json`
- `/place?query=...&fmt=json`
- `/instrument?query=...&fmt=json`

### Lookup
- `/{entity}/{mbid}?inc=...&fmt=json`

### Browse
- `/release?artist={mbid}&limit=25&offset=0&fmt=json`
- `/recording?release={mbid}&limit=100&offset=0&fmt=json`
- `/release?label={mbid}&limit=25&offset=0&fmt=json`
- `/release-group?artist={mbid}&limit=25&offset=0&fmt=json`
- `/work?artist={mbid}&limit=25&offset=0&fmt=json`

### Special
- `/genre/all?limit=100&offset=0&fmt=json`
- `/recording?query=isrc:{code}&fmt=json`
- `/release?query=discid:{id}&fmt=json`
- `/work?query=iswc:{code}&fmt=json`

## Rate Limiting

The application implements a request queue that ensures no more than 1 request per second is sent to the MusicBrainz API. Requests are automatically queued and processed in order. Queue status is displayed in the header.

## Caching

Responses are cached in memory for 10 minutes to reduce API calls. Cache can be cleared via the sidebar.

## Development

To modify the User-Agent header:
1. Click the Settings button in the header
2. Update the User-Agent field
3. Save changes

## File Structure

- `index.html` - Main HTML structure
- `styles.css` - All CSS styles
- `api-client.js` - API communication module
- `app.js` - Main application logic
- `utils.js` - Helper functions
- `README.md` - This file

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is provided as-is for educational purposes. MusicBrainz data is licensed under CC0.

## Links

- MusicBrainz: https://musicbrainz.org
- API Documentation: https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2
- Cover Art Archive: https://coverartarchive.org

## Troubleshooting

### CORS Errors

If you encounter CORS errors, make sure you're running the application through a local server, not by opening the HTML file directly in your browser.

### Rate Limit Errors

The application automatically queues requests to comply with the 1 request per second limit. If you see rate limit errors, the queue system will handle them automatically.

### No Results

If you're not getting results:
- Try using fewer search terms
- Check spelling
- Use English terms when possible
- Try browsing by genre instead

## Examples

### Search for an Artist
1. Select "Artist" from the dropdown
2. Enter "The Beatles"
3. Click Search
4. Click on a result to see details

### ISRC Lookup
1. Select "ISRC Lookup" from the dropdown
2. Enter an ISRC code (e.g., USRC17607839)
3. Click Search

### Browse Genres
1. Select "Browse Genres" from the dropdown
2. Click Search
3. Browse through available genres

### Advanced Filtering
1. Click "Advanced Filters"
2. Set year, country, or type filters
3. Perform your search

## Contributing

This is a demonstration project. Feel free to fork and modify for your own use.

## Acknowledgments

- MusicBrainz for providing the comprehensive music database API
- Cover Art Archive for album artwork
