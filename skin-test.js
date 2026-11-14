// 스킨별 실제 성능 측정 (개발 전용)
// 발판 길이가 모자라 떨어지지 않게, 마지막 큰 발판(40x64) 위에서 위치를 되감아 가며 잰다.
const g = window.__game, dt = 1/60, pl = g.player;
const PAD_Y = 37.85, Z_FAR = -838, Z_NEAR = -792;   // 발판 z 범위 -844..-780
// x=17로 달리는 이유: 피니시 트리거(x 반폭 13)에 들어가면 완주 처리돼서 물리가 멈춘다.
// z를 -792부터 잡는 이유: -771~-783에 동전 아치가 있어 되감을 때마다 주워 부스터가 찬다.
const LANE_X = 17;

function reset(){
  g.keys['KeyW'] = g.keys['KeyS'] = g.keys['KeyA'] = g.keys['KeyD'] = false;
  g.keys['ShiftLeft'] = g.keys['ShiftRight'] = g.keys['Space'] = false;
  g.start(); for(let k=0;k<12;k++) g.step(dt);
  pl.pos.set(LANE_X, PAD_Y, Z_NEAR); pl.vel.set(0,0,0); g.yaw = 0; g.pitch = -0.16;
  for(let k=0;k<20;k++) g.step(dt);
}
// 발판 끝에 닿으면 앞쪽으로 되감는다. 속도는 그대로 유지된다.
function treadmill(){ if(pl.pos.z < Z_FAR) pl.pos.z = Z_NEAR; }
function alive(){ return g.state === 'play'; }

function topSpeed(boost){
  reset();
  g.keys['KeyW'] = true; g.keys['ShiftLeft'] = !!boost;
  let top = 0, t90 = null;
  for(let i=0;i<60*6;i++){
    g.step(dt); treadmill();
    if(pl.onGround) top = Math.max(top, Math.hypot(pl.vel.x, pl.vel.z));
  }
  reset();
  g.keys['KeyW'] = true; g.keys['ShiftLeft'] = !!boost;
  for(let i=0;i<60*6;i++){
    g.step(dt); treadmill();
    if(Math.hypot(pl.vel.x, pl.vel.z) >= top*0.9){ t90 = i/60; break; }
  }
  g.keys['KeyW'] = false; g.keys['ShiftLeft'] = false;
  return {top:+top.toFixed(1), t90: t90 === null ? null : +t90.toFixed(2)};
}

function jumpHeight(){
  reset();
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
  let peak = pl.pos.y;
  for(let i=0;i<140;i++){ g.step(dt); peak = Math.max(peak, pl.pos.y); }
  window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));
  return +(peak - PAD_Y).toFixed(2);
}

function jumpDistance(){
  reset();
  g.keys['KeyW'] = true;
  for(let i=0;i<60*3;i++){ g.step(dt); treadmill(); }   // 최고속까지
  pl.pos.z = Z_NEAR;   // 활주로 확보하고 뛴다
  const z0 = pl.pos.z;
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
  let hold = 25, airFrames = 0, dist = 0;
  for(let i=0;i<240;i++){
    if(hold > 0 && --hold === 0) window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));
    g.step(dt);
    if(!pl.onGround) airFrames++;
    // 한 프레임 접지가 끊기는 건 착지가 아니다. 충분히 떠 있다 내려앉아야 착지로 친다.
    else if(airFrames > 8){ dist = Math.abs(pl.pos.z - z0); break; }
    else airFrames = 0;
  }
  g.keys['KeyW'] = false;
  return +dist.toFixed(1);
}

function recoilRise(){
  reset();
  pl.shells = 3; pl.fireCd = 0; g.pitch = -0.95;
  for(let i=0;i<8;i++) g.step(dt);
  const y0 = pl.pos.y;
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF'}));
  let peak = y0;
  for(let i=0;i<400;i++){ g.step(dt); peak = Math.max(peak, pl.pos.y); }
  g.pitch = -0.16;
  return +(peak - y0).toFixed(1);
}

function boostSeconds(){
  reset();
  pl.boost = 100;
  g.keys['KeyW'] = true; g.keys['ShiftLeft'] = true;
  let t = 0;
  for(let i=0;i<60*20 && pl.boost > 0.5; i++){ g.step(dt); treadmill(); t += dt; }
  g.keys['KeyW'] = false; g.keys['ShiftLeft'] = false;
  return +t.toFixed(2);
}

function boostRefillSeconds(){
  reset();
  pl.boost = 0;
  let t = 0;
  for(let i=0;i<60*30 && pl.boost < 99.5; i++){ g.step(dt); t += dt; }
  return +t.toFixed(1);
}

const out = {};
for(const k of g.SKINS){
  g.applySkin(k.id);
  const ts = topSpeed(false), bs = topSpeed(true);
  out[k.name] = {
    '최고속': ts.top, '부스터속': bs.top, '0->90%초': ts.t90,
    '점프높이': jumpHeight(), '점프비거리': jumpDistance(),
    '반동높이': recoilRise(),
    '부스터지속': boostSeconds(), '부스터충전': boostRefillSeconds()
  };
}
g.applySkin(g.store.skin);
window.__skinResult = out;
