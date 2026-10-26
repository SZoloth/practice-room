// ---------- video lessons and their exercises ----------
// Loaded before the main script, so everything here is a definition: it runs only once the app calls it.
// The exercises are Bill Hilton's own, taken from what he says in each lesson. His worksheets are PDFs the app
// can't load, so lines of notes and rhythms are generated fresh each time in the same ranges and style.

// Playlist order. Slot 6 is Supplementary Lesson A, so after lesson 5 the slot number is one ahead of the lesson number.
const LESSONS=[
  {n:"1",title:"The piano keyboard",vid:"QBH6IpRkVDs"},
  {n:"2",title:"Starting to read music",vid:"3BULT0-joT0"},
  {n:"3",title:"Reading a melody",vid:"NUVQIwO1SEI"},
  {n:"4",title:"The left hand and the scale of C major",vid:"f9JI_5y0K68"},
  {n:"5",title:"Learning a piece",vid:"1JVtPB8VJXE"},
  {n:"A",title:"Supplementary lesson A",vid:null},
  {n:"6",title:"A new piece, a new scale, and rests",vid:"yeP2qRcHuUM"},
  {n:"7",title:"Quavers (eighth notes) and accidentals",vid:"3UetN01yPTs"},
  {n:"8",title:"A new piece, phrase marks and ritenuto",vid:"7x20caWKKkQ"},
  {n:"9",title:"The concept of musical key",vid:"aU3VEy-4qwM"},
  {n:"10",title:"More scales, and playing staccato"},{n:"11",title:"Three pieces to learn"},{n:"12",title:"Rhythm reading and new scales"},
  {n:"13",title:"2/4 time and semiquavers (16th notes)"},{n:"14",title:"Compound time"},{n:"15",title:"Minuet in G"},
  {n:"16",title:"Broken chord exercises",vid:"-D9HVd0ZaPk"},{n:"17",title:"Learning a blues piece"},{n:"18",title:"How to play Für Elise"},
  {n:"19",title:"New scales and scale theory"},{n:"20",title:"A new piece, Prelude in F"},{n:"21",title:"What to do next"},
];
const lessonAt=pos=>LESSONS[pos-1]||{n:String(pos),title:""};
const lessonLabel=pos=>{const L=lessonAt(pos);return L.n==="A"?"Supplementary lesson A":`Lesson ${L.n}`};
function lessonFrame(pos){
  const L=lessonAt(pos), frame=el("div",{class:"video"});
  const src=L.vid?`https://www.youtube-nocookie.com/embed/${L.vid}`:`https://www.youtube-nocookie.com/embed/videoseries?list=${PLAYLIST}&index=${pos}`;
  frame.innerHTML=`<iframe src="${src}" title="Bill Hilton, ${lessonLabel(pos)}: ${L.title}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  return frame;
}
function lessonBody(c){
  const n=S.lesson||1, xs=EXERCISES.filter(x=>x.lesson===n);
  const list=el("div",{class:"panel",style:"gap:8px"}), stage=el("div",{class:"panel",hidden:true});
  const passed=xs.filter(x=>exStatus(x.id)==="mastered").length;
  c.append(el("p",{class:"muted"},lessonAt(n).title),
    el("p",{},"Watch with the piano in front of you. Pause and copy everything he plays."),lessonFrame(n));
  if(xs.length){
    c.append(el("h3",{},"This lesson's exercises"),
      el("p",{class:"small muted"},"Bill's exercises, made interactive. The app listens through the mic and moves you on when it hears it right. Each one counts as learned once you pass it on two different days."),list,stage);
    const show=()=>{abortExercise();stage.hidden=true;list.hidden=false;list.replaceChildren(...xs.map(x=>exRow(x,()=>{list.hidden=true;stage.hidden=false;startExercise(x,stage,show)})))};
    show();
  } else if(lessonAt(n).n==="A") c.append(el("p",{class:"small muted"},"No interactive exercises for this one yet. Play along with the video."));
  c.append(el("div",{class:"row"},
      el("button",{class:"btn",onclick:()=>{S.lesson=n+1;save();renderToday()}},`On to ${lessonLabel(n+1)}`),
      el("span",{class:"small muted"},xs.length?`${passed} of ${xs.length} exercises learned. Move on when you can play the lesson's examples.`:`Tap when you can play the lesson's examples.`)));
}
function lessonDrills(){ // Drills tab: every lesson's exercises; lessons you haven't reached yet fold away
  const cur=S.lesson||1, list=el("div",{class:"panel"}), stage=el("div",{class:"block",hidden:true});
  const show=()=>{
    abortExercise(); stage.hidden=true; list.hidden=false; list.replaceChildren();
    const later=el("details",{class:"later"},el("summary",{},"Later lessons"));
    for(const g of [...new Set(EXERCISES.map(x=>x.lesson))]){
      const box=el("div",{class:"block"},el("div",{class:"eyebrow"},`${lessonLabel(g)} · ${lessonAt(g).title}`),
        ...EXERCISES.filter(x=>x.lesson===g).map(x=>exRow(x,()=>{list.hidden=true;stage.hidden=false;startExercise(x,stage,show)})));
      (g<=cur?list:later).append(box);
    }
    if(later.children.length>1) list.append(later);
  };
  show();
  return el("div",{class:"panel"},el("h2",{},"From the video lessons"),list,stage);
}
function exRow(x,onStart){
  const e=(S.ex||{})[x.id];
  return el("div",{class:"exrow","data-ex":x.id},
    el("div",{},el("b",{},x.name)," ",exPill(x.id),el("div",{class:"small muted"},x.blurb+(e&&e.last?` Last try: ${e.last.summary}`:""))),
    el("button",{class:"btn primary",onclick:onStart},"Start"));
}
const exPill=id=>{const st=exStatus(id);return el("span",{class:"pill "+({new:"locked",learning:"learning",mastered:"mastered"})[st]},{new:"Not started",learning:"Learning",mastered:"Learned"}[st])};
function ex(id){ S.ex=S.ex||{}; return S.ex[id]||(S.ex[id]={passDays:[],tries:0}); }
function exStatus(id){ const e=(S.ex||{})[id]; return !e||!e.tries?"new":e.passDays.length>=2?"mastered":"learning"; }
function exRecord(x,pass,summary){
  const e=ex(x.id); e.tries++; e.last={date:TODAY,pass,summary};
  if(pass&&!e.passDays.includes(TODAY)) e.passDays.push(TODAY);
  (todayLog.exercises=todayLog.exercises||[]).push({id:x.id,pass,summary});
  save();
}

// ---------- shared pieces ----------
let EXSTOP=null; // cleanup for whichever exercise is running
function abortExercise(){ const f=EXSTOP; EXSTOP=null; if(f) f(); }
const median=a=>{const s=[...a].sort((x,y)=>x-y),h=s.length>>1;return s.length%2?s[h]:(s[h-1]+s[h])/2};
const sameKey=(heard,want)=>heard===want||(want<48&&heard===want+12); // low notes: phone mics often catch the octave above
const SHARPS=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const sharpName=m=>SHARPS[((m%12)+12)%12]+(Math.floor(m/12)-1); // the lessons so far only use sharps
function spelled(line,i){ const e=line.ev[i], a=lineMidis(line)[i]-dToMidi(e.d); return LETTERS[e.d%7]+({1:"♯","-1":"♭"}[a]||"")+Math.floor(e.d/7); }
const FINGER=["","thumb","index","middle","ring","pinky"];
const fingerName=f=>`finger ${f} (${FINGER[f]})`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function startExercise(x,box,back){
  abortExercise(); box.replaceChildren();
  const body=el("div",{class:"panel",style:"gap:10px"});
  box.append(el("div",{class:"block-head"},el("h3",{},x.name),el("button",{class:"btn",onclick:()=>{abortExercise();back()}},"Back to the list")),
    el("p",{},x.how),body);
  const go=el("button",{class:"btn primary",onclick:async()=>{
    go.disabled=true; go.textContent="Starting the mic…";
    if(x.engine!==runQuiz&&!await earOn()){ go.remove(); body.append(el("p",{class:"banner"},"The app couldn't use your mic. Allow microphone access for this site and reload. You can still play along with the video.")); return; }
    go.remove(); x.engine(body,x,(pass,summary)=>{
      exRecord(x,pass,summary); renderAllLater();
      body.append(el("div",{class:"exdone "+(pass?"good":"bad")},el("b",{},pass?"Passed. ":"Not yet. "),summary,
        el("div",{class:"small",style:"margin-top:4px"},pass?(ex(x.id).passDays.length>=2?"Learned: you've passed it on two different days.":"Pass it again on another day to lock it in."):"It's logged. Try again now or tomorrow."),
        el("div",{class:"row",style:"margin-top:8px"},el("button",{class:"btn primary",onclick:()=>startExercise(x,box,back)},"Go again"),el("button",{class:"btn",onclick:back},"Back to the list"))));
    });
  }},"Start");
  body.append(el("div",{class:"row"},go));
}
// Watch the mic; returns a stop function.
function listenFor(fn){ const un=earListen(fn); return un; }

// ---------- engine: find a letter (lesson 1, levels 1 to 4) ----------
function runFind(box,x,done){
  const slow=ex(x.id).slow||[];
  let prompts;
  if(x.mode==="finger") prompts=["Right","Left"].flatMap(hand=>[1,2,3,4,5].map(f=>({hand,f,L:pick(LETTERS)})));
  else { // all seven letters, plus your two slowest from last time
    let bag; for(let k=0;k<20;k++){ bag=shuffle([...LETTERS,...slow.slice(0,2)]); if(bag.every((L,i)=>L!==bag[i-1])) break; }
    prompts=bag.map(L=>({L}));
  }
  const hand={rh:"Right hand, any finger",lh:"Left hand, any finger",both:"Both hands at once, one finger each"}[x.mode];
  const letter=el("div",{class:"exletter"}), sub=el("div",{class:"muted"}), dots=el("div",{class:"dots"});
  const msg=el("p",{class:"small",role:"status"}), prog=el("div",{class:"small muted mono"});
  const skip=el("button",{class:"btn",onclick:()=>{skipped++;advance()}},"Skip this one");
  box.append(el("div",{class:"drill-stage"},prog,letter,sub,dots,msg),el("div",{class:"row"},skip));
  let i=-1, hits=[], shownAt=0, wrong=0, notes=0, skipped=0, apart=0, pair=null, pairT=null, busy=false;
  const times={};
  const un=listenFor(n=>{
    if(busy||i<0||n.t<shownAt) return;
    if(x.mode==="both"){ // two hands landing within ~120ms are one press
      if(pair&&n.t-pair.t<.12){ if(n.t-pair.t>.06) pair.apart=true; if(n.midi!=null) pair.midis.push(n.midi); return; }
      if(n.soft) return;
      pair={t:n.t,midis:n.midi!=null?[n.midi]:[],apart:false}; clearTimeout(pairT);
      pairT=setTimeout(()=>{const p=pair;pair=null;if(p.apart)apart++;judge(p.t,p.midis.find(m=>pcName(m)===prompts[i].L)??p.midis[0],p.apart)},160);
      return;
    }
    if(n.soft||n.midi==null) return;
    judge(n.t,n.midi,false);
  });
  EXSTOP=()=>{un();clearTimeout(pairT)};
  function judge(t,midi,wasApart){
    if(midi==null) return;
    const want=prompts[i].L;
    notes++;
    if(pcName(midi)!==want){ wrong++; msg.className="small bad"; msg.textContent=`That was ${sharpName(midi)}. Find ${an(want)} ${want}.`; return; }
    if((x.mode==="rh"||x.mode==="lh")&&hits.length&&hits[hits.length-1]===midi){ notes--; msg.className="small warn"; msg.textContent=`Same key again. Find a different ${want}, higher or lower.`; return; }
    if(!hits.length) times[want]=Math.max(times[want]||0,t-shownAt);
    hits.push(midi); drawDots();
    msg.className="small "+(wasApart?"warn":"good"); msg.textContent=wasApart?"Heard it, but your hands landed apart. Press both at the same moment.":"✓";
    if(hits.length===4){ busy=true; msg.textContent=`✓ Four ${want}s.`; setTimeout(advance,500); }
  }
  function drawDots(){ dots.replaceChildren(...[0,1,2,3].map(k=>el("span",{class:"dot"+(hits[k]!=null?" on":"")},hits[k]!=null?sharpName(hits[k]):""))); }
  function advance(){
    i++; hits=[]; busy=false; msg.textContent=""; msg.className="small";
    if(i>=prompts.length) return finish();
    const p=prompts[i];
    prog.textContent=`${i+1} of ${prompts.length}`;
    letter.textContent=p.L;
    sub.textContent=x.mode==="finger"?`${p.hand} hand, ${fingerName(p.f)}. Play it four times.`:`${hand}. Four different ${p.L} keys, then the next letter comes up.`;
    drawDots(); shownAt=earNow();
  }
  function finish(){
    EXSTOP=null; un(); skip.remove();
    const ts=Object.values(times), med=ts.length?median(ts):99, acc=notes?Math.round(100*(notes-wrong)/notes):0;
    const slowest=Object.entries(times).sort((a,b)=>b[1]-a[1]);
    ex(x.id).slow=slowest.slice(0,2).map(e=>e[0]);
    const target=x.mode==="finger"?3:2;
    const pass=!skipped&&acc>=90&&med<=target;
    letter.textContent=""; sub.textContent=""; dots.replaceChildren(); prog.textContent="";
    msg.className="small"; msg.replaceChildren(
      el("div",{class:"stats"},stat("Time to find",`${med.toFixed(1)} s`),stat("Right notes",`${acc}%`),slowest[0]?stat("Slowest",`${slowest[0][0]} ${slowest[0][1].toFixed(1)} s`):null),
      ...(slowest.length>1?[el("p",{class:"small muted"},`Your slowest letters come up again next time.`)]:[]));
    const why=[]; if(skipped) why.push(`${skipped} skipped`); if(acc<90) why.push(`${acc}% right notes (need 90%)`); if(med>target) why.push(`${med.toFixed(1)} s to find a letter (need ${target} s or less: Bill's "without thinking")`);
    if(x.mode==="both"&&apart>2) why.push(`hands landed apart ${apart} times (keep it to 2 or fewer)`);
    done(pass&&!(x.mode==="both"&&apart>2),why.length?why.join(", ")+".":`Found each letter in ${med.toFixed(1)} s on average.`);
  }
  advance();
}
const an=L=>"AEF".includes(L)?"an":"a";
const stat=(k,v)=>el("div",{class:"stat"},el("span",{class:"eyebrow"},k),el("b",{},v));

