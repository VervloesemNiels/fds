A1lib.identifyApp("appconfig.json");

// -------------------------
// Variables
// -------------------------

// Alt1 stuff
let reader = new Chatbox.default();
const appColor = A1lib.mixColor(255, 199, 0);
const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;
let chatInterval = null;

// Timer
let isRunning = false;
let startTime = 0;
let pausedTime = 0;
let timerInterval = null;
let displayInterval = null;

// Counters
let normalPP = 0;
let fastboiPP = 0;
let camoPP = 0;
let failedPP = 0;

// Save snapshot storage
let saveSnapshot = null;

// Save key
const SAVE_KEY = "ppTrackerSave";

// Settings
let setting_autoStart = false;
let setting_stickyFingers = true;

// icons
let currentNPC = "";
const npcData = {
    "menaphos market guard": {
        icon: "https://runescape.wiki/images/Menaphos_market_guard_icon.png?bcb77",
        drops: [
            { key: "hard",  label: "hard clues",   rate: 6 / 1000 },
            { key: "elite", label: "elite clues",  rate: 5 / 1000 }
        ]
    },

    "archaeology professor": {
        icon: "https://runescape.wiki/images/Archaeology_professor_icon.png?dae9b",
        drops: [
            { key: "tetra", label: "tetra pieces",      rate: 1 / 1000 },
            { key: "arch",  label: "arch boost items", rate: 2 / 1000 },
            { key: "artefact",  label: "artefacts", rate: 1 / 1000 },
            
        ]
    },

    "h.a.m. female follower": {
        icon: "https://runescape.wiki/images/H.A.M._Member_%28female%29_icon.png?31b9d",
        drops: [
            { key: "easy", label: "easy clues", rate: 1 / 100 }
        ]
    },

    "default": {
        icon: "https://runescape.wiki/images/Irksol_chathead.png?68578",
        drops: [] // nothing interesting
    }
};


// -------------------------
// UI Buttons
// -------------------------

document.getElementById("startBtn").addEventListener("click", startTimer);
document.getElementById("stopBtn").addEventListener("click", stopTimer);
document.getElementById("resetBtn").addEventListener("click", resetTimer);
document.getElementById("saveBtn").addEventListener("click", () => {
    let elapsed = isRunning ? performance.now() - startTime : pausedTime;
    const wait = msUntilNextTick(elapsed);

    setTimeout(() => {
        saveSnapshot = getCurrentSessionData();

        let alignedElapsed = saveSnapshot.elapsed;
        let elapsedSec = alignedElapsed / 1000;
        let elapsedHours = elapsedSec / 3600;

        let totalPP = saveSnapshot.normalPP + saveSnapshot.camoPP + saveSnapshot.fastboiPP;
        let normalPPPerHour = elapsedHours > 0 ? saveSnapshot.normalPP / elapsedHours : 0;
        let efficiency = (normalPPPerHour / 3000) * 100;

        const preview = document.getElementById("saveDataPreview");
        preview.innerHTML = `
            <div style="color:#ffcc00; margin-bottom:8px;">
                <i>Data is saved on the <b>next game tick</b> (0.6s), not the exact click moment. These values will be saved:</i>
            </div>
            <div><b>Normal PP:</b> ${saveSnapshot.normalPP}</div>
            <div><b>Fastboi PP:</b> ${saveSnapshot.fastboiPP}</div>
            <div><b>Camo PP:</b> ${saveSnapshot.camoPP}</div>
            <div><b>Failed PP:</b> ${saveSnapshot.failedPP}</div>
            <br>
            <div><b>Seconds Elapsed:</b> ${elapsedSec.toFixed(1)}</div>
            <div><b>Efficiency:</b> ${efficiency.toFixed(2)}%</div>
        `;

        document.getElementById("confirmSavePopup").style.display = "block";
    }, wait);
});

document.getElementById("confirmSaveYes").addEventListener("click", () => {
    if (!saveSnapshot) return;

    saveState(saveSnapshot);
    saveSnapshot = null;

    document.getElementById("confirmSavePopup").style.display = "none";
    loadState();
});

