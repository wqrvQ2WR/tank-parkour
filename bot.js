// 코스 구간별 통과 검증 (개발 전용). 각 노드에서 다음 노드까지 실제로 갈 수 있는지 시뮬레이션한다.
const g = window.__game, dt = 1/60, pl = g.player;

// [x, y(탱크 중심), z, 라벨, 부스터필요?]
const NODES = [
  [0, 1.85,   10, 'A 스타트'],
  [0, 1.85,  -16, 'B1'],
  [0, 1.85,  -42, 'B2'],
  [0, 3.05,  -68, 'B3 / CP1'],
  [9, 3.05,  -92, 'C1'],
  [-9, 4.65, -114,'C2'],
  [9, 6.25,  -136,'C3'],
  [-9, 7.85, -158,'C4'],
  [9, 9.45,  -180,'C5'],
  [0, 10.35, -208,'D / CP2'],
  [0, 10.35, -232,'E1 이동발판'],
  [0, 10.35, -256,'E2 이동발판'],
  [0, 10.35, -280,'E3 이동발판'],
  [0, 10.35, -304,'E4 이동발판'],
  [0, 10.35, -336,'F / CP3'],
  [0, 18.85, -390,'G 램프위', true],
  [0, 18.85, -430,'H 대점프 / CP4', true],
  [0, 18.85, -476,'I 회전광장'],
  [0, 18.85, -518,'J1 외줄'],
  [5, 18.85, -542,'J2 외줄'],
  [-5,18.85, -566,'J3 외줄'],
  [0, 18.85, -590,'J4 외줄'],
  [0, 18.85, -616,'K / CP5'],
  [-7,31.85,-636,'L1 점프패드'],
  [7, 43.85,-652,'L2 점프패드'],
  [0,  55.85,-670,'L3 타워정상 / CP6'],
  [0,  37.85,-756,'M 활강착지'],
  [0,  37.85,-812,'N 피니시']
];

function groundAt(p){
  for(const s of g.solids){
    const l = p.clone().sub(s.mesh.position).applyQuaternion(s.inv);
    if(Math.abs(l.x) < s.half.x+1.3 && Math.abs(l.z) < s.half.z+1.3 && Math.abs(l.y) < s.half.y+4.5) return true;
  }
  return false;
}

function run(i, boost){
  const a = NODES[i], b = NODES[i+1];
  g.start();
  for(let k=0;k<10;k++) g.step(dt);
  // 출발점이 이동 발판이면 기준 좌표(x=0)가 아니라 지금 그 발판이 있는 자리에 올린다
  const srcMv = g.movers.find(m => Math.abs(m.s.base.z - a[2]) < 1);
  pl.pos.set(srcMv ? srcMv.s.mesh.position.x : a[0], a[1]+0.4, a[2]);
  pl.vel.set(0,0,0); pl.cp = 0;
  for(let k=0;k<12;k++) g.step(dt);
  g.keys['KeyW'] = true; g.keys['ShiftLeft'] = !!boost;
  const startDist = Math.hypot(b[0]-a[0], b[2]-a[2]);
  let jumpedThisContact = false, ok = false, minDist = 1e9, holdSpace = 0;
  for(let k=0;k<60*7;k++){
    let bx=b[0], bz=b[2];
    const mv = g.movers.find(m => Math.abs(m.s.base.z - b[2]) < 1);
    if(mv){
      // 도착까지 걸릴 시간만큼 앞을 내다본다. 사람이 발판을 리드해서 뛰는 것과 같다.
      const rough = Math.hypot(b[0]-pl.pos.x, b[2]-pl.pos.z) / 24;
      const t2 = g.elapsed + Math.min(1.4, rough);
      bx = mv.s.base.x + Math.sin(t2 * mv.speed + mv.phase) * mv.amp;
    }
    const dx=bx-pl.pos.x, dz=bz-pl.pos.z, d=Math.hypot(dx,dz)||1e-3;
    g.yaw = Math.atan2(-dx,-dz);
    // 목표에 가까워지면 가속을 놓는다. 계속 밟고 있으면 발판을 지나쳐 버린다.
    // 단 움직이는 발판은 계속 도망가니까 끝까지 밟는다.
    g.keys['KeyW'] = mv ? true : (d > 9);
    if(pl.onGround){
      if(!jumpedThisContact){
        for(const look of [6,10]){
          const ah = pl.pos.clone(); ah.x += dx/d*look; ah.z += dz/d*look;
          if(!groundAt(ah)){
            window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
            holdSpace = 20;   // 정점까지 누르고 있는다
            jumpedThisContact = true; break;
          }
        }
      }
    } else { jumpedThisContact = false; }
    if(holdSpace > 0 && --holdSpace === 0) window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));
    g.step(dt);
    if(g.state === 'done'){ ok = true; break; }   // 피니시 게이트를 통과했으면 그게 성공이다
    const dd = Math.hypot(bx-pl.pos.x, bz-pl.pos.z);
    if(dd < minDist) minDist = dd;
    // 목표 높이에 서 있고, 출발점에서 목표 쪽으로 절반 넘게 왔으면 통과
    if(pl.onGround && pl.pos.y > b[1]-6 && dd < startDist*0.45){ ok = true; break; }
    if(pl.pos.y < b[1]-45) break;
  }
  g.keys['KeyW']=false; g.keys['ShiftLeft']=false;
  return {ok, minDist:+minDist.toFixed(1), end:pl.pos.toArray().map(v=>+v.toFixed(1))};
}

