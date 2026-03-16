# T006: limit(5000) and Data Restriction Review

## Summary

Found **20+ instances** of `.limit(5000)` in `projectRoutes.ts` and `financialRoutes.ts`. No 90-day export restrictions found.

## Risk Assessment

### limit(5000) Usage

All instances of `limit(5000)` are used on list/export endpoints that return financial records:
- Fund transfers per project
- Material purchases
- Worker transfers
- Worker misc expenses
- Transportation expenses
- Supplier payments

### Is 5000 Sufficient?

For a construction project management system with well-drilling focus:
- A typical project has dozens to low hundreds of transactions per month
- Even a very active project over 2 years: ~200 transactions/month × 24 months = 4,800 records
- 5000 is a reasonable safety net for per-project queries

### When It Could Truncate

- Multi-project aggregate queries (e.g., all material purchases across all projects)
- Historical exports spanning many years
- High-volume daily attendance records (many workers × many days)

### Recommendation

**LOW RISK** — The current limit(5000) is adequate for most use cases because:
1. Most queries are scoped to a single project (WHERE project_id = ...)
2. Financial records per project rarely exceed 5000
3. The limit prevents memory exhaustion on the server

**Optional improvements (not urgent):**
1. Add pagination support (`offset` + `limit` query params) instead of hard limit
2. Log a warning when result count equals the limit (indicates possible truncation)
3. For export endpoints, consider streaming responses instead of loading all into memory

## No 90-Day Restrictions

No code enforces a 90-day data restriction. The only "90" reference found was a CSS width value in a PDF template. No data is being filtered by date range automatically.
