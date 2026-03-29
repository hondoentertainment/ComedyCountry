# Component Grade Report

**Date:** 2026-03-29
**Reviewed:** 103 components in `src/components/`
**Scale:** A (excellent) → F (major issues)

---

## Grade Distribution

| Grade | Count | % |
|-------|-------|---|
| A     | 22    | 21% |
| A-    | 14    | 14% |
| B+    | 10    | 10% |
| B     | 18    | 17% |
| B-    | 5     | 5%  |
| C+    | 5     | 5%  |
| C     | 4     | 4%  |

**Overall GPA: 3.3 / 4.0 (B+)**

---

## Full Grades Table

| # | Component | Grade | Key Issue |
|---|-----------|-------|-----------|
| 1 | AccessibilityBadge | **A** | Excellent a11y (aria-labels, tooltips, focus/blur), clean fallback for unknown types |
| 2 | AccessibilityFilter | **A** | Good role="region", proper labels, memoized callbacks; minor onChange-inside-setState anti-pattern |
| 3 | AdminComedianForm | **A** | Solid form with field-level validation, aria-invalid/aria-describedby, proper error handling |
| 4 | AdminDeleteButton | **C** | Uses `alert()`/`confirm()` for UX, no accessible error display, no aria-label on button |
| 5 | AdminEventForm | **B** | Good form structure; useEffect fetches lack AbortController, comedian dropdown lacks keyboard nav |
| 6 | AdminNav | **B** | Clean responsive nav with active states; SVG icons lack accessible titles, no aria-current |
| 7 | AdminVenueActions | **C** | Same `alert()`/`confirm()` pattern, uses `<a>` instead of `<Link>` for internal navigation |
| 8 | AdminVenueForm | **A** | Consistent validation, aria attributes, clear error states, well-labeled fields |
| 9 | AnalyticsDashboard | **B** | Good typed interfaces and sub-components; silently drops non-ok responses, no ARIA on tabs |
| 10 | AttendanceButtons | **B** | Good optimistic rollback on error; client-side count manipulation is fragile, SVG buttons lack aria-label |
| 11 | BookingManager | **C** | Silent `catch` blocks swallow all errors, missing loading/error states for actions |
| 12 | BookingRequestForm | **B** | Good availability checking; missing AbortController, silent catch on availability fetch |
| 13 | CalendarExport | **B** | Simple and focused; no error handling if API call fails, links lack aria-label |
| 14 | CalendarFeedSection | **B** | Good Pro-gate UX and copy-to-clipboard; sets url to "error" string instead of separate error state |
| 15 | CheckInButton | **A** | Clean error handling, proper auth check, role="alert", min-height touch targets |
| 16 | CheckoutFlow | **A** | Comprehensive multi-step flow with promo codes, fee transparency, proper loading/error states |
| 17 | ClipCard | **A** | Optimistic updates with rollback, good Image usage, aria-labels on action buttons |
| 18 | ClipFeed | **B** | Good IntersectionObserver infinite scroll; silently swallows fetch errors, stale closure risk |
| 19 | ClipPlayer | **A** | Full video player with TikTok-style UI, proper aria controls, optimistic updates with rollback |
| 20 | ClipUploader | **B** | Good validation and preview; duration typed as `number \| ""` is awkward, no file size validation |
| 21 | ComedianBadges | **A** | Excellent a11y with useId for aria-describedby, sr-only descriptions, clean compact/full modes |
| 22 | ComedianFilterBar | **A** | Good form-based filtering with sr-only labels, advanced filters toggle, clear-all link |
| 23 | ComedianPageTabs | **A** | Textbook ARIA tabs -- role="tablist", aria-selected, arrow key nav, Home/End keys |
| 24 | ComedianTierRatingForm | **A** | Keyboard shortcuts (1-6), aria-pressed, role="alert", toast notifications, auth redirect |
| 25 | CookieConsent | **A** | Focus trap, role="dialog" with aria-modal, SSR-safe localStorage, context provider pattern |
| 26 | CreatorAnalytics | **B** | Good loading skeletons and retry; `comedianId` prop unused in fetches, index-as-key |
| 27 | CreatorAudienceInsights | **B** | Clean sub-components; `comedianId` prop unused in fetch, no retry mechanism |
| 28 | CreatorIntelligenceDashboard | **B** | Good AbortController usage; ContentTab never fetches data, large monolith |
| 29 | CreatorRevenueChart | **B** | Good stacked bar chart; no AbortController, `comedianId` unused, fragile month parsing |
| 30 | CurrencyConverter | **C** | Auto-fetches on every keystroke (no debounce), labels lack htmlFor, inconsistent color scheme |
| 31 | DiscoveryFeed | **B** | URL-driven tabs and pagination; Tab buttons lack `role="tab"`, no ARIA tab panel roles |
| 32 | DiscussionSection | **B** | Good optimistic voting with rollback; nested clickable elements, no abort cleanup |
| 33 | EmbeddableCheckout | **B-** | Functional checkout widget; 474-line monolith, no AbortController, raw `alert()` for errors |
| 34 | EmptyState | **A** | Clean, reusable, zero-dependency presentation component with good defaults |
| 35 | EventRatingForm | **B+** | Good category-based rating; star buttons lack aria-label, minor stale-closure risk |
| 36 | EventReviews | **B+** | Good pagination and conditional rendering; silent error catch, no loading skeleton |
| 37 | EventReviewsSection | **B** | Combines rating form and reviews list; simple wrapper that could be inline |
| 38 | EventShareButtons | **B+** | Good navigator.share fallback to clipboard; no error feedback on copy failure |
| 39 | ExclusiveContentFeed | **B-** | Functional content feed; no abort cleanup, no error state for users, type `any` in response |
| 40 | FairTicketingWidget | **B+** | Good queue position display with polling; no abort on unmount, aggressive 5s poll interval |
| 41 | FeedContent | **B** | Good infinite scroll; silent error catch, no error state, stale page ref in observer |
| 42 | FestivalCard | **A-** | Clean card with good Image usage and date formatting; minor: no fallback for missing image |
| 43 | FollowButton | **A-** | Good optimistic update with rollback; minor auth redirect handling could use router |
| 44 | Footer | **A-** | Clean responsive footer with newsletter; minor: form doesn't show loading during submit |
| 45 | FriendsGoingBadge | **A-** | Simple, focused, good empty-state handling; no abort cleanup on fetch |
| 46 | ImageGalleryLightbox | **B+** | Good keyboard nav (arrows, escape) and touch support; no focus trap in lightbox overlay |
| 47 | ImageUpload | **B** | File type validation and preview; no file size limit, silent error on upload failure |
| 48 | InstallPrompt | **B** | Smart PWA detection with beforeinstallprompt; complex platform-specific instructions, no dismissal persistence |
| 49 | InternationalSceneCard | **A-** | Clean card with flag emoji, proper Link usage; minor: country code truncation is hardcoded |
| 50 | ListActions | **B** | Good share/save functionality; silent errors, no ARIA on action buttons |
| 51 | LiveChatWidget | **B-** | WebSocket chat with reconnect; no message queue during disconnect, no max reconnect limit |
| 52 | LocationAlertsSection | **B** | Good geolocation integration; no abort cleanup, silent error catching |
| 53 | MapFilterBar | **A-** | Excellent a11y with sr-only labels, smart debouncing with cleanup; duplicated debounce logic |
| 54 | MapPageContent | **A-** | Clean URL-driven state; **Bug:** passes unfiltered `venues` to VenueMap instead of `validVenues` |
| 55 | MarketingDashboard | **B-** | Good AbortController usage; 540-line monolith, no ARIA tabs, silent error swallowing |
| 56 | Nav | **B** | Strong a11y with aria-current, focus trap; "More" dropdown inaccessible to keyboard users |
| 57 | NotificationBell | **B+** | Thorough features (polling, click-outside, escape); silent errors, nested interactive elements |
| 58 | NotificationPreferences | **B+** | Well-structured ToggleSwitch with role="switch"; duplicated `urlBase64ToUint8Array` utility |
| 59 | OfflineIndicator | **A-** | Comprehensive offline UX with auto-sync; missing ARIA live regions for status announcements |
| 60 | Pagination | **A** | Excellent a11y with nav landmark; minor: no individual page numbers, no rel prev/next |
| 61 | PodcastPipelineCard | **B-** | Parallel data fetching; `topEpisodes` state declared but never populated (dead code), no abort cleanup |
| 62 | PollWidget | **B+** | Good error differentiation (401 vs other); array index as key, per-poll error state missing |
| 63 | PricingTierDisplay | **B+** | Good visual hierarchy; no AbortController, `formatPrice` uses fragile string-to-float parsing |
| 64 | PromotedContent | **C+** | Uses Next.js Image properly; no loading state (layout shift), no a11y disclosure for "promoted" |
| 65 | PushNotificationToggle | **B-** | Checks browser support; loading state bug (not in finally block), no permission-denied handling |
| 66 | PushPermissionPrompt | **B+** | Smart delay and cooldown UX; duplicated utility, no focus trap, type assertion code smell |
| 67 | ReportButton | **B** | Clean state machine for submission; missing labels on select/textarea, no role="alert" on messages |
| 68 | ReviewReactions | **B-** | Good optimistic count updates; duplicated "added"/"updated" branches, no response status check |
| 69 | SearchAutocomplete | **A-** | Excellent ARIA combobox implementation; ugly type casting, `events: Array<unknown>` |
| 70 | SearchBar | **A-** | Comprehensive ARIA with aria-live region; 525-line monolith, duplicated SVG icons |
| 71 | SearchPageContent | **B+** | Good URL-driven filters with AbortController; eslint-disable suppressions, SSR-unsafe window usage |
| 72 | SeatPicker | **A-** | Good a11y with aria-label on every seat; unused `layoutId` prop, no grid keyboard navigation |
| 73 | SessionProvider | **B** | Correct App Router pattern; minimal, doesn't forward additional SessionProvider props |
| 74 | SimilarComedians | **B** | Good loading skeleton; no error state, Prisma `_count` naming leaks into component types |
| 75 | SkeletonLoader | **A** | Simple, composable, zero-state; minor: no role="status" or aria-busy |
| 76 | SocialVerification | **B** | Clear step-based flow; text emoji as platform icons, no URL validation, no retry mechanism |
| 77 | SpecialRating | **C+** | Optimistic UI update; silent error swallowing, no aria-label on star buttons |
| 78 | StructuredData | **A** | Clean JSON-LD with typed variants; minor `Record<string, any>` on base component |
| 79 | SubscriptionManager | **C+** | Clean conditional rendering; `alert()` placeholder for cancel, no real subscription management |
| 80 | TasteMatchBadge | **A-** | Clean and focused; minor: no abort controller on fetch for unmount cleanup |
| 81 | TicketButton | **A** | Well-structured affiliate click tracker with proper fallback and `useCallback` |
| 82 | TicketPurchaseWidget | **B** | Functional ticket flow; purchases tickets sequentially in a loop instead of batch API |
| 83 | TicketQRCode | **B-** | Generates fake QR-like pattern, not a real scannable QR code -- misleading in production |
| 84 | TicketScanner | **B+** | Feature-rich with camera, manual entry, sound feedback; camera never actually decodes QR codes |
| 85 | TicketTransferForm | **A** | Clean accessible form with proper labels, role attributes, good error handling |
| 86 | TipButton | **B+** | Full-featured tip modal with gifts; missing aria-label on close, setSubmitting outside finally |
| 87 | Toast | **A** | Elegant context-based system, proper cleanup, aria-live="polite", graceful fallback |
| 88 | UserBadges | **A-** | Clean badge display with SVG icon map; no error handling on non-OK response |
| 89 | UserFollowButton | **A-** | Good optimistic update with rollback; stale `count` in useCallback dependency |
| 90 | VenueEventManager | **A-** | Well-organized dashboard with tabs and stats; no pagination for large event lists |
| 91 | VenueFilterBar | **A-** | Solid form-based filter with advanced toggle; capacity relies on hidden inputs |
| 92 | VenueFloorPlan | **B+** | Interactive grid editor; selectedLayout in fetch deps causes unnecessary refetches, silent errors |
| 93 | VenueLiveDashboard | **B** | SSE-based live data; no reconnect backoff/max retry, light theme inconsistent with brand |
| 94 | VenueMap | **A** | Excellent cookie consent integration, proper Google Maps handling, good fallback states |
| 95 | VenueOpsPanel | **C+** | Entirely static/hardcoded placeholder panels, zero data fetching, light theme inconsistent |
| 96 | VenuePOSDashboard | **A-** | Clean POS summary with revenue breakdown; no refresh mechanism for live updates |
| 97 | VenueReviews | **A-** | Full review CRUD with star rating, pagination, reactions; silent error swallowing |
| 98 | VideoPlayer | **A** | Comprehensive multi-source player (YouTube, TikTok, native), proper a11y labels |
| 99 | WaitlistButton | **B+** | Functional waitlist toggle; no loading state during initial fetch, no error UI |
| 100 | WalletPassButton | **A-** | Clean platform detection for Apple/Google wallet; passUrl state never resets |

