import * as fs from 'fs';
import * as path from 'path';
import { RomspediaDownloader, RomInfo } from './RomspediaDownloader';

interface RomsData {
  consoles: {
    [consoleName: string]: {
      pages: Array<{
        page: string;
        totalRoms: number;
        fetchedAt: string;
        roms: RomInfo[];
      }>;
    };
  };
}

/**
 * Download ROMs for a specific console from roms.json
 * @param consoleName - Name of the console (e.g., 'nintendo', 'playstation')
 * @param downloadDir - Base directory to download ROMs (default: './downloads')
 */
export async function downloadRomsByConsole(
  consoleName: string,
  downloadDir: string = './downloads'
): Promise<void> {
  try {
    // Read roms.json
    const romsJsonPath = path.resolve('./roms.json');
    
    if (!fs.existsSync(romsJsonPath)) {
      console.error('❌ File roms.json không tồn tại!');
      return;
    }

    console.log(`📖 Đọc file roms.json...`);
    const romsData: RomsData = JSON.parse(fs.readFileSync(romsJsonPath, 'utf8'));

    // Check if console exists
    if (!romsData.consoles || !romsData.consoles[consoleName]) {
      console.error(`❌ Không tìm thấy console "${consoleName}" trong roms.json`);
      console.log(`📋 Danh sách console có sẵn: ${Object.keys(romsData.consoles || {}).join(', ')}`);
      return;
    }

    // Get all ROMs for this console
    const consoleData = romsData.consoles[consoleName];
    const allRoms: RomInfo[] = [];
    
    for (const pageData of consoleData.pages) {
      if (pageData.roms && Array.isArray(pageData.roms)) {
        allRoms.push(...pageData.roms);
      }
    }

    if (allRoms.length === 0) {
      console.log(`⚠️  Không có ROM nào cho console "${consoleName}"`);
      return;
    }

    console.log(`✅ Tìm thấy ${allRoms.length} ROMs cho console "${consoleName}"`);

    // Create console-specific directory
    const consoleDir = path.join(downloadDir, consoleName);
    if (!fs.existsSync(consoleDir)) {
      fs.mkdirSync(consoleDir, { recursive: true });
      console.log(`📁 Đã tạo thư mục: ${consoleDir}`);
    }

    // Initialize downloader
    const downloader = new RomspediaDownloader(downloadDir);

    // Download ROMs
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < allRoms.length; i++) {
      const rom = allRoms[i];
      if (!rom) continue;
      
      const romNumber = i + 1;
      
      console.log(`\n[${romNumber}/${allRoms.length}] 🎮 ${rom.title}`);

      // Check if ROM has download URL
      if (!rom.redirectDownloadUrl) {
        console.log(`   ⚠️  Không có link tải - bỏ qua`);
        skipped++;
        continue;
      }

      // Get filename
      let filename = rom.fileName || '';
      if (!filename) {
        try {
          const urlPath = new URL(rom.redirectDownloadUrl).pathname;
          filename = path.basename(urlPath);
          filename = decodeURIComponent(filename);
        } catch (error) {
          filename = `${rom.title.replace(/[^a-z0-9]/gi, '_')}.zip`;
        }
      }

      if (!filename || filename === '/' || !filename.includes('.')) {
        filename = `${rom.title.replace(/[^a-z0-9]/gi, '_')}.zip`;
      }

      // Check if file already exists
      const filePath = path.join(consoleDir, filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✓ File đã tồn tại (${formatBytes(stats.size)}) - bỏ qua`);
        skipped++;
        continue;
      }

      // Download ROM
      console.log(`   ⬇️  Đang tải: ${filename}`);
      if (rom.size) {
        console.log(`   📦 Dung lượng: ${rom.size}`);
      }

      const success = await downloader.downloadRom(rom);
      
      if (success) {
        console.log(`   ✅ Tải thành công!`);
        downloaded++;
      } else {
        console.log(`   ❌ Tải thất bại!`);
        failed++;
      }

      // Add small delay to avoid overwhelming the server
      await sleep(1000);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TỔNG KẾT:');
    console.log(`✅ Đã tải: ${downloaded}`);
    console.log(`⏭️  Đã bỏ qua (file tồn tại): ${skipped}`);
    console.log(`❌ Thất bại: ${failed}`);
    console.log(`📁 Thư mục lưu: ${consoleDir}`);
    console.log('='.repeat(50));

  } catch (error: any) {
    console.error('❌ Lỗi:', error.message || error);
  }
}

/**
 * Helper function to format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Helper function to sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Vui lòng cung cấp tên console!');
    console.log('📖 Cách sử dụng: ts-node src/downloadClient.ts <console-name> [download-dir]');
    console.log('📝 Ví dụ: ts-node src/downloadClient.ts nintendo');
    console.log('📝 Ví dụ: ts-node src/downloadClient.ts nintendo ./my-downloads');
    process.exit(1);
  }

  const consoleName = args[0]!;
  const downloadDir = args[1] || './downloads';

  console.log('🚀 ROM Download Client');
  console.log(`🎮 Console: ${consoleName}`);
  console.log(`📁 Thư mục tải: ${downloadDir}\n`);

  downloadRomsByConsole(consoleName, downloadDir)
    .then(() => {
      console.log('\n✅ Hoàn thành!');
    })
    .catch((error) => {
      console.error('❌ Lỗi:', error);
      process.exit(1);
    });
}
