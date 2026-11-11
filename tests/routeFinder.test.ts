import { describe, expect, it } from 'vitest';
import { findRoute } from '../src/roads/routeFinder';
describe('route finder',()=>{it('finds the cheapest route',()=>{const nodes=[{id:'a',x:0,z:0},{id:'b',x:1,z:0},{id:'c',x:2,z:0}];const edges=[{from:'a',to:'b',cost:1},{from:'b',to:'c',cost:1},{from:'a',to:'c',cost:5}];expect(findRoute(nodes,edges,'a','c')).toEqual(['a','b','c'])})});
