# Romspedia Downloader

A TypeScript-based ROM scraper and downloader for [Romspedia.com](https://romspedia.com). This tool allows you to fetch ROM information from various gaming consoles with auto-incrementing IDs, page-based organization, and multi-console support in a single JSON file.

## Features

- 🎮 **Multi-Console Support** - Fetch ROMs from any console available on Romspedia
- 🔢 **Auto-Incrementing IDs** - Each ROM gets a unique, persistent ID
- 📄 **Page-Based Fetching** - Fetch individual pages or all pages at once
- 💾 **Single JSON Output** - All consoles organized in one file
- 🔄 **Smart Duplicate Detection** - Stops when pages repeat (fallback detection)
- 🎯 **Custom ID Ranges** - Set starting IDs for different consoles
- 💿 **Batch State Persistence** - IDs persist between runs

## Installation

```bash
# Clone the repository
git clone https://github.com/hoanghdtv/romspedia.git
cd romspedia

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Basic Commands

**Fetch a single page:**
```bash
npm run client -- --console=nintendo --page=1 --output=roms.json
```

**Fetch all pages of a console:**
```bash
npm run client -- --console=super-nintendo --page=-1 --output=roms.json
```

**Fetch with custom starting ID:**
```bash
npm run client -- --console=gameboy-advance --page=1 --start-id=1000 --output=roms.json
```

### Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--console=<name>` | Console name (use URL slug) | `--console=super-nintendo` |
| `--page=<number>` | Page number (use `-1` for all pages) | `--page=1` or `--page=-1` |
| `--output=<file>` | Output JSON file path | `--output=roms.json` |
| `--start-id=<number>` | Starting ID for ROM numbering | `--start-id=1000` |

### Console Names

Common console slugs (use these with `--console`):
- `nintendo` - Nintendo Entertainment System (NES)
- `super-nintendo` - Super Nintendo (SNES)
- `gameboy` - GameBoy
- `gameboy-advance` - GameBoy Advance (GBA)
- `gameboy-color` - GameBoy Color
- `nintendo-64` - Nintendo 64
- `nintendo-ds` - Nintendo DS
- `nintendo-3ds` - Nintendo 3DS
- `playstation` - PlayStation (PS1)
- `playstation-2` - PlayStation 2
- `playstation-portable` - PlayStation Portable (PSP)
- `sega-genesis` - Sega Genesis
- `sega-dreamcast` - Sega Dreamcast

Find more on [Romspedia ROMs page](https://romspedia.com/roms).

## Output Structure

The output JSON file has the following structure:

```json
{
  "consoles": {
    "super-nintendo": {
      "pages": [
        {
          "page": 1,
          "totalRoms": 50,
          "fetchedAt": "2026-01-15T12:34:56.789Z",
          "roms": [
            {
              "id": 1,
              "title": "Super Mario World",
              "platform": "super-nintendo",
              "url": "https://romspedia.com/roms/super-nintendo/super-mario-world-usa",
              "downloadUrl": "https://romspedia.com/roms/super-nintendo/super-mario-world-usa"
            }
          ]
        }
      ],
      "totalPages": 1,
      "totalRoms": 50,
      "lastUpdated": "2026-01-15T12:34:56.789Z"
    },
    "gameboy-advance": {
      "pages": [
        {
          "page": 1,
          "totalRoms": 49,
          "fetchedAt": "2026-01-15T12:45:00.000Z",
          "roms": [...]
        }
      ],
      "totalPages": 1,
      "totalRoms": 49,
      "lastUpdated": "2026-01-15T12:45:00.000Z"
    }
  },
  "lastUpdated": "2026-01-15T12:45:00.000Z",
  "totalConsoles": 2
}
```

## Advanced Usage

### Fetch Multiple Consoles with ID Ranges

```bash
# Nintendo: ID 1-999
npm run client -- --console=nintendo --page=-1 --start-id=1 --output=roms.json

# Super Nintendo: ID 1000-1999
npm run client -- --console=super-nintendo --page=-1 --start-id=1000 --output=roms.json

# GameBoy Advance: ID 2000-2999
npm run client -- --console=gameboy-advance --page=-1 --start-id=2000 --output=roms.json

# PlayStation: ID 3000-3999
npm run client -- --console=playstation --page=-1 --start-id=3000 --output=roms.json
```

### Page -1 Behavior

When using `--page=-1`, the scraper will:
1. Start from page 1
2. Continue fetching pages sequentially
3. Track all unique ROM URLs
4. Stop when a page contains no new ROMs (detects Romspedia's fallback to last page)
5. Log progress for each page: `Fetched page N: X rom(s), Y new — total so far: Z`

### ID Persistence

ROM IDs are persisted in `.romspedia_state.json`:
- IDs continue from where you left off between runs
- Use `--start-id` to override and start from a specific number
- Delete `.romspedia_state.json` to reset ID counter to 1

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run client` | Run the client with CLI arguments |
| `npm run test` | Run basic tests |
| `npm run test:page` | Run page-all mock test |
| `npm start` | Run the main index script |

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm run test
npm run test:page

# Build for production
npm run build
```

## File Structure

```
romspedia/
├── src/
│   ├── RomspediaDownloader.ts    # Core scraper logic
│   ├── client.ts                 # CLI client with main() function
│   ├── index.ts                  # Entry point
│   ├── test.ts                   # Basic tests
│   └── test_page_all.ts          # Page -1 behavior test
├── downloads/                     # Downloaded ROM files (if using download feature)
├── .romspedia_state.json         # Persistent ID state
├── roms.json                     # Output file (default)
├── package.json
├── tsconfig.json
└── README.md
```

## Examples

### Example 1: Complete SNES Collection
```bash
npm run client -- --console=super-nintendo --page=-1 --start-id=1 --output=snes_complete.json
```

### Example 2: First Page of Multiple Consoles
```bash
npm run client -- --console=nintendo --page=1 --start-id=1 --output=all_roms.json
npm run client -- --console=super-nintendo --page=1 --start-id=1000 --output=all_roms.json
npm run client -- --console=gameboy-advance --page=1 --start-id=2000 --output=all_roms.json
```

### Example 3: Update Existing Data
```bash
# First fetch
npm run client -- --console=nintendo --page=1 --output=roms.json

# Update page 1 or add page 2
npm run client -- --console=nintendo --page=2 --output=roms.json
```

## Features in Detail

### Duplicate Detection
- Tracks ROM URLs to avoid duplicates
- Stops fetching when a page returns no new ROMs
- Handles Romspedia's behavior of returning the last page when requesting beyond max

### Progress Logging
When fetching all pages (`--page=-1`), you'll see:
```
Fetched page 1: 50 rom(s), 50 new — total so far: 50
Fetched page 2: 50 rom(s), 48 new — total so far: 98
Fetched page 3: 45 rom(s), 0 new — total so far: 98
Page 3 returned no new ROMs (likely fallback to last page). Stopping.
```

### Batch State Saving
- ID state is saved only after a complete batch fetch
- Reduces file I/O operations
- Ensures consistency if the process is interrupted

## Troubleshooting

**Issue: No ROMs found**
- Verify the console slug is correct (check Romspedia URL)
- Check your internet connection
- The console page might have a different structure

**Issue: IDs not persisting**
- Check if `.romspedia_state.json` exists and is writable
- Use `--start-id` to manually set starting ID

**Issue: Fetch stops too early**
- This is the duplicate detection working correctly
- Romspedia returns the last page when you request beyond the max page

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This tool is for educational purposes only. Please respect Romspedia's terms of service and copyright laws. Only download ROMs for games you legally own.

## Author

hoanghdtv

## Links

- [Romspedia](https://romspedia.com/)
- [GitHub Repository](https://github.com/hoanghdtv/romspedia)
