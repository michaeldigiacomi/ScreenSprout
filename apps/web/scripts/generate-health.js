// Build-time health info generator
// This script generates health.json with build metadata

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const health = {
  status: 'healthy',
  version: process.env.BUILD_VERSION || 'unknown',
  sha: process.env.BUILD_SHA || 'unknown',
  buildTime: process.env.BUILD_TIME || new Date().toISOString(),
  service: 'screen-sprout-web'
};

const outputPath = resolve(process.cwd(), 'public', 'health.json');
writeFileSync(outputPath, JSON.stringify(health, null, 2));

console.log('Health info generated:');
console.log(JSON.stringify(health, null, 2));
