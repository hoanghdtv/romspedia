import { RomspediaDownloader } from './RomspediaDownloader';

// Main execution
async function main() {
  const downloader = new RomspediaDownloader();

  console.log('🎮 Romspedia ROM Downloader\n');
  console.log('=' .repeat(50));

  // Example 1: Get ROMs by console
  const consoleName = 'nintendo'; // Nintendo Entertainment System (NES)
  console.log(`\n📋 Example 1: Getting ROMs from ${consoleName} console...\n`);
  
  const roms = await downloader.getRomsByConsole(consoleName, 1);
  
  if (roms.length > 0) {
    console.log(`\n✅ Found ${roms.length} ROMs. Showing first 10:\n`);
    roms.slice(0, 10).forEach((rom, i) => {
      console.log(`${i + 1}. ${rom.title}`);
      console.log(`   URL: ${rom.downloadUrl}\n`);
    });

    // Example 2: Get details of first ROM
    console.log('\n📋 Example 2: Getting ROM details...\n');
    const firstRom = roms[0];
    if (firstRom) {
      const romDetails = await downloader.getRomDetails(firstRom.downloadUrl);
      
      if (romDetails) {
        console.log('ROM Details:');
        console.log(`  Title: ${romDetails.title}`);
        console.log(`  Platform: ${romDetails.platform}`);
        if (romDetails.url) console.log(`  URL: ${romDetails.url}`);
        if (romDetails.imageUrl) console.log(`  Image URL: ${romDetails.imageUrl}`);
        if (romDetails.rating) console.log(`  Rating: ${romDetails.rating}/5 stars`);
        if (romDetails.console) console.log(`  Console: ${romDetails.console}`);
        if (romDetails.category) console.log(`  Category: ${romDetails.category}`);
        if (romDetails.region) console.log(`  Region: ${romDetails.region}`);
        if (romDetails.releaseDate) console.log(`  Release Date: ${romDetails.releaseDate}`);
        if (romDetails.downloadCount) console.log(`  Downloads: ${romDetails.downloadCount.toLocaleString()}`);
        console.log(`  Size: ${romDetails.size || 'Unknown'}`);
        if (romDetails.fileName) console.log(`  File Name: ${romDetails.fileName}`);
        console.log(`  Download URL: ${romDetails.downloadUrl}`);
        if (romDetails.redirectDownloadUrl) console.log(`  Redirect Download URL: ${romDetails.redirectDownloadUrl}`);
        
        if (romDetails.relatedRoms && romDetails.relatedRoms.length > 0) {
          console.log(`\n  Related ROMs (${romDetails.relatedRoms.length}):`);
          romDetails.relatedRoms.slice(0, 5).forEach((related, i) => {
            console.log(`    ${i + 1}. ${related.title}`);
            if (related.imageUrl) console.log(`       Image: ${related.imageUrl}`);
            console.log(`       URL: ${related.url}`);
          });
        }
        
        // Download the ROM
        console.log('\n\n📋 Example 3: Downloading ROM...\n');
        await downloader.downloadRom(romDetails);
      }
    }

    // Example 4: Get multiple pages
    console.log('\n\n📋 Example 4: Getting ROMs from page 2...\n');
    const romsPage2 = await downloader.getRomsByConsole(consoleName, 2);
    console.log(`✅ Found ${romsPage2.length} ROMs on page 2`);
  } else {
    console.log('❌ No ROMs found');
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Done! Check the examples above to use the downloader.');
  console.log('\n💡 Tips:');
  console.log('  - Change the consoleName variable to get ROMs from different consoles');
  console.log('  - Available console names: nintendo, playstation, gameboy-advance, etc.');
  console.log('  - Use page parameter to get more ROMs');
  console.log('  - Uncomment the download section to actually download ROMs');
  console.log('  - Downloads will be saved to the ./downloads folder');
  console.log('  - Make sure you have the legal right to download ROMs');
}

main().catch(console.error);