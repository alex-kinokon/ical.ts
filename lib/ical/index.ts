/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

export { Binary } from './binary';
export { Component } from './component';
export { ComponentParser } from './component_parser';
export { design } from './design';
export { Duration } from './duration';
export { Event } from './event';
export * as helpers from './helpers';
export { parse } from './parse';
export { Period } from './period';
export { Property } from './property';
export { Recur } from './recur';
export { RecurExpansion } from './recur_expansion';
export { RecurIterator } from './recur_iterator';
export { stringify } from './stringify';
export { Time } from './time';
export { Timezone } from './timezone';
export { TimezoneService } from './timezone_service';
export { UtcOffset } from './utc_offset';
export { VCardTime } from './vcard_time';

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
