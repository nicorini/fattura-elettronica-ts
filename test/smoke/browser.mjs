// Smoke test of the published package in headless Chromium. The page has no file system: it
// imports check.mjs bundled with the tarball's code, and fetches the official example over HTTP.
// Run from the repository, where playwright-core is installed:
//
//   node test/smoke/browser.mjs <bundle of check.mjs> <official example>
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { chromium } from 'playwright-core';

const [bundle, example] = process.argv.slice(2);
if (bundle === undefined || example === undefined) {
  throw new Error('Usage: browser.mjs <bundle> <official example>');
}

// Every request of the page is answered here: no server, and nothing reaches the network.
const origin = 'http://smoke.test';
const files = {
  '/': { contentType: 'text/html', body: '<!doctype html><title>smoke</title>' },
  '/smoke.js': { contentType: 'text/javascript', body: readFileSync(bundle) },
  '/example.xml': { contentType: 'application/xml', body: readFileSync(example) },
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('**/*', (route) => {
    const file = files[new URL(route.request().url()).pathname];
    return file === undefined ? route.fulfill({ status: 404 }) : route.fulfill(file);
  });
  await page.goto(`${origin}/`);
  // Throws here if the checks throw in the page.
  const message = await page.evaluate(async () => {
    const { smoke } = await import('/smoke.js');
    const response = await fetch('/example.xml');
    return smoke(new Uint8Array(await response.arrayBuffer()));
  });
  console.log(`${browser.browserType().name()} ${browser.version()}: ${message}`);
} finally {
  await browser.close();
}
