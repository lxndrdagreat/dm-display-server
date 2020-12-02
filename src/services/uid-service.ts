// custom nanoid generator
import {customAlphabet} from 'nanoid';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 5);

export function nextUID(): string {
  return nanoid();
}
