import { RomspediaDownloader, RomInfo } from './RomspediaDownloader';

/**
 * Client for fetching ROMs from Romspedia
 */
export class RomspediaClient {
  private downloader: RomspediaDownloader;

  constructor(downloadDir?: string) {
    this.downloader = new RomspediaDownloader(downloadDir);
  }

  /**
   * Fetch ROMs by console name and page number
   * @param consoleName - Name of the console (e.g., 'nintendo', 'playstation', 'gameboy-advance')
   * @param page - Page number (default: 1)
   * @returns Promise<RomInfo[]> - Array of ROM information
   */
  async fetchRoms(consoleName: string, page: number = 1): Promise<RomInfo[]> {
    try {
      // If page is -1, fetch all pages until no ROMs are returned
      if (page === -1) {
        const allRoms: RomInfo[] = [];
        const seenUrls = new Set<string>();
        let currentPage = 1;
        while (true) {
          const roms = await this.downloader.getRomsByConsole(consoleName, currentPage);
          if (!roms || roms.length === 0) {
            console.log(`No roms on page ${currentPage}, stopping.`);
            break;
          }

          // Count how many roms are new (by downloadUrl)
          let newCount = 0;
          for (const r of roms) {
            if (!seenUrls.has(r.downloadUrl)) newCount++;
          }

          // If this page yields no new roms, likely the site returned the last page again
          if (newCount === 0) {
            console.log(`Page ${currentPage} returned no new ROMs (likely fallback to last page). Stopping.`);
            break;
          }

          // Append only the roms that are new
          for (const r of roms) {
            if (!seenUrls.has(r.downloadUrl)) {
              seenUrls.add(r.downloadUrl);
              allRoms.push(r);
            }
          }

          // Progress logging per page
          console.log(`Fetched page ${currentPage}: ${roms.length} rom(s), ${newCount} new — total so far: ${allRoms.length}`);

          // Small delay to be gentle to the site
          await new Promise(resolve => setTimeout(resolve, 300));
          currentPage++;
        }

        // Remove duplicates by downloadUrl while keeping first occurrence (and its id)
        const map = new Map<string, RomInfo>();
        for (const r of allRoms) {
          if (!map.has(r.downloadUrl)) map.set(r.downloadUrl, r);
        }
        const result = Array.from(map.values());
        // Persist id state once after the full batch fetch
        try {
          (this.downloader as any).saveState();
        } catch (err) {
          // ignore
        }
        return result;
      }

      const roms = await this.downloader.getRomsByConsole(consoleName, page);
      return roms;
    } catch (error) {
      console.error(`Error fetching ROMs for ${consoleName} page ${page}:`, error);
      return [];
    }
  }

  /**
   * Fetch ROM details by URL
   * @param url - ROM detail page URL
   * @returns Promise<RomInfo | null> - ROM information with all details
   */
  async fetchRomDetails(url: string): Promise<RomInfo | null> {
    try {
      return await this.downloader.getRomDetails(url);
    } catch (error) {
      console.error(`Error fetching ROM details from ${url}:`, error);
      return null;
    }
  }

  /**
   * Download a ROM
   * @param romInfo - ROM information object
   * @returns Promise<boolean> - True if download successful
   */
  async downloadRom(romInfo: RomInfo): Promise<boolean> {
    try {
      return await this.downloader.downloadRom(romInfo);
    } catch (error) {
      console.error(`Error downloading ROM ${romInfo.title}:`, error);
      return false;
    }
  }

  /**
   * Fetch multiple pages of ROMs
   * @param consoleName - Name of the console
   * @param startPage - Starting page number
   * @param endPage - Ending page number
   * @returns Promise<RomInfo[]> - Combined array of all ROMs from specified pages
   */
  async fetchMultiplePages(
    consoleName: string, 
    startPage: number, 
    endPage: number
  ): Promise<RomInfo[]> {
    const allRoms: RomInfo[] = [];
    
    for (let page = startPage; page <= endPage; page++) {
      const roms = await this.fetchRoms(consoleName, page);
      allRoms.push(...roms);
      
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    // Batch persist ids after multi-page fetch
    try {
      (this.downloader as any).saveState();
    } catch (err) {
      // ignore
    }

    return allRoms;
  }

  /**
   * Search for ROMs
   * @param query - Search query
   * @returns Promise<RomInfo[]> - Array of matching ROMs
   */
  async searchRoms(query: string): Promise<RomInfo[]> {
    try {
      return await this.downloader.searchRoms(query);
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      return [];
    }
  }

  /**
   * List available platforms
   * @returns Promise<string[]> - Array of platform names
   */
  async listPlatforms(): Promise<string[]> {
    try {
      return await this.downloader.listPlatforms();
    } catch (error) {
      console.error('Error listing platforms:', error);
      return [];
    }
  }

  /**
   * Get download directory path
   * @returns string - Download directory path
   */
  getDownloadDir(): string {
    return this.downloader.getDownloadDir();
  }
}

// Example usage
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Default values
  let consoleName = 'nintendo';
  let pageNumber = 1;
  let outputFile = 'roms.json';
  let startId: number | undefined = undefined;
  let shouldDownload = false;
  
