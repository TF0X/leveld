const P = 4;

function px(ctx, x, y, w, h, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x * P, y * P, w * P, h * P);
}

function rng(seed, n) {
  return ((Math.sin(n * seed * 9301 + 49297) * 233280) % 1 + 1) % 1;
}

export function drawFarm(canvas, state) {
  const { season = 'summer', discipline = 80, violations = 0, organisms = 6, streak = 1 } = state;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cols = Math.floor(W / P), rows = Math.floor(H / P);
  ctx.imageSmoothingEnabled = false;

  const isSummer = season === 'summer';
  const isAutumn = season === 'autumn';
  const isWinter = season === 'winter';
  const isSpring = season === 'spring';

  const skyColors = {
    summer: '#3a6bc4', autumn: '#7a5a30', winter: '#2a2040', spring: '#5a7ab0'
  };
  const groundColors = {
    summer: '#2d7a1f', autumn: '#5a3a10', winter: '#3a3550', spring: '#3a6a2a'
  };
  const groundDark = {
    summer: '#1f5a12', autumn: '#3a2808', winter: '#2a2540', spring: '#2a5020'
  };

  ctx.fillStyle = skyColors[season];
  ctx.fillRect(0, 0, W, H);

  if (isSummer || isSpring) {
    const sunCol = isSummer ? '#ffe840' : '#ffcc40';
    px(ctx, 8, 2, 2, 2, sunCol);
    px(ctx, 7, 3, 4, 1, sunCol);
    px(ctx, 8, 1, 2, 1, sunCol);
    for (let b = 0; b < 4; b++) {
      const bx = Math.floor(rng(42 + b, b) * (cols - 12)) + 3;
      const by = Math.floor(rng(42 + b, b + 1) * 5) + 1;
      px(ctx, bx + 1, by, 3, 1, '#e8f4ff'); px(ctx, bx, by + 1, 5, 1, '#e8f4ff'); px(ctx, bx + 1, by + 2, 3, 1, '#e8f4ff');
    }
  } else if (isAutumn) {
    px(ctx, 8, 2, 3, 3, '#e8a020');
    for (let b = 0; b < 3; b++) {
      const bx = Math.floor(rng(55 + b, b) * (cols - 10)) + 3;
      const by = Math.floor(rng(55 + b, b + 1) * 5) + 1;
      px(ctx, bx, by, 4, 1, '#8a7a6a'); px(ctx, bx - 1, by + 1, 6, 1, '#8a7a6a'); px(ctx, bx, by + 2, 4, 1, '#8a7a6a');
    }
  } else {
    for (let s = 0; s < 12; s++) {
      const sx = Math.floor(rng(77, s) * cols); const sy = Math.floor(rng(77, s + 1) * (rows * 0.4));
      px(ctx, sx, sy, 1, 1, 'rgba(220,220,240,0.6)');
    }
  }

  const gY = Math.floor(rows * 0.48);
  ctx.fillStyle = groundColors[season];
  ctx.fillRect(0, gY * P, W, H - gY * P);
  for (let i = 0; i < cols; i += 3) {
    ctx.fillStyle = i % 6 === 0 ? groundDark[season] : groundColors[season];
    ctx.fillRect(i * P, gY * P, P * 2, (rows - gY) * P);
  }

  const hX = 1, hY = gY - 8;
  const houseWall = isSummer ? '#c8a060' : isAutumn ? '#9a7840' : isWinter ? '#6a6070' : '#b09050';
  const houseRoof = isSummer ? '#c04030' : isAutumn ? '#8a3020' : isWinter ? '#5a5060' : '#a03028';
  px(ctx, hX, hY + 3, 8, 5, houseWall);
  px(ctx, hX + 1, hY, 6, 3, houseRoof);
  px(ctx, hX + 3, hY + 3, 2, 3, isSummer ? '#6090d0' : '#404050');
  if (isSummer || isSpring) px(ctx, hX + 1, hY + 1, 1, 1, '#ffe880');

  const barnX = cols - 13, barnY = gY - 7;
  const barnWall = isSummer ? '#a03020' : isAutumn ? '#7a2818' : isWinter ? '#5a4050' : '#903020';
  px(ctx, barnX, barnY + 2, 10, 5, barnWall);
  px(ctx, barnX + 1, barnY, 8, 2, isSummer ? '#802010' : '#4a3040');
  px(ctx, barnX + 4, barnY + 2, 2, 3, '#3a2010');

  const treeY = gY - 8;
  function drawTree(tx, alive) {
    if (alive) {
      const tc = isSummer ? '#1a7a0a' : isSpring ? '#2a9a20' : isAutumn ? '#c04010' : '#5a4a5a';
      px(ctx, tx + 1, treeY, 2, 3, tc); px(ctx, tx, treeY + 1, 4, 3, tc);
      px(ctx, tx + 1, treeY + 4, 1, 2, '#7a4a15');
    } else {
      px(ctx, tx + 1, treeY, 1, 5, '#5a4a5a');
      px(ctx, tx, treeY + 1, 1, 1, '#5a4a5a'); px(ctx, tx + 2, treeY + 2, 1, 1, '#5a4a5a');
    }
  }

  drawTree(18, violations < 2);
  drawTree(28, violations < 3);
  drawTree(35, discipline > 40);

  const cropBase = gY + 2;
  const cropAlive = discipline > 50 && violations < 3;
  if (cropAlive && !isWinter) {
    const wheatCol = isSummer ? '#d4a020' : isAutumn ? '#b07010' : '#a06010';
    for (let i = 0; i < 6; i++) {
      const cx = 11 + i * 3;
      px(ctx, cx, cropBase - 3, 1, 1, wheatCol); px(ctx, cx, cropBase - 2, 1, 2, wheatCol); px(ctx, cx, cropBase, 1, 2, '#6a8820');
    }
    for (let i = 0; i < 5; i++) {
      const cx = 12 + i * 4;
      px(ctx, cx, cropBase + 4 - 2, 2, 2, '#28a040'); px(ctx, cx + 1, cropBase + 4 - 3, 1, 1, '#38c050'); px(ctx, cx + 1, cropBase + 4, 1, 1, '#5a4a15');
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const cx = 11 + i * 3;
      px(ctx, cx, cropBase - 1, 1, 1, '#5a4a30'); px(ctx, cx, cropBase, 1, 2, '#4a3a20');
    }
  }

  const animalY = gY + 1;
  const animalColors = {
    cow: { ok: '#e8e0c8', dark: '#d0c8b0', eye: '#202020', sick: '#7a7060' },
    chicken: { ok: '#d05020', dark: '#c04010', eye: '#ffee20', sick: '#6a4030' },
    sheep: { ok: '#f0f0f0', dark: '#e0e0e0', eye: '#303030', sick: '#909090' },
  };
  const animalSlots = [[20, animalY + 2], [24, animalY + 3], [31, animalY + 2], [36, animalY + 3], [40, animalY + 2], [44, animalY + 3]];
  const maxOrganisms = Math.min(organisms, 6);

  for (let a = 0; a < 6; a++) {
    if (a >= maxOrganisms) continue;
    const [ax, ay] = animalSlots[a];
    const type = a % 3 === 0 ? 'cow' : a % 3 === 1 ? 'chicken' : 'sheep';
    const alive = discipline > 30;
    const col = alive ? animalColors[type].ok : animalColors[type].sick;
    const dark = alive ? animalColors[type].dark : animalColors[type].sick;

    if (type === 'cow') {
      px(ctx, ax, ay, 3, 2, col); px(ctx, ax + 1, ay - 1, 1, 1, col);
      px(ctx, ax, ay + 2, 1, 1, dark); px(ctx, ax + 2, ay + 2, 1, 1, dark);
      if (alive) px(ctx, ax + 2, ay, 1, 1, animalColors[type].eye);
    } else if (type === 'chicken') {
      px(ctx, ax, ay, 2, 2, col); px(ctx, ax + 1, ay - 1, 2, 1, col);
      px(ctx, ax, ay + 2, 1, 1, dark); px(ctx, ax + 2, ay + 2, 1, 1, dark);
      if (alive) px(ctx, ax + 2, ay, 1, 1, animalColors[type].eye);
    } else {
      px(ctx, ax, ay, 2, 2, col); px(ctx, ax - 1, ay, 1, 1, col); px(ctx, ax + 1, ay - 1, 1, 1, dark);
      px(ctx, ax, ay + 2, 1, 1, dark); px(ctx, ax + 2, ay + 2, 1, 1, dark);
      if (alive) px(ctx, ax + 1, ay, 1, 1, animalColors[type].eye);
    }
  }

  if (isWinter) {
    ctx.fillStyle = 'rgba(200,210,240,0.18)';
    ctx.fillRect(0, 0, W, H);
    for (let s = 0; s < 30; s++) {
      const sx = Math.floor(rng(99, s) * cols) * P;
      const sy = Math.floor(rng(99, s + 1) * rows) * P;
      ctx.fillStyle = `rgba(240,245,255,${0.3 + rng(99, s + 2) * 0.4})`;
      ctx.fillRect(sx, sy, P, P);
    }
    ctx.fillStyle = 'rgba(200,215,240,0.25)';
    ctx.fillRect(0, gY * P, W, H - gY * P);
  }

  const fadeGrd = ctx.createLinearGradient(0, H * 0.55, 0, H);
  fadeGrd.addColorStop(0, 'rgba(10,13,26,0)');
  fadeGrd.addColorStop(1, 'rgba(10,13,26,0.85)');
  ctx.fillStyle = fadeGrd;
  ctx.fillRect(0, H * 0.55, W, H);
}

export function getFarmState(profile, violations) {
  const discipline = profile.violations?.week < 1 ? 90 : profile.violations?.week < 2 ? 70 : profile.violations?.week < 3 ? 50 : 30;
  const organisms = Math.max(0, Math.min(6, 6 - (profile.violations?.total || 0) % 7));
  const streak = profile.streak || 0;

  let season = 'summer';
  if (discipline < 40 || streak === 0) season = 'winter';
  else if (discipline < 60) season = 'autumn';
  else if (streak < 7) season = 'spring';

  return { season, discipline, violations: profile.violations?.week || 0, organisms, streak };
}
