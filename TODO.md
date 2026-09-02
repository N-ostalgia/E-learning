# Real-Time Notifications Feature

## Database Schema ✅
- [x] Add `notifications` table + `notificationsRelations` to `src/lib/db/schema.ts`
- [x] Generate migration (`0003_flaky_zeigeist.sql`)
- [x] Apply migration (notifications table confirmed in `sqlite.db`)

## Server — Notification Module ✅
- [x] Create `src/server/modules/notification/notification.types.ts`
- [x] Create `src/server/modules/notification/notification.service.ts`
- [x] Create `src/server/modules/notification/notification.router.ts`
- [x] Register `notificationRouter` in `src/server/routers/root.router.ts`

## WebSocket — Real-Time Delivery ✅
- [x] Install `socket.io` + `socket.io-client` + `@socket.io/redis-adapter`
- [x] Create `src/lib/websocket/index.ts` (Socket.io core + ioredis pub/sub)
- [x] Create `websocket-server.cjs` (standalone WS relay server)
- [x] Add `ws:server` script to `package.json`
- [x] Create `src/hooks/useWebSocket.ts`
- [x] Add `REDIS_URL` + `NEXT_PUBLIC_WS_URL` env vars

## Client — Notification UI ✅
- [x] Create `src/components/features/notifications/NotificationBell.tsx`
- [x] Create `src/components/features/notifications/NotificationDropdown.tsx`
- [x] Create `src/app/(dashboard)/notifications/page.tsx`
- [x] Add NotificationBell to header in `src/app/(dashboard)/layout.tsx`
- [x] Add `/notifications` to protected pages in `src/proxy.ts`

## Notification Triggers
- [ ] `feed.service.ts`: createPost → notify community members + mentions
- [ ] `feed.service.ts`: createComment → notify post author + reply target + mentions
- [ ] `feed.service.ts`: toggleVote → notify target author
- [ ] `community.service.ts`: joinCommunity → notify owner (active + pending)

## Verification
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] Manual test flow (two browsers)
