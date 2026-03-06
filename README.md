# Student Life Problem Solver

A polished, frontend-only website designed to help students manage study plans, expenses, stress, and career exploration.

## Features
- **Dark Theme**: Modern, high-contrast dark mode.
- **Glowing Tool Buttons**: Interactive cards with shine and glow effects.
- **Study Planner**: Track subjects, hours, and priorities.
- **Expense Tracker**: Log spending by category.
- **Stress Checker**: Simple questionnaire with interpretation.
- **Career Helper**: Interest-based career suggestions.
- **Breadcrumb Navigation**: Persistent path awareness.
- **Local Persistence**: Data is saved in the browser's `localStorage`.

## For website, follow link:
https://pathakaayush02.github.io/Student_Life_Prob_Solver

## How to Run Locally
1. Download or clone the repository.
2. Ensure you have the following folder structure:
   - `index.html`
   - `workspace.html`
   - `styles.css`
   - `app.js`
3. Double-click `index.html` to open it in your default web browser.

## Configuration
### Changing the Feedback Link
To update the Feedback button to point to your Google Form:
1. Open `app.js`.
2. Find the `initFeedbackScroll` function (around line 35).
3. Replace the URL in `feedbackBtn.href = "..."` with your Google Form link.

## LocalStorage Documentation
The application uses the following keys in the browser's `localStorage`:
- `slps_planner`: Stores study tasks (Array of Objects).
- `slps_expenses`: Stores expense logs (Array of Objects).

---
© 2026 Student Life Problem Solver
