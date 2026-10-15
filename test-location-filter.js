#!/usr/bin/env node
// Quick test to verify India-only location filtering

const testCases = [
  // Should PASS (India locations)
  { location: 'Pune, India', expected: true },
  { location: 'Bengaluru, India', expected: true },
  { location: 'Hyderabad, India', expected: true },
  { location: 'Remote, India', expected: true },
  { location: 'Mumbai, India', expected: true },
  { location: 'Bangalore, Karnataka, India', expected: true },
  { location: 'Pune', expected: true },
  { location: 'Bengaluru', expected: true },
  
  // Should FAIL (US/Canada/other locations)
  { location: 'Bellevue, Washington', expected: false },
  { location: 'San Francisco, California', expected: false },
  { location: 'Toronto, Ontario, Canada', expected: false },
  { location: 'Remote', expected: false },
  { location: 'SF, SEA, NYC, Remote', expected: false },
  { location: 'US-Remote, US-Chicago', expected: false },
  { location: 'New York, US - Remote, Toronto', expected: false },
  { location: '', expected: false },
];

function matchesIndiaLocation(location, indianCities) {
  const loc = location.toLowerCase();
  if (!loc) return false;
  
  // Check for "india" keyword
  if (loc.includes('india')) return true;
  
  // Check for Indian cities
  if (indianCities && indianCities.some(city => loc.includes(city))) {
    return true;
  }
  
  return false;
}

const indianCities = ['pune', 'bengaluru', 'bangalore', 'hyderabad', 'mumbai', 'delhi', 'chennai', 'kolkata', 'gurugram', 'gurgaon', 'noida'];

console.log('Testing India-only location filter:\n');
let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = matchesIndiaLocation(test.location, indianCities);
  const status = result === test.expected ? '✓' : '✗';
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
    console.log(`${status} "${test.location}" => ${result} (expected ${test.expected})`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