// ---------- engine: count in, play a pattern, get graded (runs, scales, dynamics) ----------
// Each take: {label, seq: midi numbers, fingers, bpm, cross: [[i, what]], dyn}
async function runTakes(box,x,done){
  const takes=x.takes(), status=el("p",{class:"small",role:"status"}), out=el("div",{class:"panel",style:"gap:6px"});
  const pic=el("div"), cue=el("p",{});
  const go=el("button",{class:"btn primary"},"Count me in");
  box.append(pic,cue,el("div",{class:"row"},go),status,out);
  let k=0, alive=true, results=[]; EXSTOP=()=>{alive=false};
  const showTake=()=>{const t=takes[k];pic.replaceChildren(svgBox(keyboardSVG(kbMarks(t))));cue.replaceChildren(el("b",{},`${t.label}. `),t.cue||"")};
  showTake();
  go.onclick=async()=>{
    go.disabled=true;
    const t=takes[k], notes=t.seq.length;
    const raw=await listenTake({clickBpm:t.bpm,notes,noteBpm:t.bpm},m=>{if(alive)status.textContent=m});
    if(!alive) return;
    const g=gradeTake(raw,{noteBpm:t.bpm,notes,seq:t.seq,tempoTol:.1,unevenTol:t.unevenTol||.12,evenDb:t.dyn?null:t.evenDb,merge:t.merge,maxSplits:t.merge?2:null});
    if(!g.heard){ status.textContent=`${g.problems[0]} Put the phone close to the piano and try again.`; go.disabled=false; go.textContent="Try again"; return; }
    const ns=t.merge?mergeTogether(raw,t.merge).notes:raw.filter(n=>!n.soft);
    const extra=[];
    if(t.cross&&ns.length===notes){ // the finger crossings Bill warns about: a gap or a bump right there
      const gaps=ns.slice(1).map((n,i)=>n.t-ns[i].t), m=median(gaps);
      for(const [j,what] of t.cross){ const late=gaps[j-1]-m, bump=ns[j].level-avg([ns[j-1].level,ns[j+1]?.level??ns[j-1].level]);
        if(late>Math.max(.06,.15*m)) extra.push(`${what} came ${Math.round(late*1000)} ms late. Get the thumb moving early, while the finger before it is still playing.`);
        else if(bump>3) extra.push(`${what} landed ${Math.round(bump)} dB louder than its neighbours. Let the thumb arrive gently.`); }
    }
    if(t.dyn&&ns.length===notes) extra.push(...t.dyn(ns.map(n=>n.level),out));
    const ok=g.ok&&!extra.length;
    results.push({ok,g});
    out.append(el("p",{class:"small"},`${ok?"✓":"✗"} ${t.label}: ${g.tempo} a minute, spacing off by ${g.unevenMs} ms on average.`),...[...g.problems,...extra].map(p=>el("p",{class:"small muted"},p)));
    k++;
    if(k<takes.length){ showTake(); status.textContent=""; go.disabled=false; go.textContent="Count me in"; return; }
    go.remove(); EXSTOP=null;
    const pass=results.every(r=>r.ok);
    done(pass,pass?`All ${takes.length} takes clean.`:`${results.filter(r=>!r.ok).length} of ${takes.length} takes had problems; the details are above.`);
  };
}
function kbMarks(t){ // put a take's keys on the two-octave diagram, finger numbers on the keys
  const lo=Math.min(...t.seq), base=12*Math.floor(lo/12), seen={};
  t.seq.forEach((m,i)=>{ if(seen[m]==null) seen[m]=t.fingers?t.fingers[i]:""; });
  return Object.entries(seen).map(([m,f])=>({semi:+m-base,label:f,top:SHARPS[+m%12]})).filter(k=>k.semi<24);
}
function whiteRun(startD,dir){ const ds=[0,1,2,3,4,3,2,1,0].map(s=>startD+dir*s); return ds.map(dToMidi); }
function loudBars(levels,out,labels){ // a little bar chart of how loud each note was
  const lo=Math.min(...levels)-3, hi=Math.max(...levels), W=Math.max(200,levels.length*30), H=90;
  let s=`<svg class="bars" viewBox="0 0 ${W} ${H+16}" role="img" aria-label="Loudness of each note">`;
  levels.forEach((v,i)=>{const h=Math.max(3,(v-lo)/(hi-lo||1)*H),x=i*(W/levels.length)+4;s+=`<rect x="${x}" y="${H-h}" width="${W/levels.length-8}" height="${h}" rx="2"/><text x="${x+(W/levels.length-8)/2}" y="${H+13}" text-anchor="middle">${labels?labels[i]:i+1}</text>`});
  const d=el("div",{class:"kbwrap"}); d.innerHTML=s+"</svg>"; out.append(el("p",{class:"small muted"},"How loud each note was:"),d);
}
function hairpinCheck(levels,out,names){
  loudBars(levels,out,names);
  const top=levels.length>>1, rise=levels[top]-levels[0], fall=levels[top]-levels[levels.length-1], p=[];
  const back=levels.slice(1,top+1).filter((v,i)=>v<levels[i]-1.5).length+levels.slice(top+1).filter((v,i)=>v>levels[top+i]+1.5).length;
  if(rise<6) p.push(`The way up only got ${Math.max(0,Math.round(rise))} dB louder. Aim for at least 6: start really soft.`);
  if(fall<6) p.push(`The way down only got ${Math.max(0,Math.round(fall))} dB softer. Aim for at least 6.`);
  if(back>1) p.push(`${back} notes went the wrong way. Each note should be a little louder (then softer) than the one before.`);
  return p;
}

