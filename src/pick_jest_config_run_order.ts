import * as globby from 'globby';
import * as Fs from 'fs';

import { CiStatsClient } from './ci-stats';

const ciStats = new CiStatsClient();

export async function pickJestConfigRunOrder() {
  let pkg;
  try {
    pkg = JSON.parse(Fs.readFileSync('package.json', 'utf8'));
  } catch (_) {
    const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
    throw new Error(`unable to read kibana's package.json file: ${error.message}`);
  }

  const configFiles = globby.sync(
    ['**/jest.config.js', '**/jest.integration.config.js', '!**/__fixtures__/**'],
    {
      cwd: process.cwd(),
      absolute: false,
    },
  );

  return await ciStats.pickJestConfigRunOrder(
    pkg.branch,
    configFiles.filter((p) => p.endsWith('jest.config.js')),
    configFiles.filter((p) => p.endsWith('jest.integration.config.js')),
  );
}
