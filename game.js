const {
  Engine,
  Runner,
  Bodies,
  Body,
  Composite,
  Events
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

let W = 0;
let H = 0;
let dpr = 1;

let engine;
let runner;
let floor;
let leftWall;
let rightWall;

let currentBody = null;
let currentData = null;
let isHolding = false;
let holderX = 0;

let stackHeight = 0;
let gameOver = false;
let fallenCount = 0;

const FALL_LIMIT = 2;
const SPAWN_Y = 128;
const MOVE_SPEED = 7;

const bgImage = new Image();
bgImage.src = "bg_classroom.png";

const images = {};

const erasers = [
  {
    name: "kaba",
    img: "kaba.png",
    w: 92,
    h: 52,
    bodyW: 82,
    bodyH: 42,
    friction: 0.9,
    restitution: 0.05,
    density: 0.0014
  },
  {
    name: "wooper",
    img: "wooper.png",
    w: 86,
    h: 48,
    bodyW: 74,
    bodyH: 36,
    friction: 0.82,
    restitution: 0.08,
    density: 0.0011
  },
  {
    name: "imori",
    img: "imori.png",
    w: 112,
    h: 38,
    bodyW: 94,
    bodyH: 24,
    friction: 0.72,
    restitution: 0.06,
    density: 0.00095
  },
  {
    name: "kyuri",
    img: "kyuri.png",
    w: 122,
    h: 30,
    bodyW: 104,
    bodyH: 22,
    friction: 0.62,
    restitution: 0.05,
    density: 0.0009
  },
  {
    name: "nasu",
    img: "nasu.png",
    w: 70,
    h: 98,
    bodyW: 52,
    bodyH: 78,
    friction: 0.86,
    restitution: 0.05,
    density: 0.0012
  }
];

erasers.forEach(e => {
  images[e.name] = new Image();
  images[e.name].src = e.img;
});

document.getElementById("titleScreen").addEventListener("click", startGame);
document.getElementById("retryBtn").addEventListener("click", startGame);

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
  const text = `放課後つみつみ消しゴムで ${stackHeight.toFixed(1)}m 積めた！ #カバゲーセン`;
  const url = location.href;
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  );
});

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const dropBtn = document.getElementById("dropBtn");

let moveLeft = false;
let moveRight = false;

bindHold(leftBtn, () => moveLeft = true, () => moveLeft = false);
bindHold(rightBtn, () => moveRight = true, () => moveRight = false);
dropBtn.addEventListener("click", dropCurrent);
dropBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  dropCurrent();
}, { passive: false });

function bindHold(btn, down, up) {
  btn.addEventListener("mousedown", down);
  btn.addEventListener("mouseup", up);
  btn.addEventListener("mouseleave", up);
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    down();
  }, { passive: false });
  btn.addEventListener("touchend", (e) => {
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
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function startGame() {
  showScreen(gameScreen);

  gameOver = false;
  fallenCount = 0;
  stackHeight = 0;
  holderX = W / 2;
  isHolding = false;
  currentBody = null;
  currentData = null;

  if (runner) {
    Runner.stop(runner);
  }

  engine = Engine.create();
  engine.gravity.y = 0.55;

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
  const floorY = H - 118;

  floor = Bodies.rectangle(W / 2, floorY, W * 1.2, 34, {
    isStatic: true,
    label: "floor",
    friction: 1,
    render: { visible: false }
  });

  leftWall = Bodies.rectangle(-24, H / 2, 48, H, {
    isStatic: true,
    label: "wall"
  });

  rightWall = Bodies.rectangle(W + 24, H / 2, 48, H, {
    isStatic: true,
    label: "wall"
  });

  Composite.add(engine.world, [floor, leftWall, rightWall]);
}

function spawnEraser() {
  if (gameOver) return;

  const data = erasers[Math.floor(Math.random() * erasers.length)];
  currentData = data;
  holderX = W / 2;

  currentBody = Bodies.rectangle(holderX, SPAWN_Y, data.bodyW, data.bodyH, {
    label: data.name,
    friction: data.friction,
    frictionStatic: 0.95,
    restitution: data.restitution,
    density: data.density,
    angle: 0,
    render: { visible: false }
  });

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
  Body.setStatic(currentBody, false);
  Body.setAngularVelocity(currentBody, (Math.random() - 0.5) * 0.03);

  playSe(dropSe);
  isHolding = false;
  currentBody = null;
  currentData = null;

  setTimeout(spawnEraser, 680);
}

function updateGame() {
  if (gameOver) return;

  if (isHolding && currentBody) {
    if (moveLeft) holderX -= MOVE_SPEED;
    if (moveRight) holderX += MOVE_SPEED;

    const data = currentBody.gameData;
    const minX = data.w / 2 + 12;
    const maxX = W - data.w / 2 - 12;
    holderX = Math.max(minX, Math.min(maxX, holderX));

    Body.setPosition(currentBody, { x: holderX, y: SPAWN_Y });
    Body.setVelocity(currentBody, { x: 0, y: 0 });
    Body.setAngle(currentBody, 0);
    Body.setAngularVelocity(currentBody, 0);
  }

  const bodies = Composite.allBodies(engine.world).filter(b => b.isEraser);

  let highest = H - 118;

  bodies.forEach(body => {
    if (!body.isCurrent) {
      highest = Math.min(highest, body.bounds.min.y);
    }

    if (!body.countedFallen && body.position.y > H + 80) {
      body.countedFallen = true;
      fallenCount++;
      playSe(collapseSe);

      if (fallenCount >= FALL_LIMIT) {
        endGame();
      }
    }
  });

  stackHeight = Math.max(0, ((H - 118 - highest) / 70));
  heightText.textContent = `${stackHeight.toFixed(1)}m`;
}

function handleCollision(event) {
  for (const pair of event.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;
    if ((a.isEraser || b.isEraser) && !gameOver) {
      playSe(hitSe, 0.25);
      break;
    }
  }
}

function draw() {
  if (!gameScreen.classList.contains("active")) return;

  ctx.clearRect(0, 0, W, H);
  drawBackground();

  const bodies = Composite.allBodies(engine.world).filter(b => b.isEraser);

  bodies.forEach(body => {
    drawEraser(body);
  });

  if (!gameOver) {
    requestAnimationFrame(draw);
  }
}

function drawBackground() {
  if (bgImage.complete && bgImage.naturalWidth > 0) {
    const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
    const canvasRatio = W / H;

    let dw, dh, dx, dy;

    if (imgRatio > canvasRatio) {
      dh = H;
      dw = H * imgRatio;
      dx = (W - dw) / 2;
      dy = 0;
    } else {
      dw = W;
      dh = W / imgRatio;
      dx = 0;
      dy = (H - dh) / 2;
    }

    ctx.drawImage(bgImage, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#9ee8ff";
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(0, H - 118, W, 8);
}

function drawEraser(body) {
  const data = body.gameData;
  const img = images[data.name];

  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -data.w / 2, -data.h / 2, data.w, data.h);
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(-data.bodyW / 2, -data.bodyH / 2, data.bodyW, data.bodyH);
  }

  ctx.restore();
}

function endGame() {
  if (gameOver) return;

  gameOver = true;
  bgm.pause();

  resultHeight.textContent = `${stackHeight.toFixed(1)}m`;

  let title = "放課後積み名人";
  if (stackHeight >= 20) title = "消しゴム神";
  else if (stackHeight >= 10) title = "積み職人";
  else if (stackHeight >= 5) title = "つみつみ係";

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