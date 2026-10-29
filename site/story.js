export const TASKS = [
  { title: 'Знайди оператора', short: 'Оператор', text: 'Загадка (1/4): Хто працював у сеансі 07?\nЖурнали входів — у /sessions, облікові записи — у /registry. Зістав записи з цих папок і знайди логін оператора.\nПочни з ls /sessions. Знайдений логін перевір командою check <логін>.', hints: [
    'У журналі сеансу USER_ID — це номер облікового запису. У реєстрі йому відповідає стовпець uid. Потрібен логін із того самого рядка.',
    'У /registry/.accounts.csv знайди рядок з uid 014. У стовпці login — archivist. Введи check archivist.'
  ]},
  { title: 'Знайди джерело повідомлень', short: 'Джерело', text: 'Загадка (2/4): Звідки надходять повідомлення з підписом archivist?\nУ /logs є auth.log (входи й облікові записи), messages.log (повідомлення) та relay.log (їх доставка). Зістав ці журнали, щоб визначити джерело.\nПочни з ls /logs. Перевір номер процесу командою check <номер процесу>.', hints: [
    'Подивися, чи міг archivist увійти після видалення облікового запису. Потім знайди однакові значення ticket у messages.log та relay.log: вони позначають ту саму доставку.',
    'R-117, R-118 і R-119 ведуть до source=proc:042. Введи check 042.'
  ]},
  { title: 'Віднови архів', short: 'Архів', text: 'Загадка (3/4): Віднови архів процесу 042.\nФрагменти лежать у /archive/parts. Прочитай їх, обери три для процесу 042 та розташуй за часом подій.\nПочни з ls /archive/parts. Відповідь: check <назва> <назва> <назва>.', hints: [
    'Поле source показує, якому процесу належить фрагмент. Спершу відбери записи процесу 042, а потім порівняй їхній час від найранішого до найпізнішого.',
    'Потрібні moth (23:47:18), ash (23:54:02), cinder (23:58:23). static належить процесу 063. Введи check moth ash cinder.'
  ]},
  { title: 'Перевір запис сеансу', short: 'Сеанс 08', text: 'Загадка (4/4): Журнал сеансу 08 — старий запис чи він змінюється просто зараз?\nОпис ECHO — у /archive/echo.txt, журнал — у /sessions/session_08.log. Порівняй ці файли й знайди доказ, якому можна довіряти попри дату 2019 року.\nПрочитай опис ECHO командою cat /archive/echo.txt. Знайдений доказ передай командою check.', hints: [
    'Годинник відновлено зі знімка, тому сама дата нічого не доводить. Спробуй залишити щось своє й перевір, чи це з’явиться в журналі. Пояснення команд є в guide.',
    'Обери власне слово. Наприклад: echo гарбуз → cat /sessions/session_08.log → check гарбуз.'
  ]}
];

export const FACTS = [
  'Оператор сеансу 07 — archivist, UID 014. Його обліковий запис видалено.',
  'Повідомлення з підписом archivist надходять від процесу 042. Це не новий вхід оператора.',
  'Процес 042 — ECHO. Він записує термінальні сеанси й відтворює збережені повідомлення. Нових реплік він не створює.',
  'ECHO записує поточний сеанс 08. Власна мітка з echo з’явилася в журналі. Дата 2019 року взята з відновленого архівного годинника.'
];
export const ARCHIVE_MESSAGES = [
  'Нарешті. Я вже думав, що сюди більше ніхто не повернеться.',
  'Ти знайшов моє ім’я… Тоді чому я досі тут?',
  'Ми створили ECHO, щоб нічого не втрачати. Але так і не навчили його забувати.\n\nЯкщо ти дійшов сюди, рішення тепер за тобою.'
];
export const ARCHIVIST_FINAL = ARCHIVE_MESSAGES[2];
export const ENDINGS = {
  release: {name: 'Тиша', mascot: 'tik-release.svg', alt: 'Тик заплющив очі й заснув', status: 'ECHO зупинено · Архів доступний для читання', description: 'Зупинити ECHO. Зберегти архів для читання.', text: 'Ви обрали кінцівку «Тиша».\n\nECHO зупинено. Архів залишився, але більше ніхто не озветься з нього.'},
  stay: {name: 'Відлуння', mascot: 'tik-stay.svg', alt: 'Тик у навушниках продовжує слухати запис', status: 'ECHO працює · Сеанс 09 відкрито', description: 'Залишити ECHO ввімкненим. Відкрити сеанс 09.', text: 'Ви обрали кінцівку «Відлуння».\n\nЗапис і відтворення тривають. Тепер у наступному архіві буде й ваш сеанс.'}
};
// Репліки Тика — окрема ігрова дрібничка, не повідомлення архіву ECHO.
export const FORTUNES = [
  'Сьогодні знайдеться рішення задачі, яку ти вже відклав на потім.',
  'На тебе чекає повідомлення, від якого стане тепліше.',
  'Сьогодні кава буде смачною, а перерва — вчасною.',
  'Хтось оцінить те, над чим ти довго працював.',
  'Одна з дрібних справ сьогодні вирішиться сама собою.',
  'Сьогодні буде нагода посміятися від душі.',
  'Несподівана ідея з’явиться, щойно відійдеш від екрана.',
  'Знайдеться трохи часу на те, що ти любиш.',
  'Сьогодні ти помітиш, що вже вмієш більше, ніж місяць тому.',
  'Хороша новина застане тебе зненацька.',
  'Складна розмова виявиться простішою, ніж здавалося.',
  'Увечері буде за що подякувати цьому дню.'
];
export function pickFortune(previous = '', random = Math.random) {
  const choices = FORTUNES.filter(text => text !== previous);
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))];
}
export function archivedMessages(state) {
  const entries = [{label: state.stage ? 'archivist / сеанс 07' : 'Невідомий відправник', text: ARCHIVE_MESSAGES[0]}];
  if (state.stage >= 1) entries.push({label: 'archivist / сеанс 07', text: ARCHIVE_MESSAGES[1]});
  if (state.stage >= 4) entries.push({label: 'archivist / сеанс 07 / 31.10.2019', text: ARCHIVIST_FINAL});
  return entries;
}
export const quoteMessage = ({label, text}) => `[${label}]\n«${text}»`;

