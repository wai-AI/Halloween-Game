// Recovered plot and answers are preserved. See docs/scenario.md for provenance.
export const TASKS = [
  { title: 'Знайди оператора', short: 'Оператор', text: 'Хто працював у сеансі 07? Знайди його логін і введи check <логін>.', hints: [
    'У sessions/session_07.log є ID оператора. Пошукай відповідний обліковий запис у registry/. Команда ls -a показує приховані файли.',
    'Введи cat registry/.accounts.csv. Знайди рядок з ID 014. Перевір логін командою check archivist.'
  ]},
  { title: 'Знайди джерело повідомлень', short: 'Джерело', text: 'Повідомлення підписані archivist. Звідки вони насправді надходять? Зістав журнали в /logs і введи check <номер процесу>.', hints: [
    'Підпис повідомлення ще не означає, що користувач увійшов у систему. Зістав relay tickets у messages.log та relay.log.',
    'R-117, R-118 і R-119 ведуть до source=proc:042. Введи check 042.'
  ]},
  { title: 'Віднови архів', short: 'Архів', text: 'У /archive/parts збереглися фрагменти. Обери три для процесу 042 та розташуй за часом подій: check <назва> <назва> <назва>. Без .frg.', hints: [
    'Порівняй source та час у кожному фрагменті. Один із них належить іншому процесу.',
    'Потрібні moth (23:47:18), ash (23:54:02), cinder (23:58:23). static належить процесу 063. Введи check moth ash cinder.'
  ]},
  { title: 'Перевір запис сеансу', short: 'Сеанс 08', text: 'Чи записує ECHO те, що ти вводиш зараз? Додай власну мітку командою echo <слово>, перечитай /sessions/session_08.log, а тоді введи check <те саме слово>.', hints: [
    'Старий рік у журналі — це архівний годинник. Залиши слово, якого немає в старому записі: echo <слово>. Потім відкрий session_08.log.',
    'Наприклад: echo гарбуз → cat /sessions/session_08.log → check гарбуз. Можеш обрати інше слово.'
  ]}
];

export const FACTS = [
  'Оператор сеансу 07 — archivist, UID 014. Його обліковий запис видалено.',
  'Повідомлення з підписом archivist надходять від процесу 042. Це не новий вхід оператора.',
  'Процес 042 — ECHO. Він записує термінальні сеанси й відтворює збережені повідомлення. Нових реплік він не створює.',
  'ECHO записує поточний сеанс 08. Власна мітка з echo з’явилася в журналі. Дата 2019 року взята з відновленого архівного годинника.'
];

export const ARCHIVIST_FINAL = 'Ми створили ECHO, щоб нічого не втрачати. Але так і не навчили його забувати.\n\nЯкщо ти дійшов сюди, рішення тепер за тобою.';

export function filesFor(state) {
  const files = {
    '/sessions/session_07.log': `SESSION=07\nSNAPSHOT=2019-10-31\nUSER_ID=014\n23:47:18 LOGIN_OK\n23:54:02 SESSION_INTERRUPTED\n23:58:23 RELAY_DELIVERY\n\n[Повідомлення збережено в архіві]\nНарешті. Я вже думав, що сюди більше ніхто не повернеться.`,
    '/registry/.accounts.csv': 'uid,login,status\n001,root,LOCKED\n014,archivist,DELETED\n028,backup,DISABLED'
  };
  if (state.stage >= 1) Object.assign(files, {
    '/logs/auth.log': '2019-10-31 23:58:00 uid=014 ACCOUNT_DELETED\n2019-10-31 23:58:00 uid=014 TOKEN_REVOKED\n2026-10-31 00:13:00 uid=guest SESSION_OPEN\n\nПісля видалення UID 014 успішних входів цього користувача немає.',
    '/logs/messages.log': '2019-10-31 23:58:23 ticket=R-117 display_as=archivist\n2026-10-31 00:13:08 ticket=R-118 display_as=archivist\n2026-10-31 00:14:11 ticket=R-119 display_as=archivist\n\nR-118: Нарешті. Я вже думав, що сюди більше ніхто не повернеться.\nR-119: Ти знайшов моє ім’я… Тоді чому я досі тут?',
    '/logs/relay.log': 'ticket=R-117 source=proc:042\nticket=R-118 source=proc:042\nticket=R-119 source=proc:042\n\nУсі три доставки надійшли з одного процесу.'
  });
  if (state.stage >= 2) Object.assign(files, {
    '/archive/README.txt': 'Відновлення архіву процесу 042\n\nФрагменти лежать у parts/. Для відновлення потрібні три фрагменти цього процесу в порядку подій.\n\nПеревірка: check <назва> <назва> <назва>\nНазви вводь без .frg.',
    '/archive/parts/moth.frg': 'fragment=moth\nsource=proc:042\n2019-10-31 23:47:18 LOGIN_OK\n\nУвімкнено запис термінального сеансу 07.',
    '/archive/parts/ash.frg': 'fragment=ash\nsource=proc:042\n2019-10-31 23:54:02 SESSION_INTERRUPTED\n\nСеанс перервано. Буфер повідомлень збережено.',
    '/archive/parts/cinder.frg': 'fragment=cinder\nsource=proc:042\n2019-10-31 23:58:23 RELAY_DELIVERY\n\nЗбережене повідомлення передано на відтворення.',
    '/archive/parts/static.frg': 'fragment=static\nsource=proc:063\n2019-10-31 23:50:11 CACHE_FLUSH\n\nОчищено кеш іншого процесу.'
  });
  if (state.stage >= 3) {
    files['/archive/echo.txt'] = `ECHO / proc:042\n\nПризначення: запис термінальних сеансів і відтворення архівних повідомлень.\nНових діалогів ECHO не створює. Репліки archivist — записи сеансу 07.\n\narchive_clock=2019-10-31\ncurrent_session=${state.ending === 'stay' ? '09' : '08'}\ncurrent_user=guest\nrecording=${state.ending === 'release' ? 'OFF' : 'ON'}\n\nПісля відновлення використовується годинник з архіву. Дата в журналі не підтверджує давність запису.\nЖурнали доставки в /logs використовують час вузла (2026), а журнал сеансу — archive_clock (2019).\n\nПеревірка запису: echo <власне слово> → cat /sessions/session_08.log → check <те саме слово>.`;
    files['/sessions/session_08.log'] = `SESSION=08\nUSER=guest\nCLOCK=ARCHIVE / 2019-10-31\nRECORDING=${state.ending ? 'CLOSED' : 'ON'}\n\n${state.sessionEntries.map((entry, i) => `2019-10-31 [${String(i + 1).padStart(4, '0')}] ${entry}`).join('\n')}`;
  }
  if (state.stage >= 4) files['/archive/last_message.txt'] = `[Архів сеансу 07 / archivist / 2019-10-31]\n\n${ARCHIVIST_FINAL}\n\nrelease — зупинити ECHO; архів лишиться доступним для читання.\nstay — залишити запис і відтворення ввімкненими; відкрити сеанс 09.`;
  if (state.ending === 'stay') files['/sessions/session_09.log'] = 'SESSION=09\nUSER=guest\nECHO=ACTIVE\nRECORDING=ON\nREPLAY=ON\n\n[Відтворення з архіву сеансу 07 / archivist]\nНарешті. Я вже думав, що сюди більше ніхто не повернеться.';
  return files;
}

export function directoriesFor(state) {
  return ['/', '/sessions', '/registry', ...(state.stage >= 1 ? ['/logs'] : []), ...(state.stage >= 2 ? ['/archive', '/archive/parts'] : [])];
}
