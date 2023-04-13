/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch */

import type { DesignSet } from './design';
import { design } from './design';
import { foldline, unescapedIndexOf } from './helpers';

const LINE_ENDING = '\r\n';
const DEFAULT_VALUE_TYPE = 'unknown';
const RFC6868_REPLACE_MAP: Record<string, string> = {
  __proto__: null!,
  '"': "^'",
  '\n': '^n',
  '^': '^^'
};

/**
 * Convert a full jCal/jCard array into a iCalendar/vCard string.
 *
 * @function ICAL.stringify
 * @variation function
 * @param {Array} jCal    The jCal/jCard document
 * @return {String}       The stringified iCalendar/vCard document
 */
export function stringify(jCal: any[]): string {
  if (typeof jCal[0] == 'string') {
    // This is a single component
    jCal = [jCal];
  }

  let i = 0;
  const len = jCal.length;
  let result = '';

  for (; i < len; i++) {
    result += stringify.component(jCal[i]) + LINE_ENDING;
  }

  return result;
}

/**
 * Converts an jCal component array into a ICAL string.
 * Recursive will resolve sub-components.
 *
 * Exact component/property order is not saved all
 * properties will come before subcomponents.
 *
 * @function ICAL.stringify.component
 * @param component jCal/jCard fragment of a component
 * @param designSet The design data to use for this component
 * @return The iCalendar/vCard string
 */
stringify.component = function (
  component: any[],
  designSet: DesignSet
): string {
  const name = component[0].toUpperCase();
  let result = 'BEGIN:' + name + LINE_ENDING;

  const props = component[1];
  let propIdx = 0;
  const propLen = props.length;

  let designSetName = component[0];
  // rfc6350 requires that in vCard 4.0 the first component is the VERSION
  // component with as value 4.0, note that 3.0 does not have this requirement.
  if (
    designSetName === 'vcard' &&
    component[1].length > 0 &&
    !(component[1][0][0] === 'version' && component[1][0][3] === '4.0')
  ) {
    designSetName = 'vcard3';
  }
  designSet = designSet || design.getDesignSet(designSetName);

  for (; propIdx < propLen; propIdx++) {
    result += stringify.property(props[propIdx], designSet) + LINE_ENDING;
  }

  // Ignore subcomponents if none exist, e.g. in vCard.
  const comps = component[2] || [];
  let compIdx = 0;
  const compLen = comps.length;

  for (; compIdx < compLen; compIdx++) {
    result += stringify.component(comps[compIdx], designSet) + LINE_ENDING;
  }

  result += 'END:' + name;
  return result;
};

/**
 * Converts a single jCal/jCard property to a iCalendar/vCard string.
 *
 * @function ICAL.stringify.property
 * @param property  jCal/jCard property array
 * @param designSet The design data to use for this property
 * @param noFold    If true, the line is not folded
 * @return The iCalendar/vCard string
 */