// ---------- engine: lines of music (read and play, sing back, clap, play in time) ----------
// A line: {clef: "treble"|"bass"|"rhythm", time: [beats, 4], key: ["F"], perRow, ev: [{d, dur, acc, f, rest, tie}]}
const RESTS={1:"𝄽",2:"𝄼",4:"𝄻",.5:"𝄾",3:"𝄼"};
function lineMidis(line){ // the key each note sounds: key signature, then accidentals that hold to the end of the bar
  const ks=line.key||[], out=[]; let beat=0, carry={}, bar=0;
  for(const e of line.ev){
    const b=Math.floor(beat/line.time[0]+1e-9); if(b!==bar){bar=b;carry={}}
    if(!e.rest&&e.d!=null){
      if(e.acc) carry[e.d]=e.acc;
      const a=carry[e.d]||(ks.includes(LETTERS[e.d%7])?"♯":"");
      out.push(dToMidi(e.d)+({"♯":1,"♭":-1,"♮":0,"":0})[a]);
    } else out.push(null);
    beat+=e.dur;
  }
  return out;
}
function onsetBeats(line){ const b=[]; let t=0; line.ev.forEach((e,i)=>{ b.push(e.rest||(i&&line.ev[i-1].tie)?null:t); t+=e.dur; }); return b; }
function lineSVG(line,marks={}){
  const gap=10, perRow=line.perRow||2, beatsPerBar=line.time[0], rowH=line.clef==="rhythm"?80:120;
  const rows=[]; let beat=0, row=null;
  line.ev.forEach((e,i)=>{ const bar=Math.floor(beat/beatsPerBar+1e-9); if(!row||bar>=(rows.length)*perRow){row={bars:[],items:[]};rows.push(row)} row.items.push({e,i,bar,beat}); beat+=e.dur; });
  const ref=line.clef==="bass"?18:30, mid=line.clef==="bass"?22:34;
  let W=0; const placed=[];
  rows.forEach((r,ri)=>{
    let x=line.clef==="rhythm"?14:44; if(ri===0&&line.time) x+=18; x+=(line.key||[]).length*12;
    let lastBar=r.items[0].bar;
    const bars=[];
    for(const it of r.items){ if(it.bar!==lastBar){bars.push(x-8);lastBar=it.bar;x+=4} const ax=it.e.acc?10:0; placed.push({...it,x:x+10+ax,ri}); x+=24+Math.min(it.e.dur,2)*10+ax; }
    bars.push(x); r.barsX=bars; r.end=x; W=Math.max(W,x+6);
  });
  const H=rows.length*rowH;
  let s=`<svg class="staff line" viewBox="0 0 ${W} ${H}" role="img" aria-label="A line of music" style="max-width:${Math.min(W*1.25,700)}px">`;
  rows.forEach((r,ri)=>{
    const top=ri*rowH+(line.clef==="rhythm"?30:35), bottom=top+4*gap;
    if(line.clef==="rhythm") s+=`<line x1="4" x2="${r.end}" y1="${top+2*gap}" y2="${top+2*gap}" stroke-width="1.2"/>`;
    else {
      for(let k=0;k<5;k++) s+=`<line x1="4" x2="${r.end}" y1="${top+k*gap}" y2="${top+k*gap}" stroke-width="1"/>`;
      s+=`<text x="6" y="${line.clef==="treble"?bottom+5:top+gap*2+1}" font-size="${line.clef==="treble"?50:33}" font-family="serif">${line.clef==="treble"?"𝄞":"𝄢"}</text>`;
    }
    let kx=line.clef==="rhythm"?10:40;
    (line.key||[]).forEach((L,k)=>{ const d=SHARP_POS[k]-(line.clef==="bass"?14:0), yy=bottom-(d-ref)*gap/2; s+=`<text x="${kx+k*12+6}" y="${yy+5}" font-size="18" font-family="serif" text-anchor="middle">♯</text>`; });
    kx+=(line.key||[]).length*12;
    if(ri===0&&line.time){ const ty=line.clef==="rhythm"?top+2*gap:top+2*gap; s+=`<text x="${kx+9}" y="${ty-2}" font-size="19" font-weight="700" font-family="serif" text-anchor="middle">${line.time[0]}</text><text x="${kx+9}" y="${ty+17}" font-size="19" font-weight="700" font-family="serif" text-anchor="middle">${line.time[1]}</text>`; }
    r.barsX.forEach((bx,k)=>{ const yTop=line.clef==="rhythm"?top+2*gap-12:top, yBot=line.clef==="rhythm"?top+2*gap+12:bottom;
      s+=`<line x1="${bx}" x2="${bx}" y1="${yTop}" y2="${yBot}" stroke-width="${k===r.barsX.length-1&&ri===rows.length-1?2.5:1}"/>`; });
  });
  const pos=p=>{ const top=p.ri*rowH+(line.clef==="rhythm"?30:35), bottom=top+4*gap; return {top,bottom,y:d=>line.clef==="rhythm"?top+2*gap:bottom-(d-ref)*gap/2}; };
  // quavers that start on a beat and are followed by another quaver get beamed together
  const beamStart=new Set(placed.filter((p,k)=>p.e.dur===.5&&!p.e.rest&&Math.abs(p.beat%1)<1e-9&&placed[k+1]?.e.dur===.5&&!placed[k+1].e.rest&&placed[k+1].ri===p.ri).map(p=>p.i));
  const beamed=new Set([...beamStart].map(i=>i+1));
  placed.forEach((p,k)=>{
    const {top,bottom,y}=pos(p), e=p.e, m=marks[p.i]; const cls="ev"+(m?" "+m.cls:"");
    s+=`<g class="${cls}">`;
    if(e.rest){ s+=`<text class="fill" x="${p.x}" y="${(line.clef==="rhythm"?top+2*gap:top+2*gap)+9}" font-size="26" font-family="serif" text-anchor="middle">${RESTS[e.dur]||"𝄽"}</text>`; if(e.dur===3) s+=`<circle class="fill" cx="${p.x+11}" cy="${top+2*gap-3}" r="2"/>`; s+="</g>"; return; }
    const yy=y(e.d);
    if(line.clef!=="rhythm"){ for(let d=ref-2;d>=e.d;d-=2) s+=`<line x1="${p.x-11}" x2="${p.x+11}" y1="${y(d)}" y2="${y(d)}" stroke-width="1"/>`;
      for(let d=ref+10;d<=e.d;d+=2) s+=`<line x1="${p.x-11}" x2="${p.x+11}" y1="${y(d)}" y2="${y(d)}" stroke-width="1"/>`; }
    if(e.acc) s+=`<text class="fill" x="${p.x-14}" y="${yy+5}" font-size="17" font-family="serif" text-anchor="middle">${e.acc}</text>`;
    const hollow=e.dur>=2;
    s+=`<ellipse class="${hollow?"hollow":"fill"}" cx="${p.x}" cy="${yy}" rx="6.2" ry="4.6" transform="rotate(-20 ${p.x} ${yy})" stroke-width="1.6"/>`;
    if(e.dur===3||e.dur===1.5) s+=`<circle class="fill" cx="${p.x+11}" cy="${(e.d-ref)%2===0&&line.clef!=="rhythm"?yy-4:yy}" r="2"/>`;
    if(e.dur<4){
      const up=line.clef==="rhythm"||e.d<mid||beamStart.has(p.i)||beamed.has(p.i), sx=up?p.x+5.6:p.x-5.6, tip=up?yy-32:yy+32;
      const tipY=(beamStart.has(p.i)||beamed.has(p.i))?(line.clef==="rhythm"?top+2*gap-30:Math.min(yy,y(placed[beamStart.has(p.i)?k+1:k-1].e.d))-30):tip;
      s+=`<line x1="${sx}" x2="${sx}" y1="${yy}" y2="${tipY}" stroke-width="1.3"/>`;
      if(beamStart.has(p.i)){ const q=placed[k+1]; s+=`<line x1="${sx}" x2="${q.x+5.6}" y1="${tipY}" y2="${tipY}" stroke-width="4.5"/>`; }
      else if(e.dur===.5&&!beamed.has(p.i)) s+=up?`<path class="stroke" d="M${sx} ${tipY} q 9 7 6 18" fill="none" stroke-width="1.6"/>`:`<path class="stroke" d="M${sx} ${tipY} q 9 -7 6 -18" fill="none" stroke-width="1.6"/>`;
    }
    if(e.tie&&placed[k+1]) { const q=placed[k+1]; s+=`<path class="stroke" d="M${p.x+5} ${yy+7} Q ${(p.x+q.x)/2} ${yy+16} ${q.x-5} ${yy+7}" fill="none" stroke-width="1.3"/>`; }
    if(e.f) s+=`<text class="fing" x="${p.x}" y="${line.clef==="bass"?bottom+22:Math.min(top-8,yy-12)}" font-size="11" text-anchor="middle">${e.f}</text>`;
    if(m&&m.note) s+=`<text class="marknote" x="${p.x}" y="${line.clef==="bass"?top-8:line.clef==="rhythm"?top+2*gap+26:bottom+24}" font-size="10" text-anchor="middle">${m.note}</text>`;
    s+="</g>";
  });
  return s+"</svg>";
}
function lineBox(line,marks){ const d=el("div",{class:"kbwrap linewrap"}); d.innerHTML=lineSVG(line,marks); return d; }

