/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { isStrictlyNaN, trunc } from './helpers';

const DURATION_LETTERS = /([PDWHMTS]{1,1})/;
const DATA_PROPS_TO_COPY = [
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
  'isNegative'
];

interface DurationData {
  /** Duration in weeks */
  weeks: number;
  /** Duration in days */
  days: number;
  /** Duration in hours */
  hours: number;
  /** Duration in minutes */
  minutes: number;
  /** Duration in seconds */
  seconds: number;
  /** If true, the duration is negative */
  isNegative: boolean;
}

/**
 * This class represents the "duration" value type, with various calculation
 * and manipulation methods.
 *
 * @class
 * @alias ICAL.Duration
 */
export class Duration {
  declare wrappedJSObject: Duration;

  /**
   * Returns a new ICAL.Duration instance from the passed seconds value.
   *
   * @param {Number} aSeconds       The seconds to create the instance from
   * @return {Duration}        The newly created duration instance
   */
  static fromSeconds(aSeconds: number): Duration {
    return new Duration().fromSeconds(aSeconds);
  }

  /**
   * Checks if the given string is an iCalendar duration value.
   *
   * @param string The raw ical value
   * @return True, if the given value is of the duration ical type
   */
  static isValueString(string: string): boolean {
    return string[0] === 'P' || string[1] === 'P';
  }

  /**
   * Creates a new {@link Duration} instance from the passed string.
   *
   * @param {String} aStr       The string to parse
   * @return {Duration}    The created duration instance
   */
  static fromString(aStr: string): Duration {
    let pos = 0;
    const dict: DurationData = Object.create(null);
    let chunks = 0;

    while ((pos = aStr.search(DURATION_LETTERS)) !== -1) {
      const type = aStr[pos];
      const numeric = aStr.slice(0, Math.max(0, pos));
      aStr = aStr.slice(pos + 1);

      chunks += parseDurationChunk(type, numeric, dict);
    }

    if (chunks < 2) {
      // There must be at least a chunk with "P" and some unit chunk
      throw new Error(
        `invalid duration value: Not enough duration components in "${aStr}"`
      );
    }

    return new Duration(dict);
  }

  /**
   * Creates a new ICAL.Duration instance from the given data object.
   *
   * @param aData An object with members of the duration
   * @return The created duration instance
   */
  static fromData(aData: DurationData): Duration {
    return new Duration(aData);
  }

  /**
   * Creates a new ICAL.Duration instance.
   *
   * @param data An object with members of the duration
   */
  constructor(data?: DurationData) {
    this.wrappedJSObject = this;
    this.fromData(data);
  }

  /**
   * The weeks in this duration
   */
  weeks = 0;

  /**
   * The days in this duration
   */
  days = 0;

  /**
   * The days in this duration
   */
  hours = 0;

  /**
   * The minutes in this duration
   */
  minutes = 0;

  /**
   * The seconds in this duration
   */
  seconds = 0;

  /**
   * The seconds in this duration
   */
  isNegative = false;

  /**
   * The class identifier.
   */
  readonly icalclass: string = 'icalduration';

  /**
   * The type name, to be used in the jCal object.
   */
  icaltype = 'duration';

  /**
   * Returns a clone of the duration object.
   *
   * @return The cloned object
   */
  clone(): Duration {
    return Duration.fromData(this);
  }

  /**
   * The duration value expressed as a number of seconds.
   *
   * @return The duration value in seconds
   */
  toSeconds(): number {
    const seconds =
      this.seconds +
      60 * this.minutes +
      3600 * this.hours +
      86400 * this.days +
      7 * 86400 * this.weeks;
    return this.isNegative ? -seconds : seconds;
  }

  /**
   * Reads the passed seconds value into this duration object. Afterwards,
   * members like {@link Duration#days days} and {@link Duration#weeks weeks} will be set up
   * accordingly.
   *
   * @param {Number} aSeconds     The duration value in seconds
   * @return {Duration}      Returns this instance
   */
  fromSeconds(aSeconds: number): Duration {
    let secs = Math.abs(aSeconds);

    this.isNegative = aSeconds < 0;
    this.days = trunc(secs / 86400);

    // If we have a flat number of weeks, use them.
    if (this.days % 7 === 0) {
      this.weeks = this.days / 7;
      this.days = 0;
    } else {
      this.weeks = 0;
    }

    secs -= (this.days + 7 * this.weeks) * 86400;

    this.hours = trunc(secs / 3600);
    secs -= this.hours * 3600;

    this.minutes = trunc(secs / 60);
    secs -= this.minutes * 60;

    this.seconds = secs;
    return this;
  }

  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param aData An object with members of the duration
   */
  fromData(aData?: DurationData) {
    Object.assign(
      this,
      Object.fromEntries(
        DATA_PROPS_TO_COPY.map(prop => [
          prop,
          aData?.[prop as keyof DurationData] ?? 0
        ])
      )
    );
  }

  /**
   * Resets the duration instance to the default values, i.e. PT0S
   */
  reset() {
    this.isNegative = false;
    this.weeks = 0;
    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
  }

  /**
   * Compares the duration instance with another one.
   *
   * @param aOther The instance to compare with
   * @return -1, 0 or 1 for less/equal/greater
   */
  compare(aOther: Duration): number {
    const thisSeconds = this.toSeconds();
    const otherSeconds = aOther.toSeconds();
    return +(thisSeconds > otherSeconds) - +(thisSeconds < otherSeconds);
  }

  /**
   * Normalizes the duration instance. For example, a duration with a value
   * of 61 seconds will be normalized to 1 minute and 1 second.
   */
  normalize() {
    this.fromSeconds(this.toSeconds());
  }

  /**
   * The string representation of this duration.
   */
  toString(): string {
    if (this.toSeconds() === 0) {
      return 'PT0S';
    } else {
      let str = '';
      if (this.isNegative) str += '-';
      str += 'P';
      if (this.weeks) str += this.weeks + 'W';
      if (this.days) str += this.days + 'D';

      if (this.hours || this.minutes || this.seconds) {
        str += 'T';
        if (this.hours) str += this.hours + 'H';
        if (this.minutes) str += this.minutes + 'M';
        if (this.seconds) str += this.seconds + 'S';
      }
      return str;
    }
  }

  /**
   * The iCalendar string representation of this duration.
   */
  toICALString(): string {
    return this.toString();
  }
}

/**
 * Internal helper function to handle a chunk of a duration.
 *
 * @private
 * @param letter type of duration chunk
 * @param number numeric value or -/+
 * @param object target to assign values to
 */
function parseDurationChunk(
  letter: string,
  number: string | number,
  object: DurationData
) {
  let type: keyof DurationData | undefined;
  switch (letter) {
    case 'P':
      if (number && number === '-') {
        object.isNegative = true;
      } else {
        object.isNegative = false;
      }
      // period
      break;
    case 'D':
      type = 'days';
      break;
    case 'W':
      type = 'weeks';
      break;
    case 'H':
      type = 'hours';
      break;
    case 'M':
      type = 'minutes';
      break;
    case 'S':
      type = 'seconds';
      break;
    default:
      // Not a valid chunk
      return 0;
  }

  if (type) {
    if (!number && number !== 0) {
      throw new Error(
        'invalid duration value: Missing number before "' + letter + '"'
      );
    }
    const num = parseInt(number as any, 10);
    if (isStrictlyNaN(num)) {
      throw new Error(
        `invalid duration value: Invalid number "${number}" before "${letter}"`
      );
    }
    (object as any)[type] = num;
  }

  return 1;
}
