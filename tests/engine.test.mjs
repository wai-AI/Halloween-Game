import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,welcome,execute,restoreState,reminderDue,acknowledgeReminder,REMINDER_MS,listDirectory,normalizePath,complete,notes,GUIDE,CONTENT_REVISION} from '../site/engine.js';
import {filesFor,TASKS,ARCHIVE_MESSAGES} from '../site/story.js';

const start=()=>{const s=freshState(1000);welcome(s);return s;};
const run=(s,...commands)=>{for(const cmd of commands)execute(s,cmd,1000);return s;};
const toFourth=s=>run(s,'check archivist','check 042','check moth ash cinder');
const solve=s=>run(toFourth(s),'echo гарбуз','cat /sessions/session_08.log','check гарбуз');
const last=s=>s.transcript.at(-1).text;

test('complete evidence-led walkthrough reaches release',()=>{
  const s=start();
  run(s,'ls','cat sessions/session_07.log');assert.match(last(s),/USER_ID=014/);
  run(s,'ls -a registry/','cat registry/.accounts.csv');assert.match(last(s),/014,archivist,DELETED/);
  run(s,'check archivist','cat logs/auth.log');assert.match(last(s),/TOKEN_REVOKED/);
  run(s,'cat logs/messages.log','cat logs/relay.log');assert.match(last(s),/R-119 source=proc:042/);
  run(s,'check 042','cat archive/README.txt','cat archive/parts/static');assert.match(last(s),/proc:063/);
  run(s,'cat archive/parts/moth','cat archive/parts/ash','cat archive/parts/cinder','check moth ash cinder');
  assert.equal(s.stage,3);
  run(s,'cat archive/echo.txt');assert.match(last(s),/No text generation/);
  run(s,'echo гарбуз','cat sessions/session_08.log');assert.match(last(s),/\$ echo гарбуз/);
  run(s,'check гарбуз','release');assert.equal(s.stage,4);assert.equal(s.ending,'release');
  assert.match(last(s),/^Ви обрали кінцівку «Тиша»/);assert.match(filesFor(s)['/archive/echo.txt'],/capture=off/);
  assert.equal(filesFor(s)['/sessions/session_09.log'],undefined);
});

test('complete playthrough reaches stay and session 09',()=>{
  const s=solve(start());run(s,'stay');assert.equal(s.ending,'stay');
  assert.match(last(s),/Відлуння/);assert.match(filesFor(s)['/sessions/session_09.log'],/SESSION=09/);
  assert.match(filesFor(s)['/sessions/session_08.log'],/RECORDING=CLOSED/);
});

test('all wrong answers and premature ending commands keep the stage',()=>{
  const s=start();run(s,'check root','check 042','release','stay');assert.equal(s.stage,0);assert.equal(s.ending,null);
  run(s,'check archivist','check 014','check 42');assert.equal(s.stage,1);
  run(s,'check 042','check ash moth cinder','check moth ash static','check moth.frg ash.frg cinder.frg');assert.equal(s.stage,2);
  run(s,'check moth ash cinder','check гарбуз','echo гарбуз','check гарбуз');assert.equal(s.stage,3);
  assert.match(last(s),/журналі поточного сеансу/);
  run(s,'cat sessions/session_08.log','check інше');assert.equal(s.stage,3);
});

test('custom word proof is tied to echo, the current log and the latest marker',()=>{
  const s=toFourth(start());run(s,'cat sessions/session_08.log','echo Рись_07','check Рись_07');assert.equal(s.stage,3);
  run(s,'cat sessions/session_07.log','check Рись_07');assert.equal(s.stage,3);
  run(s,'cat sessions/session_08.log','echo інше','check інше');assert.equal(s.stage,3);
  run(s,'cat sessions/session_08.log','check інше');assert.equal(s.stage,4);
});

test('uppercase commands and whitespace work; proof words preserve case',()=>{
  const s=start();run(s,' CHECK   ARCHIVIST ','CHECK 042','check MOTH ASH CINDER','ECHO   Рись','CAT /sessions/session_08.log','check рись');assert.equal(s.stage,3);
  run(s,'check Рись');assert.equal(s.stage,4);
});

