// 에디터 -> 테스트 주행 -> 공유 링크 -> 링크 복원 전 과정 검증 (개발 전용)
const g = window.__game, E = g.editor, dt = 1/60;
const out = {};

// 1. 작은 맵을 하나 짓는다: 시작 발판 -> 간격 -> 중간 발판 -> 피니시 발판
E.enter([]);
E.ed.pieces = [
  {t:'s', x:0, y:3.2, z:26},
  {t:'p', x:0, y:0,  z:20, w:24, d:30, s:0, pil:1},
  {t:'c', x:0, y:3,  z:8},
  {t:'p', x:0, y:0,  z:-8, w:16, d:16, s:1, pil:1},
  {t:'c', x:0, y:3,  z:-8, v:10},
  {t:'k', x:0, y:0.8,z:-8, w:18, v:1},
  {t:'p', x:0, y:0,  z:-34, w:20, d:20, s:0, pil:1},
  {t:'f', x:0, y:0.8,z:-34}
];
E.rebuild();
out.validate = E.validate();
out.built = {solids:g.solids.length, coins:g.coins.length, cps:g.cpPoints.length, triggers:g.triggers.length};

// 2. 테스트 주행: 직접 몰아서 완주
E.test();
for(let i=0;i<20;i++) g.step(dt);
out.spawnedAt = g.player.pos.toArray().map(v=>+v.toFixed(1));
out.mapIdAfterTest = g.currentMap.id;
g.keys['KeyW'] = true; g.yaw = 0;
// 발판 끝(z=5, z=-16)에 닿기 전에 뛴다
let jumped = false, hold = 0;
for(let i=0;i<60*12 && g.state==='play'; i++){
  const z = g.player.pos.z;
  const nearEdge = (z < 9 && z > 2) || (z < -12 && z > -19);
  if(g.player.onGround && nearEdge && !jumped){
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
    jumped = true; hold = 20;
  }
  if(g.player.onGround && !nearEdge) jumped = false;
  if(hold > 0 && --hold === 0) window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));
  g.step(dt);
}
g.keys['KeyW'] = false;
out.testRun = {state:g.state, time:+g.time.toFixed(2), coins:g.player.cells};
out.ghostSaved = (localStorage.getItem('tankparkour.ghost.' + g.currentMap.id) || '').length;

// 3. 공유 링크 생성
const pieces = E.ed.pieces.map(p => Object.assign({}, p));
let ghost = null;
try{ ghost = JSON.parse(localStorage.getItem('tankparkour.ghost.' + E.mapId(pieces)) || 'null'); }catch(e){}
const url = await E.link(pieces, '테스트 맵', ghost);
out.link = {len:url.length, hasGhost:!!ghost, ghostSamples: ghost ? ghost.length/4 : 0};
out.url = url;

// 4. 링크를 다시 풀어서 원본과 같은지
const code = url.split('#m=')[1];
const back = await E.unpack(code);
out.roundTrip = {
  name: back.n,
  pieceCount: back.p.length,
  same: JSON.stringify(back.p) === JSON.stringify(pieces),
  ghostPacked: back.g ? back.g.length : 0
};

// 5. 기본 코스(172조각)를 링크로 만들면 얼마나 되는지 + 고스트까지 실었을 때
const def = window.__DEFAULT_PIECES || [];
const bigUrl = await E.link(def, '기본 코스', null);
const fakeGhost = [];
for(let i=0;i<20*60;i++) fakeGhost.push(i*0.3, 10+Math.sin(i/9)*4, -i*0.7, Math.sin(i/25));
const bigGhostUrl = await E.link(def, '기본 코스', fakeGhost);
out.defaultCourseLink = {pieces:def.length, kb:+(bigUrl.length/1024).toFixed(1)};
out.withGhost60s = {kb:+(bigGhostUrl.length/1024).toFixed(1)};

window.__edResult = out;
