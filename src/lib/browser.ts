import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { existsSync } from 'fs';

export async function launchBrowser() {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // Try to find local Chrome installation for development
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      '/usr/bin/google-chrome-stable', // Linux
      '/usr/bin/google-chrome', // Linux alternative
      '/usr/bin/chromium-browser', // Linux Chromium
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows 32-bit
    ];
    
    // Try to use puppeteer's bundled Chrome first in development
    let executablePath: string | undefined;
    
    try {
      // Try to get puppeteer's chrome path
      const puppeteerRegular = await import('puppeteer');
      executablePath = puppeteerRegular.default.executablePath();
    } catch {
      // Fallback to system Chrome paths
      executablePath = possiblePaths.find(path => {
        try {
          return existsSync(path);
        } catch {
          return false;
        }
      });
    }

    return await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection'
      ]
    });
  }

  // Production: use @sparticuz/chromium for serverless
  return await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
} 