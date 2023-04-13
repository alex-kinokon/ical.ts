import { setup, suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, loadSample, useTimezones } from './support/helper';

suite('recur_expansion', () => {
  // While other tests in this file don't require specifying a timezone, we
  // need to do so here because we're building the `RecurExpansion` from a
  // limited subset of the ICS which does not include the timezone definition.
  useTimezones('America/Los_Angeles');

  let subject;
  let primary;

  function createSubject(file) {
    setup(async () => {
      const icsData = await loadSample(file);
      const exceptions = [];

      await new Promise(resolve => {
        const parse = new ICAL.ComponentParser();

        parse.onevent = function (event) {
          if (event.isRecurrenceException()) {
            exceptions.push(event);
          } else {
            primary = event;
          }
        };

        parse.oncomplete = function () {
          exceptions.forEach(primary.relateException, primary);
          subject = new ICAL.RecurExpansion({
            component: primary.component,
            dtstart: primary.startDate
          });

          resolve();
        };
        parse.process(icsData);
      });
    });
  }

  createSubject('recur_instances.ics');

  suite('initialization', () => {
    test('successful', () => {
      assert.deepEqual(
        subject.last.toJSDate(),
        new Date('2012-10-02T17:00:00Z')
      );

      assert.instanceOf(subject.ruleIterators, Array);
      assert.ok(subject.exDates);
    });

    test('invalid', () => {
      assert.throws(
        () => new ICAL.RecurExpansion({}),
        '.dtstart (ICAL.Time) must be given'
      );
      assert.throws(
        () =>
          new ICAL.RecurExpansion({
            dtstart: ICAL.Time.now()
          }),
        '.ruleIterators or .component must be given'
      );
    });

    test('default', () => {
      const dtstart = ICAL.Time.fromData({
        year: 2012,
        month: 2,
        day: 2
      });
      const expansion = new ICAL.RecurExpansion({
        dtstart,
        ruleIterators: []
      });

      assert.lengthOf(expansion.ruleDates, 0);
      assert.lengthOf(expansion.exDates, 0);
      assert.isFalse(expansion.complete);

      assert.deepEqual(expansion.toJSON(), {
        ruleIterators: [],
        ruleDates: [],
        exDates: [],
        ruleDateInc: undefined,
        exDateInc: undefined,
        dtstart: dtstart.toJSON(),
        last: dtstart.toJSON(),
        complete: false
      });
    });
  });

  suite('#_ensureRules', () => {
    test('.ruleDates', () => {
      const expected = [
        new Date('2012-11-05T18:00:00.000Z'),
        new Date('2012-11-10T18:00:00.000Z'),
        new Date('2012-11-30T18:00:00.000Z')
      ];

      const dates = subject.ruleDates.map(time => time.toJSDate());

      assert.deepEqual(dates, expected);
    });

    test('.exDates', () => {
      const expected = [
        new Date('2012-12-04T18:00:00.000Z'),
        new Date('2013-02-05T18:00:00.000Z'),
        new Date('2013-04-02T17:00:00.000Z')
      ];

      const dates = subject.exDates.map(time => time.toJSDate());

      assert.deepEqual(dates, expected);
    });
  });

  suite('#_nextRecurrenceIter', () => {
    let component;

    setup(() => {
      // setup a clean component with no rules
      component = primary.component.toJSON();
      component = new ICAL.Component(component);

      // Simulate a more complicated event by using
      // the original as a base and adding more complex rrule's
      component.removeProperty('rrule');
    });

    test('when rule ends', () => {
      const start = {
        year: 2012,
        month: 1,
        day: 1
      };

      component.removeAllProperties('rdate');
      component.removeAllProperties('exdate');
      component.addPropertyWithValue('rrule', {
        freq: 'WEEKLY',
        count: 3,
        byday: ['SU']
      });

      const expansion = new ICAL.RecurExpansion({
        component,
        dtstart: start
      });

      const expected = [
        new Date(2012, 0, 1),
        new Date(2012, 0, 8),
        new Date(2012, 0, 15)
      ];

      const max = 10;
      let i = 0;
      let next;
      const dates = [];

      while (i++ <= max && (next = expansion.next())) {
        dates.push(next.toJSDate());
      }

      assert.deepEqual(dates, expected);
    });

    test('multiple rules', () => {
      component.addPropertyWithValue('rrule', {
        freq: 'MONTHLY',
        bymonthday: [13]
      });
      component.addPropertyWithValue('rrule', {
        freq: 'WEEKLY',
        byday: ['TH']
      });

      const start = ICAL.Time.fromData({
        year: 2012,
        month: 2,
        day: 2
      });

      const expansion = new ICAL.RecurExpansion({
        component,
        dtstart: start
      });

      const expected = [
        new Date(2012, 1, 2),
        new Date(2012, 1, 9),
        new Date(2012, 1, 13),
        new Date(2012, 1, 16),
        new Date(2012, 1, 23)
      ];

      let inc = 0;
      const max = expected.length;
      let next;
      const dates = [];

      while (inc++ < max) {
        next = expansion._nextRecurrenceIter();
        dates.push(next.last.toJSDate());
        next.next();
      }

      assert.deepEqual(dates, expected);
    });
  });

  suite('#next', () => {
    // I use JS dates widely because it is much easier
    // to compare them via chai's deepEquals function
    const expected = [
      new Date('2012-10-02T17:00:00.000Z'),
      new Date('2012-11-05T18:00:00.000Z'),
      new Date('2012-11-06T18:00:00.000Z'),
      new Date('2012-11-10T18:00:00.000Z'),
      new Date('2012-11-30T18:00:00.000Z'),
      new Date('2013-01-01T18:00:00.000Z')
    ];

    test('6 items', () => {
      const dates = [];
      const max = 6;
      let inc = 0;
      let next;

      while (inc++ < max && (next = subject.next())) {
        dates.push(next.toJSDate());
      }

      assert.deepEqual(dates, expected);
    });
  });

  suite('#next - finite', () => {
    createSubject('recur_instances_finite.ics');

    test('until complete', () => {
      const max = 100;
      let inc = 0;
      let next;

      const dates = [];
      const expected = [
        new Date('2012-10-02T17:00:00.000Z'),
        new Date('2012-11-05T18:00:00.000Z'),
        new Date('2012-11-06T18:00:00.000Z'),
        new Date('2012-11-10T18:00:00.000Z'),
        new Date('2012-12-04T18:00:00.000Z')
      ];

      while (inc++ < max && (next = subject.next())) {
        dates.push(next.toJSDate());
      }

      // round trip
      subject = new ICAL.RecurExpansion(subject.toJSON());

      while (inc++ < max && (next = subject.next())) {
        dates.push(next.toJSDate());
      }

      assert.deepEqual(dates, expected);
      assert.isTrue(subject.complete, 'complete');
    });
  });

  suite('#toJSON', () => {
    test('from start', () => {
      const json = subject.toJSON();
      const newIter = new ICAL.RecurExpansion(json);
      let cur = 0;

      while (cur++ < 10) {
        assert.deepEqual(
          subject.next().toJSDate(),
          newIter.next().toJSDate(),
          'failed compare at #' + cur
        );
      }
    });

    test('from two iterations', () => {
      subject.next();
      subject.next();

      const json = subject.toJSON();
      const newIter = new ICAL.RecurExpansion(json);
      let cur = 0;

      while (cur++ < 10) {
        assert.deepEqual(
          subject.next().toJSDate(),
          newIter.next().toJSDate(),
          'failed compare at #' + cur
        );
      }
    });
  });

  suite('event without recurrences', () => {
    createSubject('minimal.ics');

    test('iterate', () => {
      const dates = [];
      let next;

      const expected = primary.startDate.toJSDate();

      while ((next = subject.next())) {
        dates.push(next.toJSDate());
      }

      assert.deepEqual(dates[0], expected);
      assert.lengthOf(dates, 1);
      assert.isTrue(subject.complete);

      // json check
      subject = new ICAL.RecurExpansion(subject.toJSON());

      assert.isTrue(subject.complete, 'complete after json');
      assert.ok(!subject.next(), 'next value');
    });
  });
});
