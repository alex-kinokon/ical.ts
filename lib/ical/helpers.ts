/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { TimezoneService } from './timezone_service';
import type { Property } from './property';
import type { Component } from './component';
import { config } from './index';

/**
 * Helper functions used in various places within ical.js
 * @module ICAL.helpers
 */

/**
 * Compiles a list of all referenced TZIDs in all subcomponents and
 * removes any extra VTIMEZONE subcomponents. In addition, if any TZIDs
 * are referenced by a component, but a VTIMEZONE does not exist,
 * an attempt will be made to generate a VTIMEZONE using ICAL.TimezoneService.
 *
 * @param vcal     The top-level VCALENDAR component.
 * @return The ICAL.Component that was passed in.
 */
export function updateTimezones(vcal: Component): Component {
  let i: number;

  if (!vcal || vcal.name !== 'vcalendar') {
    // not a top-level vcalendar component
    return vcal;
  }

  // Store vtimezone subcomponents in an object reference by tzid.
  // Store properties from everything else in another array
  const allSubs = vcal.getAllSubcomponents();
  let properties: Property[] = [];
  const vtimezones: Record<string, Component> = Object.create(null);
  for (i = 0; i < allSubs.length; i++) {
    if (allSubs[i].name === 'vtimezone') {
      const tzid = allSubs[i].getFirstProperty('tzid')!.getFirstValue<string>();
      vtimezones[tzid] = allSubs[i];
    } else {
      properties = properties.concat(allSubs[i].getAllProperties());
    }
  }

  // create an object with one entry for each required tz
  const reqTzid: Record<string, boolean> = Object.create(null);
  for (i = 0; i < properties.length; i++) {
    const tzid = properties[i].getParameter<string>('tzid');
    if (tzid) {
      reqTzid[tzid] = true;
    }
  }

  // delete any vtimezones that are not on the reqTzid list.
  for (const [tzid, comp] of Object.entries(vtimezones)) {
    if (!reqTzid[tzid]) {
      vcal.removeSubcomponent(comp);
    }
  }

  // create any missing, but registered timezones
  for (const tzid of Object.keys(reqTzid)) {
    if (!vtimezones[tzid] && TimezoneService.has(tzid)) {
      vcal.addSubcomponent(TimezoneService.get(tzid)!.component!);
    }
  }

  return vcal;
}

/**
 * Parses a string value that is expected to be an integer, when the valid is
 * not an integer throws a decoration error.
 *
 * @param string Raw string input
 * @return Parsed integer
 */
export function strictParseInt(string: string): number {
  const result = parseInt(string, 10);

  if (Number.isNaN(result)) {
    throw new Error('Could not extract integer from "' + string + '"');
  }

  return result;
}

/**
 * Creates or returns a class instance of a given type with the initialization
 * data if the data is not already an instance of the given type.
 *
 * @example
 * var time = new ICAL.Time(...);
 * var result = ICAL.helpers.formatClassType(time, ICAL.Time);
 *
 * (result instanceof ICAL.Time)
 * // => true
 *
 * result = ICAL.helpers.formatClassType({}, ICAL.Time);
 * (result isntanceof ICAL.Time)
 * // => true
 *
 *
 * @param data       object initialization data
 * @param type       object type (like ICAL.Time)
 * @return An instance of the found type.
 */
export { formatClassType };

function formatClassType<
  Data,
  Class extends { new (arg: Data): InstanceType<Class> }
>(data: Data | InstanceType<Class>, type: Class): InstanceType<Class>;

function formatClassType<
  Data,
  Class extends { new (arg: Data): InstanceType<Class> }
>(
  data: Data | InstanceType<Class> | undefined,
  type: Class
): InstanceType<Class> | undefined;

function formatClassType<
  Data,
  Class extends { new (arg: Data): InstanceType<Class> }
>(data: Data | InstanceType<Class>, type: Class) {
  if (typeof data === 'undefined') {
    return undefined;
  }

  if (data instanceof type) {
    return data;
  }
  return new type(data as Data);
}

/**
 * Identical to indexOf but will only match values when they are not preceded
 * by a backslash character.
 *
 * @param buffer String to search
 * @param search Value to look for
 * @param pos    Start position
 * @return       The position, or -1 if not found
 */
export function unescapedIndexOf(
  buffer: string,
  search: string,
  pos?: number
): number {
  while ((pos = buffer.indexOf(search, pos)) !== -1) {
    if (pos > 0 && buffer[pos - 1] === '\\') {
      pos += 1;
    } else {
      return pos;
    }
  }
  return -1;
}

/**
 * Find the index for insertion using binary search.
 *
 * @param list    The list to search
 * @param seekVal The value to insert
 * @param cmpFunc The comparison func, that can compare two seekVals
 * @return The insert position
 */
export function binsearchInsert<T, T1 = T>(
  list: T[],
  seekVal: T1,
  cmpFunc: (a: T1, b: T) => number
): number {
  if (!list.length) return 0;

  let low = 0;
  let high = list.length - 1;
  let mid: number;
  let cmpVal: number;

  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpVal = cmpFunc(seekVal, list[mid]);

    if (cmpVal < 0) high = mid - 1;
    else if (cmpVal > 0) low = mid + 1;
    else break;
  }

  if (cmpVal! < 0) return mid!; // insertion is displacing, so use mid outright.
  else if (cmpVal! > 0) return mid! + 1;
  else return mid!;
}

export function shallowClone<T>(obj: T): T {
  if (!obj || typeof obj != 'object') {
    return obj;
  } else if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  } else if ('clone' in obj && typeof obj.clone == 'function') {
    return obj.clone();
  } else if (Array.isArray(obj)) {
    return obj.slice() as T;
  } else {
    return { ...obj };
  }
}

/**
 * Performs iCalendar line folding. A line ending character is inserted and
 * the next line begins with a whitespace.
 *
 * @example
 * SUMMARY:This line will be fold
 *  ed right in the middle of a word.
 *
 * @param aLine The line to fold
 * @return The folded line
 */
export function foldline(aLine: string): string {
  let result = '';
  let line = aLine || '';
  let pos = 0;
  let line_length = 0;
  // pos counts position in line for the UTF-16 presentation
  // line_length counts the bytes for the UTF-8 presentation
  while (line.length) {
    const cp = line.codePointAt(pos)!;
    if (cp < 128) ++line_length;
    else if (cp < 2048) line_length += 2; // needs 2 UTF-8 bytes
    else if (cp < 65536) line_length += 3;
    else line_length += 4; // cp is less than 1114112
    if (line_length < config.foldLength + 1) {
      pos += cp > 65535 ? 2 : 1;
    } else {
      result += config.newLineChar + ' ' + line.slice(0, Math.max(0, pos));
      line = line.slice(Math.max(0, pos));
      pos = line_length = 0;
    }
  }
  return result.slice(config.newLineChar.length + 1);
}

/**
 * Pads the given string or number with zeros so it will have at least two
 * characters.
 *
 * @param data    The string or number to pad
 * @return The number padded as a string
 */
export function pad2(data: string | number): string {
  if (typeof data !== 'string') {
    // handle fractions.
    if (typeof data === 'number') {
      data = parseInt(String(data));
    }
    data = String(data);
  }

  const len = data.length;

  switch (len) {
    case 0:
      return '00';
    case 1:
      return '0' + data;
    default:
      return data;
  }
}

/**
 * Truncates the given number, correctly handling negative numbers.
 *
 * @param number The number to truncate
 * @return The truncated number
 */
export function trunc(number: number): number {
  return number < 0 ? Math.ceil(number) : Math.floor(number);
}
