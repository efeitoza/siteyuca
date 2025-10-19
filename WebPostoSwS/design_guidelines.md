# Design Guidelines: WebPosto-SwS Integration Platform

## Design Approach: Carbon Design System

**Rationale**: This is an enterprise middleware application requiring clarity, efficiency, and data density. Carbon Design System excels in business applications with complex data management, real-time monitoring, and configuration needs.

**Core Principles**:
- Clarity over decoration
- Efficient information density
- Professional, trustworthy aesthetic
- Consistent, predictable patterns

## Color Palette

**Light Mode**:
- Primary: 220 90% 56% (IBM Blue)
- Background: 0 0% 100%
- Surface: 220 14% 96%
- Border: 220 13% 91%
- Text Primary: 220 13% 18%
- Text Secondary: 220 9% 46%
- Success: 150 60% 45%
- Error: 0 72% 51%
- Warning: 45 100% 51%

**Dark Mode**:
- Primary: 220 90% 56%
- Background: 220 18% 12%
- Surface: 220 16% 18%
- Border: 220 12% 25%
- Text Primary: 0 0% 98%
- Text Secondary: 220 10% 70%
- Success: 150 50% 50%
- Error: 0 65% 55%
- Warning: 45 95% 55%

## Typography

**Font Stack**: 'IBM Plex Sans', -apple-system, system-ui, sans-serif

**Scale**:
- Headings: 32px/28px/24px/20px (font-weight: 600)
- Body: 16px (font-weight: 400)
- Small/Labels: 14px (font-weight: 400)
- Code/Data: 'IBM Plex Mono', monospace, 14px

## Layout System

**Spacing Units**: Use Tailwind units of 1, 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4 to p-8
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4 to gap-6

**Grid Structure**:
- Main dashboard: 12-column grid with sidebar (3-col) and content (9-col)
- Configuration forms: 2-column layout on desktop, stack on mobile
- Transaction tables: Full-width with horizontal scroll if needed

## Component Library

### Navigation
- Left sidebar navigation with collapsible sections
- Top bar with user profile, notifications, dark mode toggle
- Breadcrumb navigation for deep navigation paths
- Active state: solid background fill with primary color

### Configuration Panel
- Card-based sections with headers
- Form inputs: consistent height (h-10), border-2, focus ring
- Toggle switches for enable/disable features
- "Save Changes" button: sticky bottom bar or top-right position
- Input groups: labels above inputs, helper text below in muted color

### Transaction Dashboard
- KPI cards at top: count of transactions, success rate, errors
- Status badges: pill-shaped with dot indicator (green/red/yellow)
- Data tables: striped rows, sticky headers, sortable columns
- Pagination: bottom of tables with items-per-page selector
- Search/filter bar: top of tables with date range picker

### Monitoring & Logs
- Real-time status indicators: pulsing dot for active connections
- Log viewer: monospace font, alternating line backgrounds
- Expandable rows for detailed transaction data
- JSON viewer: syntax highlighted with collapsible sections
- Export buttons: CSV/JSON download options

### Data Tables
- Row height: 48px for comfortable scanning
- Alternating row colors for readability
- Hover state: subtle background change
- Action buttons: icon-only in last column
- Loading state: skeleton rows or spinner overlay

### Status Indicators
- Connection status: colored dot + text ("Connected", "Disconnected")
- Transaction status: badge with icon (checkmark/warning/error)
- API health: traffic light system (green/yellow/red)

### Forms
- Input fields: border-2, rounded-md, focus:ring-2
- Validation: inline error messages in red below inputs
- Required fields: asterisk (*) in label
- Multi-step forms: progress indicator at top

### Modals & Dialogs
- Confirmation dialogs: centered, max-w-lg
- Detail views: slide-out panel from right (max-w-2xl)
- Destructive actions: require confirmation with red primary button

## Information Hierarchy

**Dashboard Priority**:
1. System health status (top banner if critical)
2. Key metrics cards (transaction counts, error rates)
3. Recent transactions table
4. Quick actions / configuration links

**Configuration Priority**:
1. Section headers with save state indicator
2. Critical settings (API credentials) first
3. Advanced settings collapsible/secondary tab
4. Test connection buttons adjacent to credentials

**Transaction Log Priority**:
1. Filter/search controls
2. Status summary
3. Detailed transaction list
4. Individual transaction details (expandable)

## Responsive Behavior

**Desktop (lg+)**: Full sidebar, multi-column layouts, expanded data tables
**Tablet (md)**: Collapsible sidebar, 2-column forms become stacked
**Mobile (sm)**: Hidden sidebar with hamburger menu, single column everything, horizontal scroll for tables

## Interactions

**Minimal Animations**:
- Sidebar collapse/expand: 200ms ease
- Modal fade in: 150ms
- Loading spinners: continuous rotation
- Success notifications: toast slide-in from top-right
- No decorative animations

**Feedback**:
- Button clicks: subtle scale or opacity change
- Form submission: loading state on button + disable
- Save success: green toast notification
- Errors: red toast with retry option
- API calls: inline loading spinner or skeleton state

## Additional Specifications

**Error Handling UI**:
- Inline validation errors below inputs
- Toast notifications for system errors
- Error state for entire sections (with retry button)
- Failed transaction highlighting in tables

**Empty States**:
- "No transactions yet" with setup guide link
- "No configuration" with quick start button
- Clear iconography and helpful next steps

**Data Visualization** (if needed):
- Line charts for transaction volume over time
- Bar charts for success/failure rates
- Use Carbon's data-viz color tokens

This design creates a professional, efficient enterprise interface optimized for data management, monitoring, and configuration tasks.