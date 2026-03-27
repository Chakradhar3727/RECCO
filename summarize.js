const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\chakr\\RECCO Implementation Plans\\Phase-3.md', 'utf-8');
const lines = content.split('\n');

let summary = '';
let capture = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.match(/^(MODULE 3\.[0-9]|GATE G[0-9]{2})/i)) {
    summary += '\n--- ' + line + ' ---\n';
    capture = true;
  } else if (line.match(/^(PART [0-9]|DAY [0-9]+)/i)) {
    summary += '\n### ' + line + '\n';
  } else if (capture && line.length > 0) {
    if (summary.length < 150000) { // Limit size
      summary += line + '\n';
    }
  }
}

fs.writeFileSync('d:\\RECCO-MVP\\phase3_summary.txt', summary);
console.log('Summary created.');
