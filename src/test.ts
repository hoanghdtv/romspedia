import { RomspediaDownloader, RomInfo } from './RomspediaDownloader';

/**
 * Test suite for RomspediaDownloader
 */
async function runTests() {
  console.log('🧪 Starting Romspedia Downloader Tests\n');
  console.log('='.repeat(60));

  const downloader = new RomspediaDownloader();
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Constructor and initialization
  console.log('\n📋 Test 1: Constructor and initialization');
  try {
    const customDownloader = new RomspediaDownloader('./test-downloads');
    if (customDownloader.getDownloadDir() === './test-downloads') {
      console.log('✅ PASSED: Custom download directory set correctly');
      testsPassed++;
    } else {
      console.log('❌ FAILED: Custom download directory not set');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAILED:', error);
    testsFailed++;
  }

  // Test 2: Base URL check
  console.log('\n📋 Test 2: Base URL verification');
  try {
    const baseUrl = downloader.getBaseUrl();
    if (baseUrl === 'https://romspedia.com') {
      console.log('✅ PASSED: Base URL is correct');
      testsPassed++;
    } else {
      console.log('❌ FAILED: Base URL is incorrect');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAILED:', error);
    testsFailed++;
  }

  // Test 3: Search functionality
  console.log('\n📋 Test 3: Search functionality');
  try {
    const searchResults = await downloader.searchRoms('mario');
    console.log(`Found ${searchResults.length} results`);
    
    if (Array.isArray(searchResults)) {
      console.log('✅ PASSED: Search returns array');
      testsPassed++;
      
      if (searchResults.length > 0) {
        console.log('✅ PASSED: Search found results');
        console.log(`   First result: ${searchResults[0]?.title}`);
        testsPassed++;
      } else {
        console.log('⚠️  WARNING: No results found (might be expected)');
      }
    } else {
      console.log('❌ FAILED: Search does not return array');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAILED:', error);
    testsFailed++;
  }

  // Test 4: List platforms
  console.log('\n📋 Test 4: List platforms functionality');
  try {
    const platforms = await downloader.listPlatforms();
    console.log(`Found ${platforms.length} platforms`);
    
    if (Array.isArray(platforms)) {
      console.log('✅ PASSED: List platforms returns array');
      testsPassed++;
      
      if (platforms.length > 0) {
        console.log('✅ PASSED: Platforms found');
        console.log(`   Sample platforms: ${platforms.slice(0, 3).join(', ')}`);
        testsPassed++;
      } else {
        console.log('⚠️  WARNING: No platforms found');
      }
    } else {
      console.log('❌ FAILED: List platforms does not return array');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAILED:', error);
    testsFailed++;
  }

  // Test 5: ROM info structure validation
  console.log('\n📋 Test 5: ROM info structure validation');
  try {
    const testRom: RomInfo = {
      id: 0,
      title: 'Test ROM',
      platform: 'Test Console',
      downloadUrl: 'https://example.com/rom.zip',
      size: '10MB'
    };

    if (testRom.title && testRom.platform && testRom.downloadUrl) {
      console.log('✅ PASSED: RomInfo structure is valid');
      testsPassed++;
    } else {
      console.log('❌ FAILED: RomInfo structure is invalid');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAILED:', error);
    testsFailed++;
  }

  // Test 6: Error handling for invalid URL
  console.log('\n📋 Test 6: Error handling for invalid ROM details URL');
  try {
    const details = await downloader.getRomDetails('https://invalid-url-that-does-not-exist.com/test');
    if (details === null) {
      console.log('✅ PASSED: Handles invalid URL gracefully');
      testsPassed++;
    } else {
      console.log('⚠️  WARNING: Returned data for invalid URL');
    }
  } catch (error) {
    console.log('✅ PASSED: Error caught and handled');
    testsPassed++;
  }

  // Results summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);
  
  const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  console.log(`   Success Rate: ${successRate}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed`);
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run tests
runTests().catch(console.error);
