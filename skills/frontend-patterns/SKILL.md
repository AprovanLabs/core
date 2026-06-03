---
name: frontend-patterns
description: Component architecture, state management, accessibility, and responsive design patterns for the AprovanLabs React/TypeScript frontend apps.
triggers:
  - component
  - React
  - frontend
  - UI
  - state management
  - accessibility
  - responsive
---

# Frontend Patterns Skill

Use this skill when building or reviewing React components, managing state, or enforcing accessibility and responsive design.

## When to Use

- Designing a new UI component or page
- Reviewing frontend code for correctness and accessibility
- Deciding where to put state and how to manage it
- Implementing responsive layouts

## Component Architecture

### Single Responsibility

Each component does one thing. If a component is doing layout, data fetching, AND business logic — split it.

Layers:
1. **Page components** — route-level, compose feature sections
2. **Feature components** — domain-specific, may fetch data
3. **UI components** — pure presentational, no data fetching

### Component Composition

Prefer composition over configuration:

```tsx
// Bad — configuration via long prop list
<Card title="..." subtitle="..." actions={...} footer={...} />

// Good — composition
<Card>
  <Card.Header>...</Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>
```

### Props

- Destructure props with explicit types, never `any`
- Required props without defaults come first
- Use `children: React.ReactNode` for composable slots
- Keep prop interfaces small — if a component needs >7 props, consider splitting

## State Management

### Where State Lives

```
Local state (useState)     → UI-only state: open/closed, hover, form fields
Context                    → Shared state for a subtree: theme, auth, locale
Server state (TanStack Query / SWR) → Remote data: users, orders, config
URL state                  → Filters, pagination, selected items (survives refresh)
```

### Rules

- Don't lift state higher than necessary
- Server state belongs in a query cache, not in Redux or Context
- URL state for anything a user might want to bookmark or share
- Never store derived data in state — compute from source of truth

## Accessibility (WCAG 2.1 AA)

Every component must meet AA standards. Mandatory:

- **Semantic HTML**: use `<button>`, `<nav>`, `<main>`, `<header>`, etc. not `<div onClick>`
- **Keyboard navigation**: all interactive elements reachable and operable via keyboard alone
- **Focus management**: modals trap focus; after close, return focus to trigger
- **ARIA**: add `aria-label`, `aria-describedby`, `role` only where HTML semantics are insufficient
- **Color contrast**: text must meet 4.5:1 ratio; large text (18px+ bold) 3:1
- **Images**: `alt` text for all `<img>` (empty `alt=""` for decorative images)

### Quick Checklist

- [ ] Interactive elements are `<button>` or `<a>`, not `<div>` or `<span>`
- [ ] Tab order is logical (follows visual order)
- [ ] Focus visible (don't remove `outline` without a custom visible style)
- [ ] ARIA labels on icon-only buttons: `<button aria-label="Close">`
- [ ] No color-only information (e.g., red = error must also have text or icon)

## Responsive Design

- Mobile-first: start with the smallest viewport, use `sm:`, `md:`, `lg:` Tailwind breakpoints to layer up
- Avoid fixed pixel widths; prefer `max-w-*`, `w-full`, `flex`, `grid`
- Test at 375px (mobile), 768px (tablet), 1280px (desktop)
- Touch targets: minimum 44×44px for interactive elements

## Performance

- **Memoization**: use `useMemo` and `useCallback` only when there's a measurable performance problem — don't pre-optimize
- **Code splitting**: use `React.lazy` + `Suspense` for route-level splits
- **Images**: use `<img loading="lazy">` for below-the-fold images; prefer optimized formats
- **Bundle size**: check bundle impact before adding a new dependency (`pnpm why <package>`)

## Review Checklist

- [ ] Component has a single clear responsibility
- [ ] Props typed with explicit TypeScript interface
- [ ] No inline styles
- [ ] Accessible: semantic HTML, keyboard operable, ARIA where needed
- [ ] Responsive at 375px / 768px / 1280px
- [ ] Tests for critical interactions (RTL + Vitest)
- [ ] No console errors or warnings in browser dev tools
