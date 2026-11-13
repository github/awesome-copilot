export const DIRECTIONS = ["left", "right", "up", "down"];

function traceLine(line) {
    const values = line.flatMap((value, from) => value ? [{ value, from }] : []);
    const merged = [];
    const movements = [];
    const merges = [];
    let score = 0;
    for (let i = 0; i < values.length; i++) {
        const to = merged.length;
        movements.push({ from: values[i].from, to, value: values[i].value });
        if (values[i].value === values[i + 1]?.value) {
            const value = values[i].value * 2;
            movements.push({ from: values[i + 1].from, to, value: values[i + 1].value });
            merges.push(to);
            merged.push(value);
            score += value;
            i++;
        } else {
            merged.push(values[i].value);
        }
    }
    return { line: merged.concat(Array(4 - merged.length).fill(0)), score, movements, merges };
}

export function mergeLine(line) {
    const { line: merged, score } = traceLine(line);
    return { line: merged, score };
}

export function slide(board, direction) {
    if (!DIRECTIONS.includes(direction)) throw new Error("Invalid direction.");
    const next = [...board];
    const movements = [];
    const merges = [];
    let score = 0;
    for (let row = 0; row < 4; row++) {
        const indices = Array.from({ length: 4 }, (_, column) => {
            if (direction === "left") return row * 4 + column;
            if (direction === "right") return row * 4 + 3 - column;
            if (direction === "up") return column * 4 + row;
            return (3 - column) * 4 + row;
        });
        const result = traceLine(indices.map(index => board[index]));
        indices.forEach((index, column) => { next[index] = result.line[column]; });
        movements.push(...result.movements.map(tile => ({
            ...tile, from: indices[tile.from], to: indices[tile.to],
        })));
        merges.push(...result.merges.map(column => indices[column]));
        score += result.score;
    }
    return { board: next, score, changed: next.some((value, index) => value !== board[index]), movements, merges };
}

function spawn(board, random) {
    const empty = board.flatMap((value, index) => value === 0 ? [index] : []);
    if (empty.length === 0) return { board: [...board], index: null };
    const next = [...board];
    const index = empty[Math.floor(random() * empty.length)];
    next[index] = random() < 0.9 ? 2 : 4;
    return { board: next, index };
}

export function newGame(best = 0, random = Math.random) {
    const first = spawn(Array(16).fill(0), random);
    return {
        version: 1,
        board: spawn(first.board, random).board,
        spawnedIndex: null,
        score: 0,
        best,
        moves: 0,
        previous: null,
    };
}

export function isGameOver(board) {
    return !DIRECTIONS.some(direction => slide(board, direction).changed);
}

export function move(state, direction, random = Math.random) {
    const result = slide(state.board, direction);
    if (!result.changed) return state;
    const score = state.score + result.score;
    const spawned = spawn(result.board, random);
    return {
        ...state,
        board: spawned.board,
        spawnedIndex: spawned.index,
        score,
        best: Math.max(state.best, score),
        moves: state.moves + 1,
        previous: { board: [...state.board], score: state.score, moves: state.moves },
    };
}

export function undo(state) {
    if (!state.previous) return state;
    return { ...state, ...state.previous, spawnedIndex: null, previous: null };
}

function validSnapshot(value) {
    return value !== null && typeof value === "object"
        && Array.isArray(value.board) && value.board.length === 16
        && value.board.every(tile => Number.isSafeInteger(tile) && tile >= 0
            && (tile === 0 || (tile >= 2 && Number.isInteger(Math.log2(tile)))))
        && Number.isSafeInteger(value.score) && value.score >= 0
        && Number.isSafeInteger(value.moves) && value.moves >= 0;
}

export function validateSave(value) {
    if (!validSnapshot(value) || value.version !== 1
        || !Number.isSafeInteger(value.best) || value.best < value.score
        || !(value.spawnedIndex === undefined || value.spawnedIndex === null
            || (Number.isInteger(value.spawnedIndex) && value.spawnedIndex >= 0
                && value.spawnedIndex < 16 && [2, 4].includes(value.board[value.spawnedIndex])))
        || !(value.previous === null || validSnapshot(value.previous))) {
        throw new Error("Invalid 2048 save. Back up or rename the file before trying again.");
    }
    return value;
}

export function viewState(state) {
    return {
        board: state.board,
        score: state.score,
        best: state.best,
        moves: state.moves,
        spawnedIndex: state.spawnedIndex ?? null,
        canUndo: state.previous !== null,
        won: state.board.some(value => value >= 2048),
        gameOver: isGameOver(state.board),
    };
}