// Read and play, note by note, at your own speed. x.sing: hum each note back after playing it.
function runFollow(box,x,done){
  const lines=x.lines||1; let li=0, total=0, wrongs=0, sung=0, singTries=0; const times=[]; let alive=true;
  const head=el("div",{class:"small muted mono"}), pic=el("div"), msg=el("p",{class:"small",role:"status"}), meter=el("p",{class:"small muted"});
  const skip=el("button",{class:"btn",onclick:()=>step(true)},"Skip this note");
  box.append(head,pic,msg,meter,el("div",{class:"row"},skip));
  let line,midis,idx,marks,shownAt,un=null,singTimer=null,phase="play";
  EXSTOP=()=>{alive=false;un?.();clearInterval(singTimer)};
  function newLine(){
    line=x.make(li); midis=lineMidis(line); marks={}; idx=-1; head.textContent=lines>1?`Line ${li+1} of ${lines}`:""; step(false,true);
  }
  function step(skipped,first){
    if(skipped){ wrongs++; marks[idx]={cls:"bad",note:spelled(line,idx)}; clearInterval(singTimer); phase="play"; meter.textContent=""; }
    if(!first&&!skipped&&marks[idx]?.cls!=="warn") marks[idx]={cls:"ok"};
    do idx++; while(idx<line.ev.length&&midis[idx]==null);
    if(idx>=line.ev.length){ li++; if(li<lines){ draw(); setTimeout(()=>alive&&newLine(),700); return; } return finish(); }
    total++; marks[idx]={...(marks[idx]||{}),cls:marks[idx]?.cls==="warn"?"warn cur":"cur"}; draw();
    msg.className="small"; msg.textContent=x.sing?"Play it, say its name, then let go and hum it.":"Play it.";
    shownAt=earNow();
  }
  function draw(){ pic.replaceChildren(lineBox(line,marks)); }
  un=listenFor(n=>{
    if(!alive||phase!=="play"||n.soft||n.midi==null||n.t<shownAt||idx<0||idx>=line.ev.length) return;
    const want=midis[idx];
    if(sameKey(n.midi,want)){
      times.push(n.t-shownAt);
      marks[idx]=marks[idx].cls.includes("warn")?{cls:"warn",note:marks[idx].note}:{cls:"ok"};
      if(x.sing) return singBack(want,n.t);
      return step(false);
    }
    wrongs++; marks[idx]={cls:"warn cur",note:sharpName(n.midi)}; draw();
    msg.className="small bad"; msg.textContent=(x.explain?.(line,idx,n.midi,want))||`That was ${sharpName(n.midi)}. This note is ${spelled(line,idx)}.`;
  });
  function singBack(want,tp){ // hum the note: any octave, within about half a semitone
    phase="sing"; singTries++; draw();
    msg.className="small"; msg.textContent="✓ Now let go of the key and hum it. Any octave is fine.";
    let minR=1, good=0; const f0=440*2**((want-69)/12), t0=earNow();
    singTimer=setInterval(()=>{
      if(!alive) return clearInterval(singTimer);
      const now=earNow(); if(now-tp<.3) return;
      const n=2048, xw=earSlice(EAR.pos-n,n); let ss=0; for(let k=0;k<n;k++) ss+=xw[k]*xw[k];
      const r=Math.sqrt(ss/n); minR=Math.min(minR,r);
      const y=r>2*minR&&r>3*EAR.floor?yin(xw,EAR.sr):null; // energy rising again means a new sound: your voice, not the key ringing on
      if(y&&y.clarity>.75){
        let c=1200*Math.log2(y.f/f0); c=((c%1200)+1800)%1200-600;
        const near=Math.abs(c)<=60; good=near?good+1:Math.max(0,good-1);
        meter.textContent=near?`Humming ${pcName(want)}, in tune.`:`You're humming ${c<0?"below":"above"} it (${Math.round(Math.abs(c))} cents ${c<0?"flat":"sharp"}). Slide ${c<0?"up":"down"}.`;
      }
      if(good>=6){ clearInterval(singTimer); sung++; meter.textContent=`✓ Sung.`; phase="play"; step(false); return; }
      if(now-t0>10){ clearInterval(singTimer); meter.textContent="Moving on. Hum along with the key held down next time, then let go and keep humming."; phase="play"; step(false); }
    },60);
  }
  function finish(){
    alive=false; un?.(); EXSTOP=null; skip.remove(); msg.textContent=""; meter.textContent="";
    const acc=total?Math.round(100*(total-wrongs)/total):0, med=times.length?median(times):99;
    const why=[]; if(acc<90) why.push(`${acc}% right first time (need 90%)`); if(med>(x.medianMax||4)) why.push(`${med.toFixed(1)} s per note (aim for ${x.medianMax||4} s or less)`);
    if(x.sing&&sung<Math.ceil(.75*singTries)) why.push(`sang ${sung} of ${singTries} in tune (need 3 in 4)`);
    box.append(el("div",{class:"stats"},stat("Right first time",`${acc}%`),stat("Per note",`${med.toFixed(1)} s`),x.sing?stat("Sung in tune",`${sung}/${singTries}`):null));
    done(!why.length,why.length?why.join(", ")+".":`${acc}% right, ${med.toFixed(1)} s a note.`);
  }
  newLine();
}

