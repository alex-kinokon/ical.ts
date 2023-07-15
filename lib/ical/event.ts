/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import { binsearchInsert } from './helpers';
import { Component } from './component';
import { Property } from './property';
import { Timezone } from './timezone';
import { RecurExpansion } from './recur_expansion';
import type { Time } from './time';
import type { FrequencyValue, Recur } from './recur';
import type { Duration } from './duration';

/**
 * This object is returned by {@link Event#getOccurrenceDetails getOccurrenceDetails}
 */
interface OccurrenceDetails {
  /** The passed in recurrence id */
  recurrenceId: Time;
  /** The occurrence */
  item: Event;
  /** The start of the occurrence */
  startDate: Time;
  /** The end of the occurrence */
  endDate: Time;
}

/**
 * ICAL.js is organized into multiple layers. The bottom layer is a raw jCal
 * object, followed by the component/property layer. The highest level is the
 * event representation, which this class is part of. See the
 * {@tutorial layers} guide for more details.
 *
 * @class
 * @alias ICAL.Event
 */
export class Event {
  private component: Component;
  private _rangeExceptionCache: Record<string, Duration>;
  private rangeExceptions: [number, string][];

  /**
   * Creates a new ICAL.Event instance.
   *
   * @param component The ICAL.Component to base this event on
   * @param options Options for this event
   */
  constructor(
    component?: Component,
    options?: {
      /**
       * When true, will verify exceptions are related by their UUID
       */
      strictExceptions: boolean;
      /**
       * Exceptions to this event, either as components or events. If not
       * specified exceptions will automatically be set in relation of
       * component's parent
       */
      exceptions: (Component | Event)[];
    }
  ) {
    if (!(component instanceof Component)) {
      options = component;
      component = undefined;
    }

    if (component) {
      this.component = component;
    } else {
      this.component = new Component('vevent');
    }

    this._rangeExceptionCache = Object.create(null);
    this.exceptions = Object.create(null);
    this.rangeExceptions = [];

    if (options && options.strictExceptions) {
      this.strictExceptions = options.strictExceptions;
    }

    if (options && options.exceptions) {
      options.exceptions.forEach(this.relateException, this);
    } else if (this.component.parent && !this.isRecurrenceException()) {
      this.component.parent.getAllSubcomponents('vevent').forEach(event => {
        if (event.hasProperty('recurrence-id')) {
          this.relateException(event);
        }
      });
    }
  }

  static THISANDFUTURE = 'THISANDFUTURE';

  /**
   * List of related event exceptions.
   */
  exceptions: Record<string, Event>;

  /**
   * When true, will verify exceptions are related by their UUID.
   */
  strictExceptions = false;

  /**
   * Relates a given event exception to this object.  If the given component
   * does not share the UID of this event it cannot be related and will throw
   * an exception.
   *
   * If this component is an exception it cannot have other exceptions
   * related to it.
   *
   * @param obj       Component or event
   */
  relateException(obj: Component | Event) {
    if (this.isRecurrenceException()) {
      throw new Error('cannot relate exception to exceptions');
    }

    if (obj instanceof Component) {
      obj = new Event(obj);
    }

    if (this.strictExceptions && obj.uid !== this.uid) {
      throw new Error('attempted to relate unrelated exception');
    }

    const id = obj.recurrenceId.toString();

    // we don't sort or manage exceptions directly
    // here the recurrence expander handles that.
    this.exceptions[id] = obj;

    // index RANGE=THISANDFUTURE exceptions so we can
    // look them up later in getOccurrenceDetails.
    if (obj.modifiesFuture()) {
      const item = [obj.recurrenceId.toUnixTime(), id] as [number, string];

      // we keep them sorted so we can find the nearest
      // value later on...
      const idx = binsearchInsert(
        this.rangeExceptions,
        item,
        compareRangeException
      );

      this.rangeExceptions.splice(idx, 0, item);
    }
  }

  /**
   * Checks if this record is an exception and has the RANGE=THISANDFUTURE
   * value.
   *
   * @return True, when exception is within range
   */
  modifiesFuture(): boolean {
    if (!this.component.hasProperty('recurrence-id')) {
      return false;
    }

    const range = this.component
      .getFirstProperty('recurrence-id')!
      .getParameter('range');
    return range === Event.THISANDFUTURE;
  }

