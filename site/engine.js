import { TASKS, FACTS, filesFor, directoriesFor, ARCHIVIST_FINAL, ARCHIVE_MESSAGES, archivedMessages, quoteMessage, ENDINGS } from './story.js';

export const SAVE_KEY = 'dou.haunted-terminal.session07.v1';
export const REMINDER_MS = 5 * 60 * 1000;
export const VERSION = 1;
export const CONTENT_REVISION = 3;
export const HELP = [
  ['help', 'список команд'],
  ['ls [шлях]', 'вміст папки'],
  ['ls -a [шлях]', 'також приховані файли'],
  ['cd <шлях>', 'перейти в папку (cd .. — назад)'],
  ['pwd', 'поточний шлях'],
  ['cat <файл>', 'прочитати файл'],
  ['check <відповідь>', 'перевірити відповідь'],
  ['echo <слово>', 'вивести слово'],
  ['hint', 'підказка (дві на загадку)'],
  ['notes', 'факти, повідомлення й відкриті підказки'],
  ['pumpkin', 'Тик і передбачення на день'],
  ['clear', 'очистити екран'],
  ['restart', 'почати заново']
].map(([command, description]) => command.padEnd(22) + description).join('\n') + '\n\n↑ / ↓ — історія команд. Tab — доповнити команду або шлях.';


export function freshState(now = Date.now()) {
  return { version: VERSION, contentRevision: CONTENT_REVISION, stage: 0, ending: null, restartPending: false, cwd: '/', hints: [0, 0, 0, 0], nextReminderAt: now + REMINDER_MS,
    pendingWord: null, witnessedWord: null, sessionEntries: [], history: [], transcript: [], readPaths: [], revealedDirs: [] };
}

export function normalizePath(cwd, input = '/') {
  const parts = (input.startsWith('/') ? input : `${cwd}/${input}`).split('/');
  const clean = [];
  for (const part of parts) { if (part === '..') clean.pop(); else if (part && part !== '.') clean.push(part); }
  return '/' + clean.join('/');
}

export function listDirectory(state, path, all = false) {
  const dirs = directoriesFor(state);
  if (!dirs.includes(path)) return null;
  const prefix = path === '/' ? '/' : path + '/';
  return [
    ...dirs.filter(p => p !== path && p.startsWith(prefix) && !p.slice(prefix.length).includes('/')).map(p => ({name: p.slice(prefix.length), path:p, directory:true})),
    ...Object.keys(filesFor(state)).filter(p => p.startsWith(prefix) && !p.slice(prefix.length).includes('/') && (all || !p.slice(prefix.length).startsWith('.'))).map(p => ({name:p.slice(prefix.length),path:p,directory:false}))
  ].sort((a,b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name));
}

const emit = (state, text, kind = 'output') => {
  state.transcript.push({text, kind}); state.transcript = state.transcript.slice(-160);
  let size=state.transcript.reduce((sum,row)=>sum+row.text.length,0);
  while(size>250000 && state.transcript.length>1)size-=state.transcript.shift().text.length;
};
export function welcome(state) {
  emit(state, 'Welcome to Ubuntu 22.04.5 LTS (GNU/Linux 5.15.0-119-generic x86_64)\n\n * Documentation:  help\n * Session notes:  notes\n\n System information as of Sat Oct 31 00:13:00 UTC 2026\n\n  System load:  0.00               Processes:       3\n  Usage of /:   12.4% of 19.5GB    Users logged in: 1\n  Memory usage: 7%                 Swap usage:      0%\n\nLast login: Thu Oct 31 23:47:18 2019 on pts/0', 'system');
  emit(state, quoteMessage(archivedMessages(state)[0]), 'archive');
  emit(state, 'Гостьовий сеанс відкрито. help — команди, notes — записи сеансу.', 'output');
  emit(state, TASKS[0].text, 'task');
}

