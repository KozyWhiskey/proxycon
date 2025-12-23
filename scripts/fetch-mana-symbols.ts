import fs from 'fs';
import path from 'path';
import https from 'https';

const SYMBOLS_DIR = path.join(process.cwd(), 'public', 'mana');

// Ensure directory exists
if (!fs.existsSync(SYMBOLS_DIR)) {
  fs.mkdirSync(SYMBOLS_DIR, { recursive: true });
}

interface ScryfallSymbol {
  symbol: string;
  svg_uri: string;
  english: string;
}

const WANTED_SYMBOLS = [
  '{W}', '{U}', '{B}', '{R}', '{G}', // Colors
  '{C}', // Colorless
  '{X}', // Variable
  '{T}', // Tap
  '{Q}', // Untap
  '{S}', // Snow
  '{E}', // Energy
  '{P}', // Phyrexian generic
  '{W/P}', '{U/P}', '{B/P}', '{R/P}', '{G/P}', // Phyrexian colors
  '{0}', '{1}', '{2}', '{3}', '{4}', '{5}', '{6}', '{7}', '{8}', '{9}', '{10}',
  '{11}', '{12}', '{13}', '{14}', '{15}', '{16}', '{20}', // Generic costs
];

async function fetchSymbols() {
  console.log('Fetching symbols from Scryfall...');
  
  try {
    const response = await fetch('https://api.scryfall.com/symbology');
    const data = await response.json();
    
    if (!data.data) {
      console.error('No data received from Scryfall');
      return;
    }

    const symbols: ScryfallSymbol[] = data.data;
    
    let downloadCount = 0;

    for (const sym of symbols) {
      if (WANTED_SYMBOLS.includes(sym.symbol)) {
        const filename = sym.symbol.replace('{', '').replace('}', '').replace('/', '') + '.svg';
        const filePath = path.join(SYMBOLS_DIR, filename);
        
        await downloadFile(sym.svg_uri, filePath);
        console.log(`Downloaded: ${filename}`);
        downloadCount++;
      }
    }

    console.log(`\nSuccessfully downloaded ${downloadCount} symbols to ${SYMBOLS_DIR}`);

  } catch (error) {
    console.error('Error fetching symbols:', error);
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

fetchSymbols();
