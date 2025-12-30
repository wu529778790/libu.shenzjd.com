# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **single-file electronic gift book (礼簿) system** built with React + Vite. The project compiles to a standalone `index.html` file (~700KB) that runs entirely in the browser with no server required. All data is stored in localStorage/sessionStorage.

**Key characteristics:**
- Outputs a single HTML file via `vite-plugin-singlefile`
- Uses HashRouter for client-side routing
- No backend - all data persistence via browser storage
- Supports Excel import/export for data migration
- Real-time guest screen (副屏) sync via BroadcastChannel API + localStorage polling
- Voice播报 using Web Speech API
- **No encryption**: Despite `encryptedData` name, data is just JSON string
- **No authentication**: All data is accessible to anyone with browser access
- **Chinese-specific**: Amount conversion, vertical text, traditional formatting

## Architecture

### Core Data Flow
```
localStorage (persistent)
├── giftlist_events          → Event[] (event metadata)
└── giftlist_gifts_{eventId} → GiftRecord[] (jsonData = JSON string)

sessionStorage (temporary)
└── currentEvent             → { event, timestamp } (active session)

localStorage (sync for guest screen)
└── guest_screen_data        → { eventName, theme, gifts } (for副屏)

BroadcastChannel (real-time sync)
└── 'gift_sync'              → { type, data } (instant updates)
```

### State Management
- **Custom hook**: `useAppStore()` in `src/store/appStore.ts`
- **No external state library** - uses React useState + useEffect
- **Actions**: loadEvents, loadGifts, addEvent, addGift, deleteGift, updateGift
- **Data format**: GiftRecord stores `jsonData` as JSON string (NOT encrypted)
- **Session persistence**: Current event stored in sessionStorage for continuity

### Component Structure

```
src/
├── main.tsx                    → Entry point, routes setup
├── app/                        → Page components
│   ├── page.tsx                → Home (event selection/creation)
│   ├── setup/page.tsx          → Create new event
│   ├── main/page.tsx           → Main gift entry interface
│   │   └── components/         → Main page subcomponents
│   │       ├── MainHeader.tsx  → Header with actions
│   │       ├── GiftBookDisplay.tsx → Gift list display
│   │       ├── GiftDetailModal.tsx → Edit/delete modal
│   │       ├── ConfirmModal.tsx    → Confirmation dialogs
│   │       └── SearchFilterModal.tsx → Search/filter UI
│   ├── guest-screen/page.tsx   →副屏 display (polls + BroadcastChannel)
│   ├── test-data/page.tsx      → Test data generation
│   └── not-found.tsx           → 404 page
│
├── components/
│   ├── business/               → App-specific components
│   │   ├── GiftEntryForm.tsx   → Form for entering gifts
│   │   ├── ImportExcelModal.tsx→ Multi-step Excel import
│   │   ├── PrintView.tsx       → Print layout component
│   │   ├── EventSelector.tsx   → Event selection UI
│   │   └── Home/               → Home page subcomponents
│   │       ├── ContinueSession.tsx
│   │       ├── EmptyState.tsx
│   │       └── EventSelection.tsx
│   │
│   ├── layout/                 → Layout wrappers
│   │   ├── MainLayout.tsx      → Theme wrapper for main pages
│   │   ├── PageLayout.tsx      → Centered page wrapper
│   │   └── FormLayout.tsx      → Form container
│   │
│   └── ui/                     → Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       └── Toast.tsx
│
├── lib/
│   ├── backup.ts               → Excel import/export service (xlsx)
│   ├── voice.ts                → Web Speech API wrapper
│   └── utils.test.ts           → Unit tests
│
├── store/
│   └── appStore.ts             → Custom state management hook
│
├── utils/
│   └── format.ts               → Formatting utilities (amountToChinese, etc.)
│
├── constants/
│   └── app.ts                  → App constants
│
├── hooks/
│   └── useEvents.ts            → Event management hook
│
└── types/
    └── index.ts                → TypeScript interfaces
```

## Key Services

### BackupService (`src/lib/backup.ts`)
Handles all Excel operations using `xlsx` library. **Complex logic - read carefully!**

