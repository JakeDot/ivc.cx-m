#!/usr/bin/env node
/**
 * install.js
 * 
 * A script to pull the latest git version of a repository and provide a 
 * registry for dynamically loading JS and TS modules.
 * 
 * Usage for TS files: run this script using `tsx` (e.g., `npx tsx install.js`) 
 * since native Node.js requires a loader to parse TypeScript dynamically.
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// --- Configuration ---
// Replace this with your actual exported repository URL or pass it as an argument
const DEFAULT_REPO_URL = 'https://github.com/JakeDot/ivc-example.git';
const TARGET_DIR = './ivc-program';

export function pullLatest(repoUrl = DEFAULT_REPO_URL, targetDir = TARGET_DIR) {
  console.log(`[Install] Checking for repository at ${targetDir}...`);
  
  if (existsSync(targetDir)) {
    console.log('[Install] Directory exists. Pulling latest changes...');
    execFileSync('git', ['pull'], { stdio: 'inherit', cwd: targetDir });
  } else {
    console.log(`[Install] Cloning repository ${repoUrl}...`);
    execFileSync('git', ['clone', repoUrl, targetDir], { stdio: 'inherit' });
  }
  
  console.log('[Install] Repository up to date.\n');
}

// --- Module Registry ---
const moduleRegistry = new Map();

/**
 * Dynamically registers and loads a JS or TS module.
 * @param {string} modulePath - Relative or absolute path to the module.
 */
export async function registerModule(modulePath) {
  const fullPath = resolve(modulePath);
  const fileUrl = pathToFileURL(fullPath).href;

  try {
    console.log(`[Registry] Loading module: ${fullPath}`);
    // Dynamic import loads the file into memory. 
    // If it's a .ts file, ensure you are running this script via `tsx`.
    const module = await import(fileUrl);
    moduleRegistry.set(fullPath, module);
    console.log(`[Registry] Successfully registered: ${fullPath}`);
    return module;
  } catch (error) {
    console.error(`[Registry] Failed to load module at ${fullPath}:`, error.message);
    throw error;
  }
}

/**
 * Returns all currently registered modules.
 */
export function getRegisteredModules() {
  return moduleRegistry;
}

// --- Execution ---
// Automatically run the install process if the script is executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const repoArg = process.argv[2] || DEFAULT_REPO_URL;
  pullLatest(repoArg, TARGET_DIR);
  
  console.log('[Install] Script execution complete.');
  console.log('[Install] To register modules, import this script into your Node runtime:');
  console.log('          import { registerModule } from "./install.js";');
}
