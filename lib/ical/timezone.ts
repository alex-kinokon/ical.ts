/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { Time } from './time';
import { Component } from './component';
import { parse } from './parse';
import { binsearchInsert, clone } from './helpers';

const OPTIONS = ['tzid', 'location', 'tznames', 'latitude', 'longitude'];

interface TimezoneData {
  /**
   * If aData is a simple object, then this member can be set to either a
   * string containing the component data, or an already parsed
   * ICAL.Component
   */
  component?: string | Component;
  /** The timezone identifier */
  tzid: string;
  /** The timezone location */
  location?: string;
  /** An alternative string representation of the timezone */
  tznames?: string;
  /** The latitude of the timezone */
  latitude?: number;
  /** The longitude of the timezone */
  longitude?: number;
}

interface Change {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  is_daylight?: boolean;
  utcOffset?: number;
  prevUtcOffset?: number;
  isDate?: boolean;
}

/**
 * Timezone representation.
 *
 * @example
 * var vcalendar;
 * var timezoneComp = vcalendar.getFirstSubcomponent('vtimezone');
 * var tzid = timezoneComp.getFirstPropertyValue('tzid');
 *
 * var timezone = new ICAL.Timezone({
 *   component: timezoneComp,
 *   tzid
 * });
 *
 * @class
 * @alias ICAL.Timezone
 */
export class Timezone {
  private changes: Change[];
  private wrappedJSObject: Timezone;

  static _compare_change_fn(a: Change, b: Change) {
    if (a.year < b.year) return -1;
    else if (a.year > b.year) return 1;

    if (a.month < b.month) return -1;
    else if (a.month > b.month) return 1;

    if (a.day < b.day) return -1;
    else if (a.day > b.day) return 1;

    if (a.hour < b.hour) return -1;
    else if (a.hour > b.hour) return 1;

    if (a.minute < b.minute) return -1;
    else if (a.minute > b.minute) return 1;

    if (a.second < b.second) return -1;
    else if (a.second > b.second) return 1;

    return 0;
  }

  /**
   * Convert the date/time from one zone to the next.
   *
   * @param tt        The time to convert
   * @param from_zone The source zone to convert from
   * @param to_zone   The target zone to convert to
   * @return          The converted date/time object
   */
  static convert_time(
    tt: Time,
    from_zone: Timezone,
    to_zone: Timezone
  ): Time | null {
    if (
      tt.isDate ||
      from_zone.tzid === to_zone.tzid ||
      from_zone === Timezone.localTimezone ||
      to_zone === Timezone.localTimezone
    ) {
      tt.zone = to_zone;
      return tt;
    }

    let utcOffset = from_zone.utcOffset(tt);
    tt.adjust(0, 0, 0, -utcOffset);

    utcOffset = to_zone.utcOffset(tt);
    tt.adjust(0, 0, 0, utcOffset);

    return null;
  }

  /**
   * Creates a new ICAL.Timezone instance from the passed data object.
   *
   * @param aData options for class
   */
  static fromData(aData: TimezoneData | Component) {
    const tt = new Timezone();
    return tt.fromData(aData);
  }

  /**
   * The instance describing the UTC timezone
   */
  static #utcTimezone: Timezone;

  static get utcTimezone() {
    if (!this.#utcTimezone) {
      this.#utcTimezone = Timezone.fromData({ tzid: 'UTC' });
    }
    return this.#utcTimezone;
  }

  /**
   * The instance describing the local timezone
   */
  static #localTimezone: Timezone;

  static get localTimezone() {
    if (!this.#localTimezone) {
      this.#localTimezone = Timezone.fromData({ tzid: 'floating' });
    }
    return this.#localTimezone;
  }

  /**
   * Adjust a timezone change object.
   * @private
   * @param change     The timezone change object
   * @param days       The extra amount of days
   * @param hours      The extra amount of hours
   * @param minutes    The extra amount of minutes
   * @param seconds    The extra amount of seconds
   */
  private static adjust_change(
    change: object,
    days: number,
    hours: number,
    minutes: number,
    seconds: number
  ) {
    return Time.prototype.adjust.call(
      change,
      days,
      hours,
      minutes,
      seconds,
      change
    );
  }

  static _minimumExpansionYear = -1;
  static EXTRA_COVERAGE = 5;