test('echo validation rejects multiple words, markup and overlong words',()=>{
  const s=toFourth(start());for(const cmd of ['echo','echo two words','echo <script>','echo '+ 'а'.repeat(41)]){run(s,cmd);assert.equal(s.pendingWord,null);assert.match(last(s),/Формат/);}
});

test('future files and directories are locked without exposing their contents',()=>{
  const s=start();for(const cmd of ['cat /logs/relay.log','cd /logs','cat /archive/echo.txt','cat /sessions/session_08.log'])run(s,cmd);
  assert.equal(s.cwd,'/');assert.equal(listDirectory(s,'/archive'),null);
  assert.equal(filesFor(s)['/archive/echo.txt'],undefined);
});

test('hidden file discovery, absolute/relative navigation, trailing slashes',()=>{
  const s=start();assert.equal(listDirectory(s,'/registry').length,0);
  run(s,'cd registry/','ls -a');assert.match(last(s),/\.accounts.csv/);assert.ok(s.revealedDirs.includes('/registry'));
  run(s,'cat .accounts.csv');assert.match(last(s),/archivist/);
  run(s,'cd ../sessions','cat ./session_07.log');assert.match(last(s),/SESSION=07/);
  run(s,'cd ../../../../','pwd');assert.equal(last(s),'/');
  assert.equal(normalizePath('/registry','../sessions//./session_07.log'),'/sessions/session_07.log');
});

test('command arguments cannot accidentally trigger state changes',()=>{
  const s=start();for(const cmd of ['ls -z','cd /registry /sessions','cat','cat a b','pwd x','hint x','guide x','help x','notes x','clear x','restart x']){run(s,cmd);assert.match(last(s),/Формат/);}
  assert.equal(s.hints[0],0);assert.equal(s.stage,0);
  const final=solve(start());run(final,'stay now','release now');assert.equal(final.ending,null);
});

test('exactly two hints per puzzle, retained on advancement',()=>{
  const s=start();run(s,'hint','hint');const before=s.hints[0];run(s,'hint');assert.equal(s.hints[0],before);assert.match(last(s),/Обидві/);
  run(s,'check archivist','hint');assert.deepEqual(s.hints,[2,1,0,0]);
  run(s,'check 042','hint','hint','check moth ash cinder','hint','hint');assert.deepEqual(s.hints,[2,1,2,2]);
  run(s,'echo x','cat sessions/session_08.log','check x','hint');assert.equal(s.stage,4);assert.match(last(s),/Усі загадки/);
});

test('Tik reminders repeat at three minutes, stop after hint, reset per puzzle',()=>{
  assert.equal(REMINDER_MS,180000);const s=start();assert.equal(reminderDue(s,1000+REMINDER_MS-1),false);assert.equal(reminderDue(s,1000+REMINDER_MS),true);
  acknowledgeReminder(s,1000+REMINDER_MS);assert.equal(reminderDue(s,1000+REMINDER_MS+1),false);assert.equal(reminderDue(s,1000+2*REMINDER_MS),true);
  run(s,'hint');assert.equal(reminderDue(s,999999999),false);
  execute(s,'check archivist',800000);assert.equal(reminderDue(s,800000+REMINDER_MS-1),false);assert.equal(reminderDue(s,800000+REMINDER_MS),true);
  solve(s);assert.equal(reminderDue(s,999999999),false);
});

test('persistence roundtrips every stage, hints, paths, transcript, marker and both endings',()=>{
  let s=start();
  for(const command of ['ls -a registry/','hint','check archivist','cd /logs','check 042','check moth ash cinder','echo мітка','cat /sessions/session_08.log','check мітка']){
    run(s,command);const restored=restoreState(JSON.stringify(s),1000);assert.deepEqual(restored,s);s=restored;
  }
  for(const end of ['release','stay']){const copy=structuredClone(s);run(copy,end);assert.deepEqual(restoreState(JSON.stringify(copy),1000),copy);}
});

