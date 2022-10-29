/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

export { default as Binary } from './binary';
export { default as Component } from './component';
export { default as ComponentParser } from './component_parser';
export { default as design } from './design';
export { default as Duration } from './duration';
export { default as Event } from './event';
export * as helpers from './helpers';
export { default as parse } from './parse';
export { default as Period } from './period';
export { default as Property } from './property';
export { default as Recur } from './recur';
export { default as RecurExpansion } from './recur_expansion';
export { default as RecurIterator } from './recur_iterator';
export { default as stringify } from './stringify';
export { default as Time } from './time';
export { default as Timezone } from './timezone';
export { default as TimezoneService } from './timezone_service';
export { default as UtcOffset } from './utc_offset';
export { default as VCardTime } from './vcard_time';

/**
 * Global ICAL configuration.
 */
export const config = {
  /**
   * The number of characters before iCalendar line folding should occur
   * @type {Number}
   * @default 75
   */
  foldLength: 75,

  debug: false,

  /**
   * The character(s) to be used for a newline. The default value is provided by
   * rfc5545.
   * @type {String}
   * @default "\r\n"
   */
  newLineChar: '\r\n'
};
