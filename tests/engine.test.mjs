import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,welcome,execute,restoreState,reminderDue,acknowledgeReminder,REMINDER_MS,listDirectory,normalizePath,complete,notes} from '../site/engine.js';
import {filesFor} from '../site/story.js';

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
  run(s,'check 042','cat archive/README.txt','cat archive/parts/static.frg');assert.match(last(s),/proc:063/);
  run(s,'cat archive/parts/moth.frg','cat archive/parts/ash.frg','cat archive/parts/cinder.frg','check moth ash cinder');
  assert.equal(s.stage,3);
  run(s,'cat archive/echo.txt');assert.match(last(s),/Нових діалогів ECHO не створює/);
  run(s,'echo гарбуз','cat sessions/session_08.log');assert.match(last(s),/\$ echo гарбуз/);
  run(s,'check гарбуз','release');assert.equal(s.stage,4);assert.equal(s.ending,'release');
  assert.match(last(s),/ECHO=STOPPED/);assert.match(last(s),/ARCHIVE=READ_ONLY/);assert.match(last(s),/Тиша/);
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
  assert.match(last(s),/перечитай/);
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
  const s=start();for(const cmd of ['ls -z','cd /registry /sessions','cat','cat a b','pwd x','hint x','help x','notes x','clear x','restart x']){run(s,cmd);assert.match(last(s),/Формат/);}
  assert.equal(s.hints[0],0);assert.equal(s.stage,0);
  const final=solve(start());run(final,'stay now','release now');assert.equal(final.ending,null);
});

test('exactly two hints per puzzle, retained on advancement',()=>{
  const s=start();run(s,'hint','hint');const before=s.hints[0];run(s,'hint');assert.equal(s.hints[0],before);assert.match(last(s),/Обидві/);
  run(s,'check archivist','hint');assert.deepEqual(s.hints,[2,1,0,0]);
  run(s,'check 042','hint','hint','check moth ash cinder','hint','hint');assert.deepEqual(s.hints,[2,1,2,2]);
  run(s,'echo x','cat sessions/session_08.log','check x','hint');assert.equal(s.stage,4);assert.match(last(s),/Усі загадки/);
});

test('Tik reminders repeat at five minutes, stop after hint, reset per puzzle',()=>{
  const s=start();assert.equal(reminderDue(s,1000+REMINDER_MS-1),false);assert.equal(reminderDue(s,1000+REMINDER_MS),true);
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
    assert.match(last(s),/Якщо ти дійшов/);assert.equal(execute(s,'restart').action,'restart');assert.equal(s.ending,ending);
  }
});

test('clear preserves solved facts, hints and journal',()=>{
  const s=start();run(s,'hint','check archivist');const entries=s.sessionEntries.length;run(s,'clear');assert.equal(s.stage,1);assert.equal(s.hints[0],1);assert.equal(s.sessionEntries.length,entries+1);assert.equal(s.transcript.length,1);run(s,'notes');assert.match(last(s),/UID 014/);
});

test('completion does not expose hidden files before discovery',()=>{
  const s=start();assert.deepEqual(complete(s,'he'),['help']);assert.deepEqual(complete(s,'cat registry/.'),[]);
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