test('corrupted and incompatible saves fail safely',()=>{
  for(const value of ['{','null','[]','{}',JSON.stringify({...start(),version:99}),JSON.stringify({...start(),stage:100}),JSON.stringify({...start(),hints:[-1,0,0,0]}),JSON.stringify({...start(),ending:'stay'})])assert.equal(restoreState(value),null);
  const s=start();s.cwd='/evil';s.transcript=[{kind:'script',text:'x'},null];s.history=[null,'ls'];const restored=restoreState(JSON.stringify(s),1000);assert.equal(restored.cwd,'/');assert.equal(restored.transcript.length,0);assert.deepEqual(restored.history,['ls']);
});

test('endings are immutable, journals readable, restart requests confirmation',()=>{
  for(const ending of ['release','stay']){const s=solve(start());run(s,ending);run(s,ending==='stay'?'release':'stay');assert.equal(s.ending,ending);
    const count=s.sessionEntries.length;run(s,'echo after','cat /archive/last_message.txt');assert.equal(s.sessionEntries.length,count);
    assert.match(last(s),/message_id=07:003/);run(s,'notes');assert.match(last(s),/Якщо ти дійшов/);assert.equal(execute(s,'restart').action,'restart');assert.equal(s.ending,ending);
  }
});

test('clear preserves solved facts, hints and journal',()=>{
  const s=start();run(s,'hint','check archivist');const entries=s.sessionEntries.length;run(s,'clear');assert.equal(s.stage,1);assert.equal(s.hints[0],1);assert.equal(s.sessionEntries.length,entries+1);assert.equal(s.transcript.length,1);run(s,'notes');assert.match(last(s),/UID 014/);
});

test('completion includes dotfiles when a dot is typed explicitly',()=>{
  const s=start();assert.deepEqual(complete(s,'he'),['help']);assert.deepEqual(complete(s,'cat registry/'),[]);assert.deepEqual(complete(s,'cat registry/.'),['cat registry/.accounts.csv']);
  run(s,'ls -a registry/');assert.deepEqual(complete(s,'cat registry/.'),['cat registry/.accounts.csv']);
  assert.ok(!complete(s,'cat /a').length);
});

test('history, session journal and transcript remain bounded',()=>{
  const s=start();for(let i=0;i<400;i++)run(s,'pwd');assert.equal(s.history.length,80);assert.equal(s.sessionEntries.length,256);assert.equal(s.transcript.length,160);assert.deepEqual(restoreState(JSON.stringify(s),1000),s);
});

test('HTML input is treated as text and unknown commands do not unlock puzzles',()=>{
  const s=start();run(s,'<img src=x onerror=alert(1)>');assert.match(last(s),/Невідома команда/);assert.equal(s.stage,0);
});

test('opening text does not disclose the operator login',()=>{
  const s=start();assert.ok(!s.transcript.some(row=>row.text.toLowerCase().includes('archivist')));
});

test('repeated large journal reads stay below typical storage quotas',()=>{
  const s=toFourth(start());for(let i=0;i<256;i++)run(s,'echo '+ 'а'.repeat(40));
  for(let i=0;i<200;i++)run(s,'cat /sessions/session_08.log');
  assert.ok(JSON.stringify(s).length<500000);
  assert.deepEqual(restoreState(JSON.stringify(s),1000),s);
});

test('notes includes only established facts and already opened hints',()=>{
  const s=start();assert.ok(!notes(s).includes('archivist'));
  run(s,'hint');assert.match(notes(s),/Відкриті підказки/);assert.match(notes(s),/1\/2/);
  assert.ok(!notes(s).includes('check archivist'));assert.ok(!notes(s).includes('moth'));
  run(s,'hint','check archivist','clear','notes');assert.match(last(s),/UID 014/);assert.match(last(s),/check archivist/);
  assert.ok(!last(s).includes('source=proc:042'));
  const saved=restoreState(JSON.stringify(s),1000);assert.equal(notes(saved),notes(s));
});

test('notes carries the final choice and either ending',()=>{
  const s=solve(start());assert.match(notes(s),/Далі: release/);
  for(const ending of ['release','stay']){const copy=structuredClone(s);run(copy,ending);assert.match(notes(copy),ending==='release'?/Кінцівка: Тиша/:/Кінцівка: Відлуння/);}
});

