(function () {
  'use strict';
  const G = window.GAME;
  const $ = (id) => document.getElementById(id);
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const ar = (n) => String(n).replace(/\d/g, (d) => AR[d]);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ'];
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- storage ---------- */
  const KEY = 'saheb-elbeit-v3';
  const fresh = () => ({ attempts: [], startedAt: '', name: '', hrid: '', branch: '', mgr: '', area: '', seenStory: false, keys: {}, run: {}, certs: {}, nopes: 0, music: true, sfx: true, voice: true });
  let save = fresh();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) save = Object.assign(save, s); } catch (e) {}
  const CFG = window.SAHEB_CONFIG || {};
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
  /* ---------- audio: music + sfx (Web Audio, generated) ---------- */
  let ac = null, master = null, musicGain = null, sfxGain = null, musicTimer = null;
  function audio() {
    if (ac) return ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.gain.value = 0.11; musicGain.connect(master);
      sfxGain = ac.createGain(); sfxGain.gain.value = 0.35; sfxGain.connect(master);
    } catch (e) { ac = null; }
    return ac;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function tone(f, t, dur, type, gainNode, vol, attack) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(gainNode); o.start(t); o.stop(t + dur + 0.05);
  }
  function pluck(f, t, dur, vol) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 1.003;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 6, t); fl.frequency.exponentialRampToValueAtTime(f * 1.2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(musicGain);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function drum(t, kind) {
    if (kind === 'D') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 0.32);
    } else {
      const len = 0.06, b = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = b; f.type = 'highpass'; f.frequency.value = 2500; g.gain.value = kind === 'T' ? 0.55 : 0.25;
      s.connect(f); f.connect(g); g.connect(musicGain); s.start(t);
    }
  }
  const HIJAZ = [62, 63, 66, 67, 69, 70, 72, 74, 75, 78];
  const RHY = ['D', 'T', '', 'T', 'D', '', 'T', 't'];
  const PHRASES = [
    [4, -1, 5, 4, 3, -1, 2, 1, 2, -1, 3, 2, 1, 0, -1, -1],
    [0, 1, 2, -1, 3, 4, 5, 4, 3, -1, 4, 3, 2, 1, 0, -1],
    [7, -1, 6, 5, 4, -1, 5, 4, 3, 2, -1, 1, 2, 1, 0, -1],
    [2, 3, 4, -1, 4, 5, 6, 7, 6, 5, 4, -1, 3, 2, 1, 0]
  ];
  let step = 0, nextT = 0;
  function startMusic() {
    if (!save.music || !audio() || musicTimer) return;
    if (ac.state === 'suspended') ac.resume();
    const e = 60 / 108 / 2; nextT = ac.currentTime + 0.1; step = 0;
    musicTimer = setInterval(() => {
      while (nextT < ac.currentTime + 0.25) {
        const r = RHY[step % 8]; if (r) drum(nextT, r);
        const ph = PHRASES[Math.floor(step / 16) % PHRASES.length], n = ph[step % 16];
        if (n >= 0) pluck(mtof(HIJAZ[n]), nextT, e * 1.8, 0.22);
        if (step % 16 === 0) tone(mtof(38), nextT, e * 14, 'sine', musicGain, 0.25, 0.3);
        nextT += e; step++;
      }
    }, 40);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function sfx(kind) {
    if (!save.sfx || !audio()) return;
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime + 0.01;
    const seq = {
      click: [[880, 0, 0.06, 'triangle', 0.25]],
      best: [[660, 0, 0.12, 'triangle', 0.5], [880, 0.09, 0.12, 'triangle', 0.5], [1320, 0.18, 0.25, 'triangle', 0.45]],
      ok: [[520, 0, 0.14, 'triangle', 0.4], [620, 0.12, 0.2, 'triangle', 0.35]],
      bad: [[220, 0, 0.18, 'square', 0.18], [165, 0.16, 0.35, 'square', 0.18]],
      win: [[523, 0, 0.15, 'triangle', 0.5], [659, 0.13, 0.15, 'triangle', 0.5], [784, 0.26, 0.15, 'triangle', 0.5], [1046, 0.39, 0.5, 'triangle', 0.5]],
      fail: [[392, 0, 0.3, 'sawtooth', 0.18], [349, 0.28, 0.3, 'sawtooth', 0.18], [330, 0.56, 0.3, 'sawtooth', 0.18], [262, 0.84, 0.7, 'sawtooth', 0.2]],
      tick: [[1200, 0, 0.03, 'square', 0.08]]
    }[kind] || [];
    seq.forEach(([f, d, du, ty, v]) => tone(f, t + d, du, ty, sfxGain, v));
  }
  const duck = (on) => { if (musicGain && ac) musicGain.gain.setTargetAtTime(on ? 0.035 : 0.11, ac.currentTime, on ? 0.1 : 0.3); };

  /* ---------- voice: recorded file first, device speech as fallback ---------- */
  const REC = new Set(G.recorded || []);
  const synth = window.speechSynthesis;
  let arVoice = null, clip = null;
  function findVoice() {
    if (!synth) return;
    const vs = synth.getVoices() || [];
    arVoice = vs.find((v) => /ar[-_]EG/i.test(v.lang)) || vs.find((v) => /^ar/i.test(v.lang)) || null;
  }
  if (synth) { findVoice(); synth.onvoiceschanged = findVoice; }
  function hush() { try { synth && synth.cancel(); } catch (e) {} if (clip) { try { clip.pause(); } catch (e) {} clip = null; } duck(false); }
  function tts(text, who) {
    if (!synth) return;
    try {
      const clean = String(text).replace(/[«»"()]/g, ' ').replace(/\{name\}/g, save.name || '');
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = arVoice ? arVoice.lang : 'ar-EG'; if (arVoice) u.voice = arVoice;
      const prof = { coach: [0.85, 1.0], m: [1.05, 1.05], f: [1.4, 1.05] }[who || 'coach'];
      u.pitch = prof[0]; u.rate = prof[1];
      duck(true); u.onend = u.onerror = () => duck(false);
      synth.speak(u);
    } catch (e) {}
  }
  function say(id, text, who) {
    if (!save.voice) return;
    hush();
    if (/^\s*\(/.test(text || '') && !REC.has(id)) return; // stage directions like (بيبص في ساعته) aren't spoken
    if (id && REC.has(id)) {
      try {
        clip = new Audio('audio/' + id + '.mp3'); duck(true);
        clip.onended = () => duck(false);
        clip.play().catch(() => { clip = null; tts(text, who); });
        return;
      } catch (e) {}
    }
    tts(text, who);
  }
  const sayRand = (base, n, texts) => {
    const rec = []; for (let k = 1; k <= n; k++) if (REC.has(base + '-' + k)) rec.push(k);
    const i = rec.length ? pick(rec) : 1 + Math.floor(Math.random() * n);
    say(base + '-' + i, texts[i - 1]);
  };
  const RIGHT = ['برافو!', 'إجابة صح، كمّل كده!', 'هو ده الكلام!'];
  const WRONG = ['ولا يهمك، ركّز في الإجابة الصح.', 'قربت… بص على الإجابة الصح وافتكرها.', 'مش مشكلة، الغلطة دي هتفكّرك في الفرع.'];

  /* ---------- guest face (SVG) ---------- */
  function face(g, mood, seed) {
    mood = Math.max(0, Math.min(1, mood));
    const skins = ['#f1c9a5', '#e0ac85', '#c98d66', '#f5d3b8'], hijabs = ['#6b3fa0', '#d0567a', '#2f7d6d', '#b8742a', '#3f5fb0'];
    const skin = skins[seed % skins.length], red = Math.round(mood * 70);
    const sk = mood > 0.6 ? `rgb(${Math.min(255, parseInt(skin.slice(1, 3), 16) + 10)},${parseInt(skin.slice(3, 5), 16) - red},${parseInt(skin.slice(5, 7), 16) - red})` : skin;
    const curve = 66 + (0.45 - mood) * 22, brow = mood * 7;
    const hair = g === 'f'
      ? `<path d="M14 58 C10 18 90 18 86 58 L90 96 L10 96 Z" fill="${hijabs[seed % hijabs.length]}"/>`
      : `<path d="M22 42 C20 16 80 14 78 42 C70 30 30 30 22 42Z" fill="#2b2118"/>`;
    const steam = mood > 0.8 ? '<path d="M12 18 q4 -6 0 -12 M88 18 q-4 -6 0 -12" stroke="#ff5733" stroke-width="3" fill="none" stroke-linecap="round"/>' : '';
    return `<svg class="face" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="46" fill="#fff"/>${hair}
      <ellipse cx="50" cy="55" rx="29" ry="31" fill="${sk}"/>
      ${g === 'm' && seed % 2 ? '<path d="M28 62 C30 84 70 84 72 62 C66 76 34 76 28 62Z" fill="#2b2118" opacity=".85"/>' : ''}
      <path d="M33 ${40 + brow} L45 ${43 - brow * 0.4}" stroke="#2b2118" stroke-width="3" stroke-linecap="round"/>
      <path d="M67 ${40 + brow} L55 ${43 - brow * 0.4}" stroke="#2b2118" stroke-width="3" stroke-linecap="round"/>
      <circle cx="40" cy="50" r="3.6" fill="#1b1b1b"/><circle cx="60" cy="50" r="3.6" fill="#1b1b1b"/>
      <path d="M40 68 Q50 ${curve} 60 68" stroke="#7a2e1f" stroke-width="3.2" fill="none" stroke-linecap="round"/>${steam}</svg>`;
  }
  const seedOf = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);


  /* ---------- the house: floors → rooms → sections (same order as the guides' index) ---------- */
  const BANK = G.bank || [];
  const SEC = {};
  BANK.forEach((c) => c.secs.forEach((s) => { SEC[c.id + ':' + s.id] = Object.assign({ key: c.id + ':' + s.id, chT: c.t, book: c.book }, s); }));
  const DS = (ids) => ids.map((id) => Object.keys(SEC).find((k) => k.indexOf('diff-') === 0 && k.split(':')[1] === id));
  const FLOORS = [
    { t: 'الدور الأول: دليل مستشار راية', short: 'دليل المستشار', rooms: [
      { id: 'r1', t: 'ثقافة راية وتجربة العميل', secs: ['culture:identity', 'culture:values', 'cx:svc-vs-cx', 'cx:success'] },
      { id: 'r2', t: 'المهارات الأساسية', secs: ['skills:comm', 'skills:listen', 'skills:barriers'] },
      { id: 'r3', t: 'خطوات البيع ١: الترحيب والفهم', secs: ['guest:greet', 'guest:need', 'guest:disc'] },
      { id: 'r4', t: 'خطوات البيع ٢: العرض والبيع والشكر', secs: ['guest:know', 'guest:expose', 'guest:sell', 'guest:close', 'guest:thank'] },
      { id: 'r5', t: 'الاعتراضات والعمل كفريق', secs: ['objections:complaints', 'objections:team'] },
      { id: 'r6', t: 'سياسات راية', secs: ['policies:omni', 'policies:returns', 'policies:plus', 'policies:centers', 'policies:maint', 'policies:csat'] },
      { id: 'r7', t: 'بروتوكولات راية', secs: ['protocols:open', 'protocols:clean', 'protocols:deploy', 'protocols:closep', 'protocols:newbie'] },
      { id: 'r8', t: 'برامج التقسيط', secs: ['install:indiv', 'install:cc', 'install:ll', 'install:virtual', 'install:taqsitty'] },
      { id: 'r9', t: 'إتمام البيع والتسليم والمرتجعات', secs: ['install:complete', 'install:homedel', 'install:callcenter', 'install:shipping', 'install:discount', 'install:otherbranch', 'install:replace', 'install:smallret', 'install:bigret'] }
    ] },
    { t: 'الدور التاني: دليل الفروقات', short: 'دليل الفروقات', rooms: [
      { id: 'd1', t: 'الغسيل والتبريد', secs: DS(['washers', 'dryers', 'dish', 'fridge', 'freezer']) },
      { id: 'd2', t: 'التكييف والتهوية والتدفئة', secs: DS(['ac', 'cooling', 'fans', 'heaters', 'air']) },
      { id: 'd3', t: 'الطبخ والأفران', secs: DS(['cookers', 'hobs', 'ovens', 'hoods', 'micro']) },
      { id: 'd4', t: 'أجهزة المطبخ الصغيرة', secs: DS(['fryers', 'blend', 'juicers', 'coffee', 'cooksmall', 'grills']) },
      { id: 'd5', t: 'النظافة والمياه والتلفزيونات', secs: DS(['vac', 'irons', 'wheater', 'filters', 'disp', 'tv']) }
    ] }
  ];
  /* guest scenarios live inside the guide section they teach */
  const SCENES = {
    'skills:listen': ['s3-01'], 'guest:greet': ['s1-04', 's1-05'], 'guest:need': ['s2-05'], 'guest:disc': ['s2-01', 's2-02', 's2-03', 's2-04'],
    'guest:expose': ['s2-07'], 'guest:sell': ['s2-08', 's2-09'], 'guest:thank': ['s2-10'], 'objections:complaints': ['s3-02', 's3-03'],
    'policies:omni': ['s2-06'], 'policies:returns': ['s3-04', 's3-05'], 'policies:maint': ['s3-06'], 'protocols:open': ['s1-01', 's1-02'],
    'protocols:clean': ['s1-03'], 'protocols:deploy': ['s1-06', 's1-07'], 'protocols:closep': ['s3-08'], 'install:indiv': ['s3-07']
  };
  const TIMED = { 's1-01': 1, 's1-05': 1, 's3-08': 1 };
  const sceneOf = (sid) => { const m = /^s(\d)-(\d\d)$/.exec(sid); return G.stages[+m[1] - 1].scenes[+m[2] - 1]; };
  const ROOMS = []; FLOORS.forEach((f, fi) => f.rooms.forEach((r) => { r.floor = fi; r.n = ROOMS.length + 1; ROOMS.push(r); }));
  const secItems = (k) => (SCENES[k] || []).map((sid) => ({ key: sid, type: 'scene', sec: k, sid })).concat(SEC[k].qs.map((raw, i) => ({ key: k + '#' + i, type: 'q', sec: k, raw })));
  const roomItems = (r) => r.secs.flatMap(secItems);
  const roomSize = (r) => roomItems(r).length;
  const TOTAL = ROOMS.reduce((a, r) => a + roomSize(r), 0);
  (function check() { const used = new Set(ROOMS.flatMap((r) => r.secs)); Object.keys(SEC).forEach((k) => { if (!used.has(k)) console.warn('section not in any room', k); }); ROOMS.forEach((r) => r.secs.forEach((k) => { if (!SEC[k]) console.warn('missing section', k); })); })();
  const roomDone = (r) => save.keys[r.id] != null;
  const curRoomIdx = () => { const i = ROOMS.findIndex((r) => !roomDone(r)); return i; };
  const unlocked = (r) => { const c = curRoomIdx(); return c === -1 || ROOMS.indexOf(r) <= c; };
  const today = () => { const d = new Date(); return ar(d.getDate()) + '/' + ar(d.getMonth() + 1) + '/' + ar(d.getFullYear()); };
  const gradeOf = (p) => p >= 90 ? 'امتياز' : p >= 80 ? 'جيد جداً' : p >= 70 ? 'جيد' : 'مقبول';
  const KEYSVG = '<svg class="keyico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M11.5 12H22M18 12v4M21 12v3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

  /* ---------- screens ---------- */
  const screens = ['sHome', 'sStory', 'sReg', 'sHouse', 'sRun', 'sResult', 'sPick', 'sMine', 'sDash', 'sGuide'];
  let cur = 'sHome';
  function show(id) { screens.forEach((s) => { $(s).hidden = s !== id; }); cur = id; window.scrollTo(0, 0); if (id !== 'sRun') stopTimer(); }
  const firstGesture = () => startMusic();
  document.addEventListener('pointerdown', firstGesture, { once: true });
  document.addEventListener('keydown', firstGesture, { once: true });
  function syncToggles() { $('tMusic').setAttribute('aria-pressed', save.music); $('tSfx').setAttribute('aria-pressed', save.sfx); $('tVoice').setAttribute('aria-pressed', save.voice); }
  $('tMusic').onclick = () => { save.music = !save.music; persist(); syncToggles(); save.music ? startMusic() : stopMusic(); };
  $('tSfx').onclick = () => { save.sfx = !save.sfx; persist(); syncToggles(); sfx('click'); };
  $('tVoice').onclick = () => { save.voice = !save.voice; persist(); syncToggles(); if (!save.voice) hush(); };
  $('goHome').onclick = () => { hush(); sfx('click'); goHome(); };
  syncToggles();

  /* ---------- home ---------- */
  function goHome() {
    const done = ROOMS.filter(roomDone).length, ci = curRoomIdx();
    const doneItems = ROOMS.filter(roomDone).reduce((a, r) => a + roomSize(r), 0) + (ci >= 0 && save.run[ROOMS[ci].id] ? (save.run[ROOMS[ci].id].i || 0) : 0);
    $('jBar').style.width = (doneItems / TOTAL * 100) + '%';
    $('jDesc').textContent = `${ar(ROOMS.length)} أوضة في دورين و${ar(TOTAL)} سؤال وموقف، من أول سؤال لآخر سؤال في الدليلين. وفي الآخر «شهادة صاحب البيت المعتمد».`;
    $('jProg').textContent = done === 0 && doneItems === 0 ? 'لسه مابدأتش' : ci === -1 ? 'خلصت البيت كله!' : `${ar(done)} من ${ar(ROOMS.length)} مفتاح · ${ar(Math.round(doneItems / TOTAL * 100))}٪`;
    $('jBtn').textContent = ci === -1 ? 'شوف شهادتك' : (done || doneItems) ? 'كمّل الرحلة' : 'ابدأ الرحلة';
    const pc = Object.keys(save.certs).filter((k) => k !== 'FINAL').length;
    $('pProg').textContent = `شهادات الأجزاء: ${ar(pc)}`;
    $('homeHello').textContent = save.name ? `أهلاً يا ${save.name}! كل أوضة فيها مواقف ضيوف وأسئلة من الدليل، وكل أوضة تخلّصها تاخد مفتاحها.` : 'ادخل بيت راية مع الكوتش هشام: كل أوضة فيها مواقف ضيوف وأسئلة من الدليل، وكل أوضة تخلّصها تاخد مفتاحها.';
    show('sHome');
  }
  $('doorJourney').onclick = () => {
    sfx('click');
    if (!save.seenStory) return startStory();
    if (!registered()) return openReg('journey');
    const ci = curRoomIdx();
    if (ci === -1) return showFinal();
    if (save.run[ROOMS[ci].id]) say('welcome-back', 'أهلاً بيك تاني! نكمّل من مكان ما وقفنا.');
    openRoom(ROOMS[ci]);
  };
  $('doorPart').onclick = () => { sfx('click'); if (!registered()) return openReg('part'); openPick(0); };
  $('bMine').onclick = () => { sfx('click'); openMine(); };
  $('bGuide').onclick = () => { sfx('click'); openGuide(); };
  $('menuCoach').onclick = () => say('menu-welcome', 'أهلاً بيك في صاحب البيت. يلا نلعب!');

  /* ---------- story ---------- */
  let storyI = 0;
  function renderStory() {
    const s = G.intro[storyI];
    $('storyImg').src = G.poses[s.pose];
    $('storyText').textContent = s.text;
    $('storyDots').innerHTML = G.intro.map((_, i) => `<i class="${i === storyI ? 'on' : ''}"></i>`).join('');
    $('storyNext').textContent = storyI === G.intro.length - 1 ? 'يلا بينا' : 'كمّل';
    say('intro-' + (storyI + 1), s.text);
  }
  function startStory() { storyI = 0; show('sStory'); renderStory(); }
  $('storyNext').onclick = () => {
    sfx('click');
    if (storyI < G.intro.length - 1) { storyI++; return renderStory(); }
    save.seenStory = true; persist();
    if (!registered()) openReg('journey'); else openRoom(ROOMS[Math.max(0, curRoomIdx())]);
  };

  /* ---------- registration (name, HRID, branch, branch manager) ---------- */
  const registered = () => !!(save.name && save.hrid && save.branch && save.mgr);
  const BR = G.branches || [];
  const norm = (t) => String(t || '').toLowerCase().replace(/[\s\-–_.]+/g, ' ').trim();
  function combo(id, getItems, onPick) {
    const box = $(id), input = box.querySelector('input'), list = box.querySelector('.clist');
    let items = [], on = -1;
    const hl = (t, q) => { if (!q) return esc(t); const i = norm(t).indexOf(q); if (i < 0) return esc(t); return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
    function render() {
      const q = norm(input.value);
      items = getItems().filter((it) => !q || norm(it.v + ' ' + (it.s || '')).includes(q)).slice(0, 60);
      const exact = items.some((it) => norm(it.v) === q);
      list.innerHTML = items.map((it, i) => `<li role="option" data-i="${i}" class="${i === on ? 'on' : ''}">${hl(it.v, q)}${it.s ? `<small>${esc(it.s)}</small>` : ''}</li>`).join('') +
        (q && !exact ? `<li class="free" data-free="1">مش موجود؟ هيتسجل «${esc(input.value.trim())}» زي ما كتبته</li>` : '') +
        (!items.length && !q ? '<li class="free">اكتب للبحث</li>' : '');
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    const close = () => { list.hidden = true; on = -1; input.setAttribute('aria-expanded', 'false'); };
    const choose = (i) => { const it = items[i]; if (!it) return; input.value = it.v; close(); onPick && onPick(it); };
    input.addEventListener('focus', () => { on = -1; render(); });
    input.addEventListener('input', () => { on = -1; render(); onPick && onPick(null); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); on = Math.min(items.length - 1, on + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); on = Math.max(0, on - 1); render(); }
      else if (e.key === 'Enter' && !list.hidden && on >= 0) { e.preventDefault(); choose(on); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('mousedown', (e) => { const li = e.target.closest('li'); if (!li) return; e.preventDefault(); if (li.dataset.free) close(); else if (li.dataset.i) choose(+li.dataset.i); });
    input.addEventListener('blur', () => setTimeout(close, 120));
    return { input };
  }
  const uniq = (a) => [...new Set(a)];
  const cB = combo('cBranch', () => BR.map((b) => ({ v: b[0], s: 'مدير الفرع: ' + b[1] })), (it) => {
    if (!it) { $('areaHint').textContent = ''; return; }
    const b = BR.find((x) => x[0] === it.v); if (!b) return;
    $('rMgr').value = b[1]; $('areaHint').textContent = 'مدير المنطقة: ' + b[2];
  });
  const cM = combo('cMgr', () => uniq(BR.map((b) => b[1])).map((n) => ({ v: n, s: BR.filter((b) => b[1] === n).map((b) => b[0]).join(' · ') })), (it) => {
    if (!it) return; const b = BR.find((x) => x[1] === it.v); if (b && !$('rBranch').value.trim()) { $('rBranch').value = b[0]; $('areaHint').textContent = 'مدير المنطقة: ' + b[2]; }
  });
  let regNext = 'journey';
  function openReg(next) {
    regNext = next || 'home';
    $('rName').value = save.name || ''; $('rHrid').value = save.hrid || ''; $('rBranch').value = save.branch || ''; $('rMgr').value = save.mgr || '';
    const b = BR.find((x) => x[0] === save.branch); $('areaHint').textContent = b ? 'مدير المنطقة: ' + b[2] : '';
    $('regErr').hidden = true; ['rName', 'rHrid', 'rBranch', 'rMgr'].forEach((i) => $(i).classList.remove('bad'));
    $('regGo').textContent = regNext === 'journey' ? 'حفظ وادخل البيت' : regNext === 'part' ? 'حفظ واختار الجزء' : 'حفظ';
    show('sReg'); setTimeout(() => $(save.name ? 'rHrid' : 'rName').focus(), 60);
  }
  $('rHrid').addEventListener('input', () => { $('rHrid').value = $('rHrid').value.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, ''); });
  ['rName', 'rHrid', 'rBranch', 'rMgr'].forEach((i) => $(i).addEventListener('input', () => $(i).classList.remove('bad')));
  $('regBack').onclick = () => { sfx('click'); regNext === 'mine' ? openMine() : goHome(); };
  $('regForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = { name: $('rName').value.trim(), hrid: $('rHrid').value.trim(), branch: $('rBranch').value.trim(), mgr: $('rMgr').value.trim() };
    const miss = []; [['name', 'rName', 'الاسم'], ['hrid', 'rHrid', 'الـ HRID'], ['branch', 'rBranch', 'الفرع'], ['mgr', 'rMgr', 'مدير الفرع']].forEach(([k, id, t]) => { const bad = !v[k]; $(id).classList.toggle('bad', bad); if (bad) miss.push(t); });
    if (miss.length) { $('regErr').textContent = 'كمّل: ' + miss.join('، '); $('regErr').hidden = false; sfx('bad'); return; }
    const b = BR.find((x) => x[0] === v.branch);
    Object.assign(save, v, { area: b ? b[2] : '' }); persist(); sfx('best'); pushResult();
    if (regNext === 'journey') { const ci = curRoomIdx(); ci === -1 ? showFinal() : openRoom(ROOMS[ci]); }
    else if (regNext === 'part') openPick(0);
    else if (regNext === 'mine') openMine();
    else goHome();
  });

  /* ---------- house map ---------- */
  function openHouse() {
    const done = ROOMS.filter(roomDone).length, ci = curRoomIdx();
    $('houseSub').textContent = `${ar(done)} من ${ar(ROOMS.length)} مفتاح. الأوض بتتفتح بالترتيب، وتقدر تعيد أي أوضة خلصتها.`;
    $('houseBar').style.width = (done / ROOMS.length * 100) + '%';
    $('houseGo').textContent = ci === -1 ? 'شهادتك' : 'كمّل: ' + ROOMS[ci].t;
    $('houseGo').onclick = () => { sfx('click'); ci === -1 ? showFinal() : openRoom(ROOMS[ci]); };
    $('floors').innerHTML = FLOORS.map((f) => `<div class="floor"><h3>${esc(f.t)}</h3><p class="sub">${ar(f.rooms.length)} أوضة · ${ar(f.rooms.reduce((a, r) => a + roomSize(r), 0))} سؤال وموقف</p><div class="rooms">${f.rooms.map((r) => {
      const d = roomDone(r), c = ROOMS.indexOf(r) === ci, lock = !unlocked(r), prog = save.run[r.id];
      return `<button class="room ${d ? 'done' : ''} ${c ? 'cur' : ''}" data-r="${r.id}" ${lock ? 'disabled' : ''}>${d ? `<span class="st">${KEYSVG} ${ar(save.keys[r.id])}٪</span>` : c ? '<span class="st">دورك</span>' : ''}<span class="rn">${ar(r.n)}</span><b>${esc(r.t)}</b><small>${lock ? 'مقفولة لحد ما تخلص اللي قبلها' : prog ? `وقفت عند ${ar(prog.i + 1)} من ${ar(roomSize(r))}` : `${ar(roomSize(r))} سؤال وموقف`}</small></button>`;
    }).join('')}</div></div>`).join('');
    $('floors').querySelectorAll('.room').forEach((b) => b.onclick = () => { sfx('click'); openRoom(ROOMS.find((r) => r.id === b.dataset.r)); });
    show('sHouse');
  }

  /* ---------- runner (journey rooms + part exams) ---------- */
  let run = null, timer = null;
  const PART_TIME = 45;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function openRoom(r) {
    const saved = save.run[r.id];
    run = { mode: 'room', room: r, title: `أوضة ${ar(r.n)}: ${r.t}`, items: roomItems(r), i: 0, first: {}, phase: 'intro', queue: [] };
    if (saved) Object.assign(run, { i: saved.i || 0, first: saved.first || {}, queue: saved.queue || [], resume: saved.phase });
    show('sRun'); renderRun();
    if (r.floor === 1 && r.id === 'd1' && !saved) say('floor-2', 'خلّصت الدور الأول! الدور التاني دليل الفروقات: الضيف قال «عاوز…»، وإنت لازم تعرف الفرق في ثواني.');
    else if (!saved) say('room-start', 'يلا ندخل الأوضة دي. ركّز، وأنا معاك خطوة بخطوة.');
  }
  function persistRun() {
    if (run.mode !== 'room') return;
    save.run[run.room.id] = { i: run.i, first: run.first, phase: run.phase === 'intro' ? (run.resume || 'main') : run.phase, queue: run.queue };
    persist();
  }
  function setCoach(pose, text) {
    const img = $('coachImg'); img.src = G.poses[pose] || pose; img.classList.remove('pop'); void img.offsetWidth; img.classList.add('pop');
    $('coachSay').innerHTML = `<b>هشام:</b> ${esc(text)}`;
  }
  function hud() {
    const n = run.items.length, right = Object.values(run.first).filter(Boolean).length;
    $('hTitle').textContent = run.title;
    if (run.phase === 'review') { $('hProg').textContent = `مراجعة الغلطات · باقي ${ar(run.queue.length)}`; $('hFill').style.width = '100%'; $('hPct').textContent = '✓'; }
    else { const i = Math.min(run.i, n); $('hProg').textContent = run.phase === 'intro' ? `${ar(n)} سؤال وموقف` : `${ar(i + 1)} من ${ar(n)}`; $('hFill').style.width = (i / n * 100) + '%'; $('hPct').textContent = ar(Math.round(i / n * 100)) + '٪'; }
    $('hScore').textContent = `${ar(right)} صح`;
  }
  function renderRun() {
    stopTimer(); hud();
    if (run.phase === 'intro') return renderIntro();
    if (run.phase === 'review') { if (!run.queue.length) return finishRoom(); return renderItem(run.items.find((it) => it.key === run.queue[0])); }
    if (run.i >= run.items.length) return endMain();
    renderItem(run.items[run.i]);
  }
  function renderIntro() {
    const r = run.room, f = FLOORS[r.floor];
    const resumeTxt = run.resume === 'review' ? 'كمّل مراجعة الغلطات' : run.i > 0 ? `كمّل من ${ar(run.i + 1)}` : 'ادخل الأوضة';
    setCoach(r.n === 1 ? 'wave' : r.floor === 1 && r.id === 'd1' ? 'party' : 'talk', r.floor === 1 && r.id === 'd1' ? 'خلّصت الدور الأول! الدور التاني دليل الفروقات: الضيف قال «عاوز…»، وإنت لازم تعرف الفرق في ثواني.' : 'يلا ندخل الأوضة دي. ركّز، وأنا معاك خطوة بخطوة.');
    $('scene').innerHTML = `<div class="roomintro"><div class="where"><span class="pill clock">${esc(f.t)}</span><span class="pill">أوضة ${ar(r.n)} من ${ar(ROOMS.length)}</span></div>
      <h2 class="h2" style="margin-top:8px">${esc(r.t)}</h2>
      <p class="sub" style="margin:0">جوه الأوضة دي:</p>
      <ul>${r.secs.map((k) => `<li><b>${esc(SEC[k].t)}</b> <small style="color:var(--muted)">${esc(SEC[k].ref || '')} · ${ar(secItems(k).length)}${(SCENES[k] || []).length ? ` (منهم ${ar(SCENES[k].length)} موقف مع ضيف)` : ''}</small></li>`).join('')}</ul>
      <p class="sub">${roomDone(r) ? `خدت مفتاح الأوضة دي قبل كده بـ ${ar(save.keys[r.id])}٪، وتقدر تعيدها تحسّن نتيجتك.` : 'جاوب كل الأسئلة، وأي غلطة هنراجعها سوا في الآخر، وبعدها تاخد المفتاح.'}</p>
      <div class="row"><button class="btn small" id="toHouse">خريطة البيت</button><button class="btn primary" id="enter">${resumeTxt}</button></div></div>`;
    $('toHouse').onclick = () => { sfx('click'); openHouse(); };
    $('enter').onclick = () => { sfx('click'); run.phase = run.resume || 'main'; persistRun(); renderRun(); };
  }
  function renderItem(it) {
    const sec = SEC[it.sec], inReview = run.phase === 'review';
    const head = `<div class="banner"><b>${esc(sec.t)}</b><small>${inReview ? '<span class="phase">مراجعة</span>' : ''}${esc(sec.ref || '')}</small></div>`;
    let body = '';
    if (it.type === 'q') {
      const opts = shuffle([it.raw[1]].concat(it.raw[2]).slice(0, 4));
      run.cur = { it, opts, a: opts.indexOf(it.raw[1]) };
      body = `<p class="q">${esc(it.raw[0])}</p><div class="opts">${opts.map((o, n) => `<button class="opt" data-o="${n}"><span class="k">${LET[n]}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
      if (!inReview) setCoach(pick(['think', 'chin', 'arms', 'arms2', 'hmm', 'book']), run.mode === 'part' ? 'ركّز… الدليل في دماغك.' : 'اقرا السؤال كويس واختار.');
      else setCoach('book', 'السؤال ده غلطت فيه قبل كده. ركّز المرة دي.');
    } else {
      const sc = sceneOf(it.sid), gi = sc.guest, order = shuffle([0, 1, 2]);
      run.cur = { it, sc, order };
      const lineTxt = sc.line.replace(/^[^:]+:\s*/, '');
      body = `<div class="where">${TIMED[it.sid] ? `<span class="pill clock">${sc.clock}</span>` : ''}<span class="pill">موقف مع ضيف · ${esc(sc.place)}</span></div>
        <p class="narr">${esc(sc.narr)}</p>
        ${gi ? `<div class="guest">${face(gi.g, gi.angry ? 0.85 : 0.2, seedOf(gi.name))}<div><div class="gname">${esc(gi.name)}${gi.disc ? `<span class="disc" id="discTag" hidden>${gi.disc}</span>` : ''}</div><div class="say" id="gSay">${esc(lineTxt)}</div>${/^\s*\(/.test(lineTxt) ? '' : '<button class="replay" id="replay">اسمع تاني</button>'}</div></div>` : `<div class="say">${esc(sc.line)}</div>`}
        <div class="opts">${order.map((oi, n) => `<button class="opt" data-o="${oi}"><span class="k">${LET[n]}</span><span>${esc(sc.opts[oi].t)}</span></button>`).join('')}</div>`;
      setCoach(gi && gi.disc ? 'think' : 'chin', gi && gi.disc ? 'ركّز في طريقة كلامه… شخصيته إيه؟ واختار الرد المناسب.' : 'فكّر كصاحب بيت. هتختار أنهي رد؟');
      const m = /^s(\d)-(\d\d)$/.exec(it.sid);
      const sayLine = () => gi ? say('g-s' + m[1] + '-' + m[2], lineTxt, gi.g) : null;
      setTimeout(sayLine, 300);
      setTimeout(() => { const rp = $('replay'); if (rp) rp.onclick = sayLine; }, 0);
    }
    const timed = run.mode === 'part';
    $('scene').innerHTML = head + (timed ? `<div class="row"><span class="prog">${ar(run.i + 1)} من ${ar(run.items.length)}</span><span class="prog" id="tLeft">${ar(PART_TIME)} ثانية</span></div><div class="timer"><i id="tBar"></i></div>` : '') + body +
      `<div id="fbBox"></div><div class="row" style="margin-top:4px"><span></span><button class="btn small" id="quit">${run.mode === 'room' ? 'خروج وحفظ' : 'إنهاء الامتحان'}</button></div>`;
    $('scene').querySelectorAll('.opt').forEach((b) => b.onclick = () => answer(+b.dataset.o));
    $('quit').onclick = () => { sfx('click'); hush(); if (run.mode === 'room') { persistRun(); pushResult(); goHome(); } else finishPart(true); };
    if (timed) {
      let left = PART_TIME;
      timer = setInterval(() => { left--; const L = $('tLeft'), B = $('tBar'); if (!L) return stopTimer(); L.textContent = ar(Math.max(0, left)) + ' ثانية'; B.style.width = (left / PART_TIME * 100) + '%'; if (left <= 5 && left > 0) sfx('tick'); if (left <= 0) answer(-1); }, 1000);
    }
  }
  function answer(o) {
    stopTimer();
    const c = run.cur, it = c.it, inReview = run.phase === 'review';
    let right, fbHtml;
    if (it.type === 'q') {
      right = o === c.a;
      $('scene').querySelectorAll('.opt').forEach((x) => { x.disabled = true; const xi = +x.dataset.o; x.classList.add(xi === c.a ? 'best' : xi === o ? 'bad' : 'dim'); });
      if (o === -1) say('timeout', 'الوقت خلص! ركّز في السؤال اللي جاي.'); else right ? sayRand('right', 3, RIGHT) : sayRand('wrong', 3, WRONG);
      setCoach(right ? pick(G.reactPose.best) : pick(G.reactPose.bad), right ? pick(RIGHT) : o === -1 ? 'الوقت خلص!' : pick(WRONG));
      fbHtml = `<span class="verdict ${right ? 'best' : 'bad'}">${right ? 'صح' : o === -1 ? 'الوقت خلص' : 'غلط'}</span><div class="rule"><span class="ref">الإجابة: ${esc(it.raw[1])}</span>${esc(it.raw[3] || '')}</div>`;
    } else {
      const sc = c.sc, opt = o >= 0 ? sc.opts[o] : null, k = opt ? opt.k : 'bad';
      right = k === 'best';
      sfx(k);
      $('scene').querySelectorAll('.opt').forEach((x) => { x.disabled = true; const bo = sc.opts[+x.dataset.o]; if (+x.dataset.o === o) x.classList.add(k); else if (bo.k === 'best') x.classList.add('best'); else x.classList.add('dim'); });
      const dt = $('discTag'); if (dt) dt.hidden = false;
      if (sc.guest) { const f = $('scene').querySelector('.face'); if (f) f.outerHTML = face(sc.guest.g, k === 'best' ? 0 : k === 'ok' ? 0.55 : 0.95, seedOf(sc.guest.name)); }
      if (k === 'bad' && sc.guest) { const gs = $('gSay'); if (gs) gs.innerHTML = '<b style="color:var(--anger)">مش راجع تاني!</b>'; save.nopes = (save.nopes || 0) + 1; persist(); }
      const fb = opt ? opt.fb : 'الوقت خلص قبل ما تختار.';
      setCoach(pick(G.reactPose[k]), fb);
      const m = /^s(\d)-(\d\d)$/.exec(it.sid); say('s' + m[1] + '-' + m[2] + '-' + k, fb);
      fbHtml = `<span class="verdict ${k}">${{ best: 'أفضل اختيار', ok: 'مقبول… بس فيه أحسن', bad: 'غلط!' }[k]}</span><div>${esc(fb)}</div><div class="rule"><span class="ref">من الدليل — ${esc(sc.ref)}</span>${esc(sc.rule)}</div>`;
    }
    if (it.type === 'q') sfx(right ? 'best' : 'bad');
    if (!inReview) { if (run.first[it.key] == null) run.first[it.key] = right; run.log = run.log || []; run.log.push({ it, right }); }
    else { const k = run.queue.shift(); if (!right) run.queue.push(k); }
    hud();
    const nextTxt = inReview ? (run.queue.length ? 'اللي بعده' : 'خد المفتاح') : run.i >= run.items.length - 1 ? 'النتيجة' : 'اللي بعده';
    $('fbBox').innerHTML = `<div class="fb">${fbHtml}${inReview && !right ? '<div class="prog">هيرجعلك تاني في آخر المراجعة.</div>' : ''}<div class="row"><span></span><button class="btn primary small" id="nextBtn">${nextTxt}</button></div></div>`;
    $('nextBtn').focus({ preventScroll: true });
    $('fbBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $('nextBtn').onclick = () => { sfx('click'); if (!inReview) run.i++; persistRun(); renderRun(); };
  }
  function endMain() {
    if (run.mode === 'part') return finishPart(false);
    const wrong = run.items.filter((it) => run.first[it.key] === false).map((it) => it.key);
    if (!wrong.length) return finishRoom();
    run.phase = 'review'; run.queue = shuffle(wrong); persistRun(); hud();
    setCoach('book', 'فيه كام سؤال غلطت فيهم. تعالى نراجعهم سوا قبل ما تاخد المفتاح.');
    say('room-review', 'فيه كام سؤال غلطت فيهم. تعالى نراجعهم سوا قبل ما تاخد المفتاح.');
    $('scene').innerHTML = `<div class="roomintro"><h2 class="h2">مراجعة الغلطات</h2><p class="sub">خلّصت كل أسئلة الأوضة. فيه ${ar(wrong.length)} سؤال غلطت فيهم أول مرة. هيرجعولك واحد واحد، واللي تغلط فيه تاني هيرجعلك في الآخر، لحد ما تجاوبهم كلهم صح.</p><p class="sub">نتيجتك الأولى اتسجلت: ${ar(Math.round((run.items.length - wrong.length) / run.items.length * 100))}٪.</p><div class="row"><span></span><button class="btn primary" id="startRev">يلا نراجع</button></div></div>`;
    $('startRev').onclick = () => { sfx('click'); renderRun(); };
  }
  function finishRoom() {
    const r = run.room, n = run.items.length, right = run.items.filter((it) => run.first[it.key]).length;
    const pct = Math.round(right / n * 100), first = !roomDone(r);
    save.keys[r.id] = Math.max(save.keys[r.id] || 0, pct); delete save.run[r.id]; persist(); pushResult();
    sfx('win');
    const ci = curRoomIdx(), next = ci === -1 ? null : ROOMS[ci];
    const floorDone = FLOORS[r.floor].rooms.every(roomDone);
    const line = 'برافو! خدت مفتاح الأوضة دي. يلا على اللي بعدها.';
    $('sResult').innerHTML = `<div class="result"><img src="${G.poses[pct >= 85 ? 'party' : 'yes']}" alt="الكوتش هشام">
      <div class="panel"><div class="keybig">${KEYSVG.replace('keyico', 'keyico" style="width:56px;height:56px')} مفتاح أوضة ${ar(r.n)}</div>
      <h2 class="h2" style="margin-top:8px">${esc(r.t)}</h2>
      <div class="big">${ar(pct)}٪ <small style="font-size:.35em;color:var(--muted)">صح من أول مرة · ${ar(right)} من ${ar(n)}</small></div>
      <p class="sub">${ar(ROOMS.filter(roomDone).length)} من ${ar(ROOMS.length)} مفتاح${floorDone && first ? ` · خلّصت ${esc(FLOORS[r.floor].t)}!` : ''}</p>
      <div class="bubble" style="margin-bottom:12px;min-height:0;font-size:18px">${esc(next ? line : 'جمعت كل مفاتيح البيت! شهادتك جاهزة.')}</div>
      <div class="btns" style="flex-direction:row;flex-wrap:wrap;max-width:none">
        ${next ? `<button class="btn primary" id="rNext">الأوضة اللي بعدها: ${esc(next.t)}</button>` : '<button class="btn hot" id="rFinal">استلم شهادتك</button>'}
        <button class="btn small" id="rHouse">خريطة البيت</button></div></div></div>`;
    show('sResult');
    next ? say('room-pass', line) : null;
    const nb = $('rNext'); if (nb) nb.onclick = () => { sfx('click'); openRoom(next); };
    const fb = $('rFinal'); if (fb) fb.onclick = () => { sfx('click'); showFinal(); };
    $('rHouse').onclick = () => { sfx('click'); openHouse(); };
  }

  /* ---------- certificates ---------- */
  /* ---------- certificate (drawn on canvas → image the employee can download) ---------- */
  const certCode = (c) => { let h = 0; const s = [save.name, save.hrid, c.t, c.pct, c.date].join('|'); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'SB-' + (save.hrid || '0') + '-' + h.toString(36).toUpperCase().slice(0, 5); };
  const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  async function drawCert(c) {
    const CA = window.SAHEB_CERT_ASSETS || {};
    if (CA.sig && !drawCert.sig) { try { const f = new FontFace('HeshamSig', 'url(' + CA.sig + ')'); document.fonts.add(await f.load()); drawCert.sig = 1; } catch (e) {} }
    try { await Promise.all([document.fonts.load('80px Lalezar'), document.fonts.load('700 40px "Baloo Bhaijaan 2"'), document.fonts.load('500 30px "Baloo Bhaijaan 2"'), document.fonts.load('90px HeshamSig')]); } catch (e) {}
    const W = 2000, H = 1414, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d'); x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const NAVY = '#0b2470', BLUE = '#2a6fd6', GOLD = '#c9971c', INK = '#0a1a45', MUT = '#4b5f86';
    const D = '"Lalezar","Baloo Bhaijaan 2",Tahoma,sans-serif', B = '"Baloo Bhaijaan 2",Tahoma,sans-serif';
    const ltr = (fn) => { x.direction = 'ltr'; fn(); x.direction = 'rtl'; };
    // paper + frames
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1200); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef5fd'); x.fillStyle = g; x.fillRect(60, 60, W - 120, H - 120);
    x.strokeStyle = NAVY; x.lineWidth = 28; x.strokeRect(30, 30, W - 60, H - 60);
    x.strokeStyle = GOLD; x.lineWidth = 4; x.strokeRect(70, 70, W - 140, H - 140);
    x.strokeStyle = BLUE; x.lineWidth = 1.5; x.strokeRect(84, 84, W - 168, H - 168);
    x.fillStyle = GOLD; [[84, 84], [W - 84, 84], [84, H - 84], [W - 84, H - 84]].forEach(([a, b]) => { x.save(); x.translate(a, b); x.rotate(Math.PI / 4); x.fillRect(-13, -13, 26, 26); x.restore(); });
    // faint watermark logo
    const logo = await loadImg(CA.logo || 'img/raya-logo.png');
    if (logo) { x.save(); x.globalAlpha = 0.045; const lw = 1100, lh = logo.height * lw / logo.width; x.drawImage(logo, (W - lw) / 2, 560, lw, lh); x.restore(); }
    // header: logo + academy name
    if (logo) { const lh = 150, lw = logo.width * lh / logo.height; x.drawImage(logo, (W - lw) / 2, 112, lw, lh); }
    ltr(() => { x.fillStyle = NAVY; x.font = `700 40px ${B}`; const t = 'R A Y A   R E T A I L   A C A D E M Y'; x.fillText(t, W / 2, 322); });
    x.strokeStyle = GOLD; x.lineWidth = 3; [[-1], [1]].forEach(([d]) => { x.beginPath(); x.moveTo(W / 2 + d * 430, 309); x.lineTo(W / 2 + d * 560, 309); x.stroke(); });
    // title
    x.fillStyle = NAVY; x.font = `400 84px ${D}`; x.fillText(c.final ? 'شهادة صاحب البيت المعتمد' : 'شهادة إتمام', W / 2, 432);
    x.fillStyle = MUT; x.font = `500 38px ${B}`; x.fillText('تشهد أكاديمية راية للتجزئة بأن', W / 2, 505);
    // name
    let ns = 124; x.font = `400 ${ns}px ${D}`; while (x.measureText(save.name || '').width > W - 640 && ns > 60) { ns -= 6; x.font = `400 ${ns}px ${D}`; }
    x.fillStyle = BLUE; x.fillText(save.name || 'صاحب البيت', W / 2, 640);
    x.strokeStyle = GOLD; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2 - 500, 672); x.lineTo(W / 2 + 500, 672); x.stroke();
    ltr(() => { x.fillStyle = MUT; x.font = `600 32px ${B}`; x.fillText(`HRID ${save.hrid || '—'}   ·   ${save.branch || ''}`, W / 2, 722); });
    // body
    const lines = c.final
      ? ['أتمّ رحلة «بيت راية» كاملة: ' + ar(ROOMS.length) + ' أوضة في دليل مستشار راية ودليل الفروقات،', 'وأثبت إتقانه لخطوات GUEST وسياسات وبروتوكولات راية، وأصبح صاحب بيت معتمد.']
      : ['اجتاز بنجاح امتحان', '«' + c.t + '»'];
    lines.forEach((l, i) => {
      const big = i === 1 && !c.final; let fs = big ? 58 : 42; const fam = big ? D : B, wt = big ? 400 : 600;
      x.font = `${wt} ${fs}px ${fam}`; while (x.measureText(l).width > W - 560 && fs > 28) { fs -= 2; x.font = `${wt} ${fs}px ${fam}`; }
      x.fillStyle = big ? NAVY : INK; x.fillText(l, W / 2, 815 + i * 72);
    });
    // seal (left)
    const sx = 340, sy = 1095;
    x.fillStyle = GOLD; x.beginPath(); for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, r = i % 2 ? 148 : 164; x.lineTo(sx + r * Math.cos(a), sy + r * Math.sin(a)); } x.closePath(); x.fill();
    x.fillStyle = NAVY; x.beginPath(); x.arc(sx, sy, 126, 0, Math.PI * 2); x.fill();
    x.strokeStyle = GOLD; x.lineWidth = 4; x.beginPath(); x.arc(sx, sy, 110, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#fff'; x.font = `400 72px ${D}`; x.fillText(ar(c.pct) + '٪', sx, sy + 8);
    x.fillStyle = '#ffd77a'; x.font = `700 34px ${B}`; x.fillText(gradeOf(c.pct), sx, sy + 60);
    // avatar (right)
    const av = await loadImg(CA.avatar || G.poses.yes);
    if (av) { const h = 380, w = av.width * h / av.height; x.drawImage(av, W - 140 - w, H - 86 - h, w, h); }
    // name, title, then the signature under it (center)
    const cx = W / 2;
    ltr(() => {
      x.fillStyle = INK; x.font = `700 34px ${B}`; x.fillText('Hesham Alghamrawi', cx, 1060);
      x.fillStyle = MUT; x.font = `600 25px ${B}`; x.fillText('Senior Training & Development Manager · Raya Retail Academy', cx, 1098);
    });
    const sy2 = 1192;
    x.save(); x.translate(cx, sy2); x.rotate(-0.04); ltr(() => { x.fillStyle = '#16307e'; x.font = `400 70px HeshamSig, "Great Vibes", "Brush Script MT", cursive`; x.fillText('Hesham Alghamrawi', 0, 0); }); x.restore();
    x.strokeStyle = '#16307e'; x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - 200, sy2 + 16); x.bezierCurveTo(cx - 60, sy2 + 34, cx + 100, sy2 + 4, cx + 220, sy2 + 20); x.stroke();
    x.strokeStyle = INK; x.lineWidth = 1.2; x.beginPath(); x.moveTo(cx - 240, sy2 + 44); x.lineTo(cx + 240, sy2 + 44); x.stroke();
    ltr(() => { x.fillStyle = MUT; x.font = `500 24px ${B}`; x.fillText(`${c.date.replace(/[٠-٩]/g, (d) => AR.indexOf(d))}   ·   Certificate No. ${certCode(c)}`, cx, 1290); });
    return cv;
  }
  function certHTML(c) {
    const k = 'c' + Math.random().toString(36).slice(2, 8);
    CERTQ[k] = c;
    return `<div class="certbox"><img class="certimg" id="${k}" alt="شهادة ${esc(save.name || '')}"><div class="row"><span class="prog">رقم الشهادة: <span dir="ltr">${certCode(c)}</span></span><button class="btn primary small" data-dl="${k}">تنزيل الشهادة صورة</button></div></div>`;
  }
  const CERTQ = {};
  async function mountCerts() {
    for (const k of Object.keys(CERTQ)) {
      const img = $(k); if (!img) continue; const c = CERTQ[k]; delete CERTQ[k];
      const cv = await drawCert(c);
      try { img.src = cv.toDataURL('image/png'); } catch (e) { cv.className = 'certimg'; img.replaceWith(cv); }
      const btn = document.querySelector(`[data-dl="${k}"]`);
      if (btn) btn.onclick = () => { sfx('click'); cv.toBlob((blob) => saveFile('شهادة-' + (save.name || 'صاحب-البيت').replace(/\s+/g, '-') + '.png', blob)); };
    }
  }
  async function saveFile(name, blob) {
    if (DL) { try { await DL.save({ filename: name, data: blob }); return; } catch (e) { return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function overall() { const n = ROOMS.reduce((a, r) => a + roomSize(r), 0); return Math.round(ROOMS.reduce((a, r) => a + (save.keys[r.id] || 0) * roomSize(r), 0) / n); }
  function showFinal() {
    if (curRoomIdx() !== -1) return openHouse();
    const pct = overall();
    if (!save.certs.FINAL || save.certs.FINAL.pct !== pct) { save.certs.FINAL = { t: 'شهادة صاحب البيت المعتمد', pct, date: today(), final: true }; persist(); pushResult(); }
    sfx('win');
    $('sResult').innerHTML = `<div class="result"><img src="${G.poses.party}" alt="الكوتش هشام بيحتفل"><div style="display:flex;flex-direction:column;gap:14px;min-width:0">${certHTML(save.certs.FINAL)}
      <div class="panel"><p class="sub" style="margin:0">النتيجة = متوسط إجاباتك الصح من أول مرة في كل الأوض. تقدر تعيد أي أوضة تحسّن نتيجتك، والشهادة هتتحدّث لوحدها. نزّل الشهادة صورة واحتفظ بيها.</p>
      <div class="btns" style="flex-direction:row;flex-wrap:wrap;max-width:none;margin-top:10px"><button class="btn small" id="fHouse">خريطة البيت</button><button class="btn small" id="fMine">شهاداتي</button></div></div></div></div>`;
    show('sResult'); mountCerts();
    say('final-cert', 'مبروك! جمعت كل مفاتيح البيت، وإنت كده صاحب بيت معتمد.');
    $('fHouse').onclick = () => { sfx('click'); openHouse(); };
    $('fMine').onclick = () => { sfx('click'); openMine(); };
  }

  /* ---------- part exams ---------- */
  let pickFloor = 0;
  function openPick(f) {
    pickFloor = f; show('sPick'); renderPick();
    say('part-intro', 'اختار الجزء اللي عايز تتأكد إنك ذاكرته كويس، وامتحن فيه.');
  }
  const certBadge = (id) => save.certs[id] ? `<span class="score-chip ok">${ar(save.certs[id].pct)}٪</span>` : '<span class="prog">—</span>';
  function renderPick() {
    document.querySelectorAll('#pickTabs .tab').forEach((t) => t.setAttribute('aria-selected', +t.dataset.f === pickFloor));
    const f = FLOORS[pickFloor], fid = 'F' + pickFloor;
    let h = `<div class="hubtop" style="margin-bottom:12px"><div><b>${esc(f.t)} كله</b><p class="sub" style="margin:4px 0 0">٥٠ سؤال موزعين على كل أجزاء ${esc(f.short)}.</p></div><div style="display:flex;gap:8px;align-items:center">${certBadge(fid)}<button class="btn hot" id="pFloor">امتحن في الدور كله</button></div></div>`;
    h += f.rooms.map((r) => `<details class="chap"><summary><span>أوضة ${ar(r.n)}: ${esc(r.t)}</span><span class="prog">${ar(roomSize(r))} سؤال وموقف</span></summary><div class="seclist">
      <div class="secrow chaprow"><div class="secname"><b>الأوضة كلها</b><small>كل أسئلة ومواقف «${esc(r.t)}»</small></div>${certBadge('R:' + r.id)}<div class="secbtns"><button class="btn small hot" data-room="${r.id}">امتحن</button></div></div>
      ${r.secs.length > 1 ? r.secs.map((k) => `<div class="secrow"><div class="secname"><b>${esc(SEC[k].t)}</b><small>${esc(SEC[k].ref || '')} · ${ar(secItems(k).length)} سؤال</small></div>${certBadge('S:' + k)}<div class="secbtns"><button class="btn small primary" data-sec="${k}">امتحن</button></div></div>`).join('') : ''}
      </div></details>`).join('');
    $('pickBody').innerHTML = h;
    $('pFloor').onclick = () => {
      sfx('click');
      const secs = f.rooms.flatMap((r) => r.secs), per = secs.map((k) => shuffle(secItems(k)));
      const items = []; let round = 0;
      while (items.length < 50 && per.some((p) => p.length > round)) { per.forEach((p) => { if (items.length < 50 && p[round]) items.push(p[round]); }); round++; }
      startPart(fid, f.t + ' كله', shuffle(items));
    };
    $('pickBody').querySelectorAll('[data-room]').forEach((b) => b.onclick = () => { sfx('click'); const r = ROOMS.find((x) => x.id === b.dataset.room); startPart('R:' + r.id, r.t, shuffle(roomItems(r))); });
    $('pickBody').querySelectorAll('[data-sec]').forEach((b) => b.onclick = () => { sfx('click'); const k = b.dataset.sec; startPart('S:' + k, SEC[k].t, shuffle(secItems(k))); });
  }
  document.querySelectorAll('#pickTabs .tab').forEach((t) => t.onclick = () => { sfx('click'); pickFloor = +t.dataset.f; renderPick(); });
  function startPart(id, t, items) {
    run = { mode: 'part', partId: id, title: 'امتحان: ' + t, partT: t, items, i: 0, first: {}, phase: 'main', queue: [], log: [] };
    show('sRun'); renderRun();
    say('exam-intro', 'يلا بينا، ركّز في كل سؤال. بالتوفيق!');
  }
  function finishPart(quit) {
    stopTimer();
    const n = run.items.length, right = run.items.filter((it) => run.first[it.key]).length, pct = Math.round(right / n * 100);
    const finished = run.log.length === n, pass = finished && pct >= 80;
    if (pass && (!save.certs[run.partId] || save.certs[run.partId].pct < pct)) { save.certs[run.partId] = { t: run.partT, pct, date: today() }; persist(); }
    if (finished) { attempts().push({ t: run.partT, pct, pass, date: today() }); if (save.attempts.length > 40) save.attempts = save.attempts.slice(-40); persist(); pushResult(); }
    sfx(pass ? 'win' : 'fail');
    const review = (run.log || []).map((l) => {
      const q = l.it.type === 'q' ? l.it.raw[0] : sceneOf(l.it.sid).narr;
      const a = l.it.type === 'q' ? l.it.raw[1] : sceneOf(l.it.sid).opts.find((o) => o.k === 'best').t;
      return `<li><b>${esc(q)}</b><br><span class="tagk ${l.right ? 'best' : 'bad'}">${l.right ? 'صح' : 'غلط'}</span>الإجابة الصح: ${esc(a)}</li>`;
    }).join('');
    const cfg = run;
    $('sResult').innerHTML = `<div class="result"><img src="${G.poses[pass ? 'party' : 'worry']}" alt="الكوتش هشام"><div style="display:flex;flex-direction:column;gap:14px;min-width:0">
      ${pass ? certHTML(save.certs[cfg.partId]) : `<div class="panel"><h2 class="h2">${esc(cfg.title)}</h2><p class="sub">${finished ? 'النجاح من ٨٠٪. راجع إجاباتك تحت وجرّب تاني.' : 'إنهيت الامتحان قبل ما يخلص، فالنتيجة ماتسجلتش.'}</p></div>`}
      <div class="panel"><div class="row"><div class="big">${ar(pct)}٪<small style="font-size:.35em;color:var(--muted)"> · ${ar(right)} من ${ar(n)}</small></div>
      <div class="btns" style="flex-direction:row;flex-wrap:wrap"><button class="btn primary small" id="eAgain">امتحن تاني</button><button class="btn small" id="ePick">اختار جزء تاني</button></div></div>
      <details ${pass ? '' : 'open'}><summary style="cursor:pointer;font-weight:800;color:var(--navy)">مراجعة الإجابات</summary><ol class="gcard" style="margin-top:8px">${review || '<li>مفيش إجابات.</li>'}</ol></details></div></div></div>`;
    show('sResult'); mountCerts();
    say(pass ? 'part-pass' : 'part-fail', pass ? 'مبروك، دي شهادة الجزء ده باسمك.' : 'قربت جداً. راجع الإجابات وجرّب تاني.');
    $('eAgain').onclick = () => { sfx('click'); startPart(cfg.partId, cfg.partT, shuffle(cfg.items)); };
    $('ePick').onclick = () => { sfx('click'); openPick(pickFloor); };
  }

  /* ---------- my keys & certificates ---------- */
  function openMine() {
    $('mineWho').textContent = `${save.name} · HRID ${save.hrid} · ${save.branch} · مدير الفرع: ${save.mgr}`;
    const fin = save.certs.FINAL;
    const parts = Object.keys(save.certs).filter((k) => k !== 'FINAL');
    let h = `<h3 class="gsec">مفاتيح البيت (${ar(ROOMS.filter(roomDone).length)} من ${ar(ROOMS.length)})</h3>`;
    h += FLOORS.map((f) => `<p class="sub" style="margin:6px 0">${esc(f.t)}</p><div class="rooms">${f.rooms.map((r) => `<div class="room ${roomDone(r) ? 'done' : ''}">${roomDone(r) ? `<span class="st">${KEYSVG} ${ar(save.keys[r.id])}٪</span>` : ''}<span class="rn">${ar(r.n)}</span><b>${esc(r.t)}</b><small>${roomDone(r) ? 'معاك المفتاح' : 'لسه'}</small></div>`).join('')}</div>`).join('');
    h += `<h3 class="gsec">الشهادة الكبرى</h3>${fin ? `<button class="certmini" data-c="FINAL"><b>${esc(fin.t)}</b><small>${ar(fin.pct)}٪ · ${gradeOf(fin.pct)} · ${fin.date}</small></button>` : `<p class="empty">بتتفتح لما تجمع المفاتيح الـ ${ar(ROOMS.length)} من «الرحلة الكاملة».</p>`}`;
    h += `<h3 class="gsec">شهادات الأجزاء</h3>${parts.length ? `<div class="certlist">${parts.map((k) => `<button class="certmini" data-c="${esc(k)}"><b>${esc(save.certs[k].t)}</b><small>${ar(save.certs[k].pct)}٪ · ${save.certs[k].date}</small></button>`).join('')}</div>` : '<p class="empty">لسه مفيش. ادخل «امتحن نفسك في جزء» وخد أول شهادة.</p>'}`;
    h += `<p style="margin-top:14px"><span class="nope">الضيوف اللي قالولك «مش راجع تاني!»: ${ar(save.nopes || 0)}</span></p>`;
    $('mineBody').innerHTML = h;
    $('mineBody').querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
      sfx('click'); const c = save.certs[b.dataset.c];
      $('sResult').innerHTML = `<div class="result"><img src="${G.poses.yes}" alt=""><div style="display:flex;flex-direction:column;gap:14px;min-width:0">${certHTML(c)}<div class="row"><span></span><button class="btn small" id="backMine">رجوع لشهاداتي</button></div></div></div>`;
      show('sResult'); mountCerts(); $('backMine').onclick = () => { sfx('click'); openMine(); };
    });
    $('resetBox').innerHTML = '<button class="btn small" id="bReset">امسح كل التقدم</button>';
    $('bReset').onclick = () => {
      $('resetBox').innerHTML = '<span style="font-weight:700">متأكد؟ هيتمسح الاسم والمفاتيح والشهادات.</span><button class="btn small" id="rYes">أيوه امسح</button><button class="btn small primary" id="rNo">لأ</button>';
      $('rYes').onclick = () => { const k = { music: save.music, sfx: save.sfx, voice: save.voice }; save = Object.assign(fresh(), k); persist(); openMine(); };
      $('rNo').onclick = openMine;
    };
    show('sMine');
  }
  $('editReg').onclick = () => { sfx('click'); openReg('mine'); };


  /* ---------- results → trainer (db capability) ---------- */
  let DB = null, MYID = null, IS_OWNER = false, DL = null, writing = Promise.resolve();
  const attempts = () => (save.attempts = save.attempts || []);
  function summary() {
    const done = ROOMS.filter(roomDone), ci = curRoomIdx();
    const doneItems = done.reduce((a, r) => a + roomSize(r), 0) + (ci >= 0 && save.run[ROOMS[ci].id] ? (save.run[ROOMS[ci].id].i || 0) : 0);
    const certs = {}; Object.keys(save.certs).filter((k) => k !== 'FINAL').forEach((k) => { certs[k] = save.certs[k]; });
    const keys = {}; ROOMS.forEach((r) => { if (roomDone(r)) keys[r.id] = save.keys[r.id]; });
    const avg = done.length ? Math.round(done.reduce((a, r) => a + save.keys[r.id] * roomSize(r), 0) / done.reduce((a, r) => a + roomSize(r), 0)) : null;
    return { name: save.name, hrid: save.hrid, branch: save.branch, mgr: save.mgr, area: save.area || '',
      roomsDone: done.length, roomsTotal: ROOMS.length, progress: Math.round(doneItems / TOTAL * 100), avg, keys,
      currentRoom: ci === -1 ? '' : ROOMS[ci].t, final: save.certs.FINAL ? { pct: save.certs.FINAL.pct, date: save.certs.FINAL.date } : null,
      certs, certCount: Object.keys(certs).length, attempts: attempts().slice(-20), nopes: save.nopes || 0,
      startedAt: save.startedAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  function pushResult() {
    if (!registered()) return;
    if (!save.uid) save.uid = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    if (!save.startedAt) save.startedAt = new Date().toISOString();
    persist();
    const body = Object.assign(summary(), { uid: save.uid });
    if (CFG.excelUrl) {
      // Microsoft Excel via Power Automate: flat row, every value as text, one row per HRID
      const t = (v) => v == null ? '' : String(v);
      const flat = { hrid: t(body.hrid), name: t(body.name), branch: t(body.branch), mgr: t(body.mgr), area: t(body.area),
        roomsDone: t(body.roomsDone), roomsTotal: t(body.roomsTotal), progress: t(body.progress), avg: t(body.avg),
        finalPct: body.final ? t(body.final.pct) : '', finalDate: body.final ? t(body.final.date) : '', certCount: t(body.certCount || 0),
        currentRoom: t(body.currentRoom), nopes: t(body.nopes || 0), startedAt: t(body.startedAt), updatedAt: t(body.updatedAt) };
      writing = writing.then(() => fetch(CFG.excelUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(flat), keepalive: true })).catch(() => {});
    }
    if (CFG.resultsUrl) {
      // Google Sheet (Apps Script web app): plain-text POST avoids a CORS preflight; one row per HRID
      writing = writing.then(() => fetch(CFG.resultsUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), keepalive: true })).catch(() => {});
      return;
    }
    if (CFG.excelUrl || !DB || !MYID) return;
    writing = writing.then(() => DB.doc('results/' + MYID).set(body)).catch(() => {});
  }
  (async function connect() {
    const C = window.claude; if (!C || !C.use) { pushResult(); return; }
    try { const u = await C.use('user'); if (u) { IS_OWNER = !!(await u.isOwner()); MYID = await u.id(); } } catch (e) {}
    try { DB = await C.use('db'); } catch (e) { DB = null; }
    if (IS_OWNER && DB) $('bDash').hidden = false;
    if (IS_OWNER) { try { DL = await C.use('downloads'); } catch (e) { DL = null; } }
    pushResult();
  })();

  /* ---------- owner dashboard ---------- */
  let ROWS = [], unsub = null, sortKey = 'updatedAt', sortDir = -1, openRow = null;
  const stOf = (r) => r.final ? 'done' : (r.roomsDone || (r.progress || 0) > 0) ? 'going' : 'new';
  const ST = { done: 'خلّص الرحلة', going: 'شغال فيها', new: 'مسجل بس' };
  const fmtD = (iso) => { try { const d = new Date(iso); return ar(d.getDate()) + '/' + ar(d.getMonth() + 1) + ' ' + ar(String(d.getHours()).padStart(2, '0')) + ':' + ar(String(d.getMinutes()).padStart(2, '0')); } catch (e) { return ''; } };
  $('bDash').onclick = () => { sfx('click'); openDash(); };
  let dashKey = '';
  async function loadSheet() {
    $('dashSub').textContent = 'بيحمّل النتايج من الشيت…';
    try {
      const r = await fetch(CFG.resultsUrl + (CFG.resultsUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(dashKey) + '&t=' + Date.now());
      const j = await r.json();
      if (j.error) { $('dashSub').textContent = 'كلمة سر اللوحة غلط.'; $('dashKeyBox').hidden = false; return; }
      ROWS = (j.rows || []).map((x) => Object.assign({ id: x.hrid || x.uid }, x));
      $('dashKeyBox').hidden = true; $('dashSub').textContent = `آخر تحديث: ${fmtD(new Date().toISOString())} · دوس «تحديث» عشان تجيب الجديد.`;
      fillFilters(); renderDash();
    } catch (e) { $('dashSub').textContent = 'مش قادر يوصل للشيت. اتأكد من لينك الشيت في config.js وإن النشر مفتوح لـ Anyone.'; }
  }
  function openDash() {
    show('sDash');
    $('dashCsv').hidden = false;
    if (CFG.excelUrl && !CFG.resultsUrl) { $('dashCsv').hidden = true; $('dashSub').textContent = 'النتايج بتتسجل في ملف الإكسل بتاعك على OneDrive، صف لكل موظف حسب الـ HRID. افتح الملف من هناك وفلتر زي ما تحب.'; renderDash(); return; }
    if (CFG.resultsUrl) {
      $('dashRefresh').hidden = false;
      if (!dashKey) { $('dashKeyBox').hidden = false; $('dashSub').textContent = 'اكتب كلمة سر اللوحة اللي حطيتها في كود الشيت.'; setTimeout(() => $('dashKey').focus(), 50); }
      else loadSheet();
      renderDash(); return;
    }
    if (!DB) { $('dashSub').textContent = 'اللوحة بتشتغل بعد ما ترفع اللعبة وتربطها بشيت جوجل (شوف ملف «طريقة النشر»).'; renderDash(); return; }
    if (!unsub) unsub = DB.collection('results').onSnapshot((snap) => { ROWS = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())); fillFilters(); renderDash(); }, () => { $('dashSub').textContent = 'حصلت مشكلة في قراءة النتايج. اقفل الصفحة وافتحها تاني.'; });
    renderDash();
  }
  function fillFilters() {
    const keep = (sel, vals, all) => { const v = sel.value; sel.innerHTML = `<option value="">${all}</option>` + vals.map((x) => `<option>${esc(x)}</option>`).join(''); sel.value = vals.includes(v) ? v : ''; };
    keep($('fBranch'), [...new Set(ROWS.map((r) => r.branch).filter(Boolean))].sort(), 'كل الفروع');
    keep($('fArea'), [...new Set(ROWS.map((r) => r.area).filter(Boolean))].sort(), 'كل مديري المناطق');
  }
  ['fQ', 'fBranch', 'fArea', 'fStatus'].forEach((i) => $(i).addEventListener('input', renderDash));
  function filtered() {
    const q = norm($('fQ').value), b = $('fBranch').value, a = $('fArea').value, s = $('fStatus').value;
    return ROWS.filter((r) => (!q || norm(r.name + ' ' + r.hrid).includes(q)) && (!b || r.branch === b) && (!a || r.area === a) && (!s || stOf(r) === s));
  }
  function renderDash() {
    const list = filtered();
    const done = list.filter((r) => r.final).length, avgs = list.filter((r) => r.avg != null);
    const avg = avgs.length ? Math.round(avgs.reduce((x, r) => x + r.avg, 0) / avgs.length) : null;
    $('dashTiles').innerHTML = [[ar(list.length), 'موظف مسجل'], [ar(done), 'خلّصوا الرحلة وخدوا الشهادة'], [avg == null ? '—' : ar(avg) + '٪', 'متوسط النتيجة'], [ar(list.reduce((x, r) => x + (r.certCount || 0), 0)), 'شهادة جزء']].map((t) => `<div class="tile"><b>${t[0]}</b><span>${t[1]}</span></div>`).join('');
    const cols = [['name', 'الاسم'], ['hrid', 'HRID'], ['branch', 'الفرع'], ['mgr', 'مدير الفرع'], ['area', 'مدير المنطقة'], ['roomsDone', 'المفاتيح'], ['avg', 'النتيجة'], ['final', 'الشهادة الكبرى'], ['certCount', 'شهادات أجزاء'], ['updatedAt', 'آخر نشاط']];
    const val = (r, k) => k === 'final' ? (r.final ? r.final.pct : -1) : r[k] == null ? -1 : r[k];
    const rows = list.slice().sort((x, y) => { const a = val(x, sortKey), b = val(y, sortKey); return (a > b ? 1 : a < b ? -1 : 0) * sortDir; });
    $('dashTable').innerHTML = `<thead><tr>${cols.map((c) => `<th data-k="${c[0]}">${c[1]}${sortKey === c[0] ? (sortDir < 0 ? ' ▼' : ' ▲') : ''}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr class="click" data-id="${esc(r.id)}">
      <td><b>${esc(r.name || '')}</b><br><span class="st-${stOf(r)}">${ST[stOf(r)]}</span></td><td class="ltr">${esc(r.hrid || '')}</td><td class="ltr">${esc(r.branch || '')}</td><td class="ltr">${esc(r.mgr || '')}</td><td class="ltr">${esc(r.area || '')}</td>
      <td>${ar(r.roomsDone || 0)}/${ar(r.roomsTotal || ROOMS.length)}<span class="minibar"><i style="width:${r.progress || 0}%"></i></span></td>
      <td>${r.avg == null ? '—' : ar(r.avg) + '٪'}</td><td>${r.final ? `<b class="st-done">${ar(r.final.pct)}٪</b> · ${gradeOf(r.final.pct)}` : '—'}</td><td>${ar(r.certCount || 0)}</td><td>${fmtD(r.updatedAt)}</td></tr>`).join('') : `<tr><td colspan="${cols.length}" class="empty">${ROWS.length ? 'مفيش نتايج بالفلتر ده.' : 'لسه محدش سجّل. أول ما موظف يكتب بياناته هيظهر هنا.'}</td></tr>`}</tbody>`;
    $('dashTable').querySelectorAll('th').forEach((th) => th.onclick = () => { const k = th.dataset.k; sortDir = sortKey === k ? -sortDir : -1; sortKey = k; renderDash(); });
    $('dashTable').querySelectorAll('tr.click').forEach((tr) => tr.onclick = () => { openRow = tr.dataset.id; renderDetail(); });
    const byB = {}; list.forEach((r) => { const k = r.branch || '—'; (byB[k] = byB[k] || { n: 0, done: 0, s: 0, c: 0, mgr: r.mgr, area: r.area }); byB[k].n++; if (r.final) byB[k].done++; if (r.avg != null) { byB[k].s += r.avg; byB[k].c++; } });
    $('branchTable').innerHTML = `<thead><tr><th>الفرع</th><th>مدير الفرع</th><th>مدير المنطقة</th><th>مسجلين</th><th>خلّصوا</th><th>متوسط النتيجة</th></tr></thead><tbody>${Object.keys(byB).sort((a, b) => byB[b].n - byB[a].n).map((k) => { const x = byB[k]; return `<tr><td class="ltr">${esc(k)}</td><td class="ltr">${esc(x.mgr || '')}</td><td class="ltr">${esc(x.area || '')}</td><td>${ar(x.n)}</td><td>${ar(x.done)}</td><td>${x.c ? ar(Math.round(x.s / x.c)) + '٪' : '—'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">—</td></tr>'}</tbody>`;
    renderDetail();
  }
  function renderDetail() {
    const r = ROWS.find((x) => x.id === openRow); if (!r) { $('dashDetail').innerHTML = ''; return; }
    const certs = r.certs || {};
    $('dashDetail').innerHTML = `<div class="detail"><div class="row"><h3 class="gsec" style="margin:0">${esc(r.name)} <small class="prog">HRID ${esc(r.hrid)} · ${esc(r.branch)}</small></h3><button class="btn small" id="closeDetail">قفل</button></div>
      <p class="sub">${ST[stOf(r)]}${r.currentRoom ? ' · الأوضة الحالية: ' + esc(r.currentRoom) : ''} · التقدم ${ar(r.progress || 0)}٪ · بدأ ${fmtD(r.startedAt)} · الضيوف اللي قالوا «مش راجع تاني»: ${ar(r.nopes || 0)}</p>
      <div class="rooms">${ROOMS.map((rm) => { const v = (r.keys || {})[rm.id]; return `<div class="room ${v != null ? 'done' : ''}">${v != null ? `<span class="st">${ar(v)}٪</span>` : ''}<span class="rn">${ar(rm.n)}</span><b>${esc(rm.t)}</b></div>`; }).join('')}</div>
      <h4 class="gsec" style="font-size:22px">شهادات الأجزاء</h4>${Object.keys(certs).length ? `<ul>${Object.keys(certs).map((k) => `<li>${esc(certs[k].t)} — ${ar(certs[k].pct)}٪ (${esc(certs[k].date)})</li>`).join('')}</ul>` : '<p class="empty">مفيش.</p>'}
      <h4 class="gsec" style="font-size:22px">آخر محاولات الامتحانات</h4>${(r.attempts || []).length ? `<ul>${r.attempts.slice().reverse().map((a) => `<li>${esc(a.t)} — ${ar(a.pct)}٪ ${a.pass ? '✓' : '✗'} (${esc(a.date)})</li>`).join('')}</ul>` : '<p class="empty">مفيش.</p>'}</div>`;
    $('closeDetail').onclick = () => { openRow = null; renderDetail(); };
  }
  $('dashKeyGo').onclick = () => { dashKey = $('dashKey').value.trim(); if (dashKey) loadSheet(); };
  $('dashKey').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('dashKeyGo').click(); });
  $('dashRefresh').onclick = () => { sfx('click'); loadSheet(); };
  $('gDash').onclick = () => { sfx('click'); openDash(); };
  $('dashCsv').onclick = async () => {
    const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['Name', 'HRID', 'Branch', 'Branch Manager', 'Area Manager', 'Status', 'Keys', 'Progress %', 'Avg %', 'Final %', 'Final Grade', 'Part Certificates', 'Last Activity'].concat(ROOMS.map((r) => 'Room ' + r.n + ' %'));
    const lines = [head.map(cell).join(',')].concat(filtered().map((r) => [r.name, r.hrid, r.branch, r.mgr, r.area, ST[stOf(r)], (r.roomsDone || 0) + '/' + (r.roomsTotal || ROOMS.length), r.progress || 0, r.avg == null ? '' : r.avg, r.final ? r.final.pct : '', r.final ? gradeOf(r.final.pct) : '', Object.values(r.certs || {}).map((c) => c.t + ' ' + c.pct + '%').join(' | '), r.updatedAt || ''].concat(ROOMS.map((rm) => (r.keys || {})[rm.id] == null ? '' : r.keys[rm.id])).map(cell).join(',')));
    const data = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    saveFile('saheb-elbeit-results.csv', data);
  };

  /* ---------- trainer guide (login) ---------- */
  const GKEY = 'saheb-guide-ok';
  async function sha(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return ''; } }
  let guideOk = false;
  try { guideOk = sessionStorage.getItem(GKEY) === '1'; } catch (e) {}
  function openGuide() {
    show('sGuide');
    if (guideOk) { $('guideForm').hidden = true; $('guideMain').hidden = false; renderGuide('story'); }
    else { $('guideForm').hidden = false; $('guideMain').hidden = true; $('gErr').hidden = true; $('gUser').focus(); }
  }
  $('guideForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const h = await sha($('gUser').value.trim() + ':' + $('gPass').value);
    if (h && h === G.guideHash) { guideOk = true; try { sessionStorage.setItem(GKEY, '1'); } catch (er) {} sfx('best'); $('gPass').value = ''; openGuide(); }
    else { sfx('bad'); $('gErr').hidden = false; }
  });
  $('gOut').onclick = () => { guideOk = false; try { sessionStorage.removeItem(GKEY); } catch (e) {} sfx('click'); openGuide(); };
  const KL = { best: 'الأفضل', ok: 'مقبول', bad: 'خطأ' };
  const roomOfSec = (k) => ROOMS.find((r) => r.secs.includes(k));
  function renderGuide(tab) {
    document.querySelectorAll('#guideTabs .tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.t === tab));
    let h = '';
    if (tab === 'story') {
      h += `<div class="gcard"><h4>اسم اللعبة: «صاحب البيت»</h4><p>الجملة اللي بتخسّرك: «مش راجع تاني!». الفرع بيتك، العميل ضيفك، وإنت استشاري بيع… يعني صاحب البيت.</p>
        <p><b>الفكرة:</b> «بيت راية» فيه دورين. الدور الأول (${ar(FLOORS[0].rooms.length)} أوض) هو دليل مستشار راية بنفس ترتيب الفهرس، والدور التاني (${ar(FLOORS[1].rooms.length)} أوضة) هو دليل الفروقات. كل أوضة فيها أسئلة كل أجزائها، ومواقف الضيوف متحطة جوه الجزء اللي بتعلّمه.</p>
        <p><b>الباب ١: الرحلة الكاملة.</b> الأوض بتتفتح بالترتيب. بعد كل إجابة القاعدة من الدليل. في آخر الأوضة، أي سؤال اتغلط فيه بيرجع لحد ما يتجاوب صح، وبعدها المفتاح. النتيجة = الإجابات الصح من أول مرة. بعد ${ar(ROOMS.length)} مفتاح: الشهادة الكبرى (امتياز ٩٠٪+، جيد جداً ٨٠٪+، جيد ٧٠٪+، مقبول). التقدم بيتحفظ على الجهاز ويقدر يكمّل بعدين.</p>
        <p><b>الباب ٢: امتحن نفسك في جزء.</b> جزء أو أوضة أو دور كامل (٥٠ سؤال)، ٤٥ ثانية للسؤال، والنجاح ٨٠٪ بشهادة باسم الجزء.</p>
        <p><b>الصوت:</b> الجمل المتسجلة بتتشغل بصوت هشام (${ar(REC.size)} ملف لحد دلوقتي)، والباقي بصوت الجهاز.</p></div>`;
      h += `<h3 class="gsec">ترتيب الأوض</h3>` + FLOORS.map((f) => `<div class="gcard"><h4>${esc(f.t)}</h4><ol>${f.rooms.map((r) => `<li><b>${esc(r.t)}</b> — ${ar(roomSize(r))}<br><small style="color:var(--muted)">${r.secs.map((k) => esc(SEC[k].t) + ((SCENES[k] || []).length ? ` (+${ar(SCENES[k].length)} موقف)` : '')).join(' · ')}</small></li>`).join('')}</ol></div>`).join('');
      h += `<h3 class="gsec">سكريبت المقدمة</h3><div class="gcard"><ol>${G.intro.map((s, i) => `<li><code>intro-${i + 1}</code> ${esc(s.text)}</li>`).join('')}</ol></div>`;
    } else if (tab === 'scenes') {
      h += Object.keys(SCENES).map((k) => SCENES[k].map((sid) => {
        const sc = sceneOf(sid), r = roomOfSec(k);
        return `<div class="gcard"><h4>${esc(sc.place)}${sc.guest && sc.guest.disc ? ` · شخصية ${sc.guest.disc}` : ''}</h4><p class="meta">أوضة ${ar(r.n)}: ${esc(r.t)} ← ${esc(SEC[k].t)}</p>
        <p class="meta">${esc(sc.narr)}</p><p><b>${esc(sc.line)}</b></p>
        <ul>${sc.opts.slice().sort((a, b) => ['best', 'ok', 'bad'].indexOf(a.k) - ['best', 'ok', 'bad'].indexOf(b.k)).map((o) => `<li><span class="tagk ${o.k}">${KL[o.k]}</span>${esc(o.t)}<br><small style="color:var(--muted)">تعليق هشام: ${esc(o.fb)}</small></li>`).join('')}</ul>
        <div class="rule"><span class="ref">من الدليل — ${esc(sc.ref)}</span>${esc(sc.rule)}</div></div>`;
      }).join('')).join('');
    } else {
      const f = FLOORS[tab === 'bank1' ? 1 : 0];
      h += `<p class="sub">${esc(f.t)}: الإجابة الصح بالأخضر.</p>` + f.rooms.map((r) => `<details class="chap"><summary><span>أوضة ${ar(r.n)}: ${esc(r.t)}</span><span class="prog">${ar(roomSize(r))}</span></summary>${r.secs.map((k) => `<div class="gcard"><h4>${esc(SEC[k].t)}</h4><p class="meta">${esc(SEC[k].ref || '')}</p><ol>${SEC[k].qs.map((q) => `<li><b>${esc(q[0])}</b><br><span class="tagk best">صح</span>${esc(q[1])}<br><small style="color:var(--muted)">الغلط: ${q[2].map(esc).join(' · ')}${q[3] ? ' — ' + esc(q[3]) : ''}</small></li>`).join('')}</ol></div>`).join('')}</details>`).join('');
    }
    $('guideBody').innerHTML = h;
  }
  document.querySelectorAll('#guideTabs .tab').forEach((t) => t.onclick = () => { sfx('click'); renderGuide(t.dataset.t); });

  /* keyboard: 1-4 answers, Enter = next */
  document.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '') || cur !== 'sRun') return;
    const n = '1234'.indexOf(e.key); if (n < 0) return;
    const b = $('scene').querySelectorAll('.opt:not(:disabled)')[n]; if (b) b.click();
  });

  goHome();
})();
