# Asset Extractor - Stremio Add-on

This project aggregates and serves Stremio add-ons for various content providers.

## Recent Fixes and Enhancements (fix/stremio-metadata-playback)

### 1. Metadata Retrieval Improvements
- **Enhanced Scraper**: Updated the metadata extraction logic to prioritize `schema.org/VideoObject` metadata. This provides more reliable titles, posters, and descriptions compared to basic OpenGraph tags.
- **Cast Extraction**: Added support for extracting actor information from source pages and including it in the Stremio metadata response.
- **Validation Layer**: Integrated `zod` for runtime validation of metadata responses to ensure compliance with the Stremio Add-on SDK schema.

### 2. Stream Playback Fixes
- **Playback Logic**: Refactored the stream mapping logic to prioritize `playerFrameUrl` (Embed Player) over `externalUrl` (Open in Browser) when a base URL is available. This ensures that content opens directly within the Stremio app's internal player whenever possible.
- **Improved Resolution**: Enhanced the media resolver to better handle various stream types and fallbacks.

### 3. Logging and Debugging
- **Structured Logging**: Replaced basic `console.log` calls with a structured logging system that includes timestamps and source identifiers.
- **Cache Monitoring**: Added detailed logging for cache hits, misses, and sets when `DEBUG=1` is enabled.
- **Debug Mode**: Standardized the use of the `DEBUG` environment variable across the provider, extractor, and cache modules.

### 4. Caching and Performance
- **Cache Visibility**: Improved the cache statistics reporting to provide a clearer view of the add-on's performance.
- **In-Memory Caching**: Maintained efficient in-memory caching for catalogs, metadata, and streams to reduce external requests.

## Deployment

The app is designed to be deployed on:
- **Vercel**
- **Netlify**
- **Render**

Ensure that the `DEBUG` environment variable is set to `1` if you need detailed logs for troubleshooting.

## Testing

To test the fixes:
1. Install the add-on in the Stremio app using the manifest URL.
2. Verify that metadata (posters, descriptions, cast) loads correctly for various items.
3. Ensure that clicking "Play" opens the video directly in the Stremio player rather than redirecting to a browser.