document.getElementById("confirmSaveNo").addEventListener("click", () => {
    saveSnapshot = null;
    document.getElementById("confirmSavePopup").style.display = "none";
});

document.getElementById("openSessionPopup").addEventListener("click", () => {
    buildSessionList();
    document.getElementById("sessionPopup").style.display = "flex";
});

document.getElementById("closeSessionPopup").addEventListener("click", () => {
    document.getElementById("sessionPopup").style.display = "none";
});

// -------------------------
// Alt1 chatbox setup
// -------------------------

window.setTimeout(() => {
    reader.readargs = {
        colors: [
            A1lib.mixColor(255, 255, 255),
            A1lib.mixColor(0, 255, 0),
            A1lib.mixColor(30, 255, 0),
            A1lib.mixColor(30, 255, 0)
        ],
        backwards: true,
    };

    $(".nis").append("<span>Searching for chatboxes</span>");
    $(".nis").append("<div>If this is showing long, chatbox reading might not work.</div>");
    reader.find();

    const findChat = setInterval(() => {
        if (reader.pos === null) reader.find();
        else {
            $(".nis span:contains('Searching for chatboxes')").remove();
            $(".nis div:contains('chatbox reading might not work')").remove();
            clearInterval(findChat);
            reader.pos.mainbox = reader.pos.boxes[0];
            showSelectedChat(reader.pos);

            chatInterval = setInterval(() => {
                readChatbox();
            }, 50);
        }
    }, 1000);
}, 0);

function showSelectedChat(chat) {
    try {
        alt1.overLayRect(
            appColor,
            chat.mainbox.rect.x,
            chat.mainbox.rect.y,
            chat.mainbox.rect.width,
            chat.mainbox.rect.height,
            2000,
            5
        );
    } catch {}
}

// -------------------------
// Chatbox parsing
// -------------------------

function readChatbox() {
    const opts = reader.read() || [];
    let chatStr = "";
    let chatArr;

    if (opts.length) {
        for (let line in opts) {
            if (!opts[line].text.match(timestampRegex) && line == "0") continue;
            if (opts[line].text.match(timestampRegex)) {
                if (line > 0) chatStr += "\n";
                chatStr += opts[line].text + " ";
                continue;
            }
            chatStr += opts[line].text;
        }
    }

    if (chatStr.trim()) chatArr = chatStr.trim().split("\n");

    if (chatArr) {
        for (let line of chatArr) {
            const chatLine = line.trim();
            if (chatLine && !isInHistory(chatLine)) {
                checkLine(chatLine);
            }
        }
        updateChatHistory(chatArr);
    }
}

function isInHistory(chatLine) {
    if (!sessionStorage.chatHistory) return false;
    return sessionStorage.chatHistory.split("\n").includes(chatLine);
}

function updateChatHistory(chatArr) {
    if (!sessionStorage.chatHistory) {
        sessionStorage.chatHistory = chatArr.join("\n");
        return;
    }
    let history = sessionStorage.chatHistory.split("\n");
    while (history.length > 100) history.shift();
    chatArr.forEach(line => history.push(line.trim()));
    sessionStorage.chatHistory = history.join("\n");
}

// -------------------------
// Timer logic
// -------------------------

function startTimer() {
    if (isRunning) return;
    isRunning = true;

    startTime = performance.now() - pausedTime;

    timerInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        updateTimerDisplay(elapsed);
    }, 50);

    startDisplayLoop()

}

function startDisplayLoop() {
    function tick() {
        if (!isRunning) return;

        updateDisplay();

        const elapsed = performance.now() - startTime;
        const nextDelay = msUntilNextTick(elapsed);

        displayInterval = setTimeout(tick, nextDelay);
    }

    const elapsed = performance.now() - startTime;
    const firstDelay = msUntilNextTick(elapsed);

    displayInterval = setTimeout(tick, 600);
}


function stopTimer() {
    if (!isRunning) return;

    isRunning = false;

    clearInterval(timerInterval);
    timerInterval = null;

    let rawElapsed = performance.now() - startTime;
    let wait = msUntilNextTick(rawElapsed);
    pausedTime = rawElapsed + wait;

    updateTimerDisplay(pausedTime);
    updateDisplay();

    if (displayInterval) {
        clearTimeout(displayInterval);
        displayInterval = null;
    }
}

