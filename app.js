/**
 * Student Life Problem Solver - Core Logic
 * 
 * This script handles all the interactive features of the application,
 * including navigation, tool rendering, and data persistence using LocalStorage.
 * 
 * LocalStorage Keys:
 * - sl_study_tasks: Array of { id, subject, hours, completed, earnedExp, priority }
 * - clutch_exp: Number (Total EXP earned from study tasks)
 * - slps_expenses: Array of { id, name, category, amount, date }
 * - sl_savings_amount: Number (User's monthly savings target)
 * - sl_savings_points: Number (Points awarded based on savings percentage)
 * - slps_stress: Object { lastScore, lastTips, timestamp }
 * - slps_career_saved: Array of saved career objects
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize core components
    initNavigation();
    initFeedbackScroll();
    initGlobalAnimations();

    // Check if we are on the workspace page and initialize the requested tool
    if (document.getElementById('toolWorkspace')) {
        initWorkspace();
    }
});

/* -------------------------------------------------------------------------- */
/*                                 Navigation                                 */
/* -------------------------------------------------------------------------- */

/**
 * Handles global navigation enhancements, such as mouse-tracking glow effects.
 */
function initNavigation() {
    // Mouse follow effect for glassmorphism glow cards
    // This calculates the relative mouse position and sets CSS variables
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.glow-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // Route fade-out for tool cards
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const href = card.getAttribute('href');
            if (!href) return;
            if (href.startsWith('#')) return;
            if (supportsReducedMotion()) {
                return;
            }
            e.preventDefault();
            document.body.classList.add('route-fade-out');
            setTimeout(() => {
                window.location.href = href;
            }, 180);
        });
    });
}

/* -------------------------------------------------------------------------- */
/*                              Animation Helpers                             */
/* -------------------------------------------------------------------------- */

/**
 * Returns true if user prefers reduced motion.
 */
function supportsReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Smoothly animates a numeric text content from one value to another.
 * Falls back to direct assignment when reduced motion is enabled.
 */
function animateCount(element, from, to, duration = 600) {
    if (!element) return;
    if (supportsReducedMotion()) {
        element.textContent = to;
        return;
    }

    const start = performance.now();
    const diff = to - from;

    const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const eased = progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress;
        const current = Math.round(from + diff * eased);
        element.textContent = current;
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
}

/**
 * Creates a floating label that moves from a source element towards a
 * target element, used for EXP and points animations.
 */
function flyTo(targetElement, text, options = {}) {
    if (!targetElement || supportsReducedMotion()) return;

    const color = options.color || '#fbbf24';
    const rect = targetElement.getBoundingClientRect();
    const float = document.createElement('div');
    float.className = 'exp-float';
    float.textContent = text;
    float.style.left = `${rect.left + rect.width / 2}px`;
    float.style.top = `${rect.top}px`;
    float.style.color = color;

    document.body.appendChild(float);
    setTimeout(() => float.remove(), 1000);
}

let revealObserver = null;

/**
 * Registers elements for scroll-reveal animations.
 */
function registerRevealElements(root = document) {
    if (supportsReducedMotion()) return;

    if (!('IntersectionObserver' in window)) return;
    if (!revealObserver) {
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15
        });
    }

    const elements = root.querySelectorAll('.glow-card, .planner-main, .exp-panel, .stress-question, .career-card, .pomodoro-container');
    elements.forEach(el => {
        if (!el.classList.contains('reveal-on-scroll')) {
            el.classList.add('reveal-on-scroll');
            revealObserver.observe(el);
        }
    });
}

/**
 * Attaches ripple effects to clickable elements.
 */
function attachRippleEffects(root = document) {
    const clickableSelectors = ['.btn', '.tool-card'];
    clickableSelectors.forEach((selector) => {
        root.querySelectorAll(selector).forEach((el) => {
            if (el.dataset.rippleBound === 'true') return;
            el.dataset.rippleBound = 'true';

            el.addEventListener('click', (event) => {
                if (supportsReducedMotion()) return;
                const rect = el.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
                ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
                el.appendChild(ripple);
                setTimeout(() => ripple.remove(), 500);
            });
        });
    });
}

/**
 * Initializes global animation helpers for the current document.
 */
function initGlobalAnimations() {
    registerRevealElements(document);
    attachRippleEffects(document);
}

/**
 * Handles the visibility of scroll-triggered Call-To-Action buttons.
 */
function initFeedbackScroll() {
    const ctaContainer = document.getElementById('ctaContainer');
    if (!ctaContainer) return;

    window.addEventListener('scroll', () => {
        // Show the feedback/survey buttons after the user has scrolled 300 pixels
        if (window.scrollY > 300) {
            ctaContainer.classList.remove('hidden');
        } else {
            ctaContainer.classList.add('hidden');
        }
    });
}

/* -------------------------------------------------------------------------- */
/*                               EXP Level System                              */
/* -------------------------------------------------------------------------- */

const EXP_LEVELS = [
  { level: 1, title: "Freshman",     min: 0,    max: 99   },
  { level: 2, title: "Scholar",      min: 100,  max: 249  },
  { level: 3, title: "Achiever",     min: 250,  max: 499  },
  { level: 4, title: "Hustler",      min: 500,  max: 899  },
  { level: 5, title: "Expert",       min: 900,  max: 1399 },
  { level: 6, title: "Mastermind",   min: 1400, max: 1999 },
  { level: 7, title: "Legend",       min: 2000, max: 2999 },
  { level: 8, title: "CLUTCH Master",min: 3000, max: 99999}
];

function getCurrentLevel(exp) {
  return EXP_LEVELS.findLast(l => exp >= l.min) || EXP_LEVELS[0];
}

function getNextLevel(exp) {
  return EXP_LEVELS.find(l => exp < l.min) || null;
}

function updateLevelUI(exp) {
  const current = getCurrentLevel(exp);
  const next = getNextLevel(exp);

  const levelEl = document.getElementById("exp-level-title");
  const levelNum = document.getElementById("exp-level-num");
  const expBar = document.getElementById("exp-progress-bar");
  const expBarText = document.getElementById("exp-bar-text");

  if (levelEl) levelEl.textContent = current.title;
  if (levelNum) levelNum.textContent = "Level " + current.level;

  if (next) {
    const progress = ((exp - current.min) / (next.min - current.min)) * 100;
    if (expBar) expBar.style.width = Math.min(progress, 100) + "%";
    if (expBarText) expBarText.textContent = exp + " / " + next.min + " EXP";
  } else {
    if (expBar) expBar.style.width = "100%";
    if (expBarText) expBarText.textContent = "MAX LEVEL 🏆";
  }
}

/* -------------------------------------------------------------------------- */
/*                               Workspace Init                               */
/* -------------------------------------------------------------------------- */

/**
 * Orchestrates tool rendering based on URL query parameters.
 * Example: workspace.html?tool=study
 */
async function initWorkspace() {
    const params = new URLSearchParams(window.location.search);
    const tool = params.get('tool');
    const workspace = document.getElementById('toolWorkspace');
    const breadcrumb = document.getElementById('toolNameBreadcrumb');

    if (!tool) {
        // If no tool is specified, redirect back to home
        window.location.href = 'index.html';
        return;
    }

    // Map tool names to their respective render functions
    switch (tool) {
        case 'study':
            breadcrumb.textContent = 'Study Planner';
            renderStudyPlanner(workspace);
            break;
        case 'expense':
            breadcrumb.textContent = 'Expense Tracker';
            renderExpenseTracker(workspace);
            break;
        case 'stress':
            breadcrumb.textContent = 'Stress Checker';
            renderStressChecker(workspace);
            break;
        case 'career':
            breadcrumb.textContent = 'Career Helper';
            renderCareerHelper(workspace);
            break;
        case 'pomodoro':
            breadcrumb.textContent = 'Focus Timer';
            await renderPomodoroTimer(workspace);
            break;
        case 'clutchai':
            breadcrumb.textContent = 'CLUTCH AI';
            renderClutchAI(workspace);
            break;
        default:
            // Error handling for invalid tool parameter
            workspace.innerHTML = '<div class="glass-panel text-center"><h1>Tool Not Found</h1><p>The tool you are looking for does not exist.</p></div>';
    }
}

/* -------------------------------------------------------------------------- */
/*                               Study Planner                                */
/* -------------------------------------------------------------------------- */

/**
 * Renders the Study Planner tool workspace.
 * Features: Task management, Priority levels, EXP system, LocalStorage persistence.
 * @param {HTMLElement} container - The workspace container to render into.
 */