export function notes(state) {
  const sections = [state.stage ? 'Встановлено:\n' + FACTS.slice(0, state.stage).map((fact, i) => `${i + 1}. ${fact}`).join('\n\n') : 'Поки що фактів немає. Почни з журналу сеансу 07.'];
  const hints = [];
  state.hints.forEach((used, stage) => {
    if (stage > state.stage) return;
    for (let i = 0; i < used; i++) hints.push(`[${TASKS[stage].short} · ${i + 1}/2]\n${TASKS[stage].hints[i]}`);
  });
  sections.push('Архівні повідомлення:\n' + archivedMessages(state).map(quoteMessage).join('\n\n'));
  if (hints.length) sections.push('Відкриті підказки:\n' + hints.join('\n\n'));
  if (state.stage === 4) sections.push(state.ending === 'release' ? 'Кінцівка: Тиша. ECHO зупинено. Архів доступний для читання.' : state.ending === 'stay' ? 'Кінцівка: Відлуння. ECHO активний. Сеанс 09 відкрито.' : 'Далі: release — зупинити ECHO; stay — залишити запис і відтворення.');
  return sections.join('\n\n');
}
export function reminderDue(state, now = Date.now()) { return !state.ending && state.stage < 4 && state.hints[state.stage] === 0 && now >= state.nextReminderAt; }
export function acknowledgeReminder(state, now = Date.now()) { state.nextReminderAt = now + REMINDER_MS; }

function advance(state, now) {
  const done = state.stage++;
  state.nextReminderAt = now + REMINDER_MS;
  emit(state, `Загадку розв’язано (${state.stage}/4).\n${FACTS[done]}`, 'success');
  if (done === 0) {
    emit(state, quoteMessage({label: 'archivist / сеанс 07', text: ARCHIVE_MESSAGES[1]}), 'archive');
    emit(state, 'Відкрито /logs.', 'system');
  }
  if (done === 1) emit(state, 'Відкрито /archive. Інструкція — у README.txt.', 'system');
  if (done === 2) emit(state, 'Архів відновлено. Доступні /archive/echo.txt та /sessions/session_08.log. Поточний сеанс — 08; сеанс 07 належав archivist.', 'system');
  if (state.stage < 4) emit(state, TASKS[state.stage].text, 'task');
  else {
    emit(state, quoteMessage({label: 'archivist / сеанс 07 / 31.10.2019', text: ARCHIVIST_FINAL}), 'archive');
    emit(state, 'Введи release або stay.', 'choices');
  }
}

