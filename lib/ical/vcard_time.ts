/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { UtcOffset } from './utc_offset';
import { Time } from './time';
import { Timezone } from './timezone';
import { design } from './design';
import { pad2, strictParseInt } from './helpers';

interface VCardTimeData {
  /** The year for this date */
  year?: number;
  /** The month for this date */
  month?: number;
  /** The day for this date */
  day?: number;
  /** The hour for this date */
  hour?: number;
  /** The minute for this date */
  minute?: number;
  /** The second for this date */
  second?: number;
}

/**
 * Describes a vCard time, which has slight differences to the ICAL.Time.
 * Properties can be null if not specified, for example for dates with
 * reduced accuracy or truncation.
 *
 * Note that currently not all methods are correctly re-implemented for
 * VCardTime. For example, comparison will have undefined results when some
 * members are null.
 *
 * Also, normalization is not yet implemented for this class!
 *
 * @alias ICAL.VCardTime
 * @extends {Time}
 * @class
 */
export class VCardTime extends Time {
  /**
   * Returns a new ICAL.VCardTime instance from a date and/or time string.
   *
   * @param aValue     The string to create from
   * @param aIcalType  The type for this instance, e.g. date-and-or-time
   * @return The date/time instance
   */
  static fromDateAndOrTimeString(
    aValue: string,
    aIcalType?: VCardTime['icaltype']
  ): VCardTime {
    function part(v: string, s: number, e: number) {
      return v ? strictParseInt(v.slice(s, s + e)) : null;
    }
    const parts = aValue.split('T');
    const [dt, tmz] = parts;
    const splitZone = tmz ? design.vcard.value.time._splitZone(tmz) : [];
    let [zone, tm] = splitZone;

    const dtLen = dt ? dt.length : 0;
    const tmLen = tm ? tm.length : 0;

    const hasDashDate = dt && dt[0] === '-' && dt[1] === '-';
    const hasDashTime = tm && tm[0] === '-';

    const o: VCardTimeData = {
      year: hasDashDate ? null : part(dt, 0, 4),
      month:
        hasDashDate && (dtLen === 4 || dtLen === 7)
          ? part(dt, 2, 2)
          : dtLen === 7
          ? part(dt, 5, 2)
          : dtLen === 10
          ? part(dt, 5, 2)
          : null,
      day:
        dtLen === 5
          ? part(dt, 3, 2)
          : dtLen === 7 && hasDashDate
          ? part(dt, 5, 2)
          : dtLen === 10
          ? part(dt, 8, 2)
          : null,

      hour: hasDashTime ? null : part(tm, 0, 2),
      minute:
        hasDashTime && tmLen === 3
          ? part(tm, 1, 2)
          : tmLen > 4
          ? hasDashTime
            ? part(tm, 1, 2)
            : part(tm, 3, 2)
          : null,
      second:
        tmLen === 4
          ? part(tm, 2, 2)
          : tmLen === 6
          ? part(tm, 4, 2)
          : tmLen === 8
          ? part(tm, 6, 2)
          : null
    };

    if (zone === 'Z') {
      zone = Timezone.utcTimezone;
    } else if (zone && zone[3] === ':') {
      zone = UtcOffset.fromString(zone);
    } else {
      zone = null;
    }

    return new VCardTime(o, zone, aIcalType);
  }

  /**
   * Creates a new ICAL.VCardTime instance.
   *
   * @param data The data for the time instance
   * @param zone     The timezone to use
   * @param icalType The type for this date/time object
   */
  constructor(
    data: VCardTimeData,
    zone: Timezone | UtcOffset,
    icalType: VCardTime['icaltype'] = 'date-and-or-time'
  ) {
    super(data, zone);
    Object.defineProperty(this, 'icaltype', {
      value: icalType,
      writable: true
    });
  }

  /**
   * The class identifier.
   */
  readonly icalclass = 'vcardtime';

  /**
   * The type name, to be used in the jCal object.
   */
  readonly icaltype: 'date-and-or-time' | 'date' | 'date-time' | 'time';

  /**
   * Returns a clone of the vcard date/time object.
   *
   * @return The cloned object
   */
  clone(): VCardTime {
    return new VCardTime(this._time, this.zone, this.icaltype);
  }

  override _normalize() {
    return this;
  }

  /**
   * @inheritdoc
   */
  utcOffset() {
    if (this.zone instanceof UtcOffset) {
      return this.zone.toSeconds();
    } else {
      return super.utcOffset();
    }
  }

  /**
   * Returns an RFC 6350 compliant representation of this object.
   *
   * @return vcard date/time string
   */
  toICALString(): string {
    return design.vcard.value[this.icaltype].toICAL(this.toString());
  }

  /**
   * The string representation of this date/time, in jCard form
   * (including : and - separators).
   */
  toString(): string {
    const y = this.year;
    const m = this.month;
    const d = this.day;
    const h = this.hour;
    const mm = this.minute;
    const s = this.second;

    const hasYear = y != null,
      hasMonth = m != null,
      hasDay = d != null;
    const hasHour = h != null,
      hasMinute = mm != null,
      hasSecond = s != null;

    const datePart =
      (hasYear
        ? pad2(y) + (hasMonth || hasDay ? '-' : '')
        : hasMonth || hasDay
        ? '--'
        : '') +
      (hasMonth ? pad2(m) : '') +
      (hasDay ? '-' + pad2(d) : '');
    const timePart =
      (hasHour ? pad2(h) : '-') +
      (hasHour && hasMinute ? ':' : '') +
      (hasMinute ? pad2(mm) : '') +
      (!hasHour && !hasMinute ? '-' : '') +
      (hasMinute && hasSecond ? ':' : '') +
      (hasSecond ? pad2(s) : '');

    let zone;
    if (this.zone === Timezone.utcTimezone) {
      zone = 'Z';
    } else if (this.zone instanceof UtcOffset) {
      zone = this.zone.toString();
    } else if (this.zone === Timezone.localTimezone) {
      zone = '';
    } else if (this.zone instanceof Timezone) {
      const offset = UtcOffset.fromSeconds(this.zone.utcOffset(this));
      zone = offset.toString();
    } else {
      zone = '';
    }

    switch (this.icaltype) {
      case 'time':
        return timePart + zone;
      case 'date-and-or-time':
      case 'date-time':
        return datePart + (timePart === '--' ? '' : 'T' + timePart + zone);
      case 'date':
        return datePart;
    }
  }
}