function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);

    isRunning = false;
    startTime = 0;
    pausedTime = 0;

    normalPP = 0;
    fastboiPP = 0;
    camoPP = 0;
    failedPP = 0;

    updateTimerDisplay(0);
    updateDisplay();

    if (displayInterval) {
        clearInterval(displayInterval);
        displayInterval = null;
    }
}

// -------------------------
// Chat line interpretation
// -------------------------

function checkLine(line) {
    if (isRunning) {
        // TODO: Add triple/quad loot procs
        if (line.includes("Your camouflage outfit keeps you hidden")) camoPP++;
        if (line.includes("Your lightning-fast reactions")) {
            fastboiPP++;
            normalPP++;
        }
        if (line.includes("You pick the")) normalPP++, updateDisplay();
        if (line.includes("You fail to pick")) failedPP++;

        let npcMatch = line.match(/You (?:pick|fail to pick) the (.+?)['’]s pocket/);
        
        if (npcMatch) {
            console.log(line)
            
            currentNPC = npcMatch[1].toLowerCase().trim();
            console.log(currentNPC)
            updateNpcIcons(currentNPC);

        }
    } else {
        if (setting_autoStart && line.includes("You pick the")) {
            /*if(pausedTime > 0){
                normalPP++
            }*/
            startTimer();
        }
    }
}


// -------------------------
// GUI update
// -------------------------

function updateDisplay() {
    let elapsed = isRunning ? performance.now() - startTime : pausedTime;
    //let elapsedHours = elapsed / 1000 / 3600;

    
    let completedTicks = Math.floor(elapsed / 600);
    let elapsedHours = (completedTicks * 600) / 1000 / 3600;
    

    totalPP = normalPP + camoPP + fastboiPP;
    let safeNormal = normalPP > 0 ? normalPP : 1;

    normalPPPerHour = elapsedHours > 0 ? (normalPP / elapsedHours) : 0;
    camoPPPerHour   = elapsedHours > 0 ? (camoPP / elapsedHours) : 0;
    fastboiPPPerHour= elapsedHours > 0 ? (fastboiPP/ elapsedHours) : 0;
    totalPPPerhour  = elapsedHours > 0 ? (totalPP / elapsedHours) : 0;

    normalMaxPPPerhour = setting_stickyFingers ? 3000 : 2000;

    camoPPBonus = (camoPP / safeNormal) * normalMaxPPPerhour;
    fastBonus   = (fastboiPP / safeNormal) * normalMaxPPPerhour;
    totalPPMax  = normalMaxPPPerhour + camoPPBonus + fastBonus;

    normalPPPercent = ((totalPP - failedPP) / totalPP) * 100;
    camoPPPercent   = (camoPP / safeNormal) * 100;
    fastboiPPpercent= (fastboiPP / safeNormal) * 100;
    totalPPPercent  = normalPPPercent + camoPPPercent + fastboiPPpercent;

    efficiencyPercent = (normalPPPerHour / normalMaxPPPerhour) * 100

    /*
    const ticksPerAction = 2;
    const completedActionSlots = Math.floor(completedTicks / ticksPerAction);

    if (completedActionSlots === 0) {
        efficiencyPercent = 100;
    } else {
        efficiencyPercent = (normalPP / completedActionSlots) * 100;
    }

    if (efficiencyPercent > 100) efficiencyPercent = 100;
    */



    lostPickpockets = totalPPMax - totalPPPerhour;

    const npc = npcData[currentNPC] || npcData["default"];
    const drops = npc.drops;

    const results = drops.map(d => ({
    label: d.label,
    gained: totalPP * d.rate,
    hourly: totalPPPerhour * d.rate,
    lost: lostPickpockets * d.rate
    }));

    let lines = [];

    if (results.length === 0) {
        lines.push("This NPC has no notable tracked drops… or the developer was too lazy to add them.");
    } else {
        lines.push(
            `You <b>should have gained</b> ${
                results.map(r => `<b>${r.gained.toFixed(2)}</b> ${r.label}`).join(" and ")
            } by now.`
        );

        lines.push(
            `Your <b>current hourly rate</b> is ${
                results.map(r => `<b>${r.hourly.toFixed(2)}</b> ${r.label}`).join(" and ")
            }.`
        );

        lines.push(
            `You <b>missed</b> ${
                results.map(r => `<b>${r.lost.toFixed(2)}</b> ${r.label}`).join(" and ")
            } due to <b>${lostPickpockets.toFixed(0)}</b> lost pickpockets.`
        );
    }

    document.getElementById("efficienyText").innerHTML =
        lines.map(l => `<div style="margin-bottom:4px;">${l}</div>`).join("");

    // Update GUI elements
    document.getElementById("normalCount").textContent = normalPP;
    document.getElementById("camoCount").textContent = camoPP;
    document.getElementById("fastCount").textContent = fastboiPP;
    document.getElementById("failedCount").textContent = failedPP;
    document.getElementById("totalCount").textContent  = totalPP;

    document.getElementById("pphNormalActual").textContent = normalPPPerHour.toFixed(0);
    document.getElementById("pphNormalMax").textContent = normalMaxPPPerhour.toFixed(0);
    document.getElementById("pphNormalPer").textContent = normalPPPercent.toFixed(2);

    document.getElementById("pphCamoActual").textContent = camoPPPerHour.toFixed(0);
    document.getElementById("pphCamoMax").textContent = camoPPBonus.toFixed(0);
    document.getElementById("pphCamoPer").textContent = camoPPPercent.toFixed(2);

    document.getElementById("pphAgilityActual").textContent = fastboiPPPerHour.toFixed(0);
    document.getElementById("pphAgilityMax").textContent = fastBonus.toFixed(0);
    document.getElementById("pphAgilityPer").textContent = fastboiPPpercent.toFixed(2);

    document.getElementById("pphTotalActual").textContent = totalPPPerhour.toFixed(0);
    document.getElementById("pphTotalMax").textContent = totalPPMax.toFixed(0);
    document.getElementById("pphTotalPer").textContent = totalPPPercent.toFixed(2);

    document.getElementById("efficiencyPercent").textContent = efficiencyPercent.toFixed(2) + '%';
    document.getElementById("efficiencyBar").style.width = efficiencyPercent + '%';


}

function updateNpcIcons(npcName) {
    const data = npcData[npcName] || npcData["default"];

    document.querySelectorAll(".npcIcon").forEach(el => {
        el.src = data.icon;
    });
}

// load sessions
function buildSessionList() {
    let raw = localStorage.getItem(SAVE_KEY);
    let saves;

    try {
        saves = JSON.parse(raw);
        if (!Array.isArray(saves)) saves = [];
    } catch {
        saves = [];
    }

    const list = document.getElementById("sessionList");
    list.innerHTML = "";

    if (saves.length === 0) {
        list.innerHTML = "<i>No saved sessions.</i>";
        return;
    }

    saves.forEach((s, index) => {
        const date = new Date(s.timestamp).toLocaleString();
        const totalPP = s.normalPP + s.fastboiPP + s.camoPP;

        let div = document.createElement("div");
        div.style.marginBottom = "10px";
        div.style.padding = "8px";
        div.style.borderBottom = "1px solid #555";

        div.innerHTML = `
            <b>Session ${index + 1}</b> <span style="opacity:0.7;">(${date})</span><br>
            Total PP: ${totalPP}<br>
            Time: ${(s.elapsed / 1000).toFixed(1)}s<br>

            <button class="loadBtn" data-index="${index}"
                style="margin-top:5px; margin-right:6px;
                background:#4CAF50; color:white; padding:4px 8px; border:0; border-radius:4px;">
                Load
            </button>

            <button class="deleteBtn" data-index="${index}"
                style="background:#b33131; color:white; padding:4px 8px; border:0; border-radius:4px;">
                Delete
            </button>
        `;

        list.appendChild(div);
    });

    // Add event listeners for all load buttons
    document.querySelectorAll(".loadBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const index = Number(btn.dataset.index);
            loadSessionFromIndex(index);
            document.getElementById("sessionPopup").style.display = "none";
        });
    });

    // Add event listeners for all delete buttons
    document.querySelectorAll(".deleteBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const index = Number(btn.dataset.index);
            deleteSession(index);
            buildSessionList(); // refresh list
        });
    });
}

