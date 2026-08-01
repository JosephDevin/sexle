const WORD_LENGTH = 3;
let wordList = [];
let currentGuess = [''];
let lastWord = '';
let gameOver = false;

let dailyWord;
let score = 0;

let hint;
let dialog;

let path;
let bestScore;

/* ==========================
LOADS THE WORD AND DISPLAY IT
============================= */

async function loadWords() {
    const res = await fetch('data/words.txt');
    const text = await res.text();
    wordList = text
        .split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length === WORD_LENGTH);
}

// PICKS AND DISPLAYS THE STARTING WORD
function pickDailyWord(list) {
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const seed = [...today].reduce((acc, c) => acc + c.charCodeAt(0), 0);

    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const rand = mulberry32(seed);
    const index = Math.floor(rand() * list.length);

    const board = document.getElementById('board');
    const rowStart = document.createElement('div');
    rowStart.className = 'Row';

    let letters = list[index];

    for (let j = 0; j < WORD_LENGTH; j++) {
        const box = document.createElement('div');
        box.className = 'Box';
        box.textContent = letters[j] ? letters[j].toUpperCase() : '';
        rowStart.appendChild(box);
    }

    const rowGuess = document.createElement('div');
    rowGuess.className = 'Row';

    for (let j = 0; j < WORD_LENGTH; j++) {
        const box = document.createElement('div');
        box.className = 'Box';
        rowGuess.appendChild(box);
    }

    board.appendChild(rowStart);
    board.appendChild(rowGuess);
    lastWord = list[index];
    return list[index];
}

/* ======================================
 HANDLES KEYBOARD INTERACTION
 ======================================== */

function updateKeyboard() {
    const rows = document.getElementsByClassName('Row');
    const guessRow = rows[score + 1];
    if (!guessRow) return;

    const guess = currentGuess[currentGuess.length - 1];
    const boxes = guessRow.getElementsByClassName('Box');
    for (let j = 0; j < WORD_LENGTH; j++) {
        boxes[j].textContent = guess[j] ? guess[j].toUpperCase() : '';
    }
}

function handleKey(key) {
    if (gameOver) return;

    const guess = currentGuess[currentGuess.length - 1];

    if (key === 'Enter' && guess.length === 3 && !gameOver) {
        submitGuess();
    } else if (key === '⌫' || key === 'Backspace') {
        currentGuess[currentGuess.length - 1] = guess.slice(0, -1);
        updateKeyboard();
    } else if (/^[a-zA-Z]$/.test(key) && guess.length < WORD_LENGTH) {
        currentGuess[currentGuess.length - 1] = guess + key.toLowerCase();
        updateKeyboard();
    }
}

// GUESS
function submitGuess() {
    const guess = currentGuess[currentGuess.length - 1];
    let streak = parseInt(localStorage.getItem("streak")) + 1;

    if (guess === 'sex' && distance(lastWord, guess) === 1) {
        colorLastRow(guess);
        gameOver = true;
        score += 1;
        launchConfetti();
        openResultsDialog(dailyWord, score, 0);

        localStorage.setItem("streak", streak.toString());

        localStorage.setItem("completedPuzzle", JSON.stringify({
            puzzle: getPuzzleNumber(),
            score: score,
            guesses: currentGuess
        }));

        return;
    }


    if (!wordList.includes(guess)) {
        currentGuess[currentGuess.length - 1] = '';
        if (window.triggerShake) {
            window.triggerShake({ tint: 'rgba(74, 222, 128, 0.0)', intensity: '5px' });
        }
        hint.innerText = 'Word is not in the list.';
        hint.classList.remove('hidden');
    }
    else if (distance(lastWord, guess) > 1) {
        currentGuess[currentGuess.length - 1] = '';
        updateKeyboard();
        if (window.triggerShake) {
            window.triggerShake({ tint: 'rgba(74, 222, 128, 0.0)', intensity: '5px' });
        }
        hint.innerText = 'Not one letter is different.';
        hint.classList.remove('hidden');
    }
    else {
        colorLastRow(guess);
        score += 1;
        addRow(document.getElementById('board'));
        lastWord = guess;
        currentGuess.push('');
    }
}


function launchConfetti() {
    const duration = 5000,
        animationEnd = Date.now() + duration,
        defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 50 * (timeLeft / duration);

        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        }));
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        }));
    }, 250);

    const d = document.getElementById('results');
    console.log('open:', d.open);
}

/* ======================================
 RESULTS DIALOG
 ======================================== */

