const screens = Array.from(document.querySelectorAll(".screen"));
const steps = Array.from(document.querySelectorAll(".step"));
const storageKey = "worldcup-score-bets-v1";

// Apps Script web app URL goes here after deployment.
const API_URL = "https://script.google.com/macros/s/AKfycbzC2Ph6_s4IOySbeLLWI2Y-x4ZJHmzfReFYR2nrh8kpfRKAfsTXXIUsKLmPrqfzQr9Z/exec";

const state = {
  step: 0,
  name: "",
  korea: 0,
  czech: 0,
  choice: "",
  duplicateNotice: "",
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
const syncMessage = document.querySelector("#syncMessage");

async function apiRequest(payload) {
  if (!API_URL) return null;
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "요청에 실패했습니다.");
  return data;
}

function getLocalBets() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveLocalBets(bets) {
  localStorage.setItem(storageKey, JSON.stringify(bets));
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function findExistingBetByName(name) {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  const bets = await loadBets();
  return bets.find((bet) => normalizeName(bet.name) === normalized) || null;
}

function showDuplicateNotice(name) {
  state.duplicateNotice = `${name}님은 이미 참여했습니다. 결과 페이지만 보여드릴게요.`;
  window.alert(state.duplicateNotice);
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

async function canLeaveCurrentStep() {
  if (state.step === 1) {
    if (!validateName()) return false;
    try {
      const existing = await findExistingBetByName(state.name);
      if (existing) {
        showDuplicateNotice(state.name);
        showStep(4);
        return false;
      }
    } catch (error) {
      nameMessage.textContent = `참여 여부 확인 실패: ${error.message}`;
      return false;
    }
    return true;
  }
  if (state.step === 2) return validateScore();
  if (state.step === 3) return validateChoice();
  return true;
}

async function submitCurrentBet() {
  if (!validateName() || !validateScore() || !validateChoice()) return;

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: state.name,
    korea: state.korea,
    czech: state.czech,
    choice: state.choice,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  submitBet.disabled = true;
  submitBet.textContent = "기록 중...";
  try {
    const existing = await findExistingBetByName(state.name);
    if (existing) {
      showDuplicateNotice(state.name);
      showStep(4);
      return;
    }

    if (API_URL) {
      await apiRequest({ action: "append", entry });
    } else {
      saveLocalBets([entry, ...getLocalBets()]);
    }
    showStep(4);
  } catch (error) {
    choiceMessage.textContent = `기록 실패: ${error.message}`;
  } finally {
    submitBet.disabled = false;
    submitBet.textContent = "베팅 완료";
  }
}

function formatTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

async function loadBets() {
  if (!API_URL) return getLocalBets();
  const data = await apiRequest({ action: "list" });
  return data.rows || [];
}

async function renderBets() {
  let bets = [];
  syncMessage.textContent = API_URL
    ? "Google Sheet에서 최신 배팅 현황을 불러오는 중입니다."
    : "Apps Script API URL이 연결되면 모든 참여자의 현황이 함께 표시됩니다.";

  try {
    bets = await loadBets();
    if (API_URL) syncMessage.textContent = "Google Sheet와 동기화되었습니다.";
  } catch (error) {
    bets = getLocalBets();
    syncMessage.textContent = `시트 동기화 실패: ${error.message}`;
  }

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
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (await canLeaveCurrentStep()) showStep(state.step + 1);
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelectorAll("[data-prev]").forEach((button) => {
  button.addEventListener("click", () => showStep(state.step - 1));
});

steps.forEach((step) => {
  step.addEventListener("click", async () => {
    const requestedStep = Number(step.dataset.jump);
    if (requestedStep <= state.step || (await canLeaveCurrentStep())) {
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
