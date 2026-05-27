const {
  Engine,
  Render,
  Runner,
  Bodies,
  Composite,
  Body,
  Events
} = Matter;

const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const heightText = document.getElementById("heightText");
const resultHeight = document.getElementById("resultHeight");
const rankText = document.getElementById("rankText");

const bgm = document.getElementById("bgm");
const dropSe = document.getElementById("dropSe");
const hitSe = document.getElementById("hitSe");
const collapseSe = document.getElementById("collapseSe");

const canvas = document.getElementById("gameCanvas");

let engine;
let render;
let runner;

let currentBody = null;
let currentSprite = null;

let stackHeight = 0;
let gameOver = false;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const erasers = [
  {
    name: "kaba",
    img: "kaba.png",
    w: 80,
    h: 42
  },
  {
    name: "wooper",
    img: "wooper.png",
    w: 72,
    h: 36
  },
  {
    name: "imori",
    img: "imori.png",
    w: 88,
    h: 22
  },
  {
    name: "kyuri",
    img: "kyuri.png",
    w: 96,
    h: 20
  },
  {
    name: "nasu",
    img: "nasu.png",
    w: 54,
    h: 78
  }
];

document
  .getElementById("titleScreen")
  .addEventListener("click", startGame);

document
  .getElementById("retryBtn")
  .addEventListener("click", startGame);

document
  .getElementById("backBtn")
  .addEventListener("click", () => {
    location.reload();
  });

document
  .getElementById("homeBtn")
  .addEventListener("click", () => {
    location.href =
      "https://afoolhippo.github.io/home/?skipTitle=1";
  });

document
  .getElementById("shareBtn")
  .addEventListener("click", () => {

    const text =
      `放課後つみつみ消しゴムで ${stackHeight.toFixed(1)}m 積めた！ #カバゲーセン`;

    const url =
      "https://afoolhippo.github.io/";

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    );
  });

function startGame() {

  titleScreen.classList.remove("active");
  resultScreen.classList.remove("active");
  gameScreen.classList.add("active");

  gameOver = false;
  stackHeight = 0;

  if(render){
    Render.stop(render);
    Runner.stop(runner);
  }

  engine = Engine.create();

  engine.gravity.y = 0.7;

  render = Render.create({
    canvas,
    engine,
    options: {
      width: WIDTH,
      height: HEIGHT,
      wireframes: false,
      background: "#b7ecff"
    }
  });

  runner = Runner.create();

  Render.run(render);
  Runner.run(runner, engine);

  createStage();
  spawnEraser();

  bgm.currentTime = 0;
  bgm.volume = 0.5;
  bgm.play();

  Events.on(engine, "afterUpdate", updateGame);
}

function createStage() {

  const floor = Bodies.rectangle(
    WIDTH / 2,
    HEIGHT - 40,
    WIDTH,
    80,
    {
      isStatic: true,
      render: {
        fillStyle: "#d8b98a"
      }
    }
  );

  const leftWall = Bodies.rectangle(
    -20,
    HEIGHT / 2,
    40,
    HEIGHT,
    { isStatic: true }
  );

  const rightWall = Bodies.rectangle(
    WIDTH + 20,
    HEIGHT / 2,
    40,
    HEIGHT,
    { isStatic: true }
  );

  Composite.add(engine.world, [
    floor,
    leftWall,
    rightWall
  ]);
}

function spawnEraser() {

  const data =
    erasers[Math.floor(Math.random() * erasers.length)];

  currentSprite = data;

  currentBody = Bodies.rectangle(
    WIDTH / 2,
    120,
    data.w,
    data.h,
    {
      friction: 0.8,
      restitution: 0.1,
      density: 0.001,
      render: {
        sprite: {
          texture: data.img,
          xScale: data.w / 256,
          yScale: data.h / 256
        }
      }
    }
  );

  Body.setInertia(currentBody, Infinity);

  Composite.add(engine.world, currentBody);
}

window.addEventListener("mousemove", (e) => {

  if(!currentBody || gameOver) return;

  Body.setPosition(currentBody, {
    x: e.clientX,
    y: 120
  });
});

window.addEventListener("touchmove", (e) => {

  if(!currentBody || gameOver) return;

  Body.setPosition(currentBody, {
    x: e.touches[0].clientX,
    y: 120
  });
});

window.addEventListener("click", dropCurrent);
window.addEventListener("touchstart", dropCurrent);

function dropCurrent() {

  if(!currentBody || gameOver) return;

  Body.setInertia(currentBody, 1);

  dropSe.currentTime = 0;
  dropSe.play();

  currentBody = null;

  setTimeout(() => {
    spawnEraser();
  }, 600);
}

function updateGame() {

  if(gameOver) return;

  const bodies =
    Composite.allBodies(engine.world);

  let highest = HEIGHT;

  bodies.forEach(body => {

    if(body.position.y < highest){
      highest = body.position.y;
    }

    if(body.position.y > HEIGHT + 200){

      endGame();
    }
  });

  stackHeight =
    ((HEIGHT - highest) / 120).toFixed(1);

  heightText.textContent =
    `${stackHeight}m`;
}

function endGame() {

  if(gameOver) return;

  gameOver = true;

  bgm.pause();

  collapseSe.currentTime = 0;
  collapseSe.play();

  gameScreen.classList.remove("active");
  resultScreen.classList.add("active");

  resultHeight.textContent =
    `${stackHeight}m`;

  let title = "放課後積み名人";

  if(stackHeight >= 20){
    title = "消しゴム神";
  }
  else if(stackHeight >= 10){
    title = "積み職人";
  }

  rankText.textContent = title;
}