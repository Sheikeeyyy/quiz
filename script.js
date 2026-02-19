/* Professional Exam System Logic */

// --- Configuration ---
const CONFIG = {
    totalTime: 30 * 60, // 30 minutes in seconds
    passingScore: 60, // Percentage
    maxViolations: 3,
    localStorageKey: 'exam_session_v1'
};

// --- DOM Elements ---
const screens = {
    welcome: document.getElementById('welcome-screen'),
    instructions: document.getElementById('instructions-screen'),
    exam: document.getElementById('exam-screen'),
    result: document.getElementById('result-screen')
};

const overlays = {
    security: document.getElementById('security-overlay'),
    submit: document.getElementById('submit-overlay')
};

const elements = {
    regForm: document.getElementById('registration-form'),
    candidateNameInput: document.getElementById('candidate-name'),
    candidateEmailInput: document.getElementById('candidate-email'),
    startBtn: document.getElementById('start-exam-btn'),
    agreeCheckbox: document.getElementById('agree-checkbox'),
    timeDisplay: document.getElementById('time-display'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    nextBtn: document.getElementById('next-btn'),
    submitBtn: document.getElementById('submit-exam-btn'),
    progressBar: document.getElementById('exam-progress-bar'),
    currentQNum: document.getElementById('current-question-num'),
    totalQNum: document.getElementById('total-questions-num'),
    qNumber: document.getElementById('q-number'),
    warningMessage: document.getElementById('warning-message'),
    violationCount: document.getElementById('violation-count'),
    resumeBtn: document.getElementById('resume-btn'),
    confirmSubmitBtn: document.getElementById('confirm-submit-btn'),
    cancelSubmitBtn: document.getElementById('cancel-submit-btn'),
    backToWelcomeBtn: document.getElementById('back-to-welcome-btn')
};

// --- Default Questions Data ---
const defaultQuestions = [
    {
        id: 1,
        question: "What does HTML stand for?",
        options: ["Hyper Text Preprocessor", "Hyper Text Markup Language", "Hyper Text Multiple Language", "Hyper Tool Multi Language"],
        answer: 1
    },
    {
        id: 2,
        question: "Which CSS property controls the text size?",
        options: ["font-style", "text-style", "font-size", "text-size"],
        answer: 2
    },
    {
        id: 3,
        question: "Inside which HTML element do we put the JavaScript?",
        options: ["<script>", "<javascript>", "<js>", "<scripting>"],
        answer: 0
    },
    {
        id: 4,
        question: "How do you declare a JavaScript variable?",
        options: ["v carName;", "variable carName;", "var carName;", "constant carName;"],
        answer: 2
    },
    {
        id: 5,
        question: "Which event occurs when the user clicks on an HTML element?",
        options: ["onmouseclick", "onchange", "onclick", "onmouseover"],
        answer: 2
    },
    {
        id: 6,
        question: "What is the correct syntax for referring to an external script called 'xxx.js'?",
        options: ["<script href='xxx.js'>", "<script name='xxx.js'>", "<script src='xxx.js'>", "<script file='xxx.js'>"],
        answer: 2
    },
    {
        id: 7,
        question: "Which of the following is NOT a JavaScript data type?",
        options: ["String", "Boolean", "Float", "Number"],
        answer: 2
    },
    {
        id: 8,
        question: "How do you write 'Hello World' in an alert box?",
        options: ["msg('Hello World');", "msgBox('Hello World');", "alert('Hello World');", "alertBox('Hello World');"],
        answer: 2
    },
    {
        id: 9,
        question: "How do you create a function in JavaScript?",
        options: ["function:myFunction()", "function = myFunction()", "function myFunction()", "create myFunction()"],
        answer: 2
    },
    {
        id: 10,
        question: "How does a FOR loop start?",
        options: ["for (i = 0; i <= 5)", "for (i = 0; i <= 5; i++)", "for i = 1 to 5", "for (i <= 5; i++)"],
        answer: 1
    }
];

// --- Application State ---
let state = {
    candidate: { name: '', email: '' },
    questions: [],
    currentQuestionIndex: 0,
    answers: {}, // { questionId: selectedOptionIndex }
    timeLeft: CONFIG.totalTime,
    violations: 0,
    isExamActive: false,
    timerInterval: null
};

// --- Initialization ---
function init() {
    try {
        loadState();
        setupEventListeners();

        if (state.isExamActive) {
            showScreen('exam');
            startExamFlow(true); // Resume
        } else {
            showScreen('welcome');
        }
    } catch (error) {
        console.error("Critical initialization error:", error);
        alert("System encountered a critical error. Resetting application.");
        localStorage.removeItem(CONFIG.localStorageKey);
        location.reload();
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Navigation
    elements.regForm.addEventListener('submit', handleRegistration);
    elements.backToWelcomeBtn.addEventListener('click', () => showScreen('welcome'));
    elements.startBtn.addEventListener('click', startExam);
    elements.agreeCheckbox.addEventListener('change', (e) => elements.startBtn.disabled = !e.target.checked);

    // Exam Controls
    elements.nextBtn.addEventListener('click', () => {
        if (state.currentQuestionIndex < state.questions.length - 1) {
            state.currentQuestionIndex++;
            renderQuestion();
            saveState();
        }
    });

    elements.submitBtn.addEventListener('click', () => overlays.submit.classList.remove('hidden'));
    elements.cancelSubmitBtn.addEventListener('click', () => overlays.submit.classList.add('hidden'));
    elements.confirmSubmitBtn.addEventListener('click', finishExam);

    // Security Overlays
    elements.resumeBtn.addEventListener('click', () => {
        requestFullscreen();
        overlays.security.classList.add('hidden');
    });

    // Anti-Cheat Events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleFocusLoss);

    // Disable inputs
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', handleKeydown);
}

// --- Core Logic ---

function handleRegistration(e) {
    e.preventDefault();
    state.candidate.name = elements.candidateNameInput.value;
    state.candidate.email = elements.candidateEmailInput.value;
    saveState();
    showScreen('instructions');
}

function startExam() {
    requestFullscreen();

    state.isExamActive = true;
    state.timeLeft = CONFIG.totalTime;
    state.violations = 0;
    state.answers = {};
    state.currentQuestionIndex = 0;

    // Shuffle questions
    state.questions = shuffleArray([...defaultQuestions]);

    saveState();
    startExamFlow(false);
}

function startExamFlow(isResume) {
    showScreen('exam');
    renderQuestion();
    startTimer();
    updateProgress();

    if (!isResume) {
        // Initial security check delay to allow fullscreen transition
        setTimeout(() => {
            if (!document.fullscreenElement) {
                flagViolation("Fullscreen mode is required.");
            }
        }, 1000);
    }
}

function renderQuestion() {
    const question = state.questions[state.currentQuestionIndex];
    elements.currentQNum.innerText = state.currentQuestionIndex + 1;
    elements.totalQNum.innerText = state.questions.length;
    elements.qNumber.innerText = state.currentQuestionIndex + 1;
    elements.questionText.innerText = question.question;

    // Render Options
    elements.optionsContainer.innerHTML = '';
    question.options.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.className = 'option';
        btn.innerText = opt;

        // Restore selection if exists
        if (state.answers[question.id] === index) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', () => selectOption(question.id, index));
        elements.optionsContainer.appendChild(btn);
    });

    // Button states
    elements.nextBtn.disabled = state.answers[question.id] === undefined;

    if (state.currentQuestionIndex === state.questions.length - 1) {
        elements.nextBtn.style.display = 'none';
        elements.submitBtn.style.display = 'block';
    } else {
        elements.nextBtn.style.display = 'inline-flex';
        elements.submitBtn.style.display = 'none';
    }

    updateProgress();
}

