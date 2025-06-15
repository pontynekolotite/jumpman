// JUMPMAN RETRO — Rooftop Runner + FLY MODE

const FIELD_W = 640, FIELD_H = 960, HERO_W = 128, HERO_H = 128;
const GRAVITY = 1.5, JUMP_V = -26, SPEED = 8, FLY_SPEED = 16;
const FLY_TIME = 10 * 60; // 10 секунд * 60fps
let canvas, ctx;
let gameState = "menu";
let score = 0, lives = 3, runAnimTimer = 0, flyAnimTimer = 0;
let hero, roofs, coins, roofObstacles, airObstacles;
let energy = 0, energyGoal = 23, coinsCollected = 0, flyAvailable = false;
let isFalling = false, fallSpeed = 0;
let flyActive = false, flyTimer = 0, invulnTimer = 0;
const images = {
  "run 1.png": new Image(),
  "run 2.png": new Image(),
  "run 3.png": new Image(),
  "run 4.png": new Image(),
  "fly 1.png": new Image(),
  "fly 2.png": new Image(),
  "fly 3.png": new Image(),
  "jumpman_retro_title_screen.png": new Image()
};
["run 1.png","run 2.png","run 3.png","run 4.png","fly 1.png","fly 2.png","fly 3.png","jumpman_retro_title_screen.png"].forEach(src=>{images[src].src=src;});
const PLACEHOLDER = "run 1.png";

// === ГЕНЕРАЦИЯ КРЫШ ===
function generateRoofs() {
  let x = 0, arr = [];
  while (x < FIELD_W+400) {
    let w = 160 + Math.random()*180|0;
    let h = 120 + Math.random()*60|0;
    arr.push({x, w, h, gap:false});
    x += w;
    // Пролёт
    if (x < FIELD_W+320) {
      let gapW = 96 + Math.random()*80|0;
      arr.push({x, w:gapW, h:0, gap:true});
      x += gapW;
    }
  }
  return arr;
}
function shiftRoofs(speed) {
  for (let i=0;i<roofs.length;i++) roofs[i].x -= speed;
  if (roofs[0].x+roofs[0].w<0) roofs.shift();
  while (roofs[roofs.length-1].x< FIELD_W+180) {
    let prev = roofs[roofs.length-1];
    let x = prev.x+prev.w;
    let gapW = 96 + Math.random()*80|0;
    roofs.push({x, w:gapW, h:0, gap:true});
    x += gapW;
    let w = 160 + Math.random()*180|0;
    let h = 120 + Math.random()*60|0;
    roofs.push({x, w, h, gap:false});
  }
}

// === ВОЗДУШНЫЕ ПРЕПЯТСТВИЯ ===
function spawnAirObstacle() {
  if (!flyActive) return;
  if (airObstacles.length > 5) return;
  if (Math.random() < 0.04) {
    let t = Math.random();
    let type = t < 0.5 ? "cloud" : t < 0.8 ? "bird" : "sign";
    let x = FIELD_W + 64 + Math.random()*100;
    let y = 60 + Math.random() * (FIELD_H - 440);
    airObstacles.push({type, x, y, w: 96, h: 56});
  }
}
function shiftAirObstacles() {
  for (let i=airObstacles.length-1; i>=0; i--) {
    airObstacles[i].x -= FLY_SPEED;
    if (airObstacles[i].x + airObstacles[i].w < 0) airObstacles.splice(i,1);
  }
}

// === ИНИЦИАЛИЗАЦИЯ ===
function createHero() {
  let r = getCurrentRoof();
  return {
    x: roofs[0].x+36,
    y: FIELD_H-roofs[0].h-HERO_H,
    vy: 0,
    w: HERO_W,
    h: HERO_H,
    runFrame: 0,
    flyFrame: 0,
    jumping: false,
    blink: false,
    blinkTimer: 0,
    grounded: true
  };
}
function getCurrentRoof() {
  for (let r of roofs) {
    if (!r.gap && hero && (hero.x + HERO_W/2 > r.x) && (hero.x + HERO_W/2 < r.x+r.w)) return r;
  }
  return null;
}
function getRoofUnder(px) {
  for (let r of roofs) {
    if (!r.gap && (px > r.x) && (px < r.x+r.w)) return r;
  }
  return null;
}
function respawnOnRoof() {
  let r = getRoofUnder(hero.x+HERO_W/2) || roofs[0];
  hero.y = FIELD_H - r.h - HERO_H;
  hero.vy = 0; isFalling = false; fallSpeed = 0; hero.grounded = true;
}