test('restart is confirmed inside the terminal and clears the previous playthrough',()=>{
  const s=solve(start());run(s,'hint','stay');
  assert.equal(execute(s,'y').state,s);assert.equal(s.ending,'stay');
  run(s,'restart');assert.equal(s.restartPending,true);assert.match(last(s),/\[y\/n\]/);
  const reset=execute(s,'y',3000);
  assert.equal(reset.action,'restarted');assert.equal(reset.state.stage,0);assert.equal(reset.state.ending,null);
  assert.deepEqual(reset.state.hints,[0,0,0,0]);assert.equal(reset.state.history.length,0);
  assert.equal(reset.state.nextReminderAt,3000+REMINDER_MS);
});

test('another command or reload cancels pending restart confirmation',()=>{
  const s=solve(start());run(s,'restart','notes','y');assert.equal(s.stage,4);assert.equal(s.restartPending,false);
  run(s,'restart');const saved=restoreState(JSON.stringify(s),1000);assert.equal(saved.restartPending,false);
  assert.equal(execute(saved,'y').state.stage,4);
});

test('n cancels restart without losing progress',()=>{const s=solve(start());run(s,'restart','n');assert.equal(s.stage,4);assert.equal(s.restartPending,false);assert.match(last(s),/скасовано/);});


test('guide and the legacy help alias show the same walkthrough without changing puzzle progress',()=>{
  for(const s of [start(),toFourth(start()),solve(start())]){
    const before={stage:s.stage,hints:[...s.hints],cwd:s.cwd,pending:s.pendingWord,witnessed:s.witnessedWord,deadline:s.nextReminderAt};
    run(s,'guide');assert.equal(last(s),GUIDE);
    run(s,'help');assert.equal(last(s),GUIDE);
    run(s,'  GUIDE  ');assert.equal(last(s),GUIDE);
    assert.deepEqual({stage:s.stage,hints:s.hints,cwd:s.cwd,pending:s.pendingWord,witnessed:s.witnessedWord,deadline:s.nextReminderAt},before);
    assert.deepEqual(complete(s,'gui'),['guide']);
    assert.deepEqual(complete(s,'he'),['help']);
  }
});

test('unknown commands direct players to guide and invalid guide arguments do not run it',()=>{
  const s=start();run(s,'unknown');assert.match(last(s),/— guide\.$/u);
  for(const command of ['guide extra','help extra']){run(s,command);assert.match(last(s),/^Формат:/u);assert.notEqual(last(s),GUIDE);}
  assert.equal(s.stage,0);assert.deepEqual(s.hints,[0,0,0,0]);
});

test('archive messages are quoted and normal commands do not replay them',()=>{
  const s=start();const messages=()=>s.transcript.filter(row=>row.kind==='archive');
  assert.equal(messages().length,1);assert.match(messages()[0].text,/\n«[\s\S]*»$/u);
  run(s,'help','ls','pwd','cat /sessions/session_07.log','check wrong','hint');assert.equal(messages().length,1);
  run(s,'check archivist');assert.equal(messages().length,2);
  run(s,'help','notes','ls -a registry/');assert.equal(messages().length,2);
  for(const message of messages())assert.match(message.text,/\n«[\s\S]*»$/u);
  assert.ok(notes(s).includes('«'+ARCHIVE_MESSAGES[1]+'»'));
});

test('ordinary files contain log records without narrator explanations or replay text',()=>{
  const s=solve(start());for(const text of Object.values(filesFor(s))){assert.ok(!text.includes(ARCHIVE_MESSAGES[0]));assert.ok(!text.includes('Усі три доставки'));assert.ok(!text.includes('Для відновлення потрібні'));}
  const names=listDirectory(s,'/archive/parts').map(item=>item.name);assert.deepEqual(names,['ash','cinder','moth','static']);
});

