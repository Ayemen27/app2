# AI Chat Interface Design Guidelines

## Design Approach
**Reference-Based**: Drawing from ChatGPT, Claude, and Linear's interface excellence. This is a utility-focused chat application requiring clarity, speed, and intuitive navigation.

## Visual Treatment
**Glassmorphism & Depth**: Use backdrop-blur effects on sidebar and floating elements with semi-transparent backgrounds. Apply subtle gradients (blue to indigo) on primary actions and accent areas. Implement soft shadows (shadow-sm to shadow-lg) with minimal offset for professional depth.

## Layout Architecture

**Spacing System**: Tailwind units of 2, 4, 6, 8, and 12 for consistent rhythm.

**Three-Panel Structure**:
1. **Collapsible Sidebar** (w-64 when open, w-16 collapsed): Chat history navigation, glassmorphic background with subtle border
2. **Main Chat Area** (flex-1): Messages container with generous padding (px-6 md:px-12), max-w-4xl centered
3. **Access Panel** (conditional): Elegant modal or inline activation interface with gradient accents

## Typography Hierarchy
**Font**: Inter or similar (Google Fonts CDN)
- Display: text-3xl to text-4xl, font-bold (page headers)
- Chat Messages: text-base, font-normal (line-height-relaxed)
- Timestamps/Meta: text-sm, font-medium, opacity-60
- Sidebar Items: text-sm, font-medium

## Core Components

**Sidebar Navigation**:
- Compact header with logo and collapse toggle
- Scrollable chat history with hover states
- New chat button (gradient background, glassmorphic)
- User profile at bottom
- Each chat item: rounded-lg, p-3, truncated text

**Chat Message Container**:
- Alternating message blocks (user vs AI)
- User messages: align-right, blue gradient background, rounded-2xl
- AI messages: align-left, slate background with subtle glassmorphic effect, rounded-2xl
- Avatar icons (w-8 h-8, rounded-full)
- Generous vertical spacing between messages (space-y-6)

**Input Area**:
- Fixed bottom position with backdrop-blur
- Multi-line textarea with auto-expand
- Send button with gradient (disabled state in muted slate)
- Attachment/options buttons (icon-only, subtle)
- Container: rounded-xl, shadow-lg, glassmorphic border

**Access/Activation Interface**:
- Centered modal (max-w-md) with dramatic glassmorphic card
- Gradient header section
- Clear benefit list with checkmarks (Heroicons)
- Primary CTA button (gradient, shadow-lg)
- Secondary text links
- Pricing tiers if applicable (grid-cols-1 md:grid-cols-2)

## Interaction Patterns
- Smooth sidebar collapse animation (300ms ease)
- Message fade-in on receipt
- Typing indicator (animated dots)
- Skeleton loaders for chat history
- Auto-scroll to latest message

## Responsive Behavior
- Mobile: Sidebar becomes full-screen overlay, hamburger toggle
- Tablet: Sidebar auto-collapses, main area optimized
- Desktop: Three-panel layout with optimal spacing

## Icons
**Heroicons** (CDN): Navigation arrows, chat bubbles, settings, plus/minus, checkmarks, menu

## Images
No hero image needed for this application interface. Focus remains on functional clarity and conversational flow.

## Empty States
- "Start New Conversation" with suggested prompts (grid of 2x2 cards)
- No chat history: Illustration placeholder with welcoming message
- Activation required: Feature showcase with clear upgrade path

**Critical Details**: Messages should breathe with py-4 px-6 padding, code blocks need syntax highlighting placeholders, streaming responses should show character-by-character reveal, maintain consistent glassmorphic treatment across all floating elements for cohesive modern aesthetic.