import { TASKS, ENDINGS } from './story.js';
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
    state.transcript.push({kind: 'task', text: state.stage < 4 ? TASKS[state.stage].text : state.ending ? 'Гру завершено. Архів доступний для читання.' : 'Обери release або stay.'});
  }
}
if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embed');

function append(text, kind = 'system') {
  state.transcript.push({text, kind});
  state.transcript = state.transcript.slice(-160);
}
const storageWarning = 'Збереження недоступне. Прогрес триматиметься, доки відкрита сторінка. Спробуй відкрити гру окремою вкладкою.';
const resumed = 'Сеанс відновлено. Факти й підказки — notes.';
if (restored && state.transcript.at(-1)?.text !== resumed) append(resumed);
if (!storageAvailable) append(storageWarning);

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); storageAvailable = true; }
  catch {
    if (storageAvailable) append(storageWarning);
    storageAvailable = false;
  }
}

function choiceTable() {
  const section = document.createElement('section');
  section.className = 'ending-choice';
  const table = document.createElement('table');
  table.className = 'ending-options';
  const caption = document.createElement('caption');
  caption.textContent = 'Завершення сеансу';
  table.append(caption);
  const head = document.createElement('thead');
  const header = document.createElement('tr');
  const body = document.createElement('tbody');
  const images = document.createElement('tr');
  const descriptions = document.createElement('tr');
  const commands = document.createElement('tr');
  for (const [command, ending] of Object.entries(ENDINGS)) {
    const th = document.createElement('th');
    th.scope = 'col'; th.textContent = ending.name; header.append(th);
    const tdImage = document.createElement('td');
    const image = document.createElement('img');
    image.src = './tik.svg'; image.alt = 'Тик — піксельний гарбузик';
    image.width = 96; image.height = 96; image.className = 'choice-tik';
    tdImage.append(image); images.append(tdImage);
    const tdDescription = document.createElement('td');
    tdDescription.textContent = ending.description; descriptions.append(tdDescription);
    const tdCommand = document.createElement('td');
    const code = document.createElement('code');
    code.textContent = command; tdCommand.append(code); commands.append(tdCommand);
  }
  head.append(header); body.append(images, descriptions, commands); table.append(head, body);
  const instruction = document.createElement('p');
  instruction.textContent = 'Введи release або stay.';
  section.append(table, instruction);
  return section;
}

let renderedRows = [];
function render() {
  const rows = state.transcript;
  // Append new output; do not recreate and re-announce earlier story messages.
  while (renderedRows.length && renderedRows[0] !== rows[0]) {
    output.firstElementChild?.remove(); renderedRows.shift();
  }
  if (renderedRows.some((row, i) => row !== rows[i])) {
    output.replaceChildren(); renderedRows = [];
  }
  for (const item of rows.slice(renderedRows.length)) {
    let line;
    if (item.kind === 'choices') line = choiceTable();
    else {
      line = document.createElement('p');
      line.className = `line ${item.kind}`;
      if (item.kind === 'note') {
        for (const part of item.text.split(/(«[\s\S]*?»)/u)) {
          const span = document.createElement('span');
          if (part.startsWith('«') && part.endsWith('»')) span.className = 'dialogue';
          span.textContent = part; line.append(span);
        }
      } else line.textContent = item.text;
    }
    output.append(line); renderedRows.push(item);
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
    event.preventDefault();
    const caret = input.selectionStart ?? input.value.length;
    const tokenEnd = caret + (input.value.slice(caret).match(/^\S*/u)?.[0].length || 0);
    const suffixLength = input.value.length - tokenEnd;
    const matches = complete(state, input.value, caret);
    if (matches.length === 1) {
      input.value = matches[0];
      const position = input.value.length - suffixLength;
      input.setSelectionRange(position, position);
    } else if (matches.length > 1) {
      append(matches.join('   '), 'output'); save(); render();
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
