import fs from 'fs';

const content = fs.readFileSync('src/components/dashboard/dashboard-screen.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('isToday')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
