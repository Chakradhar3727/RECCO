const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\chakr\\RECCO Implementation Plans\\Phase-3.md', 'utf-8');
const lines = content.split('\n');

let summary = '# Phase 3 Summary\n\n';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  // Extract Fixes
  if (line.match(/^FIX [0-9]+ /i) || line.match(/^\*\*FIX [0-9]+/i)) {
    summary += line + '\n';
  }
  // Extract Gates
  if (line.match(/^G[345][0-9](-?[A-C])?\s/i) || line.match(/^Gate G[345][0-9]\s/i) || line.match(/^\*\*G[345][0-9]/i)) {
    // get next few lines as well to get the full description
    summary += '### ' + line + '\n';
    for (let j = 1; j < 5; j++) {
      if (i + j < lines.length && !lines[i+j].match(/^G[345][0-9]/) && lines[i+j].trim().length > 0) {
        summary += lines[i+j].trim() + '\n';
      } else {
        break;
      }
    }
  }
}

fs.writeFileSync('d:\\RECCO-MVP\\gates_summary.md', summary);
console.log('Done');
