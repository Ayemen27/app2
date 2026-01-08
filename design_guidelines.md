# Construction Project Management System - Design Guidelines

## Design Approach
**Reference-Based**: Drawing from Linear's precision, Vercel's minimalism, and Asana's project clarity. Utility-focused dashboard requiring efficiency and mobile-first touch optimization for construction site use.

**Critical RTL Implementation**: Full Arabic support with mirrored layouts (sidebar on right, icons flipped, text alignment right-to-left throughout).

## Layout Architecture

**Spacing System**: Tailwind units of 3, 4, 6, 8, 12, and 16 for mobile-optimized touch targets.

**Mobile-First Structure**:
- **Mobile (<768px)**: Bottom navigation bar (h-16), full-width content, overlay sidebar
- **Tablet (768px-1024px)**: Left sidebar (w-64, RTL: right), main content area
- **Desktop (>1024px)**: Sidebar (w-72, RTL: right), main content (max-w-7xl), optional quick panel (w-80)

**High-Contrast Sidebar** (Slate/Blue gradient background):
- Logo/brand header (h-16, border-b)
- Navigation sections with icon + label (h-12 min touch target)
- Active state indicator (4px right border, RTL: left border)
- Workspace switcher at top
- User profile/settings at bottom (sticky)
- Project favorites pinned section

## Typography Hierarchy
**Font**: Cairo or Tajawal (Google Fonts CDN) for Arabic optimization
- Headers: text-2xl to text-4xl, font-bold
- Section Titles: text-xl, font-semibold
- Body/Cards: text-base, font-medium
- Labels/Meta: text-sm, font-normal
- Buttons: text-sm, font-semibold
- Mobile Headers: Scale down one size (text-xl instead of text-2xl)

## Core Dashboard Components

**Project Overview Cards** (Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns):
- Card dimensions: min-h-48, rounded-xl, p-6
- Header: Project name (text-lg, font-bold) + status badge
- Progress bar with percentage (h-2, rounded-full)
- Key metrics row (grid-cols-3): Budget, Timeline, Tasks
- Team avatars (overlapping, -space-x-2, RTL: -space-x-reverse)
- Quick actions footer (icon buttons, justify-end, RTL: justify-start)

**Mobile Bottom Navigation** (z-50, backdrop-blur):
- 5 core actions: Dashboard, Projects, Tasks, Team, More
- Icon + label (vertical stack)
- Active state with indicator bar (h-1, top, rounded-b-full)
- Touch target: min-h-16, p-4

**Task List Component**:
- Grouped by status (backlog, in-progress, review, completed)
- Each task: rounded-lg, p-4, border-l-4 (priority indicator)
- Checkbox (w-5 h-5, rounded-md, large touch target)
- Task title (text-base, truncate on mobile, full on desktop)
- Assignee avatar (w-8 h-8, rounded-full)
- Due date badge (text-xs, px-2 py-1, rounded-full)
- Mobile: Swipe actions for quick edit/delete

**Project Detail Header**:
- Breadcrumb navigation (text-sm, with Heroicons arrows)
- Project title (text-3xl mobile: text-2xl, font-bold)
- Tab navigation (horizontal scroll on mobile)
- Action buttons (gradient primary CTA, ghost secondary)
- Stats row (grid-cols-2 md:grid-cols-4): Completion, Budget, Team, Documents

**Timeline/Gantt Section**:
- Horizontal scroll container (snap-x on mobile)
- Month headers (sticky)
- Project bars with gradient fills
- Milestone markers (diamond shapes, w-4 h-4)
- Touch-draggable for mobile timeline adjustment
- Zoom controls (pinch-to-zoom + manual buttons)

**Document Management Grid**:
- File cards (aspect-square on mobile, aspect-video on desktop)
- Thumbnail preview area (bg-slate-lighter, rounded-t-lg)
- File info footer (name, size, upload date)
- Overlay actions on hover (desktop) or long-press (mobile)
- Quick filters: All, Images, PDFs, CAD, Reports

## Mobile-Specific Optimizations

**Touch Targets**: All interactive elements minimum 44x44px (h-11, w-11)

**Gestures**:
- Pull-to-refresh on lists
- Swipe-to-delete on task items
- Long-press for context menus
- Pinch-to-zoom on timeline and floor plans

**Input Fields**:
- Extra padding (p-4 vs desktop p-3)
- Large labels (text-base vs desktop text-sm)
- Clear button visible on mobile (x icon, right side, RTL: left)
- Native date/time pickers

**Modal Behavior**:
- Mobile: Full-screen overlay with slide-up animation
- Desktop: Centered dialog (max-w-2xl, rounded-2xl)
- Always include close button (top-right, RTL: top-left)

## Form Layouts

**Create Project Form**:
- Section grouping (border-l-2, pl-6, RTL: border-r-2, pr-6)
- Field spacing (space-y-6)
- Input groups: Label (font-medium, mb-2) + Input (h-12, rounded-lg)
- Helper text (text-sm, mt-1)
- Multi-step on mobile (wizard with progress indicator)
- Single scrollable form on desktop

**Filter Panel**:
- Accordion sections (collapsible on mobile)
- Checkbox groups (space-y-3)
- Date range picker (calendar dropdown)
- Clear filters button (text link, text-sm)
- Apply button (fixed bottom on mobile, sticky)

## Data Visualization

**Charts & Metrics**:
- Donut charts for budget allocation (responsive svg)
- Bar charts for task completion (horizontal on mobile)
- Line graphs for timeline progress
- Card-based KPIs (number + trend arrow + sparkline)
- Mobile: Stack vertically, desktop: grid-cols-3

## Icons & Assets
**Heroicons**: Navigation (home, briefcase, clipboard), actions (plus, edit, trash), status (check, clock, alert)

## Images
**No hero image** - This is a utility dashboard. Focus on data visualization, project thumbnails, and functional clarity.

**Project Thumbnails**: Use placeholder images for construction sites, floor plans, progress photos in project cards and detail views.

## Empty States
**No Projects**: Illustration + "Create First Project" CTA (gradient button, shadow-lg)
**No Tasks**: Checklist icon + "Add Your First Task" prompt
**No Team Members**: Avatar grid placeholder + "Invite Team" action

**Responsive Breakpoints**: Mobile-first cascade - design for 375px, enhance at 768px, optimize at 1280px. All touch targets respect 44px minimum. Sidebar transforms to bottom nav on mobile with smooth transitions (300ms ease). RTL support is mandatory throughout with proper icon mirroring and layout reversal.