stringify.property = function (
  property: any[],
  designSet: DesignSet,
  noFold?: boolean
): string {
  const name = property[0].toUpperCase();
  const [jsName, params] = property;

  if (!designSet) {
    designSet = design.defaultSet;
  }

  const groupName = params.group;
  let line;
  if (designSet.propertyGroups && groupName) {
    line = groupName.toUpperCase() + '.' + name;
  } else {
    line = name;
  }

  for (let [paramName, value] of Object.entries(params)) {
    if (designSet.propertyGroups && paramName === 'group') {
      continue;
    }
    let multiValue =
      paramName in designSet.param && designSet.param[paramName].multiValue;
    if (multiValue && Array.isArray(value)) {
      if (designSet.param[paramName].multiValueSeparateDQuote) {
        multiValue = '"' + multiValue + '"';
      }
      value = value.map(stringify._rfc6868Unescape);
      value = stringify.multiValue(
        value,
        multiValue,
        'unknown',
        null,
        designSet
      );
    } else {
      value = stringify._rfc6868Unescape(value);
    }

    line += ';' + paramName.toUpperCase();
    line += '=' + stringify.propertyValue(value);
  }

  if (property.length === 3) {
    // If there are no values, we must assume a blank value
    return line + ':';
  }

  const valueType = property[2];

  let propDetails;
  let multiValue = false;
  let structuredValue = false;
  let isDefault = false;

  if (jsName in designSet.property) {
    propDetails = designSet.property[jsName];

    if ('multiValue' in propDetails) {
      multiValue = propDetails.multiValue;
    }

    if ('structuredValue' in propDetails && Array.isArray(property[3])) {
      structuredValue = propDetails.structuredValue;
    }

    if ('defaultType' in propDetails) {
      if (valueType === propDetails.defaultType) {
        isDefault = true;
      }
    } else if (valueType === DEFAULT_VALUE_TYPE) {
      isDefault = true;
    }
  } else if (valueType === DEFAULT_VALUE_TYPE) {
    isDefault = true;
  }

  // push the VALUE property if type is not the default
  // for the current property.
  if (!isDefault) {
    // value will never contain ;/:/, so we don't escape it here.
    line += ';VALUE=' + valueType.toUpperCase();
  }

  line += ':';

  if (multiValue && structuredValue) {
    line += stringify.multiValue(
      property[3],
      structuredValue,
      valueType,
      multiValue,
      designSet,
      structuredValue
    );
  } else if (multiValue) {
    line += stringify.multiValue(
      property.slice(3),
      multiValue,
      valueType,
      null,
      designSet,
      false
    );
  } else if (structuredValue) {
    line += stringify.multiValue(
      property[3],
      structuredValue,
      valueType,
      null,
      designSet,
      structuredValue
    );
  } else {
    line += stringify.value(property[3], valueType, designSet, false);
  }

  return noFold ? line : foldline(line);
};

/**
 * Handles escaping of property values that may contain:
 *
 *    COLON (:), SEMICOLON (;), or COMMA (,)
 *
 * If any of the above are present the result is wrapped
 * in double quotes.
 *
 * @function ICAL.stringify.propertyValue
 * @param {String} value      Raw property value
 * @return {String}           Given or escaped value when needed
 */
stringify.propertyValue = function (value: string): string {
  if (
    unescapedIndexOf(value, ',') === -1 &&
    unescapedIndexOf(value, ':') === -1 &&
    unescapedIndexOf(value, ';') === -1
  ) {
    return value;
  }

  return '"' + value + '"';
};

/**
 * Converts an array of ical values into a single
 * string based on a type and a delimiter value (like ",").
 *
 * @function ICAL.stringify.multiValue
 * @param values     List of values to convert
 * @param delim      Used to join the values (",", ";", ":")
 * @param type       Lowercase ical value type (like boolean, date-time, etc..)
 * @param innerMulti If set, each value will again be processed. Used for structured values
 * @param designSet  The design data to use for this property
 * @return           iCalendar/vCard string for value
 */
stringify.multiValue = function (
  values: any[],
  delim: string,
  type: string,
  innerMulti: string | undefined,
  designSet: DesignSet,
  structuredValue?
): string {
  let result = '';
  const len = values.length;
  let i = 0;

  for (; i < len; i++) {
    if (innerMulti && Array.isArray(values[i])) {
      result += stringify.multiValue(
        values[i],
        innerMulti,
        type,
        null,
        designSet,
        structuredValue
      );
    } else {
      result += stringify.value(values[i], type, designSet, structuredValue);
    }

    if (i !== len - 1) {
      result += delim;
    }
  }

  return result;
};

/**
 * Processes a single ical value runs the associated "toICAL" method from the
 * design value type if available to convert the value.
 *
 * @function ICAL.stringify.value
 * @param value A formatted value
 * @param type  Lowercase iCalendar/vCard value type  (like boolean, date-time, etc..)
 * @return      iCalendar/vCard value for single value
 */
stringify.value = function (
  value: string | number,
  type: string,
  designSet: DesignSet,
  structuredValue
): string {
  if (type in designSet.value && 'toICAL' in designSet.value[type]) {
    return designSet.value[type].toICAL(value, structuredValue);
  }

  return value;
};

/**
 * Internal helper for rfc6868. Exposing this on ICAL.stringify so that
 * hackers can disable the rfc6868 parsing if the really need to.
 *
 * @param val The value to unescape
 * @return The escaped value
 */
stringify._rfc6868Unescape = function (val: string): string {
  return val.replace(/[\n^"]/g, x => RFC6868_REPLACE_MAP[x]);
};
