#!/usr/bin/env node
// Quick version check to see if India-only filtering is active

const config = require('./config');

console.log('Configuration check:\n');
console.log('config.location.strict:', config.location.strict);
console.log('config.location.indianCities:', config.location.indianCities ? 'defined ✓' : 'MISSING ✗');
console.log('config.location.allow:', config.location.allow ? 'OLD VERSION ✗' : 'not present ✓');

if (config.location.indianCities) {
  console.log('\n✓ You have the NEW India-only filter');
  console.log('Indian cities:', config.location.indianCities.slice(0, 5).join(', '), '...');
} else {
  console.log('\n✗ You have the OLD version with generic location filter');
  console.log('Please run: git pull origin master');
}
