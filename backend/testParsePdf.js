const path = require('path');
const { parseFile } = require('./utils/fileParser');

async function test() {
  try {
    const samplePath = path.join(__dirname, 'utils', 'sample.pdf');
    const text = await parseFile(samplePath);
    console.log('===== Extracted PDF Text =====');
    console.log(text);
    console.log('===== End of Extracted Text =====');
  } catch (err) {
    console.error('Error parsing file:', err);
  }
}

test();