// === ПРЕПЯТСТВИЯ НА КРЫШАХ ===
function spawnRoofObstacles() {
  for (let r of roofs) {
    if (r.gap || r.obstacles) continue;
    r.obstacles = [];
    let cnt = 1 + (Math.random()>0.55 ? 1 : 0);
    for (let i=0; i<cnt; i++) {
      let type = Math.random()>0.5 ? 1 : 2;
      let px = r.x + 36 + Math.random()*(r.w-86);
      r.obstacles.push({type, x:px, y:FIELD_H-r.h-32, w:54, h:32});
    }
  }
}
function collectRoofObstacles() {
  roofObstacles = [];
  for (let r of roofs) {
    if (r.gap||!r.obstacles) continue;
    for (let ob of r.obstacles) {
      roofObstacles.push({...ob, roof:r});
    }
  }
}

// === МОНЕТЫ НА КРЫШАХ ===
function spawnRoofCoins() {
  for (let r of roofs) {
    if (r.gap || r.coins) continue;
    r.coins = [];
    let cnt = 1 + (Math.random()>0.75 ? 1 : 0);
    for (let i=0; i<cnt; i++) {
      let px = r.x + 32 + Math.random()*(r.w-76);
      let py = FIELD_H-r.h-60-Math.random()*22;
      r.coins.push({x:px, y:py, r:18});
    }
  }
}
function collectRoofCoins() {
  coins = [];
  for (let r of roofs) {
    if (r.gap||!r.coins) continue;
    for (let c of r.coins) coins.push({...c, roof:r});
  }
}
// === HUD, ENERGY, FLY ===
function updateScore() { document.getElementById("score").textContent = score; }
function updateLives() {
  let html = "";
  for (let i = 0; i < lives; i++)
    html += `<canvas class="heart-canvas" width="36" height="36"></canvas>`;
  document.getElementById("lives").innerHTML = html;
  document.querySelectorAll('.heart-canvas').forEach(hc =>
    drawHeart(hc.getContext('2d'), 18, 18, 18)
  );
}
function updateEnergyBar() {
  const energyBar = document.getElementById("energyBar");
  const ctx2 = energyBar.getContext("2d");
  ctx2.clearRect(0,0,300,28);
  ctx2.fillStyle = "#fff"; ctx2.fillRect(4,8,292,12);
  ctx2.fillStyle = "#FFD600"; ctx2.fillRect(4,8,Math.min(energy/energyGoal, 1)*292,12);
  ctx2.strokeStyle = "#333"; ctx2.lineWidth = 2;
  ctx2.strokeRect(4,8,292,12);
  ctx2.font = "14px 'Press Start 2P', monospace";
  ctx2.fillStyle = "#333"; ctx2.fillText("ENERGY",8,24);
  if (flyAvailable) {
    ctx2.fillStyle = "#DF1111";
    ctx2.font = "bold 16px 'Press Start 2P', monospace";
    ctx2.fillText("READY!",178,24);
  }
  if (flyActive) {
    ctx2.fillStyle = "#2299FF";
    ctx2.font = "bold 16px 'Press Start 2P', monospace";
    ctx2.fillText(`${Math.ceil((FLY_TIME-flyTimer)/60)}s`, 220, 24);
  }
}
function showFlyBtn() {
  let btn = document.getElementById("flyBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "flyBtn";
    btn.textContent = "FLY";
    btn.className = "fly-btn";
    btn.onclick = tryActivateFly;
    document.body.appendChild(btn);
  }
  btn.classList.remove("hidden");
}
function hideFlyBtn() {
  let btn = document.getElementById("flyBtn");
  if (btn) btn.classList.add("hidden");
}
function tryActivateFly() {
  if (!flyAvailable || flyActive) return;
  flyActive = true;
  flyAvailable = false;
  hideFlyBtn();
  flyTimer = 0;
  hero.flyFrame = 0;
}