export function execute(state, input, now = Date.now()) {
  const raw = input.trim();
  if (!raw) return {state, action:null};
  const restartPending = state.restartPending;
  state.restartPending = false;
  if (raw.length > 500) { emit(state, 'Команда задовга. Максимум — 500 символів.', 'error'); return {state,action:null}; }
  const tokens = raw.split(/\s+/u);
  const cmd = tokens.shift().toLowerCase();
  const args = tokens;
  emit(state, `guest@echo:${state.cwd}$ ${raw}`, 'command');
  state.history.push(raw); state.history = state.history.slice(-80);
  // Bounded session journal, independent from the visible transcript.
  if (!state.ending) {
    state.sessionEntries.push(`$ ${raw}`);
    if (state.sessionEntries.length > 256) state.sessionEntries.shift();
  }
  const fail = text => emit(state, text, 'error');
  const usage = text => fail(`Формат: ${text}`);
  let action = null;
  if (restartPending && args.length === 0 && cmd === 'y') {
    const next = freshState(now); welcome(next); return {state: next, action: 'restarted'};
  }
  if (restartPending && args.length === 0 && cmd === 'n') {
    emit(state, 'Перезапуск скасовано.', 'system'); return {state, action: null};
  }
  switch (cmd) {
    case 'help': if (args.length) usage('help'); else emit(state, HELP); break;
    case 'pwd': if (args.length) usage('pwd'); else emit(state, state.cwd); break;
    case 'ls': {
      const all = args.includes('-a'); const rest = args.filter(x => x !== '-a');
      if (rest.length > 1 || rest.some(x => x.startsWith('-'))) { usage('ls [-a] [шлях]'); break; }
      const path = normalizePath(state.cwd, rest[0] || '.');
      const items = listDirectory(state, path, all);
      if (!items) { fail('Такої папки немає або її ще не відкрито.'); break; }
      if (all && !state.revealedDirs.includes(path)) state.revealedDirs.push(path);
      emit(state, items.length ? items.map(x => x.name + (x.directory ? '/' : '')).join('\n') : 'Папка порожня. Приховані файли можна побачити через ls -a.');
      break;
    }
    case 'cd': {
      if (args.length > 1) { usage('cd <шлях>'); break; }
      const path = normalizePath(state.cwd, args[0] || '/');
      if (!directoriesFor(state).includes(path)) fail('Такої папки немає або її ще не відкрито.');
      else { state.cwd = path; emit(state,path,'system'); } break;
    }
    case 'cat': {
      if (args.length !== 1) { usage('cat <файл>'); break; }
      const path = normalizePath(state.cwd, args[0]); const files = filesFor(state);
      if (!(path in files)) { fail('Файл не знайдено або його ще не відкрито. Перевір шлях командою ls.'); break; }
      emit(state, path, 'file'); emit(state, files[path]);
      if (!state.readPaths.includes(path)) state.readPaths.push(path);
      if (path === '/sessions/session_08.log' && state.stage === 3 && state.pendingWord && state.sessionEntries.includes(`$ echo ${state.pendingWord}`)) state.witnessedWord = state.pendingWord;
      break;
    }
    case 'check': {
      if (!args.length) { usage('check <відповідь>'); break; }
      if (state.stage >= 4) { emit(state, 'Усі чотири загадки вже розв’язано.', 'system'); break; }
      const answer = args.join(' ').toLowerCase();
      const correct = [answer === 'archivist', answer === '042', answer === 'moth ash cinder', args.length === 1 && args[0] === state.pendingWord && args[0] === state.witnessedWord][state.stage];
      if (correct) advance(state, now);
      else if (state.stage === 3 && args[0] === state.pendingWord && !state.witnessedWord) fail('Спершу знайди цю мітку в журналі поточного сеансу.');
      else fail('Не збігається. Перевір файли ще раз. За потреби введи hint.');
      break;
    }
    case 'echo': {
      if (args.length !== 1 || !/^[\p{L}\p{N}_-]{1,40}$/u.test(args[0])) { usage('echo <одне слово до 40 символів: літери, цифри, _ або ->'); break; }
      if (state.ending) { emit(state, 'Сеанс гри завершено. Для нового проходження введи restart.', 'system'); break; }
      emit(state, args[0]);
      if (state.stage === 3) { state.pendingWord = args[0]; state.witnessedWord = null;
        // Canonical form also accepts uppercase command names or extra whitespace.
        state.sessionEntries[state.sessionEntries.length - 1] = `$ echo ${args[0]}`;
      } break;
    }
    case 'hint': {
      if (args.length) { usage('hint'); break; }
      if (state.stage >= 4) { emit(state,'Усі загадки розв’язано. Підказки більше не потрібні.','system'); break; }
      const used = state.hints[state.stage];
      if (used >= 2) emit(state, 'Обидві підказки вже відкрито. Перечитати: notes.', 'system');
      else { state.hints[state.stage]++; emit(state, `Підказка ${used + 1}/2\n${TASKS[state.stage].hints[used]}`, 'hint'); }
      break;
    }
    case 'notes': if (args.length) usage('notes'); else emit(state,notes(state),'note'); break;
    case 'pumpkin': if (args.length) usage('pumpkin'); else action = 'pumpkin'; break;
    case 'clear': if (args.length) usage('clear'); else { state.transcript = []; emit(state,'Екран очищено. Прогрес збережено. Факти й підказки — notes.','system'); } break;
    case 'restart': {
      if (args.length) usage('restart');
      else {
        state.restartPending = true;
        emit(state, 'Почати заново? Прогрес буде втрачено. [y/n]', 'system');
        action = 'restart';
      }
      break;
    }
    case 'release': case 'stay': {
      if (args.length) { usage(cmd); break; }
      if (state.stage < 4) { fail('Ця команда стане доступною після перевірки поточного сеансу.'); break; }
      if (state.ending) { emit(state,'Вибір уже зроблено. Для іншої кінцівки почни нове проходження.','system'); break; }
      state.ending = cmd;
      emit(state, ENDINGS[cmd].text, 'ending');
      break;
    }
    default: fail(`Невідома команда «${cmd}». Список доступних команд — help.`);
  }
  return {state,action};
}

