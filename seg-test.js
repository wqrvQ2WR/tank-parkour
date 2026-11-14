// 특정 구간을 여러 번 돌려 통과율을 본다 (개발 전용)
const g = window.__game, dt = 1/60, pl = g.player;
const NODES = window.__SEGNODES;
function groundAt(p){
  for(const s of g.solids){
    const l = p.clone().sub(s.mesh.position).applyQuaternion(s.inv);
    if(Math.abs(l.x) < s.half.x+1.3 && Math.abs(l.z) < s.half.z+1.3 && Math.abs(l.y) < s.half.y+4.5) return true;
  }
  return false;
}
function run(a, b, boost){
  g.start(); for(let k=0;k<10;k++) g.step(dt);
  pl.pos.set(a[0], a[1]+0.4, a[2]); pl.vel.set(0,0,0); pl.cp = 99;
  for(let k=0;k<12;k++) g.step(dt);
  g.keys['KeyW'] = true; g.keys['ShiftLeft'] = !!boost;
  let jumped = false, best = 1e9, landed = null;
  for(let k=0;k<60*8;k++){
    const dx=b[0]-pl.pos.x, dz=b[2]-pl.pos.z, d=Math.hypot(dx,dz)||1e-3;
    g.yaw = Math.atan2(-dx,-dz);
    if(pl.onGround){
      if(!jumped){
        for(const look of [6,10]){
          const ah = pl.pos.clone(); ah.x += dx/d*look; ah.z += dz/d*look;
          if(!groundAt(ah)){ window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'})); jumped = true; break; }
        }
      }
    } else jumped = false;
    g.step(dt);
    const dd = Math.hypot(b[0]-pl.pos.x, b[2]-pl.pos.z);
    if(dd < best) best = dd;
    // 목표 발판 위에 실제로 서 있으면 성공
    if(pl.onGround && pl.pos.y > b[1]-6 && dd < 20){ landed = {dd:+dd.toFixed(1), y:+pl.pos.y.toFixed(1)}; break; }
    if(pl.pos.y < b[1]-45) break;
  }
  g.keys['KeyW']=false; g.keys['ShiftLeft']=false;
  return {ok: !!landed, minDist:+best.toFixed(1), landed};
}
const out = {};
for(const [name, a, b, boost] of window.__SEGCASES){
  const r = [];
  for(let i=0;i<5;i++) r.push(run(a, b, boost));
  out[name] = {passes: r.filter(x=>x.ok).length + '/5', runs: r.map(x=>x.ok ? 'ok' : 'fail@'+x.minDist)};
}
window.__segResult = out;