**Export (`exportExcel`):**
- Creates 3-sheet Excel with styling:
  1. **礼金明细**: Detailed gift list with序号,姓名,金额,大写,支付方式,备注,时间
  2. **统计汇总**: Total amount, people count, payment type breakdown
  3. **事件信息**: Event metadata for re-import compatibility

**Import (`importExcel`):**
- `previewExcel(file)` → Parses Excel, returns preview data
- `importExcel(file, options)` → Imports with conflict strategies:
  - `skip`: Skip duplicates
  - `overwrite`: Replace duplicates
  - `both`: Keep both
- **Conflict detection**: Uses `name_amount_timestamp` key
- **Auto-detection**: Supports multiple Excel formats and sheet names

**Template Export (`exportTemplate`):**
- Generates template with example data and instructions
- Includes 2 sheets: 礼金明细 + 使用说明

### VoiceService (`src/lib/voice.ts`)
Web Speech API wrapper for TTS (Text-to-Speech).

**Functions:**
- `speakGiftData(name, amount, type, remark)` → "张三，贰仟元整，现金"
- `speakSuccess()` → "录入成功"
- `speakError()` → "录入失败，请重试"
- `isVoiceSupported()` → Check browser support
- `stopVoice()` → Stop current playback

**Requirements:**
- Requires user interaction to activate (browser policy)
- Auto-selects Chinese voice if available
- Configurable: rate (0.9), pitch (1.0), volume (1.0)

### SyncService (Guest Screen)
Real-time synchronization between main screen and副屏.

**Methods:**
- **BroadcastChannel API**: Instant updates via `gift_sync` channel
- **localStorage polling**: Fallback every 2 seconds
- **Storage event listener**: Cross-tab synchronization
- **Data format**: `{ eventName, theme, gifts: GiftData[] }`

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server (port 3000)
pnpm run dev

# Build to single HTML file
pnpm run build
# Output: dist/index.html (~700KB)

# Lint TypeScript
pnpm run lint

# Preview built file
pnpm run preview

# Run unit tests (if any)
pnpm test  # or check src/lib/*.test.ts
```

## Build Output

The build process:
1. Compiles TypeScript with strict mode
2. Bundles React + all dependencies (react, react-dom, react-router-dom, xlsx)
3. Inlines all assets (CSS, JS, images) into single HTML
4. Outputs to `dist/index.html`

**Important:** The built `index.html` is the **entire application** - it can be opened directly via `file://` protocol without any server.

## Data Flow Examples

### Adding a Gift
1. User submits `GiftEntryForm` in `main/page.tsx`
2. `handleGiftSubmit()` calls `actions.addGift()` from `appStore.ts`
3. `addGift()` in `appStore.ts`:
   - Creates `GiftRecord` with `jsonData: JSON.stringify(giftData)`
   - Appends to `localStorage['giftlist_gifts_{eventId}']`
   - Updates React state
   - Triggers guest screen sync via `syncToGuestScreen()`
4. Voice播报 via `speakGiftData()` from `voice.ts`
5. **BroadcastChannel** sends instant update to副屏

### Guest Screen Sync
1. **Main page** writes to `localStorage['guest_screen_data']` on every gift change
2. **Main page** also sends BroadcastChannel message: `{ type: 'update', data: gifts }`
3. **Guest screen** polls every 2 seconds + listens to `storage` event + BroadcastChannel
4. **Guest screen** displays latest 12 gifts in grid layout with pulse animation

### Excel Import
1. User selects Excel file via `ImportExcelModal`
2. `previewExcel()` parses and validates data
3. User configures import options (conflict strategy, target event)
4. `importExcel()` processes with conflict detection
5. Data saved to localStorage, state updated

### Print Flow
1. User clicks "Print/PDF" in `MainHeader`
2. Opens new window with `PrintView.tsx`
3. `PrintView` renders gift list in A4 landscape format
4. Auto-opens print dialog
5. Theme colors auto-adapt (festive/solemn)

## Important Files to Read First

1. **`src/store/appStore.ts`** - Core state management (275 lines)
2. **`src/lib/backup.ts`** - Excel operations (929 lines, complex)
3. **`src/app/main/page.tsx`** - Main interface (gift entry + display)
4. **`src/lib/voice.ts`** - Voice播报 implementation
5. **`src/types/index.ts`** - TypeScript interfaces
6. **`src/app/guest-screen/page.tsx`** - Real-time sync implementation