test('fourth puzzle and service config do not reveal the solution sequence',()=>{
  const s=toFourth(start());assert.ok(!TASKS[3].text.includes('echo '));assert.ok(TASKS[3].text.includes('/archive/echo.txt'));assert.ok(!TASKS[3].text.includes('<слово>'));
  assert.ok(!filesFor(s)['/archive/echo.txt'].includes('echo <'));
  assert.ok(!filesFor(s)['/archive/echo.txt'].includes('check <'));
  assert.ok(!TASKS[3].hints[0].includes('echo '));assert.ok(TASKS[3].hints[1].includes('echo '));
});

test('final choice is represented once and restored after reload',()=>{
  const s=solve(start());assert.equal(s.transcript.filter(row=>row.kind==='choices').length,1);
  run(s,'pwd','help');assert.equal(s.transcript.filter(row=>row.kind==='choices').length,1);
  const copy=restoreState(JSON.stringify(s),1000);assert.equal(copy.transcript.filter(row=>row.kind==='choices').length,1);
  for(const ending of ['release','stay']){const next=structuredClone(s);run(next,ending);assert.match(last(next),/^Ви обрали кінцівку «/);assert.ok(!last(next).includes('ECHO='));assert.ok(!last(next).includes(ARCHIVE_MESSAGES[0]));}
});

test('completion handles hidden, absolute, relative and mid-word paths',()=>{
  const s=start();run(s,'cd registry');assert.deepEqual(complete(s,'cat .a'),['cat .accounts.csv']);
  assert.deepEqual(complete(s,'cat /registry/.a'),['cat /registry/.accounts.csv']);
  assert.deepEqual(complete(s,'cat ../registry/.a'),['cat ../registry/.accounts.csv']);
  assert.deepEqual(complete(s,'cat .zz'),[]);
  assert.deepEqual(complete(s,'cat .accounts.csv',6),['cat .accounts.csv']);
  assert.deepEqual(complete(s,'ca /sessions/session_07.log',2),['cat /sessions/session_07.log']);
  assert.deepEqual(complete(s,'CAT .a'),['CAT .accounts.csv']);
});

test('old content migrates without losing progress or repeating stale prose',()=>{
  for(const stage of [0,1,2,3,4]){
    const s=start();for(const cmd of ['check archivist','check 042','check moth ash cinder'].slice(0,Math.min(stage,3)))run(s,cmd);
    if(stage===4)run(s,'echo x','cat sessions/session_08.log','check x');
    delete s.contentRevision;s.transcript=[{kind:'archive',text:'old unquoted content'}];
    const copy=restoreState(JSON.stringify(s),1000);assert.equal(copy.stage,stage);assert.equal(copy.contentRevision,CONTENT_REVISION);assert.ok(!copy.transcript.some(row=>row.text.includes('unquoted')));
    if(stage===4)assert.equal(copy.transcript.at(-1).kind,'choices');
  }
});


test('old completed saves keep the chosen ending with the new short text',()=>{
  for(const ending of ['release','stay']){
    const s=solve(start());run(s,ending);delete s.contentRevision;
    const restored=restoreState(JSON.stringify(s),1000);assert.equal(restored.ending,ending);assert.equal(restored.stage,4);
    assert.match(restored.transcript.at(-1).text,/^Ви обрали кінцівку «/);assert.ok(!restored.transcript.some(row=>row.kind==='choices'));
    assert.ok(notes(restored).includes('«'+ARCHIVE_MESSAGES[2]+'»'));
  }
});


test('pumpkin is available throughout the game, validates arguments and keeps puzzle evidence intact',()=>{
  for(const s of [start(),toFourth(start()),solve(start())]){
    const before={stage:s.stage,hints:[...s.hints],pending:s.pendingWord,witnessed:s.witnessedWord,deadline:s.nextReminderAt};
    assert.equal(execute(s,'pumpkin',1000).action,'pumpkin');
    assert.deepEqual({stage:s.stage,hints:s.hints,pending:s.pendingWord,witnessed:s.witnessedWord,deadline:s.nextReminderAt},before);
    assert.equal(execute(s,'pumpkin extra',1000).action,null);assert.match(last(s),/Формат: pumpkin/);
    assert.deepEqual(complete(s,'pump'),['pumpkin']);
    assert.ok(GUIDE.includes('pumpkin'));
  }
  for(const ending of ['release','stay']){const s=solve(start());run(s,ending);const count=s.sessionEntries.length;assert.equal(execute(s,'pumpkin').action,'pumpkin');assert.equal(s.ending,ending);assert.equal(s.sessionEntries.length,count);}
});