  /**
   * Creates a new ICAL.Timezone instance, by passing in a tzid and component.
   *
   * @param data options for class
   */
  constructor(data?: TimezoneData | Component) {
    this.wrappedJSObject = this;
    this.fromData(data);
  }

  /**
   * Timezone identifier
   */
  tzid = '';

  /**
   * Timezone location
   */
  location = '';

  /**
   * Alternative timezone name, for the string representation
   */
  tznames = '';

  /**
   * The primary latitude for the timezone.
   */
  latitude = 0.0;

  /**
   * The primary longitude for the timezone.
   */
  longitude = 0.0;

  /**
   * The vtimezone component for this timezone.
   */
  component: Component | null = null;

  /**
   * The year this timezone has been expanded to. All timezone transition
   * dates until this year are known and can be used for calculation
   */
  private expandedUntilYear = 0;

  /**
   * The class identifier.
   */
  readonly icalclass = 'icaltimezone';

  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param aData options for class
   */
  fromData(aData?: TimezoneData | Component) {
    this.expandedUntilYear = 0;
    this.changes = [];

    if (aData instanceof Component) {
      // Either a component is passed directly
      this.component = aData;
    } else {
      // Otherwise the component may be in the data object
      if (aData && 'component' in aData) {
        if (typeof aData.component == 'string') {
          // If a string was passed, parse it as a component
          const jCal = parse(aData.component);
          this.component = new Component(jCal);
        } else if (aData.component instanceof Component) {
          // If it was a component already, then just set it
          this.component = aData.component;
        } else {
          // Otherwise just null out the component
          this.component = null;
        }
      }

      // Copy remaining passed properties
      for (const prop of OPTIONS) {
        if (aData && prop in aData) {
          this[prop] = aData[prop];
        }
      }
    }

    // If we have a component but no TZID, attempt to get it from the
    // component's properties.
    if (this.component instanceof Component && !this.tzid) {
      this.tzid = this.component.getFirstPropertyValue('tzid')!;
    }

    return this;
  }

  /**
   * Finds the utcOffset the given time would occur in this timezone.
   *
   * @param {Time} tt        The time to check for
   * @return {Number} utc offset in seconds
   */
  utcOffset(tt: Time): number {
    if (this === Timezone.utcTimezone || this === Timezone.localTimezone) {
      return 0;
    }

    this._ensureCoverage(tt.year);

    if (!this.changes.length) {
      return 0;
    }

    const tt_change: Change = {
      year: tt.year,
      month: tt.month,
      day: tt.day,
      hour: tt.hour,
      minute: tt.minute,
      second: tt.second
    };

    let change_num = this._findNearbyChange(tt_change);
    let change_num_to_use = -1;
    let step = 1;

    // TODO: replace with bin search?
    for (;;) {
      const change = clone(this.changes[change_num], true);
      if (change.utcOffset < change.prevUtcOffset) {
        Timezone.adjust_change(change, 0, 0, 0, change.utcOffset);
      } else {
        Timezone.adjust_change(change, 0, 0, 0, change.prevUtcOffset);
      }

      const cmp = Timezone._compare_change_fn(tt_change, change);

      if (cmp >= 0) {
        change_num_to_use = change_num;
      } else {
        step = -1;
      }

      if (step === -1 && change_num_to_use !== -1) {
        break;
      }

      change_num += step;

      if (change_num < 0) {
        return 0;
      }

      if (change_num >= this.changes.length) {
        break;
      }
    }

    let zone_change = this.changes[change_num_to_use];
    const utcOffset_change =
      zone_change.utcOffset! - zone_change.prevUtcOffset!;

    if (utcOffset_change < 0 && change_num_to_use > 0) {
      const tmp_change = clone(zone_change, true);
      Timezone.adjust_change(tmp_change, 0, 0, 0, tmp_change.prevUtcOffset);

      if (Timezone._compare_change_fn(tt_change, tmp_change) < 0) {
        const prev_zone_change = this.changes[change_num_to_use - 1];

        const want_daylight = false; // TODO

        if (
          zone_change.is_daylight !== want_daylight &&
          prev_zone_change.is_daylight === want_daylight
        ) {
          zone_change = prev_zone_change;
        }
      }
    }

    // TODO return is_daylight?
    return zone_change.utcOffset!;
  }