## Testing

- **Unit tests**: `src/lib/utils.test.ts` (formatting utilities)
- **Test data page**: `/test-data` route for generating sample data
- **Manual testing**: Use "Create New Event" with default test data
- **Excel testing**: Import/export with various conflict scenarios

## Common Tasks

### Fixing a bug in gift entry
- Check `GiftEntryForm.tsx` for form validation
- Check `appStore.ts` for data persistence logic
- Check `main/page.tsx` for submit handler
- Check `voice.ts` for播报 errors

### Modifying Excel export format
- Edit `BackupService.exportExcel()` in `src/lib/backup.ts` (lines 557-778)
- Sheet structure, headers, styling, column widths all defined there
- **Important**: Update all 3 sheets (明细, 统计, 事件信息)

### Adding a new field to gifts
1. Update `GiftData` interface in `src/types/index.ts`
2. Update form in `GiftEntryForm.tsx`
3. Update display in `GiftBookDisplay.tsx`
4. Update Excel export in `backup.ts`
5. Update Excel import parsing in `backup.ts`

### Changing themes
- Theme colors are CSS variables in `src/app/globals.css`
- Applied via `theme-festive` / `theme-solemn` classes
- Used in `MainLayout.tsx` and print styles
- Guest screen also respects theme

### Fixing guest screen sync issues
- Check BroadcastChannel implementation in `main/page.tsx`
- Check localStorage polling in `guest-screen/page.tsx`
- Check storage event listener
- Verify both tabs are same origin

### Adding new payment types
- Update `GiftType` in `src/types/index.ts`
- Update `GiftEntryForm.tsx` options
- Update Excel validation in `backup.ts` (line 396)

## Important Notes for Claude

### Data Storage
- **No encryption**: Despite `encryptedData` name in comments, data is just JSON string
- **No authentication**: All data is accessible to anyone with browser access
- **Browser storage only**: Clearing browser data = data loss (warn users to export)
- **Single file constraint**: All code must fit in one HTML after build
- **No external APIs**: Everything runs client-side

### Performance Considerations
- **Large datasets**: Pagination implemented in `GiftBookDisplay.tsx`
- **Search/filter**: Real-time filtering without server
- **Memory**: All data loaded into React state at once
- **Excel**: Uses streaming for large files

### Browser Compatibility
- **Web Speech API**: Chrome/Edge best, Firefox/Safari partial
- **BroadcastChannel**: Modern browsers only (IE not supported)
- **localStorage**: All modern browsers
- **file:// protocol**: Works but some features may be limited

### Security Considerations
- **XSS**: All user input is sanitized via React
- **Data privacy**: Data never leaves browser
- **No CSRF**: No server requests
- **No SQL injection**: No database

### Chinese-Specific Features
- **Amount conversion**: `amountToChinese()` converts 1234 → "壹仟贰佰叁拾肆元整"
- **Vertical text**: Print layout uses traditional format
- **Theme colors**: Red for festive, gray for solemn
- **Voice**: Chinese language preference

### Common Pitfalls
1. **BroadcastChannel**: Only works in same-origin tabs
2. **Voice**: Requires user interaction first
3. **Excel**: File format validation is strict
4. **Session storage**: Lost on browser close
5. **localStorage**: Limited to ~5MB per domain

## Debugging Tips

### Check localStorage data
```javascript
// In browser console
JSON.parse(localStorage.getItem('giftlist_events'))
JSON.parse(localStorage.getItem('giftlist_gifts_{eventId}'))
JSON.parse(localStorage.getItem('guest_screen_data'))
```

### Check session
```javascript
JSON.parse(sessionStorage.getItem('currentEvent'))
```

### Test BroadcastChannel
```javascript
// In console of main tab
const bc = new BroadcastChannel('gift_sync');
bc.postMessage({ type: 'test', data: 'hello' });

// In console of guest tab
const bc = new BroadcastChannel('gift_sync');
bc.onmessage = (e) => console.log('Received:', e.data);
```

### Test voice
```javascript
// In browser console
if ('speechSynthesis' in window) {
  const utterance = new SpeechSynthesisUtterance('测试语音');
  speechSynthesis.speak(utterance);
}
```