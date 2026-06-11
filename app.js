const screens = Array.from(document.querySelectorAll(".screen"));
const steps = Array.from(document.querySelectorAll(".step"));
const storageKey = "worldcup-score-bets-v1";

const state = {
  step: 0,
  name: "",
  korea: 0,
  czech: 0,
  choice: "",
};

const playerName = document.querySelector("#playerName");
const koreaScore = document.querySelector("#koreaScore");
const czechScore = document.querySelector("#czechScore");
const nameMessage = document.querySelector("#nameMessage");
const scoreMessage = document.querySelector("#scoreMessage");
const choiceMessage = document.querySelector("#choiceMessage");
const submitBet = document.querySelector("#submitBet");
const newBet = document.querySelector("#newBet");
const betRows = document.querySelector("#betRows");
const emptyState = document.querySelector("#emptyState");
const totalCount = document.querySelector("#totalCount");
const underCount = document.querySelector("#underCount");
const overCount = document.querySelector("#overCount");

function getBets() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveBets(bets) {
  localStorage.setItem(storageKey, JSON.stringify(bets));
}

function showStep(index) {
  state.step = Math.max(0, Math.min(index, screens.length - 1));
  screens.forEach((screen, screenIndex) => {
    screen.classList.toggle("is-visible", screenIndex === state.step);
  });
  steps.forEach((step, stepIndex) => {
    step.classList.toggle("is-active", stepIndex === state.step);
  });

  if (state.step === 4) {
    renderBets();
  }
}

function validateName() {
  const value = playerName.value.trim();
  if (!value) {
    nameMessage.textContent = "참여자 이름을 입력해 주세요.";
    playerName.focus();
    return false;
  }
  state.name = value;
  nameMessage.textContent = "";
  return true;
}

function readScore(input) {
  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 0 || value > 20) {
    return null;
  }
  return value;
}

function validateScore() {
  const korea = readScore(koreaScore);
  const czech = readScore(czechScore);
  if (korea === null || czech === null) {
    scoreMessage.textContent = "0점부터 20점 사이의 숫자로 입력해 주세요.";
    return false;
  }
  state.korea = korea;
  state.czech = czech;
  scoreMessage.textContent = "";
  return true;
}

function validateChoice() {
  if (!state.choice) {
    choiceMessage.textContent = "UNDER 또는 OVER 중 하나를 선택해 주세요.";
    return false;
  }
  choiceMessage.textContent = "";
  return true;
}

function canLeaveCurrentStep() {
  if (state.step === 1) return validateName();
  if (state.step === 2) return validateScore();
  if (state.step === 3) return validateChoice();
  return true;
}

function submitCurrentBet() {
  if (!validateName() || !validateScore() || !validateChoice()) return;

  const bets = getBets();
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: state.name,
    korea: state.korea,
    czech: state.czech,
    choice: state.choice,
    createdAt: new Date().toISOString(),
  };

  saveBets([entry, ...bets]);
  showStep(4);
}

function formatTime(isoDate) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}

function renderBets() {
  const bets = getBets();
  betRows.innerHTML = "";
  emptyState.classList.toggle("is-visible", bets.length === 0);
  totalCount.textContent = `${bets.length}명`;
  underCount.textContent = bets.filter((bet) => bet.choice === "UNDER").length;
  overCount.textContent = bets.filter((bet) => bet.choice === "OVER").length;

  bets.forEach((bet, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(bet.name)}</td>
      <td><span class="score-pill">${bet.korea} : ${bet.czech}</span></td>
      <td><span class="choice-pill" data-kind="${bet.choice}">${bet.choice}</span></td>
      <td>${formatTime(bet.createdAt)}</td>
    `;
    betRows.append(row);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => {
    if (canLeaveCurrentStep()) showStep(state.step + 1);
  });
});

document.querySelectorAll("[data-prev]").forEach((button) => {
  button.addEventListener("click", () => showStep(state.step - 1));
});

steps.forEach((step) => {
  step.addEventListener("click", () => {
    const requestedStep = Number(step.dataset.jump);
    if (requestedStep <= state.step || canLeaveCurrentStep()) {
      showStep(requestedStep);
    }
  });
});

document.querySelectorAll("[data-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    state.choice = button.dataset.choice;
    document.querySelectorAll("[data-choice]").forEach((choiceButton) => {
      choiceButton.classList.toggle("is-selected", choiceButton === button);
    });
    choiceMessage.textContent = "";
  });
});

submitBet.addEventListener("click", submitCurrentBet);

newBet.addEventListener("click", () => {
  state.name = "";
  state.korea = 0;
  state.czech = 0;
  state.choice = "";
  playerName.value = "";
  koreaScore.value = "0";
  czechScore.value = "0";
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.classList.remove("is-selected");
  });
  showStep(0);
});

showStep(0);