function runAll(){
  const out = [];
  for(let i=0;i<NODES.length-1;i++){
    let r = run(i, false);
    if(!r.ok){ const rb = run(i, true); if(rb.ok){ r = rb; r.neededBoost = true; } }
    out.push({seg: NODES[i][3] + ' -> ' + NODES[i+1][3], pass: r.ok, boost: !!r.neededBoost, minDist: r.minDist, end: r.end});
  }
  return out;
}

// 스킨마다 능력치가 다르니 스킨별로 코스를 다 돌려본다.
// 못 깨는 스킨이 하나라도 있으면 그건 상점에 올리면 안 되는 스킨이다.
if(window.__botSkins){
  const bySkin = {};
  for(const k of g.SKINS){
    g.applySkin(k.id);
    const res = runAll();
    const fails = res.filter(o => !o.pass);
    bySkin[k.name] = {pass: res.length - fails.length + '/' + res.length, fails: fails.map(f => f.seg + ' @' + f.minDist)};
  }
  g.applySkin(window.__game.store.skin);
  window.__botResult = {bySkin};
} else {

const out = runAll();
// --- 전체 코스 한 번에 완주 시도 ---
function fullRun(maxSec){
  g.start(); for(let k=0;k<20;k++) g.step(dt);
  let wi = 1, jumpedThisContact = false, t = 0, respawns = 0, lastCp = 0, stall = 0, worstStall = {node:'', s:0}, holdSpace = 0;
  g.keys['KeyW'] = true;
  for(let k=0;k<60*maxSec;k++){
    const b = NODES[Math.min(wi, NODES.length-1)];
    let bx = b[0], bz = b[2];
    for(const s2 of g.solids){ if(Math.abs(s2.base.z-b[2])<1 && Math.abs(s2.base.x)<1 && s2.mesh.position.x!==s2.base.x){ bx = s2.mesh.position.x; break; } }
    const dx = bx-pl.pos.x, dz = bz-pl.pos.z, d = Math.hypot(dx,dz)||1e-3;
    if(d < 11 && Math.abs(pl.pos.y - b[1]) < 7 && wi < NODES.length-1){ wi++; stall = 0; }
    g.yaw = Math.atan2(-dx,-dz);
    g.keys['ShiftLeft'] = (wi===15 || wi===16);
    if(pl.onGround){
      if(!jumpedThisContact){
        for(const look of [6,10]){
          const ah = pl.pos.clone(); ah.x += dx/d*look; ah.z += dz/d*look;
          if(!groundAt(ah)){
            window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
            holdSpace = 20;  // 멀리 뛸 땐 정점까지 누르고 있는다
            jumpedThisContact = true; break;
          }
        }
      }
    } else jumpedThisContact = false;
    if(holdSpace > 0 && --holdSpace === 0) window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));
    const py = pl.pos.y;
    g.step(dt); t += dt; stall += dt;
    if(stall > worstStall.s) worstStall = {node: NODES[Math.min(wi,NODES.length-1)][3], s:+stall.toFixed(1)};
    if(pl.pos.y > py + 30){
      respawns++;
      let best = 0, bd = 1e9;
      for(let n=0;n<NODES.length;n++){ const dd2 = Math.hypot(NODES[n][0]-pl.pos.x, NODES[n][2]-pl.pos.z); if(dd2 < bd){ bd = dd2; best = n; } }
      wi = Math.min(best+1, NODES.length-1);
    }
    if(g.state === 'done') break;
  }
  g.keys['KeyW'] = false; g.keys['ShiftLeft'] = false;
  return {state:g.state, raceTime:+g.time.toFixed(2), reached:NODES[Math.min(wi,NODES.length-1)][3],
          respawns, cp:pl.cp, cells:pl.cells+'/'+g.cells.length, worstStall, simSeconds:+t.toFixed(1)};
}
window.__botResult = {fails: out.filter(o=>!o.pass), passCount: out.filter(o=>o.pass).length, total: out.length,
                      full: (window.__botFull === false ? 'skipped' : fullRun(window.__botFull || 180)), all: out};
}