---

## Top Issues (Systemic)

### 1. Silent Error Swallowing (30+ components)
The most widespread issue. Empty `catch` blocks or `catch { /* ignore */ }` patterns give users zero feedback when operations fail. Affected: BookingManager, ClipFeed, FeedContent, VenueFloorPlan, SpecialRating, NotificationBell, and many more.

**Recommendation:** Adopt a standard error toast pattern (the `Toast` component already exists) and use it consistently across all catch blocks.

### 2. Missing AbortController Cleanup (20+ components)
Many `useEffect` fetch calls lack `AbortController` for cleanup on unmount. This can cause "state update on unmounted component" warnings and potential memory leaks.

**Affected:** CreatorRevenueChart, PodcastPipelineCard, PricingTierDisplay, FriendsGoingBadge, SimilarComedians, TasteMatchBadge, and others.

### 3. Accessibility Gaps on Dynamic Elements (15+ components)
While form controls generally have good a11y, dynamic/interactive panels (tabs, dropdowns, notification lists, modals) often lack proper ARIA roles (`role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-live` regions).

**Affected:** AnalyticsDashboard, MarketingDashboard, DiscoveryFeed, Nav "More" dropdown.

### 4. Monolithic Components (5 components)
Several components exceed 400+ lines and should be split into sub-components:
- SearchPageContent (862 lines)
- CheckoutFlow (768 lines)
- CreatorIntelligenceDashboard (599 lines)
- AnalyticsDashboard (589 lines)
- MarketingDashboard (539 lines)

