# CLUTCH — A Student Toolkit

A polished, frontend-only web app designed to help students manage their academic life, finances, mental health, and career planning — all in one place.

**Live site:** https://pathakaayush02.github.io/Student_Life_Prob_Solver

---

## Tools

| Tool | Description |
|------|-------------|
| Study Planner | Organize subjects, set priorities, and track study hours |
| Expense Tracker | Log daily spending, set budgets, and track savings |
| Stress Checker | Answer 10 questions and get a personalized stress report |
| Career Helper | Select interests and skills to discover matching career paths |
| Focus Timer | Pomodoro-based timer with EXP rewards and session tracking |
| CLUTCH AI | AI-powered mood companion — talk, vent, and feel better |

---

## Features

- 6 fully functional student tools
- EXP gamification system across Study Planner and Focus Timer
- AI emotional support via CLUTCH AI (powered by Groq)
- Clean golden aesthetic with CLUTCH branding
- All data saved locally in browser via localStorage
- Fully static — no backend, no login required
- Mobile responsive

---

## Tech Stack

- HTML, CSS, JavaScript (vanilla)
- Groq API (for CLUTCH AI)
- GitHub Pages (hosting)

---

## Project Structure
```
Student_Life_Prob_Solver/
├── index.html        # Homepage with tool cards
├── workspace.html    # All 6 tools in one file
├── style.css         # Main stylesheet
├── app.js            # Main JavaScript logic
├── logo.png          # CLUTCH logo / favicon
└── README.md
```

---

## localStorage Keys

| Key | Tool | Data |
|-----|------|------|
| `slps_planner` | Study Planner | Array of study tasks |
| `slps_expenses` | Expense Tracker | Array of expense logs |
| `clutch_exp` | Focus Timer | Total EXP earned |
| `clutch_sessions` | Focus Timer | Sessions completed |
| `clutch_focus_minutes` | Focus Timer | Total focus time |

---

## How to Run Locally

1. Clone the repository
2. Open `index.html` in any browser
3. No build step or server required

---

## About

Built by Aayush Pathak. Focused on making student life more efficient and turning students into assets in society.

---

© 2026 CLUTCH — A Student Toolkit
