// 이동 발판 구간이 스킨별로 "언젠가는" 건널 수 있는 구간인지 기하로 따진다 (개발 전용)
// 봇 실력과 무관하게, 발판 위상마다 필요한 도약 거리를 계산해서
// 각 스킨의 실측 점프 비거리 안에 들어오는 시간 비율을 낸다.
const g = window.__game;

// 실측값 (skin-test.js 결과)
const REACH = {
  '기본 도색': 22.1, '라임 소다': 24.8, '딸기 우유': 21.2,
  '심해': 21.6, '골드바': 20.1, '무지개': 25.8
};

const movers = g.movers.map(m => ({
  x0: m.s.base.x, z: m.s.base.z, amp: m.amp, sp: m.speed, ph: m.phase,
  hx: m.s.half.x, hz: m.s.half.z
}));
movers.sort((a,b) => b.z - a.z);

// 고정 발판: D(-208, 20x20) 와 F(-336, 22x20)
const fixed = {
  D: {x0:0, z:-208, amp:0, sp:0, ph:0, hx:10, hz:10},
  F: {x0:0, z:-336, amp:0, sp:0, ph:0, hx:11, hz:10}
};
const chain = [fixed.D, ...movers, fixed.F];
const posAt = (p, t) => p.x0 + (p.amp ? Math.sin(t*p.sp + p.ph) * p.amp : 0);

// 체공 0.81초 기준. 출발 발판 가장자리에서 뛰어 도착 발판 가장자리에 내린다고 본다.
const FLIGHT = 0.81;
function need(a, b, t){
  const xa = posAt(a, t), xb = posAt(b, t + FLIGHT);
  const dx = Math.abs(xb - xa);
  const dz = Math.abs(b.z - a.z);
  // 각 발판의 절반 크기만큼은 발판 위에서 벌 수 있다
  const gapZ = Math.max(0, dz - a.hz - b.hz);
  const gapX = Math.max(0, dx - a.hx - b.hx);
  return Math.hypot(gapX, gapZ);
}

const hops = [];
for(let i=0;i<chain.length-1;i++){
  const a = chain[i], b = chain[i+1];
  let minNeed = 1e9, maxNeed = 0;
  const samples = [];
  for(let k=0;k<2000;k++){
    const t = k * 0.02;                  // 40초를 훑는다 (주기보다 충분히 길다)
    const n = need(a, b, t);
    minNeed = Math.min(minNeed, n); maxNeed = Math.max(maxNeed, n);
    samples.push(n);
  }
  const row = {구간: a.z + ' -> ' + b.z, 최소필요: +minNeed.toFixed(1), 최대필요: +maxNeed.toFixed(1)};
  for(const name in REACH){
    const ok = samples.filter(n => n <= REACH[name]).length;
    row[name] = Math.round(ok / samples.length * 100) + '%';
  }
  hops.push(row);
}
window.__reachResult = hops;
