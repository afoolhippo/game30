const {
  Engine, Runner, Bodies, Body, Composite, Events
} = Matter;

const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const heightText = document.getElementById("heightText");
const resultHeight = document.getElementById("resultHeight");
const rankText = document.getElementById("rankText");

const bgm = document.getElementById("bgm");
const dropSe = document.getElementById("dropSe");
const hitSe = document.getElementById("hitSe");
const collapseSe = document.getElementById("collapseSe");

let W, H, dpr;
let engine, runner;

let currentBody = null;
let isHolding = false;
let holderX = 0;

let stackHeight = 0;
let bestHeight = 0;
let cameraY = 0;
let targetCameraY = 0;

let gameOver = false;
let moveLeft = false;
let moveRight = false;
let placedCount = 0;

let tableX = 0;
let tableY = 0;
let tableW = 0;
let tableH = 0;

const FLOOR_Y_BASE_OFFSET = 126;
const SPAWN_SCREEN_Y = 130;
const MOVE_SPEED = 7;
const COLLAPSE_DROP_M = 2.0;
const GRACE_TIME = 2800;

let startTime = 0;

const bgImage = new Image();
bgImage.src = "bg_classroom.png";

const images = {};

const erasers = [
  { name: "kaba", img: "kaba.png", w: 86, h: 46, bodyW: 86, bodyH: 46, friction: 0.9, density: 0.0014 },
  { name: "wooper", img: "wooper.png", w: 82, h: 42, bodyW: 82, bodyH: 42, friction: 0.85, density: 0.0011 },
  { name: "imori", img: "imori.png", w: 104, h: 28, bodyW: 104, bodyH: 28, friction: 0.78, density: 0.001 },
  { name: "kyuri", img: "kyuri.png", w: 114, h: 24, bodyW: 114, bodyH: 24, friction: 0.68, density: 0.0009 },
  { name: "nasu", img: "nasu.png", w: 66, h: 84, bodyW: 66, bodyH: 84, friction: 0.86, density: 0.0012 }
];

erasers.forEach(e => {
  images[e.name] = new Image();
  images[e.name].src = e.img;
});

document.getElementById("titleImage").addEventListener("click", startGame);
document.getElementById("startBtn").addEventListener("click", startGame);

document.getElementById("retryBtn").addEventListener("click", () => {
  bgm.pause();
  showScreen(titleScreen);
});

document.getElementById("backBtn").addEventListener("click", () => {
  bgm.pause();
  showScreen(titleScreen);
});

document.getElementById("homeBtn").addEventListener("click", () => {
  location.href = "https://afoolhippo.github.io/home/?skipTitle=1";
});

document.getElementById("rankingBtn").addEventListener("click", () => {
  alert("ランキング機能は後ほど実装予定です");
});

