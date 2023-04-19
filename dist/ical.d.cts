/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
* Portions Copyright (C) Philipp Kewisch */
/**
 * Represents the BINARY value type, which contains extra methods for encoding and decoding.
 */
declare class Binary {
    private value;
    /**
     * Creates a binary value from the given string.
     */
    static fromString(aString: string): Binary;
    /**
     * Creates a new ICAL.Binary instance
     *
     * @param aValue The binary data for this value
     */
    constructor(aValue: string);
    /**
     * The type name, to be used in the jCal object.
     */
    readonly icaltype = "binary";
    /**
     * Base64 decode the current value
     */
    decodeValue(): string;
    /**
     * Encodes the passed parameter with base64 and sets the internal
     * value to the result.
     *
     * @param aValue The raw binary value to encode
     */
    setEncodedValue(aValue: string): void;
    private _b64_encode;
    private _b64_decode;
    /**
     * The string representation of this value
     */
    toString(): string;
}
/**
 * A designSet describes value, parameter and property data. It is used by
 * the parser and stringifier in components and properties to determine they
 * should be represented.
 */
interface DesignSet {
    /** Definitions for value types, keys are type names */
    value: Record<string, any>;
    /** Definitions for params, keys are param names */
    param: Record<string, any>;
    /** Definitions for properties, keys are property names */
    property: Record<string, any>;
    /** If content lines may include a group name */
    propertyGroups: boolean;
}
/**
 * The design data, used by the parser to determine types for properties and
 * other metadata needed to produce correct jCard/jCal data.
 */
declare const design: {
    strict: boolean;
    defaultSet: DesignSet;
    defaultType: string;
    components: {
        vcard: DesignSet;
        vcard3: DesignSet;
        vevent: DesignSet;
        vtodo: DesignSet;
        vjournal: DesignSet;
        valarm: DesignSet;
        vtimezone: DesignSet;
        daylight: DesignSet;
        standard: DesignSet;
    };
    icalendar: DesignSet;
    vcard: DesignSet;
    vcard3: DesignSet;
    getDesignSet(componentName: string): DesignSet;
};
/**
 * Provides a layer on top of the raw jCal object for manipulating a single property, with its
 * parameters and value.
 *
 * @class
 * @alias ICAL.Property
 */
declare class Property {
    private _parent;
    private _values?;
    private isDecorated?;
    private isMultiValue?;
    private isStructuredValue?;
    jCal: any[];
    /**
     * Create an {@link ICAL.Property} by parsing the passed iCalendar string.
     *
     * @param str The iCalendar string to parse
     * @param designSet The design data to use for this property
     * @return The created iCalendar property
     */
    static fromString(str: string, designSet: DesignSet): Property;
    /**
     * Creates a new ICAL.Property instance.
     *
     * It is important to note that mutations done in the wrapper directly mutate the jCal object used
     * to initialize.
     *
     * Can also be used to create new properties by passing the name of the property (as a String).
     *
     * @param jCal Raw jCal representation OR the new name of the property
     * @param parent Parent component
     */
    constructor(jCal: any[] | string, parent?: Component);
    /**
     * The value type for this property
     */
    get type(): string;
    /**
     * The name of this property, in lowercase.
     */
    get name(): string;
    /**
     * The parent component for this property.
     */
    get parent(): Component | null;
    set parent(p: Component | null);
    /**
     * The design set for this property, e.g. icalendar vs vcard
     */
    private get _designSet();
    /**
     * Updates the type metadata from the current jCal type and design set.
     *
     * @private
     */
    _updateType(): void;
    /**
     * Hydrate a single value. The act of hydrating means turning the raw jCal
     * value into a potentially wrapped object, for example {@link ICAL.Time}.
     *
     * @private
     * @param index The index of the value to hydrate
     * @return The decorated value.
     */
    private _hydrateValue;
    /**
     * Decorate a single value, returning its wrapped object. This is used by
     * the hydrate function to actually wrap the value.
     *
     * @private
     * @param {?} value         The value to decorate
     * @return {Object}         The decorated value
     */
    private _decorate;
    /**
     * Undecorate a single value, returning its raw jCal data.
     *
     * @private
     * @param {Object} value         The value to undecorate
     * @return {?}                   The undecorated value
     */
    private _undecorate;
    /**
     * Sets the value at the given index while also hydrating it. The passed
     * value can either be a decorated or undecorated value.
     *
     * @private
     * @param {?} value             The value to set
     * @param {Number} index        The index to set it at
     */
    private _setDecoratedValue;
    /**
     * Gets a parameter on the property.
     *
     * @param name Parameter name (lowercase)
     * @return Parameter value
     */
    getParameter(name: string): any[] | string | undefined;
    /**
     * Gets first parameter on the property.
     *
     * @param name Parameter name (lowercase)
     * @return Parameter value
     */
    getFirstParameter(name: string): string | undefined;
    /**
     * Sets a parameter on the property.
     *
     * @param {String}       name     The parameter name
     * @param {Array|String} value    The parameter value
     */
    setParameter(name: string, value: any[] | string): void;
    /**
     * Removes a parameter
     *
     * @param name The parameter name
     */
    removeParameter(name: string): void;
    /**
     * Get the default type based on this property's name.
     *
     * @return The default type for this property
     */
    getDefaultType(): string;
    /**
     * Sets type of property and clears out any existing values of the current
     * type.
     *
     * @param type New iCAL type (see design.*.values)
     */
    resetType(type: string): void;
    /**
     * Finds the first property value.
     *
     * @return First property value
     */
    getFirstValue(): any;
    /**
     * Gets all values on the property.
     *
     * NOTE: this creates an array during each call.
     *
     * @return List of values
     */
    getValues(): any[];
    /**
     * Removes all values from this property
     */
    removeAllValues(): void;
    /**
     * Sets the values of the property.  Will overwrite the existing values.
     * This can only be used for multi-value properties.
     *
     * @param {Array} values    An array of values
     */
    setValues(values: any[]): void;
    /**
     * Sets the current value of the property. If this is a multi-value
     * property, all other values will be removed.
     *
     * @param value New property value.
     */
    setValue(value: string | Record<string, any>): void;
    /**
     * Returns the Object representation of this component. The returned object
     * is a live jCal object and should be cloned if modified.
     */
    toJSON(): Record<string, any>;
    /**
     * The string representation of this component.
     */
    toICALString(): string;
}
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
declare class Duration {
    wrappedJSObject: Duration;
    /**
     * Returns a new ICAL.Duration instance from the passed seconds value.
     *
     * @param {Number} aSeconds       The seconds to create the instance from
     * @return {Duration}        The newly created duration instance
     */
    static fromSeconds(aSeconds: number): Duration;
    /**
     * Checks if the given string is an iCalendar duration value.
     *
     * @param string The raw ical value
     * @return True, if the given value is of the duration ical type
     */
    static isValueString(string: string): boolean;
    /**
     * Creates a new {@link Duration} instance from the passed string.
     *
     * @param {String} aStr       The string to parse
     * @return {Duration}    The created duration instance
     */
    static fromString(aStr: string): Duration;
    /**
     * Creates a new ICAL.Duration instance from the given data object.
     *
     * @param aData An object with members of the duration
     * @return The created duration instance
     */
    static fromData(aData: DurationData): Duration;
    /**
     * Creates a new ICAL.Duration instance.
     *
     * @param data An object with members of the duration
     */
    constructor(data?: DurationData);
    /**
     * The weeks in this duration
     */
    weeks: number;
    /**
     * The days in this duration
     */
    days: number;
    /**
     * The days in this duration
     */
    hours: number;
    /**
     * The minutes in this duration
     */
    minutes: number;
    /**
     * The seconds in this duration
     */
    seconds: number;
    /**
     * The seconds in this duration
     */
    isNegative: boolean;
    /**
     * The class identifier.
     */
    readonly icalclass: string;
    /**
     * The type name, to be used in the jCal object.
     */
    icaltype: string;
    /**
     * Returns a clone of the duration object.
     *
     * @return The cloned object
     */
    clone(): Duration;
    /**
     * The duration value expressed as a number of seconds.
     *
     * @return The duration value in seconds
     */
    toSeconds(): number;
    /**
     * Reads the passed seconds value into this duration object. Afterwards,
     * members like {@link Duration#days days} and {@link Duration#weeks weeks} will be set up
     * accordingly.
     *
     * @param {Number} aSeconds     The duration value in seconds
     * @return {Duration}      Returns this instance
     */
    fromSeconds(aSeconds: number): Duration;
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param aData An object with members of the duration
     */
    fromData(aData?: DurationData): void;
    /**
     * Resets the duration instance to the default values, i.e. PT0S
     */
    reset(): void;
    /**
     * Compares the duration instance with another one.
     *
     * @param aOther The instance to compare with
     * @return -1, 0 or 1 for less/equal/greater
     */
    compare(aOther: Duration): number;
    /**
     * Normalizes the duration instance. For example, a duration with a value
     * of 61 seconds will be normalized to 1 minute and 1 second.
     */
    normalize(): void;
    /**
     * The string representation of this duration.
     */
    toString(): string;
    /**
     * The iCalendar string representation of this duration.
     */
    toICALString(): string;
}
interface TimeData {
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
    /** If true, the instance represents a date (as opposed to a date-time) */
    isDate?: boolean;
    /** Timezone this position occurs in */
    aZone?: Timezone;
}
/**
 * The weekday, 1 = SUNDAY, 7 = SATURDAY. Access via
 * ICAL.Time.MONDAY, ICAL.Time.TUESDAY, ...
 */
declare enum WeekDay {
    SUNDAY = 1,
    MONDAY = 2,
    TUESDAY = 3,
    WEDNESDAY = 4,
    THURSDAY = 5,
    FRIDAY = 6,
    SATURDAY = 7
}
/**
 * @classdesc
 * iCalendar Time representation (similar to JS Date object).  Fully
 * independent of system (OS) timezone / time.  Unlike JS Date, the month
 * January is 1, not zero.
 *
 * @example
 * var time = new ICAL.Time({
 *   year: 2012,
 *   month: 10,
 *   day: 11
 *   minute: 0,
 *   second: 0,
 *   isDate: false
 * });
 *
 *
 * @alias ICAL.Time
 * @class
 */
