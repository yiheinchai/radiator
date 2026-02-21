import type { CaptureConfig } from '@radiator/common';
import { DEFAULT_CAPTURE_CONFIG } from '@radiator/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Load Radiator configuration from multiple sources (in priority order):
 * 1. Environment variables
 * 2. .radiator/config file
 * 3. Default values
 */
export function loadConfig(): CaptureConfig {
  const config = { ...DEFAULT_CAPTURE_CONFIG };

  // Try to load from .radiator/config
  const configPath = join(process.cwd(), '.radiator', 'config');
  if (existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      Object.assign(config, fileConfig);
    } catch {
      // Ignore invalid config file
    }
  }

  // Override with environment variables
  if (process.env.RADIATOR_SERVER_URL) {
    config.serverUrl = process.env.RADIATOR_SERVER_URL;
  }
  if (process.env.RADIATOR_API_KEY) {
    config.apiKey = process.env.RADIATOR_API_KEY;
  }
  if (process.env.RADIATOR_MODE) {
    config.mode = process.env.RADIATOR_MODE as CaptureConfig['mode'];
  }
  if (process.env.RADIATOR_CODEBASE_ID) {
    config.codebaseId = process.env.RADIATOR_CODEBASE_ID;
  }
  if (process.env.RADIATOR_DIR) {
    config.radiatorDir = process.env.RADIATOR_DIR;
  }

  return config;
}