// Play (or clap) a line in time after a one-bar count-in. Graded on the beat you set, not a fixed clock.
function runTimed(box,x,done){
  const lines=x.lines||3; let li=0, results=[], alive=true;
  const head=el("div",{class:"small muted mono"}), pic=el("div"), msg=el("p",{class:"small",role:"status"}), out=el("div",{class:"panel",style:"gap:4px"});
  const go=el("button",{class:"btn primary"},"Count me in");
  box.append(head,pic,el("div",{class:"row"},go),msg,out);
  EXSTOP=()=>{alive=false};
  let line=x.make(0);
  const show=marks=>{head.textContent=`Line ${li+1} of ${lines} · ${x.bpm} beats a minute`;pic.replaceChildren(lineBox(line,marks||{}))};
  show();
  go.onclick=async()=>{
    if(go.dataset.next){ delete go.dataset.next; line=x.make(li); show(); }
    go.disabled=true; out.replaceChildren(); msg.textContent="";
    const ctx=audioCtx(), B=60/x.bpm, n=line.time[0], lead=.4, beats=line.ev.reduce((a,e)=>a+e.dur,0);
    for(let k=0;k<n;k++){ click(ctx.currentTime+lead+k*B,k===0); setTimeout(()=>alive&&(msg.textContent=`${n-k}…`),(lead+k*B)*1000); }
    const downbeat=earNow()+lead+n*B; // where beat 1 should land, in mic time
    setTimeout(()=>alive&&(msg.textContent=x.clap?"Clap (or tap a key). Count in your head, not out loud.":"Play."),(lead+n*B)*1000-120);
    const heard=[]; const un=listenFor(nt=>{ if(nt.t>downbeat-.6*B) heard.push(nt); });
    await sleep((lead+(n+beats)*B+Math.max(1.2,1.5*B))*1000);
    un(); if(!alive) return;
    const g=gradeLine(heard,line,B,downbeat,x.clap);
    show(g.marks); results.push(g.ok);
    msg.textContent=g.ok?"✓ Clean.":"";
    out.replaceChildren(...g.problems.map(p=>el("p",{class:"small muted"},p)));
    li++;
    if(li<lines){ go.disabled=false; go.textContent="Next line"; go.dataset.next="1"; return; }
    go.remove(); EXSTOP=null;
    const clean=results.filter(Boolean).length;
    done(clean===lines,`${clean} of ${lines} lines clean.`);
  };
}
function gradeLine(heard,line,B0,o0,clap){
  const bs=onsetBeats(line), midis=lineMidis(line);
  const exp=bs.map((b,i)=>b==null?null:{b,i,midi:midis[i]}).filter(Boolean);
  const hs=mergeTogether(heard,.08).notes; // hands or a chord landing together count once
  let o=o0, B=B0, m=[];
  for(let it=0;it<4;it++){
    m=alignOnsets(hs,exp,o,B);
    const pr=m.filter(p=>p.h&&p.e), xs=pr.map(p=>p.e.b), ys=pr.map(p=>p.h.t);
    if(pr.length>=3){ const mx=avg(xs),my=avg(ys),sxx=xs.reduce((a,v)=>a+(v-mx)**2,0);
      if(sxx>0){ const B2=xs.reduce((a,v,k)=>a+(v-mx)*(ys[k]-my),0)/sxx; if(B2>B0*.7&&B2<B0*1.4) B=B2; } o=my-B*mx; }
    else if(pr.length) o=median(pr.map(p=>p.h.t-B*p.e.b));
  }
  const tol=Math.max(.08,.14*B), marks={}, problems=[]; let early=0,late=0,missed=0,wrongP=0,extra=0;
  for(const p of m){
    if(p.e&&!p.h){ missed++; marks[p.e.i]={cls:"bad",note:"missed"}; continue; }
    if(p.h&&!p.e){ extra++; continue; }
    const err=p.h.t-(o+B*p.e.b), ms=Math.round(err*1000);
    if(!clap&&p.h.midi!=null&&!sameKey(p.h.midi,p.e.midi)){ wrongP++; marks[p.e.i]={cls:"bad",note:sharpName(p.h.midi).replace(/-?\d+$/,"")}; continue; }
    if(Math.abs(err)>tol){ err<0?early++:late++; marks[p.e.i]={cls:"warn",note:(ms>0?"+":"")+ms}; }
    else marks[p.e.i]={cls:"ok"};
  }
  const bpm=Math.round(60/B), drift=Math.abs(B-B0)/B0;
  if(missed) problems.push(`Missed ${missed} ${clap?"beat":"note"}${missed>1?"s":""} (red).`);
  if(extra) problems.push(`${extra} extra ${clap?"clap":"note"}${extra>1?"s":""} where the music has none.`);
  if(wrongP) problems.push(`${wrongP} wrong note${wrongP>1?"s":""}: the red ones show what you played.`);
  if(early||late) problems.push(`${early+late} landed off the beat (orange; the number is how many ms ${early>=late?"early":"late"}). ${late>early?"Long notes are where people usually cut short or hang on: count through them.":"You're rushing: wait for the beat."}`);
  if(drift>.15) problems.push(`You settled at ${bpm} beats a minute; the count-in was ${Math.round(60/B0)}. Keep the speed you're counted in at.`);
  return {ok:!problems.length,problems,marks,bpm};
}
function alignOnsets(hs,exp,o,B){ // in-order matching of heard onsets to expected ones; unmatched on either side are allowed
  const n=hs.length, k=exp.length, G=.5, C=Array.from({length:n+1},()=>new Float64Array(k+1)), P=Array.from({length:n+1},()=>new Int8Array(k+1));
  for(let i=0;i<=n;i++) for(let j=0;j<=k;j++){
    if(!i&&!j) continue; let best=Infinity, how=0;
    if(i&&C[i-1][j]+G<best){best=C[i-1][j]+G;how=1}
    if(j&&C[i][j-1]+G<best){best=C[i][j-1]+G;how=2}
    if(i&&j){ const d=Math.abs(hs[i-1].t-(o+B*exp[j-1].b))/B; if(d<.5&&C[i-1][j-1]+d<best){best=C[i-1][j-1]+d;how=3} }
    C[i][j]=best; P[i][j]=how;
  }
  const out=[]; let i=n,j=k;
  while(i||j){ const h=P[i][j]; if(h===3){out.push({h:hs[i-1],e:exp[j-1]});i--;j--} else if(h===1){out.push({h:hs[i-1]});i--} else {out.push({e:exp[j-1]});j--} }
  return out.reverse();
}

// ---------- engine: a short terms quiz ----------
function runQuiz(box,x,done){
  const qs=shuffle([...x.bank]).slice(0,10); let i=0, right=0;
  const q=el("h3",{class:"quizq"}), opts=el("div",{class:"panel",style:"gap:6px"}), fb=el("p",{class:"small",role:"status"}), prog=el("div",{class:"small muted mono"});
  box.append(prog,q,opts,fb);
  const next=()=>{
    if(i>=qs.length){ q.textContent=""; opts.replaceChildren(); prog.textContent=""; return done(right>=9,`${right} of ${qs.length} right.`); }
    const [ask,ans,...wrong]=qs[i]; prog.textContent=`${i+1} of ${qs.length}`; q.textContent=ask; fb.textContent="";
    opts.replaceChildren(...shuffle([ans,...wrong]).map(o=>{const b=el("button",{class:"btn quizopt",onclick:()=>{
      [...opts.children].forEach(c=>{c.disabled=true;if(c.textContent===ans)c.classList.add("good")});
      if(o===ans) right++; else { b.classList.add("bad"); fb.textContent=`It's “${ans}”.`; }
      i++; setTimeout(next,o===ans?500:1800);
    }},o);return b}));
  };
  next();
}