function selectOption(questionId, optionIndex) {
    const options = document.querySelectorAll('.option');
    options.forEach((opt, idx) => {
        if (idx === optionIndex) opt.classList.add('selected');
        else opt.classList.remove('selected');
    });

    state.answers[questionId] = optionIndex;
    elements.nextBtn.disabled = false;
    saveState();
}

function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();
        saveState(); // Persist time

        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            finishExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    elements.timeDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (state.timeLeft < 300) { // Less than 5 mins
        document.getElementById('timer-wrapper').classList.add('warning');
    }
}

function updateProgress() {
    const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
    elements.progressBar.style.width = `${progress}%`;
}

function finishExam() {
    clearInterval(state.timerInterval);
    state.isExamActive = false;
    overlays.submit.classList.add('hidden');

    calculateResults();
    showScreen('result');

    // Clear Session
    localStorage.removeItem(CONFIG.localStorageKey);
    exitFullscreen();
}

function calculateResults() {
    let score = 0;
    state.questions.forEach(q => {
        if (state.answers[q.id] === q.answer) {
            score++;
        }
    });

    const percentage = Math.round((score / state.questions.length) * 100);
    const passed = percentage >= CONFIG.passingScore;
    const timeTakenSec = CONFIG.totalTime - state.timeLeft;

    // DOM Updates
    document.getElementById('result-name').innerText = state.candidate.name;
    document.getElementById('result-id').innerText = state.candidate.email;
    document.getElementById('result-percentage').innerText = `${percentage}%`;
    document.getElementById('result-score').innerText = `${score}/${state.questions.length}`;
    document.getElementById('time-taken').innerText = `${Math.floor(timeTakenSec / 60)}m ${timeTakenSec % 60}s`;
    document.getElementById('violation-report').innerText = state.violations;
    document.getElementById('correct-count').innerText = score;
    document.getElementById('wrong-count').innerText = state.questions.length - score;

    const statusBadge = document.getElementById('status-badge');
    statusBadge.innerText = passed ? 'PASSED' : 'FAILED';
    statusBadge.className = `status-badge ${passed ? 'pass' : 'fail'}`;

    const scoreCircle = document.querySelector('.circle');
    // Using stroke-dasharray for the new SVG structure: "percentage, 100"
    scoreCircle.style.strokeDasharray = `${percentage}, 100`;
    scoreCircle.style.stroke = passed ? '#10b981' : '#ef4444';
}

