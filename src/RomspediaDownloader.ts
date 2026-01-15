import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import cliProgress from 'cli-progress';


export interface RelatedRom {
    title: string;
    imageUrl?: string;
    url: string;
}

export interface RomInfo {
  id: number;
  title: string;
  url?: string;
  fileName?: string;
  imageUrl?: string;
  platform: string;
  rating?: number;
  console?: string;
  category?: string;
  region?: string;
  releaseDate?: string;
  downloadCount?: number;
  downloadUrl: string;
  redirectDownloadUrl?: string;
  size?: string;
  relatedRoms?: RelatedRom[];
}

import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // ⚠️ disable SSL verification
});

export class RomspediaDownloader {
  private baseUrl = 'https://romspedia.com';
  private downloadDir = './downloads';
  // In-memory auto-increment ID for ROMs (increments for each ROM created/fetched)
  private nextId: number = 1;
  // State file to persist nextId between runs
  private stateFile = path.resolve('.romspedia_state.json');

  constructor(downloadDir?: string) {
    if (downloadDir) {
      this.downloadDir = downloadDir;
    }
    
    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
    // Try to load persisted state (nextId)
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, 'utf8');
        const data = JSON.parse(raw || '{}');
        if (data && typeof data.nextId === 'number' && data.nextId > 0) {
          this.nextId = data.nextId;
        }
      }
    } catch (err) {
      // Ignore errors and keep default nextId
    }
  }

  // Make saving public so callers can decide when to persist (batch save)
  saveState() {
    try {
      const data = { nextId: this.nextId };
      fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      // If saving fails, just ignore to avoid breaking flow
    }
  }

  /**
   * Set the starting ID for ROM numbering
   * @param startId - The starting ID number
   */
  setStartId(startId: number) {
    if (startId > 0) {
      this.nextId = startId;
    }
  }

  /**
   * Get ROMs by console name
   */
  async getRomsByConsole(consoleName: string, page: number = 1): Promise<RomInfo[]> {
    try {
      const pageUrl = page === 1 
        ? `${this.baseUrl}/roms/${consoleName}`
        : `${this.baseUrl}/roms/${consoleName}/page/${page}`;
      
      console.log(`🔍 Fetching ROMs from: ${pageUrl}`);
      const response = await axios.get(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
  const roms: RomInfo[] = [];

      // Parse ROM items from the page
      $('a[href*="/roms/"]').each((i, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const title = $link.text().trim();
        
        // Filter valid ROM links (not console pages or pagination)
        if (href && title && 
            !href.includes('/page/') && 
            href !== `/roms/${consoleName}`) {
          
          // Get the ROM detail URL
          const romUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          
          // Only add if it's a specific ROM page (contains console name and ROM slug)
          // Path format: /roms/console-name/rom-slug
          const pathParts = href.split('/').filter(p => p.length > 0);
          // pathParts should be: ['roms', 'console-name', 'rom-slug']
          if (pathParts.length >= 3 && pathParts[0] === 'roms' && pathParts[1] === consoleName) {
            roms.push({
              id: this.nextId++,
              title: title.replace(' ROM', '').trim(),
              platform: consoleName,
              url: romUrl,
              downloadUrl: romUrl
            });
          }
        }
      });

      // Remove duplicates based on downloadUrl
      // Remove duplicates based on downloadUrl and keep the first occurrence (with its id)
      const uniqueMap = new Map<string, RomInfo>();
      for (const rom of roms) {
        if (!uniqueMap.has(rom.downloadUrl)) {
          uniqueMap.set(rom.downloadUrl, rom);
        }
      }
      const uniqueRoms = Array.from(uniqueMap.values());

      console.log(`✅ Found ${uniqueRoms.length} ROMs on page ${page}`);
      return uniqueRoms;
    } catch (error) {
      console.error('❌ Error fetching ROMs by console:', error);
      return [];
    }
  }

  /**
   * Search for ROMs on Romspedia
   */
  async searchRoms(query: string): Promise<RomInfo[]> {
    try {
      console.log(`🔍 Searching for: ${query}...`);
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
  const roms: RomInfo[] = [];

      // Parse search results (adjust selectors based on actual site structure)
      $('.rom-item, .game-item, article').each((i, element) => {
        const $element = $(element);
        const title = $element.find('h2, h3, .title').text().trim();
        const platform = $element.find('.platform, .console').text().trim();
        const link = $element.find('a').attr('href');
        
        if (title && link) {
          roms.push({
            id: this.nextId++,
            title,
            platform: platform || 'Unknown',
            downloadUrl: link.startsWith('http') ? link : `${this.baseUrl}${link}`
          });
        }
      });

      console.log(`✅ Found ${roms.length} ROMs`);
      return roms;
    } catch (error) {
      console.error('❌ Error searching ROMs:', error);
      return [];
    }
  }

  /**
   * Get ROM details from a specific page
   */
  async getRomDetails(url: string): Promise<RomInfo | null> {
    try {
      console.log(`📋 Fetching ROM details from: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Get title from h1 or page heading
      const title = $('h1').first().text().replace(' ROM', '').replace(' Download', '').trim();
      
      // Get platform from URL or breadcrumb
      const urlParts = url.split('/');
      const platform = urlParts[urlParts.length - 2] || 'Unknown';
      
      // Get image URL
      let imageUrl = '';
      const imgElement = $('img[src*="roms"], img[alt*="ROM"], img[alt*="download"]').first();
      if (imgElement.length > 0) {
        const imgSrc = imgElement.attr('src');
        if (imgSrc) {
          imageUrl = imgSrc.startsWith('http') ? imgSrc : `${this.baseUrl}${imgSrc}`;
        }
      }
      
      // Get rating from data-rating attribute
      let rating = 0;
      const ratingElement = $('[data-rating]').first();
      if (ratingElement.length > 0) {
        const ratingValue = ratingElement.attr('data-rating');
        if (ratingValue) {
          rating = parseFloat(ratingValue);
        }
      }
      
      // Get console
      let consoleText = '';
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Console') && !text.includes('Console:')) {
          const match = text.match(/Console\s+([A-Za-z0-9\s]+)/);
          if (match && match[1]) {
            const parts = match[1].split(/\s{2,}|Category/);
            if (parts[0]) {
              consoleText = parts[0].trim();
            }
            return false;
          }
        }
      });
      
      // Get category
      let category = '';
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Category:')) {
          const match = text.match(/Category:\s*([^\n]+)/);
          if (match && match[1]) {
            category = match[1].trim();
            return false;
          }
        }
      });
      
      // Get region
      let region = '';
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Region:')) {
          const match = text.match(/Region:\s*([^\n]+)/);
          if (match && match[1]) {
            region = match[1].trim();
            return false;
          }
        }
      });
      
      // Get release date/year
      let releaseDate = '';
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Release Year:') || text.includes('Release Date:')) {
          const match = text.match(/Release\s+(?:Year|Date):\s*([^\n]+)/);
          if (match && match[1]) {
            releaseDate = match[1].trim();
            return false;
          }
        }
      });
      
      // Get download count
      let downloadCount = 0;
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Downloads:')) {
          const match = text.match(/Downloads:\s*(\d+)/);
          if (match && match[1]) {
            downloadCount = parseInt(match[1], 10);
            return false;
          }
        }
      });
      
      // Get file size
      let size = '';
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.match(/Size:\s*\d+(\.\d+)?\s*(MB|KB|GB)/i)) {
          const sizeMatch = text.match(/Size:\s*(\d+(\.\d+)?\s*(MB|KB|GB))/i);
          if (sizeMatch && sizeMatch[1]) {
            size = sizeMatch[1];
            return false;
          }
        }
      });
      
      // Get file name
      let fileName = '';
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('File Name:')) {
          const match = text.match(/File Name:\s*([^\n]+?)(?:\s+Size:|$)/i);
          if (match && match[1]) {
            fileName = match[1].trim();
            return false;
          }
        }
      });
      
      // Find download link
      let downloadLink = '';
      $('a').each((i, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        const text = $link.text().toLowerCase();
        
        if (href && (text.includes('download') || href.includes('download'))) {
          downloadLink = href;
          return false; // break
        }
      });

      if (!downloadLink) {
        console.log('⚠️  No download link found');
        return null;
      }
      
      // Create redirect download URL
      const redirectDownloadUrl = fileName 
        ? `https://downloads.romspedia.com/roms/${encodeURIComponent(fileName)}`
        : undefined;
      
      // Get related ROMs - simple approach: get all rom links after "Related" heading
      const relatedRoms: RelatedRom[] = [];
      const allRomLinks: any[] = [];
      
      // Collect all ROM links on the page with their text
      $('a[href*="/roms/"]').each((i, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        if (href && href !== url) {
          allRomLinks.push({ href, text, $link });
        }
      });
      
      // Find where "Related" heading appears in the HTML
      const htmlText = $.html();
      const relatedIndex = htmlText.toLowerCase().indexOf('related rom');
      
      if (relatedIndex > 0 && allRomLinks.length > 0) {
        // Get HTML after "Related" section
        const afterRelated = htmlText.substring(relatedIndex);
        
        // Find rom links that appear after "Related" heading
        for (const {href, text, $link} of allRomLinks) {
          // Check if this link appears in the "after related" section
          if (afterRelated.includes(href)) {
            // Skip pagination and console home links
            if (href.includes('/page/') || href === '/roms' || href.match(/\/roms\/[^\/]+$/)) {
              continue;
            }
            
            // Try to find image first - we need it for fallback title
            let $img = $link.find('img').first();
            if ($img.length === 0) {
              // Try parent container
              $img = $link.parent().find('img').first();
            }
            if ($img.length === 0) {
              // Try siblings
              $img = $link.siblings('img').first();
            }
            if ($img.length === 0) {
              // Try closest article/div container
              $img = $link.closest('article, div.rom-item, div.game-item').find('img').first();
            }
            
            let title = text;
            
            // If text is "View" or too short, try to get title from context
            if (!title || title.toLowerCase() === 'view' || title.length < 3) {
              // Try to find a heading near this link
              const $parent = $link.parent();
              const $heading = $parent.find('h3, h4, h5').first();
              if ($heading.length > 0) {
                title = $heading.text().trim();
              } else {
                // Try previous sibling heading
                const $prevHeading = $link.prevAll('h3, h4, h5').first();
                if ($prevHeading.length > 0) {
                  title = $prevHeading.text().trim();
                } else {
                  // Try closest container heading
                  const $containerHeading = $link.closest('article, div').find('h3, h4, h5').first();
                  if ($containerHeading.length > 0) {
                    title = $containerHeading.text().trim();
                  } else if ($img.length > 0 && $img.attr('alt')) {
                    // Use img alt as fallback
                    title = $img.attr('alt')!.trim();
                  }
                }
              }
            }
            
            if (title && title.toLowerCase() !== 'view' && title.length >= 3) {
              const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
              
              // Avoid duplicates
              if (!relatedRoms.find(r => r.url === fullUrl)) {
                // Get image URL - prioritize data-src/data-srcset for lazy loading
                let imageUrl: string | undefined;
                if ($img.length > 0) {
                  const dataSrc = $img.attr('data-src');
                  const dataSrcset = $img.attr('data-srcset');
                  const dataLazySrc = $img.attr('data-lazy-src');
                  const src = $img.attr('src');
                  
                  // Priority: data-src > data-srcset > data-lazy-src > src
                  const imgSrc = dataSrc || dataSrcset || dataLazySrc || src;
                  
                  if (imgSrc && !imgSrc.includes('spinner.gif') && !imgSrc.includes('loading.gif')) {
                    // If srcset, take first URL (before any space or comma)
                    const cleanSrc = imgSrc.split(/[\s,]/)[0];
                    imageUrl = cleanSrc.startsWith('http') ? cleanSrc : `https:${cleanSrc}`;
                  }
                }
                
                const romData = {
                  title: title.replace(/ ROM$/i, '').trim(),
                  url: fullUrl,
                  ...(imageUrl && { imageUrl })
                };
                
                relatedRoms.push(romData);
              }
            }
            
            // Limit to reasonable number
            if (relatedRoms.length >= 10) break;
          }
        }
      }

      const romDetail: RomInfo = {
        // Assign an id for standalone detail fetches. When details are fetched
        // after a list fetch, the client will preserve the original id from the list.
        id: this.nextId++,
        title: title || 'Unknown ROM',
        platform: platform,
        url: url,
        downloadUrl: downloadLink.startsWith('http') ? downloadLink : `${this.baseUrl}${downloadLink}`,
        ...(imageUrl && { imageUrl }),
        ...(rating > 0 && { rating }),
        ...(consoleText && { console: consoleText }),
        ...(category && { category }),
        ...(region && { region }),
        ...(releaseDate && { releaseDate }),
        ...(downloadCount > 0 && { downloadCount }),
        ...(size && { size }),
        ...(fileName && { fileName }),
        ...(redirectDownloadUrl && { redirectDownloadUrl }),
        ...(relatedRoms.length > 0 && { relatedRoms })
      };

      return romDetail;
    } catch (error) {
      console.error('❌ Error getting ROM details:', error);
      return null;
    }
  }

  /**
   * Download a ROM file
   */
  async downloadRom(romInfo: RomInfo): Promise<boolean> {
    try {
      if (!romInfo.redirectDownloadUrl) {
        console.error('❌ No download URL available');
        return false;
      }

      const response = await axios.get(romInfo.redirectDownloadUrl, {
        responseType: 'stream',
        httpsAgent: httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Get filename from ROM info or URL
      let filename = romInfo.fileName || '';
      if (!filename) {
        const urlPath = new URL(romInfo.redirectDownloadUrl).pathname;
        filename = path.basename(urlPath);
        filename = decodeURIComponent(filename);
      }
      
      if (!filename || filename === '/' || !filename.includes('.')) {
        filename = `${romInfo.title.replace(/[^a-z0-9]/gi, '_')}.zip`;
      }

      // Create platform-specific directory if needed
      const platformDir = path.join(this.downloadDir, romInfo.platform);
      if (!fs.existsSync(platformDir)) {
        fs.mkdirSync(platformDir, { recursive: true });
      }

      const filePath = path.join(platformDir, filename);
      const writer = fs.createWriteStream(filePath);

      // Progress bar
      const totalLength = response.headers['content-length'];
      let downloadedLength = 0;

      const progressBar = new cliProgress.SingleBar({
        format: 'Progress |{bar}| {percentage}% | {value}/{total} MB',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
      });

      if (totalLength) {
        const totalMB = parseInt(totalLength) / (1024 * 1024);
        progressBar.start(totalMB, 0);

        response.data.on('data', (chunk: Buffer) => {
          downloadedLength += chunk.length;
          const downloadedMB = downloadedLength / (1024 * 1024);
          progressBar.update(downloadedMB);
        });
      }

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          if (totalLength) progressBar.stop();
          resolve(true);
        });
        writer.on('error', (err) => {
          if (totalLength) progressBar.stop();
          console.error('   ❌ Download error:', err.message);
          reject(err);
        });
      });
    } catch (error: any) {
      console.error('   ❌ Error downloading ROM:', error.message || error);
      return false;
    }
  }

  /**
   * List available platforms/consoles
   */
  async listPlatforms(): Promise<string[]> {
    try {
      console.log('📱 Fetching available platforms...');
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const platforms: string[] = [];

      $('a[href*="console"], a[href*="platform"], .console-link, .platform-link').each((i, element) => {
        const platform = $(element).text().trim();
        if (platform && !platforms.includes(platform)) {
          platforms.push(platform);
        }
      });

      console.log(`✅ Found ${platforms.length} platforms`);
      return platforms;
    } catch (error) {
      console.error('❌ Error fetching platforms:', error);
      return [];
    }
  }

  /**
   * Get the download directory path
   */
  getDownloadDir(): string {
    return this.downloadDir;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
