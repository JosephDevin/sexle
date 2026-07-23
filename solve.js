function solveSexle(wordList, startWord, targetWord = 'sex') {
    const words = new Set(wordList);
    words.add(startWord);
    words.add(targetWord);

    if (!words.has(startWord)) return null; // start must be a valid word

    const queue = [startWord];
    const visited = new Set([startWord]);
    const parent = new Map();

    while (queue.length > 0) {
        const current = queue.shift();

        if (current === targetWord) {
            // Reconstruct path
            const path = [current];
            let node = current;
            while (parent.has(node)) {
                node = parent.get(node);
                path.unshift(node);
            }
            return path;
        }

        for (const next of neighbors(current, words)) {
            if (!visited.has(next)) {
                visited.add(next);
                parent.set(next, current);
                queue.push(next);
            }
        }
    }

    return null; // no path exists
}

// Finds all words in the dictionary exactly 1 letter different from `word`
function neighbors(word, words) {
    const result = [];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < word.length; i++) {
        for (const c of alphabet) {
            if (c === word[i]) continue;
            const candidate = word.slice(0, i) + c + word.slice(i + 1);
            if (words.has(candidate)) {
                result.push(candidate);
            }
        }
    }

    return result;
}