declare class Time {
    #private;
    wrappedJSObject: Time;
    static _dowCache: Record<number, number>;
    static _wnCache: Record<number, number>;
    protected _time: Required<TimeData>;
    private auto_normalize;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    isDate: boolean;
    /**
     * Returns the days in the given month
     *
     * @param {Number} month      The month to check
     * @param {Number} year       The year to check
     * @return {Number}           The number of days in the month
     */
    static daysInMonth(month: number, year: number): number;
    /**
     * Checks if the year is a leap year
     *
     * @param year The year to check
     * @return True, if the year is a leap year
     */
    static isLeapYear(year: number): boolean;
    /**
     * Create a new ICAL.Time from the day of year and year. The date is returned
     * in floating timezone.
     *
     * @param aDayOfYear The day of year
     * @param aYear      The year to create the instance in
     * @return           The created instance with the calculated date
     */
    static fromDayOfYear(aDayOfYear: number, aYear: number): Time;
    /**
     * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
     *
     * @deprecated Use {@link ICAL.Time.fromDateString} instead
     * @param str  The string to create from
     * @return     The date/time instance
     */
    static fromStringv2(str: string): Time;
    /**
     * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
     *
     * @param aValue The string to create from
     * @return       The date/time instance
     */
    static fromDateString(aValue: string): Time;
    /**
     * Returns a new ICAL.Time instance from a date-time string, e.g
     * 2015-01-02T03:04:05. If a property is specified, the timezone is set up
     * from the property's TZID parameter.
     *
     * @param aValue The string to create from
     * @param prop   The property the date belongs to
     * @return       The date/time instance
     */
    static fromDateTimeString(aValue: string, prop?: Property): Time;
    /**
     * Returns a new ICAL.Time instance from a date or date-time string,
     *
     * @param aValue    The string to create from
     * @param aProperty The property the date belongs to
     * @return          The date/time instance
     */
    static fromString(aValue: string, aProperty?: Property): Time;
    /**
     * Creates a new ICAL.Time instance from the given Javascript Date.
     *
     * @param aDate     The Javascript Date to read, or null to reset
     * @param {Boolean} useUTC  If true, the UTC values of the date will be used
     */
    static fromJSDate(aDate: Date | null, useUTC: boolean): Time;
    /**
     * Creates a new ICAL.Time instance from the the passed data object.
     *
     * @param aData Time initialization
     * @param aZone Timezone this position occurs in
     */
    static fromData: (aData: TimeData, aZone?: Timezone) => Time;
    /**
     * Creates a new ICAL.Time instance from the current moment.
     * The instance is “floating” - has no timezone relation.
     * To create an instance considering the time zone, call
     * ICAL.Time.fromJSDate(new Date(), true)
     */
    static now(): Time;
    /**
     * Returns the date on which ISO week number 1 starts.
     *
     * @see ICAL.Time#weekNumber
     * @param {Number} aYear                  The year to search in
     * @param {Time.weekDay=} aWeekStart The week start weekday, used for calculation.
     * @return {Time}                    The date on which week number 1 starts
     */
    static weekOneStarts(aYear: number, aWeekStart: WeekDay): Time;
    /**
     * Get the dominical letter for the given year. Letters range from A - G for
     * common years, and AG to GF for leap years.
     *
     * @param {Number} yr           The year to retrieve the letter for
     * @return {String}             The dominical letter.
     */
    static getDominicalLetter(yr: number): string;
    /**
     * January 1st, 1970 as an ICAL.Time.
     * @type {Time}
     * @constant
     * @instance
     */
    static get epochTime(): Time;
    static _cmp_attr(a: any, b: any, attr: any): 0 | 1 | -1;
    /**
     * The days that have passed in the year after a given month. The array has
     * two members, one being an array of passed days for non-leap years, the
     * other analog for leap years.
     * @example
     * var isLeapYear = ICAL.Time.isLeapYear(year);
     * var passedDays = ICAL.Time.daysInYearPassedMonth[isLeapYear][month];
     */
    static daysInYearPassedMonth: number[][];
    static readonly SUNDAY = WeekDay.SUNDAY;
    static readonly MONDAY = WeekDay.MONDAY;
    static readonly TUESDAY = WeekDay.TUESDAY;
    static readonly WEDNESDAY = WeekDay.WEDNESDAY;
    static readonly THURSDAY = WeekDay.THURSDAY;
    static readonly FRIDAY = WeekDay.FRIDAY;
    static readonly SATURDAY = WeekDay.SATURDAY;
    /**
     * The default weekday for the WKST part.
     * @constant
     * @default ICAL.Time.MONDAY
     */
    static readonly DEFAULT_WEEK_START = 2; // MONDAY
    /**
     * Creates a new ICAL.Time instance.
     *
     * @param data Time initialization
     * @param zone timezone this position occurs in
     */
    constructor(data?: TimeData, zone?: Timezone);
    /**
     * The class identifier.
     */
    readonly icalclass: "icaltime" | "vcardtime";
    _cachedUnixTime: number | null;
    /**
     * The type name, to be used in the jCal object. This value may change and
     * is strictly defined by the {@link ICAL.Time#isDate isDate} member.
     * @default "date-time"
     */
    get icaltype(): "date-and-or-time" | "date" | "date-time";
    /**
     * The timezone for this time.
     * @type {Timezone}
     */
    zone?: Timezone;
    /**
     * Internal uses to indicate that a change has been made and the next read
     * operation must attempt to normalize the value (for example changing the
     * day to 33).
     */
    private _pendingNormalization;
    /**
     * Returns a clone of the time object.
     *
     * @return The cloned object
     */
    clone(): Time;
    /**
     * Reset the time instance to epoch time
     */
    reset(): void;
    /**
     * Reset the time instance to the given date/time values.
     *
     * @param year     The year to set
     * @param month    The month to set
     * @param day      The day to set
     * @param hour     The hour to set
     * @param minute   The minute to set
     * @param second   The second to set
     * @param timezone The timezone to set
     */
    resetTo(year: number, month: number, day: number, hour: number, minute: number, second: number, timezone?: Timezone): void;
    /**
     * Set up the current instance from the Javascript date value.
     *
     * @param aDate   The Javascript Date to read, or null to reset
     * @param useUTC  If true, the UTC values of the date will be used
     */
    fromJSDate(aDate: Date | null, useUTC?: boolean): this;
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param aData Time initialization
     * @param aZone Timezone this position occurs in
     */
    fromData(aData?: TimeData, aZone?: Timezone): this;
    /**
     * Calculate the day of week.
     * @param aWeekStart The week start weekday, defaults to SUNDAY
     */
    dayOfWeek(aWeekStart?: WeekDay): WeekDay;
    /**
     * Calculate the day of year.
     */
    dayOfYear(): number;
    /**
     * Returns a copy of the current date/time, rewound to the start of the
     * week. The resulting ICAL.Time instance is of icaltype date, even if this
     * is a date-time.
     *
     * @param aWeekStart The week start weekday, defaults to SUNDAY
     * @return The start of the week (cloned)
     */
    startOfWeek(aWeekStart?: WeekDay): Time;
    /**
     * Returns a copy of the current date/time, shifted to the end of the week.
     * The resulting ICAL.Time instance is of icaltype date, even if this is a
     * date-time.
     *
     * @param aWeekStart The week start weekday, defaults to SUNDAY
     * @return The end of the week (cloned)
     */
    endOfWeek(aWeekStart?: WeekDay): Time;
    /**
     * Returns a copy of the current date/time, rewound to the start of the
     * month. The resulting ICAL.Time instance is of icaltype date, even if
     * this is a date-time.
     *
     * @return The start of the month (cloned)
     */
    startOfMonth(): Time;
    /**
     * Returns a copy of the current date/time, shifted to the end of the
     * month.  The resulting ICAL.Time instance is of icaltype date, even if
     * this is a date-time.
     *
     * @return The end of the month (cloned)
     */
    endOfMonth(): Time;
    /**
     * Returns a copy of the current date/time, rewound to the start of the
     * year. The resulting ICAL.Time instance is of icaltype date, even if
     * this is a date-time.
     *
     * @return The start of the year (cloned)
     */
    startOfYear(): Time;
    /**
     * Returns a copy of the current date/time, shifted to the end of the
     * year.  The resulting ICAL.Time instance is of icaltype date, even if
     * this is a date-time.
     *
     * @return The end of the year (cloned)
     */
    endOfYear(): Time;
    /**
     * First calculates the start of the week, then returns the day of year for
     * this date. If the day falls into the previous year, the day is zero or negative.
     *
     * @param aFirstDayOfWeek The week start weekday, defaults to SUNDAY
     * @return The calculated day of year
     */
    startDoyWeek(aFirstDayOfWeek?: WeekDay): number;
    /**
     * Get the dominical letter for the current year. Letters range from A - G
     * for common years, and AG to GF for leap years.
     *
     * @param {Number} yr           The year to retrieve the letter for
     * @return {String}             The dominical letter.
     */
    getDominicalLetter(): string;
    /**
     * Finds the nthWeekDay relative to the current month (not day).  The
     * returned value is a day relative the month that this month belongs to so
     * 1 would indicate the first of the month and 40 would indicate a day in
     * the following month.
     *
     * @param {Number} aDayOfWeek   Day of the week see the day name constants
     * @param {Number} aPos         Nth occurrence of a given week day values
     *        of 1 and 0 both indicate the first weekday of that type. aPos may
     *        be either positive or negative
     *
     * @return {Number} numeric value indicating a day relative
     *                   to the current month of this time object
     */
    nthWeekDay(aDayOfWeek: number, aPos: number): number;
    /**
     * Checks if current time is the nth weekday, relative to the current
     * month.  Will always return false when rule resolves outside of current
     * month.
     *
     * @param {Time.weekDay} aDayOfWeek       Day of week to check
     * @param {Number} aPos                        Relative position
     * @return {Boolean}                           True, if it is the nth weekday
     */
    isNthWeekDay(aDayOfWeek: WeekDay, aPos: number): boolean;
    /**
     * Calculates the ISO 8601 week number. The first week of a year is the
     * week that contains the first Thursday. The year can have 53 weeks, if
     * January 1st is a Friday.
     *
     * Note there are regions where the first week of the year is the one that
     * starts on January 1st, which may offset the week number. Also, if a
     * different week start is specified, this will also affect the week
     * number.
     *
     * @see ICAL.Time.weekOneStarts
     * @param {Time.weekDay} aWeekStart        The weekday the week starts with
     * @return {Number}                             The ISO week number
     */
    weekNumber(aWeekStart: WeekDay): number;
    /**
     * Adds the duration to the current time. The instance is modified in
     * place.
     *
     * @param {Duration} aDuration         The duration to add
     */
    addDuration(aDuration: Duration): void;
    /**
     * Subtract the date details (_excluding_ timezone).  Useful for finding
     * the relative difference between two time objects excluding their
     * timezone differences.
     *
     * @param aDate The date to subtract
     * @return      The difference as a duration
     */
    subtractDate(aDate: Time): Duration;
    /**
     * Subtract the date details, taking timezones into account.
     *
     * @param aDate The date to subtract
     * @return      The difference in duration
     */
    subtractDateTz(aDate: Time): Duration;
    /**
     * Compares the ICAL.Time instance with another one.
     *
     * @param aOther The instance to compare with
     * @return       -1, 0 or 1 for less/equal/greater
     */
    compare(other: Duration): number;
    /**
     * Compares only the date part of this instance with another one.
     *
     * @param other The instance to compare with
     * @param tz    The timezone to compare in
     * @return      -1, 0 or 1 for less/equal/greater
     */
    compareDateOnlyTz(other: Duration, tz: Timezone): number;
    /**
     * Convert the instance into another timezone. The returned ICAL.Time
     * instance is always a copy.
     *
     * @param zone The zone to convert to
     * @return     The copy, converted to the zone
     */
    convertToZone(zone: Timezone): Time;
    /**
     * Calculates the UTC offset of the current date/time in the timezone it is
     * in.
     *
     * @return UTC offset in seconds
     */
    utcOffset(): number;
    /**
     * Returns an RFC 5545 compliant ical representation of this object.
     *
     * @return ical date/date-time
     */
    toICALString(): string;
    /**
     * The string representation of this date/time, in jCal form
     * (including : and - separators).
     */
    toString(): string;
    /**
     * Converts the current instance to a Javascript date
     */
    toJSDate(): Date;
    protected _normalize(): this;
    /**
     * Adjust the date/time by the given offset
     *
     * @param aExtraDays    The extra amount of days
     * @param aExtraHours   The extra amount of hours
     * @param aExtraMinutes The extra amount of minutes
     * @param aExtraSeconds The extra amount of seconds
     * @param aTime         The time to adjust, defaults to the current instance.
     */
    adjust(aExtraDays: number, aExtraHours: number, aExtraMinutes: number, aExtraSeconds: number, aTime?: Required<TimeData>): this;
    /**
     * Sets up the current instance from unix time, the number of seconds since
     * January 1st, 1970.
     *
     * @param seconds The seconds to set up with
     */
    fromUnixTime(seconds: number): void;
    /**
     * Converts the current instance to seconds since January 1st 1970.
     *
     * @return Seconds since 1970
     */
    toUnixTime(): number;
    /**
     * Converts time to into Object which can be serialized then re-created
     * using the constructor.
     *
     * @example
     * // toJSON will automatically be called
     * var json = JSON.stringify(mytime);
     *
     * var deserialized = JSON.parse(json);
     *
     * var time = new ICAL.Time(deserialized);
     *
     * @return {Object}
     */
    toJSON(): Record<string, any>;
}
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
declare class Timezone {
    #private;
    private changes;
    private wrappedJSObject;
    static _compare_change_fn(a: Change, b: Change): 0 | 1 | -1;
    /**
     * Convert the date/time from one zone to the next.
     *
     * @param tt        The time to convert
     * @param from_zone The source zone to convert from
     * @param to_zone   The target zone to convert to
     * @return          The converted date/time object
     */
    static convert_time(tt: Time, from_zone: Timezone, to_zone: Timezone): Time | null;
    /**
     * Creates a new ICAL.Timezone instance from the passed data object.
     *
     * @param aData options for class
     */
    static fromData(aData: TimezoneData | Component): Timezone;
    static get utcTimezone(): Timezone;
    static get localTimezone(): Timezone;
    /**
     * Adjust a timezone change object.
     * @private
     * @param change     The timezone change object
     * @param days       The extra amount of days
     * @param hours      The extra amount of hours
     * @param minutes    The extra amount of minutes
     * @param seconds    The extra amount of seconds
     */
    private static adjust_change;
    static _minimumExpansionYear: number;
    static EXTRA_COVERAGE: number;
    /**
     * Creates a new ICAL.Timezone instance, by passing in a tzid and component.
     *
     * @param data options for class
     */
    constructor(data?: TimezoneData | Component);
    /**
     * Timezone identifier
     */
    tzid: string;
    /**
     * Timezone location
     */
    location: string;
    /**
     * Alternative timezone name, for the string representation
     */
    tznames: string;
    /**
     * The primary latitude for the timezone.
     */
    latitude: number;
    /**
     * The primary longitude for the timezone.
     */
    longitude: number;
    /**
     * The vtimezone component for this timezone.
     */
    component: Component | null;
    /**
     * The year this timezone has been expanded to. All timezone transition
     * dates until this year are known and can be used for calculation
     */
    private expandedUntilYear;
    /**
     * The class identifier.
     */
    readonly icalclass = "icaltimezone";
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param aData options for class
     */
    fromData(aData?: TimezoneData | Component): this;
    /**
     * Finds the utcOffset the given time would occur in this timezone.
     *
     * @param {Time} tt        The time to check for
     * @return {Number} utc offset in seconds
     */
    utcOffset(tt: Time): number;
    private _findNearbyChange;
    private _ensureCoverage;
    private _expandComponent;
    /**
     * The string representation of this timezone.
     */
    toString(): string;
}
/**
 * Wraps a jCal component, adding convenience methods to add, remove and update subcomponents and
 * properties.
 */