  // Parse arguments: --console=<name> --page=<number> --output=<file> --start-id=<number> --download
  args.forEach(arg => {
    if (arg.startsWith('--console=')) {
      const value = arg.split('=')[1];
      if (value) consoleName = value;
    } else if (arg.startsWith('--page=')) {
      const value = arg.split('=')[1];
      if (value) pageNumber = parseInt(value, 10);
    } else if (arg.startsWith('--output=')) {
      const value = arg.split('=')[1];
      if (value) outputFile = value;
    } else if (arg.startsWith('--start-id=')) {
      const value = arg.split('=')[1];
      if (value) startId = parseInt(value, 10);
    } else if (arg === '--download') {
      shouldDownload = true;
    }
  });

  // Create a client instance
  const client = new RomspediaClient();

  console.log('🎮 Romspedia Client\n');
  console.log('='.repeat(50));
  console.log(`Console: ${consoleName}`);
  console.log(`Page: ${pageNumber}`);
  console.log(`Output: ${outputFile}`);
  if (startId !== undefined) {
    console.log(`Start ID: ${startId}`);
  }
  if (shouldDownload) {
    console.log(`Download: enabled (saves to downloads/${consoleName}/)`);
  }
  console.log('='.repeat(50));

  // Set start ID if provided
  if (startId !== undefined) {
    (client as any).downloader.setStartId(startId);
  }

  // Fetch ROMs by console name and page
  console.log(`\n📋 Fetching ROMs: ${consoleName}, Page ${pageNumber === -1 ? 'ALL' : pageNumber}\n`);
  const roms = await client.fetchRoms(consoleName, pageNumber);
  
  console.log(`\n✅ Found ${roms.length} ROMs total\n`);
  