function renderStudyPlanner(container) {
    container.innerHTML = `
        <div class="tool-header">
            <div class="tool-icon-large">
                <i data-lucide="book-open" width="28" height="28"></i>
            </div>
            <div>
                <h1>Study Planner</h1>
                <p class="text-muted">Organize your subjects, set goals, and track every study hour</p>
            </div>
        </div>
        
        <div class="planner-layout">
            <div class="planner-main">
                <div class="card">
                    <h2>Add Study Subject</h2>
                    <form id="studyForm">
                        <div class="form-group">
                            <label for="subject" class="form-label">Subject Name</label>
                            <input type="text" id="subject" class="form-input" placeholder="e.g. Data Structures" required>
                        </div>
                        <div class="form-group">
                            <label for="hours" class="form-label">Study Duration (Hours)</label>
                            <input type="number" id="hours" class="form-input" min="0.1" step="0.1" placeholder="e.g. 2.0" required>
                        </div>
                        <div class="form-group">
                            <label for="priority" class="form-label">Priority Level</label>
                            <select id="priority" class="form-select">
                                <option value="Low">Low</option>
                                <option value="Medium" selected>Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary">Add to Plan</button>
                    </form>
                </div>

                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2>My Study Plan</h2>
                        <div class="badge badge-success" id="totalHoursBadge">0 hours</div>
                    </div>
                    <div id="taskList">
                        <p class="text-muted text-center">Loading study plans...</p>
                    </div>
                </div>
            </div>

            <aside class="planner-sidebar">
                <div class="card">
                    <h3>EXP System</h3>
                    <div style="text-align:center; padding:16px 0;">

  <div style="font-size:13px; font-weight:600; color:#b8960c; letter-spacing:1px; margin-bottom:4px;" id="exp-level-num">Level 1</div>

  <div style="font-size:22px; font-weight:700; color:var(--text-primary); margin-bottom:2px;" id="exp-level-title">Freshman</div>

  <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,#b8960c,#7a6200); display:flex; align-items:center; justify-content:center; margin:12px auto; flex-direction:column;">
    <span style="font-size:24px; font-weight:700; color:white;" id="totalExpDisplay">0</span>
    <span style="font-size:10px; color:rgba(255,255,255,0.8);">EXP</span>
  </div>

  <div style="margin:12px 0 4px; font-size:12px; color:var(--text-muted);" id="exp-bar-text">0 / 100 EXP</div>

  <div style="background:var(--border-color); border-radius:10px; height:8px; overflow:hidden; margin:0 8px;">
    <div id="exp-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#b8960c,#f0c040); border-radius:10px; transition:width 0.5s ease;"></div>
  </div>

  <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">Next level progress</div>

</div>
                    <div style="background: var(--bg-soft-highlight); padding: 1rem; border-radius: var(--radius-button); margin-bottom: 1rem;">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">Conversion Rate</div>
                        <div style="color: var(--color-muted); font-size: 0.9rem;">1 Hour = 5 EXP</div>
                    </div>
                    <div id="expConversionText" style="color: var(--color-muted); font-size: 0.9rem; margin-bottom: 1rem;">Current Potential: 0 EXP</div>
                    <button id="resetExpBtn" class="btn btn-ghost" style="width: 100%;">Reset Progress</button>
                </div>
            </aside>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:32px; padding-top:16px; border-top:1px solid #e8d88a;">
          <a href="app.html" class="close-tool-btn">
            Close Tool
          </a>
        </div>
        <div id="ariaAnnouncer" class="sr-only" aria-live="polite"></div>
    `;

    const form = document.getElementById('studyForm');
    const taskList = document.getElementById('taskList');
    const totalHoursBadge = document.getElementById('totalHoursBadge');
    const totalExpDisplay = document.getElementById('totalExpDisplay');
    const expConversionText = document.getElementById('expConversionText');
    const resetExpBtn = document.getElementById('resetExpBtn');
    const ariaAnnouncer = document.getElementById('ariaAnnouncer');

    const XP_PER_TASK = 10;

    const calculateEarnedExp = (hours) => Math.round(parseFloat(hours) * 5);

    const announce = (message) => {
        ariaAnnouncer.textContent = message;
    };

    const animateExpGain = (amount, sourceElement) => {
        if (amount === 0) return;
        flyTo(sourceElement, `${amount > 0 ? '+' : ''}${amount} EXP`, { color: '#fbbf24' });
    };

    const loadTasks = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            taskList.innerHTML = '<p class="text-muted text-center">Please login to view study plans</p>';
            return;
        }

        console.log('[Study Plans] Fetching study plans...');
        taskList.innerHTML = '<p class="text-muted text-center">Loading study plans...</p>';

        // 5s timeout to show "Waking up server" message
        let slowServerTimeout = setTimeout(() => {
            taskList.innerHTML = '<p class="text-muted text-center">Waking up server, please wait...</p>';
        }, 5000);

        const fetchWithRetry = async (retryCount = 0) => {
            try {
                const res = await fetch('https://student-life-backend-1.onrender.com/api/study-plans', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    cache: 'no-store'
                });

                console.log('[Study Plans] Response status:', res.status);

                if (!res.ok) {
                    throw new Error(`Failed to fetch plans: ${res.status}`);
                }

                return await res.json();
            } catch (error) {
                if (retryCount === 0 && (error.name === 'TypeError' || error.message.includes('Failed to fetch'))) {
                    // Network error - retry once
                    console.log('[Study Plans] Retrying request...');
                    taskList.innerHTML = '<p class="text-muted text-center">Waking up server, please wait...</p>';
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                    return fetchWithRetry(1);
                }
                throw error;
            }
        };

        try {
            clearTimeout(slowServerTimeout);
            const data = await fetchWithRetry();
            console.log('[Study Plans] Response data:', data);

            const studyPlans = Array.isArray(data.data) ? data.data : [];

            taskList.innerHTML = '';
            let totalHours = 0;

            if (studyPlans.length === 0) {
                taskList.innerHTML = '<p class="text-muted text-center">No study plans yet. Add your first subject!</p>';
                totalHoursBadge.textContent = '0 hours';
                expConversionText.textContent = `Total hours: 0h → 0 EXP possible`;
            } else {
                studyPlans.forEach((plan) => {
                    totalHours += parseFloat(plan.targetHours || 0);
                    const div = document.createElement('div');
                    div.className = 'card';
                    div.style.marginBottom = '1rem';

                    const statusBadgeColor = plan.status === 'completed' ? 'success' :
                                            plan.status === 'in-progress' ? 'primary' : 'muted';
                    const isCompleted = plan.status === 'completed';

                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <button class="btn btn-ghost" style="padding: 0.5rem; min-width: auto;"
                                        onclick="markStudyPlanDone('${plan._id || plan.id}')"
                                        aria-label="Mark ${plan.title} as completed"
                                        ${isCompleted ? 'disabled' : ''}>
                                    <i data-lucide="${isCompleted ? 'check-circle' : 'circle'}" width="20" height="20"
                                       style="color: ${isCompleted ? 'var(--color-success)' : 'var(--color-muted)'}"></i>
                                </button>
                                <div>
                                    <div style="font-weight: 600; color: ${isCompleted ? 'var(--color-muted)' : 'var(--color-heading)'}">
                                        ${plan.title}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; flex-wrap: wrap;">
                                        <span class="text-muted">${plan.subject}</span>
                                        <span class="text-muted">•</span>
                                        <span class="text-muted">${plan.targetHours} hours</span>
                                        <span class="badge badge-${statusBadgeColor}" style="font-size: 0.75rem; text-transform: capitalize;">${plan.status}</span>
                                    </div>
                                </div>
                            </div>
                            <button class="btn btn-ghost" style="color: var(--color-danger);"
                                    onclick="deleteStudyPlan('${plan._id || plan.id}')"
                                    aria-label="Delete ${plan.title}">
                                <i data-lucide="trash-2" width="16" height="16"></i>
                            </button>
                        </div>
                    `;
                    taskList.appendChild(div);
                });

                totalHoursBadge.textContent = `${totalHours.toFixed(1)} hours`;
                expConversionText.textContent = `Total hours: ${totalHours.toFixed(1)}h → ${Math.round(totalHours * 5)} EXP possible`;
            }

            // Re-initialize Lucide icons for new elements
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            clearTimeout(slowServerTimeout);
            console.error('[Study Plans] Error loading after retry:', error);
            taskList.innerHTML = '<p class="text-muted text-center">Failed to load study plans</p>';
            totalHoursBadge.textContent = '0 hours';
            expConversionText.textContent = `Total hours: 0h → 0 EXP possible`;
        }

        // Fetch XP from backend
        await loadXpFromBackend();
    };

    const loadXpFromBackend = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const fetchXpWithRetry = async (retryCount = 0) => {
            try {
                const res = await fetch('https://student-life-backend-1.onrender.com/api/xp', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    cache: 'no-store'
                });

                if (!res.ok) throw new Error('Failed to load XP');

                return await res.json();
            } catch (error) {
                if (retryCount === 0 && (error.name === 'TypeError' || error.message.includes('Failed to fetch'))) {
                    console.log('[XP] Retrying request...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return fetchXpWithRetry(1);
                }
                throw error;
            }
        };

        try {
            const data = await fetchXpWithRetry();
            const xp = data.xp || 0;
            const currentExp = parseInt(totalExpDisplay.textContent || '0');
            animateCount(totalExpDisplay, isNaN(currentExp) ? 0 : currentExp, xp);
            updateLevelUI(xp);
        } catch (error) {
            console.error('[XP] Error loading after retry:', error);
            // Fallback to localStorage if backend fails
            const localXp = parseInt(localStorage.getItem('clutch_exp') || '0');
            const currentExp = parseInt(totalExpDisplay.textContent || '0');
            animateCount(totalExpDisplay, isNaN(currentExp) ? 0 : currentExp, localXp);
            updateLevelUI(localXp);
        }
    };

    // Global functions for study plan actions
    window.deleteStudyPlan = async (id) => {
        if (!confirm('Are you sure you want to delete this study plan?')) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`https://student-life-backend-1.onrender.com/api/study-plans/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                cache: 'no-store'
            });

            if (!res.ok) throw new Error('Failed to delete');

            await loadTasks();
            await loadXpFromBackend();
        } catch (error) {
            console.error('[Study Plans] Delete error:', error);
            alert('Failed to delete study plan');
        }
    };

    window.markStudyPlanDone = async (id) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            // Update status
            const res = await fetch(`https://student-life-backend-1.onrender.com/api/study-plans/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                cache: 'no-store',
                body: JSON.stringify({ status: 'completed' })
            });

            if (!res.ok) throw new Error('Failed to update');

            // Add XP
            try {
                await fetch('https://student-life-backend-1.onrender.com/api/xp', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    cache: 'no-store',
                    body: JSON.stringify({ xp: XP_PER_TASK })
                });
            } catch (xpError) {
                console.error('[XP] Add error:', xpError);
                const currentXp = parseInt(localStorage.getItem('clutch_exp') || '0');
                localStorage.setItem('clutch_exp', currentXp + XP_PER_TASK);
            }

            await loadTasks();
        } catch (error) {
            console.error('[Study Plans] Update error:', error);
            alert('Failed to mark study plan as done');
        }
    };

    resetExpBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset all EXP? This will not delete your study plans.')) {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    await fetch('https://student-life-backend-1.onrender.com/api/xp', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        cache: 'no-store',
                        body: JSON.stringify({ xp: 0, reset: true })
                    });
                } catch (error) {
                    console.error('[XP] Reset error:', error);
                }
            }
            localStorage.setItem('clutch_exp', 0);
            await loadTasks();
            announce('EXP has been reset.');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const subjectName = document.getElementById('subject').value.trim();
        const duration = document.getElementById('hours').value;

        if (!subjectName) {
            alert('Please enter a subject name');
            return;
        }

        const targetHours = Number(duration);
        if (isNaN(targetHours) || targetHours <= 0) {
            alert('Please enter a valid number of hours');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Adding...';

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login');
            submitButton.disabled = false;
            submitButton.textContent = 'Add to Plan';
            return;
        }

        try {
            const res = await fetch('https://student-life-backend-1.onrender.com/api/study-plans', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                cache: 'no-store',
                body: JSON.stringify({
                    title: subjectName,
                    subject: subjectName,
                    description: 'Added from frontend',
                    targetHours: targetHours,
                    status: 'pending'
                })
            });

            if (!res.ok) throw new Error('Failed to add');

            form.reset();
            await loadTasks();
        } catch (error) {
            console.error('[Study Plans] Add error:', error);
            alert('Failed to add study plan');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Add to Plan';
        }
    });

    // Load study plans ONLY after auth is verified
    if (window.AuthState && window.AuthState.verified) {
        // Auth already verified, load immediately
        loadTasks();
    } else if (window.AuthState) {
        // Register callback for when auth is verified
        window.AuthState.onVerified.push(loadTasks);
    }
}


/* -------------------------------------------------------------------------- */
/*                               Expense Tracker                              */
/* -------------------------------------------------------------------------- */

/**
 * Renders the Expense Tracker tool workspace.
 * Features: Expense logging, Category filtering, Savings Box, Points system.
 * @param {HTMLElement} container - The workspace container to render into.
 */
function renderExpenseTracker(container) {
    container.innerHTML = `
        <div class="tool-header">
            <div class="tool-icon-large">
                <i data-lucide="wallet" width="28" height="28"></i>
            </div>
            <div>
                <h1>Expense Tracker</h1>
                <p class="text-muted">Log daily spending, set a monthly budget, and track your savings</p>
            </div>
        </div>
        
        <div class="planner-layout">
            <div class="planner-main">
                <div class="card">
                    <h2>Add Expense</h2>
                    <form id="expenseForm">
                        <div class="form-group">
                            <label for="expName" class="form-label">Expense Description</label>
                            <input type="text" id="expName" class="form-input" placeholder="e.g. Lunch with friends" required>
                        </div>
                        <div class="form-group">
                            <label for="expCategory" class="form-label">Category</label>
                            <select id="expCategory" class="form-select">
                                <option value="Food">Food & Dining</option>
                                <option value="Transport">Transport</option>
                                <option value="Study">Study Materials</option>
                                <option value="Clothes">Clothing</option>
                                <option value="Friends">Social/Entertainment</option>
                                <option value="Other">Miscellaneous</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="expAmount" class="form-label">Amount (₹)</label>
                            <input type="number" id="expAmount" class="form-input" step="0.01" min="0" placeholder="0.00" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Log Expense</button>
                    </form>
                </div>
                
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2>Transaction History</h2>
                        <div id="totalDisplay" style="font-size: 1.5rem; font-weight: 700; color: var(--color-heading);">₹0.00</div>
                    </div>
                    <div id="expenseList"></div>
                </div>
            </div>

            <aside class="planner-sidebar">
                <div class="card">
                    <h3>Savings Box</h3>
                    <div style="text-align: center; padding: 2rem 0;">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                            <i data-lucide="piggy-bank" width="40" height="40" style="color: white;"></i>
                        </div>
                        <div id="savingsPointsDisplay" style="font-size: 2.5rem; font-weight: 800; color: var(--color-heading); line-height: 1;">0</div>
                        <div style="color: var(--color-muted); font-size: 0.9rem;">SAVINGS POINTS</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="savingsAmount" class="form-label">Monthly Savings Target (₹)</label>
                        <input type="number" id="savingsAmount" class="form-input" min="0" step="0.01" placeholder="e.g. 500">
                    </div>

                    <div style="background: var(--bg-soft-highlight); padding: 1rem; border-radius: var(--radius-button); margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span style="font-weight: 600;">Current Ratio</span>
                            <strong id="savingsPercentDisplay" style="color: var(--color-primary);">0%</strong>
                        </div>
                        <div id="savingsMessage" style="color: var(--color-muted); font-size: 0.9rem;">Awarding points for savings above 10%.</div>
                    </div>
                    
                    <div style="background: var(--bg-soft-highlight); padding: 1rem; border-radius: var(--radius-button);">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">How it works</div>
                        <div style="color: var(--color-muted); font-size: 0.9rem;">Earn 1 point for every 1% saved (min. 10% savings rate)</div>
                    </div>
                </div>
            </aside>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:32px; padding-top:16px; border-top:1px solid #e8d88a;">
          <a href="app.html" class="close-tool-btn">
            Close Tool
          </a>
        </div>
        <div id="ariaAnnouncer" class="sr-only" aria-live="polite"></div>
    `;

    const form = document.getElementById('expenseForm');
    const list = document.getElementById('expenseList');
    const totalDisplay = document.getElementById('totalDisplay');
    const savingsInput = document.getElementById('savingsAmount');
    const savingsPercentDisplay = document.getElementById('savingsPercentDisplay');
    const savingsPointsDisplay = document.getElementById('savingsPointsDisplay');
    const savingsMessage = document.getElementById('savingsMessage');
    const ariaAnnouncer = document.getElementById('ariaAnnouncer');

    const announce = (message) => {
        ariaAnnouncer.textContent = message;
    };

    const animatePointsGain = (amount, sourceElement) => {
        if (amount === 0) return;
        flyTo(sourceElement, `${amount > 0 ? '+' : ''}${amount} pts`, { color: '#10b981' });
    };

    // Backend-connected Expense Tracker
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('index.html');
        return;
    }

    const updateSavingsUI = (expenses, settings) => {
        const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const savingsAmount = parseFloat(settings?.savingsTarget || 0);

        savingsInput.value = savingsAmount > 0 ? savingsAmount : '';

        if (totalExpense === 0) {
            savingsPercentDisplay.textContent = '0%';
            savingsPointsDisplay.textContent = '0';
            savingsMessage.textContent = 'Add expenses to calculate savings.';
            return;
        }

        let savingsPercent = Math.floor((savingsAmount / totalExpense) * 100);
        if (savingsPercent > 100) savingsPercent = 100;

        let newPoints = savingsPercent >= 10 ? savingsPercent : 0;

        savingsPercentDisplay.textContent = `${savingsPercent}%`;
        const currentPoints = parseInt(savingsPointsDisplay.textContent || '0');
        animateCount(savingsPointsDisplay, isNaN(currentPoints) ? 0 : currentPoints, newPoints);

        if (newPoints > currentPoints && newPoints > 0) {
            animatePointsGain(newPoints - currentPoints, savingsPointsDisplay);
            document.querySelector('.savings-panel')?.classList.add('glow');
            setTimeout(() => {
                const panel = document.querySelector('.savings-panel');
                if (panel) panel.classList.remove('glow');
            }, 700);
            announce(`You earned ${newPoints} savings points!`);
        }

        if (savingsPercent >= 10) {
            savingsMessage.innerHTML = `You saved ${savingsPercent}% — You earned ${newPoints} points!`;
        } else {
            savingsMessage.textContent = 'Save at least 10% to earn points.';
        }
    };

    const loadExpenses = async () => {
        try {
            const [expRes, settingsRes] = await Promise.all([
                fetch('https://student-life-backend-1.onrender.com/api/expenses', {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    cache: 'no-store'
                }),
                fetch('https://student-life-backend-1.onrender.com/api/expense-settings', {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    cache: 'no-store'
                })
            ]);

            if (expRes.status === 401 || settingsRes.status === 401) {
                clearAllUserState();
                window.location.replace('index.html');
                return;
            }

            const expResult = expRes.ok ? await expRes.json() : { data: [] };
            const settingsResult = settingsRes.ok ? await settingsRes.json() : { data: {} };

            const expenses = Array.isArray(expResult) ? expResult : expResult.data || [];
            const settings = settingsResult.data || settingsResult || {};

            list.innerHTML = '';
            let total = 0;

            if (!Array.isArray(expenses) || expenses.length === 0) {
                list.innerHTML = '<p class="text-muted text-center">No expenses recorded yet. Add your first expense above!</p>';
            } else {
                expenses.forEach((exp) => {
                    total += parseFloat(exp.amount);
                    const div = document.createElement('div');
                    div.className = 'card';
                    div.style.marginBottom = '1rem';
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; color: var(--color-heading); margin-bottom: 0.25rem;">
                                    ${exp.name}
                                </div>
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span class="badge badge-primary" style="font-size: 0.75rem;">${exp.category}</span>
                                    <span style="font-weight: 700; color: var(--color-heading);">₹${parseFloat(exp.amount).toFixed(2)}</span>
                                </div>
                            </div>
                            <button class="btn btn-ghost" style="color: var(--color-danger);"
                                    onclick="deleteExpense('${exp._id || exp.id}')"
                                    aria-label="Delete ${exp.name}">
                                <i data-lucide="trash-2" width="16" height="16"></i>
                            </button>
                        </div>
                    `;
                    list.appendChild(div);
                });
            }

            totalDisplay.textContent = `₹${total.toFixed(2)}`;
            updateSavingsUI(expenses, settings);

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (err) {
            console.error('[Expense Tracker] Failed to load:', err);
            list.innerHTML = '<p class="text-muted text-center">Failed to load expenses. Please try again.</p>';
        }
    };

    window.deleteExpense = async (id) => {
        try {
            const res = await fetch(`https://student-life-backend-1.onrender.com/api/expenses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                cache: 'no-store'
            });

            if (res.status === 401) {
                clearAllUserState();
                window.location.replace('index.html');
                return;
            }

            if (res.ok) {
                await loadExpenses();
            }
        } catch (err) {
            console.error('[Expense Tracker] Failed to delete:', err);
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newExp = {
            name: document.getElementById('expName').value,
            category: document.getElementById('expCategory').value,
            amount: parseFloat(document.getElementById('expAmount').value)
        };

        try {
            const res = await fetch('https://student-life-backend-1.onrender.com/api/expenses', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify(newExp)
            });

            if (res.status === 401) {
                clearAllUserState();
                window.location.replace('index.html');
                return;
            }

            if (res.ok) {
                form.reset();
                await loadExpenses();
            }
        } catch (err) {
            console.error('[Expense Tracker] Failed to add:', err);
        }
    });

    savingsInput.addEventListener('input', async (e) => {
        const val = parseFloat(e.target.value) || 0;
        if (val < 0) {
            e.target.value = 0;
            return;
        }

        try {
            const res = await fetch('https://student-life-backend-1.onrender.com/api/expense-settings', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify({ savingsTarget: val })
            });

            if (res.status === 401) {
                clearAllUserState();
                window.location.replace('index.html');
                return;
            }

            if (res.ok) {
                await loadExpenses();
            }
        } catch (err) {
            console.error('[Expense Tracker] Failed to update settings:', err);
        }
    });

    loadExpenses();
}

/* -------------------------------------------------------------------------- */
/*                               Stress Checker                               */
/* -------------------------------------------------------------------------- */

/**
 * Enhanced Stress Checker
 * localStorage keys:
 * - sl_stress_responses: number[] (10 answers, 1&ndash;5 scale)
 * - sl_stress_result: { score: number, label: string, date: string }
 */
function renderStressChecker(container) {
    container.innerHTML = `
        <div class="tool-header">
            <div class="tool-icon-large">
                <i data-lucide="heart-pulse" width="28" height="28"></i>
            </div>
            <div>
                <h1>Stress Checker</h1>
                <p class="text-muted">Check in with yourself, measure stress levels, and get actionable tips</p>
            </div>
        </div>
        
        <div class="card">
            <div id="stressContent">
                <p style="margin-bottom: 2rem;">Answer these 10 quick questions to check your current stress level. Be honest — this is for you.</p>

                <div style="margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span id="stressProgressText" style="font-weight: 600;">0% complete</span>
                    </div>
                    <div id="stressProgressBar" style="height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden;" 
                         role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Stress check progress">
                        <div id="stressProgressFill" style="height: 100%; background: var(--color-primary); width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <div id="stressForm">
                    <div id="stressQuestions"></div>
                    <p id="stressValidation" class="text-danger" style="display: none;">Please answer all 10 questions to see your result.</p>
                    <div style="text-align: center; margin-top: 2rem;">
                        <button type="button" onclick="calculateStress()" class="btn btn-primary btn-large">See My Stress Meter</button>
                    </div>
                </div>

                <div id="stress-result" style="display:none;"></div>

                <div id="stressResultWrapper" style="display: none;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="width: 200px; height: 100px; background: var(--bg-soft-highlight); border-radius: var(--radius-card); position: relative; margin: 0 auto 1rem;">
                            <div id="stressMeterFill" style="position: absolute; bottom: 0; left: 0; right: 0; background: var(--color-success); border-radius: 0 0 var(--radius-card) var(--radius-card); transition: all 0.5s ease;"></div>
                            <div id="stressMeterNeedle" style="position: absolute; bottom: 0; left: 50%; width: 4px; height: 80px; background: var(--color-heading); transform: translateX(-50%) rotate(0deg); transform-origin: bottom center; transition: transform 0.5s ease;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; width: 200px; margin: 0 auto;">
                            <span style="font-size: 0.8rem; color: var(--color-success);">Low</span>
                            <span style="font-size: 0.8rem; color: var(--color-amber);">Medium</span>
                            <span style="font-size: 0.8rem; color: var(--color-danger);">High</span>
                        </div>
                    </div>

                    <div class="card" style="background: var(--bg-soft-highlight);">
                        <h2 id="stressResultLabel" style="text-align: center; margin-bottom: 1rem;"></h2>
                        <p id="stressResultWhy" style="text-align: center; margin-bottom: 1.5rem;"></p>
                        <div id="stressResultTips"></div>
                    </div>
                </div>
            </div>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:32px; padding-top:16px; border-top:1px solid #e8d88a;">
          <a href="app.html" class="close-tool-btn">
            Close Tool
          </a>
        </div>
    `;

    const QUESTIONS = [
        "How often do you feel overwhelmed by your studies or workload?",
        "How often do you have trouble relaxing after a day of classes or work?",
        "How often do you find it hard to concentrate on tasks or lectures?",
        "How often do you feel nervous, anxious, or on edge about your future?",
        "How often do you feel tired even after getting sleep?",
        "How often do you feel like you have too many responsibilities at once?",
        "How often do you skip breaks or hobbies because you feel too busy?",
        "How often do you feel irritated or lose patience with friends or family?",
        "How often do you feel like you are not doing \"enough\", even when you try?",
        "How often do you feel alone with your stress or worries?"
    ];

    const OPTIONS = [
        { value: 1, label: "Never" },
        { value: 2, label: "Almost Never" },
        { value: 3, label: "Sometimes" },
        { value: 4, label: "Fairly Often" },
        { value: 5, label: "Very Often" }
    ];

    const totalQuestions = QUESTIONS.length;

    const stressContent = document.getElementById('stressContent');
    const questionsContainer = document.getElementById('stressQuestions');
    const form = document.getElementById('stressForm');
    const validationHint = document.getElementById('stressValidation');
    const submitBtn = document.getElementById('stressSubmitBtn');
    const progressBar = document.getElementById('stressProgressBar');
    const progressFill = document.getElementById('stressProgressFill');
    const progressText = document.getElementById('stressProgressText');
    const resultWrapper = document.getElementById('stressResultWrapper');
    const meterFill = document.getElementById('stressMeterFill');
    const meterNeedle = document.getElementById('stressMeterNeedle');
    const resultLabel = document.getElementById('stressResultLabel');
    const resultWhy = document.getElementById('stressResultWhy');
    const resultTips = document.getElementById('stressResultTips');
    const retakeBtn = document.getElementById('stressRetakeBtn');
    const clearBtn = document.getElementById('stressClearBtn');
    const announcer = document.getElementById('stressAnnouncer');

    let responses = new Array(totalQuestions).fill(null);

    const announce = (message) => {
        announcer.textContent = message;
    };

    const safeGet = (key) => {
        try {
            return window.localStorage ? localStorage.getItem(key) : null;
        } catch {
            return null;
        }
    };

    const safeSet = (key, value) => {
        try {
            if (window.localStorage) {
                localStorage.setItem(key, value);
            }
        } catch {
            // ignore
        }
    };

    const safeRemove = (key) => {
        try {
            if (window.localStorage) {
                localStorage.removeItem(key);
            }
        } catch {
            // ignore
        }
    };

    const getAnsweredCount = () => responses.filter((v) => typeof v === 'number').length;

    const updateProgress = () => {
        let answered = 0;
        
        // Count answered questions directly from DOM
        for (let i = 1; i <= 10; i++) {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            if (selected) {
                answered++;
            }
        }
        
        const percent = Math.round((answered / totalQuestions) * 100);
        progressFill.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', String(percent));
        progressText.textContent = `${percent}% complete`;
        submitBtn.disabled = answered !== totalQuestions;
    };

    const calculateStressScore = () => {
        return responses.reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
    };

    const getStressBand = (normalizedScore) => {
        if (normalizedScore <= 13) {
            return {
                label: "Cool & Collected",
                why: "Your answers suggest you're handling stress well most of the time.",
                tips: [
                    "Keep using healthy habits that already work for you.",
                    "Protect your sleep, breaks, and hobbies — they are your superpower.",
                    "Notice small stress signals early and respond kindly to yourself."
                ],
                severity: "low"
            };
        }
        if (normalizedScore <= 26) {
            return {
                label: "Feeling the Pressure",
                why: "Your answers show regular stress that might be starting to build up.",
                tips: [
                    "Break big tasks into smaller steps and plan one thing at a time.",
                    "Try quick relaxation breaks: deep breaths, stretching, or short walks.",
                    "Share how you feel with a friend, mentor, or family member you trust."
                ],
                severity: "medium"
            };
        }
        return {
            label: "Totally Overwhelmed",
            why: "Your answers show high stress that deserves attention and support.",
            tips: [
                "Talk to a trusted adult, teacher, or counselor about how you feel.",
                "Do not handle everything alone — ask for help with tasks or deadlines.",
                "Create a small daily routine that includes rest, food, and movement."
            ],
            severity: "high"
        };
    };

    const renderConfetti = () => {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = `${10 + Math.random() * 80}%`;
            piece.style.animationDelay = `${Math.random() * 0.4}s`;
            stressContent.appendChild(piece);
            setTimeout(() => piece.remove(), 1200);
        }
    };

    const renderStressResult = (normalizedScore, fromLoad) => {
        const band = getStressBand(normalizedScore);
        const percent = Math.max(0, Math.min(1, normalizedScore / 40));

        meterFill.style.width = `${percent * 100}%`;
        meterNeedle.style.left = `${percent * 100}%`;

        meterFill.classList.remove('low', 'medium', 'high');
        meterFill.classList.add(band.severity);

        resultLabel.textContent = band.label;
        resultWhy.textContent = `Why you got this: ${band.why}`;
        resultTips.innerHTML = band.tips.map((tip) => `<li>${tip}</li>`).join('');

        resultWrapper.classList.remove('hidden');

        if (!fromLoad) {
            resultWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        resultWrapper.classList.remove('calm-mode');
        if (band.severity === 'low') {
            renderConfetti();
        } else if (band.severity === 'high') {
            resultWrapper.classList.add('calm-mode');
        }

        const resultPayload = {
            score: normalizedScore,
            label: band.label,
            date: new Date().toISOString()
        };
        safeSet('sl_stress_result', JSON.stringify(resultPayload));

        announce(`Your stress level: ${band.label}. Score ${normalizedScore}.`);
    };

    const saveStressState = () => {
        safeSet('sl_stress_responses', JSON.stringify(responses));
    };

    const loadStressState = () => {
        const storedResponses = safeGet('sl_stress_responses');
        if (storedResponses) {
            try {
                const parsed = JSON.parse(storedResponses);
                if (Array.isArray(parsed) && parsed.length === totalQuestions) {
                    responses = parsed.map((v) => (typeof v === 'number' ? v : null));
                }
            } catch {
                responses = new Array(totalQuestions).fill(null);
            }
        }

        const storedResult = safeGet('sl_stress_result');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                if (parsed && typeof parsed.score === 'number') {
                    renderStressResult(parsed.score, true);
                }
            } catch {
                // ignore
            }
        }
    };

    const clearStressState = () => {
        if (!window.confirm('Clear your answers and result?')) {
            return;
        }
        responses = new Array(totalQuestions).fill(null);
        safeRemove('sl_stress_responses');
        safeRemove('sl_stress_result');
        form.reset();
        resultWrapper.classList.add('hidden');
        updateProgress();
        announce('Stress check cleared. You can start again.');
    };

    QUESTIONS.forEach((text, index) => {
        const qIndex = index + 1;
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'stress-question';

        const legend = document.createElement('legend');
        legend.textContent = `${qIndex}. ${text}`;
        fieldset.appendChild(legend);

        const scale = document.createElement('div');
        scale.className = 'emoji-scale';

        OPTIONS.forEach((opt) => {
            const label = document.createElement('label');
            label.className = 'emoji-option';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `q${qIndex}`;
            input.value = String(opt.value);
            input.required = true;

            input.addEventListener('change', () => {
                responses[index] = opt.value;
                saveStressState();
                updateProgress();
            });

            label.appendChild(input);
            label.appendChild(document.createTextNode(opt.label));
            scale.appendChild(label);
        });

        fieldset.appendChild(scale);
        questionsContainer.appendChild(fieldset);
    });

    if (safeGet('sl_stress_responses')) {
        try {
            const parsed = JSON.parse(safeGet('sl_stress_responses'));
            if (Array.isArray(parsed) && parsed.length === totalQuestions) {
                responses = parsed.map((v) => (typeof v === 'number' ? v : null));
                responses.forEach((value, index) => {
                    if (typeof value === 'number') {
                        const qIndex = index + 1;
                        const selector = `input[name="q${qIndex}"][value="${value}"]`;
                        const input = form.querySelector(selector);
                        if (input) {
                            input.checked = true;
                        }
                    }
                });
            }
        } catch {
            responses = new Array(totalQuestions).fill(null);
        }
    }

    updateProgress();
    loadStressState();
}

// Global functions for stress checker
function calculateStress() {
    let total = 0;
    let answered = 0;

    for (let i = 1; i <= 10; i++) {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        if (selected) {
            total += parseInt(selected.value);
            answered++;
        }
    }

    if (answered < 10) {
        alert("Please answer all 10 questions before checking your stress level.");
        return;
    }

    showResult(total);
}

function showResult(score) {
    const resultDiv = document.getElementById("stress-result");
    resultDiv.style.display = "block";
    resultDiv.scrollIntoView({ behavior: "smooth" });

    let level, message, color, tips;

    if (score <= 15) {
        level = "Low Stress";
        color = "#4caf50";
        message = "You're handling things really well! Keep up your healthy habits.";
        tips = ["Maintain your sleep schedule", "Keep doing what's working", "Help a friend who might be struggling"];
    } else if (score <= 25) {
        level = "Moderate Stress";
        color = "#ff9800";
        message = "You're managing but feeling the pressure. Time for some self-care.";
        tips = ["Take short breaks between study sessions", "Try 5 minutes of deep breathing daily", "Talk to a friend about what's on your mind"];
    } else if (score <= 35) {
        level = "High Stress";
        color = "#f44336";
        message = "You're carrying a lot right now. Please don't ignore this.";
        tips = ["Prioritize sleep above all else", "Break big tasks into tiny steps", "Reach out to someone you trust today"];
    } else {
        level = "Very High Stress";
        color = "#9c27b0";
        message = "This is serious. You deserve real support right now.";
        tips = ["Talk to a counsellor or trusted adult", "Take one day at a time", "You are not alone — please reach out"];
    }

    resultDiv.innerHTML = `
        <div style="border: 2px solid ${color}; border-radius: 16px; padding: 24px; margin-top: 24px; text-align: center;">
            <h2 style="color: ${color}; font-size: 28px; margin-bottom: 8px;">${level}</h2>
            <p style="font-size: 16px; color: #444; margin-bottom: 20px;">${message}</p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 16px; text-align: left;">
                <p style="font-weight: 600; margin-bottom: 10px;">What you can do right now:</p>
                <ul style="list-style: none; padding: 0;">
                    ${tips.map(t => `<li style="padding: 6px 0; border-bottom: 1px solid #eee;">✓ ${t}</li>`).join("")}
                </ul>
            </div>
            <button onclick="resetStress()" style="margin-top: 20px; padding: 10px 24px; background: #7a6a1e; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 14px;">Retake Quiz</button>
        </div>
    `;
}

function resetStress() {
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    const resultDiv = document.getElementById("stress-result");
    resultDiv.style.display = "none";
    resultDiv.innerHTML = "";
    
    // Reset progress bar to 0%
    const progressFill = document.getElementById("stressProgressFill");
    const progressText = document.getElementById("stressProgressText");
    if (progressFill) progressFill.style.width = "0%";
    if (progressText) progressText.textContent = "0% complete";
    
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -------------------------------------------------------------------------- */
/*                               Career Helper                                */
/* -------------------------------------------------------------------------- */

const CAREER_DATA = [
    {
        title: "Web Developer",
        interests: ["Technology & IT"],
        description: "Builds and maintains websites using coding languages and frameworks.",
        skills: ["HTML", "CSS", "JavaScript", "React", "Node.js"],
        growth: "Junior Developer → Senior → Tech Lead → CTO",
        education: "B.Tech in CS, Bootcamps, or Self-taught",
        nextSteps: ["Learn HTML/CSS", "Build a portfolio project", "Learn a JS framework", "Contribute to Open Source"],
        matchedInterests: []
    },
    {
        title: "Mobile App Developer",
        interests: ["Technology & IT", "Design & Creative"],
        description: "Creates applications for mobile devices using iOS or Android platforms.",
        skills: ["Swift", "Kotlin", "React Native", "Flutter", "Mobile UI", "UX Design"],
        growth: "App Developer → Senior → Mobile Architect",
        education: "CS degree or specialized mobile dev courses",
        nextSteps: ["Learn Swift or Kotlin", "Build a simple app", "Publish to App Store/Play Store", "Learn about human-centered design"],
        matchedInterests: []
    },
    {
        title: "Data Scientist",
        interests: ["Data & AI", "Technology & IT"],
        description: "Analyzes complex data to help organizations make informed decisions.",
        skills: ["Python", "R", "SQL", "Machine Learning", "Statistics"],
        growth: "Data Analyst → Data Scientist → Senior Data Scientist → Head of Data",
        education: "Degree in Math, CS, or Data Science",
        nextSteps: ["Learn Python and SQL", "Take a Statistics course", "Work on Kaggle datasets"],
        matchedInterests: []
    },
    {
        title: "UI/UX Designer",
        interests: ["Design & Creative", "Technology & IT"],
        description: "Designs the interface and user experience for digital products.",
        skills: ["Figma", "Adobe XD", "User Research", "Prototyping"],
        growth: "Junior Designer â†’ Senior Designer â†’ Design Lead â†’ VP of Product",
        education: "Design degree or specialized UI/UX certification",
        nextSteps: ["Learn Figma", "Study design principles", "Create a case study", "Network with designers"],
        matchedInterests: []
    },
    {
        title: "Digital Marketer",
        interests: ["Marketing & Media", "Business & Management"],
        description: "Promotes products or brands through digital channels like social media and search engines.",
        skills: ["SEO", "Content Marketing", "Social Media Ads", "Analytics"],
        growth: "Marketing Associate â†’ Manager â†’ Marketing Director â†’ CMO",
        education: "Degree in Marketing, Communications, or Business",
        nextSteps: ["Get Google Ads certification", "Start a blog", "Learn SEO basics", "Manage a social media page"],
        matchedInterests: []
    },
    {
        title: "Product Manager",
        interests: ["Business & Management", "Technology & IT", "Design & Creative"],
        description: "Oversees the development and success of a product from start to finish.",
        skills: ["Strategic Planning", "Market Research", "Agile", "Communication"],
        growth: "Associate PM â†’ Product Manager â†’ Senior PM â†’ Director of Product",
        education: "MBA, CS degree, or Product Management courses",
        nextSteps: ["Read 'Cracking the PM Interview'", "Learn Agile/Scrum", "Work on a side project product"],
        matchedInterests: []
    },
    {
        title: "Financial Analyst",
        interests: ["Finance & Commerce", "Business & Management"],
        description: "Analyzes financial data to help businesses make investment and spending decisions.",
        skills: ["Excel", "Financial Modeling", "Accounting", "Risk Assessment"],
        growth: "Junior Analyst â†’ Senior Analyst â†’ Portfolio Manager â†’ CFO",
        education: "Degree in Finance, Accounting, or Economics",
        nextSteps: ["Master Excel", "Learn Financial Modeling", "Prepare for CFA Level 1"],
        matchedInterests: []
    },
    {
        title: "AI Engineer",
        interests: ["Data & AI", "Technology & IT"],
        description: "Develops and deploys artificial intelligence models and systems.",
        skills: ["Deep Learning", "Neural Networks", "PyTorch", "TensorFlow"],
        growth: "AI Engineer â†’ Senior AI Engineer â†’ AI Architect â†’ Research Scientist",
        education: "Advanced degree in CS, AI, or Robotics",
        nextSteps: ["Learn Linear Algebra", "Master Deep Learning frameworks", "Build a neural network project"],
        matchedInterests: []
    },
    {
        title: "Cloud Engineer",
        interests: ["Technology & IT", "Emerging Fields"],
        description: "Designs and manages an organization's cloud infrastructure.",
        skills: ["AWS", "Azure", "Docker", "Kubernetes", "Linux"],
        growth: "Cloud Admin â†’ Cloud Engineer â†’ Cloud Architect â†’ DevOps Lead",
        education: "CS degree or Cloud certifications (AWS/Azure)",
        nextSteps: ["Get AWS Certified", "Learn Linux commands", "Build a cloud-hosted app"],
        matchedInterests: []
    },
    {
        title: "Cybersecurity Analyst",
        interests: ["Technology & IT", "Emerging Fields"],
        description: "Protects an organization's networks and data from cyber threats.",
        skills: ["Network Security", "Ethical Hacking", "Cryptography", "Incident Response"],
        growth: "Security Analyst â†’ Senior Analyst â†’ Security Architect â†’ CISO",
        education: "Degree in Cybersecurity or CS with security focus",
        nextSteps: ["Learn networking basics", "Get CompTIA Security+", "Practice on TryHackMe"],
        matchedInterests: []
    },
    {
        title: "Full-Stack Developer",
        interests: ["Technology & IT"],
        description: "Develops both client and server software.",
        skills: ["HTML/CSS", "JavaScript", "Node.js", "Express", "MongoDB", "SQL"],
        growth: "Junior Full-Stack â†’ Senior â†’ Lead Architect",
        education: "CS degree or full-stack web development bootcamps",
        nextSteps: ["Master both frontend and backend", "Build a full-stack app", "Learn database management"],
        matchedInterests: []
    },
    {
        title: "Business Analyst",
        interests: ["Business & Management", "Data & AI"],
        description: "Uses data to bridge the gap between IT and business to improve processes.",
        skills: ["SQL", "Tableau", "Power BI", "Data Visualization", "Requirement Gathering"],
        growth: "Junior BA â†’ Senior BA â†’ Lead BA â†’ Operations Manager",
        education: "Degree in Business, IT, or Data Analytics",
        nextSteps: ["Learn SQL", "Master Tableau or Power BI", "Take a Business Analysis course"],
        matchedInterests: []
    },
    {
        title: "Graphic Designer",
        interests: ["Design & Creative"],
        description: "Creates visual concepts to communicate ideas that inspire, inform, and captivate.",
        skills: ["Photoshop", "Illustrator", "InDesign", "Typography", "Branding"],
        growth: "Junior Designer â†’ Art Director â†’ Creative Director",
        education: "BFA in Design or portfolio-based training",
        nextSteps: ["Master Adobe Suite", "Build a design portfolio", "Learn typography basics"],
        matchedInterests: []
    },
    {
        title: "Blockchain Analyst",
        interests: ["Emerging Fields", "Finance & Commerce", "Technology & IT"],
        description: "Analyzes blockchain data and trends to provide insights into crypto markets.",
        skills: ["Solidity", "Smart Contracts", "DeFi", "Data Analysis"],
        growth: "Analyst â†’ Senior Analyst â†’ Blockchain Consultant",
        education: "Degree in Finance, CS, or specialized blockchain courses",
        nextSteps: ["Learn Solidity", "Study DeFi protocols", "Analyze blockchain transactions"],
        matchedInterests: []
    },
    {
        title: "Hospitality Manager",
        interests: ["Skilled Trades & Vocational", "Business & Management"],
        description: "Oversees the daily operations of hotels, restaurants, and other hospitality venues.",
        skills: ["Customer Service", "Leadership", "Budgeting", "Operations"],
        growth: "Assistant Manager â†’ General Manager â†’ Regional Director",
        education: "Degree in Hospitality Management or extensive experience",
        nextSteps: ["Gain experience in hospitality", "Take a management course", "Focus on customer service"],
        matchedInterests: []
    }
];

const INTEREST_CATEGORIES = [
    "Technology & IT", "Data & AI", "Design & Creative", "Business & Management",
    "Marketing & Media", "Finance & Commerce", "Healthcare & Wellness",
    "Education & Training", "Social & Public Sector", "Skilled Trades & Vocational",
    "Emerging Fields"
];

function renderCareerHelper(container) {
    container.innerHTML = `
        <div class="tool-header">
            <div class="tool-icon-large">
                <i data-lucide="briefcase" width="28" height="28"></i>
            </div>
            <div>
                <h1>Career Helper</h1>
                <p class="text-muted">Discover career paths that match your interests and skills</p>
            </div>
        </div>
        
        <div class="card">
            <h2>Your Interests</h2>
            <div class="chip-container" id="interestsContainer"></div>
            
            <h3 style="margin-top: 2rem; margin-bottom: 1rem;">Your Skills</h3>
            <div class="chip-container" id="skillsContainer"></div>
            
            <button type="button" onclick="findCareer()" style="width:100%; padding: 14px; background: linear-gradient(135deg, #b8960c, #7a6200); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 24px;">
                Find My Career Path
            </button>
            
            <div id="career-result" style="display:none; margin-top:24px;"></div>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:32px; padding-top:16px; border-top:1px solid #e8d88a;">
          <a href="app.html" class="close-tool-btn">
            Close Tool
          </a>
        </div>
    `;

    const interests = [
        "Technology & Computers", "Data Science & AI", "Cybersecurity", "Game Development",
        "Medicine & Healthcare", "Pharmacy", "Dentistry", "Nursing", "Psychology & Mental Health",
        "Law & Legal Studies", "Business & Entrepreneurship", "Finance & Banking", "Accounting",
        "Marketing & Advertising", "Human Resources", "Economics",
        "Engineering (Mechanical)", "Engineering (Civil)", "Engineering (Electrical)",
        "Architecture & Design", "Graphic Design", "UI/UX Design", "Fashion Design",
        "Teaching & Education", "Social Work", "Political Science", "International Relations",
        "Journalism & Media", "Content Creation & YouTube", "Photography & Film",
        "Music & Performing Arts", "Writing & Literature", "Animation & VFX",
        "Environmental Science", "Biotechnology", "Chemistry", "Physics", "Mathematics",
        "Sports & Fitness", "Hospitality & Tourism", "Culinary Arts", "Aviation",
        "Research & Academia", "Nonprofit & NGO Work", "Defence & Military"
    ];

    const skills = [
        "Problem Solving", "Creativity", "Communication", "Leadership", "Technical/Coding",
        "Empathy & Listening", "Attention to Detail", "Physical Stamina", "Artistic Ability",
        "Research & Analysis", "Teamwork", "Public Speaking", "Writing", "Math & Numbers",
        "Business Thinking", "Fast Learning"
    ];

    const careerMap = {
        "Technology & Computers": {
            careers: ["Software Developer", "Web Developer", "IT Support Specialist"],
            matchSkills: ["Technical/Coding", "Problem Solving", "Fast Learning"]
        },
        "Data Science & AI": {
            careers: ["Data Scientist", "ML Engineer", "Data Analyst"],
            matchSkills: ["Math & Numbers", "Research & Analysis", "Technical/Coding"]
        },
        "Cybersecurity": {
            careers: ["Cybersecurity Analyst", "Ethical Hacker", "Network Security Engineer"],
            matchSkills: ["Technical/Coding", "Problem Solving", "Attention to Detail"]
        },
        "Game Development": {
            careers: ["Game Developer", "Game Designer", "3D Artist"],
            matchSkills: ["Technical/Coding", "Creativity", "Artistic Ability"]
        },
        "Medicine & Healthcare": {
            careers: ["Doctor", "Surgeon", "Medical Researcher"],
            matchSkills: ["Empathy & Listening", "Research & Analysis", "Attention to Detail"]
        },
        "Pharmacy": {
            careers: ["Pharmacist", "Clinical Pharmacologist", "Drug Researcher"],
            matchSkills: ["Attention to Detail", "Research & Analysis", "Math & Numbers"]
        },
        "Dentistry": {
            careers: ["Dentist", "Orthodontist", "Dental Surgeon"],
            matchSkills: ["Attention to Detail", "Empathy & Listening", "Physical Stamina"]
        },
        "Nursing": {
            careers: ["Registered Nurse", "ICU Nurse", "Nurse Practitioner"],
            matchSkills: ["Empathy & Listening", "Physical Stamina", "Attention to Detail"]
        },
        "Psychology & Mental Health": {
            careers: ["Psychologist", "Counsellor", "Therapist"],
            matchSkills: ["Empathy & Listening", "Communication", "Research & Analysis"]
        },
        "Law & Legal Studies": {
            careers: ["Lawyer", "Judge", "Legal Advisor"],
            matchSkills: ["Communication", "Research & Analysis", "Public Speaking"]
        },
        "Business & Entrepreneurship": {
            careers: ["Entrepreneur", "Business Analyst", "Startup Founder"],
            matchSkills: ["Leadership", "Business Thinking", "Communication"]
        },
        "Finance & Banking": {
            careers: ["Financial Analyst", "Investment Banker", "CFO"],
            matchSkills: ["Math & Numbers", "Business Thinking", "Attention to Detail"]
        },
        "Accounting": {
            careers: ["Chartered Accountant", "Tax Consultant", "Auditor"],
            matchSkills: ["Math & Numbers", "Attention to Detail", "Business Thinking"]
        },
        "Marketing & Advertising": {
            careers: ["Marketing Manager", "Brand Strategist", "Digital Marketer"],
            matchSkills: ["Creativity", "Communication", "Business Thinking"]
        },
        "Human Resources": {
            careers: ["HR Manager", "Talent Acquisition Specialist", "L&D Manager"],
            matchSkills: ["Communication", "Empathy & Listening", "Leadership"]
        },
        "Economics": {
            careers: ["Economist", "Policy Analyst", "Economic Researcher"],
            matchSkills: ["Research & Analysis", "Math & Numbers", "Problem Solving"]
        },
        "Engineering (Mechanical)": {
            careers: ["Mechanical Engineer", "Automotive Engineer", "Manufacturing Engineer"],
            matchSkills: ["Problem Solving", "Math & Numbers", "Attention to Detail"]
        },
        "Engineering (Civil)": {
            careers: ["Civil Engineer", "Structural Engineer", "Urban Planner"],
            matchSkills: ["Problem Solving", "Math & Numbers", "Attention to Detail"]
        },
        "Engineering (Electrical)": {
            careers: ["Electrical Engineer", "Electronics Engineer", "Power Systems Engineer"],
            matchSkills: ["Technical/Coding", "Math & Numbers", "Problem Solving"]
        },
        "Architecture & Design": {
            careers: ["Architect", "Interior Designer", "Landscape Architect"],
            matchSkills: ["Creativity", "Artistic Ability", "Attention to Detail"]
        },
        "Graphic Design": {
            careers: ["Graphic Designer", "Visual Designer", "Brand Identity Designer"],
            matchSkills: ["Creativity", "Artistic Ability", "Attention to Detail"]
        },
        "UI/UX Design": {
            careers: ["UI Designer", "UX Researcher", "Product Designer"],
            matchSkills: ["Creativity", "Empathy & Listening", "Problem Solving"]
        },
        "Fashion Design": {
            careers: ["Fashion Designer", "Costume Designer", "Textile Designer"],
            matchSkills: ["Creativity", "Artistic Ability", "Attention to Detail"]
        },
        "Teaching & Education": {
            careers: ["Teacher", "Professor", "Education Consultant"],
            matchSkills: ["Communication", "Public Speaking", "Empathy & Listening"]
        },
        "Social Work": {
            careers: ["Social Worker", "Community Outreach Officer", "NGO Field Worker"],
            matchSkills: ["Empathy & Listening", "Communication", "Leadership"]
        },
        "Political Science": {
            careers: ["Political Analyst", "Policy Maker", "Diplomat"],
            matchSkills: ["Communication", "Research & Analysis", "Public Speaking"]
        },
        "International Relations": {
            careers: ["Diplomat", "Foreign Affairs Officer", "International Consultant"],
            matchSkills: ["Communication", "Research & Analysis", "Public Speaking"]
        },
        "Journalism & Media": {
            careers: ["Journalist", "News Anchor", "Media Producer"],
            matchSkills: ["Communication", "Writing", "Research & Analysis"]
        },
        "Content Creation & YouTube": {
            careers: ["YouTuber", "Content Strategist", "Social Media Manager"],
            matchSkills: ["Creativity", "Communication", "Fast Learning"]
        },
        "Photography & Film": {
            careers: ["Photographer", "Filmmaker", "Cinematographer"],
            matchSkills: ["Creativity", "Artistic Ability", "Attention to Detail"]
        },
        "Music & Performing Arts": {
            careers: ["Musician", "Music Producer", "Performing Artist"],
            matchSkills: ["Creativity", "Artistic Ability", "Public Speaking"]
        },
        "Writing & Literature": {
            careers: ["Author", "Copywriter", "Content Writer"],
            matchSkills: ["Writing", "Creativity", "Research & Analysis"]
        },
        "Animation & VFX": {
            careers: ["Animator", "VFX Artist", "Motion Graphics Designer"],
            matchSkills: ["Creativity", "Artistic Ability", "Technical/Coding"]
        },
        "Environmental Science": {
            careers: ["Environmental Scientist", "Climate Analyst", "Conservation Officer"],
            matchSkills: ["Research & Analysis", "Problem Solving", "Attention to Detail"]
        },
        "Biotechnology": {
            careers: ["Biotechnologist", "Genetic Engineer", "Biomedical Researcher"],
            matchSkills: ["Research & Analysis", "Attention to Detail", "Problem Solving"]
        },
        "Chemistry": {
            careers: ["Chemist", "Chemical Engineer", "Lab Researcher"],
            matchSkills: ["Research & Analysis", "Attention to Detail", "Math & Numbers"]
        },
        "Physics": {
            careers: ["Physicist", "Research Scientist", "Astrophysicist"],
            matchSkills: ["Math & Numbers", "Research & Analysis", "Problem Solving"]
        },
        "Mathematics": {
            careers: ["Mathematician", "Statistician", "Actuary"],
            matchSkills: ["Math & Numbers", "Problem Solving", "Research & Analysis"]
        },
        "Sports & Fitness": {
            careers: ["Professional Athlete", "Sports Coach", "Fitness Trainer"],
            matchSkills: ["Physical Stamina", "Leadership", "Teamwork"]
        },
        "Hospitality & Tourism": {
            careers: ["Hotel Manager", "Travel Consultant", "Event Planner"],
            matchSkills: ["Communication", "Teamwork", "Empathy & Listening"]
        },
        "Culinary Arts": {
            careers: ["Chef", "Restaurant Owner", "Food Stylist"],
            matchSkills: ["Creativity", "Attention to Detail", "Physical Stamina"]
        },
        "Aviation": {
            careers: ["Pilot", "Air Traffic Controller", "Aviation Engineer"],
            matchSkills: ["Attention to Detail", "Problem Solving", "Fast Learning"]
        },
        "Research & Academia": {
            careers: ["Research Scientist", "University Professor", "Academic Writer"],
            matchSkills: ["Research & Analysis", "Writing", "Problem Solving"]
        },
        "Nonprofit & NGO Work": {
            careers: ["NGO Manager", "Fundraising Officer", "Social Impact Consultant"],
            matchSkills: ["Communication", "Leadership", "Empathy & Listening"]
        },
        "Defence & Military": {
            careers: ["Military Officer", "Defence Analyst", "Intelligence Officer"],
            matchSkills: ["Leadership", "Physical Stamina", "Problem Solving"]
        }
    };

    let selectedInterests = [];
    let selectedSkills = [];

    // Render interest chips
    const interestsContainer = document.getElementById('interestsContainer');
    interests.forEach(interest => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = interest;
        chip.onclick = () => {
            chip.classList.toggle('selected');
            if (chip.classList.contains('selected')) {
                selectedInterests.push(interest);
            } else {
                selectedInterests = selectedInterests.filter(i => i !== interest);
            }
        };
        interestsContainer.appendChild(chip);
    });

    // Render skill chips
    const skillsContainer = document.getElementById('skillsContainer');
    skills.forEach(skill => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = skill;
        chip.onclick = () => {
            chip.classList.toggle('selected');
            if (chip.classList.contains('selected')) {
                selectedSkills.push(skill);
            } else {
                selectedSkills = selectedSkills.filter(s => s !== skill);
            }
        };
        skillsContainer.appendChild(chip);
    });

    // Global functions
    window.findCareer = function() {
        if (selectedInterests.length === 0) {
            alert("Please select at least one interest.");
            return;
        }
        if (selectedSkills.length === 0) {
            alert("Please select at least one skill.");
            return;
        }

        const results = [];

        selectedInterests.forEach(interest => {
            const entry = careerMap[interest];
            if (!entry) return;

            const skillMatch = entry.matchSkills.filter(s => selectedSkills.includes(s)).length;
            const score = skillMatch * 2 + 1;

            entry.careers.forEach(career => {
                results.push({ career, interest, score, skillMatch });
            });
        });

        results.sort((a, b) => b.score - a.score);
        const top = results.slice(0, 5);
        showCareerResults(top);
    };

    window.showCareerResults = function(results) {
        const div = document.getElementById("career-result");
        div.style.display = "block";
        div.scrollIntoView({ behavior: "smooth" });

        div.innerHTML = `
            <h3 style="font-size:20px; font-weight:700; margin-bottom:16px; color:#3d3000;">
                Your Top Career Matches
            </h3>
            ${results.map((r, i) => `
                <div style="border: 2px solid ${i === 0 ? '#b8960c' : '#e0c97f'}; border-radius:12px; padding:16px; margin-bottom:12px; background: ${i === 0 ? '#fffbe6' : 'white'};">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                        <span style="background:#b8960c; color:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px;">${i + 1}</span>
                        <span style="font-size:17px; font-weight:700; color:#3d3000;">${r.career}</span>
                        ${i === 0 ? '<span style="background:#b8960c; color:white; font-size:11px; padding:2px 10px; border-radius:20px; margin-left:auto;">Best Match</span>' : ''}
                    </div>
                    <p style="font-size:13px; color:#666; margin:0;">Based on your interest in <strong>${r.interest}</strong> · ${r.skillMatch} skill${r.skillMatch !== 1 ? 's' : ''} matched</p>
                </div>
            `).join("")}
            <button type="button" onclick="resetCareer()" style="width:100%; padding:12px; background:white; border:2px solid #b8960c; color:#b8960c; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; margin-top:8px;">
                Start Over
            </button>
        `;
    };

    window.resetCareer = function() {
        selectedInterests = [];
        selectedSkills = [];
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
        const div = document.getElementById("career-result");
        div.style.display = "none";
        div.innerHTML = "";
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
}

/* -------------------------------------------------------------------------- */
/*                                Pomodoro Timer                              */
/* -------------------------------------------------------------------------- */

/**
 * Renders the Pomodoro Focus Timer tool workspace.
 * Features: Configurable durations, EXP system, Session cycles, LocalStorage persistence.
 * @param {HTMLElement} container - The workspace container to render into.
 */
async function renderPomodoroTimer(container) {
    // HTML template (unchanged)
    container.innerHTML = `
        <div class="tool-header">
            <div class="tool-icon-large">
                <i data-lucide="timer" width="28" height="28"></i>
            </div>
            <div>
                <h1>Focus Timer</h1>
                <p class="text-muted">Use Pomodoro intervals to study with full focus and earn EXP</p>
            </div>
        </div>
        
        <div class="planner-layout">
            <div class="planner-main">
                <div class="card">
                    <div style="text-align: center; padding: 3rem 0;">
                        <div style="width: 250px; height: 250px; background: var(--bg-soft-highlight); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; position: relative;">
                            <div id="timerProgress" style="position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; border-radius: 50%; border: 8px solid var(--color-border); border-top: 8px solid var(--color-primary);"></div>
                            <div style="text-align: center;">
                                <div id="sessionLabel" style="font-size: 1.2rem; font-weight: 600; color: var(--color-muted); margin-bottom: 0.5rem;">Focus</div>
                                <div id="timeLeft" style="font-size: 3rem; font-weight: 800; color: var(--color-heading); line-height: 1;">25:00</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem;">
                            <button id="startPauseBtn" class="btn btn-primary btn-large">
                                <i data-lucide="play" width="20" height="20" style="margin-right: 0.5rem;"></i>
                                Start
                            </button>
                            <button id="resetBtn" class="btn btn-ghost">
                                <i data-lucide="rotate-ccw" width="16" height="16" style="margin-right: 0.5rem;"></i>
                                Reset
                            </button>
                            <button id="skipBtn" class="btn btn-ghost" title="Skip Session">
                                <i data-lucide="skip-forward" width="16" height="16"></i>
                            </button>
                        </div>

                        <div style="margin-bottom: 2rem;">
                            <div id="cycleDots" style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary);"></div>
                                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-border);"></div>
                                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-border);"></div>
                                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-border);"></div>
                            </div>
                            <p id="cycleText" style="color: var(--color-muted); font-size: 0.9rem;">1 / 4 sessions until long break</p>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h2>Settings</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div class="form-group">
                            <label for="focusDuration" class="form-label">Focus (minutes)</label>
                            <input type="number" id="focusDuration" class="form-input" min="1" max="60" value="25">
                        </div>
                        <div class="form-group">
                            <label for="shortBreakDuration" class="form-label">Short Break (minutes)</label>
                            <input type="number" id="shortBreakDuration" class="form-input" min="1" max="30" value="5">
                        </div>
                        <div class="form-group">
                            <label for="longBreakDuration" class="form-label">Long Break (minutes)</label>
                            <input type="number" id="longBreakDuration" class="form-input" min="1" max="60" value="15">
                        </div>
                    </div>
                </div>
            </div>

            <aside class="planner-sidebar">
                <div class="card">
                    <h3>Session Stats</h3>
                    <div style="text-align:center; padding:16px 0;">
  <div style="font-size:13px; font-weight:600; color:#b8960c; letter-spacing:1px; margin-bottom:4px;" id="exp-level-num">Level 1</div>
  <div style="font-size:22px; font-weight:700; color:var(--text-primary); margin-bottom:2px;" id="exp-level-title">Freshman</div>
  <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,#b8960c,#7a6200); display:flex; align-items:center; justify-content:center; margin:12px auto; flex-direction:column;">
    <span style="font-size:24px; font-weight:700; color:white;" id="totalExpDisplay">0</span>
    <span style="font-size:10px; color:rgba(255,255,255,0.8);">EXP</span>
  </div>
  <div style="margin:12px 0 4px; font-size:12px; color:var(--text-muted);" id="exp-bar-text">0 / 100 EXP</div>
  <div style="background:var(--border-color); border-radius:10px; height:8px; overflow:hidden; margin:0 8px;">
    <div id="exp-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#b8960c,#f0c040); border-radius:10px; transition:width 0.5s ease;"></div>
  </div>
  <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">Next level progress</div>
