// 반동/조준 검증 (개발 전용)
const g = window.__game, dt = 1/60;
const V = g.tank.root.position.constructor;
g.start(); for(let i=0;i<20;i++) g.step(dt);

const dirs = [];
for(const p of [-0.9, 0, 0.5]){
  g.pitch = p; g.yaw = 0;
  for(let i=0;i<3;i++) g.step(dt);
  const mp = new V(), gp = new V();
  g.tank.muzzlePos.getWorldPosition(mp);
  g.tank.gun.getWorldPosition(gp);
  dirs.push({pitch:p, gunDirY:+mp.sub(gp).normalize().y.toFixed(3)});
}

function launch(pitch){
  g.player.pos.set(0, 1.85, -16); g.player.vel.set(0,0,0);
  g.player.shells = 3; g.player.fireCd = 0;
  g.pitch = pitch; g.yaw = 0;
  for(let i=0;i<10;i++) g.step(dt);
  const y0 = g.player.pos.y;
  window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyF'}));
  let peak = y0;
  for(let i=0;i<400;i++){ g.step(dt); peak = Math.max(peak, g.player.pos.y); }
  return {pitch, from:+y0.toFixed(1), peak:+peak.toFixed(1), rise:+(peak-y0).toFixed(1)};
}

window.__recoilResult = {
  gunDirs: dirs,
  straightDown: launch(-0.95),
  angled: launch(-0.6),
  level: launch(0)
};
