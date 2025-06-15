const FIELD_W = 640, FIELD_H = 960, HERO_W = 128, HERO_H = 128;
let canvas, ctx, gameState = "menu", hero, roofs;

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
  showScreen("startMenu");
};

function stopGame() { gameState = "menu"; }
function startGame() {
  roofs = [{x:0, w:FIELD_W, h:180, gap:false}];
  hero = {x: FIELD_W/2-HERO_W/2, y:FIELD_H-180-HERO_H, w:HERO_W, h:HERO_H, vy:0};
  gameState = "play";
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (gameState !== "play") return;
  ctx.clearRect(0,0,FIELD_W,FIELD_H);
  ctx.fillStyle="#C0C0C0";
  ctx.fillRect(0,0,FIELD_W,FIELD_H);
  // Рисуем крышу
  let r = roofs[0];
  ctx.fillStyle="#292933";
  ctx.fillRect(r.x,FIELD_H-r.h,r.w,r.h);
  // Рисуем героя
  ctx.fillStyle = "#ef1111";
  ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
  requestAnimationFrame(gameLoop);
}

function showScreen(id) {
  document.getElementById("startMenu").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("gameOverMenu").classList.add("hidden");
  if (id) document.getElementById(id).classList.remove("hidden");
}