</div>
                    
                    <div style="background: var(--bg-soft-highlight); padding: 1rem; border-radius: var(--radius-button); margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="font-weight: 600;">Sessions Completed</span>
                            <span id="totalSets" style="color: var(--color-primary); font-weight: 700;">0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: 600;">Total Focus Time</span>
                            <span id="totalFocusTime" style="color: var(--color-primary); font-weight: 700;">0 min</span>
                        </div>
                    </div>
                    
                    <div style="background: var(--bg-soft-highlight); padding: 1rem; border-radius: var(--radius-button);">
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">EXP Rewards</div>
                        <div style="color: var(--color-muted); font-size: 0.9rem; margin-bottom: 0.25rem;">&#8226; Focus Session: +10 EXP</div>
                        <div style="color: var(--color-muted); font-size: 0.9rem;">&#8226; Full Set (4 sessions): +20 Bonus EXP</div>
                    </div>
                    
                    <button id="resetStatsBtn" class="btn btn-ghost" style="width: 100%; margin-top: 1rem;">Reset Stats</button>
                </div>
            </aside>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:32px; padding-top:16px; border-top:1px solid #e8d88a;">
          <a href="app.html" class="close-tool-btn">
            Close Tool
          </a>
        </div>
        <div id="ariaAnnouncer" class="sr-only" aria-live="polite"></div>
    `;

    // DOM elements
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const skipBtn = document.getElementById('skipBtn');
    const timeLeftDisplay = document.getElementById('timeLeft');
    const sessionLabelDisplay = document.getElementById('sessionLabel');
    const cycleTextDisplay = document.getElementById('cycleText');
    const totalSetsDisplay = document.getElementById('totalSets');
    const totalExpDisplay = document.getElementById('totalExpDisplay');
    const totalFocusTimeDisplay = document.getElementById('totalFocusTime');
    const resetStatsBtn = document.getElementById('resetStatsBtn');
    const focusInput = document.getElementById('focusDuration');
    const shortBreakInput = document.getElementById('shortBreakDuration');
    const longBreakInput = document.getElementById('longBreakDuration');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const token = localStorage.getItem('token');
    if (!token) { window.location.replace('index.html'); return; }

    if ("Notification" in window) Notification.requestPermission();

    const BASE_URL = 'https://student-life-backend-1.onrender.com';

    // ==========================================
    // PRODUCTION-READY STATE MANAGEMENT
    // ==========================================
    
    // Core timer state - minimal and clean
    const state = {
        timerInterval: null,
        isRunning: false,
        currentMode: "focus",
        sessionSaved: false,
        savingInProgress: false,
        currentSessionId: null,
        focusDuration: parseInt(focusInput?.value) || 25,
        shortBreakDuration: parseInt(shortBreakInput?.value) || 5,
        longBreakDuration: parseInt(longBreakInput?.value) || 15,
        timeLeft: (parseInt(focusInput?.value) || 25) * 60
    };

    // Backend data cache - single source of truth
    const backendData = {
        totalSessions: 0,
        totalMinutes: 0,
        xp: 0
    };

    // ==========================================
    // AUDIO & NOTIFICATIONS
    // ==========================================
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playAlarmSound() {
        try {
            const now = audioContext.currentTime;
            
            // First beep
            const osc1 = audioContext.createOscillator();
            const gain1 = audioContext.createGain();
            osc1.connect(gain1);
            gain1.connect(audioContext.destination);
            osc1.frequency.value = 880;
            osc1.type = 'sine';
            gain1.gain.setValueAtTime(0.4, now);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc1.start(now);
            osc1.stop(now + 0.3);
            
            // Second beep
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 880;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.4, now + 0.35);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
            osc2.start(now + 0.35);
            osc2.stop(now + 0.65);
            
            // Third beep
            const osc3 = audioContext.createOscillator();
            const gain3 = audioContext.createGain();
            osc3.connect(gain3);
            gain3.connect(audioContext.destination);
            osc3.frequency.value = 1100;
            osc3.type = 'sine';
            gain3.gain.setValueAtTime(0.5, now + 0.7);
            gain3.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
            osc3.start(now + 0.7);
            osc3.stop(now + 1.0);
            
        } catch (e) { 
            console.error('[Focus Timer] Audio play failed:', e); 
        }
    }

    function showNotification(title, body) {
        if (Notification.permission === "granted") {
            try {
                new Notification(title, {
                    body: body,
                    icon: "logo.png",
                    badge: "logo.png",
                    tag: 'focus-timer-' + Date.now()
                });
            } catch (e) {
                console.error('[Focus Timer] Notification failed:', e);
            }
        }
    }

    // ==========================================
    // UI UPDATES
    // ==========================================
    
    function updateDisplay() {
        const mins = Math.floor(state.timeLeft / 60).toString().padStart(2, "0");
        const secs = (state.timeLeft % 60).toString().padStart(2, "0");
        timeLeftDisplay.textContent = `${mins}:${secs}`;
    }

    function updateButton() {
        const icon = state.isRunning ? 'pause' : 'play';
        const text = state.isRunning ? 'Pause' : 'Start';
        startPauseBtn.innerHTML = `<i data-lucide="${icon}" width="20" height="20" style="margin-right: 0.5rem;"></i>${text}`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        startPauseBtn.style.opacity = state.savingInProgress ? '0.6' : '1';
        startPauseBtn.style.pointerEvents = state.savingInProgress ? 'none' : 'auto';
    }

    function updatePhaseLabel() {
        const labels = {
            focus: "Focus Session",
            break: "Break"
        };
        sessionLabelDisplay.textContent = labels[state.currentMode] || "Break";
        
        const sessions = backendData.totalSessions;
        let cyclePosition = sessions % 4;
        if (cyclePosition === 0 && sessions > 0) cyclePosition = 4;
        if (cyclePosition === 0 && sessions === 0) cyclePosition = 1;
        
        cycleTextDisplay.textContent = `${cyclePosition} / 4 sessions until long break`;
        
        // Update dots
        const dots = document.querySelectorAll('#cycleDots > div');
        dots.forEach((dot, index) => {
            dot.style.background = index < cyclePosition ? 'var(--color-primary)' : 'var(--color-border)';
        });
    }

    function updateStatsUI() {
        totalSetsDisplay.textContent = backendData.totalSessions;
        totalFocusTimeDisplay.textContent = backendData.totalMinutes + " min";
        totalExpDisplay.textContent = backendData.xp;
        updateLevelUI(backendData.xp);
    }

    function flashScreen() {
        document.body.style.transition = "background 0.4s ease";
        document.body.style.background = "linear-gradient(135deg, #fffbe6, #fff5d6)";
        setTimeout(() => {
            document.body.style.background = "";
        }, 800);
    }

    // ==========================================
    // BACKEND API CALLS
    // ==========================================
    
    async function apiCall(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
            const res = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                },
                cache: 'no-store',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (res.status === 401) {
                localStorage.clear();
                window.location.replace('index.html');
                throw new Error('Unauthorized');
            }
            
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }
            
            return await res.json();
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw err;
        }
    }

    async function loadStats() {
        try {
            const data = await apiCall('/api/focus-stats');
            const stats = data.data || data || {};
            
            backendData.totalSessions = stats.totalSessions || 0;
            backendData.totalMinutes = stats.totalMinutes || 0;
            
            updateStatsUI();
            updatePhaseLabel();
            
            return backendData;
        } catch (err) {
            console.error('[Focus Timer] Failed to load stats:', err);
            return backendData;
        }
    }

    async function loadXP() {
        try {
            const data = await apiCall('/api/xp');
            const xp = data.xp || 0;
            
            backendData.xp = xp;
            updateStatsUI();
            
            return { xp };
        } catch (err) {
            console.error('[Focus Timer] Failed to load XP:', err);
            return { xp: backendData.xp };
        }
    }

    async function saveFocusSession(duration, sessionId) {
        try {
            const data = await apiCall('/api/focus-sessions', {
                method: 'POST',
                body: JSON.stringify({
                    duration: duration,
                    clientSessionId: sessionId,
                    timestamp: new Date().toISOString()
                })
            });
            
            console.log('[Focus Timer] Session saved:', data);
            return { success: true, data };
        } catch (err) {
            if (err.message && err.message.includes('409')) {
                console.log('[Focus Timer] Session already saved (duplicate)');
                return { success: true, duplicate: true };
            }
            
            console.error('[Focus Timer] Failed to save session:', err);
            return { success: false, error: err.message };
        }
    }

    async function resetBackendStats() {
        try {
            await apiCall('/api/focus-reset', { method: 'DELETE' });
            console.log('[Focus Timer] Stats reset successfully');
            return { success: true };
        } catch (err) {
            console.error('[Focus Timer] Failed to reset stats:', err);
            return { success: false, error: err.message };
        }
    }

    // ==========================================
    // SESSION COMPLETION (ATOMIC OPERATION)
    // ==========================================
    
    async function handleSessionComplete() {
        // CRITICAL: Prevent duplicate processing
        if (state.sessionSaved || state.savingInProgress) {
            console.log('[Focus Timer] Session already being processed, skipping');
            return;
        }
        
        state.savingInProgress = true;
        state.sessionSaved = true;
        state.isRunning = false;
        
        updateButton();
        playAlarmSound();
        
        if (state.currentMode === "focus") {
            // FOCUS SESSION COMPLETION
            showNotification(
                "Focus Session Complete! 🎉", 
                `Great job! You completed ${state.focusDuration} minutes of focused work. Time for a break!`
            );
            
            // Save to backend
            await saveFocusSession(state.focusDuration, state.currentSessionId);
            
            // Reload stats from backend
            await Promise.all([loadStats(), loadXP()]);
            
            // Switch to break
            const sessions = backendData.totalSessions;
            const isLongBreak = sessions > 0 && sessions % 4 === 0;
            
            state.currentMode = "break";
            state.timeLeft = isLongBreak ? state.longBreakDuration * 60 : state.shortBreakDuration * 60;
            
            console.log(`[Focus Timer] Switching to ${isLongBreak ? 'long' : 'short'} break after session ${sessions}`);
            
        } else {
            // BREAK SESSION COMPLETION
            showNotification(
                "Break Over! 💪", 
                "Your break is complete. Ready to focus again?"
            );
            
            state.currentMode = "focus";
            state.timeLeft = state.focusDuration * 60;
            
            console.log('[Focus Timer] Break complete, switching to focus');
        }
        
        // Reset for next session
        state.currentSessionId = null;
        state.savingInProgress = false;
        
        // Final UI updates
        updateDisplay();
        updateButton();
        updatePhaseLabel();
        flashScreen();
    }

    // ==========================================
    // TIMER CONTROLS
    // ==========================================
    
    function startTimer() {
        if (state.isRunning || state.savingInProgress) {
            console.log('[Focus Timer] Cannot start: already running or saving');
            return;
        }
        
        // Generate unique session ID for focus sessions
        if (state.currentMode === "focus" && !state.currentSessionId) {
            state.currentSessionId = `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            state.sessionSaved = false;
            console.log('[Focus Timer] New focus session started:', state.currentSessionId);
        }
        
        state.isRunning = true;
        
        state.timerInterval = setInterval(() => {
            state.timeLeft--;
            updateDisplay();
            
            if (state.timeLeft <= 0) {
                clearInterval(state.timerInterval);
                state.timerInterval = null;
                handleSessionComplete();
            }
        }, 1000);
        
        updateButton();
    }

    function pauseTimer() {
        if (!state.isRunning) return;
        
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.isRunning = false;
        
        updateButton();
        console.log('[Focus Timer] Paused');
    }

    function toggleTimer() {
        if (state.isRunning) pauseTimer();
        else startTimer();
    }

    function resetTimer() {
        // Stop timer
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.isRunning = false;
        state.sessionSaved = false;
        state.savingInProgress = false;
        state.currentSessionId = null;
        
        // Reset time based on current mode
        if (state.currentMode === "focus") {
            state.timeLeft = state.focusDuration * 60;
        } else {
            const sessions = backendData.totalSessions;
            const isLongBreakSlot = sessions > 0 && sessions % 4 === 0;
            state.timeLeft = isLongBreakSlot ? state.longBreakDuration * 60 : state.shortBreakDuration * 60;
        }
        
        updateDisplay();
        updateButton();
        updatePhaseLabel();
        
        console.log('[Focus Timer] Timer reset');
    }

    async function resetStats() {
        if (!confirm("Reset all your stats? This cannot be undone.")) return;
        
        const result = await resetBackendStats();
        
        if (result.success) {
            backendData.totalSessions = 0;
            backendData.totalMinutes = 0;
            backendData.xp = 0;
            
            await Promise.all([loadStats(), loadXP()]);
            resetTimer();
            
            console.log('[Focus Timer] Stats reset complete');
        } else {
            alert('Failed to reset stats. Please try again.');
        }
    }

    // ==========================================
    // SETTINGS HANDLERS
    // ==========================================
    
    focusInput?.addEventListener('change', () => {
        const newDuration = parseInt(focusInput.value);
        if (newDuration >= 1 && newDuration <= 120) {
            state.focusDuration = newDuration;
            if (state.currentMode === 'focus' && !state.isRunning) {
                state.timeLeft = state.focusDuration * 60;
                updateDisplay();
            }
        }
    });

    shortBreakInput?.addEventListener('change', () => {
        const newDuration = parseInt(shortBreakInput.value);
        if (newDuration >= 1 && newDuration <= 60) {
            state.shortBreakDuration = newDuration;
        }
    });

    longBreakInput?.addEventListener('change', () => {
        const newDuration = parseInt(longBreakInput.value);
        if (newDuration >= 1 && newDuration <= 120) {
            state.longBreakDuration = newDuration;
        }
    });

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    
    startPauseBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    resetStatsBtn.addEventListener('click', resetStats);
    
    skipBtn.addEventListener('click', () => {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.isRunning = false;
        state.sessionSaved = false;
        state.currentSessionId = null;
        
        if (state.currentMode === "focus") {
            state.currentMode = "break";
            const sessions = backendData.totalSessions;
            const isLongBreakSlot = sessions > 0 && sessions % 4 === 0;
            state.timeLeft = isLongBreakSlot ? state.longBreakDuration * 60 : state.shortBreakDuration * 60;
        } else {
            state.currentMode = "focus";
            state.timeLeft = state.focusDuration * 60;
        }
        
        updateDisplay();
        updateButton();
        updatePhaseLabel();
        
        console.log('[Focus Timer] Phase skipped to:', state.currentMode);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            toggleTimer();
        }
        if (e.code === 'KeyR' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            resetTimer();
        }
    });

    // ==========================================
    // INITIALIZATION
    // ==========================================
    
    console.log('[Focus Timer] Initializing...');
    
    await Promise.all([loadStats(), loadXP()]);
    
    updateDisplay();
    updateButton();
    updatePhaseLabel();
    
    console.log('[Focus Timer] Ready. Backend state:', backendData);
}