// ---------- generators ----------
function walk(lo,hi,n,start){ const out=[start]; while(out.length<n){ const p=out[out.length-1], s=pick([-2,-1,-1,1,1,2,0]); const q=Math.min(hi,Math.max(lo,p+s)); out.push(q); } return out; }
function readLine(clef){ // Bill's single-note worksheets: mostly on the staff, now and then a ledger line, a finger number on each
  const [lo,hi,llo,lhi]=clef==="treble"?[29,39,25,42]:[18,26,15,28];
  return {clef,time:[4,4],ev:Array.from({length:8},()=>({d:Math.random()<.8?lo+Math.floor(Math.random()*(hi-lo+1)):pick([...range(llo,lo-1),...range(hi+1,lhi)]),dur:1,f:1+Math.floor(Math.random()*5)}))};
}
const BAR_PATTERNS={ // whole bars of note lengths, by the lesson that introduces them (0.5 quaver, 1 crotchet, 2 minim, 3 dotted minim, 4 semibreve; r = rest)
  3:{4:[[1,1,1,1],[2,1,1],[1,1,2],[2,2],[1,2,1]],3:[[1,1,1],[2,1],[1,2]]},
  5:{4:[[4],[2,2],[1,1,2]]},
  7:{4:[[1,"r",1,1],[1,1,"r",1],[2,1,"r"],["r",1,2]],3:[[1,1,"r"],[2,"r"],["r",1,1]]},
  8:{4:[[.5,.5,1,1,1],[1,.5,.5,1,1],[.5,.5,.5,.5,2],[1,1,.5,.5,1],[.5,.5,.5,.5,.5,.5,1]],3:[[.5,.5,1,1],[1,.5,.5,1],[.5,.5,.5,.5,1]]},
  10:{3:[[3],[3],[2,1],[1,1,1]]},
};
function patternsUpTo(pos,beats){ return Object.entries(BAR_PATTERNS).filter(([p])=>+p<=pos).flatMap(([,v])=>v[beats]||[]); }
function rhythmLine(pos,beats,bars,newest){ // the newest lesson's note lengths show up in every line
  const all=patternsUpTo(pos,beats), fresh=(BAR_PATTERNS[newest]||{})[beats]||[];
  const pats=Array.from({length:bars},(_,k)=>k===0&&fresh.length?pick(fresh):pick(all));
  shuffle(pats);
  return {clef:"rhythm",time:[beats,4],perRow:beats===4&&pats.flat().includes(.5)?1:2,ev:pats.flat().map(v=>v==="r"?{rest:true,dur:1}:{d:34,dur:v})};
}
function tuneLine(beats){ // a lesson-3-style tune: right hand in C position (thumb on middle C), ending on C
  const pats=[...Array(3)].map(()=>pick(BAR_PATTERNS[3][beats])).concat([beats===4?[2,2]:[1,2]]);
  const durs=pats.flat(), ds=walk(28,32,durs.length,pick([28,30,32])); ds[ds.length-1]=28;
  return {clef:"treble",time:[beats,4],ev:durs.map((dur,i)=>({d:ds[i],dur,f:ds[i]-27}))};
}
const TWINKLE=(()=>{ const s="C C G G A A G2 F F E E D D C2 G G F F E E D2 G G F F E E D2 C C G G A A G2 F F E E D D C2".split(" ");
  return {clef:"treble",time:[4,4],ev:s.map((t,i)=>({d:28+"CDEFGAB".indexOf(t[0]),dur:t[1]?2:1,...(i===0?{f:1}:{})}))}; })();
function accidentalLine(){ // a ♯ that holds to the bar line, then a bar line that cancels it
  const L=pick([3,0,4]), d=28+L+(L===0?7:0), filler=()=>pick([29,30,32,33,34,35,36].filter(v=>v!==d));
  const b1=[{d,dur:1,acc:"♯"},{d:filler(),dur:1},{d,dur:1},{d:filler(),dur:1}];
  const b2=[{d:filler(),dur:1},{d,dur:1,...(Math.random()<.5?{acc:"♮"}:{})},{d:filler(),dur:1},{d,dur:1,...(Math.random()<.3?{acc:"♯"}:{})}];
  return {clef:"treble",time:[4,4],ev:[...b1,...b2]};
}
function keysigLine(){ // G major's F♯ in the key signature: every F is F♯
  const ds=walk(30,38,8,pick([30,32,34])); if(!ds.some(d=>d%7===3)) ds[2+Math.floor(Math.random()*4)]=pick([31,38]);
  return {clef:"treble",time:[4,4],key:["F"],ev:ds.map(d=>({d,dur:1}))};
}
function explainAccidental(line,i,heard,want){
  const e=line.ev[i], name=spelled(line,i), marked=line.ev.some(o=>o.d===e.d&&o.acc==="♯");
  if(!marked) return null;
  if(heard===want-1&&!e.acc) return `That was ${sharpName(heard)}. The ♯ earlier in this bar still counts until the bar line, so this is ${name}.`;
  if(heard===want+1&&!e.acc) return `That was ${sharpName(heard)}. The bar line cancelled the ♯, so this one is back to ${name}.`;
  if(heard===want+1&&e.acc==="♮") return `That was ${sharpName(heard)}. ♮ means the plain white key: ${name}.`;
  return null;
}
function explainKeysig(line,i,heard,want){
  if(LETTERS[line.ev[i].d%7]==="F"&&heard===want-1) return `That was ${sharpName(heard)}. The ♯ on the F line at the start of the staff makes every F an F♯, in every octave.`;
  return null;
}
const scaleTake=(label,root,hand,fingers,cross,cue)=>{ const up=[0,2,4,5,7,9,11,12].map(s=>root+s); return {label,seq:[...up,...up.slice(0,7).reverse()],fingers,bpm:60,unevenTol:.12,evenDb:4,cross,cue}; };
const RH_SCALE=[1,2,3,1,2,3,4,5,4,3,2,1,3,2,1], LH_SCALE=[5,4,3,2,1,3,2,1,2,3,1,2,3,4,5];
const TERMS=[
  ["What does andante mean?","At a walking pace","As fast as you can","Very slowly","Getting faster"],
  ["What does legato mean?","Smooth, each note joined to the next","Short and detached","Loud","Slowing down"],
  ["What does p mean?","Soft (piano)","Loud (forte)","Pedal","Pause"],
  ["What does f mean?","Loud (forte)","Soft (piano)","Fast","Finger"],
  ["What does mp mean?","Moderately soft","Moderately loud","Very soft","Medium speed"],
  ["What does mf mean?","Moderately loud","Moderately soft","Very loud","Middle finger"],
  ["What does pp mean?","Very soft","Very loud","Two pedals","Play twice"],
  ["A hairpin that opens up (<) means…","Gradually get louder","Gradually get softer","Speed up","Hold the note"],
  ["A hairpin that closes (>) means…","Gradually get softer","Gradually get louder","Slow down","Accent the note"],
  ["What does rit. (ritenuto) mean?","Slow down","Speed up","Repeat","Get louder"],
  ["What does subito mean?","Suddenly","Gradually","Softly","Again"],
  ["A curved line over a group of notes (a phrase mark) tells you…","Where a musical sentence starts and ends; lift slightly at its end","To hold every note twice as long","To play the notes together","To use the pedal"],
  ["A curved line over just two different notes (a slur) means…","Lean on the first, lighter on the second","Play them at the same time","Play them twice","Skip the second"],
  ["A curved line joining two notes of the same pitch (a tie) means…","Play once and hold for both lengths","Play it twice","Play it louder","Play it shorter"],
  ["The top number of the time signature 3/4 tells you…","Three beats in each bar","Three bars on each line","Play at speed 3","Three notes per beat"],
  ["How many beats does a minim (half note) last in 4/4?","2","1","4","3"],
  ["How many beats does a semibreve (whole note) last in 4/4?","4","2","1","3"],
  ["How long is a quaver (eighth note)?","Half a beat in 4/4","Two beats","One beat","A quarter of a beat"],
  ["A dot after a minim makes it last…","3 beats","2 beats","4 beats","1 beat"],
  ["What does a repeat mark (two dots before a thick bar line) mean?","Play the section again, once","Stop here","Play it twice as fast","Go back to the very start forever"],
  ["What does the brace (the big curly bracket) at the start of piano music show?","Both staves are played on one instrument","Play both hands an octave higher","The piece is in 4/4","Use the pedal"],
  ["A ♯ written in front of a note in the middle of a bar lasts…","To the end of that bar","For just that one note","For the rest of the piece","Until the next line"],
];