export function filesFor(state) {
  const files = {
    '/sessions/session_07.log': 'SESSION=07\nUSER_ID=014\nTTY=pts/0\nSTARTED_AT=2019-10-31T23:47:18Z\nENDED_AT=2019-10-31T23:54:02Z\nEXIT_STATUS=129\n\n2019-10-31T23:47:18Z LOGIN_OK uid=014 tty=pts/0\n2019-10-31T23:54:02Z SESSION_INTERRUPTED signal=SIGHUP\n2019-10-31T23:58:23Z RELAY_DELIVERY ticket=R-117',
    '/registry/.accounts.csv': 'uid,login,status,changed_at\n000,root,LOCKED,2019-10-31T23:59:00Z\n014,archivist,DELETED,2019-10-31T23:58:00Z\n028,backup,DISABLED,2019-10-30T18:20:11Z'
  };
  if (state.stage >= 1) Object.assign(files, {
    '/logs/auth.log': '2019-10-31T23:47:18Z auth: LOGIN_OK uid=014 tty=pts/0\n2019-10-31T23:54:02Z auth: SESSION_CLOSED uid=014 reason=hangup\n2019-10-31T23:58:00Z auth: ACCOUNT_DELETED uid=014\n2019-10-31T23:58:00Z auth: TOKEN_REVOKED uid=014\n2026-10-31T00:13:00Z auth: SESSION_OPEN uid=guest tty=pts/1',
    '/logs/messages.log': '2019-10-31T23:58:23Z message: ticket=R-117 display_as=archivist message_id=07:001\n2026-10-31T00:13:08Z message: ticket=R-118 display_as=archivist message_id=07:001\n2026-10-31T00:14:11Z message: ticket=R-119 display_as=archivist message_id=07:002',
    '/logs/relay.log': '2019-10-31T23:58:23Z relay: ticket=R-117 source=proc:042 status=delivered\n2026-10-31T00:13:08Z relay: ticket=R-118 source=proc:042 status=delivered\n2026-10-31T00:14:11Z relay: ticket=R-119 source=proc:042 status=delivered'
  });
  if (state.stage >= 2) Object.assign(files, {
    '/archive/README.txt': 'Archive recovery\n================\n\nsource: proc:042\nsegments: 3\norder: timestamp ASC\n\nФрагменти: parts/\nВідновлення: check <назва> <назва> <назва>',
    '/archive/parts/moth': '2019-10-31T23:47:18Z source=proc:042 session=07 event=LOGIN_OK uid=014 tty=pts/0',
    '/archive/parts/ash': '2019-10-31T23:54:02Z source=proc:042 session=07 event=SESSION_INTERRUPTED signal=SIGHUP',
    '/archive/parts/cinder': '2019-10-31T23:58:23Z source=proc:042 session=07 event=RELAY_DELIVERY ticket=R-117',
    '/archive/parts/static': '2019-10-31T23:50:11Z source=proc:063 event=CACHE_FLUSH entries=128 status=ok'
  });
  if (state.stage >= 3) {
    files['/archive/echo.txt'] = `# ECHO — terminal session recorder\n# Replay uses stored messages only. No text generation.\n\n[service]\npid=042\ncapture=${state.ending === 'release' ? 'off' : 'on'}\nreplay=${state.ending === 'release' ? 'off' : 'on'}\nreplay_source=session_07\n\n[clock]\nsource=snapshot\nepoch=2019-10-31\n# Relay logs use the host clock; session logs use the snapshot clock.\n\n[session]\nid=${state.ending === 'stay' ? '09' : '08'}\nuser=guest\noutput=/sessions/session_${state.ending === 'stay' ? '09' : '08'}.log`;
    files['/sessions/session_08.log'] = `SESSION=08\nUSER=guest\nCLOCK=ARCHIVE / 2019-10-31\nRECORDING=${state.ending ? 'CLOSED' : 'ON'}\n\n${state.sessionEntries.map((entry, i) => `2019-10-31 [${String(i + 1).padStart(4, '0')}] ${entry}`).join('\n')}`;
  }
  if (state.stage >= 4) files['/archive/last_message.txt'] = 'session=07\nuid=014\nmessage_id=07:003\nrecorded_at=2019-10-31T23:58:23Z\nplayback=delivered';
  if (state.ending === 'stay') files['/sessions/session_09.log'] = 'SESSION=09\nUSER=guest\nECHO=ACTIVE\nRECORDING=ON\nREPLAY=ON\n\n2019-10-31 [0001] SESSION_OPEN uid=guest\n2019-10-31 [0002] REPLAY message_id=07:001';
  return files;
}
export function directoriesFor(state) {
  return ['/', '/sessions', '/registry', ...(state.stage >= 1 ? ['/logs'] : []), ...(state.stage >= 2 ? ['/archive', '/archive/parts'] : [])];
}