document.getElementById("shareBtn").addEventListener("click", () => {
  const text = `放課後つみつみ消しゴムで ${bestHeight.toFixed(1)}m 積めた！ #カバゲーセン`;
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`
  );
});

bindHold(document.getElementById("leftBtn"), () => moveLeft = true, () => moveLeft = false);
bindHold(document.getElementById("rightBtn"), () => moveRight = true, () => moveRight = false);

document.getElementById("dropBtn").addEventListener("click", dropCurrent);
document.getElementById("dropBtn").addEventListener("touchstart", e => {
  e.preventDefault();
  dropCurrent();
}, { passive: false });

function bindHold(btn, down, up) {
  btn.addEventListener("mousedown", down);
  btn.addEventListener("mouseup", up);
  btn.addEventListener("mouseleave", up);

  btn.addEventListener("touchstart", e => {
    e.preventDefault();
    down();
  }, { passive: false });

  btn.addEventListener("touchend", e => {
    e.preventDefault();
    up();
  }, { passive: false });

  btn.addEventListener("touchcancel", up);
}

function showScreen(target) {
  [titleScreen, gameScreen, resultScreen].forEach(s => s.classList.remove("active"));
  target.classList.add("active");
}

function resizeCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  tableW = Math.min(W * 0.84, 360);
  tableH = 34;
  tableX = (W - tableW) / 2;
  tableY = H - FLOOR_Y_BASE_OFFSET;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function startGame() {
  showScreen(gameScreen);

  gameOver = false;
  stackHeight = 0;
  bestHeight = 0;
  cameraY = 0;
  targetCameraY = 0;
  holderX = W / 2;
  placedCount = 0;
  startTime = Date.now();

  if (runner) Runner.stop(runner);

  engine = Engine.create();
  engine.gravity.y = 0.5;

  runner = Runner.create();
  Runner.run(runner, engine);

  createStage();
  spawnEraser();

  Events.on(engine, "collisionStart", handleCollision);
  Events.on(engine, "afterUpdate", updateGame);

  bgm.currentTime = 0;
  bgm.volume = 0.45;
  bgm.play().catch(() => {});

  requestAnimationFrame(draw);
}

function createStage() {
  tableY = H - FLOOR_Y_BASE_OFFSET;

  const floor = Bodies.rectangle(W / 2, tableY, tableW, tableH, {
    isStatic: true,
    label: "floor",
    friction: 1
  });

  Composite.add(engine.world, [floor]);
}

function spawnEraser() {
  if (gameOver) return;

  const data = erasers[Math.floor(Math.random() * erasers.length)];
  holderX = W / 2;

  currentBody = Bodies.rectangle(
    holderX,
    cameraY + SPAWN_SCREEN_Y,
    data.bodyW,
    data.bodyH,
    {
      label: data.name,
      friction: data.friction,
      frictionStatic: 0.98,
      restitution: 0.03,
      density: data.density,
      render: { visible: false }
    }
  );

  currentBody.gameData = data;
  currentBody.isEraser = true;
  currentBody.isCurrent = true;

  Body.setStatic(currentBody, true);
  Composite.add(engine.world, currentBody);
  isHolding = true;
}

function dropCurrent() {
  if (!currentBody || !isHolding || gameOver) return;

  currentBody.isCurrent = false;
  currentBody.justDroppedAt = Date.now();
  placedCount++;

  Body.setStatic(currentBody, false);
  Body.setAngularVelocity(currentBody, (Math.random() - 0.5) * 0.025);

  playSe(dropSe);

  isHolding = false;
  currentBody = null;

  setTimeout(spawnEraser, 650);
}

function updateGame() {
  if (gameOver) return;

  if (isHolding && currentBody) {
    if (moveLeft) holderX -= MOVE_SPEED;
    if (moveRight) holderX += MOVE_SPEED;

    const data = currentBody.gameData;
    holderX = Math.max(data.w / 2 + 8, Math.min(W - data.w / 2 - 8, holderX));

    Body.setPosition(currentBody, {
      x: holderX,
      y: cameraY + SPAWN_SCREEN_Y
    });

    Body.setVelocity(currentBody, { x: 0, y: 0 });
    Body.setAngle(currentBody, 0);
    Body.setAngularVelocity(currentBody, 0);
  }

  const allPlacedBodies = Composite.allBodies(engine.world)
    .filter(b => b.isEraser && !b.isCurrent);

  const stableBodies = allPlacedBodies.filter(b => {
    const age = Date.now() - (b.justDroppedAt || 0);
    const speed = Math.abs(b.velocity.x) + Math.abs(b.velocity.y);
    const angular = Math.abs(b.angularVelocity);
    return age > 900 && speed < 1.2 && angular < 0.08;
  });

  let highestY = tableY;

  stableBodies.forEach(body => {
    highestY = Math.min(highestY, body.bounds.min.y);
  });

  stackHeight = Math.max(0, (tableY - highestY) / 70);
  bestHeight = Math.max(bestHeight, stackHeight);

  heightText.textContent = `${bestHeight.toFixed(1)}m`;

  const highestScreenY = highestY - cameraY;

  if (stableBodies.length > 0 && highestScreenY < H * 0.35) {
    targetCameraY = highestY - H * 0.35;
  }

  cameraY += (targetCameraY - cameraY) * 0.07;

  const elapsed = Date.now() - startTime;

  if (
    elapsed > GRACE_TIME &&
    placedCount >= 4 &&
    bestHeight >= 2.5 &&
    bestHeight - stackHeight >= COLLAPSE_DROP_M
  ) {
    endGame();
  }

  allPlacedBodies.forEach(body => {
    const screenY = body.position.y - cameraY;
    const outLeft = body.position.x < tableX - 120;
    const outRight = body.position.x > tableX + tableW + 120;
    const outBottom = screenY > H + 220;

    if (placedCount >= 3 && (outLeft || outRight || outBottom)) {
      endGame();
    }
  });
}

function handleCollision(event) {
  for (const pair of event.pairs) {
    if ((pair.bodyA.isEraser || pair.bodyB.isEraser) && !gameOver) {
      playSe(hitSe, 0.22);
      break;
    }
  }
}

function draw() {
  if (!gameScreen.classList.contains("active")) return;

  ctx.clearRect(0, 0, W, H);

  drawBackground();
  drawTableGuide();

  const bodies = Composite.allBodies(engine.world).filter(b => b.isEraser);
  bodies.forEach(drawEraser);

  if (!gameOver) requestAnimationFrame(draw);
}

function drawBackground() {
  ctx.fillStyle = "#9ee8ff";
  ctx.fillRect(0, 0, W, H);

  if (bgImage.complete && bgImage.naturalWidth > 0) {
    const bgW = Math.min(W * 0.82, 340);
    const bgH = bgW * (bgImage.naturalHeight / bgImage.naturalWidth);
    const bgX = (W - bgW) / 2;
    const bgY = 78;

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bgImage, bgX, bgY, bgW, bgH);
    ctx.restore();
  }
}

function drawTableGuide() {
  const screenTableY = tableY - cameraY;

  const scaleBack = Math.min(bestHeight / 18, 1);
  const visualW = tableW * (1 - scaleBack * 0.16);
  const visualH = tableH * (1 - scaleBack * 0.22);
  const x = (W - visualW) / 2;

  let y = screenTableY;

  if (y > H - 128) y = H - 128;
  if (y < H - 168) y = H - 168;

  ctx.save();

  ctx.fillStyle = "#c98a4a";
  ctx.fillRect(x, y, visualW, visualH);

  ctx.strokeStyle = "#74421f";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, visualW, visualH);

  ctx.fillStyle = "#f0c27d";
  ctx.fillRect(x + 6, y + 6, visualW - 12, 6);

  ctx.fillStyle = "#74421f";
  ctx.font = "14px DotGothic16";
  ctx.textAlign = "center";
  ctx.fillText("机のはしに注意！", W / 2, y - 8);

  ctx.restore();
}

function drawEraser(body) {
  const data = body.gameData;
  const img = images[data.name];

  const screenX = body.position.x;
  const screenY = body.position.y - cameraY;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(body.angle);
  ctx.imageSmoothingEnabled = false;

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -data.w / 2, -data.h / 2, data.w, data.h);
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(-data.w / 2, -data.h / 2, data.w, data.h);
  }

  ctx.restore();
}

function endGame() {
  if (gameOver) return;

  gameOver = true;
  bgm.pause();
  playSe(collapseSe);

  resultHeight.textContent = `${bestHeight.toFixed(1)}m`;

  let title = "つみつみ見習い";
  if (bestHeight >= 20) title = "消しゴム神";
  else if (bestHeight >= 10) title = "積み職人";
  else if (bestHeight >= 5) title = "放課後積み名人";

  rankText.textContent = title;

  setTimeout(() => {
    showScreen(resultScreen);
  }, 700);
}

function playSe(audio, volume = 0.7) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
}