  if (roms.length > 0) {
    // Show first 5 ROMs with IDs
    console.log('First 5 ROMs (with IDs):');
    roms.slice(0, 5).forEach((rom, i) => {
      console.log(`  ${i + 1}. [ID: ${rom.id}] ${rom.title}`);
    });

    // Fetch details for all ROMs
    console.log(`\n📋 Fetching details for all ${roms.length} ROMs...\n`);
    const romsWithDetails: RomInfo[] = [];
    
    for (let i = 0; i < roms.length; i++) {
      const rom = roms[i];
      if (!rom) continue;
      
      console.log(`  [${i + 1}/${roms.length}] Fetching: ${rom.title}`);
      const romDetails = await client.fetchRomDetails(rom.downloadUrl);
      
      if (romDetails) {
        // Preserve the id assigned when the ROM was listed
        romDetails.id = rom.id;
        romsWithDetails.push(romDetails);
      } else {
        // If details fetch fails, use basic info from listing
        romsWithDetails.push(rom);
      }
      
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n✅ Fetched details for ${romsWithDetails.length} ROMs`);

    // Download ROMs if --download flag is set
    if (shouldDownload) {
      const fs = require('fs');
      const path = require('path');
      const consoleDownloadDir = path.join('downloads', consoleName);
      
      // Create console-specific download directory
      if (!fs.existsSync(consoleDownloadDir)) {
        fs.mkdirSync(consoleDownloadDir, { recursive: true });
      }

      console.log(`\n📥 Downloading ${romsWithDetails.length} ROMs to ${consoleDownloadDir}...\n`);
      let downloadedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < romsWithDetails.length; i++) {
        const rom = romsWithDetails[i];
        if (!rom || !rom.redirectDownloadUrl) {
          console.log(`  [${i + 1}/${romsWithDetails.length}] ⚠️  Skipping ${rom?.title || 'Unknown'}: No download URL`);
          failedCount++;
          continue;
        }

        // Extract filename from URL or use title
        let filename = rom.fileName || '';
        if (!filename) {
          try {
            const urlPath = new URL(rom.redirectDownloadUrl).pathname;
            filename = path.basename(urlPath);
            filename = decodeURIComponent(filename);
          } catch (e) {
            filename = `${rom.title.replace(/[^a-z0-9]/gi, '_')}.zip`;
          }
        }

        const filePath = path.join(consoleDownloadDir, filename);

        // Check if file already exists
        if (fs.existsSync(filePath)) {
          console.log(`  [${i + 1}/${romsWithDetails.length}] ⏭️  ${rom.title} (already exists)`);
          skippedCount++;
          continue;
        }

        // Download the ROM
        console.log(`  [${i + 1}/${romsWithDetails.length}] 📥 ${rom.title}...`);
        const success = await client.downloadRom(rom);
        
        if (success) {
          downloadedCount++;
        } else {
          failedCount++;
        }
      }

      console.log(`\n✅ Download summary:`);
      console.log(`   Downloaded: ${downloadedCount}`);
      console.log(`   Skipped (exists): ${skippedCount}`);
      console.log(`   Failed: ${failedCount}`);
    }

    // Load existing JSON file if it exists
    console.log(`\n💾 Saving to ${outputFile}...`);
    const fs = require('fs');
    let existingData: any = {
      consoles: {}
    };
    
    if (fs.existsSync(outputFile)) {
      try {
        const fileContent = fs.readFileSync(outputFile, 'utf8');
        existingData = JSON.parse(fileContent);
        if (!existingData.consoles) existingData.consoles = {};
        const existingConsole = existingData.consoles[consoleName];
        if (existingConsole) {
          console.log(`✅ Found existing data for ${consoleName}: ${existingConsole.pages?.length || 0} page(s)`);
        }
      } catch (error) {
        console.log(`⚠️  Could not parse existing file, creating new data structure`);
      }
    } else {
      console.log(`ℹ️  No existing file found, creating new one`);
    }

    // Initialize console entry if not exists
    if (!existingData.consoles[consoleName]) {
      existingData.consoles[consoleName] = {
        pages: []
      };
    }

    const consoleData = existingData.consoles[consoleName];
    
    // If page is -1, we fetched all pages, so we treat this as multiple pages
    if (pageNumber === -1) {
      // Group ROMs back into pages (we don't know original page boundaries after deduplication)
      // So we'll store all as a single "all" entry
      const existingAllIndex = consoleData.pages.findIndex((p: any) => p.page === 'all');
      const pageEntry = {
        page: 'all',
        totalRoms: romsWithDetails.length,
        fetchedAt: new Date().toISOString(),
        roms: romsWithDetails
      };
      
      if (existingAllIndex >= 0) {
        console.log(`⚠️  Updating 'all pages' entry for ${consoleName}...`);
        consoleData.pages[existingAllIndex] = pageEntry;
      } else {
        console.log(`➕ Adding 'all pages' entry for ${consoleName}...`);
        consoleData.pages.push(pageEntry);
      }
    } else {
      // Single page fetch
      const existingPageIndex = consoleData.pages.findIndex((p: any) => p.page === pageNumber);
      const pageEntry = {
        page: pageNumber,
        totalRoms: romsWithDetails.length,
        fetchedAt: new Date().toISOString(),
        roms: romsWithDetails
      };
      
      if (existingPageIndex >= 0) {
        console.log(`⚠️  Page ${pageNumber} already exists for ${consoleName}, updating...`);
        consoleData.pages[existingPageIndex] = pageEntry;
      } else {
        console.log(`➕ Adding page ${pageNumber} for ${consoleName}...`);
        consoleData.pages.push(pageEntry);
      }
    }

    // Sort pages by page number (numeric pages first, then 'all')
    consoleData.pages.sort((a: any, b: any) => {
      if (a.page === 'all') return 1;
      if (b.page === 'all') return -1;
      return a.page - b.page;
    });
    
    // Update console metadata
    consoleData.totalPages = consoleData.pages.filter((p: any) => p.page !== 'all').length;
    consoleData.totalRoms = consoleData.pages.reduce((sum: number, p: any) => sum + p.totalRoms, 0);
    consoleData.lastUpdated = new Date().toISOString();

    // Update global metadata
    existingData.lastUpdated = new Date().toISOString();
    existingData.totalConsoles = Object.keys(existingData.consoles).length;

    // Save to JSON file
    fs.writeFileSync(outputFile, JSON.stringify(existingData, null, 2), 'utf8');
    console.log(`✅ Successfully saved to ${outputFile}`);
    console.log(`📊 ${consoleName}: ${consoleData.totalPages} page(s), ${consoleData.totalRoms} ROM(s)`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Client completed!');
  console.log('\n💡 Usage examples:');
  console.log('  npm run client -- --console=nintendo --page=1 --output=roms.json');
  console.log('  npm run client -- --console=nintendo --page=-1 --output=roms.json  # Fetch all pages');
  console.log('  npm run client -- --console=gameboy --page=1 --download --output=roms.json  # Download ROMs');
  console.log('  npm run client -- --console=playstation --page=1 --start-id=1000 --output=roms.json  # Start from ID 1000');
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
