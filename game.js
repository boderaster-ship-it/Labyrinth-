(function(){
  // -------- Error Handling --------
  const errEl = document.getElementById('err');
  function showErr(msg){ errEl.textContent = msg; errEl.style.display='block'; }
  window.addEventListener('error', e=>showErr(String(e.message||e.error||e)));
  window.addEventListener('unhandledrejection', e=>showErr(String(e.reason||e)));

  try{
    const c=document.createElement('canvas');
    const gl=c.getContext('webgl')||c.getContext('experimental-webgl');
    if(!gl) throw new Error('WebGL deaktiviert.');
  }catch(e){ showErr(e.message); return; }

  // -------- DOM Elements --------
  const menu = document.getElementById('menu');
  const hud = document.getElementById('hud');
  const pad = document.getElementById('pad');
  const win = document.getElementById('win');
  const winText = document.getElementById('winText');
  const finalTimeEl = document.getElementById('finalTime');
  const nameEntry = document.getElementById('nameEntry');
  const playerName = document.getElementById('playerName');
  const submitScore = document.getElementById('submitScore');
  const scoreboard = document.getElementById('scoreboard');
  const topBtn = document.getElementById('topBtn');
  const backBtn = document.getElementById('backBtn');
  const menuBtn = document.getElementById('menuBtn');
  const timerEl = document.getElementById('timer');

  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }

  // -------- Game State --------
  let W=17,H=17;               // maze size
  const S=6;                   // cell size
  const WALL_H=4;              // wall height
  const WALL_T=0.3;            // wall thickness
  const EYE=1.6;               // eye height
  let maze=null, goal=null;
  let px=0,py=0,dirIdx=1,heading=0;
  let camPos=new THREE.Vector3();
  let anim=null;               // movement animation
  let viewMode='fp';           // 'fp' or 'top'
  let topViewAllowed=false;    // easy: always; medium: at pads
  let viewCells=[];            // medium mode: cells enabling top view
  let startTime=0;             // timer
  let timerInterval=null;      // timer interval id

  // -------- Three.js Setup --------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0f14,0.02);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 800);
  const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x0b0f14,1);
  document.body.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffffff,0x223344,0.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0e0,0.6); sun.position.set(40,60,20); scene.add(sun);

  // sky
  const skyGeo = new THREE.SphereBufferGeometry(400,24,12);
  const skyMat = new THREE.MeshBasicMaterial({side:THREE.BackSide,vertexColors:true});
  (function(){
    const cols=new Float32Array(skyGeo.attributes.position.count*3);
    for(let i=0;i<skyGeo.attributes.position.count;i++){
      const y=skyGeo.attributes.position.getY(i);
      const t=(y+400)/800; const r=0.04+0.10*t,g=0.06+0.14*t,b=0.10+0.30*t;
      cols[i*3]=r; cols[i*3+1]=g; cols[i*3+2]=b;
    }
    skyGeo.setAttribute('color',new THREE.BufferAttribute(cols,3));
  })();
  scene.add(new THREE.Mesh(skyGeo,skyMat));

  const floorMat = new THREE.MeshStandardMaterial({color:0x1e242b, roughness:0.95});
  let floor=null, wallsGroup=null, goalSprite=null;

  // -------- Maze Generation --------
  const DIRS=['N','E','S','W']; const DX=[0,1,0,-1]; const DY=[-1,0,1,0]; const OPP={N:'S',E:'W',S:'N',W:'E'};
  function genMaze(w,h){
    const cells=new Array(h);
    for(let y=0;y<h;y++){ cells[y]=new Array(w); for(let x=0;x<w;x++){ cells[y][x]={x,y,visited:false,walls:{N:true,E:true,S:true,W:true}}; } }
    const stack=[]; let cx=0,cy=0; cells[cy][cx].visited=true;
    while(true){
      const neigh=[];
      for(let d=0;d<4;d++){ const nx=cx+DX[d], ny=cy+DY[d]; if(nx>=0&&nx<w&&ny>=0&&ny<h&&!cells[ny][nx].visited) neigh.push({d,nx,ny}); }
      if(neigh.length){
        const pick=neigh[Math.random()*neigh.length|0];
        const dir=DIRS[pick.d];
        cells[cy][cx].walls[dir]=false;
        cells[pick.ny][pick.nx].walls[OPP[dir]]=false;
        stack.push({x:cx,y:cy});
        cx=pick.nx; cy=pick.ny; cells[cy][cx].visited=true;
      }else if(stack.length){ const s=stack.pop(); cx=s.x; cy=s.y; }
      else break;
    }
    return cells;
  }

  function cellCenter(x,y){ return new THREE.Vector3(originX + x*S + S/2, 0, originZ + y*S + S/2); }
  let originX=0, originZ=0;

  function buildMaze(){
    if(floor){ scene.remove(floor); floor.geometry.dispose(); }
    if(wallsGroup){ scene.remove(wallsGroup); }
    if(goalSprite){ scene.remove(goalSprite); }

    maze=genMaze(W,H);
    originX=-W*S/2; originZ=-H*S/2;

    floor=new THREE.Mesh(new THREE.PlaneBufferGeometry(W*S,H*S), floorMat);
    floor.rotation.x=-Math.PI/2; scene.add(floor);

    const wallMat=new THREE.MeshStandardMaterial({color:0x8aa2b4,roughness:0.8,metalness:0.05});
    const wallGeomX=new THREE.BoxBufferGeometry(S,WALL_H,WALL_T);
    const wallGeomZ=new THREE.BoxBufferGeometry(WALL_T,WALL_H,S);
    wallsGroup=new THREE.Group();
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const c=maze[y][x]; const ctr=cellCenter(x,y);
        if(c.walls.N){ const m=new THREE.Mesh(wallGeomX,wallMat); m.position.set(ctr.x,WALL_H/2,ctr.z-S/2); wallsGroup.add(m); }
        if(c.walls.W){ const m=new THREE.Mesh(wallGeomZ,wallMat); m.position.set(ctr.x-S/2,WALL_H/2,ctr.z); wallsGroup.add(m); }
        if(x===W-1 && c.walls.E){ const m=new THREE.Mesh(wallGeomZ,wallMat); m.position.set(ctr.x+S/2,WALL_H/2,ctr.z); wallsGroup.add(m); }
        if(y===H-1 && c.walls.S){ const m=new THREE.Mesh(wallGeomX,wallMat); m.position.set(ctr.x,WALL_H/2,ctr.z+S/2); wallsGroup.add(m); }
      }
    }
    scene.add(wallsGroup);

    const corners=[[0,0],[W-1,0],[0,H-1],[W-1,H-1]];
    do{ goal=corners[Math.random()*4|0]; }while(goal[0]===0 && goal[1]===0);
    goalSprite=makeGoalSprite('ZIEL');
    const gp=cellCenter(goal[0],goal[1]); goalSprite.position.set(gp.x,2.2,gp.z); scene.add(goalSprite);

    viewCells=[];
    if(currentDiff==='medium'){
      const count=Math.max(2, Math.round(Math.sqrt(W*H)/6));
      for(let i=0;i<count;i++) viewCells.push([Math.random()*W|0, Math.random()*H|0]);
    }

    px=0; py=0; dirIdx=1; heading=dirIdx*Math.PI/2; camPos=camPosForCell(px,py); camera.position.copy(camPos); lookFromHeading();
  }

  function makeGoalSprite(txt){
    const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=256; const ctx=canvas.getContext('2d');
    ctx.fillStyle='#102030'; ctx.fillRect(0,0,512,256);
    const grd=ctx.createLinearGradient(0,0,512,0); grd.addColorStop(0,'#35b2ff'); grd.addColorStop(1,'#6bffb5');
    ctx.strokeStyle=grd; ctx.lineWidth=10; ctx.strokeRect(8,8,512-16,256-16);
    ctx.font='bold 64px system-ui,-apple-system,Segoe UI,Roboto';
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,256,128);
    const tex=new THREE.CanvasTexture(canvas);
    const mat=new THREE.SpriteMaterial({map:tex,transparent:true}); const spr=new THREE.Sprite(mat); spr.scale.set(6,3,1); return spr;
  }

  function camPosForCell(cx,cy){ const c=cellCenter(cx,cy); return new THREE.Vector3(c.x,EYE,c.z); }
  function lookFromHeading(){ const dx=Math.sin(heading), dz=-Math.cos(heading); camera.lookAt(camPos.x+dx,EYE,camPos.z+dz); }

  function canMove(cx,cy,dir){ const c=maze[cy][cx]; if(dir===0) return !c.walls.N && cy>0; if(dir===1) return !c.walls.E && cx<W-1; if(dir===2) return !c.walls.S && cy<H-1; if(dir===3) return !c.walls.W && cx>0; return false; }

  function startTurn(left){ if(anim||viewMode==='top') return; const from=heading; dirIdx=(dirIdx+(left?3:1))%4; let to=dirIdx*Math.PI/2; let d=to-from; if(d>Math.PI) d-=2*Math.PI; if(d<-Math.PI) d+=2*Math.PI; to=from+d; anim={type:'turn',t:0,dur:180,from,to}; }

  function startMove(forward){ if(anim||viewMode==='top') return; const dir=dirIdx; const back=(dir+2)%4; const tryDir=forward?dir:back; if(!canMove(px,py,tryDir)){ blinkHUD('🧱'); return; } const dx=DX[tryDir],dy=DY[tryDir]; const nx=px+dx,ny=py+dy; const from=camPos.clone(); const to=camPosForCell(nx,ny); anim={type:'move',t:0,dur:240,from,to,nx,ny}; }

  let hudBlinkTimer=null; function blinkHUD(text){ clearTimeout(hudBlinkTimer); const old=hud.textContent; hud.textContent=text; hud.style.background='rgba(180,0,0,.6)'; hudBlinkTimer=setTimeout(()=>{ hud.textContent=old; hud.style.background='rgba(0,0,0,.35)'; },450); }

  // -------- Controls --------
  const btnUp=document.querySelector('#pad .up');
  const btnDown=document.querySelector('#pad .down');
  const btnLeft=document.querySelector('#pad .left');
  const btnRight=document.querySelector('#pad .right');
  const onTap=fn=>e=>{e.preventDefault(); fn();};
  btnUp.addEventListener('touchstart',onTap(()=>startMove(true)),{passive:false});
  btnDown.addEventListener('touchstart',onTap(()=>startMove(false)),{passive:false});
  btnLeft.addEventListener('touchstart',onTap(()=>startTurn(true)),{passive:false});
  btnRight.addEventListener('touchstart',onTap(()=>startTurn(false)),{passive:false});
  btnUp.addEventListener('mousedown',onTap(()=>startMove(true)));
  btnDown.addEventListener('mousedown',onTap(()=>startMove(false)));
  btnLeft.addEventListener('mousedown',onTap(()=>startTurn(true)));
  btnRight.addEventListener('mousedown',onTap(()=>startTurn(false)));

  window.addEventListener('keydown', e=>{ if(e.key==='ArrowUp')startMove(true); else if(e.key==='ArrowDown')startMove(false); else if(e.key==='ArrowLeft')startTurn(true); else if(e.key==='ArrowRight')startTurn(false); });

  topBtn.addEventListener('click',()=>enterTopView());
  backBtn.addEventListener('click',()=>exitTopView());
  menuBtn.addEventListener('click',()=>resetToMenu());

  // -------- Top View --------
  let savedHeading=0, savedPos=null;
  function enterTopView(){ if(viewMode==='top') return; viewMode='anim'; savedHeading=heading; savedPos=camPos.clone(); anim={type:'top',t:0,dur:400,from:camPos.clone(),to:new THREE.Vector3(0, Math.max(W,H)*S*0.9, 0)}; topBtn.style.display='none'; backBtn.style.display='block'; pad.style.display='none'; }
  function exitTopView(){ if(viewMode!=='top') return; viewMode='anim'; anim={type:'fp',t:0,dur:400,from:camPos.clone(),to:savedPos.clone(),fromHead:Math.PI/2,toHead:savedHeading}; backBtn.style.display='none'; pad.style.display='grid'; if(topViewAllowed || (currentDiff==='medium' && onViewCell(px,py))) topBtn.style.display='block'; }
  function onViewCell(x,y){ return viewCells.some(v=>v[0]===x && v[1]===y); }

  // -------- Timer & Leaderboard --------
  function startTimer(){ startTime=performance.now(); timerEl.style.display='block'; timerInterval=setInterval(()=>{ const t=(performance.now()-startTime)/1000; timerEl.textContent=t.toFixed(1)+'s'; },100); }
  function stopTimer(){ clearInterval(timerInterval); }

  submitScore.addEventListener('click', ()=>{
    const name=playerName.value.trim()||'Anonym';
    const time=parseFloat(finalTimeEl.textContent);
    fetch('/api/scores', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,time})})
      .then(()=>fetchScores());
    nameEntry.style.display='none';
  });
  function fetchScores(){ fetch('/api/scores').then(r=>r.json()).then(list=>{ scoreboard.innerHTML='<h3>Bestenliste</h3>'+list.map(s=>`<div>${s.name} - ${s.time.toFixed(2)}s</div>`).join(''); }); }
  function showWin(){ stopTimer(); const t=(performance.now()-startTime)/1000; finalTimeEl.textContent=t.toFixed(2); win.style.display='flex'; fetchScores(); }
  win.addEventListener('click', e=>{ if(e.target===win){ resetToMenu(); }});

  // -------- Menu & Game Start --------
  let currentDiff='easy';
  menu.addEventListener('click', e=>{ if(e.target.tagName==='BUTTON'){ currentDiff=e.target.dataset.diff; startGame(); }});

  function startGame(){
    if(currentDiff==='easy'){ W=11; H=11; topViewAllowed=true; }
    else if(currentDiff==='medium'){ W=17; H=17; topViewAllowed=false; }
    else { W=25; H=25; topViewAllowed=false; }
    menu.style.display='none'; hud.textContent='FPV-Labyrinth'; timerEl.textContent='0.0s'; menuBtn.style.display='block'; pad.style.display='grid'; if(topViewAllowed) topBtn.style.display='block'; else topBtn.style.display='none'; buildMaze(); startTimer(); }

  function resetToMenu(){ win.style.display='none'; menu.style.display='flex'; scoreboard.innerHTML=''; nameEntry.style.display='block'; playerName.value=''; timerEl.style.display='none'; menuBtn.style.display='none'; pad.style.display='none'; topBtn.style.display='none'; backBtn.style.display='none'; viewMode='fp'; clearInterval(timerInterval); }

  // -------- Render Loop --------
  let last=performance.now();
  function loop(now){
    const dt=now-last; last=now; const t=now*0.0007; sun.position.set(Math.sin(t)*60,60,Math.cos(t)*40);
    if(anim){
      anim.t+=dt/anim.dur; const k=anim.t<1?(1-Math.cos(anim.t*Math.PI))/2:1;
      if(anim.type==='turn'){ heading=anim.from+(anim.to-anim.from)*k; camera.position.copy(camPos); lookFromHeading(); }
      else if(anim.type==='move'){ camPos.lerpVectors(anim.from,anim.to,k); camera.position.copy(camPos); lookFromHeading(); }
      else if(anim.type==='top'){ camera.position.lerpVectors(anim.from,anim.to,k); camera.lookAt(0,0,0); heading=Math.PI/2; camPos.copy(camera.position); if(anim.t>=1){ viewMode='top'; } }
      else if(anim.type==='fp'){ camera.position.lerpVectors(anim.from,anim.to,k); heading=anim.fromHead+(anim.toHead-anim.fromHead)*k; camPos.copy(camera.position); lookFromHeading(); if(anim.t>=1){ viewMode='fp'; } }
      if(anim.t>=1){
        if(anim.type==='move'){
          px=anim.nx; py=anim.ny;
          if(px===goal[0] && py===goal[1]) showWin();
          if(currentDiff==='medium'){ if(onViewCell(px,py)) topBtn.style.display='block'; else topBtn.style.display='none'; }
        }
        anim=null;
      }
    }
    renderer.render(scene,camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('resize',()=>{ camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight); });

})();
