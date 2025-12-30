# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **single-file electronic gift book (礼簿) system** built with React + Vite. The project compiles to a standalone `index.html` file (~320KB) that runs entirely in the browser with no server required. All data is stored in localStorage/sessionStorage.

**Key characteristics:**
- Outputs a single HTML file via `vite-plugin-singlefile`
- Uses HashRouter for client-side routing
- No backend - all data persistence via browser storage
- Supports Excel import/export for data migration
- Real-time guest screen (副屏) sync via localStorage polling
- Voice播报 using Web Speech API

## Architecture

### Core Data Flow
```
localStorage (persistent)
├── giftlist_events          → Event[] (event metadata)
└── giftlist_gifts_{eventId} → GiftRecord[] (encryptedData = JSON string)

sessionStorage (temporary)
└── currentEvent             → { event, timestamp } (active session)

localStorage (sync)
└── guest_screen_data        → { eventName, theme, gifts } (for副屏)
```

### State Management
- **Custom hook**: `useAppStore()` in `src/store/appStore.ts`
- **No external state library** - uses React useState + useEffect
- **Actions**: loadEvents, loadGifts, addEvent, addGift, deleteGift, updateGift
- **Data format**: GiftRecord stores `encryptedData` as JSON string (despite name, it's NOT encrypted - just JSON serialized)

### Component Structure

```
src/
├── main.tsx                    → Entry point, routes setup
├── app/                        → Page components
│   ├── page.tsx                → Home (event selection/creation)
│   ├── setup/page.tsx          → Create new event
│   ├── main/page.tsx           → Main gift entry interface
│   ├── guest-screen/page.tsx   →副屏 display (polls localStorage)
│   └── not-found.tsx           → 404 page
│
├── components/
│   ├── business/               → App-specific components
│   │   ├── GiftEntryForm.tsx   → Form for entering gifts
│   │   ├── ImportExcelModal.tsx→ Multi-step Excel import
│   │   ├── PrintView.tsx       → Print layout component
│   │   └── EventSelector.tsx   → Event selection UI
│   │
│   ├── layout/                 → Layout wrappers
│   │   ├── MainLayout.tsx      → Theme wrapper for main pages
│   │   ├── PageLayout.tsx      → Centered page wrapper
│   │   └── FormLayout.tsx      → Form container
│   │
│   └── ui/                     → Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
│
├── lib/
│   ├── backup.ts               → Excel import/export service (xlsx)
│   ├── voice.ts                → Web Speech API wrapper
│   └── utils.test.ts           → Unit tests
│
├── utils/
│   └── format.ts               → Formatting utilities (amountToChinese, etc.)
│
└── types/
    └── index.ts                → TypeScript interfaces
```

## Key Services

### BackupService (`src/lib/backup.ts`)
Handles all Excel operations using `xlsx` library:

**Export:**
- `exportExcel(eventName, gifts, eventInfo)` → Creates 3-sheet Excel:
  1. 礼金明细 (detailed gift list)
  2. 统计汇总 (statistics)
  3. 事件信息 (event metadata for re-import)

**Import:**
- `previewExcel(file)` → Parses Excel, returns preview data
- `importExcel(file, options)` → Imports with conflict strategies:
  - `skip`: Skip duplicates
  - `overwrite`: Replace duplicates
  - `both`: Keep both

### VoiceService (`src/lib/voice.ts`)
Web Speech API wrapper for TTS (Text-to-Speech):

**Functions:**
- `speakGiftData(name, amount, type, remark)` → "张三，贰仟元整，现金"
- `speakSuccess()` → "录入成功"
- `speakError()` → "录入失败，请重试"
- `isVoiceSupported()` → Check browser support

**Note:** Requires user interaction to activate (browser policy).

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server (port 3000)
pnpm run dev

# Build to single HTML file
pnpm run build
# Output: dist/index.html

# Lint TypeScript
pnpm run lint

# Preview built file
pnpm run preview
```

## Build Output

The build process:
1. Compiles TypeScript
2. Bundles React + all dependencies
3. Inlines all assets (CSS, JS) into single HTML
4. Outputs to `dist/index.html`

**Important:** The built `index.html` is the **entire application** - it can be opened directly via `file://` protocol.

## Data Flow Examples

### Adding a Gift
1. User submits `GiftEntryForm`
2. `handleGiftSubmit()` in `main/page.tsx` calls `actions.addGift()`
3. `addGift()` in `appStore.ts`:
   - Creates `GiftRecord` with `encryptedData: JSON.stringify(giftData)`
   - Appends to `localStorage['giftlist_gifts_{eventId}']`
   - Updates React state
   - Triggers guest screen sync
4. Voice播报 via `speakGiftData()`

### Guest Screen Sync
1. Main page writes to `localStorage['guest_screen_data']` on every gift change
2. Guest screen polls every 2 seconds + listens to `storage` event
3. Displays latest 12 gifts in grid layout

### Excel Import
1. User selects Excel file
2. `ImportExcelModal` reads and previews data
3. User configures import options
4. `BackupService.importExcel()` parses and saves to localStorage
5. Conflicts handled per user strategy

## Important Files to Read First

1. **`src/store/appStore.ts`** - Core state management
2. **`src/lib/backup.ts`** - Excel operations (complex logic)
3. **`src/app/main/page.tsx`** - Main interface (gift entry + display)
4. **`src/lib/voice.ts`** - Voice播报 implementation

## Testing

- Unit tests in `src/lib/*.test.ts`
- Test data page available at `/test-data` route
- Manual testing: Use "Create New Event" with default test data

## Common Tasks

### Fixing a bug in gift entry
- Check `GiftEntryForm.tsx` for form handling
- Check `appStore.ts` for data persistence
- Check `main/page.tsx` for submit handler

### Modifying Excel export format
- Edit `BackupService.exportExcel()` in `src/lib/backup.ts`
- Sheet structure, headers, and styling are all defined there

### Adding a new field to gifts
1. Update `GiftData` interface in `src/types/index.ts`
2. Update form in `GiftEntryForm.tsx`
3. Update display in `GiftBookDisplay.tsx`
4. Update Excel export in `backup.ts`

### Changing themes
- Theme colors are CSS variables in `src/app/globals.css`
- Applied via `theme-festive` / `theme-solemn` classes
- Used in `MainLayout.tsx` and print styles

## Notes for Claude

- **No encryption**: Despite `encryptedData` name, data is just JSON string
- **No authentication**: All data is accessible to anyone with browser access
- **Browser storage only**: Clearing browser data = data loss (warn users to export)
- **Single file constraint**: All code must fit in one HTML after build
- **No external APIs**: Everything runs client-side
- **Chinese-specific**: Amount conversion, vertical text, traditional formatting