declare class Component {
    private jCal;
    parent: Component | null;
    private _components?;
    private _properties?;
    /**
     * Create an {@link Component} by parsing the passed iCalendar string.
     *
     * @param str The iCalendar string to parse
     */
    static fromString(str: string): Component;
    /**
     * Creates a new ICAL.Component instance.
     *
     * @param jCal Raw jCal component data OR name of new
     * @param parent Parent component to associate
     */
    constructor(jCal: any[] | string, parent?: Component);
    /**
     * Hydrated properties are inserted into the _properties array at the same
     * position as in the jCal array, so it is possible that the array contains
     * undefined values for unhydrdated properties. To avoid iterating the
     * array when checking if all properties have been hydrated, we save the
     * count here.
     */
    private _hydratedPropertyCount;
    /**
     * The same count as for _hydratedPropertyCount, but for subcomponents
     */
    private _hydratedComponentCount;
    /**
     * A cache of hydrated time zone objects which may be used by consumers, keyed
     * by time zone ID.
     */
    private _timezoneCache;
    /**
     * The name of this component
     */
    get name(): any;
    private _hydrateComponent;
    private _hydrateProperty;
    /**
     * Finds first sub component, optionally filtered by name.
     *
     * @param name Optional name to filter by
     * @return The found subcomponent
     */
    getFirstSubcomponent(name?: string): Component | null;
    /**
     * Finds all sub components, optionally filtering by name.
     *
     * @param name Optional name to filter by
     * @return The found sub components
     */
    getAllSubcomponents(name?: string): Component[];
    /**
     * Returns true when a named property exists.
     *
     * @param name The property name
     * @return True, when property is found
     */
    hasProperty(name: string): boolean;
    /**
     * Finds the first property, optionally with the given name.
     *
     * @param name Lowercase property name
     * @return The found property
     */
    getFirstProperty(name?: string): Property | null;
    /**
     * Returns first property's value, if available.
     *
     * @param name Lowercase property name
     * @return The found property value.
     */
    getFirstPropertyValue(name?: string): any | null;
    /**
     * Get all properties in the component, optionally filtered by name.
     *
     * @param name Lowercase property name
     * @return List of properties
     */
    getAllProperties(name?: string): Property[];
    private _removeObjectByIndex;
    private _removeObject;
    _removeAllObjects(jCalIndex: number, cache: string, name?: string): void;
    /**
     * Adds a single sub component.
     *
     * @param component The component to add
     * @return The passed in component
     */
    addSubcomponent(component: Component): Component;
    /**
     * Removes a single component by name or the instance of a specific
     * component.
     *
     * @param nameOrComp Name of component, or component
     * @return True when comp is removed
     */
    removeSubcomponent(nameOrComp: Component | string): boolean;
    /**
     * Removes all components or (if given) all components by a particular
     * name.
     *
     * @param name Lowercase component name
     */
    removeAllSubcomponents(name?: string): void;
    /**
     * Adds an {@link Property} to the component.
     *
     * @param property The property to add
     * @return The passed in property
     */
    addProperty(property: Property): Property;
    /**
     * Helper method to add a property with a value to the component.
     *
     * @param name Property name to add
     * @param value Property value
     * @return The created property
     */
    addPropertyWithValue(name: string, value: string | number | object): Property;
    /**
     * Helper method that will update or create a property of the given name
     * and sets its value. If multiple properties with the given name exist,
     * only the first is updated.
     *
     * @param name Property name to update
     * @param value Property value
     * @return The created property
     */
    updatePropertyWithValue(name: string, value: string | number | object): Property;
    /**
     * Removes a single property by name or the instance of the specific
     * property.
     *
     * @param nameOrProp     Property name or instance to remove
     * @return True, when deleted
     */
    removeProperty(nameOrProp: string | Property): boolean;
    /**
     * Removes all properties associated with this component, optionally
     * filtered by name.
     *
     * @param name Lowercase property name
     * @return True, when deleted
     */
    removeAllProperties(name?: string): boolean;
    /**
     * Returns the Object representation of this component. The returned object
     * is a live jCal object and should be cloned if modified.
     */
    toJSON(): object;
    /**
     * The string representation of this component.
     */
    toString(): string;
    /**
     * Retrieve a time zone definition from the component tree, if any is present.
     * If the tree contains no time zone definitions or the TZID cannot be
     * matched, returns null.
     *
     * @param tzid The ID of the time zone to retrieve
     * @return The time zone corresponding to the ID, or null
     */
    getTimeZoneByID(tzid: string): Timezone | null;
}
interface RecurExpansionOptions {
    /** Start time of the event */
    dtstart: Time;
    /** Component for expansion, required if not resuming. */
    component?: Component;
}
/**
 * Primary class for expanding recurring rules.  Can take multiple rrules, rdates, exdate(s) and
 * iterate (in order) over each next occurrence.
 *
 * Once initialized this class can also be serialized saved and continue iteration from the last
 * point.
 *
 * NOTE: it is intended that this class is to be used with {@link ICAL.Event} which handles recurrence
 * exceptions.
 *
 * @example
 * // assuming event is a parsed ical component
 * var event;
 *
 * var expand = new ICAL.RecurExpansion({
 *   component: event,
 *   dtstart: event.getFirstPropertyValue('dtstart')
 * });
 *
 * // remember there are infinite rules so it is a good idea to limit the scope of the iterations
 * // then resume later on.
 *
 * // next is always an ICAL.Time or null
 * var next;
 *
 * while (someCondition && (next = expand.next())) {
 *   // do something with next
 * }
 *
 * // save instance for later
 * var json = JSON.stringify(expand);
 *
 * //...
 *
 * // NOTE: if the component's properties have changed you will need to rebuild the class and start
 * // over. This only works when the component's recurrence info is the same.
 * var expand = new ICAL.RecurExpansion(JSON.parse(json));
 *
 * @class
 * @alias ICAL.RecurExpansion
 */
declare class RecurExpansion {
    private ruleDates;
    private exDates;
    /**
     * Creates a new ICAL.RecurExpansion instance.
     *
     * The options object can be filled with the specified initial values. It can also contain
     * additional members, as a result of serializing a previous expansion state, as shown in the
     * example.
     *
     * @class
     * @alias ICAL.RecurExpansion
     * @param options Recurrence expansion options
     */
    constructor(options: RecurExpansionOptions);
    /**
     * True when iteration is fully completed.
     */
    complete: boolean;
    /**
     * Array of rrule iterators.
     */
    private ruleIterators;
    /**
     * Array of rdate instances.
     */
    private ruleDates;
    /**
     * Array of exdate instances.
     */
    private exDates;
    /**
     * Current position in ruleDates array.
     */
    private ruleDateInc;
    /**
     * Current position in exDates array
     */
    private exDateInc;
    /**
     * Current negative date.
     */
    private exDate;
    /**
     * Current additional date.
     */
    private ruleDate;
    /**
     * Start date of recurring rules.
     */
    dtstart: Time;
    /**
     * Last expanded time
     */
    last: Time;
    /**
     * Initialize the recurrence expansion from the data object. The options
     * object may also contain additional members, see the
     * {@link ICAL.RecurExpansion constructor} for more details.
     *
     * @param {Object} options
     *        Recurrence expansion options
     * @param {ICAL.Time} options.dtstart
     *        Start time of the event
     * @param {ICAL.Component=} options.component
     *        Component for expansion, required if not resuming.
     */
    fromData(options: RecurExpansionOptions): void;
    /**
     * Retrieve the next occurrence in the series.
     */
    next(): Time;
    /**
     * Converts object into a serialize-able format. This format can be passed
     * back into the expansion to resume iteration.
     */
    toJSON(): Record<string, any>;
    /**
     * Extract all dates from the properties in the given component. The
     * properties will be filtered by the property name.
     *
     * @private
     * @param component        The component to search in
     * @param propertyName             The property name to search for
     * @return {ICAL.Time[]}                    The extracted dates.
     */
    private _extractDates;
    /**
     * Initialize the recurrence expansion.
     *
     * @private
     * @param {ICAL.Component} component    The component to initialize from.
     */
    private _init;
    /**
     * Advance to the next exdate
     */
    private _nextExDay;
    /**
     * Advance to the next rule date
     */
    private _nextRuleDay;
    /**
     * Find and return the recurrence rule with the most recent event and
     * return it.
     *
     * @return Found iterator.
     */
    private _nextRecurrenceIter;
}
interface RecurIteratorData {
    /** The iterator options */
    options?: object;
    /** The rule to iterate. */
    rule: Recur;
    /** The start date of the event. */
    dtstart: Time;
    /**
     * When true, assume that options are
     * from a previously constructed iterator. Initialization will not be
     * repeated.
     */
    initialized?: boolean;
}
/**
 * An iterator for a single recurrence rule. This class usually doesn't have to be instanciated
 * directly, the convenience method {@link ICAL.Recur#iterator} can be used.
 *
 * @class
 * @alias ICAL.RecurIterator
 */
