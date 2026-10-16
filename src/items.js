// Everything on the tt's pink oven menu. Station keys: 1-3 cookies, 4-6 boba.
export const ITEMS = [
  { id: 'choc', kind: 'cookie', name: 'Choc chip', key: '1', dough: '#d9a066', bits: '#4a2a17', icon: '🍪' },
  { id: 'biscoff', kind: 'cookie', name: 'Biscoff', key: '2', dough: '#b8742f', bits: '#f2c78a', icon: '🍪' },
  { id: 'white', kind: 'cookie', name: 'White choc', key: '3', dough: '#f0d39b', bits: '#fffaf0', icon: '🍪' },
  { id: 'taro', kind: 'boba', name: 'Taro boba', key: '4', tea: '#b392d6', icon: '🧋' },
  { id: 'berry', kind: 'boba', name: 'Strawberry boba', key: '5', tea: '#ff8fb3', icon: '🧋' },
  { id: 'milk', kind: 'boba', name: 'Milk tea boba', key: '6', tea: '#c99a6b', icon: '🧋' },
];

export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** The colour that stands for an item in the HUD (dough or tea). */
export const itemColor = (id) => ITEM[id].tea ?? ITEM[id].dough;
