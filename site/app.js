import { TASKS } from './story.js';
import { SAVE_KEY, freshState, restoreState, welcome, notes, execute, reminderDue, acknowledgeReminder, complete } from './engine.js';

const input = document.getElementById('command');
const output = document.getElementById('output');
const announcement = document.getElementById('announcement');
const tik = document.getElementById('tik');
let state, storageAvailable = true, restored = false, historyIndex = 0, draft = '';

try {
  const saved = localStorage.getItem(SAVE_KEY);
  state = saved ? restoreState(saved) : null;
  restored = Boolean(state);
} catch { storageAvailable = false; }
if (!state) { state = freshState(); welcome(state); }
if (!state.transcript.length) {
  if (state.stage === 0) welcome(state);
  else {
    state.transcript.push({kind: 'note', text: notes(state)});
    state.transcript.push({kind: 'task', text: state.stage < 4 ? TASKS[state.stage].text : state.ending ? 'Гру завершено. Архів доступний для читання.' : 'Обери release або stay.'});
  }
}
if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embed');

function append(text, kind = 'system') {
  state.transcript.push({text, kind});
  state.transcript = state.transcript.slice(-160);
}
const storageWarning = 'Збереження недоступне. Прогрес триматиметься, доки відкрита сторінка. Спробуй відкрити гру окремою вкладкою.';
if (restored) append('Сеанс відновлено. Факти й підказки — notes.');
if (!storageAvailable) append(storageWarning);

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); storageAvailable = true; }
  catch {
    if (storageAvailable) append(storageWarning);
    storageAvailable = false;
  }
}

function render() {
  output.replaceChildren();
  for (const item of state.transcript) {
    const line = document.createElement('p');
    line.className = `line ${item.kind}`;
    line.textContent = item.text;
    output.append(line);
  }
  document.getElementById('prompt-path').textContent = ':' + state.cwd;
  output.scrollTop = output.scrollHeight;
}

function run(command) {
  if (!command.trim()) return;
  tik.hidden = true;
  announcement.textContent = '';
  const result = execute(state, command);
  state = result.state;
  input.value = '';
  draft = '';
  historyIndex = state.history.length;
  save();
  render();
  // Keep announcements outside the visible transcript; avoid a second status UI.
  announcement.textContent = state.transcript.at(-1)?.text.slice(0, 500) || '';
  input.focus({preventScroll: true});
}

// Intercept input directly: sandboxed iframes need no form submission permission.
document.getElementById('command-form').addEventListener('submit', event => { event.preventDefault(); run(input.value); });
document.getElementById('send').addEventListener('click', () => run(input.value));
input.addEventListener('keydown', event => {
  if (event.isComposing) return;
  if (event.key === 'Enter') { event.preventDefault(); run(input.value); return; }
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    if (historyIndex === state.history.length) draft = input.value;
    historyIndex = Math.max(0, Math.min(state.history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
    input.value = historyIndex === state.history.length ? draft : state.history[historyIndex];
    input.setSelectionRange(input.value.length, input.value.length);
  }
  if (event.key === 'Tab' && !event.shiftKey) {
    const matches = complete(state, input.value);
    if (matches.length === 1 && matches[0] !== input.value) {
      event.preventDefault(); input.value = matches[0];
    } else if (matches.length > 1 && input.value.trim()) {
      event.preventDefault(); append(matches.join('   '), 'output'); save(); render();
    }
  }
});
input.addEventListener('input', () => { historyIndex = state.history.length; });
document.getElementById('dismiss-tik').addEventListener('click', () => { tik.hidden = true; });
document.getElementById('tik-hint').addEventListener('click', () => run('hint'));
function checkReminder() {
  if (!document.hidden && reminderDue(state)) {
    acknowledgeReminder(state);
    tik.hidden = false;
    save();
  }
}
setInterval(checkReminder, 1000);
document.addEventListener('visibilitychange', checkReminder);
historyIndex = state.history.length;
save();
render();
// No autofocus: an iframe must not steal focus or open the mobile keyboard.
