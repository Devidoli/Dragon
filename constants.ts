
import { Product } from './types.ts';

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Old Durbar Black Chimney', category: 'Whisky', volume: 'Full (750ml)', price: 3450, stock: 45, unit: 'Bottle', image: 'https://picsum.photos/seed/whisky1/400/400' },
  { id: '2', name: 'Ruslan Vodka', category: 'Vodka', volume: 'Full (750ml)', price: 1850, stock: 120, unit: 'Bottle', image: 'https://picsum.photos/seed/vodka1/400/400' },
  { id: '3', name: 'Khukri XXX Rum', category: 'Rum', volume: 'Full (750ml)', price: 2100, stock: 80, unit: 'Bottle', image: 'https://picsum.photos/seed/rum1/400/400' },
  { id: '4', name: 'Tuborg Beer', category: 'Beer', volume: '650ml', price: 420, stock: 200, unit: 'Bottle', image: 'https://picsum.photos/seed/beer1/400/400' },
  { id: '5', name: 'Signature Premier', category: 'Whisky', volume: 'Half (375ml)', price: 1250, stock: 15, unit: 'Bottle', image: 'https://picsum.photos/seed/whisky3/400/400' },
  { id: '6', name: 'Bagpiper Whisky', category: 'Whisky', volume: 'Quarter (180ml)', price: 450, stock: 110, unit: 'Bottle', image: 'https://picsum.photos/seed/whisky2/400/400' },
];

export const CATEGORIES = ['All', 'Whisky', 'Vodka', 'Rum', 'Beer', 'Wine', 'Gin'];

export const LIQUOR_VOLUMES = [
  'Full (750ml)',
  'Half (375ml)',
  'Quarter (180ml)',
  '650ml',
  'Can (500ml)',
  'Can (330ml)'
];
