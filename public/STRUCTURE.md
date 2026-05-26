# Frontend Structure

## Canonical dashboard pages

- `public/modules/admin/admin-dashboard.*`
- `public/modules/finance/finance-dashboard.*`
- `public/modules/bidder/bidder-dashboard.*`
- `public/modules/noc/noc-dashboard.*`

## Shared assets

- `public/dashboard.css` is the shared layout/style base imported by module styles.
- `public/shared/` contains reusable session and sidebar helpers.

## Compatibility redirects

These top-level HTML files exist only to preserve old bookmarks and now redirect to the module pages:

- `public/dashboard.html`
- `public/bidder-dashboard.html`
- `public/finance-dashboard.html`
- `public/noc-dashboard.html`

## Removed legacy wrappers

The old top-level dashboard JS/CSS wrapper files were removed because the module pages now own the real implementations.
