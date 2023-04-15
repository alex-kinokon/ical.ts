/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { RecurIterator } from './recur_iterator';
import type { WeekDay } from './time';
import { Time } from './time';
import { design } from './design';
import { clone, strictParseInt } from './helpers';

const VALID_DAY_NAMES = /^(SU|MO|TU|WE|TH|FR|SA)$/;
const VALID_BYDAY_PART =
  /^([+-])?(5[0-3]|[1-4][0-9]|[1-9])?(SU|MO|TU|WE|TH|FR|SA)$/;
const DOW_MAP = {
  SU: Time.SUNDAY,
  MO: Time.MONDAY,
  TU: Time.TUESDAY,
  WE: Time.WEDNESDAY,
  TH: Time.THURSDAY,
  FR: Time.FRIDAY,
  SA: Time.SATURDAY
};

const REVERSE_DOW_MAP = Object.fromEntries(
  Object.entries(DOW_MAP).map(entry => entry.reverse())
);

/**
 * Possible frequency values for the FREQ part
 * (YEARLY, MONTHLY, WEEKLY, DAILY, HOURLY, MINUTELY, SECONDLY)
 */
export type FrequencyValue = (typeof ALLOWED_FREQ)[number];

const ALLOWED_FREQ = [
  'SECONDLY',
  'MINUTELY',
  'HOURLY',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY'
] as const;

/**
 * An object with members of the recurrence
 */
export interface RecurData {
  /** The frequency value */
  freq?: FrequencyValue;
  /** The INTERVAL value */
  interval?: number;
  /** The week start value */
  wkst?: WeekDay;
  /** The end of the recurrence set */
  until?: Time;
  /** The number of occurrences */
  count?: number;
  /** The seconds for the BYSECOND part */
  bysecond?: number[];
  /** The minutes for the BYMINUTE part */
  byminute?: number[];
  /** The hours for the BYHOUR part */
  byhour?: number[];
  /** The BYDAY values */
  byday?: string[];
  /** The days for the BYMONTHDAY part */
  bymonthday?: number[];
  /** The days for the BYYEARDAY part */
  byyearday?: number[];
  /** The weeks for the BYWEEKNO part */
  byweekno?: number[];
  /** The month for the BYMONTH part */
  bymonth?: number[];
  /** The positionals for the BYSETPOS part */
  bysetpos?: number[];
}

/**
 * This class represents the "recur" value type, used for example by RRULE. It provides methods to
 * calculate occurrences among others.
 *
 * @class
 * @alias ICAL.Recur
 */
export class Recur {
  wrappedJSObject: Recur;

  /**
   * Creates a new {@link ICAL.Recur} instance from the passed string.
   *
   * @param string The string to parse
   * @return The created recurrence instance
   */
  static fromString(string: string): Recur {
    const data = this._stringToData(string, false);
    return new Recur(data);
  }

  /**
   * Creates a new {@link ICAL.Recur} instance using members from the passed
   * data object.
   *
   * @param aData An object with members of the recurrence
   */
  static fromData(aData: RecurData) {
    return new Recur(aData);
  }

  /**
   * Converts a recurrence string to a data object, suitable for the fromData
   * method.
   *
   * @private
   * @param string The string to parse
   * @param fmtIcal If true, the string is considered to be an iCalendar string
   * @return The recurrence instance
   */
  static _stringToData(string: string, fmtIcal: boolean): RecurData {
    const dict: RecurData = Object.create(null);

    // split is slower in FF but fast enough.
    // v8 however this is faster then manual split?
    const values = string.split(';');
    const len = values.length;

    for (let i = 0; i < len; i++) {
      const parts = values[i].split('=');
      const ucname = parts[0].toUpperCase();
      const lcname = parts[0].toLowerCase();
      const name = fmtIcal ? lcname : ucname;
      const [, value] = parts;

      if (ucname in partDesign) {
        const partArr = value.split(',');
        let partArrIdx = 0;
        const partArrLen = partArr.length;

        for (; partArrIdx < partArrLen; partArrIdx++) {
          partArr[partArrIdx] = partDesign[ucname](partArr[partArrIdx]);
        }
        (dict as any)[name] = partArr.length === 1 ? partArr[0] : partArr;
      } else if (ucname in optionDesign) {
        optionDesign[ucname](value, dict, fmtIcal);
      } else {
        // Don't swallow unknown values. Just set them as they are.
        (dict as any)[lcname] = value;
      }
    }

    return dict;
  }

  /**
   * Convert an ical representation of a day (SU, MO, etc..)
   * into a numeric value of that day.
   *
   * @param string     The iCalendar day name
   * @param aWeekStart The week start weekday, defaults to SUNDAY
   * @return           Numeric value of given day
   */
  static icalDayToNumericDay(string: string, aWeekStart?: WeekDay): number {
    // XXX: this is here so we can deal
    //     with possibly invalid string values.
    const firstDow = aWeekStart || Time.SUNDAY;
    return ((DOW_MAP[string as keyof typeof DOW_MAP] - firstDow + 7) % 7) + 1;
  }

