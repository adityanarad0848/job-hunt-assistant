#!/usr/bin/env node
// Prints the exact command to schedule the daily run on your OS.
// We DON'T modify your system automatically — we show you the one-liner so you
// stay in control of what gets installed.
//
//   node schedule/setup.js            default 8:00am daily
//   node schedule/setup.js 7 30       7:30am daily
const path = require('path');
const os = require('os');

const projectDir = path.join(__dirname, '..');
const platform = os.platform();

const hour = Number(process.argv[2] ?? 8);
const minute = Number(process.argv[3] ?? 0);
if (Number.isNaN(hour) || hour < 0 || hour > 23 || Number.isNaN(minute) || minute < 0 || minute > 59) {
  console.error('Usage: node schedule/setup.js [hour 0-23] [minute 0-59]');
  process.exit(1);
}
const hh = String(hour).padStart(2, '0');
const mm = String(minute).padStart(2, '0');

console.log(`\nSchedule the Job Hunt Assistant to run daily at ${hh}:${mm}.\n`);

if (platform === 'win32') {
  const ps1 = path.join(projectDir, 'schedule', 'run-daily.ps1');
  console.log('Windows — Task Scheduler. Run this once in PowerShell:\n');
  console.log(
    `  schtasks /Create /SC DAILY /TN "JobHuntAssistant" /ST ${hh}:${mm} ` +
    `/TR "powershell -NoProfile -ExecutionPolicy Bypass -File \\"${ps1}\\""\n`
  );
  console.log('  Remove later with:  schtasks /Delete /TN "JobHuntAssistant" /F');
  console.log('  Run it now to test:  schtasks /Run /TN "JobHuntAssistant"');
} else {
  const sh = path.join(projectDir, 'schedule', 'run-daily.sh');
  console.log('macOS / Linux — cron. First make the runner executable:\n');
  console.log(`  chmod +x "${sh}"\n`);
  console.log('Then add a cron entry. Run "crontab -e" and paste this line:\n');
  console.log(`  ${mm} ${hour} * * *  "${sh}" >> "${path.join(projectDir, 'schedule', 'logs', 'cron.log')}" 2>&1\n`);
  console.log('  (cron has a minimal PATH. If "node" is not found, set NODE_BIN at the');
  console.log('   top of the crontab, e.g.:  NODE_BIN=' + process.execPath);
  console.log('  List jobs:   crontab -l');
  console.log('  Remove:      crontab -e  then delete the line');
  console.log('  Test now:    "' + sh + '" --demo');
}

console.log('\nThe daily run will: fetch -> rank -> flag new jobs -> rebuild report.html.');
console.log('Open report.html any time to see the latest, with NEW jobs at the top.\n');