  private _findNearbyChange(change: Change) {
    // find the closest match
    const idx = binsearchInsert(
      this.changes,
      change,
      Timezone._compare_change_fn
    );

    if (idx >= this.changes.length) {
      return this.changes.length - 1;
    }

    return idx;
  }

  private _ensureCoverage(aYear: number) {
    if (Timezone._minimumExpansionYear === -1) {
      const today = Time.now();
      Timezone._minimumExpansionYear = today.year;
    }

    let changesEndYear = aYear;
    if (changesEndYear < Timezone._minimumExpansionYear) {
      changesEndYear = Timezone._minimumExpansionYear;
    }

    changesEndYear += Timezone.EXTRA_COVERAGE;

    if (!this.changes.length || this.expandedUntilYear < aYear) {
      const subcomps = this.component!.getAllSubcomponents();
      const compLen = subcomps.length;
      let compIdx = 0;

      for (; compIdx < compLen; compIdx++) {
        this._expandComponent(subcomps[compIdx], changesEndYear, this.changes);
      }

      this.changes.sort(Timezone._compare_change_fn);
      this.expandedUntilYear = changesEndYear;
    }
  }

  private _expandComponent(aComponent, aYear, changes: Change[]) {
    if (
      !aComponent.hasProperty('dtstart') ||
      !aComponent.hasProperty('tzoffsetto') ||
      !aComponent.hasProperty('tzoffsetfrom')
    ) {
      return null;
    }

    const dtstart = aComponent.getFirstProperty('dtstart').getFirstValue();
    let change;

    function convert_tzoffset(offset: {
      factor: number;
      hours: number;
      minutes: number;
    }) {
      return offset.factor * (offset.hours * 3600 + offset.minutes * 60);
    }

    function init_changes() {
      const changeBase: Change = {} as any;
      changeBase.is_daylight = aComponent.name === 'daylight';
      changeBase.utcOffset = convert_tzoffset(
        aComponent.getFirstProperty('tzoffsetto').getFirstValue()
      );

      changeBase.prevUtcOffset = convert_tzoffset(
        aComponent.getFirstProperty('tzoffsetfrom').getFirstValue()
      );

      return changeBase;
    }

    if (!aComponent.hasProperty('rrule') && !aComponent.hasProperty('rdate')) {
      change = init_changes();
      change.year = dtstart.year;
      change.month = dtstart.month;
      change.day = dtstart.day;
      change.hour = dtstart.hour;
      change.minute = dtstart.minute;
      change.second = dtstart.second;

      Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset!);
      changes.push(change);
    } else {
      const props = aComponent.getAllProperties('rdate');
      for (const rdate of props) {
        const time = rdate.getFirstValue();
        change = init_changes();

        change.year = time.year;
        change.month = time.month;
        change.day = time.day;

        if (time.isDate) {
          change.hour = dtstart.hour;
          change.minute = dtstart.minute;
          change.second = dtstart.second;

          if (dtstart.zone !== Timezone.utcTimezone) {
            Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset!);
          }
        } else {
          change.hour = time.hour;
          change.minute = time.minute;
          change.second = time.second;

          if (time.zone !== Timezone.utcTimezone) {
            Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset!);
          }
        }

        changes.push(change);
      }

      let rrule = aComponent.getFirstProperty('rrule');

      if (rrule) {
        rrule = rrule.getFirstValue();
        change = init_changes();

        if (rrule.until && rrule.until.zone === Timezone.utcTimezone) {
          rrule.until.adjust(0, 0, 0, change.prevUtcOffset);
          rrule.until.zone = Timezone.localTimezone;
        }

        const iterator = rrule.iterator(dtstart);

        let occ;
        while ((occ = iterator.next())) {
          change = init_changes();
          if (occ.year > aYear || !occ) {
            break;
          }

          change.year = occ.year;
          change.month = occ.month;
          change.day = occ.day;
          change.hour = occ.hour;
          change.minute = occ.minute;
          change.second = occ.second;
          change.isDate = occ.isDate;

          Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset!);
          changes.push(change);
        }
      }
    }

    return changes;
  }

  /**
   * The string representation of this timezone.
   */
  toString(): string {
    return this.tznames ? this.tznames : this.tzid;
  }
}
