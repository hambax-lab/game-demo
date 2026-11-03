// Размеры сетки, цены и модули. Баланс игры правится здесь.

export const COLS = [10, 137, 264], CELL_W = 116;
export const ROWS = [270, 398, 526], CELL_H = 116;
export const ACTOR_SCALE = 1.3, MODULE_SCALE = 1.2;
export const SURFACE_Y = 236;
export const START = { r: 0, c: 1 };
export const DIG_BASE_PRICE = 50000, DIG_PRICE_GROWTH = 1.45;
export const DIG_TIME = 2600, BUILD_TIME = 1500, WORK_TIME = 900;
export const WAR_TICK_MS = 40000;

export const cellX = c => COLS[c];
export const cellY = r => ROWS[r];
export const centerX = c => COLS[c] + CELL_W / 2;
export const floorY = r => ROWS[r] + CELL_H - 12;
export const shaftX = c => COLS[c] + CELL_W - 26;
export const moduleX = c => COLS[c] + 44;
export const workX = c => COLS[c] + 84;
export const key = (r, c) => r + ',' + c;

export const MODULES = {
  laptop: {
    name: 'Рабочее место', what: 'Удалёнка из бункера. Заказы приносят деньги.',
    price: 40000, days: 0, every: 4500,
    task: { label: '+$12 000', money: 12000, done: 'Заказ сдан' },
  },
  greenhouse: {
    name: 'Теплица', what: 'Помидоры и зелень под фиолетовой лампой.',
    price: 90000, days: 20, every: 6500,
    task: { label: '+3 дн. еды', days: 3, done: 'Урожай собран' },
  },
  filter: {
    name: 'Фильтр воды', what: 'Чистая вода, даже если сверху всё отравлено.',
    price: 70000, days: 25, every: 6500,
    task: { label: '+3 дн. воды', days: 3, done: 'Фильтр промыт' },
  },
  generator: {
    name: 'Генератор', what: 'Свет и тепло, когда отключат электричество.',
    price: 120000, days: 15, every: 7000, needsDepth: 1,
    task: { label: '+$8 000', money: 8000, done: 'Генератор заправлен' },
  },
};

export const FINDS = {
  '1,0': { kind: 'chest', money: 60000, text: 'Под землёй нашёлся старый ящик. Внутри $60 000' },
  '0,2': { kind: 'bone', text: 'Собака нашла кость и очень довольна' },
};