  /**
   * Finds the range exception nearest to the given date.
   *
   * @param time usually an occurrence time of an event
   * @return the related event/exception or null
   */
  findRangeException(time: Time): string | null {
    if (!this.rangeExceptions.length) {
      return null;
    }

    const utc = time.toUnixTime();
    let idx = binsearchInsert(
      this.rangeExceptions,
      [utc],
      compareRangeException
    );

    idx -= 1;

    // occurs before
    if (idx < 0) {
      return null;
    }

    const rangeItem = this.rangeExceptions[idx];

    /* c8 ignore next 4 */
    if (utc < rangeItem[0]) {
      // sanity check only
      return null;
    }

    return rangeItem[1];
  }

  /**
   * Returns the occurrence details based on its start time.  If the
   * occurrence has an exception will return the details for that exception.
   *
   * NOTE: this method is intend to be used in conjunction
   *       with the {@link Event#iterator iterator} method.
   *
   * @param occurrence time occurrence
   * @return Information about the occurrence
   */
  getOccurrenceDetails(occurrence: Time): OccurrenceDetails {
    const id = occurrence.toString();
    const utcId = occurrence.convertToZone(Timezone.utcTimezone).toString();
    let item;
    const result = {
      // XXX: Clone?
      recurrenceId: occurrence
    } as OccurrenceDetails;

    if (id in this.exceptions) {
      item = result.item = this.exceptions[id];
      result.startDate = item.startDate;
      result.endDate = item.endDate;
      result.item = item;
    } else if (utcId in this.exceptions) {
      item = this.exceptions[utcId];
      result.startDate = item.startDate;
      result.endDate = item.endDate;
      result.item = item;
    } else {
      // range exceptions (RANGE=THISANDFUTURE) have a
      // lower priority then direct exceptions but
      // must be accounted for first. Their item is
      // always the first exception with the range prop.
      const rangeExceptionId = this.findRangeException(occurrence);
      let end;

      if (rangeExceptionId) {
        const exception = this.exceptions[rangeExceptionId];

        // range exception must modify standard time
        // by the difference (if any) in start/end times.
        result.item = exception;

        let startDiff = this._rangeExceptionCache[rangeExceptionId];

        if (!startDiff) {
          const original = exception.recurrenceId.clone();
          const newStart = exception.startDate.clone();

          // zones must be same otherwise subtract may be incorrect.
          original.zone = newStart.zone;
          startDiff = newStart.subtractDate(original);

          this._rangeExceptionCache[rangeExceptionId] = startDiff;
        }

        const start = occurrence.clone();
        start.zone = exception.startDate.zone;
        start.addDuration(startDiff);

        end = start.clone();
        end.addDuration(exception.duration);

        result.startDate = start;
        result.endDate = end;
      } else {
        // no range exception standard expansion
        end = occurrence.clone();
        end.addDuration(this.duration);

        result.endDate = end;
        result.startDate = occurrence;
        result.item = this;
      }
    }

    return result;
  }

  /**
   * Builds a recur expansion instance for a specific point in time (defaults
   * to startDate).
   *
   * @param startTime     Starting point for expansion
   * @return Expansion object
   */
  iterator(startTime: Time): RecurExpansion {
    return new RecurExpansion({
      component: this.component,
      dtstart: startTime || this.startDate
    });
  }

  /**
   * Checks if the event is recurring
   *
   * @return True, if event is recurring
   */
  isRecurring(): boolean {
    const comp = this.component;
    return comp.hasProperty('rrule') || comp.hasProperty('rdate');
  }

  /**
   * Checks if the event describes a recurrence exception. See
   * {@tutorial terminology} for details.
   *
   * @return True, if the event describes a recurrence exception
   */
  isRecurrenceException(): boolean {
    return this.component.hasProperty('recurrence-id');
  }

  /**
   * Returns the types of recurrences this event may have.
   *
   * Returned as an object with the following possible keys:
   *
   *    - YEARLY
   *    - MONTHLY
   *    - WEEKLY
   *    - DAILY
   *    - MINUTELY
   *    - SECONDLY
   *
   * @return Object of recurrence flags
   */
  getRecurrenceTypes(): Record<FrequencyValue, boolean> {
    const rules = this.component.getAllProperties('rrule');
    let i = 0;
    const len = rules.length;
    const result: Record<FrequencyValue, boolean> = Object.create(null);

    for (; i < len; i++) {
      const value: Recur = rules[i].getFirstValue();
      result[value.freq!] = true;
    }

    return result;
  }

  /**
   * The uid of this event
   */
  get uid(): string | null {
    return this._firstProp('uid');
  }

  set uid(value) {
    this._setProp('uid', value);
  }

