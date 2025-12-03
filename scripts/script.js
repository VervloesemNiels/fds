A1lib.identifyApp("appconfig.json");

window.setTimeout(function () {
  const appColor = A1lib.mixColor(255, 199, 0);
  const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;

  let reader = new Chatbox.default();
  reader.readargs = {
    colors: [
      A1lib.mixColor(255, 255, 255), // white
      A1lib.mixColor(0, 255, 0), // prosper green
      A1lib.mixColor(30, 255, 0), // bik green
      A1lib.mixColor(30, 255, 0) // lotd orange
    ],
    backwards: true,
  };

  $(".mats").append("<span>Searching for chatboxes</span>");
  $(".mats").append(
    "<div>If this is showing for an extended period of time, then the chatbox read for Alt1 isn't working due to an update.  Please be patient, and the issue will be fixed as soon as it can!</div>"
  );
  reader.find();
  let findChat = setInterval(function () {
    if (reader.pos === null) reader.find();
    else {
      clearInterval(findChat);

      //If multiple boxes are found, this will select the first, which should be the top-most chat box on the screen.
      reader.pos.mainbox = reader.pos.boxes[0];
      showSelectedChat(reader.pos);
    }
  }, 1000);

  function showSelectedChat(chat) {
    //Attempt to show a temporary rectangle around the chatbox.  skip if overlay is not enabled.
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

  tracking = setInterval(function () {
          readChatbox();
          updateDisplay()

        }, 600);

  function readChatbox() {

    var opts = reader.read() || [];
    var chatStr = "";
    var chatArr;

    if (opts.length != 0) {
      for (let line in opts) {
        //Filter out the first chat[line], if it has no timestamp.  This is probably from a screen reload.
        //Check if no timestamp exists, and it's the first line in the chatreader.
        if (!opts[line].text.match(timestampRegex) && line == "0") {
          continue;
        }
        // Beginning of chat line
        if (opts[line].text.match(timestampRegex)) {
          if (line > 0) {
            chatStr += "\n";
          }
          chatStr += opts[line].text + " ";
          continue;
        }
        chatStr += opts[line].text;
      }
    }
    if (chatStr.trim() != "") {
      chatArr = chatStr.trim().split("\n");
    }
    let name, type, qty;
    for (let line in chatArr) {
      let chatLine = chatArr[line].trim();
      let prevChatLine;
      if (chatArr[line - 1]) {
        prevChatLine = chatArr[line - 1].trim();
      }
      if (chatLine != "") {
        // Determine if chat line was already logged, skip further processing this line.
        if (isInHistory(chatLine)) {
          qty = null;
          continue;
        }
        checkLine(chatLine);
      }
    }
    if (chatArr) {
      updateChatHistory(chatArr);
    }
  }

  function updateChatHistory(chatArr) {
    if (!sessionStorage.chatHistory) {
      sessionStorage.chatHistory = chatArr.join("\n");
      return;
    }
    var history = sessionStorage.chatHistory.split("\n");
    while (history.length > 100) {
      history.splice(0, 1);
    }
    chatArr.forEach((line) => history.push(line.trim()));
    sessionStorage.chatHistory = history.join("\n");
  }

  function isInHistory(chatLine) {
    if (sessionStorage.chatHistory) {
      for (let historyLine of sessionStorage.chatHistory.split("\n")) {
        if (historyLine.trim() == chatLine) {
          return true;
        }
      }
    }
    return false;
  }
})


// Credits to https://github.com/ZeroGwafa/ArchMatCounter ^
// --------------------------------------------------------------------------------------------------------------------------------------

// Counter Varialbles
let normalPP = 0;
let fastboiPP = 0;
let camoPP = 0;
let failedPP = 0;

// Timer variables
let startTime = null;
let pausedTime = null;
let totalPaused = 0;
let running = false;
let timerInterval = null;

// Button logic for timer
document.getElementById("startBtn").addEventListener("click", startTimer);
document.getElementById("stopBtn").addEventListener("click", stopTimer);
document.getElementById("resetBtn").addEventListener("click", resetAll);
document.getElementById("saveBtn").addEventListener("click", () => {
    // Update the data preview inside the popup
    const preview = document.getElementById("saveDataPreview");

    saveSnapshot = {
        normalPP,
        fastboiPP,
        camoPP,
        failedPP,
        secondsElapsed,
        effiencyPercent
    };
    preview.innerHTML = `
        Normal PP: ${normalPP} <br>
        Fastboi PP: ${fastboiPP} <br>
        Camo PP: ${camoPP} <br>
        Failed PP: ${failedPP} <br>
        Seconds Elapsed: ${secondsElapsed} <br>
        Efficiency: ${effiencyPercent ? effiencyPercent.toFixed(2) : '0'}%
    `;
    document.getElementById("confirmSavePopup").style.display = "block";
});

document.getElementById("confirmSaveYes").addEventListener("click", () => {
  if (!saveSnapshot) return;
    saveState(saveSnapshot);
    saveSnapshot = null
    
    document.getElementById("confirmSavePopup").style.display = "none";
    spawnXPDrop("Saved!");
});

document.getElementById("confirmSaveNo").addEventListener("click", () => {
    saveSnapshot = null
    document.getElementById("confirmSavePopup").style.display = "none";
});

function startTimer(delay) {
  if (running) return;

  running = true;

  // If resuming from pause
  if (pausedTime !== null) {
    totalPaused += Date.now() - pausedTime;
    pausedTime = null;
  } else {
    startTime = Date.now();
  }

  timerInterval = setInterval(updateTimerDisplay, 50); // update ~20x per sec
}

function stopTimer() {
  if (!running) return;
  running = false;
  pausedTime = Date.now();
  clearInterval(timerInterval);
}

function resetAll() {
    fastboiPP = 0;
    camoPP = 0;
    normalPP = 0;
    failedPP = 0
    running = false;
    startTime = null;
    pausedTime = null;
    totalPaused = 0;

    clearInterval(timerInterval);
    updateTimerDisplay(0);
    updateDisplay();
    clearSave();
  }

// Helper function to convert timer data to ms
function getElapsedTimeMs() {
  if (!startTime) return 0;

  if (running) {
    return Date.now() - startTime - totalPaused;
  } else {
    return pausedTime ? pausedTime - startTime - totalPaused : 0;
  }
}

// Update timer display in hh:mm:SSS.
function updateTimerDisplay() {
  const ms = getElapsedTimeMs();

  const hours   = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis  = Math.floor(ms % 1000);

  document.getElementById("timer").textContent =
    `${String(hours).padStart(2,'0')}:`
  + `${String(minutes).padStart(2,'0')}:`
  + `${String(seconds).padStart(2,'0')}.`
  + `${String(millis).padStart(3,'0')}`;
}

  
  // Animations, just some fun
  function spawnXPDrop(amount = 1) {
      const xp = document.createElement("div");
      xp.className = "xpFloat";
      xp.textContent = `${amount} XP`;
      document.getElementById("xpLayer").appendChild(xp);

      // Remove after animation ends
      setTimeout(() => xp.remove(), 1800);
  }

  // calculate and update everything in the GUI
  function updateDisplay() {
    secondsElapsed = (getElapsedTimeMs() / 1000).toFixed(1)
    hours = secondsElapsed > 0 ? secondsElapsed / 3600 : 0;
    totalPP = normalPP + camoPP + fastboiPP;

    // Calculate actual PP per hours for eachs source
    normalPPPerHour = hours > 0 ? (normalPP / hours) : 0;
    camoPPPerHour = hours > 0 ? (camoPP / hours) : 0; 
    fastboiPPPerHour = hours > 0 ? (fastboiPP / hours) : 0;
    totalPPPerhour = hours > 0 ? (totalPP / hours) : 0;

    // Calculate percentages, where normal = 100% 
    normalPPPercent = ((normalPP / normalPP) * 100);
    camoPPPercent = ((camoPP / normalPP) *100).toFixed(2);
    fastboiPPpercent = ((fastboiPP / normalPP) *100).toFixed(2);

    // Max normalPP actions per hour 3600 / 1.2 with sticky finger relic!
    totalMaxPPPerhour = 3000;
    // Calculate extra procs based on current rate of procs happening
    camoPPBonus = (camoPP / normalPP) * totalMaxPPPerhour;    
    fastBonus = (fastboiPP / normalPP) * totalMaxPPPerhour;
    totalPPPerhourMax = totalMaxPPPerhour + camoPPBonus + fastBonus;

    // calculate efficiency
    effiencyPercent = normalPPPerHour / totalMaxPPPerhour * 100
    lostPickpockets = totalPPPerhourMax - totalPPPerhour;

    // Calculate clue gain/loss
    lostHard = lostPickpockets * 6 / 1000;
    lostElite = lostPickpockets * 5 / 1000;

    gainedHard = totalPPPerhour * 6 / 1000
    gainedElite = totalPPPerhour * 5 / 1000

    // Update GUI
    // Counts
    document.getElementById("normalCount").textContent = normalPP;
    document.getElementById("camoCount").textContent = camoPP;
    document.getElementById("fastCount").textContent = fastboiPP;
    document.getElementById("failedCount").textContent = failedPP;
    document.getElementById("totalCount").textContent = totalPP;

    // Normal procs
    document.getElementById("pphNormalActual").textContent = normalPPPerHour.toFixed(0);
    document.getElementById("pphNormalMax").textContent = 3000;
    document.getElementById("pphNormalPer").textContent = normalPPPercent;

    // Camo procs
    document.getElementById("pphCamoActual").textContent = camoPPPerHour.toFixed(0);
    document.getElementById("pphCamoMax").textContent = camoPPBonus.toFixed(0);
    document.getElementById("pphCamoPer").textContent = camoPPPercent;
    
    // Agility procs
    document.getElementById("pphAgilityActual").textContent = fastboiPPPerHour.toFixed(0);
    document.getElementById("pphAgilityMax").textContent = fastBonus.toFixed(0);
    document.getElementById("pphAgilityPer").textContent = fastboiPPpercent;

    // Total
    document.getElementById("pphTotalActual").textContent = totalPPPerhour.toFixed(0);
    document.getElementById("pphTotalMax").textContent = totalPPPerhourMax.toFixed(0);
    document.getElementById("pphTotalPer").textContent = (((camoPP / normalPP)*100) + ((normalPP / normalPP)*100) + ((fastboiPP / normalPP)*100)).toFixed(2)
  
    // adjust bar and flavortext
    document.getElementById('efficiencyPercent').textContent = effiencyPercent.toFixed(2) + '%';
    document.getElementById('efficiencyBar').style.width = effiencyPercent + '%';
    document.getElementById('efficienyText').innerHTML =
      `Per hour, you should have gained <b>${gainedHard.toFixed(2)}</b> hard clues and <b>${gainedElite.toFixed(2)}</b> elite clues.<br>
      Missed <b>${lostHard.toFixed(2)}</b> hard and <b>${lostElite.toFixed(2)}</b> elite clues because of losing <b>${lostPickpockets.toFixed(0)}</b> pickpockets.`;

    if(effiencyPercent > 100){
      printAllToConsole()
    }
    updateTimerDisplay();
  }

function printAllToConsole() {

 const debugData = {
    elapsedSeconds: secondsElapsed,
    elapsedMs: getElapsedTimeMs(),
    efficiencyPercent: effiencyPercent,

    // Pickpocket stats
    normalPP,
    fastboiPP,
    camoPP,
    failedPP,
    totalPP,

    // Per-hour values
    normalPPPerHour: normalPPPerHour.toFixed(2),
    camoPPPerHour: camoPPPerHour.toFixed(2),
    fastboiPPPerHour: fastboiPPPerHour.toFixed(2),
    totalPPPerHour: totalPPPerhour.toFixed(2),

    // Max theoretical
    totalPPPerHourMax: totalPPPerhourMax.toFixed(2),

    // Loss calculations
    lostPickpockets: lostPickpockets.toFixed(2),
    lostHardClues: lostHard.toFixed(3),
    lostEliteClues: lostElite.toFixed(3),

    // Gain calculations
    gainedHardClues: gainedHard.toFixed(3),
    gainedEliteClues: gainedElite.toFixed(3)
  };

  console.group("~~~ DEBUG ~~~", "color: orange; font-weight: bold;");
  console.log("Variable Overview:");
  console.table(debugData);
  console.groupEnd();
}

  // Reader logic
  function checkLine(line) {
    if(running){
      if(line.includes("Your camouflage outfit keeps you hidden and you steal additional loot.")){
        camoPP++
        spawnXPDrop(2);
      }
      if(line.includes("Your lightning-fast reactions allow you to steal double the loot")){
        fastboiPP++
        normalPP++
        spawnXPDrop(3);
      }
        if(line.includes("You pick the Menaphos market guard's pocket.")){
        normalPP++
        spawnXPDrop(1);
      }
        if(line.includes("You pick the Archaeology professor's pocket.")){
        normalPP++
        spawnXPDrop(1);
      }
        if(line.includes("You fail to pick the Menaphos market guard's pocket.")){
        failedPP += 1;
      }
        if(line.includes("You fail to pick the Archaeology professor's pocket.")){
        failedPP += 1;
      }

      } else{
      if(line.includes("You pick the Menaphos market guard's pocket.")){
        console.log("Auto start")
        icons = document.querySelectorAll(".npcIcon");

        icons.forEach(icon => {
          icon.src = "https://runescape.wiki/images/Menaphos_market_guard_icon.png?bcb77"
        });

        startTimer();
      }

      if(line.includes("You pick the Archaeology professor's pocket.")){
        console.log("Auto start")
        icons = document.querySelectorAll(".npcIcon");

        icons.forEach(icon => {
          icon.src = "https://runescape.wiki/images/Archaeology_professor_icon.png?abc123"
        });
        
        startTimer();
        }
      }
  }

// -------------------------
// Save / Load
// -------------------------
const SAVE_KEY = "ppTrackerSave";

function saveState(saveSnapshot) {
  const dataToSave = {
        normalPP: saveSnapshot.normalPP,
        fastboiPP: saveSnapshot.fastboiPP,
        camoPP: saveSnapshot.camoPP,
        failedPP: saveSnapshot.failedPP,
        elapsedTime: saveSnapshot.secondsElapsed * 1000, // convert seconds back to ms
        running // preserve current running state
    };

  localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
}

function loadState() {
  const stored = localStorage.getItem(SAVE_KEY);
  if (!stored) return;

  try {
    const data = JSON.parse(stored);

    normalPP = data.normalPP ?? 0;
    fastboiPP = data.fastboiPP ?? 0;
    camoPP = data.camoPP ?? 0;
    failedPP = data.failedPP ?? 0;

    const elapsed = data.elapsedTime ?? 0;
    running = false;

    if (running) {
      startTime = Date.now() - elapsed;
      timerInterval = setInterval(updateTimerDisplay, 50);
      pausedTime = null;
    } else {
      startTime = Date.now() - elapsed;
      pausedTime = Date.now();
    }

    totalPaused = 0;

    updateDisplay(); // refresh all counters and timer
  } catch (e) {
    console.error("Failed to load save", e);
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// -------------------------
// Auto-load on page start
// -------------------------

window.addEventListener("DOMContentLoaded", loadState);