test('each solved puzzle emits an explicit success message exactly once',()=>{
  const s=solve(start());const messages=s.transcript.filter(row=>row.kind==='success');
  assert.equal(messages.length,4);
  messages.forEach((row,i)=>assert.ok(row.text.startsWith(`Загадку розв’язано (${i+1}/4).`)));
  run(s,'check wrong');assert.equal(s.transcript.filter(row=>row.kind==='success').length,4);
});

test('Tik fortunes come from a fixed pool and do not immediately repeat',async()=>{
  const {FORTUNES,pickFortune,ENDINGS}=await import('../site/story.js');
  assert.ok(FORTUNES.length>=10);assert.equal(new Set(FORTUNES).size,FORTUNES.length);
  for(let i=0;i<100;i++){const previous=FORTUNES[i%FORTUNES.length];const next=pickFortune(previous,()=>i/100);assert.ok(FORTUNES.includes(next));assert.notEqual(next,previous);}
  assert.equal(pickFortune('',()=>0),FORTUNES[0]);assert.equal(pickFortune('',()=>0.999),FORTUNES.at(-1));
  assert.notEqual(ENDINGS.release.mascot,ENDINGS.stay.mascot);
});


test('five-minute reminder saves retain elapsed time when migrated to three minutes',()=>{
  const s=start();delete s.reminderIntervalMs;s.nextReminderAt=301000;
  const before=restoreState(JSON.stringify(s),180999);assert.equal(before.nextReminderAt,181000);assert.equal(reminderDue(before,180999),false);assert.equal(reminderDue(before,181000),true);
  const overdue=restoreState(JSON.stringify(s),241000);assert.equal(reminderDue(overdue,241000),true);
  acknowledgeReminder(overdue,241000);assert.equal(overdue.nextReminderAt,421000);
  assert.deepEqual(restoreState(JSON.stringify(overdue),241000),overdue);
});


test('notes restores the current task after clear without consuming hints or exposing future tasks',()=>{
  const s=start();
  for(const command of ['check archivist','check 042','check moth ash cinder']){
    run(s,command,'clear','notes');assert.ok(last(s).includes(TASKS[s.stage].text));
    for(const future of TASKS.slice(s.stage+1))assert.ok(!last(s).includes(future.text));
    assert.deepEqual(s.hints,[0,0,0,0]);
  }
});

test('file and directory mixups explain an actionable correction',()=>{
  const s=start();
  run(s,'cat /sessions');assert.match(last(s),/це папка/);assert.match(last(s),/ls \/sessions/);
  for(const command of ['cd /sessions/session_07.log','ls /sessions/session_07.log']){run(s,command);assert.match(last(s),/це файл/);assert.match(last(s),/cat \/sessions\/session_07.log/);}
  run(s,'cat');assert.match(last(s),/Наприклад: cat \/sessions\/session_07.log/);
  run(s,'ls /registry');assert.match(last(s),/ls -a \/registry/);
  run(s,'ls -a /registry','cat /registry/missing');assert.match(last(s),/ls \/registry/);
  assert.equal(s.stage,0);assert.deepEqual(s.hints,[0,0,0,0]);
});

test('navigation errors do not expose locked files or later directories',()=>{
  const s=start();
  for(const command of ['cat /logs','ls /logs/auth.log','cd /archive/echo.txt']){run(s,command);assert.ok(!last(s).includes('це папка'));assert.ok(!last(s).includes('це файл'));assert.match(last(s),/ls \/$/);}
  assert.equal(s.cwd,'/');assert.deepEqual(s.readPaths,[]);
});

test('literal angle brackets explain substitution without treating it as a puzzle hint',()=>{
  const s=start();run(s,'check <логін>');assert.match(last(s),/без дужок/);assert.equal(s.stage,0);assert.equal(s.hints[0],0);
});

