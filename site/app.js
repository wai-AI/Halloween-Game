import { TASKS, ENDINGS, pickFortune } from './story.js';
import { SAVE_KEY, freshState, restoreState, welcome, notes, execute, reminderDue, acknowledgeReminder, complete } from './engine.js';

const input = document.getElementById('command');
const output = document.getElementById('output');
const announcement = document.getElementById('announcement');
const tik = document.getElementById('tik');
const fortune = document.getElementById('fortune');
const completion = document.getElementById('completion');
const typingToggle = document.getElementById('typing-toggle');
const skipTyping = document.getElementById('skip-typing');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const TYPING_KEY = 'dou.haunted-terminal.typing';
let state, storageAvailable = true, restored = false, historyIndex = 0, draft = '';
let typingEnabled = true, reviewTerminal = false, shownEnding = null, lastFortune = '';
try { typingEnabled = localStorage.getItem(TYPING_KEY) !== 'off'; } catch { /* Optional preference. */ }

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
if (restored && !state.transcript.slice(-2).some(row => row.kind === 'system' && row.text.startsWith('Сеанс відновлено.'))) append(resumed);
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
    image.src = './' + ending.mascot; image.alt = ending.alt;
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

// State is saved in full before presentation starts. Printing never delays a command.
let printing = [], printFrame = null, printCleanup = () => {};
function finishTyping() {
  if (printFrame !== null) cancelAnimationFrame(printFrame);
  printCleanup(); printCleanup = () => {};
  for (const job of printing) {
    job.element.classList.remove('awaiting-text');
    for (const part of job.parts) part.node.textContent = part.text;
  }
  printing = []; printFrame = null; skipTyping.hidden = true;
}
function typeText(elements, scrollContainer) {
  if (!typingEnabled || reducedMotion.matches || document.hidden) return;
  const jobs = elements.filter(element => element.textContent.length).map(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) parts.push({node: walker.currentNode, text: walker.currentNode.textContent});
    return {element, parts, length: parts.reduce((sum, part) => sum + part.text.length, 0), drawn: -1};
  });
  const total = jobs.reduce((sum, job) => sum + job.length, 0);
  if (!total) return;
  printing = jobs;
  for (const job of jobs) {
    job.element.classList.add('awaiting-text');
    for (const part of job.parts) part.node.textContent = '';
  }
  skipTyping.hidden = false;
  // Even a long log finishes within 1.8 s; small replies retain a typing rhythm.
  const duration = Math.min(1800, total * 7);
  let started;
  let follow = scrollContainer === output;
  const stopFollowing = () => { follow = false; };
  scrollContainer.addEventListener('wheel', stopFollowing, {once: true, passive: true});
  scrollContainer.addEventListener('touchmove', stopFollowing, {once: true, passive: true});
  printCleanup = () => {
    scrollContainer.removeEventListener('wheel', stopFollowing);
    scrollContainer.removeEventListener('touchmove', stopFollowing);
  };
  const tick = timestamp => {
    started ??= timestamp;
    let count = Math.min(total, Math.max(1, Math.floor(total * (timestamp - started) / duration)));
    for (const job of jobs) {
      const visible = Math.min(job.length, Math.max(0, count));
      if (visible > 0) job.element.classList.remove('awaiting-text');
      if (visible !== job.drawn) {
        let remaining = visible;
        for (const part of job.parts) {
          part.node.textContent = part.text.slice(0, Math.max(0, remaining));
          remaining -= part.text.length;
        }
        job.drawn = visible;
      }
      count -= job.length;
    }
    if (follow) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    if (timestamp - started >= duration) {
      finishTyping();
    } else printFrame = requestAnimationFrame(tick);
  };
  printFrame = requestAnimationFrame(tick);
}

function syncCompletion() {
  const completed = Boolean(state.ending) && !reviewTerminal;
  document.body.classList.toggle('completed', completed);
  completion.hidden = !completed;
  const skip = document.querySelector('.skip');
  skip.href = completed ? '#completion' : '#command';
  skip.textContent = completed ? 'До підсумку гри' : 'До командного рядка';
  document.getElementById('back-to-ending').hidden = !state.ending;
  if (!state.ending) { shownEnding = null; return []; }
  if (shownEnding === state.ending) return [];
  shownEnding = state.ending;
  const ending = ENDINGS[state.ending];
  const image = document.getElementById('completion-tik');
  image.src = './' + ending.mascot; image.alt = ending.alt;
  const [choice, story] = ending.text.split('\n\n');
  document.getElementById('completion-choice').textContent = choice;
  document.getElementById('completion-story').textContent = story;
  document.getElementById('completion-status').textContent = ending.status;
  completion.scrollTop = 0;
  return [document.getElementById('completion-choice'), document.getElementById('completion-story')];
}