export function restoreState(serialized, now = Date.now()) {
  try {
    const raw = JSON.parse(serialized);
    if (!raw || raw.version !== VERSION || !Number.isInteger(raw.stage) || raw.stage < 0 || raw.stage > 4 || !Array.isArray(raw.hints) || raw.hints.length !== 4 || raw.hints.some(x => !Number.isInteger(x) || x < 0 || x > 2)) return null;
    if (raw.ending !== null && !['release','stay'].includes(raw.ending) || raw.ending && raw.stage !== 4) return null;
    const state = freshState(now); state.stage = raw.stage; state.ending=raw.ending; state.hints=raw.hints;
    if (directoriesFor(state).includes(raw.cwd)) state.cwd=raw.cwd;
    const strings = (x, cap, length) => Array.isArray(x) ? x.filter(s => typeof s === 'string' && s.length <= length).slice(-cap) : [];
    state.history=strings(raw.history,80,500); state.sessionEntries=strings(raw.sessionEntries,256,600);
    const files=filesFor(state); state.readPaths=strings(raw.readPaths,30,150).filter(p=>p in files);
    state.revealedDirs=strings(raw.revealedDirs,10,150).filter(p=>directoriesFor(state).includes(p));
    for (const k of ['pendingWord','witnessedWord']) if (typeof raw[k] === 'string' && /^[\p{L}\p{N}_-]{1,40}$/u.test(raw[k])) state[k]=raw[k];
    if (!state.pendingWord || !state.sessionEntries.includes(`$ echo ${state.pendingWord}`)) {state.pendingWord=null;state.witnessedWord=null;}
    if (state.witnessedWord !== state.pendingWord) state.witnessedWord=null;
    const kinds=['output','command','error','success','system','archive','task','file','hint','note','ending','choices'];
    state.transcript=Array.isArray(raw.transcript) ? raw.transcript.filter(x=>x && kinds.includes(x.kind) && typeof x.text==='string' && x.text.length<=170000).slice(-160).map(x=>({kind:x.kind,text:x.text})) : [];
    state.nextReminderAt=Number.isFinite(raw.nextReminderAt) && raw.nextReminderAt > 0 && raw.nextReminderAt <= now + REMINDER_MS ? raw.nextReminderAt : now+REMINDER_MS;
    if (raw.contentRevision !== CONTENT_REVISION) {
      // Preserve progress, but retire old prose, repeated messages and renamed file paths.
      state.transcript = [{kind: 'system', text: 'Сеанс відновлено. Попередні повідомлення та факти — notes.'}];
      if (state.stage < 4) state.transcript.push({kind: 'task', text: TASKS[state.stage].text});
      else state.transcript.push({kind: state.ending ? 'ending' : 'choices', text: state.ending ? ENDINGS[state.ending].text : 'Введи release або stay.'});
    }
    return state;
  } catch { return null; }
}

export function complete(state, input, caret = input.length) {
  const commands = ['help','ls','cd','pwd','cat','check','echo','hint','notes','pumpkin','clear','restart',...(state.stage === 4 && !state.ending ? ['release','stay'] : [])];
  caret = Math.max(0, Math.min(input.length, caret));
  const before = input.slice(0, caret);
  const start = before.search(/\S*$/u);
  const end = caret + (input.slice(caret).match(/^\S*/u)?.[0].length || 0);
  const typed = input.slice(start, caret);
  const lead = input.slice(0, start);
  const tail = input.slice(end);
  if (!lead.trim()) return commands.filter(command => command.startsWith(typed.toLowerCase())).map(command => lead + command + tail);
  const cmd = input.trimStart().split(/\s+/u)[0].toLowerCase();
  if (!['ls','cd','cat'].includes(cmd)) return [];
  const slash = typed.lastIndexOf('/');
  const folder = slash < 0 ? '.' : typed.slice(0, slash + 1);
  const partial = typed.slice(slash + 1);
  const path = normalizePath(state.cwd, folder);
  // Like a shell: a dot typed explicitly is enough to complete a dotfile.
  const items = listDirectory(state, path, partial.startsWith('.') || state.revealedDirs.includes(path)) || [];
  const prefix = lead + (slash < 0 ? '' : typed.slice(0, slash + 1));
  return items.filter(item => item.name.startsWith(partial) && (cmd !== 'cd' || item.directory)).map(item => prefix + item.name + (item.directory ? '/' : '') + tail);
}