function openResultsDialog(word, guesses, best) {
    const bestScore = path.length - 1;
    let streak = parseInt(localStorage.getItem("streak")) + 1;

    document.getElementById('wordTransition').innerHTML =
        `${word.toUpperCase()} <span>to</span> SEX`;
    document.getElementById('guessCount').textContent = `${guesses} guesses.`;
    document.getElementById('bestCount').textContent = `${bestScore} guesses.`;
    document.getElementById('streak').textContent = `${streak}`;
    document.getElementById('table').textContent = buildResultsTable();
    dialog.showModal();

    dialog.tabIndex = -1;
    dialog.focus();
}

/* ======================================
 INIT
 ======================================== */
async function init() {
    hint = document.getElementById('hint');

    await loadWords();
    dailyWord = pickDailyWord(wordList);
    displayPuzzleNumber();
    initInput();

    path = solveSexle(wordList, dailyWord);
    bestScore = path.length - 1;

    if (localStorage.getItem("streak") == null) {
        localStorage.setItem("streak", 0);
    }

    initDialog();

    const saved = JSON.parse(localStorage.getItem("completedPuzzle") || "null");
    if (saved && saved.puzzle === getPuzzleNumber()) {
        gameOver = true;
        score = saved.score;
        currentGuess = saved.guesses;
        openResultsDialog(dailyWord, score, 0);
    }
}

function initInput() {
    document.addEventListener('keydown', (e) => {
        handleKey(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    });

    document.querySelectorAll('.Key[data-key]').forEach(keyEl => {
        let recentTouch = false;

        keyEl.addEventListener('touchend', (e) => {
            e.preventDefault();
            recentTouch = true;
            handleKey(keyEl.dataset.key);
            setTimeout(() => { recentTouch = false; }, 400);
        }, { passive: false });

        keyEl.addEventListener('click', () => {
            if (recentTouch) return;
            handleKey(keyEl.dataset.key);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);



function initDialog() {
    dialog = document.getElementById('results');

    document.getElementById('closeBtn').addEventListener('click', () => dialog.close());
    document.getElementById('copyBtn').addEventListener('click', handleCopyClick);

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });
}












/* ======================================
 HELPERS
 ======================================== */

function colorLastRow(guess) {
    const target = ['s', 'e', 'x'];
    const rows = document.getElementsByClassName('Row');
    const row = rows[score + 1];
    if (!row) return;

    const boxes = row.getElementsByClassName('Box');
    for (let j = 0; j < WORD_LENGTH; j++) {
        if (guess[j] === target[j]) {
            boxes[j].classList.add('correct');
        }
    }
}

function addRow(board) {
    const rowGuess = document.createElement('div');
    rowGuess.className = 'Row';

    for (let j = 0; j < WORD_LENGTH; j++) {
        const box = document.createElement('div');
        box.className = 'Box';
        rowGuess.appendChild(box);
    }

    board.appendChild(rowGuess);
}

function distance(wordA, wordB) {
    if (wordA.length !== wordB.length) return 3;

    let diffCount = 0;
    for (let i = 0; i < wordA.length; i++) {
        if (wordA[i] !== wordB[i]) diffCount++;
    }
    return diffCount;
}

/* ======================================
 DATE
 ======================================== */

const START_DATE = new Date('2026-07-20');

function getPuzzleNumber() {
    const today = new Date();
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const startUTC = Date.UTC(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = Math.floor((todayUTC - startUTC) / msPerDay);

    return daysElapsed + 1;
}

function displayPuzzleNumber() {
    const subheader = document.querySelector('.subheader');
    subheader.textContent = `#${getPuzzleNumber()}`;
}

/* ======================================
 COPY RESULTS
 ======================================== */

function buildResultsText() {
    let results = 'Sexle #' + getPuzzleNumber() + ' ' + score + '/' + bestScore + '\n';

    results += buildResultsTable();

    results += '\nhttps://sexle.netlify.app/';
    return results;
}

function buildResultsTable() {
    let results = '⬜⬜⬜\n';

    for (let j = 0; j < currentGuess.length; j++) {
        for (let k = 0; k < 3; k++) {
            if (currentGuess[j][k] === 's' || currentGuess[j][k] === 'e' || currentGuess[j][k] === 'x') {
                results += '🟥';
            } else {
                results += '⬜';
            }
        }
        results += '\n';
    }

    return results;
}

async function handleCopyClick() {
    const feedback = document.getElementById('copyFeedback');
    const results = buildResultsText();

    try {
        await navigator.clipboard.writeText(results);
        feedback.textContent = 'Copied!';
        feedback.classList.remove('error');
    } catch (err) {
        console.error('Copy failed:', err);
        feedback.textContent = 'Copy failed.';
        feedback.classList.add('error');
    }

    setTimeout(() => { feedback.textContent = ''; }, 2000);
}