function loadSessionFromIndex(i) {
    let saves = JSON.parse(localStorage.getItem(SAVE_KEY)) || [];
    if (!saves[i]) return;

    loadSessionIntoTracker(saves[i]);
}

function deleteSession(i) {
    let saves = JSON.parse(localStorage.getItem(SAVE_KEY)) || [];
    saves.splice(i, 1);
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
}

// Timer
function updateTimerDisplay(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    let milliseconds = Math.round(ms % 1000);

    const formatted =
        String(hours).padStart(2, '0') + ":" +
        String(minutes).padStart(2, '0') + ":" +
        String(seconds).padStart(2, '0') + "." +
        String(milliseconds).padStart(3, '0');

    document.getElementById("timer").textContent = formatted;
}

// -------------------------
// Helpers functions
// -------------------------

function msUntilNextTick(elapsed) {
    const tick = 600; // RuneScape tick = 0.6 seconds
    const remainder = elapsed % tick;
    return remainder === 0 ? 0 : (tick - remainder);
}

// -------------------------
// Settings
// -------------------------

document.getElementById("autoStartCheckbox").addEventListener("change", e => {
    setting_autoStart = e.target.checked;
    saveSettings();
});

document.getElementById("stickyFingersCheckbox").addEventListener("change", e => {
    setting_stickyFingers = e.target.checked;
    saveSettings();
    updateDisplay(); // recalc PP/H immediately
});

