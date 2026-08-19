import { parseIvcUri } from './src/lib/ivc-protocol/parser.ts';

console.log(parseIvcUri("ivc://jakedot.net/§metadata+xyz-abc"));
console.log(parseIvcUri("ivc://§metadata+xyz-abc"));