// === УПРАВЛЕНИЕ ===
function onJump() {
  if (gameState !== "play" || isFalling) return;
  if (flyActive) {
    hero.vy = -13; // Flappy jump
  } else if (!hero.jumping && hero.grounded) {
    hero.vy = JUMP_V;
    hero.jumping = true; hero.grounded = false;
    setTimeout(() => { hero.jumping = false; }, 220);
  }
}
window.onload = function() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  document.getElementById("startBtn").onclick = () => { showScreen("hud"); startGame(); };
  document.getElementById("flyAgainBtn").onclick = () => { showScreen("hud"); startGame(); };
  document.getElementById("backToMenuBtn").onclick = () => { showScreen("startMenu"); stopGame(); };
  document.getElementById("pauseBtn").onclick = () => {
    if (gameState === "play") { gameState = "pause"; }
    else if (gameState === "pause") { gameState = "play"; requestAnimationFrame(gameLoop); }
  };
  document.addEventListener("keydown", (e) => { if (e.code === "Space") onJump(); });
  canvas.addEventListener("mousedown", (e) => { onJump(); });
  document.body.addEventListener("touchstart", (e) => { if (gameState === "play") onJump(); });
  document.body.addEventListener('touchmove', function(e){ e.preventDefault(); }, { passive:false });
  document.body.addEventListener('gesturestart', function(e){ e.preventDefault(); });
  showScreen("startMenu");
};
function stopGame() { gameState = "menu"; }
function startGame() {
  score = 0; lives = 3; energy = 0; coinsCollected = 0; flyAvailable = false; isFalling = false;
  roofs = generateRoofs();
  spawnRoofObstacles();
  spawnRoofCoins();
  collectRoofObstacles();
  collectRoofCoins();
  hero = createHero();
  airObstacles = [];
  updateLives(); updateScore(); updateEnergyBar(); hideFlyBtn();
  flyActive = false; flyTimer = 0; invulnTimer = 0;
  gameState = "play";
  requestAnimationFrame(gameLoop);
}

