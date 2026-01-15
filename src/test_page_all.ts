import axios from 'axios';
import { RomspediaClient } from './client';
import * as fs from 'fs';

async function run() {
  // Ensure state file is removed so ids start from 1 for test
  const stateFile = '.romspedia_state.json';
  try { if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile); } catch(e) {}

  // Mock axios.get to return listing HTML for pages 1..3 and empty for page 4
  const originalGet = axios.get as any;
  (axios as any).get = async (url: string) => {
    // Simple detection: if url contains '/page/X' return corresponding page
    let pageMatch = url.match(/\/page\/(\d+)/);
    let page = 1;
    if (pageMatch && pageMatch[1]) page = parseInt(pageMatch[1], 10);

    // If url is a search or detail url, return minimal page that won't break list parsing
    if (url.includes('/search')) {
      return { data: '<div></div>' };
    }

    if (page >= 1 && page <= 3) {
      // create 2 rom links per page
      const romsHtml = [`<a href="/roms/nintendo/rom-${page}-a">Rom ${page}-A</a>`, `<a href="/roms/nintendo/rom-${page}-b">Rom ${page}-B</a>`].join('\n');
      return { data: `<html><body>${romsHtml}</body></html>` };
    }

    // page 4+ returns no roms
    return { data: '<html><body><div>No results</div></body></html>' };
  };

  try {
    const client = new RomspediaClient();
    const roms = await client.fetchRoms('nintendo', -1);

    console.log('\n--- Test result ---');
    console.log(`Fetched ${roms.length} roms`);

    if (roms.length !== 6) {
      console.error('❌ Expected 6 roms (3 pages x 2), got', roms.length);
      process.exitCode = 2;
      return;
    }

    // Check ids are present and incremental
    const ids = roms.map(r => r.id).filter(x => typeof x === 'number');
    const uniqueIds = new Set(ids);
    if (ids.length !== 6 || uniqueIds.size !== 6) {
      console.error('❌ IDs missing or not unique', ids);
      process.exitCode = 2;
      return;
    }

    console.log('✅ IDs assigned:', ids.join(', '));
    console.log('✅ test_page_all passed');
  } catch (err) {
    console.error('❌ Test failed', err);
    process.exitCode = 2;
  } finally {
    // restore axios.get
    (axios as any).get = originalGet;
  }
}

run();