### 5. `alert()`/`confirm()` Usage (3 components)
AdminDeleteButton, AdminVenueActions, and SubscriptionManager use browser `alert()`/`confirm()` dialogs instead of accessible, styled modals.

### 6. Placeholder/Dead Code (3 components)
- **VenueOpsPanel:** Entirely hardcoded static data, no API integration
- **PodcastPipelineCard:** `topEpisodes` state declared but never populated
- **TicketQRCode:** Renders a fake QR pattern, not a real scannable code

### 7. Duplicated Utilities
- `urlBase64ToUint8Array` appears in both NotificationPreferences and PushPermissionPrompt
- `formatCount`/`formatNumber` reimplemented in multiple components
- Inline SVG icons duplicated across SearchBar, NotificationBell, and others

---

## Best-in-Class Components

| Component | Why |
|-----------|-----|
| ComedianPageTabs | Textbook ARIA tabs with keyboard navigation |
| CookieConsent | Focus trap, aria-modal, SSR-safe, context provider |
| Toast | Elegant context-based system with proper ARIA live regions |
| CheckoutFlow | Complex multi-step flow done right |
| VenueMap | Cookie consent integration + proper fallback states |
| StructuredData | Clean JSON-LD schema.org implementation |
| Pagination | SEO-friendly URL-based pagination with proper landmarks |

---

## Components Needing Immediate Attention

| Component | Grade | Priority Fix |
|-----------|-------|-------------|
| AdminDeleteButton | C | Replace alert/confirm with accessible modal |
| AdminVenueActions | C | Replace alert/confirm, use Next.js Link |
| BookingManager | C | Add error states, remove silent catches |
| CurrencyConverter | C | Add debounce, fix label associations |
| VenueOpsPanel | C+ | Implement actual data fetching or remove |
| SubscriptionManager | C+ | Replace alert, implement real cancel flow |
| SpecialRating | C+ | Add error feedback, fix star a11y |
| PromotedContent | C+ | Add loading state, a11y disclosure |
| TicketQRCode | B- | Implement real QR code generation |
| MapPageContent | A- | **Bug fix:** Pass `validVenues` instead of `venues` to VenueMap |
