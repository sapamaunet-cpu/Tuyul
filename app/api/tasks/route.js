import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const readFile = (fileName) => {
    try {
      const filePath = path.join(process.cwd(), 'public', fileName);
      if (!fs.existsSync(filePath)) return [];
      return fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim() !== '');
    } catch { return []; }
  };
  return NextResponse.json({ 
    allKeywords: readFile('keywords.txt'), 
    allLinks: readFile('msn_links.txt') 
  });
}
