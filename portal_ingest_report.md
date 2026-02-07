# Portal Ingest Report

Generated: 2026-02-07  
Keyword used: `Grupo Versa`

## Portals attempted

1. `fincaraiz.com.co`
2. `metrocuadrado.com`
3. `ciencuadras.com`

## Result summary

- URLs collected: **16**
- Listings normalized into `data.js`: **16**
- Parsed with complete core fields (title, price, operation, type, location): **13**
- Parsed with partial fields (missing some attributes like baños/parqueadero/estrato): **3**

## Per-portal notes

### FincaRaiz

- URLs found: 7
- Parsed successfully: 7
- Observations:
  - Some pages exposed structured content in the fetched HTML preview.
  - A subset of detail pages returned limited content in this environment; those were completed using listing snippets where possible.

### Metrocuadrado

- URLs found: 4
- Parsed successfully: 4
- Observations:
  - Listing pages exposed title and key attributes in preview text.
  - Good coverage for operation/type/area and partial coverage for amenities.

### Ciencuadras

- URLs found: 5
- Parsed successfully: 5
- Observations:
  - Some sections required page script execution; when unavailable, fields were inferred from page snippets.
  - Core fields (title/price/type/operation/zone) were still captured for examples.

## Blocking / failures

- No hard captcha wall was hit in the sampled URLs.
- Several URLs returned partial content (likely script-rendered content), so not all attributes were available.

## Next step

If you want more volume and higher field completeness, paste additional listing URLs directly and they can be normalized one-by-one into `data.js`.