  /**
   * The start date
   */
  get startDate(): Time {
    return this._firstProp('dtstart');
  }

  set startDate(value) {
    this._setTime('dtstart', value);
  }

  /**
   * The end date. This can be the result directly from the property, or the
   * end date calculated from start date and duration. Setting the property
   * will remove any duration properties.
   */
  get endDate(): Time {
    let endDate = this._firstProp('dtend');
    if (!endDate) {
      const duration = this._firstProp('duration');
      endDate = this.startDate.clone();
      if (duration) {
        endDate.addDuration(duration);
      } else if (endDate.isDate) {
        endDate.day += 1;
      }
    }
    return endDate;
  }

  set endDate(value) {
    if (this.component.hasProperty('duration')) {
      this.component.removeProperty('duration');
    }
    this._setTime('dtend', value);
  }

  /**
   * The duration. This can be the result directly from the property, or the
   * duration calculated from start date and end date. Setting the property
   * will remove any `dtend` properties.
   * @type {Duration}
   */
  get duration(): Duration {
    const duration = this._firstProp('duration');
    if (!duration) {
      return this.endDate.subtractDateTz(this.startDate);
    }
    return duration;
  }

  set duration(value) {
    if (this.component.hasProperty('dtend')) {
      this.component.removeProperty('dtend');
    }

    this._setProp('duration', value);
  }

  /**
   * The location of the event.
   */
  get location(): string {
    return this._firstProp('location');
  }

  set location(value) {
    this._setProp('location', value);
  }

  /**
   * The attendees in the event
   */
  get attendees(): Property[] {
    // XXX: This is way lame we should have a better
    //     data structure for this later.
    return this.component.getAllProperties('attendee');
  }

  /**
   * The event summary
   */
  get summary(): string {
    return this._firstProp('summary');
  }

  set summary(value) {
    this._setProp('summary', value);
  }

  /**
   * The event description.
   */
  get description(): string {
    return this._firstProp('description');
  }

  set description(value) {
    this._setProp('description', value);
  }

  /**
   * The event color from [rfc7986](https://datatracker.ietf.org/doc/html/rfc7986)
   */
  get color(): string {
    return this._firstProp('color');
  }

  set color(value) {
    this._setProp('color', value);
  }

  /**
   * The organizer value as an uri. In most cases this is a mailto: uri, but
   * it can also be something else, like urn:uuid:...
   */
  get organizer(): string {
    return this._firstProp('organizer')!;
  }

  set organizer(value) {
    this._setProp('organizer', value);
  }

  /**
   * The sequence value for this event. Used for scheduling
   * see {@tutorial terminology}.
   */
  get sequence(): number {
    return this._firstProp('sequence')!;
  }

  set sequence(value) {
    this._setProp('sequence', value);
  }

  /**
   * The recurrence id for this event. See {@tutorial terminology} for details.
   */
  get recurrenceId(): Time {
    return this._firstProp('recurrence-id');
  }

  set recurrenceId(value) {
    this._setTime('recurrence-id', value);
  }

  /**
   * Set/update a time property's value.
   * This will also update the TZID of the property.
   *
   * TODO: this method handles the case where we are switching
   * from a known timezone to an implied timezone (one without TZID).
   * This does _not_ handle the case of moving between a known
   *  (by TimezoneService) timezone to an unknown timezone...
   *
   * We will not add/remove/update the VTIMEZONE subcomponents
   *  leading to invalid ICAL data...
   * @private
   * @param propName     The property name
   * @param time      The time to set
   */
  private _setTime(propName: string, time: Time) {
    let prop = this.component.getFirstProperty(propName);

    if (!prop) {
      prop = new Property(propName);
      this.component.addProperty(prop);
    }

    // utc and local don't get a tzid
    if (
      time.zone === Timezone.localTimezone ||
      time.zone === Timezone.utcTimezone
    ) {
      // remove the tzid
      prop.removeParameter('tzid');
    } else {
      prop.setParameter('tzid', time.zone!.tzid);
    }

    prop.setValue(time);
  }

  _setProp(name: string, value: string | number | object) {
    this.component.updatePropertyWithValue(name, value);
  }

  _firstProp(name: string) {
    return this.component.getFirstPropertyValue(name);
  }

  /**
   * The string representation of this event.
   */
  toString(): string {
    return this.component.toString();
  }
}

function compareRangeException(a: [number, string?], b: [number, string]) {
  if (a[0] > b[0]) return 1;
  if (b[0] > a[0]) return -1;
  return 0;
}
