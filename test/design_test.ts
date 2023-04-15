import { setup, suite, suiteSetup, suiteTeardown, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, hasProperties, loadSample } from './support/helper';
import type Timezone from '../lib/ical/timezone';

suite('design', () => {
  let timezone: Timezone;
  suiteSetup(async () => {
    const data = await loadSample('timezones/America/New_York.ics');
    const parsed = ICAL.parse(data);
    const vcalendar = new ICAL.Component(parsed);
    const vtimezone = vcalendar.getFirstSubcomponent('vtimezone');

    timezone = new ICAL.Timezone(vtimezone);
    ICAL.TimezoneService.register('test', timezone);
  });

  suiteTeardown(() => {
    ICAL.TimezoneService.reset();
  });

  let subject: typeof ICAL.design.defaultSet;
  setup(() => {
    subject = ICAL.design.defaultSet;
  });

  suite('types', () => {
    suite('binary', () => {
      setup(() => {
        subject = subject.value.binary;
      });

      test('#(un)decorate', () => {
        const expectedDecode = 'The quick brown fox jumps over the lazy dog.';
        const undecorated =
          'VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZy4=';

        const decorated = subject.decorate(undecorated);
        const decoded = decorated.decodeValue();

        assert.equal(decoded, expectedDecode);

        assert.equal(subject.undecorate(decorated), undecorated);
      });
    });

    suite('date', () => {
      setup(() => {
        subject = subject.value.date;
      });

      test('#fromICAL', () => {
        const value = subject.fromICAL('20121010');

        assert.equal(value, '2012-10-10');
      });

      test('#toICAL', () => {
        const value = subject.toICAL('2012-10-10');

        assert.equal(value, '20121010');
      });

      test('#to/fromICAL (lenient)', () => {
        const value = '20120901T130000';
        const expected = '2012-09-01T13:00:00';

        ICAL.design.strict = false;
        assert.equal(subject.fromICAL(value), expected);

        assert.equal(subject.toICAL(expected), value);
        ICAL.design.strict = true;
      });

      test('#toICAL invalid', () => {
        const value = subject.toICAL('wheeeeeeeeeeeeee');

        assert.equal(value, 'wheeeeeeeeeeeeee');
      });

      test('#fromICAL somewhat invalid', () => {
        // Strict mode is not completely strict, it takes a lot of shortcuts in the name of
        // performance. The functions in ICAL.design don't actually throw errors, given there is no
        // error collector. With a working error collector we should make lenient mode the default
        // and have strict mode be more pedantic.
        const value = subject.fromICAL('20131210Z');
        assert.equal(value, '2013-12-10');
      });

      test('#(un)decorate (lenient)', () => {
        const value = '2012-10-10T11:12:13';
        const prop = new ICAL.Property(['date', { tzid: 'test' }]);

        ICAL.design.strict = false;

        const time = subject.decorate(value, prop);

        hasProperties(time, {
          year: 2012,
          month: 10,
          day: 10,
          hour: 11,
          minute: 12,
          second: 13,
          isDate: false
        });

        assert.equal(subject.undecorate(time), value);
        ICAL.design.strict = true;
      });

      test('#(un)decorate (custom timezone)', () => {
        const value = '2012-10-10';
        const prop = new ICAL.Property(['date', { tzid: 'test' }]);

        const time = subject.decorate(value, prop);

        hasProperties(time, {
          year: 2012,
          month: 10,
          day: 10,
          isDate: true
        });

        assert.equal(subject.undecorate(time), value);
      });
    });

    suite('date-time', () => {
      setup(() => {
        subject = subject.value['date-time'];
      });

      test('#(from|to)ICAL', () => {
        const value = '20120901T130000';
        const expected = '2012-09-01T13:00:00';

        assert.equal(subject.fromICAL(value), expected);

        assert.equal(subject.toICAL(expected), value);
      });
      test('#toICAL invalid', () => {
        const value = subject.toICAL('wheeeeeeeeeeeeee');

        assert.equal(value, 'wheeeeeeeeeeeeee');
      });

      test('#from/toICAL (lenient)', () => {
        const value = '20190102';
        const expected = '2019-01-02';

        ICAL.design.strict = false;
        assert.equal(subject.fromICAL(value), expected);

        assert.equal(subject.toICAL(expected), value);
        ICAL.design.strict = true;
      });
      test('#(un)decorate (lenient)', () => {
        ICAL.design.strict = false;
        const undecorated = '2012-09-01';
        const prop = new ICAL.Property(['date-time', {}]);

        const decorated = subject.decorate(undecorated, prop);

        hasProperties(decorated, {
          year: 2012,
          month: 9,
          day: 1,
          isDate: true
        });

        assert.equal(subject.undecorate(decorated), undecorated);
        ICAL.design.strict = true;
      });

      test('#(un)decorate (utc)', () => {
        const undecorated = '2012-09-01T13:05:11Z';
        const prop = new ICAL.Property(['date-time', {}]);

        const decorated = subject.decorate(undecorated, prop);

        hasProperties(decorated, {
          year: 2012,
          month: 9,
          day: 1,
          hour: 13,
          minute: 5,
          second: 11,
          isDate: false,
          zone: ICAL.Timezone.utcTimezone
        });

        assert.equal(subject.undecorate(decorated), undecorated);
      });

      test('#(un)decorate (custom timezone)', () => {
        const prop = new ICAL.Property(['date-time', { tzid: 'test' }]);
        assert.equal(prop.getParameter('tzid'), 'test');

        ICAL.TimezoneService.register(
          'America/Los_Angeles',
          ICAL.Timezone.utcTimezone
        );

        const undecorated = '2012-09-01T13:05:11';
        const decorated = subject.decorate(undecorated, prop);
        assert.equal(decorated.zone, timezone);

        hasProperties(decorated, {
          year: 2012,
          month: 9,
          day: 1,
          hour: 13,
          minute: 5,
          second: 11,
          isDate: false
        });

        assert.equal(subject.undecorate(decorated), undecorated);
      });
    });

    suite('time', () => {
      setup(() => {
        subject = subject.value.time;
      });

      test('#fromICAL', () => {
        const value = subject.fromICAL('232050');

        assert.equal(value, '23:20:50');
      });
      test('#fromICAL invalid', () => {
        const value = subject.fromICAL('whoop');

        assert.equal(value, 'whoop');
      });

      test('#toICAL', () => {
        const value = subject.toICAL('23:20:50');

        assert.equal(value, '232050');
      });
      test('#toICAL invalid', () => {
        const value = subject.toICAL('whoop');

        assert.equal(value, 'whoop');
      });
    });

    suite('vcard date/time types', () => {
      function testRoundtrip(jcal, ical, props, only) {
        function testForType(type, valuePrefix, valueSuffix, zone) {
          const valueType = ICAL.design.vcard.value[type];
          const prefix = valuePrefix || '';
          const suffix = valueSuffix || '';
          const jcalvalue = prefix + jcal + suffix;
          const icalvalue = prefix + ical + suffix.replace(':', '');
          const zoneName = zone || valueSuffix || 'floating';

          test(type + ' ' + zoneName + ' fromICAL/toICAL', () => {
            assert.equal(valueType.fromICAL(icalvalue), jcalvalue);
            assert.equal(valueType.toICAL(jcalvalue), icalvalue);
          });

          test(type + ' ' + zoneName + ' decorated/undecorated', () => {
            const prop = new ICAL.Property(['anniversary', {}, type]);
            const decorated = valueType.decorate(jcalvalue, prop);
            const undecorated = valueType.undecorate(decorated);

            hasProperties(decorated._time, props);
            assert.equal(zoneName, decorated.zone.toString());
            assert.equal(undecorated, jcalvalue);
            assert.equal(decorated.toICALString(), icalvalue);
          });
        }
        (only ? suite.only : suite)(jcal, () => {
          if (props.year || props.month || props.day) {
            testForType('date-and-or-time');
            if (!props.hour && !props.minute && !props.second) {
              testForType('date');
            } else {
              testForType('date-time');
            }
          } else if (props.hour || props.minute || props.second) {
            if (!props.year && !props.month && !props.day) {
              testForType('date-and-or-time', 'T');
              testForType('date-and-or-time', 'T', 'Z', 'UTC');
              testForType('date-and-or-time', 'T', '-08:00');
              testForType('date-and-or-time', 'T', '+08:00');
              testForType('time');
              testForType('time', null, 'Z', 'UTC');
              testForType('time', null, '-08:00');
              testForType('time', null, '+08:00');
            } else {
              testForType('date-and-or-time', null);
              testForType('date-and-or-time', null, 'Z', 'UTC');
              testForType('date-and-or-time', null, '-08:00');
              testForType('date-and-or-time', null, '+08:00');
            }
          }
        });
      }
      testRoundtrip.only = function (jcal, ical, props) {
        testRoundtrip(jcal, ical, props, true);
      };

      // dates
      testRoundtrip('1985-04-12', '19850412', {
        year: 1985,
        month: 4,
        day: 12,
        hour: null,
        minute: null,
        second: null
      });
      testRoundtrip('1985-04', '1985-04', {
        year: 1985,
        month: 4,
        day: null,
        hour: null,
        minute: null,
        second: null
      });
      testRoundtrip('1985', '1985', {
        year: 1985,
        month: null,
        day: null,
        hour: null,
        minute: null,
        second: null
      });
      testRoundtrip('--04-12', '--0412', {
        year: null,
        month: 4,
        day: 12,
        hour: null,
        minute: null,
        second: null
      });
      testRoundtrip('--04', '--04', {
        year: null,
        month: 4,
        day: null,
        hour: null,
        minute: null,
        second: null
      });
      testRoundtrip('---12', '---12', {
        year: null,
        month: null,
        day: 12,
        hour: null,
        minute: null,
        second: null
      });

      // times
      testRoundtrip('23:20:50', '232050', {
        year: null,
        month: null,
        day: null,
        hour: 23,
        minute: 20,
        second: 50
      });
      testRoundtrip('23:20', '2320', {
        year: null,
        month: null,
        day: null,
        hour: 23,
        minute: 20,
        second: null
      });
      testRoundtrip('23', '23', {
        year: null,
        month: null,
        day: null,
        hour: 23,
        minute: null,
        second: null
      });
      testRoundtrip('-20:50', '-2050', {
        year: null,
        month: null,
        day: null,
        hour: null,
        minute: 20,
        second: 50
      });
      testRoundtrip('-20', '-20', {
        year: null,
        month: null,
        day: null,
        hour: null,
        minute: 20,
        second: null
      });
      testRoundtrip('--50', '--50', {
        year: null,
        month: null,
        day: null,
        hour: null,
        minute: null,
        second: 50
      });

      // date-times
      testRoundtrip('1985-04-12T23:20:50', '19850412T232050', {
        year: 1985,
        month: 4,
        day: 12,
        hour: 23,
        minute: 20,
        second: 50
      });
      testRoundtrip('1985-04-12T23:20', '19850412T2320', {
        year: 1985,
        month: 4,
        day: 12,
        hour: 23,
        minute: 20,
        second: null
      });
      testRoundtrip('1985-04-12T23', '19850412T23', {
        year: 1985,
        month: 4,
        day: 12,
        hour: 23,
        minute: null,
        second: null
      });
      testRoundtrip('--04-12T23:20', '--0412T2320', {
        year: null,
        month: 4,
        day: 12,
        hour: 23,
        minute: 20,
        second: null
      });
      testRoundtrip('--04T23:20', '--04T2320', {
        year: null,
        month: 4,
        day: null,
        hour: 23,
        minute: 20,
        second: null
      });
      testRoundtrip('---12T23:20', '---12T2320', {
        year: null,
        month: null,
        day: 12,
        hour: 23,
        minute: 20,
        second: null
      });
      testRoundtrip('--04T23', '--04T23', {
        year: null,
        month: 4,
        day: null,
        hour: 23,
        minute: null,
        second: null
      });
    });

    suite('duration', () => {
      setup(() => {
        subject = subject.value.duration;
      });

      test('#(un)decorate', () => {
        const undecorated = 'P15DT5H5M20S';
        const decorated = subject.decorate(undecorated);
        assert.equal(subject.undecorate(decorated), undecorated);
      });
    });

    suite('float', () => {
      setup(() => {
        subject = subject.value.float;
      });

      test('#(from|to)ICAL', () => {
        const original = '1.5';
        const fromICAL = subject.fromICAL(original);

        assert.equal(fromICAL, 1.5);
        assert.equal(subject.toICAL(fromICAL), original);
      });
    });

    suite('integer', () => {
      setup(() => {
        subject = subject.value.integer;
      });

      test('#(from|to)ICAL', () => {
        const original = '105';
        const fromICAL = subject.fromICAL(original);

        assert.equal(fromICAL, 105);
        assert.equal(subject.toICAL(fromICAL), original);
      });
    });

    suite('period', () => {
      setup(() => {
        subject = subject.value.period;
      });
      test('#(to|from)ICAL date/date (lenient)', () => {
        const original = '19970101/19970102';
        ICAL.design.strict = false;

        const fromICAL = subject.fromICAL(original);

        assert.deepEqual(fromICAL, ['1997-01-01', '1997-01-02']);

        assert.equal(subject.toICAL(fromICAL), original);

        ICAL.design.strict = true;
      });

      test('#(to|from)ICAL date/date', () => {
        const original = '19970101T180000Z/19970102T070000Z';
        const fromICAL = subject.fromICAL(original);

        assert.deepEqual(fromICAL, [
          '1997-01-01T18:00:00Z',
          '1997-01-02T07:00:00Z'
        ]);

        assert.equal(subject.toICAL(fromICAL), original);
      });

      test('#(un)decorate (date-time/duration)', () => {
        const prop = new ICAL.Property(['date', { tzid: 'test' }]);

        const undecorated = ['1997-01-01T18:00:00', 'PT5H30M'];
        const decorated = subject.decorate(undecorated, prop);

        hasProperties(decorated.start, {
          year: 1997,
          day: 1,
          month: 1,
          hour: 18
        });

        assert.equal(decorated.start.zone, timezone);

        hasProperties(decorated.duration, {
          hours: 5,
          minutes: 30
        });

        assert.deepEqual(subject.undecorate(decorated), undecorated);
      });

      test('#(un)decorate (date-time/date-time)', () => {
        const prop = new ICAL.Property(['date', { tzid: 'test' }]);

        const undecorated = ['1997-01-01T18:00:00', '1998-01-01T17:00:00'];
        const decorated = subject.decorate(undecorated, prop);

        hasProperties(decorated.start, {
          year: 1997,
          day: 1,
          month: 1,
          hour: 18
        });

        hasProperties(decorated.end, {
          year: 1998,
          day: 1,
          month: 1,
          hour: 17
        });

        assert.equal(decorated.start.zone, timezone);
        assert.equal(decorated.end.zone, timezone);

        assert.deepEqual(subject.undecorate(decorated), undecorated);
      });

      test('#(un)decorate (lenient, date/date)', () => {
        ICAL.design.strict = false;

        const prop = new ICAL.Property(['date', { tzid: 'test' }]);

        const undecorated = ['1997-01-01', '1998-01-01'];
        const decorated = subject.decorate(undecorated, prop);

        hasProperties(decorated.start, {
          year: 1997,
          day: 1,
          month: 1,
          isDate: true
        });

        hasProperties(decorated.end, {
          year: 1998,
          day: 1,
          month: 1,
          isDate: true
        });

        assert.deepEqual(subject.undecorate(decorated), undecorated);

        ICAL.design.strict = true;
      });

      test('#(un)decorate (date-time/duration)', () => {
        const prop = new ICAL.Property(['date', { tzid: 'test' }]);

        const undecorated = ['1997-01-01T18:00:00', 'PT5H30M'];
        const decorated = subject.decorate(undecorated, prop);

        hasProperties(decorated.start, {
          year: 1997,
          day: 1,
          month: 1,
          hour: 18
        });

        assert.equal(decorated.start.zone, timezone);

        hasProperties(decorated.duration, {
          hours: 5,
          minutes: 30
        });

        assert.deepEqual(subject.undecorate(decorated), undecorated);
      });
    });

    suite('recur', () => {
      setup(() => {
        subject = subject.value.recur;
      });

      test('#(to|from)ICAL', () => {
        const original = 'FREQ=MONTHLY;UNTIL=20121112T131415;COUNT=1';
        const fromICAL = subject.fromICAL(original);

        assert.deepEqual(fromICAL, {
          freq: 'MONTHLY',
          until: '2012-11-12T13:14:15',
          count: 1
        });

        assert.equal(subject.toICAL(fromICAL), original);
      });

      test('#(un)decorate', () => {
        const undecorated = {
          freq: 'MONTHLY',
          byday: ['MO', 'TU', 'WE', 'TH', 'FR'],
          until: '2012-10-12'
        };
        const decorated = subject.decorate(undecorated);

        assert.instanceOf(decorated, ICAL.Recur);

        hasProperties(decorated, {
          freq: 'MONTHLY',
          parts: {
            BYDAY: ['MO', 'TU', 'WE', 'TH', 'FR']
          }
        });

        hasProperties(decorated.until, {
          year: 2012,
          month: 10,
          day: 12
        });

        assert.deepEqual(subject.undecorate(decorated), undecorated);
      });
    });

    suite('utc-offset', () => {
      setup(() => {
        subject = subject.value['utc-offset'];
      });

      test('#(to|from)ICAL without seconds', () => {
        const original = '-0500';
        const fromICAL = subject.fromICAL(original);

        assert.equal(fromICAL, '-05:00');
        assert.equal(subject.toICAL(fromICAL), original);
      });

      test('#(to|from)ICAL with seconds', () => {
        const original = '+054515';
        const fromICAL = subject.fromICAL(original);

        assert.equal(fromICAL, '+05:45:15');
        assert.equal(subject.toICAL(fromICAL), original);
      });

      test('#(un)decorate', () => {
        const undecorated = '-05:00';
        const decorated = subject.decorate(undecorated);

        assert.equal(decorated.hours, 5, 'hours');
        assert.equal(decorated.factor, -1, 'factor');

        assert.equal(subject.undecorate(decorated), undecorated);
      });
    });

    suite('utc-offset (vcard3)', () => {
      setup(() => {
        subject = ICAL.design.vcard3.value['utc-offset'];
      });

      test('#(to|from)ICAL', () => {
        const original = '-05:00';
        const fromICAL = subject.fromICAL(original);

        assert.equal(fromICAL, '-05:00');
        assert.equal(subject.toICAL(fromICAL), original);
      });

      test('#(un)decorate', () => {
        const undecorated = '-05:00';
        const decorated = subject.decorate(undecorated);

        assert.equal(decorated.hours, 5, 'hours');
        assert.equal(decorated.factor, -1, 'factor');

        assert.equal(subject.undecorate(decorated), undecorated);
      });
    });

    suite('unknown and default values', () => {
      test('unknown x-prop', () => {
        let prop = new ICAL.Property('x-wr-calname');
        assert.equal(prop.type, 'unknown');

        prop = ICAL.Property.fromString('X-WR-CALNAME:value');
        assert.equal(prop.type, 'unknown');
      });

      test('unknown iana prop', () => {
        let prop = new ICAL.Property('standardized');
        assert.equal(prop.type, 'unknown');

        prop = ICAL.Property.fromString('STANDARDIZED:value');
        assert.equal(prop.type, 'unknown');
      });

      test('known text type', () => {
        let prop = new ICAL.Property('description');
        assert.equal(prop.type, 'text');

        prop = ICAL.Property.fromString('DESCRIPTION:value');
        assert.equal(prop.type, 'text');
      });

      test('encoded text value roundtrip', () => {
        let prop = new ICAL.Property('description');
        prop.setValue('hello, world');
        const propVal = prop.toICALString();
        assert.equal(propVal, 'DESCRIPTION:hello\\, world');

        prop = ICAL.Property.fromString(propVal);
        assert.equal(prop.getFirstValue(), 'hello, world');
      });

      test('encoded unknown value roundtrip', () => {
        let prop = new ICAL.Property('x-wr-calname');
        prop.setValue('hello, world');
        const propVal = prop.toICALString();
        assert.equal(propVal, 'X-WR-CALNAME:hello, world');

        prop = ICAL.Property.fromString(propVal);
        assert.equal(prop.getFirstValue(), 'hello, world');
      });

      test('encoded unknown value from string', () => {
        const prop = ICAL.Property.fromString('X-WR-CALNAME:hello\\, world');
        assert.equal(prop.getFirstValue(), 'hello\\, world');
      });

      suite('registration', () => {
        test('newly registered property', () => {
          let prop = new ICAL.Property('nonstandard');
          assert.equal(prop.type, 'unknown');

          ICAL.design.defaultSet.property.nonstandard = {
            defaultType: 'date-time'
          };

          prop = new ICAL.Property('nonstandard');
          assert.equal(prop.type, 'date-time');
        });

        test('unknown value type', () => {
          const prop = ICAL.Property.fromString('X-PROP;VALUE=FUZZY:WARM');
          assert.equal(prop.name, 'x-prop');
          assert.equal(prop.type, 'fuzzy');
          assert.equal(prop.getFirstValue(), 'WARM');
          prop.setValue('FREEZING');
          assert.equal(prop.getFirstValue(), 'FREEZING');
        });

        test('newly registered value type', () => {
          ICAL.design.defaultSet.value.fuzzy = {
            fromICAL(aValue) {
              return aValue.toLowerCase();
            },
            toICAL(aValue) {
              return aValue.toUpperCase();
            }
          };

          const prop = ICAL.Property.fromString('X-PROP;VALUE=FUZZY:WARM');
          assert.equal(prop.name, 'x-prop');
          assert.equal(prop.getFirstValue(), 'warm');
          assert.match(prop.toICALString(), /WARM/);
        });

        test('newly registered parameter', () => {
          let prop = ICAL.Property.fromString('X-PROP;VALS=a,b,c:def');
          let param = prop.getParameter('vals');
          assert.equal(param, 'a,b,c');

          ICAL.design.defaultSet.param.vals = { multiValue: ',' };

          prop = ICAL.Property.fromString('X-PROP;VALS=a,b,c:def');
          param = prop.getParameter('vals');
          assert.deepEqual(param, ['a', 'b', 'c']);
        });
      });
    });
  });
});
