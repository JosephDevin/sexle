const WORD_LENGTH = 3;
let wordList = [];
let currentGuess = '';
let lastWord = '';
let gameOver = false;

let score = 0;

let hint;

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

    // LOADS INTO BOXES
    const board = document.getElementById('board');
    const rowStart = document.createElement('div');
    rowStart.className = 'Row';

    let letters = list[index];
    console.log(letters);

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
    const guessRow = rows[score + 1]; // score tracks the index of the active guess row
    if (!guessRow) return;

    const boxes = guessRow.getElementsByClassName('Box');
    for (let j = 0; j < WORD_LENGTH; j++) {
        boxes[j].textContent = currentGuess[j] ? currentGuess[j].toUpperCase() : '';
    }
}

function handleKey(key) {
    if (gameOver) return;

    if (key === 'Enter' && currentGuess.length === 3) {
        submitGuess();
    } else if (key === '⌫' || key === 'Backspace') {
        currentGuess = currentGuess.slice(0, -1);
        updateKeyboard();
    } else if (/^[a-zA-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        currentGuess += key.toLowerCase();
        updateKeyboard();
    }
}

// GUESS
function submitGuess() {

    // WORD NOT IN LIST
    if (!wordList.includes(currentGuess)) {
        currentGuess = '';
        if (window.triggerShake) {
            window.triggerShake({
                tint: 'rgba(74, 222, 128, 0.0)',
                intensity: '5px'
            });
        }

        hint.innerText = 'Word is not in the list.';
        hint.classList.remove('hidden');
    }

    // WORD TOO DIFFERENT
    else if (distance(lastWord, currentGuess) > 1) {
        currentGuess = '';
        updateKeyboard();
        if (window.triggerShake) {
            window.triggerShake({
                tint: 'rgba(74, 222, 128, 0.0)',
                intensity: '5px'
            });
        }

        hint.innerText = 'Not one letter is different.';
        hint.classList.remove('hidden');
    }

    // WORD CORRECT
    else if (currentGuess === 'sex') {
        colorLastRow(currentGuess);
    }
    // WORD ALLOWED
    else {
        colorLastRow(currentGuess);
        score += 1;
        addRow(document.getElementById('board'));
        lastWord = currentGuess;
        currentGuess = '';
    }
}

/* ======================================
 DATE
 ======================================== */


const START_DATE = new Date('2026-07-20'); // pick whatever day #1 should be

function getPuzzleNumber() {
    const today = new Date();
    // zero out time components so partial days don't cause off-by-one issues
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const startUTC = Date.UTC(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = Math.floor((todayUTC - startUTC) / msPerDay);

    return daysElapsed + 1; // day 0 = puzzle #1
}

function displayPuzzleNumber() {
    const subheader = document.querySelector('.subheader');
    subheader.textContent = `#${getPuzzleNumber()}`;
}



/* ======================================
 INIT
 ======================================== */
async function init() {
    hint = document.getElementById('hint');

    await loadWords();
    pickDailyWord(wordList);
    displayPuzzleNumber();
    initInput();
}

function initInput() {
    document.addEventListener('keydown', (e) => {
        handleKey(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    });

    document.querySelectorAll('.Key[data-key]').forEach(keyEl => {
        keyEl.addEventListener('click', () => handleKey(keyEl.dataset.key));
    });
}

document.addEventListener('DOMContentLoaded', init);















/* ======================================
 HELPERS
 ======================================== */

function colorLastRow(guess) {
    const target = ['s', 'e', 'x'];
    const rows = document.getElementsByClassName('Row');
    const row = rows[score + 1]; // the row currentGuess was just typed into
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
        if (wordA[i] !== wordB[i]) {
            diffCount++;
        }
    }

    return diffCount;
}