declare class RecurIterator {
    static _indexMap: {
        BYSECOND: number;
        BYMINUTE: number;
        BYHOUR: number;
        BYDAY: number;
        BYMONTHDAY: number;
        BYYEARDAY: number;
        BYWEEKNO: number;
        BYMONTH: number;
        BYSETPOS: number;
    };
    static _expandMap: {
        SECONDLY: number[];
        MINUTELY: number[];
        HOURLY: number[];
        DAILY: number[];
        WEEKLY: number[];
        MONTHLY: number[];
        YEARLY: number[];
    };
    static UNKNOWN: number;
    static CONTRACT: number;
    static EXPAND: number;
    static ILLEGAL: number;
    /**
     * Creates a new ICAL.RecurIterator instance. The options object may contain additional members
     * when resuming iteration from a previous run.
     *
     * @param  options The iterator options
     */
    constructor(options: RecurIteratorData);
    /**
     * True when iteration is finished.
     */
    completed: boolean;
    /**
     * The rule that is being iterated
     */
    rule: Recur;
    /**
     * The start date of the event being iterated.
     */
    dtstart: Time;
    /**
     * The last occurrence that was returned from the
     * {@link ICAL.RecurIterator#next} method.
     */
    last: Time;
    /**
     * The sequence number from the occurrence
     */
    occurrence_number: number;
    /**
     * The indices used for the {@link ICAL.RecurIterator#by_data} object.
     */
    private by_indices;
    /**
     * If true, the iterator has already been initialized
     */
    private initialized;
    /**
     * The initializd by-data.
     */
    private by_data;
    /**
     * The expanded yeardays
     */
    private days;
    /**
     * The index in the {@link ICAL.RecurIterator#days} array.
     */
    private days_index;
    /**
     * Initialize the recurrence iterator from the passed data object. This
     * method is usually not called directly, you can initialize the iterator
     * through the constructor.
     *
     * @param {Object} options                The iterator options
     * @param {ICAL.Recur} options.rule       The rule to iterate.
     * @param {ICAL.Time} options.dtstart     The start date of the event.
     * @param {Boolean=} options.initialized  When true, assume that options are
     *        from a previously constructed iterator. Initialization will not be
     *        repeated.
     */
    fromData(options: RecurIteratorData): void;
    /**
     * Initialize the iterator
     * @private
     */
    init(): void;
    /**
     * Retrieve the next occurrence from the iterator.
     */
    next(): Time | null;
    next_second(): number;
    increment_second(inc: any): void;
    next_minute(): number;
    increment_minute(inc: number): void;
    next_hour(): number;
    increment_hour(inc: number): void;
    next_day(): number;
    next_week(): number;
    /**
     * Normalize each by day rule for a given year/month.
     * Takes into account ordering and negative rules
     *
     * @private
     * @param year  Current year.
     * @param month Current month.
     * @param rules Array of rules.
     * @return sorted and normalized rules.
     *         Negative rules will be expanded to their
     *         correct positive values for easier processing.
     */
    private normalizeByMonthDayRules;
    /**
     * NOTES:
     * We are given a list of dates in the month (BYMONTHDAY) (23, etc..)
     * Also we are given a list of days (BYDAY) (MO, 2SU, etc..) when
     * both conditions match a given date (this.last.day) iteration stops.
     *
     * @private
     * @param isInit     When given true will not increment the
     *                                current day (this.last).
     */
    private _byDayAndMonthDay;
    next_month(): number;
    next_weekday_by_week(): number;
    next_year(): 0 | 1;
    _nextByYearDay(): void;
    /**
     * @param dow (eg: '1TU', '-1MO')
     * @param aWeekStart The week start weekday
     * @return [pos, numericDow] (eg: [1, 3]) numericDow is relative to aWeekStart
     */
    ruleDayOfWeek(dow: string, aWeekStart?: WeekDay): number[] | readonly [
        number,
        number
    ];
    next_generic(aRuleType: any, aInterval: any, aDateAttr: any, aFollowingAttr: any, aPreviousIncr: any): number;
    increment_monthday(inc: any): void;
    increment_month(): void;
    increment_year(inc: number): void;
    increment_generic(inc: number, aDateAttr: any, aFactor: any, aNextIncrement: any): void;
    has_by_data(aRuleType: any): boolean;
    expand_year_days(aYear: number): number;
    expand_by_day(aYear: any): number[];
    is_day_in_byday(tt: any): 0 | 1;
    /**
     * Checks if given value is in BYSETPOS.
     *
     * @private
     * @param {Numeric} aPos position to check for.
     * @return {Boolean} false unless BYSETPOS rules exist
     *                   and the given value is present in rules.
     */
    check_set_position(aPos: number): boolean;
    sort_byday_rules(aRules: any): void;
    check_contract_restriction(aRuleType: any, v: any): boolean;
    check_contracting_rules(): boolean;
    setup_defaults(aRuleType: any, req: any, deftime: any): any;
    /**
     * Convert iterator into a serialize-able object.  Will preserve current
     * iteration sequence to ensure the seamless continuation of the recurrence
     * rule.
     */
    toJSON(): any;
}
/**
 * Possible frequency values for the FREQ part
 * (YEARLY, MONTHLY, WEEKLY, DAILY, HOURLY, MINUTELY, SECONDLY)
 */
type FrequencyValue = (typeof ALLOWED_FREQ)[number];
declare const ALLOWED_FREQ: readonly [
    "SECONDLY",
    "MINUTELY",
    "HOURLY",
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "YEARLY"
];
/**
 * An object with members of the recurrence
 */
