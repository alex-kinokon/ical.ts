/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

/* eslint-env node */

import fs from 'fs/promises';
import fsc from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import yauzl from 'yauzl-promise';
import fetch from 'node-fetch';
import { Octokit } from '@octokit/core';
import { name } from '../package.json';

const octokit = new Octokit();

async function get_latest_release(outFile) {
  let response = await octokit.request(
    'GET /repos/{owner}/{repo}/releases/latest',
    {
      owner: 'mozilla-comm',
      repo: 'ical.js'
    }
  );

  const release = response.data.name;

  const icaljsAsset = response.data.assets.find(
    asset => asset.name === 'ical.js'
  );
  if (!icaljsAsset) {
    console.error('ical.js asset missing from ' + release);
  }
  response = await fetch(icaljsAsset.browser_download_url);

  const icaljs = await response.text();

  await fs.writeFile(outFile, icaljs);
  console.log('Latest release written to ' + outFile);
}

async function get_latest_main(outFile) {
  let response = await octokit.request(
    'GET /repos/{owner}/{repo}/actions/runs',
    {
      workflow_id: 'ci.yml',
      branch: 'es6',
      // branch: "main",
      status: 'success',
      // exclude_pull_requests: true,
      // event: "push",
      owner: 'mozilla-comm',
      repo: 'ical.js'
    }
  );

  const workflows = response.data.workflow_runs;

  workflows.sort((a, b) => {
    const datea = new Date(a);
    const dateb = new Date(b);

    return (datea < dateb) - (dateb < datea);
  });

  const archive_download_url = `https://nightly.link/mozilla-comm/ical.js/actions/runs/${workflows[0].id}/distribution.zip`;
  console.log(archive_download_url);
  response = await fetch(archive_download_url);
  if (!response.ok) {
    throw new Error(response.status);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const archive = await yauzl.fromBuffer(buffer);

  let entry;
  do {
    entry = await archive.readEntry();
  } while (entry && entry.fileName === 'ical.js');

  if (!entry) {
    throw new Error('ical.js not found in distribution');
  }

  const stream = await entry.openReadStream();
  const writeStream = fsc.createWriteStream(outFile);

  await pipeline(stream, writeStream);

  console.log('Latest main written to ' + outFile);
}

async function performance_downloader() {
  await Promise.allSettled([
    get_latest_main('./tools/benchmark/ical_main.cjs'),
    get_latest_release('./tools/benchmark/ical_release.js')
  ]);
}

async function generateZonesFile(tzdbDir) {
  async function processZone(zoneFile) {
    const contents = await fs.readFile(zoneFile, 'utf-8');
    const lines = contents.split('\r\n');
    const vtimezone = lines
      .slice(
        lines.indexOf('BEGIN:VTIMEZONE') + 1,
        lines.indexOf('END:VTIMEZONE')
      )
      .join('\r\n');
    return vtimezone;
  }

  const tzdbVersion = (
    await fs.readFile(path.join(tzdbDir, 'version'), 'utf-8')
  ).trim();

  const json = {
    version: tzdbVersion,
    tzdata: []
  };

  const contents = await fs.readFile(
    path.join(tzdbDir, 'zoneinfo', 'zones.tab'),
    'utf-8'
  );
  for (const line of contents.split('\n')) {
    const parts = line.split(' ');
    if (parts.length === 3 && parts[2].length) {
      json.tzdata.push(
        await processZone(path.join(tzdbDir, 'zoneinfo', parts[2] + '.ics'))
      );
    } else if (parts.length === 1 && parts[0].length) {
      json.tzdata.push(
        await processZone(path.join(tzdbDir, 'zoneinfo', parts[0] + '.ics'))
      );
    }
  }

  return JSON.stringify(json, null, 2);
}

async function get_tzdb_version() {
  const response = await fetch('https://www.iana.org/time-zones');
  const text = await response.text();

  const match = text.match(/version">([0-9a-z]*)<\/span>/);
  if (!match) {
    throw new Error('Could not detect latest timezone database version');
  }
  return match[1];
}

async function main() {
  switch (process.argv[2]) {
    case 'tzdb-version':
      console.log(await get_tzdb_version());
      break;
    case 'generate-zones':
      console.log(await generateZonesFile(process.argv[3]));
      break;
    case 'performance-downloader':
      await performance_downloader();
      break;
  }
}
main();
