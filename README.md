# LearnLeaf Organizer v3.0

A fully modernized student task & project management PWA. Built with React 18, Tailwind CSS, Vite 5, and Firebase.

## What's New in v3.0

### Stack Changes
- **Removed**: MUI, react-color, ag-grid, handsontable, react-data-grid, react-window, react-data-table-component, yup, flow
- **Added**: Tailwind CSS v3, react-colorful (lightweight color picker), Vite 5 (from v4), @vitejs/plugin-react v4

### Design
- Clean, modern design using the original LearnLeaf color palette (Opal, Mineral Green, Leather, Hemp, Misty Blue, Orchid, Scarlet)
- Playfair Display headings + DM Sans body text
- Sticky frosted-glass top bar
- Mobile bottom tab navigation
- Equal priority on mobile and desktop layouts

### UX Improvements
- **Slide-out sidebars** for all create/edit flows (tasks, subjects, projects) — replaces modals
- Task cards grouped by: Overdue, Today, Tomorrow, Upcoming, No Due Date
- Inline status cycling on task cards (click badge to change status)
- Subject color-coded left border on task cards
- Donut-style progress bars on project cards
- Expandable filter bar with date comparison operators
- Loading spinners and toast notifications
- ConfirmDialog for all destructive actions (no more `window.confirm`)

## Install & Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy to Netlify

Push to GitHub, connect Netlify. The `netlify.toml` handles everything.

## Project Structure

```
src/
├── components/
│   ├── layout/TopBar.jsx         # Sticky nav + mobile bottom tabs
│   ├── tasks/
│   │   ├── TaskCard.jsx          # Task card with inline status cycling
│   │   └── TaskForm.jsx          # Unified add/edit sidebar form
│   ├── subjects/
│   │   └── SubjectForm.jsx       # Subject create/edit sidebar
│   ├── projects/
│   │   └── ProjectForm.jsx       # Project create/edit sidebar
│   └── ui/
│       ├── Sidebar.jsx           # Reusable slide-out panel
│       ├── Toast.jsx             # Toast notifications
│       ├── LoadingSpinner.jsx
│       ├── ConfirmDialog.jsx
│       └── FilterBar.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ResetPasswordPage.jsx
│   ├── TasksPage.jsx             # Main dashboard
│   ├── SubjectsPage.jsx
│   ├── SubjectTasksPage.jsx
│   ├── ProjectsPage.jsx
│   ├── ProjectTasksPage.jsx
│   ├── CalendarPage.jsx
│   ├── ArchivePage.jsx
│   └── UserProfilePage.jsx
├── App.jsx
├── main.jsx
├── UserState.jsx                 # Auth context
├── LearnLeaf_Functions.jsx       # All Firebase/IndexedDB operations
├── db.js                         # IndexedDB helpers
├── firebase.js                   # Firebase config
└── index.css                     # Tailwind + global styles
```

## Color Palette

| Name         | Hex       | Usage                    |
|--------------|-----------|--------------------------|
| Opal         | `#B6CDC8` | Top bar, accents         |
| Mineral Green| `#355147` | Primary actions, text    |
| Leather      | `#9F6C5B` | Secondary, menu icon     |
| Hemp         | `#907474` | Page titles              |
| Misty Blue   | `#5B8E9F` | In-progress, links       |
| Orchid       | `#8E5B9F` | Projects accent          |
| Scarlet      | `#F3161E` | Errors, danger, overdue  |
