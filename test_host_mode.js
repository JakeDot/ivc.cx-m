import { parseIvcUri } from './src/lib/ivc-protocol/parser.ts';

console.log(parseIvcUri("ivc://jakedot.net+xyz"));
console.log(parseIvcUri("ivc://+xyz"));