let renderedRows = [];
function render(animate = false) {
  finishTyping();
  const newElements = [];
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
    if (!['command', 'file'].includes(item.kind)) newElements.push(line);
  }
  document.getElementById('prompt-path').textContent = ':' + state.cwd;
  const completionElements = syncCompletion();
  output.scrollTop = output.scrollHeight;
  if (animate) typeText(completion.hidden ? newElements : completionElements, completion.hidden ? output : completion);
}

function showFortune() {
  lastFortune = pickFortune(lastFortune);
  document.getElementById('fortune-text').textContent = lastFortune;
  fortune.hidden = false;
  placeFortune();
}
function placeFortune() {
  if (fortune.hidden) return;
  const app = document.getElementById('app').getBoundingClientRect();
  const commandRow = document.getElementById('command-form').getBoundingClientRect();
  // Keep the mascot inside this iframe and clear of the input, including mobile keyboards.
  const bottom = completion.hidden ? Math.min(app.height - 12, commandRow.top - app.top - 32) : app.height - 60;
  const maxX = Math.max(12, app.width - fortune.offsetWidth - 12);
  const maxY = Math.max(12, bottom - fortune.offsetHeight);
  fortune.style.left = (12 + Math.random() * (maxX - 12)) + 'px';
  fortune.style.top = (12 + Math.random() * (maxY - 12)) + 'px';
  fortune.style.maxHeight = Math.max(80, bottom - 12) + 'px';
}

function run(command) {
  if (!command.trim()) return;
  finishTyping();
  tik.hidden = true;
  fortune.hidden = true;
  announcement.textContent = '';
  const result = execute(state, command);
  state = result.state;
  if (result.action === 'restarted') reviewTerminal = false;
  input.value = '';
  draft = '';
  historyIndex = state.history.length;
  save();
  render(true);
  if (result.action === 'pumpkin') showFortune();
  // Keep announcements outside the visible transcript; avoid a second status UI.
  announcement.textContent = state.transcript.at(-1)?.text.slice(0, 500) || '';
  if (completion.hidden) input.focus({preventScroll: true});
  else completion.focus({preventScroll: true});
}

// Intercept input directly: sandboxed iframes need no form submission permission.
const app = document.getElementById('app');
const interactive = 'button, a, input, textarea, select, [contenteditable]:not([contenteditable="false"])';
app.addEventListener('click', event => {
  if (!completion.hidden || event.target.closest(interactive) || !window.getSelection()?.isCollapsed) return;
  input.focus({preventScroll: true});
});
// Keyboard users can start typing while the transcript has focus, too.
// Leave shortcuts, selection/copy, scrolling and controls to the browser.
app.addEventListener('keydown', event => {
  if (!completion.hidden || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.target.closest(interactive)) return;
  if (event.key === 'Enter') {
    event.preventDefault(); input.focus({preventScroll: true}); run(input.value);
  } else if (event.key.length === 1) {
    event.preventDefault(); input.focus({preventScroll: true});
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (input.value.length - (end - start) + event.key.length <= input.maxLength) {
      input.setRangeText(event.key, start, end, 'end');
      input.dispatchEvent(new Event('input', {bubbles: true}));
    }
  }
});
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
document.getElementById('dismiss-fortune').addEventListener('click', () => { fortune.hidden = true; });
window.addEventListener('resize', placeFortune);
document.getElementById('review-terminal').addEventListener('click', () => {
  finishTyping(); reviewTerminal = true; render(); input.focus({preventScroll: true});
});
document.getElementById('back-to-ending').addEventListener('click', () => {
  finishTyping(); fortune.hidden = true; tik.hidden = true; reviewTerminal = false; render(); completion.focus({preventScroll: true});
});
document.getElementById('play-again').addEventListener('click', () => {
  reviewTerminal = true; run('restart');
});
function updateTypingControl() {
  const enabled = typingEnabled && !reducedMotion.matches;
  typingToggle.textContent = enabled ? 'Друк: увімкнено' : 'Друк: вимкнено';
  typingToggle.setAttribute('aria-pressed', String(enabled));
  typingToggle.disabled = reducedMotion.matches;
}
typingToggle.addEventListener('click', () => {
  finishTyping(); typingEnabled = !typingEnabled;
  try { localStorage.setItem(TYPING_KEY, typingEnabled ? 'on' : 'off'); } catch { /* Optional preference. */ }
  updateTypingControl();
});
skipTyping.addEventListener('click', () => {
  finishTyping();
  if (completion.hidden) { output.scrollTop = output.scrollHeight; input.focus({preventScroll: true}); }
});
reducedMotion.addEventListener('change', () => { finishTyping(); updateTypingControl(); });
function checkReminder() {
  if (!document.hidden && fortune.hidden && reminderDue(state)) {
    acknowledgeReminder(state);
    tik.hidden = false;
    save();
  }
}
setInterval(checkReminder, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) finishTyping(); checkReminder(); });
historyIndex = state.history.length;
save();
updateTypingControl();
render(!restored);
// No autofocus: an iframe must not steal focus or open the mobile keyboard.
