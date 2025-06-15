// JUMPMAN RETRO — Rooftop Runner (крыши, пролёты, падения, два типа препятствий на крышах, energy)
const FIELD_W = 640, FIELD_H = 960, HERO_W = 128, HERO_H = 128;
const GRAVITY = 1.5, JUMP_V = -26, SPEED = 8;
let canvas, ctx;
let gameState = "menu";
let score = 0, lives = 3, runAnimTimer = 0;
let hero, roofs, coins, roofObstacles;
let energy = 0, energyGoal = 23, coinsCollected = 0, flyAvailable = false;
let isFalling = false, fallSpeed = 0;
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
function shiftRoofs() {
  for (let i=0;i<roofs.length;i++) roofs[i].x -= SPEED;
  if (roofs[0].x+roofs[0].w<0) roofs.shift();
  while (roofs[roofs.length-1].x< FIELD_W+180) {
    // Новая крыша или пролёт
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

// === HUD ===
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
}

// === FLY КНОПКА ===
function showFlyBtn() {
  let btn = document.getElementById("flyBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "flyBtn";
    btn.textContent = "FLY";
    btn.className = "fly-btn";
    btn.onclick = ()=>alert("Режим полёта пока не реализован — будет во 2й итерации");
    document.body.appendChild(btn);
  }
  btn.classList.remove("hidden");
}
function hideFlyBtn() {
  let btn = document.getElementById("flyBtn");
  if (btn) btn.classList.add("hidden");
}

// === УПРАВЛЕНИЕ ===
function onJump() {
  if (gameState !== "play" || isFalling) return;
  if (!hero.jumping && hero.grounded) {
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
  updateLives(); updateScore(); updateEnergyBar(); hideFlyBtn();
  gameState = "play";
  requestAnimationFrame(gameLoop);
}

// === GAME LOOP ===
function gameLoop() {
  if (gameState !== "play") return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,FIELD_W,FIELD_H);
  ctx.fillStyle="#C0C0C0"; ctx.fillRect(0,0,FIELD_W,FIELD_H);

  shiftRoofs();
  spawnRoofObstacles();
  collectRoofObstacles();
  spawnRoofCoins();
  collectRoofCoins();

  // === ОТРИСОВКА КРЫШ ===
  for (let r of roofs) {
    if (r.gap) continue;
    drawRoof(ctx, r);
  }
  // === ОТРИСОВКА ПРОЛЁТОВ === (ничего, просто фон)

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
  } else {
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
  }

  // === ОТРИСОВКА ПРЕПЯТСТВИЙ ===
  for (let ob of roofObstacles) {
    if (ob.x+ob.w<0 || ob.roof.gap) continue;
    drawRoofObstacle(ctx, ob);
    // Коллизия
    if (!isFalling && checkCollision(hero, ob)) {
      lives--;
      updateLives();
      hero.blink = true;
      if (lives <= 0) endGame();
      else respawnOnRoof();
      return;
    }
    ob.x -= SPEED;
  }

  // === ОТРИСОВКА МОНЕТ ===
  for (let c of coins) {
    if (c.x + c.r*2 < 0 || c.roof.gap) continue;
    drawCoin(ctx, c);
    // Коллизия
    if (!isFalling && checkCollision(hero, {x:c.x, y:c.y, w:c.r*2, h:c.r*2})) {
      score += 10; coinsCollected++; energy++;
      if (energy >= energyGoal && !flyAvailable) { flyAvailable = true; showFlyBtn(); }
      c.x = -999; // убираем монету
      updateScore(); updateEnergyBar();
    }
    c.x -= SPEED;
  }

  // === АНИМАЦИЯ ГЕРОЯ ===
  runAnimTimer++;
  if (runAnimTimer % 7 === 0) hero.runFrame = (hero.runFrame + 1) % 4;
  if (hero.blink && runAnimTimer % 4 < 2) {
    // мигает — не рисуем
  } else {
    drawImage(`run ${hero.runFrame+1}.png`, hero.x, hero.y, HERO_W, HERO_H);
  }

  if (gameState === "play") requestAnimationFrame(gameLoop);
}

// === ОТРИСОВКА ЭЛЕМЕНТОВ ===
function drawRoof(ctx, r) {
  // Основание
  ctx.save();
  ctx.fillStyle="#292933";
  ctx.fillRect(r.x,FIELD_H-r.h,r.w,r.h);
  ctx.strokeStyle="#000"; ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(r.x,FIELD_H-r.h);
  ctx.lineTo(r.x+r.w,FIELD_H-r.h);
  ctx.stroke();
  // Пиксельные “ступеньки” (8бит-стиль)
  for (let x=r.x;x<r.x+r.w-8;x+=24) {
    ctx.fillStyle="#343448";
    ctx.fillRect(x,FIELD_H-r.h,12,Math.random()>0.7?8:16);
  }
  ctx.restore();
}
function drawRoofObstacle(ctx, ob) {
  // type1 — вентиляция (черная с полосой), type2 — красный короб
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