function renderClutchAI(container) {
    container.innerHTML = `
        <div id="tool-clutchai" class="tool-section" style="max-width:600px; margin:0 auto;">

          <div style="text-align:center; margin-bottom:28px;">
            <h2 style="font-size:24px; font-weight:700; color:#3d3000;">CLUTCH AI</h2>
            <p style="color:#888; font-size:14px;">Your friendly emotional support companion. I'm here to listen and help you feel better.</p>
          </div>

          <div id="chat-messages" style="height:400px; overflow-y:auto; border:1px solid #e8d88a; border-radius:16px; padding:16px; background:#fffdf0; margin-bottom:16px; display:flex; flex-direction:column; gap:12px;">
            <div class="ai-bubble">
              Hey! 👋 I'm CLUTCH AI. I'm here to listen — no judgement, just support. What's on your mind?
            </div>
          </div>

          <div id="typing-indicator" style="display:none; padding:6px 0; font-size:13px; color:#999; margin-bottom:8px;">
            CLUTCH AI is thinking...
          </div>

          <div style="display:flex; gap:10px; align-items:center;">
            <input
              type="text"
              id="chat-input"
              placeholder="Type how you feel..."
              style="flex:1; padding:12px 16px; border:2px solid #b8960c; border-radius:12px; font-size:14px; outline:none;"
            />
            <button type="button" id="send-btn" style="padding:12px 20px; background:linear-gradient(135deg,#b8960c,#7a6200); color:white; border:none; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer;">
              Send
            </button>
          </div>

          <p style="text-align:center; font-size:12px; color:#bbb; margin-top:16px;">Powered by CLUTCH AI · Here to listen</p>

        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:32px; padding-top:16px; border-top:1px solid #e8d88a;">
          <a href="app.html" class="close-tool-btn">
            Close Tool
          </a>
        </div>
    `;
}