// === GAME LOOP ===
function gameLoop() {
  if (gameState !== "play") return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,FIELD_W,FIELD_H);
  ctx.fillStyle="#C0C0C0"; ctx.fillRect(0,0,FIELD_W,FIELD_H);

  // --- Сдвиг поля
  let currentSpeed = flyActive ? FLY_SPEED : SPEED;
  shiftRoofs(currentSpeed);

  if (flyActive) {
    spawnAirObstacle();
    shiftAirObstacles();
  } else {
    spawnRoofObstacles();
    collectRoofObstacles();
    spawnRoofCoins();
    collectRoofCoins();
  }

  // === КРЫШИ ===
  if (!flyActive) {
    for (let r of roofs) {
      if (r.gap) continue;
      drawRoof(ctx, r);
    }
  }

  // === ВОЗДУШНЫЕ ПРЕПЯТСТВИЯ ===
  if (flyActive) {
    for (let i=airObstacles.length-1; i>=0; i--) {
      let obs = airObstacles[i];
      drawAirObstacle(ctx, obs);
      // Коллизия
      if (checkCollision(hero, obs)) {
        // Вылет из режима полёта, возврат на крышу/падение, неуязвимость 3 сек
        flyActive = false; flyTimer = 0;
        invulnTimer = 180; // 3 сек * 60fps
        hero.blink = true; hero.blinkTimer = invulnTimer;
        // Проверка есть ли под Джорданом крыша — если нет, падение
        let r = getRoofUnder(hero.x+HERO_W/2);
        if (r) {
          hero.y = FIELD_H-r.h-HERO_H;
          hero.vy = 0; isFalling = false; fallSpeed = 0; hero.grounded = true;
        } else {
          isFalling = true; fallSpeed = 16;
        }
        airObstacles = [];
        break;
      }
    }
  }

  // === ПАДЕНИЕ ===
  if (isFalling) {
    hero.y += fallSpeed;
    fallSpeed += 1.2;
    if (hero.y > FIELD_H) {
      isFalling = false; fallSpeed = 0;
      lives--;
      updateLives();
      if (lives <= 0) endGame();
      else respawnOnRoof();
      return;
    }
  } else if (!flyActive) {
    // === ФИЗИКА/ПРЫЖОК ===
    hero.y += hero.vy; hero.vy += GRAVITY;
    // Проверка — стоим ли на крыше?
    let roofUnder = getRoofUnder(hero.x+HERO_W/2);
    if (roofUnder && hero.y+HERO_H >= FIELD_H-roofUnder.h-4) {
      hero.y = FIELD_H-roofUnder.h-HERO_H;
      hero.vy = 0; hero.grounded = true;
    } else if (!roofUnder && hero.y+HERO_H>=FIELD_H-2) {
      // Вышли за поле (в пролёт) — падаем!
      isFalling = true; fallSpeed = 16;
    }
  } else if (flyActive) {
    // Флаппи-физика
    hero.y += hero.vy;
    hero.vy += 0.8;
    if (hero.y < 12) { hero.y = 12; hero.vy = 1; }
    if (hero.y > FIELD_H - 180) { hero.y = FIELD_H - 180; hero.vy = 0; }
  }

  // === ПРЕПЯТСТВИЯ НА КРЫШАХ ===
  if (!flyActive) {
    for (let ob of roofObstacles) {
      if (ob.x+ob.w<0 || ob.roof.gap) continue;
      drawRoofObstacle(ctx, ob);
      // Коллизия
      if (!isFalling && !flyActive && checkCollision(hero, ob) && !invulnTimer) {
        lives--;
        updateLives();
        hero.blink = true;
        if (lives <= 0) endGame();
        else respawnOnRoof();
        return;
      }
      ob.x -= SPEED;
    }
  }

  // === МОНЕТЫ ===
  if (!flyActive) {
    for (let c of coins) {
      if (c.x + c.r*2 < 0 || c.roof.gap) continue;
      drawCoin(ctx, c);
      if (!isFalling && checkCollision(hero, {x:c.x, y:c.y, w:c.r*2, h:c.r*2})) {
        score += 10; coinsCollected++; energy++;
        if (energy >= energyGoal && !flyAvailable) { flyAvailable = true; showFlyBtn(); }
        c.x = -999; // убираем монету
        updateScore(); updateEnergyBar();
      }
      c.x -= SPEED;
    }
  }

  // === АНИМАЦИЯ ГЕРОЯ ===
  if (flyActive) {
    flyAnimTimer++;
    if (flyAnimTimer % 6 === 0) hero.flyFrame = (hero.flyFrame + 1) % 3;
    if (hero.blink && flyAnimTimer % 4 < 2) {
      // мигает — не рисуем
    } else {
      drawImage(`fly ${hero.flyFrame+1}.png`, hero.x, hero.y, HERO_W, HERO_H);
    }
  } else {
    runAnimTimer++;
    if (runAnimTimer % 7 === 0) hero.runFrame = (hero.runFrame + 1) % 4;
    if (hero.blink && runAnimTimer % 4 < 2) {
      // мигает — не рисуем
    } else {
      drawImage(`run ${hero.runFrame+1}.png`, hero.x, hero.y, HERO_W, HERO_H);
    }
  }
  if (hero.blink) {
    hero.blinkTimer--;
    if (hero.blinkTimer <= 0) hero.blink = false;
  }

  // === FLY таймер ===
  if (flyActive) {
    flyTimer++;
    if (flyTimer >= FLY_TIME) {
      flyActive = false; flyTimer = 0;
      invulnTimer = 180; // 3 сек неуязвимости
      hero.blink = true; hero.blinkTimer = invulnTimer;
      // Проверка крыши под ногами — если нет, падаем!
      let r = getRoofUnder(hero.x+HERO_W/2);
      if (r) {
        hero.y = FIELD_H-r.h-HERO_H;
        hero.vy = 0; isFalling = false; fallSpeed = 0; hero.grounded = true;
      } else {
        isFalling = true; fallSpeed = 16;
      }
      airObstacles = [];
      energy = 0;
      updateEnergyBar();
    }
  }
  if (invulnTimer > 0) {
    invulnTimer--;
    if (invulnTimer === 0) hero.blink = false;
  }

  if (gameState === "play") requestAnimationFrame(gameLoop);
}
// === ВОЗДУШНЫЕ ПРЕПЯТСТВИЯ ===
function drawAirObstacle(ctx, obs) {
  ctx.save();
  if (obs.type === "cloud") {
    ctx.globalAlpha = 0.29;
    ctx.beginPath();
    ctx.ellipse(obs.x+obs.w*0.4, obs.y+obs.h*0.6, obs.w*0.38, obs.h*0.33, 0, 0, 2*Math.PI);
    ctx.ellipse(obs.x+obs.w*0.6, obs.y+obs.h*0.45, obs.w*0.35, obs.h*0.27, 0, 0, 2*Math.PI);
    ctx.ellipse(obs.x+obs.w*0.7, obs.y+obs.h*0.7, obs.w*0.19, obs.h*0.23, 0, 0, 2*Math.PI);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#C0C0C0";
    ctx.shadowBlur = 13;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  } else if (obs.type === "bird") {
    ctx.beginPath();
    ctx.ellipse(obs.x+obs.w/2, obs.y+obs.h/2, obs.w/2.1, obs.h/2.7, 0, 0, 2*Math.PI);
    ctx.fillStyle = "#333";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(obs.x+obs.w*0.3, obs.y+obs.h*0.7);
    ctx.lineTo(obs.x, obs.y+obs.h*0.5);
    ctx.lineTo(obs.x+obs.w*0.45, obs.y+obs.h*0.1);
    ctx.fillStyle = "#555";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(obs.x+obs.w*0.7, obs.y+obs.h*0.7);
    ctx.lineTo(obs.x+obs.w, obs.y+obs.h*0.5);
    ctx.lineTo(obs.x+obs.w*0.55, obs.y+obs.h*0.1);
    ctx.fillStyle = "#555";
    ctx.fill();
  } else if (obs.type === "sign") {
    ctx.fillStyle="#d11";
    ctx.fillRect(obs.x,obs.y,obs.w,obs.h*0.78);
    ctx.fillStyle="#fff";
    ctx.fillRect(obs.x+12,obs.y+obs.h*0.78-8,obs.w-24,8);
  }
  ctx.restore();
}

