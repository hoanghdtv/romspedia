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