// Initialize Lucide icons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize core components
    initNavigation();
    initFeedbackScroll();
    initGlobalAnimations();
    
    // Check if we are on the workspace page and initialize the requested tool
    if (document.getElementById('toolWorkspace')) {
        initWorkspace();
    }
});

// Missing helper functions from original code
function initFeedbackScroll() {
    // Original feedback scroll implementation
    const feedbackBtn = document.querySelector('.feedback-btn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            // Handle feedback click
        });
    }
}

function initGlobalAnimations() {
    // Initialize any global animations
}

function animateCount(element, from, to, duration = 600) {
    if (!element) return;
    
    const start = performance.now();
    const diff = to - from;

    const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const eased = progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress;
        const current = Math.round(from + diff * eased);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    
    requestAnimationFrame(step);
}

// PWA Service Worker Registration - TEMPORARILY DISABLED for local preview
// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", function() {
//     navigator.serviceWorker.register("/Student_Life_Prob_Solver/sw.js")
//       .then(function(reg) {
//         console.log("CLUTCH SW registered:", reg.scope);
//       })
//       .catch(function(err) {
//         console.log("SW registration failed:", err);
//       });
//   });
// }

// PWA Install Prompt
let deferredPrompt = null;

document.addEventListener("DOMContentLoaded", function() {
  const btn = document.getElementById("pwa-install-btn");

  // Show install button by default on both mobile and desktop
  // It will be hidden if app is already installed
  if (btn) {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                        window.navigator.standalone === true;
    if (!isStandalone) {
      btn.style.display = "inline-block";
    }
  }

  window.addEventListener("beforeinstallprompt", function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (btn) btn.style.display = "inline-block";
  });
});

function installPWA() {
  if (deferredPrompt) {
    // Browser supports install prompt
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(result) {
      console.log("PWA install:", result.outcome);
      deferredPrompt = null;
      const btn = document.getElementById("pwa-install-btn");
      if (btn) btn.style.display = "none";
    });
  } else {
    // Fallback for browsers without native install support (Safari, Firefox)
    // Show manual install instructions
    alert('To install CLUTCH:\n\n1. Chrome/Edge: Click the icon in the address bar\n2. Safari (iOS): Tap Share → Add to Home Screen\n3. Safari (Mac): File → Add to Dock');
  }
}

window.addEventListener("appinstalled", function() {
  const btn = document.getElementById("pwa-install-btn");
  const banner = document.getElementById("install-banner");
  if (btn) btn.style.display = "none";
  if (banner) banner.style.display = "none";
});

// End of app.js