test('revision 3 transcripts receive navigation guidance while preserving progress and messages',()=>{
  for(const stage of [0,1,2,3,4]){
    const s=start();for(const cmd of ['check archivist','check 042','check moth ash cinder'].slice(0,Math.min(stage,3)))run(s,cmd);
    if(stage===4)run(s,'echo x','cat /sessions/session_08.log','check x','stay');
    s.contentRevision=3;
    s.transcript=s.transcript.map(row=>row.kind==='task'?{...row,text:row.text.split('\n')[0]}:row);
    const before=structuredClone(s);const restored=restoreState(JSON.stringify(s),1000);
    assert.equal(restored.stage,stage);assert.equal(restored.ending,before.ending);assert.deepEqual(restored.hints,before.hints);
    assert.deepEqual(restored.sessionEntries,before.sessionEntries);assert.equal(restored.pendingWord,before.pendingWord);assert.equal(restored.witnessedWord,before.witnessedWord);
    assert.deepEqual(restored.transcript.filter(row=>row.kind==='archive'),before.transcript.filter(row=>row.kind==='archive'));
    if(stage<4)assert.ok(restored.transcript.some(row=>row.kind==='task'&&row.text===TASKS[stage].text));
    assert.deepEqual(restoreState(JSON.stringify(restored),1000),restored);
  }
});


test('unnumbered revision 3 tasks are upgraded without duplicating the active task',()=>{
  const s=start();s.contentRevision=3;s.transcript=[{kind:'task',text:'Хто працював у сеансі 07? Знайди його логін і введи check <логін>.'}];
  const restored=restoreState(JSON.stringify(s),1000);assert.deepEqual(restored.transcript,[{kind:'task',text:TASKS[0].text}]);
});


test('revision 4 saves update the intro, old help and service guidance in place',()=>{
  for(const ending of [null,'release','stay']){
    const s=toFourth(start());run(s,'hint','echo мітка','cat /sessions/session_08.log');
    if(ending)run(s,'check мітка',ending);
    s.contentRevision=4;
    s.transcript=s.transcript.map(row=>row.text.startsWith('Гостьовий сеанс відкрито.')?{...row,text:'Гостьовий сеанс відкрито. Відповіді заховані у файлах цього термінала.\nПовний список — help.'}:row.kind==='system'?{...row,text:row.text.replace('Documentation:  guide','Documentation:  help')}:row.kind==='hint'?{...row,text:row.text.replace('Пояснення команд є в guide.','Список команд є в help.')}:row);
    s.transcript.push({kind:'command',text:'guest@echo:/$ help'},
      {kind:'output',text:'help                  список команд\nls [шлях]            вміст папки'},
      {kind:'error',text:'Невідома команда «oops». Список доступних команд — help.'},
      {kind:'note',text:'Попередня версія нотаток'});
    const before=structuredClone(s);const restored=restoreState(JSON.stringify(s),1000);
    for(const key of ['stage','ending','cwd','hints','history','sessionEntries','readPaths','revealedDirs','pendingWord','witnessedWord','nextReminderAt'])assert.deepEqual(restored[key],before[key],key);
    assert.equal(restored.contentRevision,CONTENT_REVISION);
    assert.ok(restored.transcript.some(row=>row.text===GUIDE));
    assert.ok(restored.transcript.some(row=>row.text.includes('Введи guide, щоб розібратися')));
    assert.ok(restored.transcript.some(row=>row.text.includes('Documentation:  guide')));
    assert.ok(!restored.transcript.some(row=>row.kind==='hint'&&row.text.includes('є в help')));
    assert.ok(restored.transcript.some(row=>row.kind==='note'&&row.text===notes(restored)));
    for(const kind of ['archive','command','ending','choices'])assert.deepEqual(restored.transcript.filter(row=>row.kind===kind),before.transcript.filter(row=>row.kind===kind));
    assert.deepEqual(restoreState(JSON.stringify(restored),1000),restored);
    if(!ending){run(restored,'check мітка');assert.equal(restored.stage,4);}
  }
});
