/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import Binary from './binary';
import Component from './component';
import ComponentParser from './component_parser';
import design from './design';
import Duration from './duration';
import Event from './event';
import * as helpers from './helpers';
import parse from './parse';
import Period from './period';
import Property from './property';
import Recur from './recur';
import RecurExpansion from './recur_expansion';
import RecurIterator from './recur_iterator';
import stringify from './stringify';
import Time from './time';
import Timezone from './timezone';
import TimezoneService from './timezone_service';
import UtcOffset from './utc_offset';
import VCardTime from './vcard_time';

/**
 * The main ICAL module. Provides access to everything else.
 *
 * @alias ICAL
 * @namespace ICAL
 * @property {ICAL.design} design
 * @property {ICAL.helpers} helpers
 */
export default {
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
  newLineChar: '\r\n',

  Binary,
  Component,
  ComponentParser,
  Duration,
  Event,
  Period,
  Property,
  Recur,
  RecurExpansion,
  RecurIterator,
  Time,
  Timezone,
  TimezoneService,
  UtcOffset,
  VCardTime,

  parse,
  stringify,

  design,
  helpers
};