  /**
   * Convert a numeric day value into its ical representation (SU, MO, etc..)
   *
   * @param num        Numeric value of given day
   * @param aWeekStart The week start weekday, defaults to SUNDAY
   * @return           The ICAL day value, e.g SU,MO,...
   */
  static numericDayToIcalDay(num: number, aWeekStart?: WeekDay): string {
    // XXX: this is here so we can deal with possibly invalid number values.
    //     Also, this allows consistent mapping between day numbers and day
    //     names for external users.
    const firstDow = aWeekStart || Time.SUNDAY;
    let dow = num + firstDow - Time.SUNDAY;
    if (dow > 7) {
      dow -= 7;
    }
    return REVERSE_DOW_MAP[dow];
  }

  /**
   * Create a new instance of the Recur class.
   *
   * @param data An object with members of the recurrence
   */
  constructor(data: RecurData) {
    this.wrappedJSObject = this;
    this.parts = {};

    if (data && typeof data === 'object') {
      this.fromData(data);
    }
  }

  /**
   * An object holding the BY-parts of the recurrence rule
   */
  parts!: object;

  /**
   * The interval value for the recurrence rule.
   */
  interval = 1;

  /**
   * The week start day
   */
  wkst: WeekDay = Time.MONDAY;

  /**
   * The end of the recurrence
   */
  until?: Time;

  /**
   * The maximum number of occurrences
   */
  count?: number;

  /**
   * The frequency value.
   */
  freq?: FrequencyValue;

  /**
   * The class identifier.
   */
  readonly icalclass = 'icalrecur';

  /**
   * The type name, to be used in the jCal object.
   */
  readonly icaltype = 'recur';

  /**
   * Create a new iterator for this recurrence rule. The passed start date
   * must be the start date of the event, not the start of the range to
   * search in.
   *
   * @example
   * let recur = comp.getFirstPropertyValue('rrule');
   * let dtstart = comp.getFirstPropertyValue('dtstart');
   * let iter = recur.iterator(dtstart);
   * for (let next = iter.next(); next; next = iter.next()) {
   *   if (next.compare(rangeStart) < 0) {
   *     continue;
   *   }
   *   console.log(next.toString());
   * }
   *
   * @param aStart The item's start date
   * @return       The recurrence iterator
   */
  iterator(aStart: Time): RecurIterator {
    return new RecurIterator({
      rule: this,
      dtstart: aStart
    });
  }

  /**
   * Returns a clone of the recurrence object.
   *
   * @return The cloned object
   */
  clone(): Recur {
    return new Recur(this.toJSON());
  }

  /**
   * Checks if the current rule is finite, i.e. has a count or until part.
   *
   * @return True, if the rule is finite
   */
  isFinite(): boolean {
    return !!(this.count || this.until);
  }

  /**
   * Checks if the current rule has a count part, and not limited by an until
   * part.
   *
   * @return True, if the rule is by count
   */
  isByCount(): boolean {
    return !!(this.count && !this.until);
  }

  /**
   * Adds a component (part) to the recurrence rule. This is not a component
   * in the sense of {@link ICAL.Component}, but a part of the recurrence
   * rule, i.e. BYMONTH.
   *
   * @param aType  The name of the component part
   * @param aValue The component value
   */
  addComponent(aType: string, aValue: string | any[]) {
    const ucname = aType.toUpperCase();
    if (ucname in this.parts) {
      this.parts[ucname].push(aValue);
    } else {
      this.parts[ucname] = [aValue];
    }
  }

  /**
   * Sets the component value for the given by-part.
   *
   * @param aType        The component part name
   * @param aValues      The component values
   */
  setComponent(aType: string, aValues: any[]) {
    this.parts[aType.toUpperCase()] = aValues.slice();
  }

  /**
   * Gets (a copy) of the requested component value.
   *
   * @param aType The component part name
   * @return      The component part value
   */
  getComponent(aType: string): any[] {
    const ucname = aType.toUpperCase();
    return ucname in this.parts ? this.parts[ucname].slice() : [];
  }

  /**
   * Retrieves the next occurrence after the given recurrence id. See the
   * guide on {@tutorial terminology} for more details.
   *
   * NOTE: Currently, this method iterates all occurrences from the start
   * date. It should not be called in a loop for performance reasons. If you
   * would like to get more than one occurrence, you can iterate the
   * occurrences manually, see the example on the
   * {@link ICAL.Recur#iterator iterator} method.
   *
   * @param aStartTime    The start of the event series
   * @param aRecurrenceId The date of the last occurrence
   * @return              The next occurrence after
   */
  getNextOccurrence(aStartTime: Time, aRecurrenceId: Time): Time {
    const iter = this.iterator(aStartTime);
    let next;

    do {
      next = iter.next();
    } while (next && next.compare(aRecurrenceId) <= 0);

    if (next && aRecurrenceId.zone) {
      next.zone = aRecurrenceId.zone;
    }

    return next;
  }

  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param data An object with members of the recurrence
   */
  fromData(data: RecurData) {
    for (const key in data) {
      const uckey = key.toUpperCase();

      if (uckey in partDesign) {
        if (Array.isArray(data[key])) {
          this.parts[uckey] = data[key];
        } else {
          this.parts[uckey] = [data[key]];
        }
      } else {
        this[key] = data[key];
      }
    }

    if (this.interval && typeof this.interval != 'number') {
      optionDesign.INTERVAL(this.interval, this);
    }

    if (this.wkst && typeof this.wkst !== 'number') {
      this.wkst = Recur.icalDayToNumericDay(this.wkst);
    }

    if (this.until && !(this.until instanceof Time)) {
      this.until = Time.fromString(this.until);
    }
  }