// --- Security & Anti-Cheat ---

function requestFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

function handleFullscreenChange() {
    if (!state.isExamActive) return;

    if (!document.fullscreenElement) {
        flagViolation("Fullscreen mode exited.");
    }
}

function handleVisibilityChange() {
    if (!state.isExamActive) return;

    if (document.hidden) {
        flagViolation("Tab switching detected.");
    }
}

function handleFocusLoss() {
    if (!state.isExamActive) return;
    flagViolation("Window focus lost.");
}

function handleKeydown(e) {
    // Block F12, Ctrl+Shift+I, Ctrl+U, Alt+Tab (partial)
    if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u')
    ) {
        e.preventDefault();
        return false;
    }
}

function flagViolation(reason) {
    if (!state.isExamActive) return;

    state.violations++;
    elements.warningMessage.innerText = reason;
    elements.violationCount.innerText = state.violations;
    overlays.security.classList.remove('hidden');
    saveState();

    if (state.violations >= CONFIG.maxViolations) {
        alert("Maximum violations reached. Exam will be auto-submitted.");
        finishExam();
    }
}

// --- Utilities ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function saveState() {
    localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(state));
}

function loadState() {
    try {
        const saved = localStorage.getItem(CONFIG.localStorageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Validate essential state properties
            if (parsed && parsed.isExamActive && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                state = parsed;
            } else {
                console.warn('Invalid or corrupted state found in localStorage. Resetting.');
                localStorage.removeItem(CONFIG.localStorageKey);
            }
        }
    } catch (e) {
        console.error('Error loading state:', e);
        localStorage.removeItem(CONFIG.localStorageKey);
    }
}

// Start
// Start
document.addEventListener('DOMContentLoaded', init);