function loadSettings() {
    const raw = localStorage.getItem("ppTrackerSettings");
    if (raw) {
        try {
            const data = JSON.parse(raw);
            setting_autoStart = !!data.autoStart;
            setting_stickyFingers = !!data.stickyFingers;
        } catch (e) {}
    }

    // Reflect in UI
    document.getElementById("autoStartCheckbox").checked = setting_autoStart;
    document.getElementById("stickyFingersCheckbox").checked = setting_stickyFingers;
}

function saveSettings() {
    const data = {
        autoStart: setting_autoStart,
        stickyFingers: setting_stickyFingers
    };
    localStorage.setItem("ppTrackerSettings", JSON.stringify(data));
}

// -------------------------
// Save/load system (MULTI SAVE)
// -------------------------

function getCurrentSessionData() {
    let elapsed = isRunning ? performance.now() - startTime : pausedTime;

    return {
        timestamp: Date.now(),
        elapsed: elapsed,
        normalPP,
        camoPP,
        fastboiPP,
        failedPP
    };
}

function saveState(snapshot) {
    let raw = localStorage.getItem(SAVE_KEY);
    let saves;

    try {
        saves = JSON.parse(raw);
        if (!Array.isArray(saves)) saves = [];
    } catch {
        saves = [];
    }

    saves.push(snapshot);

    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
}

// Load all sessions + build UI
function loadState() {
    let raw = localStorage.getItem(SAVE_KEY);
    let saves;

    try {
        saves = JSON.parse(raw);
        if (!Array.isArray(saves)) saves = [];
    } catch {
        saves = [];
    }

    const container = document.getElementById("previousSessions");
    if (!container) return;

    container.innerHTML = "";

    saves.forEach((s, index) => {
        // intentionally empty now — legacy UI removed
    });
}


function loadSessionIntoTracker(s) {
    stopTimer();

    normalPP = s.normalPP;
    camoPP = s.camoPP;
    fastboiPP = s.fastboiPP;
    failedPP = s.failedPP;

    pausedTime = s.elapsed;
    startTime = performance.now() - pausedTime;

    updateTimerDisplay(pausedTime);
    updateDisplay();

    console.log("Session loaded:", s);
}

function clearSave() {
    localStorage.removeItem(SAVE_KEY);
}

window.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    loadState();
});
