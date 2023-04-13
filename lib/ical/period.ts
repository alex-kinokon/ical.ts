/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { Time } from './time';
import { Duration } from './duration';
import type { Property } from './Property';

export interface PeriodData {
  /** The start of the period */
  start?: Time | null;
  /** The end of the period */
  end?: Time | null;
  /** The duration of the period */
  duration?: Duration;
}

/**
 * This class represents the "period" value type, with various calculation and manipulation methods.
 */
export class Period {
  wrappedJSObject: Period;

  /**
   * Creates a new {@link ICAL.Period} instance from the passed string.
   *
   * @param str The string to parse
   * @param prop The property this period will be on
   * @return The created period instance
   */
  static fromString(str: string, prop: Property): Period {
    const parts = str.split('/');

    if (parts.length !== 2) {
      throw new Error(
        'Invalid string value: "' + str + '" must contain a "/" char.'
      );
    }

    const options: PeriodData = {
      start: Time.fromDateTimeString(parts[0], prop)
    };

    const [, end] = parts;

    if (Duration.isValueString(end)) {
      options.duration = Duration.fromString(end);
    } else {
      options.end = Time.fromDateTimeString(end, prop);
    }

    return new Period(options);
  }

  /**
   * Creates a new {@link Period} instance from the given data object.
   * The passed data object cannot contain both and end date and a duration.
   *
   * @param aData An object with members of the period
   * @return The period instance
   */
  static fromData(aData: PeriodData): Period {
    return new Period(aData);
  }

  /**
   * Returns a new period instance from the given jCal data array. The first
   * member is always the start date string, the second member is either a
   * duration or end date string.
   *
   * @param aData The jCal data array
   * @param aProp The property this jCal data is on
   * @param aLenient If true, data value can be both date and date-time
   * @return The period instance
   */
  static fromJSON(
    aData: string | [string, string],
    aProp: Property | undefined,
    aLenient: boolean
  ): Period {
    function fromDateOrDateTimeString(aValue: string, dateProp?: Property) {
      if (aLenient) {
        return Time.fromString(aValue, dateProp);
      } else {
        return Time.fromDateTimeString(aValue, dateProp);
      }
    }

    if (Duration.isValueString(aData[1])) {
      return Period.fromData({
        start: fromDateOrDateTimeString(aData[0], aProp),
        duration: Duration.fromString(aData[1])
      });
    } else {
      return Period.fromData({
        start: fromDateOrDateTimeString(aData[0], aProp),
        end: fromDateOrDateTimeString(aData[1], aProp)
      });
    }
  }

  /**
   * Creates a new ICAL.Period instance. The passed data object cannot contain both and end date and
   * a duration.
   *
   * @param aData An object with members of the period
   */
  constructor(aData: PeriodData) {
    this.wrappedJSObject = this;

    if (aData && 'start' in aData) {
      if (aData.start && !(aData.start instanceof Time)) {
        throw new TypeError('.start must be an instance of ICAL.Time');
      }
      this.start = aData.start ?? undefined;
    }

    if (aData && aData.end && aData.duration) {
      throw new Error('cannot accept both end and duration');
    }

    if (aData && 'end' in aData) {
      if (aData.end && !(aData.end instanceof Time)) {
        throw new TypeError('.end must be an instance of ICAL.Time');
      }
      this.end = aData.end ?? undefined;
    }

    if (aData && 'duration' in aData) {
      if (aData.duration && !(aData.duration instanceof Duration)) {
        throw new TypeError('.duration must be an instance of ICAL.Duration');
      }
      this.duration = aData.duration;
    }
  }

  /**
   * The start of the period
   */
  start?: Time;

  /**
   * The end of the period
   */
  end?: Time;

  /**
   * The duration of the period
   */
  duration?: Duration;

  /**
   * The class identifier.
   */
  readonly icalclass = 'icalperiod';

  /**
   * The type name, to be used in the jCal object.
   */
  readonly icaltype = 'period';

  /**
   * Returns a clone of the duration object.
   *
   * @return The cloned object
   */
  clone(): Period {
    return Period.fromData({
      start: this.start ? this.start.clone() : null,
      end: this.end ? this.end.clone() : null,
      duration: this.duration ? this.duration.clone() : null
    });
  }

  /**
   * Calculates the duration of the period, either directly or by subtracting
   * start from end date.
   *
   * @return The calculated duration
   */
  getDuration(): Duration {
    if (this.duration) {
      return this.duration;
    } else {
      return this.end!.subtractDate(this.start!);
    }
  }

  /**
   * Calculates the end date of the period, either directly or by adding
   * duration to start date.
   *
   * @return The calculated end date
   */
  getEnd(): Time {
    if (this.end) {
      return this.end;
    } else {
      const end = this.start!.clone();
      end.addDuration(this.duration!);
      return end;
    }
  }

  /**
   * The string representation of this period.
   */
  toString(): string {
    return this.start + '/' + (this.end || this.duration);
  }

  /**
   * The jCal representation of this period type.
   */
  toJSON(): [string, string] {
    return [this.start!.toString(), (this.end || this.duration)!.toString()];
  }

  /**
   * The iCalendar string representation of this period.
   */
  toICALString(): string {
    return (
      this.start!.toICALString() +
      '/' +
      (this.end || this.duration)!.toICALString()
    );
  }
}
