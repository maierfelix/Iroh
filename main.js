let w = canvas.width = 256;
let h = canvas.height = 256;
let ctx = canvas.getContext('2d');

let particles = [];

let img = new Image();

let position = {
  x: 104,
  y: 246
};

function Particle(x, y) {
  this.x = x;
  this.y = y;
  this.vy = -1.25;
  this.vx = Math.random() * 0.25 - 0.125;
  this.size = Math.random() * 0.6 + 0.35;
  this.alpha = 0.15;
  this.update = function() {
    this.y += this.vy;
    this.x += this.vx;
    this.vy *= 0.99;
    if (this.alpha <= 0.0) this.alpha = 0.0;
    ctx.globalAlpha = this.alpha;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.size, this.size);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    this.alpha *= 0.96;
    this.size += 0.0225;
  };
};

function draw() {
  let p1 = new Particle(position.x - 0.75, position.y);
  let p2 = new Particle(position.x - 0.50, position.y);
  let p3 = new Particle(position.x + 0.25, position.y);
  let p4 = new Particle(position.x + 0.00, position.y);
  let p5 = new Particle(position.x + 0.25, position.y);
  let p6 = new Particle(position.x + 0.50, position.y);
  let p7 = new Particle(position.x + 0.75, position.y);
  particles.push(p1, p2, p3, p4, p5, p6, p7);

  while (particles.length > 275) {
    particles.shift();
  };

  ctx.globalAlpha = 1.0;
  ctx.clearRect(0, 0, w, h);

  for (let ii = 0; ii < particles.length; ++ii) {
    particles[ii].update();
  }
};

img.onload = function() {
  setInterval(draw, 1000 / 30);
};
img.src = "smoke.jpg";