interface RecurData {
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
declare class Recur {
    wrappedJSObject: Recur;
    /**
     * Creates a new {@link ICAL.Recur} instance from the passed string.
     *
     * @param string The string to parse
     * @return The created recurrence instance
     */
    static fromString(string: string): Recur;
    /**
     * Creates a new {@link ICAL.Recur} instance using members from the passed
     * data object.
     *
     * @param aData An object with members of the recurrence
     */
    static fromData(aData: RecurData): Recur;
    /**
     * Converts a recurrence string to a data object, suitable for the fromData
     * method.
     *
     * @private
     * @param string The string to parse
     * @param fmtIcal If true, the string is considered to be an iCalendar string
     * @return The recurrence instance
     */
    static _stringToData(string: string, fmtIcal: boolean): RecurData;
    /**
     * Convert an ical representation of a day (SU, MO, etc..)
     * into a numeric value of that day.
     *
     * @param string     The iCalendar day name
     * @param aWeekStart The week start weekday, defaults to SUNDAY
     * @return           Numeric value of given day
     */
    static icalDayToNumericDay(string: string, aWeekStart?: WeekDay): number;
    /**
     * Convert a numeric day value into its ical representation (SU, MO, etc..)
     *
     * @param num        Numeric value of given day
     * @param aWeekStart The week start weekday, defaults to SUNDAY
     * @return           The ICAL day value, e.g SU,MO,...
     */
    static numericDayToIcalDay(num: number, aWeekStart?: WeekDay): string;
    /**
     * Create a new instance of the Recur class.
     *
     * @param data An object with members of the recurrence
     */
    constructor(data: RecurData);
    /**
     * An object holding the BY-parts of the recurrence rule
     */
    parts: object;
    /**
     * The interval value for the recurrence rule.
     */
    interval: number;
    /**
     * The week start day
     */
    wkst: WeekDay;
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
    readonly icalclass = "icalrecur";
    /**
     * The type name, to be used in the jCal object.
     */
    readonly icaltype = "recur";
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
    iterator(aStart: Time): RecurIterator;
    /**
     * Returns a clone of the recurrence object.
     *
     * @return The cloned object
     */
    clone(): Recur;
    /**
     * Checks if the current rule is finite, i.e. has a count or until part.
     *
     * @return True, if the rule is finite
     */
    isFinite(): boolean;
    /**
     * Checks if the current rule has a count part, and not limited by an until
     * part.
     *
     * @return True, if the rule is by count
     */
    isByCount(): boolean;
    /**
     * Adds a component (part) to the recurrence rule. This is not a component
     * in the sense of {@link ICAL.Component}, but a part of the recurrence
     * rule, i.e. BYMONTH.
     *
     * @param aType  The name of the component part
     * @param aValue The component value
     */
    addComponent(aType: string, aValue: string | any[]): void;
    /**
     * Sets the component value for the given by-part.
     *
     * @param aType        The component part name
     * @param aValues      The component values
     */
    setComponent(aType: string, aValues: any[]): void;
    /**
     * Gets (a copy) of the requested component value.
     *
     * @param aType The component part name
     * @return      The component part value
     */
    getComponent(aType: string): any[];
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
    getNextOccurrence(aStartTime: Time, aRecurrenceId: Time): Time;
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param data An object with members of the recurrence
     */
    fromData(data: RecurData): void;
    /**
     * The jCal representation of this recurrence type.
     */
    toJSON(): object;
    /**
     * The string representation of this recurrence rule.
     */
    toString(): string;
}
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
declare class Event {
    private component;
    private _rangeExceptionCache;
    private rangeExceptions;
    /**
     * Creates a new ICAL.Event instance.
     *
     * @param component The ICAL.Component to base this event on
     * @param options Options for this event
     */
    constructor(component?: Component, options?: {
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
    });
    static THISANDFUTURE: string;
    /**
     * List of related event exceptions.
     */
    exceptions: Event[];
    /**
     * When true, will verify exceptions are related by their UUID.
     */
    strictExceptions: boolean;
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
    relateException(obj: Component | Event): void;
    /**
     * Checks if this record is an exception and has the RANGE=THISANDFUTURE
     * value.
     *
     * @return True, when exception is within range
     */
    modifiesFuture(): boolean;
    /**
     * Finds the range exception nearest to the given date.
     *
     * @param time usually an occurrence time of an event
     * @return the related event/exception or null
     */
    findRangeException(time: Time): string | null;
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
    getOccurrenceDetails(occurrence: Time): OccurrenceDetails;
    /**
     * Builds a recur expansion instance for a specific point in time (defaults
     * to startDate).
     *
     * @param startTime     Starting point for expansion
     * @return Expansion object
     */
    iterator(startTime: Time): RecurExpansion;
    /**
     * Checks if the event is recurring
     *
     * @return True, if event is recurring
     */
    isRecurring(): boolean;
    /**
     * Checks if the event describes a recurrence exception. See
     * {@tutorial terminology} for details.
     *
     * @return True, if the event describes a recurrence exception
     */
    isRecurrenceException(): boolean;
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
    getRecurrenceTypes(): Record<FrequencyValue, boolean>;
    /**
     * The uid of this event
     */
    get uid(): string | null;
    set uid(value: string | null);
    /**
     * The start date
     */
    get startDate(): Time;
    set startDate(value: Time);
    /**
     * The end date. This can be the result directly from the property, or the
     * end date calculated from start date and duration. Setting the property
     * will remove any duration properties.
     */
    get endDate(): Time;
    set endDate(value: Time);
    /**
     * The duration. This can be the result directly from the property, or the
     * duration calculated from start date and end date. Setting the property
     * will remove any `dtend` properties.
     * @type {Duration}
     */
    get duration(): any;
    set duration(value: any);
    /**
     * The location of the event.
     */
    get location(): string;
    set location(value: string);
    /**
     * The attendees in the event
     */
    get attendees(): Property[];
    /**
     * The event summary
     */
    get summary(): string;
    set summary(value: string);
    /**
     * The event description.
     */
    get description(): string;
    set description(value: string);
    /**
     * The event color from [rfc7986](https://datatracker.ietf.org/doc/html/rfc7986)
     */
    get color(): string;
    set color(value: string);
    /**
     * The organizer value as an uri. In most cases this is a mailto: uri, but
     * it can also be something else, like urn:uuid:...
     */
    get organizer(): string;
    set organizer(value: string);
    /**
     * The sequence value for this event. Used for scheduling
     * see {@tutorial terminology}.
     */
    get sequence(): number;
    set sequence(value: number);
    /**
     * The recurrence id for this event. See {@tutorial terminology} for details.
     */
    get recurrenceId(): Time;
    set recurrenceId(value: Time);
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
    private _setTime;
    _setProp(name: string, value: any): void;
    _firstProp(name: string): any;
    /**
     * The string representation of this event.
     */
    toString(): string;
}
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
declare class ComponentParser {
    /**
     * Creates a new ICAL.ComponentParser instance.
     *
     * @param options Component parser options
     */
    constructor(options?: {
        /** Whether events should be parsed */
        parseEvent?: boolean;
        /** Whether timezones should be parsed */
        parseTimezone?: boolean;
    });
    /**
     * When true, parse events
     */
    parseEvent: boolean;
    /**
     * When true, parse timezones
     */
    parseTimezone: boolean;
    /* SAX like events here for reference */
    /**
     * Fired when parsing is complete
     */
    oncomplete: () => void;
    /**
     * Fired if an error occurs during parsing.
     *
     * @callback
     * @param err details of error
     */
    onerror: (err: Error) => void;
    /**
     * Fired when a top level component (VTIMEZONE) is found
     * @param component     Timezone object
     */
    ontimezone: (component: Timezone) => void;
    /**
     * Fired when a top level component (VEVENT) is found.
     * @param component    Top level component
     */
    onevent: (component: Event) => void;
    /**
     * Process a string or parse ical object.  This function itself will return
     * nothing but will start the parsing process.
     *
     * Events must be registered prior to calling this method.
     *
     * @param ical The component to process, either in its final form, as a jCal
     *    Object, or string representation
     */
    process(ical: Component | string | Record<string, any>): void;
}
declare namespace helpers {
    /**
     * A designSet describes value, parameter and property data. It is used by
     * the parser and stringifier in components and properties to determine they
     * should be represented.
     */
    interface DesignSet {
        /** Definitions for value types, keys are type names */
        value: Record<string, any>;
        /** Definitions for params, keys are param names */
        param: Record<string, any>;
        /** Definitions for properties, keys are property names */
        property: Record<string, any>;
        /** If content lines may include a group name */
        propertyGroups: boolean;
    }
    /**
     * The design data, used by the parser to determine types for properties and
     * other metadata needed to produce correct jCard/jCal data.
     */
    const design: {
        strict: boolean;
        defaultSet: DesignSet;
        defaultType: string;
        components: {
            vcard: DesignSet;
            vcard3: DesignSet;
            vevent: DesignSet;
            vtodo: DesignSet;
            vjournal: DesignSet;
            valarm: DesignSet;
            vtimezone: DesignSet;
            daylight: DesignSet;
            standard: DesignSet;
        };
        icalendar: DesignSet;
        vcard: DesignSet;
        vcard3: DesignSet;
        getDesignSet(componentName: string): DesignSet;
    };
    /**
     * Provides a layer on top of the raw jCal object for manipulating a single property, with its
     * parameters and value.
     *
     * @class
     * @alias ICAL.Property
     */
    class Property {
        private _parent;
        private _values?;
        private isDecorated?;
        private isMultiValue?;
        private isStructuredValue?;
        jCal: any[];
        /**
         * Create an {@link ICAL.Property} by parsing the passed iCalendar string.
         *
         * @param str The iCalendar string to parse
         * @param designSet The design data to use for this property
         * @return The created iCalendar property
         */
        static fromString(str: string, designSet: DesignSet): Property;
        /**
         * Creates a new ICAL.Property instance.
         *
         * It is important to note that mutations done in the wrapper directly mutate the jCal object used
         * to initialize.
         *
         * Can also be used to create new properties by passing the name of the property (as a String).
         *
         * @param jCal Raw jCal representation OR the new name of the property
         * @param parent Parent component
         */
        constructor(jCal: any[] | string, parent?: Component);
        /**
         * The value type for this property
         */
        get type(): string;
        /**
         * The name of this property, in lowercase.
         */
        get name(): string;
        /**
         * The parent component for this property.
         */
        get parent(): Component | null;
        set parent(p: Component | null);
        /**
         * The design set for this property, e.g. icalendar vs vcard
         */
        private get _designSet();
        /**
         * Updates the type metadata from the current jCal type and design set.
         *
         * @private
         */
        _updateType(): void;
        /**
         * Hydrate a single value. The act of hydrating means turning the raw jCal
         * value into a potentially wrapped object, for example {@link ICAL.Time}.
         *
         * @private
         * @param index The index of the value to hydrate
         * @return The decorated value.
         */
        private _hydrateValue;
        /**
         * Decorate a single value, returning its wrapped object. This is used by
         * the hydrate function to actually wrap the value.
         *
         * @private
         * @param {?} value         The value to decorate
         * @return {Object}         The decorated value
         */
        private _decorate;
        /**
         * Undecorate a single value, returning its raw jCal data.
         *
         * @private
         * @param {Object} value         The value to undecorate
         * @return {?}                   The undecorated value
         */
        private _undecorate;
        /**
         * Sets the value at the given index while also hydrating it. The passed
         * value can either be a decorated or undecorated value.
         *
         * @private
         * @param {?} value             The value to set
         * @param {Number} index        The index to set it at
         */
        private _setDecoratedValue;
        /**
         * Gets a parameter on the property.
         *
         * @param name Parameter name (lowercase)
         * @return Parameter value
         */
        getParameter(name: string): any[] | string | undefined;
        /**
         * Gets first parameter on the property.
         *
         * @param name Parameter name (lowercase)
         * @return Parameter value
         */
        getFirstParameter(name: string): string | undefined;
        /**
         * Sets a parameter on the property.
         *
         * @param {String}       name     The parameter name
         * @param {Array|String} value    The parameter value
         */
        setParameter(name: string, value: any[] | string): void;
        /**
         * Removes a parameter
         *
         * @param name The parameter name
         */
        removeParameter(name: string): void;
        /**
         * Get the default type based on this property's name.
         *
         * @return The default type for this property
         */
        getDefaultType(): string;
        /**
         * Sets type of property and clears out any existing values of the current
         * type.
         *
         * @param type New iCAL type (see design.*.values)
         */
        resetType(type: string): void;
        /**
         * Finds the first property value.
         *
         * @return First property value
         */
        getFirstValue(): any;
        /**
         * Gets all values on the property.
         *
         * NOTE: this creates an array during each call.
         *
         * @return List of values
         */
        getValues(): any[];
        /**
         * Removes all values from this property
         */
        removeAllValues(): void;
        /**
         * Sets the values of the property.  Will overwrite the existing values.
         * This can only be used for multi-value properties.
         *
         * @param {Array} values    An array of values
         */
        setValues(values: any[]): void;
        /**
         * Sets the current value of the property. If this is a multi-value
         * property, all other values will be removed.
         *
         * @param value New property value.
         */
        setValue(value: string | Record<string, any>): void;
        /**
         * Returns the Object representation of this component. The returned object
         * is a live jCal object and should be cloned if modified.
         */
        toJSON(): Record<string, any>;
        /**
         * The string representation of this component.
         */
        toICALString(): string;
    }
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
    class Duration {
        wrappedJSObject: Duration;
        /**
         * Returns a new ICAL.Duration instance from the passed seconds value.
         *
         * @param {Number} aSeconds       The seconds to create the instance from
         * @return {Duration}        The newly created duration instance
         */
        static fromSeconds(aSeconds: number): Duration;
        /**
         * Checks if the given string is an iCalendar duration value.
         *
         * @param string The raw ical value
         * @return True, if the given value is of the duration ical type
         */
        static isValueString(string: string): boolean;
        /**
         * Creates a new {@link Duration} instance from the passed string.
         *
         * @param {String} aStr       The string to parse
         * @return {Duration}    The created duration instance
         */
        static fromString(aStr: string): Duration;
        /**
         * Creates a new ICAL.Duration instance from the given data object.
         *
         * @param aData An object with members of the duration
         * @return The created duration instance
         */
        static fromData(aData: DurationData): Duration;
        /**
         * Creates a new ICAL.Duration instance.
         *
         * @param data An object with members of the duration
         */
        constructor(data?: DurationData);
        /**
         * The weeks in this duration
         */
        weeks: number;
        /**
         * The days in this duration
         */
        days: number;
        /**
         * The days in this duration
         */
        hours: number;
        /**
         * The minutes in this duration
         */
        minutes: number;
        /**
         * The seconds in this duration
         */
        seconds: number;
        /**
         * The seconds in this duration
         */
        isNegative: boolean;
        /**
         * The class identifier.
         */
        readonly icalclass: string;
        /**
         * The type name, to be used in the jCal object.
         */
        icaltype: string;
        /**
         * Returns a clone of the duration object.
         *
         * @return The cloned object
         */
        clone(): Duration;
        /**
         * The duration value expressed as a number of seconds.
         *
         * @return The duration value in seconds
         */
        toSeconds(): number;
        /**
         * Reads the passed seconds value into this duration object. Afterwards,
         * members like {@link Duration#days days} and {@link Duration#weeks weeks} will be set up
         * accordingly.
         *
         * @param {Number} aSeconds     The duration value in seconds
         * @return {Duration}      Returns this instance
         */
        fromSeconds(aSeconds: number): Duration;
        /**
         * Sets up the current instance using members from the passed data object.
         *
         * @param aData An object with members of the duration
         */
        fromData(aData?: DurationData): void;
        /**
         * Resets the duration instance to the default values, i.e. PT0S
         */
        reset(): void;
        /**
         * Compares the duration instance with another one.
         *
         * @param aOther The instance to compare with
         * @return -1, 0 or 1 for less/equal/greater
         */
        compare(aOther: Duration): number;
        /**
         * Normalizes the duration instance. For example, a duration with a value
         * of 61 seconds will be normalized to 1 minute and 1 second.
         */
        normalize(): void;
        /**
         * The string representation of this duration.
         */
        toString(): string;
        /**
         * The iCalendar string representation of this duration.
         */
        toICALString(): string;
    }
    interface TimeData {
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
        /** If true, the instance represents a date (as opposed to a date-time) */
        isDate?: boolean;
        /** Timezone this position occurs in */
        aZone?: Timezone;
    }
    /**
     * The weekday, 1 = SUNDAY, 7 = SATURDAY. Access via
     * ICAL.Time.MONDAY, ICAL.Time.TUESDAY, ...
     */
    enum WeekDay {
        SUNDAY = 1,
        MONDAY = 2,
        TUESDAY = 3,
        WEDNESDAY = 4,
        THURSDAY = 5,
        FRIDAY = 6,
        SATURDAY = 7
    }
    /**
     * @classdesc
     * iCalendar Time representation (similar to JS Date object).  Fully
     * independent of system (OS) timezone / time.  Unlike JS Date, the month
     * January is 1, not zero.
     *
     * @example
     * var time = new ICAL.Time({
     *   year: 2012,
     *   month: 10,
     *   day: 11
     *   minute: 0,
     *   second: 0,
     *   isDate: false
     * });
     *
     *
     * @alias ICAL.Time
     * @class
     */
    class Time {
        #private;
        wrappedJSObject: Time;
        static _dowCache: Record<number, number>;
        static _wnCache: Record<number, number>;
        protected _time: Required<TimeData>;
        private auto_normalize;
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
        second: number;
        isDate: boolean;
        /**
         * Returns the days in the given month
         *
         * @param {Number} month      The month to check
         * @param {Number} year       The year to check
         * @return {Number}           The number of days in the month
         */
        static daysInMonth(month: number, year: number): number;
        /**
         * Checks if the year is a leap year
         *
         * @param year The year to check
         * @return True, if the year is a leap year
         */
        static isLeapYear(year: number): boolean;
        /**
         * Create a new ICAL.Time from the day of year and year. The date is returned
         * in floating timezone.
         *
         * @param aDayOfYear The day of year
         * @param aYear      The year to create the instance in
         * @return           The created instance with the calculated date
         */
        static fromDayOfYear(aDayOfYear: number, aYear: number): Time;
        /**
         * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
         *
         * @deprecated Use {@link ICAL.Time.fromDateString} instead
         * @param str  The string to create from
         * @return     The date/time instance
         */
        static fromStringv2(str: string): Time;
        /**
         * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
         *
         * @param aValue The string to create from
         * @return       The date/time instance
         */
        static fromDateString(aValue: string): Time;
        /**
         * Returns a new ICAL.Time instance from a date-time string, e.g
         * 2015-01-02T03:04:05. If a property is specified, the timezone is set up
         * from the property's TZID parameter.
         *
         * @param aValue The string to create from
         * @param prop   The property the date belongs to
         * @return       The date/time instance
         */
        static fromDateTimeString(aValue: string, prop?: Property): Time;
        /**
         * Returns a new ICAL.Time instance from a date or date-time string,
         *
         * @param aValue    The string to create from
         * @param aProperty The property the date belongs to
         * @return          The date/time instance
         */
        static fromString(aValue: string, aProperty?: Property): Time;
        /**
         * Creates a new ICAL.Time instance from the given Javascript Date.
         *
         * @param aDate     The Javascript Date to read, or null to reset
         * @param {Boolean} useUTC  If true, the UTC values of the date will be used
         */
        static fromJSDate(aDate: Date | null, useUTC: boolean): Time;
        /**
         * Creates a new ICAL.Time instance from the the passed data object.
         *
         * @param aData Time initialization
         * @param aZone Timezone this position occurs in
         */
        static fromData: (aData: TimeData, aZone?: Timezone) => Time;
        /**
         * Creates a new ICAL.Time instance from the current moment.
         * The instance is “floating” - has no timezone relation.
         * To create an instance considering the time zone, call
         * ICAL.Time.fromJSDate(new Date(), true)
         */
        static now(): Time;
        /**
         * Returns the date on which ISO week number 1 starts.
         *
         * @see ICAL.Time#weekNumber
         * @param {Number} aYear                  The year to search in
         * @param {Time.weekDay=} aWeekStart The week start weekday, used for calculation.
         * @return {Time}                    The date on which week number 1 starts
         */
        static weekOneStarts(aYear: number, aWeekStart: WeekDay): Time;
        /**
         * Get the dominical letter for the given year. Letters range from A - G for
         * common years, and AG to GF for leap years.
         *
         * @param {Number} yr           The year to retrieve the letter for
         * @return {String}             The dominical letter.
         */
        static getDominicalLetter(yr: number): string;
        /**
         * January 1st, 1970 as an ICAL.Time.
         * @type {Time}
         * @constant
         * @instance
         */
        static get epochTime(): Time;
        static _cmp_attr(a: any, b: any, attr: any): 0 | 1 | -1;
        /**
         * The days that have passed in the year after a given month. The array has
         * two members, one being an array of passed days for non-leap years, the
         * other analog for leap years.
         * @example
         * var isLeapYear = ICAL.Time.isLeapYear(year);
         * var passedDays = ICAL.Time.daysInYearPassedMonth[isLeapYear][month];
         */
        static daysInYearPassedMonth: number[][];
        static readonly SUNDAY = WeekDay.SUNDAY;
        static readonly MONDAY = WeekDay.MONDAY;
        static readonly TUESDAY = WeekDay.TUESDAY;
        static readonly WEDNESDAY = WeekDay.WEDNESDAY;
        static readonly THURSDAY = WeekDay.THURSDAY;
        static readonly FRIDAY = WeekDay.FRIDAY;
        static readonly SATURDAY = WeekDay.SATURDAY;
        /**
         * The default weekday for the WKST part.
         * @constant
         * @default ICAL.Time.MONDAY
         */
        static readonly DEFAULT_WEEK_START = 2; // MONDAY
        /**
         * Creates a new ICAL.Time instance.
         *
         * @param data Time initialization
         * @param zone timezone this position occurs in
         */
        constructor(data?: TimeData, zone?: Timezone);
        /**
         * The class identifier.
         */
        readonly icalclass: "icaltime" | "vcardtime";
        _cachedUnixTime: number | null;
        /**
         * The type name, to be used in the jCal object. This value may change and
         * is strictly defined by the {@link ICAL.Time#isDate isDate} member.
         * @default "date-time"
         */
        get icaltype(): "date-and-or-time" | "date" | "date-time";
        /**
         * The timezone for this time.
         * @type {Timezone}
         */
        zone?: Timezone;
        /**
         * Internal uses to indicate that a change has been made and the next read
         * operation must attempt to normalize the value (for example changing the
         * day to 33).
         */
        private _pendingNormalization;
        /**
         * Returns a clone of the time object.
         *
         * @return The cloned object
         */
        clone(): Time;
        /**
         * Reset the time instance to epoch time
         */
        reset(): void;
        /**
         * Reset the time instance to the given date/time values.
         *
         * @param year     The year to set
         * @param month    The month to set
         * @param day      The day to set
         * @param hour     The hour to set
         * @param minute   The minute to set
         * @param second   The second to set
         * @param timezone The timezone to set
         */
        resetTo(year: number, month: number, day: number, hour: number, minute: number, second: number, timezone?: Timezone): void;
        /**
         * Set up the current instance from the Javascript date value.
         *
         * @param aDate   The Javascript Date to read, or null to reset
         * @param useUTC  If true, the UTC values of the date will be used
         */
        fromJSDate(aDate: Date | null, useUTC?: boolean): this;
        /**
         * Sets up the current instance using members from the passed data object.
         *
         * @param aData Time initialization
         * @param aZone Timezone this position occurs in
         */
        fromData(aData?: TimeData, aZone?: Timezone): this;
        /**
         * Calculate the day of week.
         * @param aWeekStart The week start weekday, defaults to SUNDAY
         */
        dayOfWeek(aWeekStart?: WeekDay): WeekDay;
        /**
         * Calculate the day of year.
         */
        dayOfYear(): number;
        /**
         * Returns a copy of the current date/time, rewound to the start of the
         * week. The resulting ICAL.Time instance is of icaltype date, even if this
         * is a date-time.
         *
         * @param aWeekStart The week start weekday, defaults to SUNDAY
         * @return The start of the week (cloned)
         */
        startOfWeek(aWeekStart?: WeekDay): Time;
        /**
         * Returns a copy of the current date/time, shifted to the end of the week.
         * The resulting ICAL.Time instance is of icaltype date, even if this is a
         * date-time.
         *
         * @param aWeekStart The week start weekday, defaults to SUNDAY
         * @return The end of the week (cloned)
         */
        endOfWeek(aWeekStart?: WeekDay): Time;
        /**
         * Returns a copy of the current date/time, rewound to the start of the
         * month. The resulting ICAL.Time instance is of icaltype date, even if
         * this is a date-time.
         *
         * @return The start of the month (cloned)
         */
        startOfMonth(): Time;
        /**
         * Returns a copy of the current date/time, shifted to the end of the
         * month.  The resulting ICAL.Time instance is of icaltype date, even if
         * this is a date-time.
         *
         * @return The end of the month (cloned)
         */
        endOfMonth(): Time;
        /**
         * Returns a copy of the current date/time, rewound to the start of the
         * year. The resulting ICAL.Time instance is of icaltype date, even if
         * this is a date-time.
         *
         * @return The start of the year (cloned)
         */
        startOfYear(): Time;
        /**
         * Returns a copy of the current date/time, shifted to the end of the
         * year.  The resulting ICAL.Time instance is of icaltype date, even if
         * this is a date-time.
         *
         * @return The end of the year (cloned)
         */
        endOfYear(): Time;
        /**
         * First calculates the start of the week, then returns the day of year for
         * this date. If the day falls into the previous year, the day is zero or negative.
         *
         * @param aFirstDayOfWeek The week start weekday, defaults to SUNDAY
         * @return The calculated day of year
         */
        startDoyWeek(aFirstDayOfWeek?: WeekDay): number;
        /**
         * Get the dominical letter for the current year. Letters range from A - G
         * for common years, and AG to GF for leap years.
         *
         * @param {Number} yr           The year to retrieve the letter for
         * @return {String}             The dominical letter.
         */
        getDominicalLetter(): string;
        /**
         * Finds the nthWeekDay relative to the current month (not day).  The
         * returned value is a day relative the month that this month belongs to so
         * 1 would indicate the first of the month and 40 would indicate a day in
         * the following month.
         *
         * @param {Number} aDayOfWeek   Day of the week see the day name constants
         * @param {Number} aPos         Nth occurrence of a given week day values
         *        of 1 and 0 both indicate the first weekday of that type. aPos may
         *        be either positive or negative
         *
         * @return {Number} numeric value indicating a day relative
         *                   to the current month of this time object
         */
        nthWeekDay(aDayOfWeek: number, aPos: number): number;
        /**
         * Checks if current time is the nth weekday, relative to the current
         * month.  Will always return false when rule resolves outside of current
         * month.
         *
         * @param {Time.weekDay} aDayOfWeek       Day of week to check
         * @param {Number} aPos                        Relative position
         * @return {Boolean}                           True, if it is the nth weekday
         */
        isNthWeekDay(aDayOfWeek: WeekDay, aPos: number): boolean;
        /**
         * Calculates the ISO 8601 week number. The first week of a year is the
         * week that contains the first Thursday. The year can have 53 weeks, if
         * January 1st is a Friday.
         *
         * Note there are regions where the first week of the year is the one that
         * starts on January 1st, which may offset the week number. Also, if a
         * different week start is specified, this will also affect the week
         * number.
         *
         * @see ICAL.Time.weekOneStarts
         * @param {Time.weekDay} aWeekStart        The weekday the week starts with
         * @return {Number}                             The ISO week number
         */
        weekNumber(aWeekStart: WeekDay): number;
        /**
         * Adds the duration to the current time. The instance is modified in
         * place.
         *
         * @param {Duration} aDuration         The duration to add
         */
        addDuration(aDuration: Duration): void;
        /**
         * Subtract the date details (_excluding_ timezone).  Useful for finding
         * the relative difference between two time objects excluding their
         * timezone differences.
         *
         * @param aDate The date to subtract
         * @return      The difference as a duration
         */
        subtractDate(aDate: Time): Duration;
        /**
         * Subtract the date details, taking timezones into account.
         *
         * @param aDate The date to subtract
         * @return      The difference in duration
         */
        subtractDateTz(aDate: Time): Duration;
        /**
         * Compares the ICAL.Time instance with another one.
         *
         * @param aOther The instance to compare with
         * @return       -1, 0 or 1 for less/equal/greater
         */
        compare(other: Duration): number;
        /**
         * Compares only the date part of this instance with another one.
         *
         * @param other The instance to compare with
         * @param tz    The timezone to compare in
         * @return      -1, 0 or 1 for less/equal/greater
         */
        compareDateOnlyTz(other: Duration, tz: Timezone): number;
        /**
         * Convert the instance into another timezone. The returned ICAL.Time
         * instance is always a copy.
         *
         * @param zone The zone to convert to
         * @return     The copy, converted to the zone
         */
        convertToZone(zone: Timezone): Time;
        /**
         * Calculates the UTC offset of the current date/time in the timezone it is
         * in.
         *
         * @return UTC offset in seconds
         */
        utcOffset(): number;
        /**
         * Returns an RFC 5545 compliant ical representation of this object.
         *
         * @return ical date/date-time
         */
        toICALString(): string;
        /**
         * The string representation of this date/time, in jCal form
         * (including : and - separators).
         */
        toString(): string;
        /**
         * Converts the current instance to a Javascript date
         */
        toJSDate(): Date;
        protected _normalize(): this;
        /**
         * Adjust the date/time by the given offset
         *
         * @param aExtraDays    The extra amount of days
         * @param aExtraHours   The extra amount of hours
         * @param aExtraMinutes The extra amount of minutes
         * @param aExtraSeconds The extra amount of seconds
         * @param aTime         The time to adjust, defaults to the current instance.
         */
        adjust(aExtraDays: number, aExtraHours: number, aExtraMinutes: number, aExtraSeconds: number, aTime?: Required<TimeData>): this;
        /**
         * Sets up the current instance from unix time, the number of seconds since
         * January 1st, 1970.
         *
         * @param seconds The seconds to set up with
         */
        fromUnixTime(seconds: number): void;
        /**
         * Converts the current instance to seconds since January 1st 1970.
         *
         * @return Seconds since 1970
         */
        toUnixTime(): number;
        /**
         * Converts time to into Object which can be serialized then re-created
         * using the constructor.
         *
         * @example
         * // toJSON will automatically be called
         * var json = JSON.stringify(mytime);
         *
         * var deserialized = JSON.parse(json);
         *
         * var time = new ICAL.Time(deserialized);
         *
         * @return {Object}
         */
        toJSON(): Record<string, any>;
    }
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
    class Timezone {
        #private;
        private changes;
        private wrappedJSObject;
        static _compare_change_fn(a: Change, b: Change): 0 | 1 | -1;
        /**
         * Convert the date/time from one zone to the next.
         *
         * @param tt        The time to convert
         * @param from_zone The source zone to convert from
         * @param to_zone   The target zone to convert to
         * @return          The converted date/time object
         */
        static convert_time(tt: Time, from_zone: Timezone, to_zone: Timezone): Time | null;
        /**
         * Creates a new ICAL.Timezone instance from the passed data object.
         *
         * @param aData options for class
         */
        static fromData(aData: TimezoneData | Component): Timezone;
        static get utcTimezone(): Timezone;
        static get localTimezone(): Timezone;
        /**
         * Adjust a timezone change object.
         * @private
         * @param change     The timezone change object
         * @param days       The extra amount of days
         * @param hours      The extra amount of hours
         * @param minutes    The extra amount of minutes
         * @param seconds    The extra amount of seconds
         */
        private static adjust_change;
        static _minimumExpansionYear: number;
        static EXTRA_COVERAGE: number;
        /**
         * Creates a new ICAL.Timezone instance, by passing in a tzid and component.
         *
         * @param data options for class
         */
        constructor(data?: TimezoneData | Component);
        /**
         * Timezone identifier
         */
        tzid: string;
        /**
         * Timezone location
         */
        location: string;
        /**
         * Alternative timezone name, for the string representation
         */
        tznames: string;
        /**
         * The primary latitude for the timezone.
         */
        latitude: number;
        /**
         * The primary longitude for the timezone.
         */
        longitude: number;
        /**
         * The vtimezone component for this timezone.
         */
        component: Component | null;
        /**
         * The year this timezone has been expanded to. All timezone transition
         * dates until this year are known and can be used for calculation
         */
        private expandedUntilYear;
        /**
         * The class identifier.
         */
        readonly icalclass = "icaltimezone";
        /**
         * Sets up the current instance using members from the passed data object.
         *
         * @param aData options for class
         */
        fromData(aData?: TimezoneData | Component): this;
        /**
         * Finds the utcOffset the given time would occur in this timezone.
         *
         * @param {Time} tt        The time to check for
         * @return {Number} utc offset in seconds
         */
        utcOffset(tt: Time): number;
        private _findNearbyChange;
        private _ensureCoverage;
        private _expandComponent;
        /**
         * The string representation of this timezone.
         */
        toString(): string;
    }
    /**
     * Wraps a jCal component, adding convenience methods to add, remove and update subcomponents and
     * properties.
     */
    class Component {
        private jCal;
        parent: Component | null;
        private _components?;
        private _properties?;
        /**
         * Create an {@link Component} by parsing the passed iCalendar string.
         *
         * @param str The iCalendar string to parse
         */
        static fromString(str: string): Component;
        /**
         * Creates a new ICAL.Component instance.
         *
         * @param jCal Raw jCal component data OR name of new
         * @param parent Parent component to associate
         */
        constructor(jCal: any[] | string, parent?: Component);
        /**
         * Hydrated properties are inserted into the _properties array at the same
         * position as in the jCal array, so it is possible that the array contains
         * undefined values for unhydrdated properties. To avoid iterating the
         * array when checking if all properties have been hydrated, we save the
         * count here.
         */
        private _hydratedPropertyCount;
        /**
         * The same count as for _hydratedPropertyCount, but for subcomponents
         */
        private _hydratedComponentCount;
        /**
         * A cache of hydrated time zone objects which may be used by consumers, keyed
         * by time zone ID.
         */
        private _timezoneCache;
        /**
         * The name of this component
         */
        get name(): any;
        private _hydrateComponent;
        private _hydrateProperty;
        /**
         * Finds first sub component, optionally filtered by name.
         *
         * @param name Optional name to filter by
         * @return The found subcomponent
         */
        getFirstSubcomponent(name?: string): Component | null;
        /**
         * Finds all sub components, optionally filtering by name.
         *
         * @param name Optional name to filter by
         * @return The found sub components
         */
        getAllSubcomponents(name?: string): Component[];
        /**
         * Returns true when a named property exists.
         *
         * @param name The property name
         * @return True, when property is found
         */
        hasProperty(name: string): boolean;
        /**
         * Finds the first property, optionally with the given name.
         *
         * @param name Lowercase property name
         * @return The found property
         */
        getFirstProperty(name?: string): Property | null;
        /**
         * Returns first property's value, if available.
         *
         * @param name Lowercase property name
         * @return The found property value.
         */
        getFirstPropertyValue(name?: string): any | null;
        /**
         * Get all properties in the component, optionally filtered by name.
         *
         * @param name Lowercase property name
         * @return List of properties
         */
        getAllProperties(name?: string): Property[];
        private _removeObjectByIndex;
        private _removeObject;
        _removeAllObjects(jCalIndex: number, cache: string, name?: string): void;
        /**
         * Adds a single sub component.
         *
         * @param component The component to add
         * @return The passed in component
         */
        addSubcomponent(component: Component): Component;
        /**
         * Removes a single component by name or the instance of a specific
         * component.
         *
         * @param nameOrComp Name of component, or component
         * @return True when comp is removed
         */
        removeSubcomponent(nameOrComp: Component | string): boolean;
        /**
         * Removes all components or (if given) all components by a particular
         * name.
         *
         * @param name Lowercase component name
         */
        removeAllSubcomponents(name?: string): void;
        /**
         * Adds an {@link Property} to the component.
         *
         * @param property The property to add
         * @return The passed in property
         */
        addProperty(property: Property): Property;
        /**
         * Helper method to add a property with a value to the component.
         *
         * @param name Property name to add
         * @param value Property value
         * @return The created property
         */
        addPropertyWithValue(name: string, value: string | number | object): Property;
        /**
         * Helper method that will update or create a property of the given name
         * and sets its value. If multiple properties with the given name exist,
         * only the first is updated.
         *
         * @param name Property name to update
         * @param value Property value
         * @return The created property
         */
        updatePropertyWithValue(name: string, value: string | number | object): Property;
        /**
         * Removes a single property by name or the instance of the specific
         * property.
         *
         * @param nameOrProp     Property name or instance to remove
         * @return True, when deleted
         */
        removeProperty(nameOrProp: string | Property): boolean;
        /**
         * Removes all properties associated with this component, optionally
         * filtered by name.
         *
         * @param name Lowercase property name
         * @return True, when deleted
         */
        removeAllProperties(name?: string): boolean;
        /**
         * Returns the Object representation of this component. The returned object
         * is a live jCal object and should be cloned if modified.
         */
        toJSON(): object;
        /**
         * The string representation of this component.
         */
        toString(): string;
        /**
         * Retrieve a time zone definition from the component tree, if any is present.
         * If the tree contains no time zone definitions or the TZID cannot be
         * matched, returns null.
         *
         * @param tzid The ID of the time zone to retrieve
         * @return The time zone corresponding to the ID, or null
         */
        getTimeZoneByID(tzid: string): Timezone | null;
    }
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
     * @param {ICAL.Component} vcal     The top-level VCALENDAR component.
     * @return {ICAL.Component}         The ICAL.Component that was passed in.
     */
    function updateTimezones(vcal: Component): Component;
    /**
     * Checks if the given type is of the number type and also NaN.
     *
     * @param {Number} number     The number to check
     * @return {Boolean}          True, if the number is strictly NaN
     */
    function isStrictlyNaN(number: number): boolean;
    /**
     * Parses a string value that is expected to be an integer, when the valid is
     * not an integer throws a decoration error.
     *
     * @param {String} string     Raw string input
     * @return {Number}           Parsed integer
     */
    function strictParseInt(string: string): number;
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
    function formatClassType(data: any, type: any): any;
    /**
     * Identical to indexOf but will only match values when they are not preceded
     * by a backslash character.
     *
     * @param buffer String to search
     * @param search Value to look for
     * @param pos    Start position
     * @return       The position, or -1 if not found
     */
    function unescapedIndexOf(buffer: string, search: string, pos?: number): number;
    /**
     * Find the index for insertion using binary search.
     *
     * @param list    The list to search
     * @param seekVal The value to insert
     * @param cmpFunc The comparison func, that can compare two seekVals
     * @return The insert position
     */
    function binsearchInsert<T, T1 = T>(list: T[], seekVal: T1, cmpFunc: (a: T1, b: T) => number): number;
    /**
     * Clone the passed object or primitive. By default a shallow clone will be
     * executed.
     *
     * @param {*} aSrc            The thing to clone
     * @param {Boolean=} aDeep    If true, a deep clone will be performed
     * @return {*}                The copy of the thing
     */
    function clone<T>(aSrc: T, aDeep: boolean): T;
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
    function foldline(aLine: string): string;
    /**
     * Pads the given string or number with zeros so it will have at least two
     * characters.
     *
     * @param {String|Number} data    The string or number to pad
     * @return {String}               The number padded as a string
     */
    function pad2(data: string | number): string;
    /**
     * Truncates the given number, correctly handling negative numbers.
     *
     * @param {Number} number     The number to truncate
     * @return {Number}           The truncated number
     */
    function trunc(number: number): number;
}
/**
 * Parses iCalendar or vCard data into a raw jCal object. Consult
 * documentation on the {@tutorial layers|layers of parsing} for more
 * details.
 *
 * @function ICAL.parse
 * @memberof ICAL
 * @variation function
 * @todo Fix the API to be more clear on the return type
 * @param {String} input      The string data to parse
 * @return {Object|Object[]}  A single jCal object, or an array thereof
 */
declare function parse(input: string): [
] | undefined;
declare namespace parse {
    var property: (str: string, designSet?: DesignSet | undefined) => never;
    var component: (str: string) => [
    ] | undefined;
    var ParserError: {
        new (message: string): ParserError;
        captureStackTrace(targetObject: object, constructorOpt?: Function | undefined): void;
        prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
        stackTraceLimit: number;
    };
    var _handleContentLine: (line: string, state: ParserState) => void;
    var _parseValue: (value: string, type: string, designSet: DesignSet, structuredValue?: object | undefined) => any;
    var _parseParameters: (line: string, start: number, designSet: DesignSet) => any[];
    var _rfc6868Escape: (val: string) => string;
    var _parseMultiValue: (buffer: string, delim: string, type: string, result: unknown[], innerMulti: string | null, designSet: DesignSet, structuredValue?: unknown[] | undefined) => unknown;
    var _eachLine: (buffer: string, callback: (a: string | null, b: string) => void) => void;
}
/**
 * An error that occurred during parsing.
 *
 * @param {String} message        The error message
 * @memberof ICAL.parse
 * @extends {Error}
 * @class
 */
declare class ParserError extends Error {
    constructor(message: string);
}
/**
 * The state for parsing content lines from an iCalendar/vCard string.
 */
interface ParserState {
    /** The design set to use for parsing */
    designSet: DesignSet;
    /** The stack of components being processed */
    stack: Component[];
    /** The currently active component */
    component: Component;
}
interface PeriodData {
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
declare class Period {
    wrappedJSObject: Period;
    /**
     * Creates a new {@link ICAL.Period} instance from the passed string.
     *
     * @param str The string to parse
     * @param prop The property this period will be on
     * @return The created period instance
     */
    static fromString(str: string, prop: Property): Period;
    /**
     * Creates a new {@link Period} instance from the given data object.
     * The passed data object cannot contain both and end date and a duration.
     *
     * @param aData An object with members of the period
     * @return The period instance
     */
    static fromData(aData: PeriodData): Period;
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
    static fromJSON(aData: string | [
        string,
        string
    ], aProp: Property | undefined, aLenient: boolean): Period;
    /**
     * Creates a new ICAL.Period instance. The passed data object cannot contain both and end date and
     * a duration.
     *
     * @param aData An object with members of the period
     */
    constructor(aData: PeriodData);
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
    readonly icalclass = "icalperiod";
    /**
     * The type name, to be used in the jCal object.
     */
    readonly icaltype = "period";
    /**
     * Returns a clone of the duration object.
     *
     * @return The cloned object
     */
    clone(): Period;
    /**
     * Calculates the duration of the period, either directly or by subtracting
     * start from end date.
     *
     * @return The calculated duration
     */
    getDuration(): Duration;
    /**
     * Calculates the end date of the period, either directly or by adding
     * duration to start date.
     *
     * @return The calculated end date
     */
    getEnd(): Time;
    /**
     * The string representation of this period.
     */
    toString(): string;
    /**
     * The jCal representation of this period type.
     */
    toJSON(): [
        string,
        string
    ];
    /**
     * The iCalendar string representation of this period.
     */
    toICALString(): string;
}
/**
 * Convert a full jCal/jCard array into a iCalendar/vCard string.
 *
 * @function ICAL.stringify
 * @variation function
 * @param {Array} jCal    The jCal/jCard document
 * @return {String}       The stringified iCalendar/vCard document
 */
declare function stringify(jCal: any[]): string;
declare namespace stringify {
    var component: (component: any[], designSet: DesignSet) => string;
    var property: (property: any[], designSet: DesignSet, noFold?: boolean | undefined) => string;
    var propertyValue: (value: string) => string;
    var multiValue: (values: any[], delim: string, type: string, innerMulti: string | undefined, designSet: DesignSet, structuredValue?: any) => string;
    var value: (value: string | number, type: string, designSet: DesignSet, structuredValue: any) => string;
    var _rfc6868Unescape: (val: string) => string;
}
/**
 * @classdesc
 * Singleton class to contain timezones.  Right now it is all manual registry in
 * the future we may use this class to download timezone information or handle
 * loading pre-expanded timezones.
 *
 * @exports module:ICAL.TimezoneService
 * @alias ICAL.TimezoneService
 */
declare const TimezoneService: {
    readonly count: number;
    reset(): void;
    has(tzid: string): boolean;
    get(tzid: string): Timezone | undefined;
    register(name: string | Component | undefined, timezone: Component | Timezone): void;
    remove(tzid: string): Timezone | null;
};
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
declare class UtcOffset {
    /**
     * Creates a new {@link ICAL.UtcOffset} instance from the passed string.
     *
     * @param aString The string to parse
     * @return        The created utc-offset instance
     */
    static fromString(aString: string): UtcOffset;
    /**
     * Creates a new {@link ICAL.UtcOffset} instance from the passed seconds
     * value.
     *
     * @param aSeconds The number of seconds to convert
     */
    static fromSeconds(aSeconds: number): UtcOffset;
    /**
     * Creates a new ICAL.UtcOffset instance.
     *
     * @param aData An object with members of the utc offset
     */
    constructor(aData?: UtcOffsetData);
    /**
     * The hours in the utc-offset
     */
    hours: number;
    /**
     * The minutes in the utc-offset
     */
    minutes: number;
    /**
     * The sign of the utc offset, 1 for positive offset, -1 for negative
     * offsets.
     */
    factor: number;
    /**
     * The type name, to be used in the jCal object.
     */
    readonly icaltype = "utc-offset";
    /**
     * Returns a clone of the utc offset object.
     *
     * @return The cloned object
     */
    clone(): UtcOffset;
    /**
     * Sets up the current instance using members from the passed data object.
     *
     * @param aData An object with members of the utc offset
     */
    fromData(aData?: UtcOffsetData): void;
    /**
     * Sets up the current instance from the given seconds value. The seconds
     * value is truncated to the minute. Offsets are wrapped when the world
     * ends, the hour after UTC+14:00 is UTC-12:00.
     *
     * @param aSeconds         The seconds to convert into an offset
     */
    fromSeconds(aSeconds: number): this;
    /**
     * Convert the current offset to a value in seconds
     *
     * @return The offset in seconds
     */
    toSeconds(): number;
    /**
     * Compare this utc offset with another one.
     *
     * @param other The other offset to compare with
     * @return      -1, 0 or 1 for less/equal/greater
     */
    compare(other: UtcOffset): number;
    _normalize(): void;
    /**
     * The iCalendar string representation of this utc-offset.
     */
    toICALString(): string;
    /**
     * The string representation of this utc-offset.
     */
    toString(): string;
}
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
declare class VCardTime extends Time {
    /**
     * Returns a new ICAL.VCardTime instance from a date and/or time string.
     *
     * @param aValue     The string to create from
     * @param aIcalType  The type for this instance, e.g. date-and-or-time
     * @return The date/time instance
     */
    static fromDateAndOrTimeString(aValue: string, aIcalType: string): VCardTime;
    /**
     * Creates a new ICAL.VCardTime instance.
     *
     * @param data The data for the time instance
     * @param zone     The timezone to use
     * @param icalType The type for this date/time object
     */
    constructor(data: VCardTimeData, zone: Timezone | UtcOffset, icalType: VCardTime["icaltype"]);
    /**
     * The class identifier.
     */
    readonly icalclass = "vcardtime";
    /**
     * The type name, to be used in the jCal object.
     */
    readonly icaltype: "date-and-or-time" | "date" | "date-time";
    /**
     * Returns a clone of the vcard date/time object.
     *
     * @return The cloned object
     */
    clone(): VCardTime;
    _normalize(): this;
    /**
     * @inheritdoc
     */
    utcOffset(): number;
    /**
     * Returns an RFC 6350 compliant representation of this object.
     *
     * @return vcard date/time string
     */
    toICALString(): string;
    /**
     * The string representation of this date/time, in jCard form
     * (including : and - separators).
     */
    toString(): string | null;
}
/**
 * Global ICAL configuration.
 */
declare const config: {
    /**
     * The number of characters before iCalendar line folding should occur
     * @default 75
     */
    foldLength: number;
    debug: boolean;
    /**
     * The character(s) to be used for a newline. The default value is provided by
     * rfc5545.
     * @type {String}
     * @default "\r\n"
     */
    newLineChar: string;
};
export { Binary, Component, ComponentParser, design, Duration, Event, helpers, parse, Period, Property, Recur, RecurExpansion, RecurIterator, stringify, Time, Timezone, TimezoneService, UtcOffset, VCardTime, config };
