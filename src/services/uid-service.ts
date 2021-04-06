// custom nanoid generator
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 5);
const nanoidLong = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 64);

export function nextUID(): string {
  return nanoid();
}

export function nextLongUID(): string {
  return nanoidLong();
}
