# Portal Ingest Report

Date: 2026-02-07  
Query used: `GRUPO VERSA`

## Scope and limits
- Light, best-effort lookup only (no aggressive crawling).
- Metadata only was stored in `data.js`.
- Third-party images were not copied; placeholders were used.

## Portals checked
1. Metrocuadrado
2. Ciencuadras
3. Fincaraiz

## Results
- Listings mentioning `GRUPO VERSA` or `GRUPO VERSAS SAS` were found through public result pages.
- Metadata extracted where available: title, price, operation, type, area, rooms, baths, parking, city/sector.
- Total portal-based listing records included in `data.js`: 13
- Additional realistic demo listings for Cali were added to keep both tabs populated and avoid empty states.

## Blockers / quality notes
- Some portal pages are highly dynamic and can hide fields until client-side rendering; in those cases fields were normalized from available snippet-level data.
- No captcha-breaking or authenticated scraping was attempted.
- Several Grupo Versa pages are WordPress/plugin-driven; some contact details are visible only after scripts load. `content.json` keeps verified essentials and conservative defaults.

## Files updated by ingest
- `data.js`
- `portal_sources.json`
- `content.json`
