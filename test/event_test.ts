import { setup, suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { useTimezones } from './support/helper';
import { ICAL, loadSample } from './support/helper';

suite('ICAL.Event', () => {
  const testTzid = 'America/New_York';
  useTimezones(testTzid, 'America/Denver', 'America/Los_Angeles');

  let icsDataRecurInstances;

  function rangeException(nth) {
    if (!nth || nth <= 0) {
      nth = 1;
    }

    const iter = subject.iterator();
    let last;

    while (nth--) {
      last = iter.next();
    }

    const newEvent = new ICAL.Event();

    newEvent.uid = subject.uid;

    newEvent.component
      .addPropertyWithValue('recurrence-id', last)
      .setParameter('range', ICAL.Event.THISANDFUTURE);

    return newEvent;
  }

  suiteSetup(async () => {
    icsDataRecurInstances = await loadSample('recur_instances.ics');
  });

  const exceptions = [];
  let subject;
  let primaryItem;

  setup(() => {
    exceptions.length = 0;

    const root = new ICAL.Component(ICAL.parse(icsDataRecurInstances));

    const events = root.getAllSubcomponents('vevent');
    ICAL.TimezoneService.register(root.getFirstSubcomponent('vtimezone'));

    events.forEach(event => {
      if (!event.hasProperty('recurrence-id')) {
        primaryItem = event;
      } else {
        exceptions.push(event);
      }
    });

    subject = new ICAL.Event(primaryItem);
  });

  suite('changing timezones', () => {
    const dateFields = [
      ['startDate', 'dtstart'],
      ['endDate', 'dtend']
    ];

    function verifyTzidHandling(eventProp, icalProp) {
      let time;
      let property;
      setup(() => {
        property = subject.component.getFirstProperty(icalProp);

        assert.ok(property.getParameter('tzid'), 'has tzid');

        assert.isFalse(property.getParameter('tzid') === testTzid);
      });

      test('to floating time', () => {
        subject[eventProp] = time = new ICAL.Time({
          year: 2012,
          month: 1,
          day: 1,
          minute: 30,
          isDate: false
        });

        assert.ok(!property.getParameter('tzid'), 'removes tzid');

        assert.include(property.toICALString(), time.toICALString());
      });

      test('to utc time', () => {
        subject[eventProp] = time = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 1,
          minute: 30,
          isDate: false,
          timezone: 'Z'
        });

        assert.ok(!property.getParameter('tzid'), 'removes tzid');

        assert.include(property.toICALString(), time.toICALString());
      });

      test('to another timezone', () => {
        subject[eventProp] = time = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 1,
          minute: 30,
          isDate: false,
          timezone: testTzid
        });

        assert.equal(property.getParameter('tzid'), testTzid);

        assert.include(property.toICALString(), time.toICALString());
      });

      test('type date-time -> date', () => {
        // ensure we are in the right time type
        property.resetType('date-time');

        subject[eventProp] = time = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 1,
          isDate: true
        });

        assert.equal(property.type, 'date');

        assert.include(property.toICALString(), time.toICALString());
      });

      test('type date -> date-time', () => {
        // ensure we are in the right time type
        property.resetType('date');

        subject[eventProp] = time = new ICAL.Time({
          year: 2013,
          month: 1,
          day: 1,
          hour: 3,
          isDate: false
        });

        assert.equal(property.type, 'date-time');

        assert.include(property.toICALString(), time.toICALString());
      });
    }

    dateFields.forEach(function (field) {
      suite(field[0], verifyTzidHandling.bind(this, field[0], field[1]));
    });
  });

  suite('initializer', () => {
    test('only with component', () => {
      assert.equal(subject.component, primaryItem);
      assert.instanceOf(subject.rangeExceptions, Array);
    });

    test("with exceptions from the component's parent if not specified in options", () => {
      subject = new ICAL.Event(primaryItem);

      const expected = Object.create(null);
      exceptions.forEach(exception => {
        expected[exception.getFirstPropertyValue('recurrence-id').toString()] =
          new ICAL.Event(exception);
      });

      assert.deepEqual(subject.exceptions, expected);
    });

    test('with exceptions specified in options if any', () => {
      subject = new ICAL.Event(primaryItem, {
        exceptions: exceptions.slice(1)
      });

      const expected = Object.create(null);
      exceptions.slice(1).forEach(exception => {
        expected[exception.getFirstPropertyValue('recurrence-id').toString()] =
          new ICAL.Event(exception);
      });

      assert.deepEqual(subject.exceptions, expected);
    });

    test('with strict exceptions', () => {
      subject = new ICAL.Event(primaryItem, {
        strictExceptions: true
      });
      assert.ok(subject.strictExceptions);
    });
  });

  suite('creating a event', () => {
    setup(() => {
      subject = new ICAL.Event();
    });

    test('initial state', () => {
      assert.instanceOf(subject.component, ICAL.Component);
      assert.equal(subject.component.name, 'vevent');
    });

    suite('roundtrip', () => {
      let props;

      suiteSetup(() => {
        props = {
          uid: 'zfoo',
          summary: 'sum',
          description: 'desc',
          startDate: new ICAL.Time({
            year: 2012,
            month: 1,
            day: 1,
            hour: 5
          }),
          endDate: new ICAL.Time({
            year: 2012,
            month: 1,
            day: 1,
            hour: 10
          }),
          location: 'place',
          organizer: 'SJL',
          recurrenceId: new ICAL.Time({
            year: 2012,
            month: 1,
            day: 1
          })
        };
      });

      test('setters', () => {
        for (const key in props) {
          subject[key] = props[key];
          assert.equal(subject[key], props[key], key);
        }
      });

      test('to string roundtrip', () => {
        const aComp = new ICAL.Component(ICAL.parse(icsDataRecurInstances));
        const aEvent = new ICAL.Event(aComp);

        const bComp = new ICAL.Component(ICAL.parse(aComp.toString()));

        const bEvent = new ICAL.Event(bComp);
        assert.equal(aEvent.toString(), bEvent.toString());
      });
    });
  });

  suite('#getOccurrenceDetails', () => {
    setup(() => {
      exceptions.forEach(subject.relateException, subject);
    });

    suite('RANGE=THISANDFUTURE', () => {
      test('starts earlier ends later', () => {
        const exception = rangeException(1);
        const rid = exception.recurrenceId;

        exception.startDate = rid.clone();
        exception.endDate = rid.clone();

        // starts 2 hours & 2 min early
        exception.startDate.hour -= 2;
        exception.startDate.minute += 2;

        // starts 1 hour - 2 min later
        exception.endDate.hour += 1;
        exception.endDate.minute -= 2;

        subject.relateException(exception);

        // create a time that has no exception
        // but past the RID.
        const occurs = rid.clone();
        occurs.day += 3;
        occurs.hour = 13;
        occurs.minutes = 15;

        // Run the following tests twice, the second time around the results
        // will be cached.
        for (let i = 0; i < 2; i++) {
          const suffix = i === 1 ? ' (cached)' : '';
          const details = subject.getOccurrenceDetails(occurs);

          assert.ok(details, 'has details' + suffix);
          assert.equal(details.item, exception, 'uses exception' + suffix);

          const expectedStart = occurs.clone();
          const expectedEnd = occurs.clone();

          // same offset (in different day) as the difference
          // in the original exception.d
          expectedStart.hour -= 2;
          expectedStart.minute += 2;
          expectedEnd.hour += 1;
          expectedEnd.minute -= 2;

          assert.deepEqual(
            details.startDate.toJSDate(),
            expectedStart.toJSDate(),
            'start time offset' + suffix
          );

          assert.deepEqual(
            details.endDate.toJSDate(),
            expectedEnd.toJSDate(),
            'end time offset' + suffix
          );
        }
      });
    });

    test('exception', () => {
      const time = exceptions[0].getFirstPropertyValue('recurrence-id');

      const start = exceptions[0].getFirstPropertyValue('dtstart');
      const end = exceptions[0].getFirstPropertyValue('dtend');

      const result = subject.getOccurrenceDetails(time);

      assert.equal(
        result.recurrenceId.toString(),
        time.toString(),
        'recurrence id'
      );

      assert.equal(result.endDate.toString(), end.toString(), 'end date');

      assert.equal(result.startDate.toString(), start.toString(), 'start date');

      assert.deepEqual(
        result.item.component.toJSON(),
        exceptions[0].toJSON(),
        'item'
      );
    });

    test('non-exception', () => {
      const time = new ICAL.Time({
        year: 2012,
        month: 7,
        day: 12
      });

      const end = time.clone();
      end.addDuration(subject.duration);

      const result = subject.getOccurrenceDetails(time);

      assert.equal(result.startDate.toString(), time.toString(), 'start date');

      assert.equal(result.endDate.toString(), end.toString());

      assert.equal(result.recurrenceId.toString(), time.toString());

      assert.equal(result.item, subject);
    });

    test('iterate over exceptions', () => {
      for (
        let counter = 0, iterator = subject.iterator();
        counter < 2;
        counter++
      ) {
        const result = subject.getOccurrenceDetails(iterator.next());
        const exception = exceptions[counter];

        assert.equal(
          result.endDate.toString(),
          exception.getFirstPropertyValue('dtend').toString(),
          'end date'
        );

        assert.equal(
          result.startDate.toString(),
          exception.getFirstPropertyValue('dtstart').toString(),
          'start date'
        );

        assert.deepEqual(
          result.item.component.toJSON(),
          exception.toJSON(),
          'item'
        );
      }
    });
  });

  suite('#recurrenceTypes', () => {
    suite('multiple rrules', () => {
      let icsData;

      suiteSetup(async () => {
        icsData = await loadSample('multiple_rrules.ics');
      });

      test('result', () => {
        const comp = new ICAL.Component(ICAL.parse(icsData));
        subject = new ICAL.Event(comp.getFirstSubcomponent('vevent'));

        const expected = {
          MONTHLY: true,
          WEEKLY: true
        };

        assert.deepEqual(subject.getRecurrenceTypes(), expected);
      });
    });

    test('no rrule', () => {
      subject.component.removeProperty('rrule');

      assert.deepEqual(subject.getRecurrenceTypes(), {});
    });
  });

  suite('#relateException', () => {
    test('trying to relate an exception to an exception', () => {
      const exception = new ICAL.Event(exceptions[0]);

      assert.throws(() => {
        exception.relateException(exceptions[1]);
      });
    });

    test('trying to relate unrelated component (without strict)', () => {
      const exception = exceptions[0];
      const prop = exception.getFirstProperty('uid');
      prop.setValue('foo');

      subject.relateException(exception);
    });

    test('trying to relate unrelated component (with strict)', () => {
      const exception = exceptions[0];
      const prop = exception.getFirstProperty('uid');
      prop.setValue('foo');

      subject.strictExceptions = true;
      assert.throws(() => {
        subject.relateException(exception);
      }, /unrelated/);
    });

    test('from ical component', () => {
      subject = new ICAL.Event(primaryItem, { exceptions: [] });
      const exception = exceptions[0];
      subject.relateException(exception);

      const expected = Object.create(null);
      expected[exception.getFirstPropertyValue('recurrence-id').toString()] =
        new ICAL.Event(exception);

      assert.deepEqual(subject.exceptions, expected);
      assert.lengthOf(subject.rangeExceptions, 0, 'does not add range');
    });

    suite('with RANGE=THISANDFUTURE', () => {
      function exceptionTime(index, mod) {
        mod = mod || 0;

        const item = subject.rangeExceptions[index];
        const utc = item[0];
        const time = new ICAL.Time();
        time.fromUnixTime(utc + mod);

        return time;
      }

      let list;

      setup(() => {
        list = [rangeException(3), rangeException(10), rangeException(1)];

        list.forEach(subject.relateException.bind(subject));
        assert.lengthOf(subject.rangeExceptions, 3);
      });

      function nthRangeException(nth) {
        return subject.rangeExceptions[nth];
      }

      function listDetails(obj) {
        return [obj.recurrenceId.toUnixTime(), obj.recurrenceId.toString()];
      }

      test('ranges', () => {
        const expected = [
          listDetails(list[2]), // 1st
          listDetails(list[0]), // 2nd
          listDetails(list[1]) // 3rd
        ];

        assert.deepEqual(subject.rangeExceptions, expected);
      });

      test('#findRangeException', () => {
        const before = exceptionTime(0, -1);
        const on = exceptionTime(0);
        const first = exceptionTime(0, 1);
        const second = exceptionTime(1, 30);
        const third = exceptionTime(2, 100000);

        assert.ok(!subject.findRangeException(before), 'find before range');

        assert.ok(
          !subject.findRangeException(on),
          'day of exception does not need a modification'
        );

        assert.equal(
          subject.findRangeException(first),
          nthRangeException(0)[1],
          'finds first item'
        );

        assert.equal(
          subject.findRangeException(second),
          nthRangeException(1)[1],
          'finds second item'
        );

        assert.equal(
          subject.findRangeException(third),
          nthRangeException(2)[1],
          'finds third item'
        );
      });
    });
  });

  suite('#isRecurring', () => {
    test('when is primary recurring item', () => {
      assert.isTrue(subject.isRecurring());
    });

    test('when is exception', () => {
      subject = new ICAL.Event(exceptions[0]);
      assert.isFalse(subject.isRecurring());
    });
  });

  suite('#modifiesFuture', () => {
    test('without range or exception', () => {
      assert.isFalse(subject.isRecurrenceException());
      assert.isFalse(subject.modifiesFuture());
    });

    test('with range and exception', () => {
      subject.component
        .addPropertyWithValue('recurrence-id', ICAL.Time.fromJSDate(new Date()))
        .setParameter('range', ICAL.Event.THISANDFUTURE);

      assert.isTrue(subject.modifiesFuture());
    });
  });

  suite('#isRecurrenceException', () => {
    test('when is primary recurring item', () => {
      assert.isFalse(subject.isRecurrenceException());
    });

    test('when is exception', () => {
      subject = new ICAL.Event(exceptions[0]);
      assert.isTrue(subject.isRecurrenceException());
    });
  });

  suite('date props', () => {
    [
      ['dtstart', 'startDate'],
      ['dtend', 'endDate']
    ].forEach(dateType => {
      const ical = dateType[0];
      const prop = dateType[1];
      let timeProp;
      let changeTime;

      suite('#' + prop, () => {
        const tzid = 'America/Denver';

        setup(() => {
          timeProp = primaryItem.getFirstProperty(ical);
        });

        test('get', () => {
          const expected = timeProp.getFirstValue(ical);
          assert.deepEqual(expected, subject[prop]);
        });

        function changesTzid(newTzid) {
          assert.notEqual(
            timeProp.getFirstValue().zone.tzid,
            changeTime.zone.tzid,
            'zones are different'
          );

          subject[prop] = changeTime;
          assert.equal(
            newTzid,
            timeProp.getParameter('tzid'),
            'removes timezone id'
          );
        }

        test('changing timezone from America/Los_Angeles', () => {
          changeTime = new ICAL.Time({
            year: 2012,
            month: 1,
            timezone: tzid
          });

          changesTzid(tzid);
        });

        test('changing timezone from floating to UTC', () => {
          timeProp.setValue(
            new ICAL.Time({
              year: 2012,
              month: 1
            })
          );

          changeTime = new ICAL.Time({
            year: 2012,
            month: 1,
            timezone: 'Z'
          });

          changesTzid(undefined);
        });

        test('changing timezone to floating', () => {
          timeProp.setValue(
            new ICAL.Time({
              year: 2012,
              month: 1,
              timezone: 'Z'
            })
          );

          changeTime = new ICAL.Time({
            year: 2012,
            month: 1
          });

          changesTzid(undefined);
        });
      });
    });
  });

  suite('remaining properties', () => {
    function testProperty(prop, changeval) {
      test('#' + prop, () => {
        const expected = primaryItem.getFirstPropertyValue(prop);
        assert.deepEqual(subject[prop], expected);

        subject[prop] = changeval;
        assert.equal(primaryItem.getFirstPropertyValue(prop), changeval);
      });
    }

    testProperty('location', 'other');
    testProperty('summary', 'other');
    testProperty('description', 'other');
    testProperty('organizer', 'other');
    testProperty('uid', 'other');
    testProperty('sequence', 123);
    testProperty('color', 'turquoise');

    test('#duration', () => {
      const end = subject.endDate;
      const start = subject.startDate;
      const duration = end.subtractDate(start);

      assert.deepEqual(subject.duration.toString(), duration.toString());
    });

    test('#attendees', () => {
      const props = primaryItem.getAllProperties('attendee');
      assert.deepEqual(subject.attendees, props);
    });

    test('#recurrenceId', () => {
      subject = new ICAL.Event(exceptions[0]);
      const expected = exceptions[0].getFirstPropertyValue('recurrence-id');
      const changeval = exceptions[1].getFirstPropertyValue('recurrence-id');
      assert.deepEqual(subject.recurrenceId, expected);

      subject.recurrenceId = changeval;
      assert.deepEqual(
        subject.component.getFirstPropertyValue('recurrence-id'),
        changeval
      );

      const tzid = 'America/New_York';
      const changeval2 = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 1,
        hour: 12,
        minute: 13,
        second: 14,
        timezone: tzid
      });

      subject.recurrenceId = changeval2;
      assert.deepEqual(
        subject.component
          .getFirstProperty('recurrence-id')
          .getParameter('tzid'),
        tzid
      );
    });
  });

  suite('#iterator', () => {
    test('with start time', () => {
      const start = subject.startDate;
      const time = new ICAL.Time({
        day: start.da + 1,
        month: start.month,
        year: start.year
      });

      const iterator = subject.iterator(time);
      assert.deepEqual(iterator.last.toString(), time.toString());
      assert.instanceOf(iterator, ICAL.RecurExpansion);
    });

    test('without a start time', () => {
      const iterator = subject.iterator();

      assert.equal(iterator.last.toString(), subject.startDate.toString());
    });
  });

  suite('duration instead of dtend', () => {
    let icsData;

    suiteSetup(async () => {
      icsData = await loadSample('duration_instead_of_dtend.ics');
    });

    test('result', () => {
      subject = new ICAL.Component(ICAL.parse(icsData));
      subject = new ICAL.Event(subject.getFirstSubcomponent('vevent'));
      assert.equal(
        subject.startDate.toString(),
        new ICAL.Time({
          year: 2012,
          month: 6,
          day: 30,
          hour: 6,
          isDate: false,
          timezone: testTzid
        }).toString()
      );

      assert.equal(
        subject.endDate.toString(),
        new ICAL.Time({
          year: 2012,
          month: 7,
          day: 1,
          hour: 6,
          isDate: false,
          timezone: testTzid
        }).toString()
      );

      assert.equal(subject.duration.toString(), 'P1D');
    });

    test('set', () => {
      const comp = new ICAL.Component(ICAL.parse(icsData));
      subject = new ICAL.Event(comp.getFirstSubcomponent('vevent'));

      assert.include(subject.toString(), 'DURATION');
      assert.notInclude(subject.toString(), 'DTEND');

      subject.endDate = new ICAL.Time({
        year: 2012,
        month: 7,
        day: 2,
        hour: 6,
        isDate: false,
        timezone: subject.startDate.zone
      });

      assert.equal(subject.duration.toString(), 'P2D');
      assert.equal(
        subject.endDate.toString(),
        new ICAL.Time({
          year: 2012,
          month: 7,
          day: 2,
          hour: 6,
          isDate: false,
          timezone: testTzid
        }).toString()
      );

      assert.notInclude(subject.toString(), 'DURATION');
      assert.include(subject.toString(), 'DTEND');
    });
  });

  suite('only a dtstart date', () => {
    let icsData;

    suiteSetup(async () => {
      icsData = await loadSample('only_dtstart_date.ics');
    });

    test('result', () => {
      const comp = new ICAL.Component(ICAL.parse(icsData));
      subject = new ICAL.Event(comp.getFirstSubcomponent('vevent'));
      assert.equal(
        subject.startDate.toString(),
        new ICAL.Time({
          year: 2012,
          month: 6,
          day: 30,
          hour: 0,
          isDate: true,
          timezone: testTzid
        }).toString()
      );

      assert.equal(
        subject.endDate.toString(),
        new ICAL.Time({
          year: 2012,
          month: 7,
          day: 1,
          hour: 6,
          isDate: true,
          timezone: testTzid
        }).toString()
      );

      assert.equal(subject.duration.toString(), 'P1D');
    });
  });

  suite('only a dtstart time', () => {
    let icsData;

    suiteSetup(async () => {
      icsData = await loadSample('only_dtstart_time.ics');
    });

    test('result', () => {
      const comp = new ICAL.Component(ICAL.parse(icsData));
      subject = new ICAL.Event(comp.getFirstSubcomponent('vevent'));
      assert.equal(
        subject.startDate.toString(),
        new ICAL.Time({
          year: 2012,
          month: 6,
          day: 30,
          hour: 6,
          isDate: false,
          timezone: testTzid
        }).toString()
      );

      assert.equal(
        subject.endDate.toString(),
        new ICAL.Time({
          year: 2012,
          month: 6,
          day: 30,
          hour: 6,
          isDate: false,
          timezone: testTzid
        }).toString()
      );

      assert.equal(subject.duration.toString(), 'PT0S');
    });
  });

  suite('dtend instead of duration', () => {
    let icsData;

    suiteSetup(async () => {
      icsData = await loadSample('minimal.ics');
    });

    test('result with different timezones', () => {
      subject = new ICAL.Component(ICAL.parse(icsData)).getFirstSubcomponent(
        'vevent'
      );
      // 3 hours ahead of L.A.
      subject.updatePropertyWithValue(
        'dtstart',
        ICAL.Time.fromData({
          year: 2012,
          month: 1,
          day: 1,
          hour: 10,
          minute: 20,
          timezone: 'America/New_York'
        })
      );
      subject.updatePropertyWithValue(
        'dtend',
        ICAL.Time.fromData({
          year: 2012,
          month: 1,
          day: 1,
          hour: 12,
          minute: 50,
          timezone: 'America/Los_Angeles'
        })
      );

      subject = new ICAL.Event(subject);
      assert.equal(
        subject.startDate.toString(),
        ICAL.Time.fromData({
          year: 2012,
          month: 1,
          day: 1,
          hour: 10,
          minute: 20,
          timezone: 'America/New_York'
        }).toString()
      );

      assert.equal(
        subject.endDate.toString(),
        ICAL.Time.fromData({
          year: 2012,
          month: 1,
          day: 1,
          hour: 12,
          minute: 50,
          timezone: 'America/Los_Angeles'
        }).toString()
      );

      assert.equal(subject.duration.toString(), 'PT5H30M');
    });

    test('set', () => {
      const comp = new ICAL.Component(ICAL.parse(icsData));
      subject = new ICAL.Event(comp.getFirstSubcomponent('vevent'));

      assert.notInclude(subject.toString(), 'DURATION');
      assert.include(subject.toString(), 'DTEND');

      subject.duration = ICAL.Duration.fromString('P2D');

      assert.equal(subject.duration.toString(), 'P2D');
      assert.equal(
        subject.endDate.toString(),
        new ICAL.Time({
          year: 2012,
          month: 7,
          day: 2,
          hour: 6,
          isDate: false,
          timezone: testTzid
        }).toString()
      );

      assert.include(subject.toString(), 'DURATION');
      assert.notInclude(subject.toString(), 'DTEND');
    });
  });
});
