# Future Problems - Quick Summary

| # | Problem | Decision/Status |
|---|---------|-----------------|
| 1 | **No stock deletion** - Can't remove stocks from master list | ✅ Implement DELETE endpoint + UI button |
| 2 | **No user pagination** - Fetches all users at once | ✅ Add email search with debounce instead of pagination |
| 3 | **No stock pagination** - Fetches all stocks at once | ✅ Add search, only paginate if >20 stocks (use constant) |
| 4 | **WebSocket reconnects forever** - No max retry | ✅ Tiered backoff: exponential → 1min → 5min → 10min forever |
| 5 | **No rate limiting** - API vulnerable to spam | ✅ Use Upstash Redis (free tier). **Need your decision:** proceed with setup? |
| 6 | **No audit log** - No record of changes | ✅ Track role changes only (not permissions) |
| 7 | **Admin client security risk** - Bypasses all RLS | ✅ Remove admin client, use RLS policies instead. Ready to implement after migration 007 is applied |
| 8 | **No email verification** - Spam accounts possible | ✅ Already implemented! Just verify Supabase dashboard setting is ON |
| 9 | **Hardcoded WebSocket URL** - Can't switch exchanges | ✅ Move to env variable. Yes, needs to be added to Vercel for production |
| 10 | **No database indexes** - Slow queries at scale | ✅ Add indexes now (10 min, prevents future issues) |
| 11 | **USDT-only symbols** - Forces USDT pairs | ✅ Remove auto-append, allow any trading pair |
| 12 | **No permission caching** - DB query every check | ✅ Use Redis cache with invalidation on changes. Optional - only if >100 users |
| 13 | **Trader role unclear** | ✅ Keep as-is (no changes) |
| 14 | **No offline support** | ✅ Show stale prices + warning banner when offline |
| 15 | **No env validation** | ✅ Add Zod validation on startup (30 min setup) |

---

## Need Your Input On:

1. **Issue 4 (WebSocket):** Should we show a "Reconnect Now" button after many failed attempts, or keep it fully automatic?

2. **Issue 5 (Rate Limiting):** Ready to proceed with Upstash Redis setup? (free, 15 min)

3. **Issue 12 (Caching):** Do you expect >100 active users? If not, skip for now.

---

## Ready to Implement (no decisions needed):

- Issue 1: Stock deletion
- Issue 2: User search
- Issue 3: Stock search
- Issue 6: Audit log (role changes only)
- Issue 7: Remove admin client (after migration 007)
- Issue 9: WebSocket env variable
- Issue 10: Database indexes
- Issue 11: Remove USDT restriction
- Issue 14: Offline warning
- Issue 15: Env validation
