/* eslint-disable class-methods-use-this */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import type { ParseComponent } from './parse';
import { parse } from './parse';
import { Component } from './component';
import { Event } from './event';
import { Timezone } from './timezone';

/**
 * The ComponentParser is used to process a String or jCal Object,
 * firing callbacks for various found components, as well as completion.
 *
 * @example
 * var options = {
 *   // when false no events will be emitted for type
 *   parseEvent: true,
 *   parseTimezone: true
 * };
 *
 * var parser = new ICAL.ComponentParser(options);
 *
 * parser.onevent(eventComponent) {
 *   //...
 * }
 *
 * // ontimezone, etc...
 *
 * parser.oncomplete = function() {
 *
 * };
 *
 * parser.process(stringOrComponent);
 */
export class ComponentParser {
  /**
   * Creates a new ICAL.ComponentParser instance.
   *
   * @param options Component parser options
   */
  constructor(
    options: {
      /** Whether events should be parsed */
      parseEvent?: boolean;
      /** Whether timezones should be parsed */
      parseTimezone?: boolean;
    } = {}
  ) {
    Object.assign(this, options);
  }

  /**
   * When true, parse events
   */
  parseEvent = true;

  /**
   * When true, parse timezones
   */
  parseTimezone = true;

  /* SAX like events here for reference */

  /**
   * Fired when parsing is complete
   */
  oncomplete: () => void = /* c8 ignore next */ () => {};

  /**
   * Fired if an error occurs during parsing.
   *
   * @callback
   * @param err details of error
   */
  onerror = /* c8 ignore next */ (err: Error) => {};

  /**
   * Fired when a top level component (VTIMEZONE) is found
   * @param component     Timezone object
   */
  ontimezone = /* c8 ignore next */ (component: Timezone) => {};

  /**
   * Fired when a top level component (VEVENT) is found.
   * @param component    Top level component
   */
  onevent = /* c8 ignore next */ (component: Event) => {};

  /**
   * Process a string or parse ical object.  This function itself will return
   * nothing but will start the parsing process.
   *
   * Events must be registered prior to calling this method.
   *
   * @param ical The component to process, either in its final form, as a jCal
   *    Object, or string representation
   */
  process(ical: Component | string | ParseComponent) {
    // TODO: this is sync now in the future we will have a incremental parser.
    if (typeof ical === 'string') {
      ical = parse(ical);
    }

    if (!(ical instanceof Component)) {
      ical = new Component(ical);
    }

    const components = ical.getAllSubcomponents();
    let i = 0;
    const len = components.length;
    let component;

    for (; i < len; i++) {
      component = components[i];

      switch (component.name) {
        case 'vtimezone':
          if (this.parseTimezone) {
            const tzid = component.getFirstPropertyValue('tzid');
            if (tzid) {
              this.ontimezone(
                new Timezone({
                  tzid,
                  component
                })
              );
            }
          }
          break;
        case 'vevent':
          if (this.parseEvent) {
            this.onevent(new Event(component));
          }
          break;
        default:
          continue;
      }
    }

    // XXX: ideally we should do a "nextTick" here
    //     so in all cases this is actually async.
    this.oncomplete();
  }
}