  /**
   * The jCal representation of this recurrence type.
   */
  toJSON(): object {
    const res = Object.create(null);
    res.freq = this.freq;

    if (this.count) {
      res.count = this.count;
    }

    if (this.interval > 1) {
      res.interval = this.interval;
    }

    for (const [k, kparts] of Object.entries(this.parts)) {
      if (Array.isArray(kparts) && kparts.length === 1) {
        res[k.toLowerCase()] = kparts[0];
      } else {
        res[k.toLowerCase()] = clone(kparts);
      }
    }

    if (this.until) {
      res.until = this.until.toString();
    }
    if ('wkst' in this && this.wkst !== Time.DEFAULT_WEEK_START) {
      res.wkst = Recur.numericDayToIcalDay(this.wkst);
    }
    return res;
  }

  /**
   * The string representation of this recurrence rule.
   */
  toString(): string {
    // TODO retain order
    let str = 'FREQ=' + this.freq;
    if (this.count) {
      str += ';COUNT=' + this.count;
    }
    if (this.interval > 1) {
      str += ';INTERVAL=' + this.interval;
    }
    for (const [k, v] of Object.entries(this.parts)) {
      str += ';' + k + '=' + v;
    }
    if (this.until) {
      str += ';UNTIL=' + this.until.toICALString();
    }
    if ('wkst' in this && this.wkst !== Time.DEFAULT_WEEK_START) {
      str += ';WKST=' + Recur.numericDayToIcalDay(this.wkst);
    }
    return str;
  }
}

function parseNumericValue(type, min: number, max: number, value: number) {
  let result = value;

  if (value[0] === '+') {
    result = value.slice(1);
  }

  result = strictParseInt(result);

  if (min !== undefined && value < min) {
    throw new Error(type + ': invalid value "' + value + '" must be > ' + min);
  }

  if (max !== undefined && value > max) {
    throw new Error(type + ': invalid value "' + value + '" must be < ' + min);
  }

  return result;
}

const optionDesign: {
  [key: string]: (value: string, dict: RecurData, fmtIcal: boolean) => void;
} = {
  FREQ(value, dict, fmtIcal) {
    // yes this is actually equal or faster then regex.
    // upside here is we can enumerate the valid values.
    if (ALLOWED_FREQ.indexOf(value) !== -1) {
      dict.freq = value;
    } else {
      throw new Error(
        'invalid frequency "' +
          value +
          '" expected: "' +
          ALLOWED_FREQ.join(', ') +
          '"'
      );
    }
  },

  COUNT(value, dict, fmtIcal) {
    dict.count = strictParseInt(value);
  },

  INTERVAL(value, dict, fmtIcal) {
    dict.interval = strictParseInt(value);
    if (dict.interval < 1) {
      // 0 or negative values are not allowed, some engines seem to generate
      // it though. Assume 1 instead.
      dict.interval = 1;
    }
  },

  UNTIL(value, dict, fmtIcal) {
    if (value.length > 10) {
      dict.until = design.icalendar.value['date-time'].fromICAL(value);
    } else {
      dict.until = design.icalendar.value.date.fromICAL(value);
    }
    if (!fmtIcal) {
      dict.until = Time.fromString(dict.until);
    }
  },

  WKST(value, dict, fmtIcal) {
    if (VALID_DAY_NAMES.test(value)) {
      dict.wkst = Recur.icalDayToNumericDay(value);
    } else {
      throw new Error('invalid WKST value "' + value + '"');
    }
  }
};

const partDesign = {
  BYSECOND: parseNumericValue.bind(undefined, 'BYSECOND', 0, 60),
  BYMINUTE: parseNumericValue.bind(undefined, 'BYMINUTE', 0, 59),
  BYHOUR: parseNumericValue.bind(undefined, 'BYHOUR', 0, 23),
  BYDAY: function (value: string) {
    if (VALID_BYDAY_PART.test(value)) {
      return value;
    } else {
      throw new Error('invalid BYDAY value "' + value + '"');
    }
  },
  BYMONTHDAY: parseNumericValue.bind(undefined, 'BYMONTHDAY', -31, 31),
  BYYEARDAY: parseNumericValue.bind(undefined, 'BYYEARDAY', -366, 366),
  BYWEEKNO: parseNumericValue.bind(undefined, 'BYWEEKNO', -53, 53),
  BYMONTH: parseNumericValue.bind(undefined, 'BYMONTH', 1, 12),
  BYSETPOS: parseNumericValue.bind(undefined, 'BYSETPOS', -366, 366)
};
