/**
 * 6×6 数独の生成・検証
 * 2×3のブロック、1-6の数字
 */

export function generatePuzzle(): { puzzle: number[][]; solution: number[][] } {
  const solution = solveFullGrid();
  if (!solution) throw new Error("Failed to generate sudoku");
  const puzzle = removeCells([...solution.map((r) => [...r])], 20);
  return { puzzle, solution };
}

function solveFullGrid(): number[][] | null {
  const grid = Array(6)
    .fill(null)
    .map(() => Array(6).fill(0));
  return backtrack(grid, 0, 0) ? grid : null;
}

function backtrack(grid: number[][], row: number, col: number): boolean {
  if (row >= 6) return true;
  const [nextRow, nextCol] = col >= 5 ? [row + 1, 0] : [row, col + 1];
  if (grid[row][col] !== 0) return backtrack(grid, nextRow, nextCol);
  const nums = [1, 2, 3, 4, 5, 6];
  shuffle(nums);
  for (const n of nums) {
    if (isValid(grid, row, col, n)) {
      grid[row][col] = n;
      if (backtrack(grid, nextRow, nextCol)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  for (let i = 0; i < 6; i++) if (grid[row][i] === num) return false;
  for (let i = 0; i < 6; i++) if (grid[i][col] === num) return false;
  const br = Math.floor(row / 2) * 2;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 2; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c] === num) return false;
  return true;
}

function removeCells(grid: number[][], count: number): number[][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) cells.push([r, c]);
  shuffle(cells);
  for (let i = 0; i < Math.min(count, cells.length); i++) {
    const [r, c] = cells[i];
    grid[r][c] = 0;
  }
  return grid;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function validateSolution(puzzle: number[][], userGrid: number[][]): boolean {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (puzzle[r][c] !== 0 && userGrid[r][c] !== puzzle[r][c]) return false;
      const n = userGrid[r][c];
      if (n < 1 || n > 6) return false;
    }
  }
  for (let r = 0; r < 6; r++) {
    const set = new Set<number>();
    for (let c = 0; c < 6; c++) {
      if (set.has(userGrid[r][c])) return false;
      set.add(userGrid[r][c]);
    }
  }
  for (let c = 0; c < 6; c++) {
    const set = new Set<number>();
    for (let r = 0; r < 6; r++) {
      if (set.has(userGrid[r][c])) return false;
      set.add(userGrid[r][c]);
    }
  }
  for (let br = 0; br < 6; br += 2) {
    for (let bc = 0; bc < 6; bc += 3) {
      const set = new Set<number>();
      for (let r = br; r < br + 2; r++) {
        for (let c = bc; c < bc + 3; c++) {
          if (set.has(userGrid[r][c])) return false;
          set.add(userGrid[r][c]);
        }
      }
    }
  }
  return true;
}
