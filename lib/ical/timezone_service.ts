/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { Timezone } from './timezone';
import { Component } from './component';

let zones: Record<string, Timezone> = {};

function lazyZone(name: string): PropertyDescriptor {
  return {
    configurable: true,
    enumerable: true,
    get(this: any) {
      delete this[name];
      TimezoneService.reset();
      return this[name];
    }
  };
}

Object.defineProperties(zones, {
  Z: lazyZone('Z'),
  UTC: lazyZone('UTC'),
  GMT: lazyZone('GMT')
});

/**
 * @classdesc
 * Singleton class to contain timezones.  Right now it is all manual registry in
 * the future we may use this class to download timezone information or handle
 * loading pre-expanded timezones.
 *
 * @exports module:ICAL.TimezoneService
 * @alias ICAL.TimezoneService
 */
export const TimezoneService = {
  get count() {
    return Object.keys(zones).length;
  },

  reset() {
    zones = Object.create(null);
    const utc = Timezone.utcTimezone;

    zones.Z = utc;
    zones.UTC = utc;
    zones.GMT = utc;
  },

  /**
   * Checks if timezone id has been registered.
   *
   * @param tzid     Timezone identifier (e.g. America/Los_Angeles)
   * @return {Boolean}        False, when not present
   */
  has(tzid: string): boolean {
    return !!zones[tzid];
  },

  /**
   * Returns a timezone by its tzid if present.
   *
   * @param tzid Timezone identifier (e.g. America/Los_Angeles)
   * @return The timezone, or null if not found
   */
  get(tzid: string): Timezone | undefined {
    return zones[tzid];
  },

  /**
   * Registers a timezone object or component.
   *
   * @param name The name of the timezone. Defaults to the component's TZID if not
   *        passed.
   * @param timezone The initialized zone or vtimezone.
   */
  register(
    name: string | Component | undefined,
    timezone: Component | Timezone
  ) {
    if (name instanceof Component) {
      if (name.name === 'vtimezone') {
        timezone = new Timezone(name);
        name = timezone.tzid;
      }
    }

    if (timezone instanceof Timezone) {
      zones[name as string] = timezone;
    } else {
      throw new TypeError('timezone must be ICAL.Timezone or ICAL.Component');
    }
  },

  /**
   * Removes a timezone by its tzid from the list.
   *
   * @param {String} tzid     Timezone identifier (e.g. America/Los_Angeles)
   * @return {?ICAL.Timezone} The removed timezone, or null if not registered
   */
  remove(tzid: string): Timezone | null {
    return delete zones[tzid];
  }
};
