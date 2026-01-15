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
  
  // Parse arguments: --console=<name> --page=<number> --output=<file>
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
    }
  });

  // Create a client instance
  const client = new RomspediaClient();

  console.log('🎮 Romspedia Client\n');
  console.log('='.repeat(50));
  console.log(`Console: ${consoleName}`);
  console.log(`Page: ${pageNumber}`);
  console.log(`Output: ${outputFile}`);
  console.log('='.repeat(50));

  // Fetch ROMs by console name and page
  console.log(`\n📋 Fetching ROMs: ${consoleName}, Page ${pageNumber}\n`);
  const roms = await client.fetchRoms(consoleName, pageNumber);
  
  console.log(`✅ Found ${roms.length} ROMs\n`);
  
  if (roms.length > 0) {
    // Show first 5 ROMs
    console.log('First 5 ROMs:');
    roms.slice(0, 5).forEach((rom, i) => {
      console.log(`  ${i + 1}. ${rom.title}`);
    });

    // Fetch details for all ROMs
    console.log(`\n\n📋 Fetching details for all ${roms.length} ROMs...\n`);
    const romsWithDetails: RomInfo[] = [];
    
    for (let i = 0; i < roms.length; i++) {
      const rom = roms[i];
      if (!rom) continue;
      
      console.log(`  [${i + 1}/${roms.length}] Fetching: ${rom.title}`);
      const romDetails = await client.fetchRomDetails(rom.downloadUrl);
      
      if (romDetails) {
        // Preserve the id assigned when the ROM was listed (if any)
        if ((rom as any).id) {
          romDetails.id = (rom as any).id;
        }
        romsWithDetails.push(romDetails);
      }
      
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n✅ Fetched details for ${romsWithDetails.length} ROMs`);

    // Load existing JSON file if it exists
    console.log(`\n💾 Checking for existing data in ${outputFile}...`);
    const fs = require('fs');
    let existingData: any = {
      console: consoleName,
      pages: []
    };
    
    if (fs.existsSync(outputFile)) {
      try {
        const fileContent = fs.readFileSync(outputFile, 'utf8');
        existingData = JSON.parse(fileContent);
        console.log(`✅ Found existing data with ${existingData.pages?.length || 0} page(s)`);
      } catch (error) {
        console.log(`⚠️  Could not parse existing file, creating new data structure`);
      }
    } else {
      console.log(`ℹ️  No existing file found, creating new one`);
    }

    // Check if this page already exists
    const existingPageIndex = existingData.pages?.findIndex((p: any) => p.page === pageNumber);
    
    if (existingPageIndex !== undefined && existingPageIndex >= 0) {
      console.log(`⚠️  Page ${pageNumber} already exists, updating...`);
      existingData.pages[existingPageIndex] = {
        page: pageNumber,
        totalRoms: romsWithDetails.length,
        fetchedAt: new Date().toISOString(),
        roms: romsWithDetails
      };
    } else {
      console.log(`➕ Adding page ${pageNumber} to data...`);
      if (!existingData.pages) {
        existingData.pages = [];
      }
      existingData.pages.push({
        page: pageNumber,
        totalRoms: romsWithDetails.length,
        fetchedAt: new Date().toISOString(),
        roms: romsWithDetails
      });
    }

    // Sort pages by page number
    existingData.pages.sort((a: any, b: any) => a.page - b.page);
    
    // Update metadata
    existingData.console = consoleName;
    existingData.totalPages = existingData.pages.length;
    existingData.totalRoms = existingData.pages.reduce((sum: number, p: any) => sum + p.totalRoms, 0);
    existingData.lastUpdated = new Date().toISOString();

    // Save to JSON file
    console.log(`\n💾 Saving to ${outputFile}...`);
    fs.writeFileSync(outputFile, JSON.stringify(existingData, null, 2), 'utf8');
    console.log(`✅ Successfully saved to ${outputFile}`);
    console.log(`📊 Total: ${existingData.totalPages} page(s), ${existingData.totalRoms} ROM(s)`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Client completed!');
  console.log('\n💡 Usage examples:');
  console.log('  npm run client -- --console=nintendo --page=1 --output=roms.json');
  console.log('  npm run client -- --console=playstation --page=2 --output=ps_roms.json');
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
