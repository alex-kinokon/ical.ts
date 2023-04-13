/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { URL } from 'url';
import { readFile, readdir } from 'fs/promises';
import chai, { assert } from 'chai';
import Benchmark from 'benchmark';
import { suiteSetup, suiteTeardown, test } from 'mocha';
import * as ICAL from '../../lib/ical/';

/* eslint-enable no-var, no-redeclare*/

export { ICAL };

export function hasProperties(given, props, msg?) {
  msg = typeof msg === 'undefined' ? '' : msg + ': ';

  if (props instanceof Array) {
    props.forEach(prop => {
      assert.ok(
        prop in given,
        msg + 'given should have "' + prop + '" property'
      );
    });
  } else {
    for (const key in props) {
      assert.deepEqual(
        given[key],
        props[key],
        msg + ' property equality for (' + key + ') '
      );
    }
  }
}

chai.config.includeStack = true;

let _timezones;
/**
 * Registers a given timezone from samples with the timezone service.
 *
 * @param {String} zoneName like "America/Los_Angeles".
 */
export async function registerTimezone(zoneName: string) {
  function register(icsData) {
    const parsed = ICAL.parse(icsData);
    const calendar = new ICAL.Component(parsed);
    const vtimezone = calendar.getFirstSubcomponent('vtimezone');

    ICAL.TimezoneService.register(vtimezone);
  }

  if (!_timezones) {
    _timezones = Object.create(null);
  }

  const ics = _timezones[zoneName];

  if (ics) {
    return register(ics);
  } else {
    const path = 'samples/timezones/' + zoneName + '.ics';
    const data = await load(path);
    const zone = register(data);
    _timezones[zone] = data;
    return zone;
  }
}

/**
 * Registers a timezones for a given suite of tests. Uses suiteSetup to stage
 * and will use suiteTeardown to purge all timezones for clean tests..
 *
 * Please note that you should only call this once per suite, otherwise the
 * teardown function will reset the service while the parent suite will still
 * need them.
 */
export function useTimezones(...allZones: string[]) {
  suiteTeardown(() => {
    // to ensure clean tests
    ICAL.TimezoneService.reset();
  });

  suiteSetup(async () => {
    // By default, Z/UTC/GMT are already registered
    if (ICAL.TimezoneService.count > 3) {
      throw new Error('Can only register zones once');
    }

    await Promise.all(allZones.map(zone => registerTimezone(zone)));
  });
}

const $import = {
  meta: { url: require('url').pathToFileURL(__filename).href }
};

/**
 * @param {String} path relative to root (/) of project.
 */
export async function load(path: string) {
  const root = new URL('../../' + path, $import.meta.url).pathname;
  return readFile(root, 'utf8');
}

export async function loadSample(file: string) {
  return load('samples/' + file);
}

const icalPerf = {};
function perfTestDefine(this: Mocha.Context, scope, done) {
  this.timeout(0);
  const benchSuite = new Benchmark.Suite();
  const currentTest = this.test!;
  benchSuite.add('latest', scope.bind(this));

  Object.entries(icalPerf).forEach(([key, ical]) => {
    benchSuite.add(key, () => {
      scope.call(this);
    });
  });

  currentTest._benchCycle = [];

  benchSuite.on('cycle', event => {
    currentTest._benchCycle.push(String(event.target));
  });

  benchSuite.on('complete', function (event) {
    currentTest._benchFastest = this.filter('fastest').map('name');
    done(event.target.error);
  });

  benchSuite.run();
}

export function perfTest(name: string, scope: () => void) {
  test(name, function (done) {
    perfTestDefine.call(this, scope, done);
  });
}
perfTest.only = function (name: string, scope: () => void) {
  test.only(name, function (done) {
    perfTestDefine.call(this, scope, done);
  });
};
perfTest.skip = function (name: string, scope: () => void) {
  test.skip(name, function (done) {
    perfTestDefine.call(this, scope, done);
  });
};

export const mochaHooks = {
  async beforeAll() {
    const benchmark = new URL('../../tools/benchmark', $import.meta.url)
      .pathname;
    const files = await readdir(benchmark);
    for (const file of files) {
      const match = file.match(/^ical_(\w+).c?js$/);
      if (match) {
        try {
          const module = await import(`../../tools/benchmark/${file}`);
          if (module.default) {
            icalPerf[match[1]] = module.default;
          } else {
            console.error(
              `Error loading tools/benchmark/${file}, skipping for performance tests: Missing default export`
            );
          }
        } catch (e) {
          console.error(
            `Error loading tools/benchmark/${file}, skipping for performance tests: ${e}`
          );
        }
      }
    }
  }
};
