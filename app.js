/**
 * Student Life Problem Solver - Core Logic
 * 
 * This script handles all the interactive features of the application,
 * including navigation, tool rendering, and data persistence using LocalStorage.
 * 
 * LocalStorage Keys:
 * - sl_study_tasks: Array of { id, subject, hours, completed, earnedExp, priority }
 * - sl_total_exp: Number (Total EXP earned from study tasks)
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
/*                               Workspace Init                               */
/* -------------------------------------------------------------------------- */

/**
 * Orchestrates tool rendering based on URL query parameters.
 * Example: workspace.html?tool=study
 */
function initWorkspace() {
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
            renderPomodoroTimer(workspace);
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
        <div class="planner-layout">
            <div class="planner-main">
                <div class="tool-header">
                    <h1>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px; color: var(--accent-color);">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Study Planner
                    </h1>
                    <div class="stats">
                        <div class="stat-card">
                            <p>Total Hours</p>
                            <div id="totalHours" class="stat-value">0</div>
                        </div>
                    </div>
                </div>
                
                <div class="planner-grid">
                    <div class="planner-form glass-panel">
                        <form id="studyForm">
                            <div class="form-group">
                                <label for="subject">Subject Name</label>
                                <input type="text" id="subject" placeholder="e.g. Data Structures" required>
                            </div>
                            <div class="form-group">
                                <label for="hours">Study Duration (Hours)</label>
                                <input type="number" id="hours" min="0.1" step="0.1" placeholder="e.g. 2.0" required>
                            </div>
                            <div class="form-group">
                                <label for="priority">Priority Level</label>
                                <select id="priority">
                                    <option value="Low">Low</option>
                                    <option value="Medium" selected>Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Add to Plan</button>
                        </form>
                    </div>
                    <div class="planner-list">
                        <h3>My Study Plan</h3>
                        <div id="taskList" class="task-list"></div>
                    </div>
                </div>
            </div>

            <aside class="exp-panel glass-panel">
                <div class="exp-header">
                    <h3>EXP System</h3>
                </div>
                <div class="exp-display">
                    <div class="exp-icon-wrapper">
                        <svg class="exp-icon-large" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="EXP Icon (1 hour = 5 EXP)">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starGradient)" stroke="#fbbf24" stroke-width="1"/>
                            <defs>
                                <linearGradient id="starGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#fbbf24"/>
                                    <stop offset="1" stop-color="#f59e0b"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div id="totalExpDisplay" class="exp-value" aria-live="polite">0</div>
                    <span class="exp-unit">TOTAL EXP</span>
                </div>
                <div class="exp-info">
                    <strong>Rule:</strong> 1 Hour = 5 EXP
                </div>
                <div class="exp-stats">
                    <p id="expConversionText">Current Potential: 0 EXP</p>
                </div>
                <button id="resetExpBtn" class="btn btn-danger ghost">Reset Progress</button>
            </aside>
        </div>
        <div id="ariaAnnouncer" class="sr-only" aria-live="polite"></div>
    `;

    const form = document.getElementById('studyForm');
    const taskList = document.getElementById('taskList');
    const totalHoursDisplay = document.getElementById('totalHours');
    const totalExpDisplay = document.getElementById('totalExpDisplay');
    const expConversionText = document.getElementById('expConversionText');
    const resetExpBtn = document.getElementById('resetExpBtn');
    const ariaAnnouncer = document.getElementById('ariaAnnouncer');

    const calculateEarnedExp = (hours) => Math.round(parseFloat(hours) * 5);

    const announce = (message) => {
        ariaAnnouncer.textContent = message;
    };

    const animateExpGain = (amount, sourceElement) => {
        if (amount === 0) return;
        flyTo(sourceElement, `${amount > 0 ? '+' : ''}${amount} EXP`, { color: '#fbbf24' });
    };

    const loadTasks = () => {
        // Migration check from old key if exists
        let tasks = JSON.parse(localStorage.getItem('sl_study_tasks'));
        if (!tasks) {
            const oldTasks = JSON.parse(localStorage.getItem('slps_planner') || '[]');
            tasks = oldTasks.map(t => ({
                ...t,
                completed: false,
                earnedExp: 0
            }));
            localStorage.setItem('sl_study_tasks', JSON.stringify(tasks));
        }

        const totalExp = parseInt(localStorage.getItem('sl_total_exp') || '0');
        
        taskList.innerHTML = '';
        let totalHours = 0;

        tasks.forEach((task) => {
            totalHours += parseFloat(task.hours);
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <div class="task-controls">
                    <div class="checkbox-custom ${task.completed ? 'checked' : ''}" 
                         onclick="toggleTaskCompletion('${task.id}', this)"
                         role="checkbox" 
                         aria-checked="${task.completed}" 
                         tabindex="0"
                         aria-label="Mark ${task.subject} as completed">
                    </div>
                    <div>
                        <strong>${task.subject}</strong> - ${task.hours} hrs 
                        <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
                        ${task.completed ? `<span class="exp-earned-tag" style="color: #fbbf24; font-size: 0.8rem; margin-left: 0.5rem;">+${task.earnedExp} EXP</span>` : ''}
                    </div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deleteStudyTask('${task.id}')">Delete</button>
            `;
            taskList.appendChild(div);
        });

        totalHoursDisplay.textContent = totalHours.toFixed(1);
        const currentExp = parseInt(totalExpDisplay.textContent || '0');
        animateCount(totalExpDisplay, isNaN(currentExp) ? 0 : currentExp, totalExp);
        expConversionText.textContent = `Total hours: ${totalHours.toFixed(1)}h → ${Math.round(totalHours * 5)} EXP possible`;
    };

    window.toggleTaskCompletion = (taskId, element) => {
        const tasks = JSON.parse(localStorage.getItem('sl_study_tasks') || '[]');
        const taskIndex = tasks.findIndex(t => t.id == taskId);
        
        if (taskIndex === -1) return;

        const task = tasks[taskIndex];
        const wasCompleted = task.completed;
        task.completed = !wasCompleted;
        
        let totalExp = parseInt(localStorage.getItem('sl_total_exp') || '0');
        const expChange = calculateEarnedExp(task.hours);

        if (task.completed) {
            task.earnedExp = expChange;
            totalExp += expChange;
            animateExpGain(expChange, element);
            announce(`You earned ${expChange} EXP. Total EXP is now ${totalExp}.`);
        } else {
            totalExp -= task.earnedExp;
            animateExpGain(-task.earnedExp, element);
            announce(`Task marked as incomplete. Total EXP is now ${totalExp}.`);
            task.earnedExp = 0;
        }

        localStorage.setItem('sl_study_tasks', JSON.stringify(tasks));
        localStorage.setItem('sl_total_exp', totalExp);
        loadTasks();
    };

    window.deleteStudyTask = (taskId) => {
        const tasks = JSON.parse(localStorage.getItem('sl_study_tasks') || '[]');
        const taskIndex = tasks.findIndex(t => t.id == taskId);
        
        if (taskIndex === -1) return;

        const task = tasks[taskIndex];
        if (task.completed) {
            let totalExp = parseInt(localStorage.getItem('sl_total_exp') || '0');
            totalExp -= task.earnedExp;
            localStorage.setItem('sl_total_exp', totalExp);
        }

        tasks.splice(taskIndex, 1);
        localStorage.setItem('sl_study_tasks', JSON.stringify(tasks));
        loadTasks();
    };

    resetExpBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all EXP? This will not delete your tasks.')) {
            const tasks = JSON.parse(localStorage.getItem('sl_study_tasks') || '[]');
            const updatedTasks = tasks.map(t => ({ ...t, completed: false, earnedExp: 0 }));
            localStorage.setItem('sl_study_tasks', JSON.stringify(updatedTasks));
            localStorage.setItem('sl_total_exp', 0);
            loadTasks();
            announce('EXP and task completion have been reset.');
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTask = {
            subject: document.getElementById('subject').value,
            hours: document.getElementById('hours').value,
            priority: document.getElementById('priority').value,
            id: Date.now(),
            completed: false,
            earnedExp: 0
        };

        const tasks = JSON.parse(localStorage.getItem('sl_study_tasks') || '[]');
        tasks.push(newTask);
        localStorage.setItem('sl_study_tasks', JSON.stringify(tasks));
        form.reset();
        loadTasks();
    });

    loadTasks();
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
        <div class="planner-layout">
            <div class="planner-main">
                <div class="tool-header">
                    <h1>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px; color: var(--accent-color);">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        Expense Tracker
                    </h1>
                    <div class="stat-card">
                        <p>Total Spent</p>
                        <div id="totalExpense" class="stat-value">₹0.00</div>
                    </div>
                </div>
                <div class="planner-grid">
                    <div class="expense-form glass-panel">
                        <form id="expenseForm">
                            <div class="form-group">
                                <label>Expense Description</label>
                                <input type="text" id="expName" placeholder="e.g. Lunch with friends" required>
                            </div>
                            <div class="form-group">
                                <label>Category</label>
                                <select id="expCategory">
                                    <option value="Food">Food & Dining</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Study">Study Materials</option>
                                    <option value="Clothes">Clothing</option>
                                    <option value="Friends">Social/Entertainment</option>
                                    <option value="Other">Miscellaneous</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Amount (₹)</label>
                                <input type="number" id="expAmount" step="0.01" min="0" placeholder="0.00" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Log Expense</button>
                        </form>
                    </div>
                    <div class="expense-list">
                        <h3>Transaction History</h3>
                        <div id="expenseList" class="task-list"></div>
                    </div>
                </div>
            </div>

            <aside class="exp-panel savings-panel glass-panel">
                <div class="exp-header">
                    <h3>Savings Box</h3>
                </div>
                <div class="exp-display">
                    <div class="exp-icon-wrapper">
                        <svg class="exp-icon-large" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Savings Icon">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.73 13H15V15H12.73V17H11.27V15H9V13H11.27V11H9V9H11.27V7H12.73V9H15V11H12.73V13Z" fill="url(#savingsGradient)"/>
                            <defs>
                                <linearGradient id="savingsGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#22c55e"/>
                                    <stop offset="1" stop-color="#10b981"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div id="savingsPointsDisplay" class="exp-value" aria-live="polite">0</div>
                    <span class="exp-unit">SAVINGS POINTS</span>
                </div>
                
                <div class="form-group" style="text-align: left;">
                    <label for="savingsAmount">Monthly Savings Target (₹)</label>
                    <input type="number" id="savingsAmount" min="0" step="0.01" placeholder="e.g. 500">
                </div>

                <div class="exp-stats">
                    <div class="stat-item">
                        <span>Current Ratio:</span>
                        <strong id="savingsPercentDisplay">0%</strong>
                    </div>
                    <p id="savingsMessage" class="exp-info">Awarding points for savings above 10%.</p>
                </div>
                
                <div class="exp-info" style="font-size: 0.75rem; opacity: 0.8;">
                    <strong>Rule:</strong> Earn 1 point for every 1% saved (min. 10%)
                </div>
            </aside>
        </div>
        <div id="ariaAnnouncer" class="sr-only" aria-live="polite"></div>
    `;

    const form = document.getElementById('expenseForm');
    const list = document.getElementById('expenseList');
    const totalDisplay = document.getElementById('totalExpense');
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

    const updateSavingsUI = () => {
        const expenses = JSON.parse(localStorage.getItem('slps_expenses') || '[]');
        const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const savingsAmount = parseFloat(localStorage.getItem('sl_savings_amount') || '0');
        
        savingsInput.value = savingsAmount > 0 ? savingsAmount : '';

        if (totalExpense === 0) {
            savingsPercentDisplay.textContent = '0%';
            savingsPointsDisplay.textContent = '0';
            savingsMessage.textContent = 'Add expenses to calculate savings.';
            return;
        }

        let savingsPercent = Math.floor((savingsAmount / totalExpense) * 100);
        if (savingsPercent > 100) savingsPercent = 100;

        const oldPoints = parseInt(localStorage.getItem('sl_savings_points') || '0');
        let newPoints = savingsPercent >= 10 ? savingsPercent : 0;

        savingsPercentDisplay.textContent = `${savingsPercent}%`;
        const currentPoints = parseInt(savingsPointsDisplay.textContent || '0');
        animateCount(savingsPointsDisplay, isNaN(currentPoints) ? 0 : currentPoints, newPoints);

        if (newPoints > oldPoints) {
            animatePointsGain(newPoints - oldPoints, savingsPointsDisplay);
            document.querySelector('.savings-panel')?.classList.add('glow');
            setTimeout(() => {
                const panel = document.querySelector('.savings-panel');
                if (panel) panel.classList.remove('glow');
            }, 700);
            announce(`You earned ${newPoints} savings points!`);
        } else if (newPoints < oldPoints && oldPoints > 0) {
            announce(`Savings points updated to ${newPoints}.`);
        }

        if (savingsPercent >= 10) {
            savingsMessage.innerHTML = `You saved ${savingsPercent}% — 🎉 You earned ${newPoints} points!`;
        } else {
            savingsMessage.textContent = 'Save at least 10% to earn points.';
        }

        localStorage.setItem('sl_savings_points', newPoints);
    };

    const loadExpenses = () => {
        const expenses = JSON.parse(localStorage.getItem('slps_expenses') || '[]');
        list.innerHTML = '';
        let total = 0;

        expenses.forEach((exp, index) => {
            total += parseFloat(exp.amount);
            const div = document.createElement('div');
            div.className = 'task-item';
            div.innerHTML = `
                <div>
                    <strong>${exp.name}</strong> - ₹${parseFloat(exp.amount).toFixed(2)}
                    <br><small>${exp.category}</small>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deleteExpense(${index})">Delete</button>
            `;
            list.appendChild(div);
        });
        totalDisplay.textContent = `₹${total.toFixed(2)}`;
        updateSavingsUI();
    };

    window.deleteExpense = (index) => {
        const expenses = JSON.parse(localStorage.getItem('slps_expenses') || '[]');
        expenses.splice(index, 1);
        localStorage.setItem('slps_expenses', JSON.stringify(expenses));
        loadExpenses();
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newExp = {
            name: document.getElementById('expName').value,
            category: document.getElementById('expCategory').value,
            amount: document.getElementById('expAmount').value,
            id: Date.now()
        };
        const expenses = JSON.parse(localStorage.getItem('slps_expenses') || '[]');
        expenses.push(newExp);
        localStorage.setItem('slps_expenses', JSON.stringify(expenses));
        form.reset();
        loadExpenses();
    });

    savingsInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        if (val < 0) {
            e.target.value = 0;
            return;
        }
        localStorage.setItem('sl_savings_amount', val);
        updateSavingsUI();
    });

    loadExpenses();
}

/* -------------------------------------------------------------------------- */
/*                               Stress Checker                               */
/* -------------------------------------------------------------------------- */

/**
 * Enhanced Stress Checker
 * localStorage keys:
 * - sl_stress_responses: number[] (10 answers, 1–5 scale)
 * - sl_stress_result: { score: number, label: string, date: string }
 */
function renderStressChecker(container) {
    container.innerHTML = `
        <div class="tool-header">
            <h1>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px; color: var(--accent-color);">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                Stress Checker
            </h1>
        </div>
        <div id="stressContent" class="stress-container glass-panel">
            <p class="mb-3">Answer these 10 quick questions to check your current stress level. Be honest — this is for you.</p>

            <div class="stress-progress-wrapper">
                <div class="stress-progress-header">
                    <span id="stressProgressText">0% complete</span>
                </div>
                <div id="stressProgressBar" class="stress-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Stress check progress">
                    <div id="stressProgressFill" class="stress-progress-fill"></div>
                </div>
            </div>

            <form id="stressForm" class="stress-form" novalidate>
                <div id="stressQuestions"></div>
                <p id="stressValidation" class="validation-hint hidden">Please answer all 10 questions to see your result.</p>
                <div class="stress-actions">
                    <button type="submit" id="stressSubmitBtn" class="btn btn-primary" disabled>See My Stress Meter</button>
                </div>
            </form>

            <div id="stressResultWrapper" class="stress-result hidden">
                <div class="stress-meter">
                    <div class="meter-track">
                        <div id="stressMeterFill" class="meter-fill"></div>
                        <div id="stressMeterNeedle" class="meter-needle"></div>
                    </div>
                    <div class="meter-labels">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                    </div>
                </div>

                <div class="stress-result-text">
                    <h2 id="stressResultLabel"></h2>
                    <p id="stressResultWhy" class="text-secondary"></p>
                    <ul id="stressResultTips" class="stress-tips"></ul>
                    <p class="stress-cta">
                        <a href="#" id="stressTalkLink" target="_blank" rel="noopener">Talk to someone</a>
                        <span class="stress-cta-note">(add your school or local support link here)</span>
                    </p>
                </div>

                <div class="stress-result-actions">
                    <button type="button" id="stressRetakeBtn" class="btn btn-primary">Retake Check</button>
                    <button type="button" id="stressClearBtn" class="btn btn-danger ghost btn-sm">Clear & Reset</button>
                </div>

                <p class="stress-disclaimer">
                    Disclaimer: This tool is a self-check and not a medical diagnosis. If you are struggling, please contact a trusted adult or a qualified professional.
                </p>
            </div>
        </div>
        <div id="stressAnnouncer" class="sr-only" aria-live="polite"></div>
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
        "How often do you feel like you are not doing “enough”, even when you try?",
        "How often do you feel alone with your stress or worries?"
    ];

    const OPTIONS = [
        { value: 1, emoji: "😊", label: "Never" },
        { value: 2, emoji: "🙂", label: "Almost Never" },
        { value: 3, emoji: "😐", label: "Sometimes" },
        { value: 4, emoji: "😟", label: "Fairly Often" },
        { value: 5, emoji: "😫", label: "Very Often" }
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
        const answered = getAnsweredCount();
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
                why: "Your answers suggest you’re handling stress well most of the time.",
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

            const span = document.createElement('span');
            span.className = 'emoji-face';
            span.textContent = `${opt.emoji} ${opt.label}`;

            input.addEventListener('change', () => {
                responses[index] = opt.value;
                saveStressState();
                updateProgress();
            });

            label.appendChild(input);
            label.appendChild(span);
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const answered = getAnsweredCount();
        if (answered !== totalQuestions) {
            validationHint.classList.remove('hidden');
            validationHint.setAttribute('role', 'alert');
            return;
        }
        validationHint.classList.add('hidden');
        validationHint.removeAttribute('role');

        const rawScore = calculateStressScore();
        const normalizedScore = Math.max(0, Math.min(40, rawScore - totalQuestions));
        renderStressResult(normalizedScore, false);
        saveStressState();
    });

    retakeBtn.addEventListener('click', () => {
        resultWrapper.classList.add('hidden');
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    clearBtn.addEventListener('click', () => {
        clearStressState();
    });
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
        interests: ["Technology & IT"],
        description: "Creates applications for mobile devices using iOS or Android platforms.",
        skills: ["Swift", "Kotlin", "React Native", "Flutter", "Mobile UI"],
        growth: "App Developer → Senior → Mobile Architect",
        education: "CS degree or specialized mobile dev courses",
        nextSteps: ["Learn Swift or Kotlin", "Build a simple app", "Publish to App Store/Play Store"],
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
        growth: "Junior Designer → Senior Designer → Design Lead → VP of Product",
        education: "Design degree or specialized UI/UX certification",
        nextSteps: ["Learn Figma", "Study design principles", "Create a case study", "Network with designers"],
        matchedInterests: []
    },
    {
        title: "Digital Marketer",
        interests: ["Marketing & Media", "Business & Management"],
        description: "Promotes products or brands through digital channels like social media and search engines.",
        skills: ["SEO", "Content Marketing", "Social Media Ads", "Analytics"],
        growth: "Marketing Associate → Manager → Marketing Director → CMO",
        education: "Degree in Marketing, Communications, or Business",
        nextSteps: ["Get Google Ads certification", "Start a blog", "Learn SEO basics", "Manage a social media page"],
        matchedInterests: []
    },
    {
        title: "Product Manager",
        interests: ["Business & Management", "Technology & IT", "Design & Creative"],
        description: "Oversees the development and success of a product from start to finish.",
        skills: ["Strategic Planning", "Market Research", "Agile", "Communication"],
        growth: "Associate PM → Product Manager → Senior PM → Director of Product",
        education: "MBA, CS degree, or Product Management courses",
        nextSteps: ["Read 'Cracking the PM Interview'", "Learn Agile/Scrum", "Work on a side project product"],
        matchedInterests: []
    },
    {
        title: "Financial Analyst",
        interests: ["Finance & Commerce", "Business & Management"],
        description: "Analyzes financial data to help businesses make investment and spending decisions.",
        skills: ["Excel", "Financial Modeling", "Accounting", "Risk Assessment"],
        growth: "Junior Analyst → Senior Analyst → Portfolio Manager → CFO",
        education: "Degree in Finance, Accounting, or Economics",
        nextSteps: ["Master Excel", "Learn Financial Modeling", "Prepare for CFA Level 1"],
        matchedInterests: []
    },
    {
        title: "AI Engineer",
        interests: ["Data & AI", "Technology & IT"],
        description: "Develops and deploys artificial intelligence models and systems.",
        skills: ["Deep Learning", "Neural Networks", "PyTorch", "TensorFlow"],
        growth: "AI Engineer → Senior AI Engineer → AI Architect → Research Scientist",
        education: "Advanced degree in CS, AI, or Robotics",
        nextSteps: ["Learn Linear Algebra", "Master Deep Learning frameworks", "Build a neural network project"],
        matchedInterests: []
    },
    {
        title: "Cloud Engineer",
        interests: ["Technology & IT", "Emerging Fields"],
        description: "Designs and manages an organization's cloud infrastructure.",
        skills: ["AWS", "Azure", "Docker", "Kubernetes", "Linux"],
        growth: "Cloud Admin → Cloud Engineer → Cloud Architect → DevOps Lead",
        education: "CS degree or Cloud certifications (AWS/Azure)",
        nextSteps: ["Get AWS Certified", "Learn Linux commands", "Build a cloud-hosted app"],
        matchedInterests: []
    },
    {
        title: "Cybersecurity Analyst",
        interests: ["Technology & IT", "Emerging Fields"],
        description: "Protects an organization's networks and data from cyber threats.",
        skills: ["Network Security", "Ethical Hacking", "Cryptography", "Incident Response"],
        growth: "Security Analyst → Senior Analyst → Security Architect → CISO",
        education: "Degree in Cybersecurity or CS with security focus",
        nextSteps: ["Learn networking basics", "Get CompTIA Security+", "Practice on TryHackMe"],
        matchedInterests: []
    },
    {
        title: "Full-Stack Developer",
        interests: ["Technology & IT"],
        description: "Develops both client and server software.",
        skills: ["HTML/CSS", "JavaScript", "Node.js", "Express", "MongoDB", "SQL"],
        growth: "Junior Full-Stack → Senior → Lead Architect",
        education: "CS degree or full-stack web development bootcamps",
        nextSteps: ["Master both frontend and backend", "Build a full-stack app", "Learn database management"],
        matchedInterests: []
    },
    {
        title: "Business Analyst",
        interests: ["Business & Management", "Data & AI"],
        description: "Uses data to bridge the gap between IT and business to improve processes.",
        skills: ["SQL", "Tableau", "Power BI", "Data Visualization", "Requirement Gathering"],
        growth: "Junior BA → Senior BA → Lead BA → Operations Manager",
        education: "Degree in Business, IT, or Data Analytics",
        nextSteps: ["Learn SQL", "Master Tableau or Power BI", "Take a Business Analysis course"],
        matchedInterests: []
    },
    {
        title: "Graphic Designer",
        interests: ["Design & Creative"],
        description: "Creates visual concepts to communicate ideas that inspire, inform, and captivate.",
        skills: ["Photoshop", "Illustrator", "InDesign", "Typography", "Branding"],
        growth: "Junior Designer → Art Director → Creative Director",
        education: "BFA in Design or portfolio-based training",
        nextSteps: ["Master Adobe Suite", "Build a design portfolio", "Learn typography basics"],
        matchedInterests: []
    },
    {
        title: "Blockchain Analyst",
        interests: ["Emerging Fields", "Finance & Commerce", "Technology & IT"],
        description: "Analyzes blockchain data and trends to provide insights into crypto markets.",
        skills: ["Solidity", "Smart Contracts", "DeFi", "Data Analysis"],
        growth: "Analyst → Senior Analyst → Blockchain Consultant",
        education: "Degree in Finance, CS, or specialized blockchain courses",
        nextSteps: ["Learn Solidity", "Study DeFi protocols", "Analyze blockchain transactions"],
        matchedInterests: []
    },
    {
        title: "Hospitality Manager",
        interests: ["Skilled Trades & Vocational", "Business & Management"],
        description: "Oversees the daily operations of hotels, restaurants, and other hospitality venues.",
        skills: ["Customer Service", "Leadership", "Budgeting", "Operations"],
        growth: "Assistant Manager → General Manager → Regional Director",
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
        <div class="planner-layout">
            <div class="planner-main">
                <div class="tool-header">
                    <h1>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px; color: var(--accent-color);">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Career Helper
                    </h1>
                    <div class="quote-card">
                        <p class="quote">"No job is small when you love what you do."</p>
                    </div>
                </div>
                
                <div class="planner-grid career-grid">
                    <div class="career-form glass-panel">
                        <h3>Choose Your Interests</h3>
                        <p class="text-secondary small mb-3">Select multiple fields to get better matches.</p>
                        <div class="interest-multi-select" id="interestContainer">
                            ${INTEREST_CATEGORIES.map(cat => `
                                <label class="check-container interest-label">
                                    <input type="checkbox" class="interest-checkbox" value="${cat}">
                                    <span class="checkbox-custom-box"></span>
                                    <span class="label-text">${cat}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="form-actions mt-4">
                            <button id="getSuggestions" class="btn btn-primary w-100">Get Career Suggestions</button>
                            <button id="clearInterests" class="btn btn-danger ghost w-100 mt-2">Clear Selection</button>
                        </div>
                    </div>
                    
                    <div class="career-results glass-panel">
                        <div class="results-header">
                            <h3>Career Suggestions</h3>
                            <span id="matchCount" class="badge medium hidden">0 Matches</span>
                        </div>
                        <div id="careerList" class="career-card-list">
                            <div class="empty-state">
                                <p>Select your interests and click "Get Suggestions" to start exploring your future.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <aside class="exp-panel favorites-panel glass-panel">
                <div class="exp-header">
                    <h3>Saved Careers</h3>
                </div>
                <div id="savedCareersList" class="saved-list">
                    <p class="text-secondary small">Your favorites will appear here.</p>
                </div>
                <button id="clearSavedCareers" class="btn btn-danger btn-sm ghost mt-4">Clear All Favorites</button>
            </aside>
        </div>
        <div id="ariaAnnouncer" class="sr-only" aria-live="polite"></div>
    `;

    const getBtn = document.getElementById('getSuggestions');
    const clearBtn = document.getElementById('clearInterests');
    const careerList = document.getElementById('careerList');
    const savedList = document.getElementById('savedCareersList');
    const matchCount = document.getElementById('matchCount');
    const clearSavedBtn = document.getElementById('clearSavedCareers');
    const ariaAnnouncer = document.getElementById('ariaAnnouncer');

    const announce = (message) => {
        ariaAnnouncer.textContent = message;
    };

    const loadCareerState = () => {
        const savedInterests = JSON.parse(localStorage.getItem('sl_career_interests') || '[]');
        document.querySelectorAll('.interest-checkbox').forEach(cb => {
            if (savedInterests.includes(cb.value)) cb.checked = true;
        });

        renderSavedCareers();
        if (savedInterests.length > 0) {
            generateSuggestions();
        }
    };

    const saveCareerState = () => {
        const selected = Array.from(document.querySelectorAll('.interest-checkbox:checked')).map(cb => cb.value);
        localStorage.setItem('sl_career_interests', JSON.stringify(selected));
    };

    const renderSavedCareers = () => {
        const saved = JSON.parse(localStorage.getItem('sl_saved_careers') || '[]');
        if (saved.length === 0) {
            savedList.innerHTML = '<p class="text-secondary small">Your favorites will appear here.</p>';
            return;
        }

        savedList.innerHTML = saved.map(careerTitle => `
            <div class="saved-item">
                <span>${careerTitle}</span>
                <button class="remove-btn" onclick="toggleSaveCareer('${careerTitle}')">×</button>
            </div>
        `).join('');
    };

    window.toggleSaveCareer = (title) => {
        let saved = JSON.parse(localStorage.getItem('sl_saved_careers') || '[]');
        if (saved.includes(title)) {
            saved = saved.filter(t => t !== title);
            announce(`Removed ${title} from favorites.`);
        } else {
            saved.push(title);
            announce(`Saved ${title} to favorites.`);
        }
        localStorage.setItem('sl_saved_careers', JSON.stringify(saved));
        renderSavedCareers();
        
        // Re-render suggestions to update button state if visible
        const selected = Array.from(document.querySelectorAll('.interest-checkbox:checked')).map(cb => cb.value);
        if (selected.length > 0) generateSuggestions();
    };

    const generateSuggestions = () => {
        const selected = Array.from(document.querySelectorAll('.interest-checkbox:checked')).map(cb => cb.value);
        
        if (selected.length === 0) {
            careerList.innerHTML = `
                <div class="empty-state">
                    <p>Select your interests and click "Get Suggestions" to start exploring your future.</p>
                </div>
            `;
            matchCount.classList.add('hidden');
            return;
        }

        if (selected.length > 6) {
            announce("You've selected many interests. Try narrowing them down for more specific results.");
        }

        const saved = JSON.parse(localStorage.getItem('sl_saved_careers') || '[]');

        // Logic: Rank by how many interests match
        let scoredCareers = CAREER_DATA.map(career => {
            const matches = career.interests.filter(i => selected.includes(i));
            const score = matches.length;
            return { ...career, score, matchedInterests: matches };
        }).filter(c => c.score > 0);

        scoredCareers.sort((a, b) => b.score - a.score);

        if (scoredCareers.length === 0) {
            careerList.innerHTML = `
                <div class="empty-state">
                    <p>No exact matches found. Try selecting different interests or broader categories.</p>
                </div>
            `;
            matchCount.classList.add('hidden');
            return;
        }

        matchCount.textContent = `${scoredCareers.length} Matches`;
        matchCount.classList.remove('hidden');

        careerList.innerHTML = scoredCareers.map(career => {
            const isSaved = saved.includes(career.title);
            const relevanceClass = career.score >= 2 ? 'high' : (career.score === 1 ? 'medium' : 'low');
            const relevanceText = career.score >= 2 ? 'High Match' : 'Match';

            return `
                <div class="career-card glow-card reveal-on-scroll" style="animation-delay: ${0.04 * scoredCareers.indexOf(career)}s">
                    <div class="career-card-header">
                        <div class="title-section">
                            <h4>${career.title}</h4>
                            <span class="badge ${relevanceClass}">${relevanceText}</span>
                        </div>
                        <button class="save-btn ${isSaved ? 'active' : ''}" data-title="${career.title}" onclick="toggleSaveCareer('${career.title}')">
                            ${isSaved ? '★ Saved' : '☆ Save'}
                        </button>
                    </div>
                    
                    <p class="career-desc">${career.description}</p>
                    
                    <div class="career-tags">
                        ${career.matchedInterests.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>

                    <div class="career-details">
                        <div class="detail-section">
                            <strong>Skills:</strong> ${career.skills.join(', ')}
                        </div>
                        <div class="detail-section">
                            <strong>Growth:</strong> ${career.growth}
                        </div>
                        <div class="detail-section">
                            <strong>Education:</strong> ${career.education}
                        </div>
                        <div class="detail-section next-steps">
                            <strong>Next Steps:</strong>
                            <ul>
                                ${career.nextSteps.map(step => `<li>${step}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="why-suits">
                        <small><em>Why this suits you:</em> Matches your interest in ${career.matchedInterests.join(' and ')}.</small>
                    </div>
                </div>
            `;
        }).join('');

        announce(`Found ${scoredCareers.length} career suggestions.`);
    };

    getBtn.addEventListener('click', () => {
        saveCareerState();
        generateSuggestions();
    });

    clearBtn.addEventListener('click', () => {
        document.querySelectorAll('.interest-checkbox').forEach(cb => cb.checked = false);
        localStorage.removeItem('sl_career_interests');
        generateSuggestions();
        announce("Interests cleared.");
    });

    clearSavedBtn.addEventListener('click', () => {
        if (confirm('Clear all saved careers?')) {
            localStorage.setItem('sl_saved_careers', '[]');
            renderSavedCareers();
            generateSuggestions();
            announce("Saved careers cleared.");
        }
    });

    loadCareerState();
}

/* -------------------------------------------------------------------------- */
/*                                Pomodoro Timer                              */
/* -------------------------------------------------------------------------- */

/**
 * Renders the Pomodoro Focus Timer tool workspace.
 * Features: Configurable durations, EXP system, Session cycles, LocalStorage persistence.
 * @param {HTMLElement} container - The workspace container to render into.
 */
function renderPomodoroTimer(container) {
    // Default Durations (Minutes)
    const DEFAULTS = {
        focus: 25,
        shortBreak: 5,
        longBreak: 15,
        cyclesBeforeLong: 4
    };

    container.innerHTML = `
        <div class="planner-layout">
            <div class="planner-main">
                <div class="tool-header">
                    <h1>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px; color: var(--accent-color);">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Focus Timer
                    </h1>
                    <div class="stats">
                        <div class="stat-card">
                            <p>Sets Completed</p>
                            <div id="totalSets" class="stat-value">0</div>
                        </div>
                    </div>
                </div>

                <div class="pomodoro-container glass-panel">
                    <div class="timer-display">
                        <svg class="timer-ring" width="300" height="300">
                            <circle class="timer-ring-bg" cx="150" cy="150" r="140"></circle>
                            <circle class="timer-ring-progress" id="timerProgress" cx="150" cy="150" r="140"></circle>
                        </svg>
                        <div class="timer-text">
                            <span id="sessionLabel" class="session-label">Focus</span>
                            <span id="timeLeft" class="time-left">25:00</span>
                        </div>
                    </div>

                    <div class="timer-controls">
                        <button id="startPauseBtn" class="btn btn-primary btn-large">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            Start
                        </button>
                        <button id="resetBtn" class="btn btn-danger ghost">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                            Reset
                        </button>
                        <button id="skipBtn" class="btn ghost" title="Skip Session">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                        </button>
                    </div>

                    <div class="session-counter">
                        <div id="cycleDots" class="cycle-dots"></div>
                        <p id="cycleText">1 / 4 sessions until long break</p>
                    </div>
                </div>

                <div class="pomodoro-settings glass-panel mt-4">
                    <div class="settings-header">
                        <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Settings</h3>
                        <p class="small text-secondary">Changes apply to next session</p>
                    </div>
                    <div class="settings-grid">
                        <div class="form-group">
                            <label>Focus (min)</label>
                            <input type="number" id="focusDuration" min="1" max="60" value="25">
                        </div>
                        <div class="form-group">
                            <label>Short Break</label>
                            <input type="number" id="shortBreakDuration" min="1" max="30" value="5">
                        </div>
                        <div class="form-group">
                            <label>Long Break</label>
                            <input type="number" id="longBreakDuration" min="1" max="60" value="15">
                        </div>
                    </div>
                </div>
            </div>

            <aside class="exp-panel glass-panel">
                <div class="exp-header">
                    <h3>EXP Rewards</h3>
                </div>
                <div class="exp-display">
                    <div class="exp-icon-wrapper">
                        <svg class="exp-icon-large" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#pomoStarGradient)" stroke="#fbbf24" stroke-width="1"/>
                            <defs>
                                <linearGradient id="pomoStarGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#fbbf24"/>
                                    <stop offset="1" stop-color="#f59e0b"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div id="pomoTotalExp" class="exp-value">0</div>
                    <span class="exp-unit">TOTAL EXP</span>
                </div>
                <div class="exp-info">
                    <p><strong>Focus Session:</strong> +10 EXP</p>
                    <p><strong>Full Set (4):</strong> +20 Bonus</p>
                </div>
                <div class="exp-stats">
                    <p id="totalFocusMinutes">Total Focus: 0 min</p>
                    <p id="totalSessions">Sessions: 0</p>
                </div>
                <button id="clearPomoStats" class="btn btn-danger ghost btn-sm mt-3">Reset Stats</button>
            </aside>
        </div>
        <div id="pomoAnnouncer" class="sr-only" aria-live="polite"></div>
    `;

    // DOM Elements
    const timeLeft = document.getElementById('timeLeft');
    const sessionLabel = document.getElementById('sessionLabel');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const skipBtn = document.getElementById('skipBtn');
    const timerProgress = document.getElementById('timerProgress');
    const cycleDots = document.getElementById('cycleDots');
    const cycleText = document.getElementById('cycleText');
    const totalSetsDisplay = document.getElementById('totalSets');
    const totalExpDisplay = document.getElementById('pomoTotalExp');
    const focusMinutesDisplay = document.getElementById('totalFocusMinutes');
    const totalSessionsDisplay = document.getElementById('totalSessions');
    const pomoAnnouncer = document.getElementById('pomoAnnouncer');
    
    // Inputs
    const focusInput = document.getElementById('focusDuration');
    const shortInput = document.getElementById('shortBreakDuration');
    const longInput = document.getElementById('longBreakDuration');

    // Timer Logic State
    let timerInterval = null;
    let state = {
        type: 'focus', // focus, shortBreak, longBreak
        remaining: DEFAULTS.focus * 60,
        isRunning: false,
        cycle: 1,
        earnedFlag: false
    };

    let stats = {
        completedFocusCount: 0,
        completedSets: 0,
        totalFocusMinutes: 0
    };

    // SVG Circle Math
    const RADIUS = 140;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    timerProgress.style.strokeDasharray = CIRCUMFERENCE;

    const updateProgress = (percent) => {
        const offset = CIRCUMFERENCE - (percent * CIRCUMFERENCE);
        timerProgress.style.strokeDashoffset = offset;
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const announce = (msg) => {
        pomoAnnouncer.textContent = msg;
    };

    const saveState = () => {
        localStorage.setItem('sl_pomodoro_state', JSON.stringify(state));
        localStorage.setItem('sl_pomodoro_stats', JSON.stringify(stats));
    };

    const loadState = () => {
        const savedState = JSON.parse(localStorage.getItem('sl_pomodoro_state'));
        const savedStats = JSON.parse(localStorage.getItem('sl_pomodoro_stats'));
        const totalExp = parseInt(localStorage.getItem('sl_total_exp') || '0');

        if (savedState) state = savedState;
        if (savedStats) stats = savedStats;

        // Update UI from loaded state
        totalExpDisplay.textContent = totalExp;
        totalSetsDisplay.textContent = stats.completedSets;
        focusMinutesDisplay.textContent = `Total Focus: ${stats.totalFocusMinutes} min`;
        totalSessionsDisplay.textContent = `Sessions: ${stats.completedFocusCount}`;
        
        updateUI();
    };

    const updateUI = () => {
        timeLeft.textContent = formatTime(state.remaining);
        
        const labelMap = {
            focus: 'Focus',
            shortBreak: 'Short Break',
            longBreak: 'Long Break'
        };
        sessionLabel.textContent = labelMap[state.type];
        sessionLabel.className = `session-label ${state.type}`;

        // Update progress ring
        const duration = getDuration(state.type) * 60;
        updateProgress(state.remaining / duration);

        // Start/Pause Button Icon/Text
        startPauseBtn.innerHTML = state.isRunning 
            ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause`
            : `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Start`;

        // Update dots
        cycleDots.innerHTML = '';
        for (let i = 1; i <= DEFAULTS.cyclesBeforeLong; i++) {
            const dot = document.createElement('div');
            dot.className = `dot ${i < state.cycle ? 'filled' : (i === state.cycle && state.type === 'focus' ? 'active' : '')}`;
            cycleDots.appendChild(dot);
        }
        cycleText.textContent = `${state.cycle} / ${DEFAULTS.cyclesBeforeLong} sessions until long break`;
    };

    const getDuration = (type) => {
        if (type === 'focus') return parseInt(focusInput.value) || DEFAULTS.focus;
        if (type === 'shortBreak') return parseInt(shortInput.value) || DEFAULTS.shortBreak;
        if (type === 'longBreak') return parseInt(longInput.value) || DEFAULTS.longBreak;
        return 25;
    };

    const awardExp = (amount) => {
        let totalExp = parseInt(localStorage.getItem('sl_total_exp') || '0');
        totalExp += amount;
        localStorage.setItem('sl_total_exp', totalExp);
        const current = parseInt(totalExpDisplay.textContent || '0');
        animateCount(totalExpDisplay, isNaN(current) ? 0 : current, totalExp);

        // Animation
        flyTo(timeLeft, `+${amount} EXP`, { color: '#fbbf24' });
    };

    const switchSession = () => {
        if (state.type === 'focus') {
            // Award Focus EXP
            if (!state.earnedFlag) {
                awardExp(10);
                stats.completedFocusCount++;
                stats.totalFocusMinutes += getDuration('focus');
                state.earnedFlag = true;
                
                if (state.cycle >= DEFAULTS.cyclesBeforeLong) {
                    awardExp(20); // Bonus for set
                    stats.completedSets++;
                    state.type = 'longBreak';
                    state.cycle = 1;
                    announce("Focus complete! +10 EXP and +20 Bonus! Starting long break.");
                } else {
                    state.type = 'shortBreak';
                    state.cycle++;
                    announce("Focus complete! +10 EXP. Starting short break.");
                }
            }
        } else {
            state.type = 'focus';
            state.earnedFlag = false;
            announce("Break over. Ready to focus?");
        }

        state.remaining = getDuration(state.type) * 60;
        state.isRunning = false; // Auto-pause after switch to let user breathe
        clearInterval(timerInterval);
        timerInterval = null;
        
        saveState();
        updateUI();
        
        // Notification (optional browser alert)
        if (Notification.permission === "granted") {
            new Notification("Timer Update", { body: `Session switched to ${state.type}` });
        }
    };

    const tick = () => {
        if (state.remaining > 0) {
            state.remaining--;
            updateUI();
            if (state.remaining % 10 === 0) saveState(); // Save every 10 seconds
        } else {
            switchSession();
        }
    };

    const startTimer = () => {
        if (state.isRunning) return;
        state.isRunning = true;
        timerInterval = setInterval(tick, 1000);
        updateUI();
        saveState();
        announce(`${state.type === 'focus' ? 'Focus' : 'Break'} started.`);
    };

    const pauseTimer = () => {
        state.isRunning = false;
        clearInterval(timerInterval);
        timerInterval = null;
        updateUI();
        saveState();
        announce("Timer paused.");
    };

    const resetTimer = () => {
        if (confirm("Reset current session? Stats will be kept.")) {
            pauseTimer();
            state.remaining = getDuration(state.type) * 60;
            updateUI();
            saveState();
            announce("Timer reset.");
        }
    };

    // Event Listeners
    startPauseBtn.addEventListener('click', () => {
        if (state.isRunning) pauseTimer();
        else startTimer();
    });

    resetBtn.addEventListener('click', resetTimer);
    
    skipBtn.addEventListener('click', () => {
        if (confirm("Skip this session? No EXP will be awarded.")) {
            state.remaining = 0;
            switchSession();
        }
    });

    document.getElementById('clearPomoStats').addEventListener('click', () => {
        if (confirm("Clear all Pomodoro statistics? (Global EXP will stay)")) {
            stats = {
                completedFocusCount: 0,
                completedSets: 0,
                totalFocusMinutes: 0
            };
            saveState();
            loadState();
        }
    });

    // Keyboard Shortcuts
    const handleKeydown = (e) => {
        // Only run if Pomodoro timer is currently visible in the DOM
        if (!document.getElementById('startPauseBtn')) return;
        if (document.activeElement.tagName === 'INPUT') return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            if (state.isRunning) pauseTimer();
            else startTimer();
        } else if (e.key.toLowerCase() === 'r') {
            resetTimer();
        } else if (e.key.toLowerCase() === 's') {
            skipBtn.click();
        }
    };
    window.addEventListener('keydown', handleKeydown);

    // Initial Load
    loadState();
    
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}
