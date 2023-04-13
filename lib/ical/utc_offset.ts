/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { pad2, strictParseInt, trunc } from './helpers';
import { design } from './design';

interface UtcOffsetData {
  /** The hours for the utc offset */
  hours?: number;
  /** The minutes in the utc offset */
  minutes?: number;
  /** The factor for the utc-offset, either -1 or 1 */
  factor?: -1 | 1;
}

/**
 * This class represents the "utc-offset" value type, with various calculation and manipulation
 * methods.
 */
export class UtcOffset {
  /**
   * Creates a new {@link ICAL.UtcOffset} instance from the passed string.
   *
   * @param aString The string to parse
   * @return        The created utc-offset instance
   */
  static fromString(aString: string): UtcOffset {
    // -05:00
    return new UtcOffset({
      // TODO: support seconds per rfc5545 ?
      factor: aString[0] === '+' ? 1 : -1,
      hours: strictParseInt(aString.slice(1, 3)),
      minutes: strictParseInt(aString.slice(4, 6))
    });
  }

  /**
   * Creates a new {@link ICAL.UtcOffset} instance from the passed seconds
   * value.
   *
   * @param aSeconds The number of seconds to convert
   */
  static fromSeconds(aSeconds: number): UtcOffset {
    const instance = new UtcOffset();
    instance.fromSeconds(aSeconds);
    return instance;
  }

  /**
   * Creates a new ICAL.UtcOffset instance.
   *
   * @param aData An object with members of the utc offset
   */
  constructor(aData?: UtcOffsetData) {
    this.fromData(aData);
  }

  /**
   * The hours in the utc-offset
   */
  hours = 0;

  /**
   * The minutes in the utc-offset
   */
  minutes = 0;

  /**
   * The sign of the utc offset, 1 for positive offset, -1 for negative
   * offsets.
   */
  factor = 1;

  /**
   * The type name, to be used in the jCal object.
   */
  readonly icaltype = 'utc-offset';

  /**
   * Returns a clone of the utc offset object.
   *
   * @return The cloned object
   */
  clone(): UtcOffset {
    return UtcOffset.fromSeconds(this.toSeconds());
  }

  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param aData An object with members of the utc offset
   */
  fromData(aData?: UtcOffsetData) {
    if (aData) {
      Object.assign(this, aData);
    }
    this._normalize();
  }

  /**
   * Sets up the current instance from the given seconds value. The seconds
   * value is truncated to the minute. Offsets are wrapped when the world
   * ends, the hour after UTC+14:00 is UTC-12:00.
   *
   * @param aSeconds         The seconds to convert into an offset
   */
  fromSeconds(aSeconds: number) {
    let secs = Math.abs(aSeconds);

    this.factor = aSeconds < 0 ? -1 : 1;
    this.hours = trunc(secs / 3600);

    secs -= this.hours * 3600;
    this.minutes = trunc(secs / 60);
    return this;
  }

  /**
   * Convert the current offset to a value in seconds
   *
   * @return The offset in seconds
   */
  toSeconds(): number {
    return this.factor * (60 * this.minutes + 3600 * this.hours);
  }

  /**
   * Compare this utc offset with another one.
   *
   * @param other The other offset to compare with
   * @return      -1, 0 or 1 for less/equal/greater
   */
  compare(other: UtcOffset): number {
    const a = this.toSeconds();
    const b = other.toSeconds();
    return +(a > b) - +(b > a);
  }

  _normalize() {
    // Range: 97200 seconds (with 1 hour in between)
    let secs = this.toSeconds();
    const { factor } = this;
    while (secs < -43200) {
      // = UTC-12:00
      secs += 97200;
    }
    while (secs > 50400) {
      // = UTC+14:00
      secs -= 97200;
    }

    this.fromSeconds(secs);

    // Avoid changing the factor when on zero seconds
    if (secs === 0) {
      this.factor = factor;
    }
  }

  /**
   * The iCalendar string representation of this utc-offset.
   */
  toICALString(): string {
    return design.icalendar.value['utc-offset'].toICAL(this.toString());
  }

  /**
   * The string representation of this utc-offset.
   */
  toString(): string {
    return (
      (this.factor === 1 ? '+' : '-') +
      pad2(this.hours) +
      ':' +
      pad2(this.minutes)
    );
  }
}