// === РЕНДЕР КРЫШ/ПРЕПЯТСТВИЙ/МОНЕТ/СЕРДЕЦ ===
function drawRoof(ctx, r) {
  ctx.save();
  ctx.fillStyle="#292933";
  ctx.fillRect(r.x,FIELD_H-r.h,r.w,r.h);
  ctx.strokeStyle="#000"; ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(r.x,FIELD_H-r.h);
  ctx.lineTo(r.x+r.w,FIELD_H-r.h);
  ctx.stroke();
  for (let x=r.x;x<r.x+r.w-8;x+=24) {
    ctx.fillStyle="#343448";
    ctx.fillRect(x,FIELD_H-r.h,12,Math.random()>0.7?8:16);
  }
  ctx.restore();
}
function drawRoofObstacle(ctx, ob) {
  ctx.save();
  if (ob.type===1) {
    ctx.fillStyle="#111"; ctx.fillRect(ob.x,ob.y,ob.w,ob.h);
    ctx.fillStyle="#fff"; ctx.fillRect(ob.x+8,ob.y+12,ob.w-16,7);
  } else {
    ctx.fillStyle="#d11"; ctx.fillRect(ob.x,ob.y,ob.w,ob.h);
    ctx.fillStyle="#fff"; ctx.fillRect(ob.x+12,ob.y+ob.h-12,ob.w-24,6);
  }
  ctx.restore();
}
function drawCoin(ctx, c) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x + c.r, c.y + c.r, c.r, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD600";
  ctx.shadowColor = "#EAB701";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#FFF";
  ctx.stroke();
  ctx.restore();
}
function drawHeart(ctx, cx, cy, s) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy + s/6);
  ctx.bezierCurveTo(cx + s/2, cy - s/2, cx + s, cy + s/3, cx, cy + s);
  ctx.bezierCurveTo(cx - s, cy + s/3, cx - s/2, cy - s/2, cx, cy + s/6);
  ctx.closePath();
  ctx.fillStyle = "#EF1111";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 3;
  ctx.fill();
  ctx.restore();
}
function drawImage(src, x, y, w, h) {
  let toDraw = images[src] && images[src].complete && images[src].naturalWidth>0 ? src : PLACEHOLDER;
  const img = images[toDraw];
  if (img) ctx.drawImage(img, x, y, w, h);
}

// === КОЛЛИЖЕНЫ И ФИНАЛ ===
function checkCollision(a, b) {
  return (a.x + a.w > b.x && a.x < b.x + (b.w||b.w) &&
    a.y + a.h > b.y && a.y < b.y + (b.h||b.h));
}
function endGame() {
  gameState = "gameover";
  document.getElementById("finalScore").textContent = score;
  showScreen("gameOverMenu");
}
function showScreen(id) {
  document.getElementById("startMenu").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("gameOverMenu").classList.add("hidden");
  if (id) document.getElementById(id).classList.remove("hidden");
}
