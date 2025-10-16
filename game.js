
let pyodideReady = false;
let pyodide = null;
const gridSize = 5;
const cellSize = 60;
const gap = 8;
let state = { x: 0, y: 0, goal: [4, 4], path: [[0, 0]], status: "ready" };

const playerEl = document.getElementById("player");
const gridEl = document.getElementById("grid");

// --- Build the grid dynamically ---
for (let i = 0; i < gridSize * gridSize; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  if (i === gridSize * 4 + 4) cell.classList.add("goal");
  gridEl.appendChild(cell);
}

// --- Position Helper ---
function cellToPosition(x, y) {
  return {
    px: x * (cellSize + gap),
    py: y * (cellSize + gap)
  };
}

function renderPlayerInstant() {
  const { px, py } = cellToPosition(state.x, state.y);
  playerEl.style.transform = `translate(${px}px, ${py}px)`;
}

function updateStatus() {
  document.getElementById("status").innerText = "Status: " + state.status;
}

async function animatePath(path) {
  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i];
    const { px, py } = cellToPosition(x, y);
    await new Promise(r => setTimeout(r, 250));
    playerEl.style.transform = `translate(${px}px, ${py}px)`;
  }
}

function showStatus(message) {
  document.getElementById("status-text").innerText = message;
  document.getElementById("status-overlay").classList.add("show");
}

function hideStatus() {
  document.getElementById("status-overlay").classList.remove("show");
}

async function loadPyodideAndPackages() {
  pyodide = await loadPyodide();
  pyodideReady = true;
  console.log("✅ Pyodide loaded");
  renderPlayerInstant();
}

async function runPython() {
  if (!pyodideReady) return alert("Pyodide not loaded yet!");
  const userCode = document.getElementById("editor").value;

  const pythonSetup = `
class GameWorld:
    def __init__(self, size=5):
        self.size = size
        self.x = 0
        self.y = 0
        self.goal = (4, 4)
        self.status = "running"
        self.path = [(self.x, self.y)]

    def move_up(self):
        if self.status != "running":
            return
        if self.y > 0:
            self.y -= 1
            self._update()
        else:
            self.status = "crash"

    def move_down(self):
        if self.status != "running":
            return
        if self.y < self.size - 1:
            self.y += 1
            self._update()
        else:
            self.status = "crash"

    def move_left(self):
        if self.status != "running":
            return
        if self.x > 0:
            self.x -= 1
            self._update()
        else:
            self.status = "crash"

    def move_right(self):
        if self.status != "running":
            return
        if self.x < self.size - 1:
            self.x += 1
            self._update()
        else:
            self.status = "crash"

    def _update(self):
        self.path.append((self.x, self.y))
        if (self.x, self.y) == self.goal:
            self.status = "win"

    def get_state(self):
        return {"x": self.x, "y": self.y, "goal": self.goal, "path": self.path, "status": self.status}

gw = GameWorld()
move_up = gw.move_up
move_down = gw.move_down
move_left = gw.move_left
move_right = gw.move_right

try:
${userCode.split("\n").map(line => "    " + line).join("\n")}
except Exception as e:
    gw.status = "error: " + str(e)

import json
json.dumps(gw.get_state())
`;

  try {
    const result = await pyodide.runPythonAsync(pythonSetup);
    const gameState = JSON.parse(result);
    state = gameState;

    await animatePath(state.path);

    if (state.status === "win") {
      showStatus("You Win! 🎉");
    } else if (state.status === "crash") {
      showStatus("You hit a wall! 💥");
    } else if (state.status.startsWith("error")) {
      showStatus("Error: " + state.status.replace("error: ", ""));
    } else {
      if (state.x !== state.goal[0] || state.y !== state.goal[1]) {
        showStatus("You failed! Please try again. ❌");
      }
    }
  } catch (err) {
    showStatus("Python Error: " + err);
  }
}

document.getElementById("run-btn").addEventListener("click", runPython);
document.getElementById("close-status").addEventListener("click", hideStatus);
loadPyodideAndPackages();