// ---------- the exercises, lesson by lesson (lesson = playlist slot) ----------
const EXERCISES=[
  // Lesson 1: Bill's five-level note-naming game
  {id:"l1-find-rh",lesson:1,name:"Level 1: find the letter, right hand",engine:runFind,mode:"rh",
    blurb:"A letter comes up; play four keys with that name.",
    how:"Bill's level 1. A letter from A to G comes up. Play four different keys with that name with your right hand, any finger, jumping around the keyboard, and say each name out loud. The mic hears each one; after four, the next letter comes up. Every white key is one of A B C D E F G, repeating. C sits just left of each pair of black keys, F just left of each group of three. Passing: under 2 seconds to find a letter and 90% right notes."},
  {id:"l1-find-lh",lesson:1,name:"Level 2: find the letter, left hand",engine:runFind,mode:"lh",
    blurb:"Same game, left hand.",
    how:"Bill's level 2: the same game with your left hand. The mic can't see which hand you use, so that part's on you. Passing: under 2 seconds a letter, 90% right notes."},
  {id:"l1-finger",lesson:1,name:"Level 3: finger plus letter",engine:runFind,mode:"finger",
    blurb:"A finger number and a letter; play it four times with that finger.",
    how:"Bill's level 3. Fingers are numbered from the thumb out: thumb 1, index 2, middle 3, ring 4, pinky 5, the same on both hands. You get a finger and a letter, going through right hand 1 to 5, then left hand 1 to 5. Say the finger and the letter, then play that key four times with that finger. Passing: under 3 seconds to find each one, 90% right notes."},
  {id:"l1-both",lesson:1,name:"Level 4: both hands together",engine:runFind,mode:"both",
    blurb:"Play the letter with both hands at once, four times.",
    how:"Bill's level 4. A letter comes up; play it with one finger of each hand at the same moment (two different keys with that name), four times. The mic checks the letter and whether your hands landed together. Passing: under 2 seconds a letter, 90% right, hands together."},
  {id:"l1-runs",lesson:1,name:"Level 5: five-note runs",engine:runTakes,
    blurb:"Thumb on a white key, up five and back: 1 2 3 4 5 4 3 2 1.",
    how:"Bill's level 5. Put finger 1 (thumb) on the key shown and play the white keys next to it, one finger each, up to finger 5 and back down. Right hand goes up; left hand starts with its thumb and goes down. After four clicks, play one note per click and keep going at that speed on your own. Bill: every note the same length and the same loudness. The app checks the notes, the evenness and the loudness.",
    takes:()=>{ const r=28+Math.floor(Math.random()*7), l=21+Math.floor(Math.random()*7);
      return [{label:`Right hand from ${LETTERS[r%7]}`,seq:whiteRun(r,1),fingers:[1,2,3,4,5,4,3,2,1],bpm:60,evenDb:4,cue:`Thumb on the ${LETTERS[r%7]} just above middle C.`},
        {label:`Left hand from ${LETTERS[l%7]}`,seq:whiteRun(l,-1),fingers:[1,2,3,4,5,4,3,2,1],bpm:60,evenDb:4,cue:`Left thumb on the ${LETTERS[l%7]} just below middle C, then go down.`}]; }},
  // Lesson 2: reading the treble staff, Bill's five levels again
  {id:"l2-read",lesson:2,name:"Levels 1–2: play what's on the staff",engine:runFollow,lines:2,medianMax:4,
    make:()=>readLine("treble"),
    blurb:"A line of notes; play each exact key with the finger number shown.",
    how:"Bill's levels 1 and 2. Each line and space of the staff is one white key. Treble clef lines from the bottom: E G B D F (Every Green Bus Drives Fast); spaces: F A C E. Middle C sits on its own short line just below. Play each note, the exact key, not just the letter, with the finger number above it, and say its name. The mic moves you on when it hears the right key."},
  {id:"l2-sing",lesson:2,name:"Level 4: play it, then sing it",engine:runFollow,lines:1,sing:true,medianMax:6,
    make:()=>readLine("treble"),
    blurb:"Play each note, then hum it back. The mic checks you're in tune.",
    how:"Bill's level 4. Play each note, let go, then hum or sing it. Any octave is fine (men usually land an octave lower). Bill's reason: pianists never have to find a pitch themselves, and humming builds the ear that makes reading faster later. The app listens for your voice and tells you if you're above or below the note. This one is good singing practice too."},
  {id:"l2-beat",lesson:2,name:"Level 5: read it on the beat",engine:runTimed,lines:3,bpm:50,
    make:()=>readLine("treble"),
    blurb:"After four clicks, one note per beat, no stopping.",
    how:"Bill's boss level. Four clicks set the beat, then they stop: play one note per beat, keeping the speed yourself, with the fingers shown. Bill: don't knock yourself out if it's hard. The app checks each note and when it landed."},
  // Lesson 3: beat, bars, crotchets and minims; clap first, then play
  {id:"l3-clap",lesson:3,name:"Clap the rhythm",engine:runTimed,lines:3,bpm:66,clap:true,
    make:()=>rhythmLine(3,Math.random()<.75?4:3,2,3),
    blurb:"Crotchets and minims: clap each line after a one-bar count-in.",
    how:"Bill's first step with any new music: clap the rhythm before worrying about the notes. A filled-in note with a stem is a crotchet (quarter note): one beat. A hollow one is a minim (half note): two beats. The top number of the time signature is the beats in each bar. Clap, or tap any piano key, on each note. Count in your head: counting out loud gets picked up as claps."},
  {id:"l3-tune",lesson:3,name:"Play a short tune in time",engine:runTimed,lines:3,bpm:60,
    make:()=>tuneLine(Math.random()<.75?4:3),
    blurb:"Short right-hand tunes like Bill's, played against a steady beat.",
    how:"Like the tunes in Bill's lesson 3 worksheet. Right hand thumb on middle C, one finger per key up to G (the finger numbers are shown). Clap it through once in your head, then play it after the count-in, holding minims for their full two beats."},
  // Lesson 4: bass clef and the C major scale
  {id:"l4-bass",lesson:4,name:"Play what's on the bass staff",engine:runFollow,lines:2,medianMax:4,
    make:()=>readLine("bass"),
    blurb:"Left hand: play each exact key with the finger shown.",
    how:"Bill's bass clef exercise. The bass clef staff covers the keys below middle C. Lines from the bottom: G B D F A (Good Boys Deserve Fine Apples); spaces: A C E G (All Cows Eat Grass). The top line is the A just below middle C; middle C sits on a short line above the staff. Left hand, finger numbers below the notes, say each name."},
  {id:"l4-c-rh",lesson:4,name:"C major scale, right hand",engine:runTakes,
    blurb:"One octave up and down; the app checks your thumb-under.",
    how:"A scale is eight keys in a row from one C to the next. Right hand fingers: 1 2 3, then tuck your thumb under to play F with 1, then 2 3 4 5 up to C. Coming down, cross finger 3 over your thumb at the same spot. Don't repeat the top C. Bill's main point: no bump or gap where the thumb goes under. The app measures exactly that.",
    takes:()=>[scaleTake("C major, right hand",60,"R",RH_SCALE,[[3,"Your thumb-under (E to F)"],[12,"Your finger-over coming down (F to E)"]],"Start on middle C.")]},
  {id:"l4-c-lh",lesson:4,name:"C major scale, left hand",engine:runTakes,
    blurb:"Left hand: 5 4 3 2 1, then 3 over the thumb.",
    how:"Left hand, starting on the C below middle C: 5 4 3 2 1 up to G, then finger 3 crosses over the thumb onto A, then 2 1 to C. Coming down: 1 2 3, thumb tucks under onto G, then 1 2 3 4 5. The switch is between G and A, not E and F like the right hand, because the left hand is a mirror image.",
    takes:()=>[scaleTake("C major, left hand",48,"L",LH_SCALE,[[5,"Your finger-over (G to A)"],[10,"Your thumb-under coming down (A to G)"]],"Start on the C below middle C.")]},
  {id:"l4-c-both",lesson:4,name:"C major scale, hands together",engine:runTakes,
    blurb:"Both hands at once, an octave apart.",
    how:"Bill's \"if you're feeling brave\" step, once each hand is solid on its own. Both hands play the C major scale at the same time, an octave apart, with their own fingerings. The crossings happen at different moments in each hand, which is the hard part. The app checks the notes, the steadiness and that both hands land together.",
    takes:()=>{const t=scaleTake("C major, hands together",60,"",null,null,"Right thumb on middle C, left pinky on the C below.");t.merge=.18;t.evenDb=null;return [t]}},
  // Lesson 5: dynamics
  {id:"l5-hairpin",lesson:5,name:"Get louder, then softer",engine:runTakes,
    blurb:"C up to G getting louder, back down getting softer, like a hairpin.",
    how:"Lesson 5 brings dynamics: how loud or soft. A hairpin that opens (<) means get gradually louder; one that closes (>) means gradually softer. Play C D E F G F E D C with your right hand, starting soft, each note a little louder up to G, then a little softer each note back down. The app shows how loud each note was. Keep the softest notes clearly audible: if the app misses one, play it a touch louder or move the phone closer.",
    takes:()=>[{label:"Hairpin on C to G",seq:[60,62,64,65,67,65,64,62,60],fingers:[1,2,3,4,5,4,3,2,1],bpm:60,unevenTol:.14,dyn:(lv,out)=>hairpinCheck(lv,out,["C","D","E","F","G","F","E","D","C"]),cue:"< then >"}]},
  {id:"l5-ladder",lesson:5,name:"p, mp, mf, f",engine:runTakes,
    blurb:"The same three notes four times, each louder than the last.",
    how:"Four dynamic markings from lessons 5 and 6, softest to loudest: p (soft), mp (moderately soft), mf (moderately loud), f (loud). Play C E G at p, then mp, then mf, then f, one note per click: twelve notes in all. Bill says dynamics are relative, so the app only checks that each step is louder than the one before.",
    takes:()=>[{label:"p, mp, mf, f",seq:[60,64,67,60,64,67,60,64,67,60,64,67],fingers:[1,3,5,1,3,5,1,3,5,1,3,5],bpm:60,unevenTol:.15,cue:"p p p · mp mp mp · mf mf mf · f f f",
      dyn:(lv,out)=>{ const g=[0,1,2,3].map(k=>avg(lv.slice(3*k,3*k+3))); loudBars(g,out,["p","mp","mf","f"]); const p=[];
        g.slice(1).forEach((v,k)=>{ if(v-g[k]<2) p.push(`${["mp","mf","f"][k]} wasn't clearly louder than ${["p","mp","mf"][k]} (${(v-g[k]).toFixed(1)} dB; aim for 2 or more).`) });
        if(g[3]-g[0]<10) p.push(`From p to f was only ${Math.round(g[3]-g[0])} dB. Make p softer and f louder: aim for 10 or more.`); return p; }}]},
  {id:"l5-clap",lesson:5,name:"Clap: add semibreves",engine:runTimed,lines:3,bpm:66,clap:true,
    make:()=>rhythmLine(5,4,2,5),
    blurb:"Crotchets, minims and the new semibreve (whole note).",
    how:"Lesson 5 adds the semibreve (whole note): a hollow note with no stem, worth four beats, a whole bar of 4/4. Clap or tap each note, and let semibreves fill all four beats before the next clap."},
  // Lesson 6 (playlist slot 7): 3/4, rests, G major
  {id:"l6-clap",lesson:7,name:"Clap: 3/4 time and rests",engine:runTimed,lines:3,bpm:66,clap:true,
    make:()=>rhythmLine(7,Math.random()<.5?3:4,2,7),
    blurb:"Three beats in a bar, and crotchet rests: silence for one beat.",
    how:"Lesson 6 introduces 3/4 time (three beats in a bar: ONE two three) and the crotchet rest, the squiggle that means one beat of silence. Clap the notes, stay silent on the rests and keep counting through them."},
  {id:"l6-g-rh",lesson:7,name:"G major scale, right hand",engine:runTakes,
    blurb:"Same fingering as C, starting on G, with one black key: F♯.",
    how:"G major works just like C major with the same fingers, starting on G. One difference: instead of F, play F♯, the black key just above F (finger 4 going up). The app checks for F♯ and the thumb-under (B to C).",
    takes:()=>[scaleTake("G major, right hand",55+12,"R",RH_SCALE,[[3,"Your thumb-under (B to C)"],[12,"Your finger-over coming down (C to B)"]],"Start on the G above middle C.")]},
  {id:"l6-g-lh",lesson:7,name:"G major scale, left hand",engine:runTakes,
    blurb:"Left hand, with F♯.",
    how:"Left hand, the same fingers as C major (5 4 3 2 1 3 2 1), starting on the G below middle C. F♯ is played with finger 2 going up. The crossing is between D and E.",
    takes:()=>[scaleTake("G major, left hand",55,"L",LH_SCALE,[[5,"Your finger-over (D to E)"],[10,"Your thumb-under coming down (E to D)"]],"Start on the G below middle C.")]},
  // Lesson 7 (slot 8): quavers and accidentals
  {id:"l7-clap",lesson:8,name:"Clap: quavers",engine:runTimed,lines:3,bpm:60,clap:true,
    make:()=>rhythmLine(8,Math.random()<.7?4:3,2,8),
    blurb:"Two quavers (eighth notes) share one beat: 1 and 2 and.",
    how:"Lesson 7's new note: the quaver (eighth note), half a beat. Two of them fill one beat. Joined pairs (a beam across the top) are still just quavers. Count \"1 and 2 and\" in your head and clap each one."},
  {id:"l7-acc",lesson:8,name:"Sharps that last to the bar line",engine:runFollow,lines:3,medianMax:5,explain:explainAccidental,
    make:()=>accidentalLine(),
    blurb:"Read lines with ♯ and ♮ and play the exact keys.",
    how:"Lesson 7's accidentals. A ♯ in front of a note means the very next key up (usually black). Bill's rule: it lasts until the end of that bar, so later notes on the same line or space in that bar are sharp too, without the sign. The bar line cancels it. ♮ (natural) means the plain white key. Play each note; if you get one wrong, the app tells you which rule you missed."},
  {id:"l7-twinkle",lesson:8,name:"Twinkle Twinkle, in time",engine:runTimed,lines:1,bpm:72,
    make:()=>({...TWINKLE,perRow:2}),
    blurb:"The tune behind Bill's Mozart piece, right hand, at a steady beat.",
    how:"The simple version of the tune Bill's lesson 7 piece is built on. Right hand, thumb on middle C, little finger reaching A. Crotchets get one beat, minims two. After the count-in, play it all the way through without stopping."},
  // Lesson 8 (slot 9): terms
  {id:"l8-terms",lesson:9,name:"Musical terms so far",engine:runQuiz,bank:TERMS,
    blurb:"Ten quick questions on the words and signs from lessons 3 to 8.",
    how:"Andante, legato, the dynamics, hairpins, rit., subito, phrase marks, slurs and the rest. Bill's advice is not to obsess over them, but you need to know what they ask for. Passing: 9 of 10."},
  // Lesson 9 (slot 10): key signatures and dotted minims
  {id:"l9-keysig",lesson:10,name:"Read in G major (F♯ in the key signature)",engine:runFollow,lines:3,medianMax:4,explain:explainKeysig,
    make:()=>keysigLine(),
    blurb:"The ♯ at the start of each line turns every F into F♯.",
    how:"Lesson 9: the key signature. The ♯ on the top line at the start of every staff means every F in the piece, in any octave, is played as F♯, unless a ♮ says otherwise. That's G major. Play each note; watch for the Fs."},
  {id:"l9-clap",lesson:10,name:"Clap: dotted minims in 3/4",engine:runTimed,lines:3,bpm:72,clap:true,
    make:()=>rhythmLine(10,3,2,10),
    blurb:"A dot adds half again: a dotted minim fills a 3/4 bar.",
    how:"A dot after a note makes it half as long again. A minim is two beats, so a dotted minim is three: a whole bar of 3/4, like in My Bonnie. Clap and hold through all three beats."},
];
