import { setup, suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, loadSample } from './support/helper';

suite('component_parser', () => {
  let subject;
  let icsData;

  suiteSetup(async () => {
    icsData = await loadSample('recur_instances.ics');
  });

  suite('#process', () => {
    const events = [];
    const exceptions = [];
    const timezones = [];

    function eventEquals(a, b, msg) {
      if (!a) throw new Error('actual is falsy');

      if (!b) throw new Error('expected is falsy');

      if (a instanceof ICAL.Event) {
        a = a.component;
      }

      if (b instanceof ICAL.Event) {
        b = b.component;
      }

      assert.deepEqual(a.toJSON(), b.toJSON(), msg);
    }

    function setupProcess(options?) {
      setup(done => {
        events.length = 0;
        timezones.length = 0;

        subject = new ICAL.ComponentParser(options);

        subject.onrecurrenceexception = function (item) {
          exceptions.push(item);
        };

        subject.onevent = function (event) {
          events.push(event);
        };

        subject.ontimezone = function (tz) {
          timezones.push(tz);
        };

        subject.oncomplete = function () {
          done();
        };

        subject.process(ICAL.parse(icsData));
      });
    }

    suite('without events', () => {
      setupProcess({ parseEvent: false });

      test('parse result', () => {
        assert.lengthOf(events, 0);
        assert.lengthOf(timezones, 1);

        const tz = timezones[0];
        assert.instanceOf(tz, ICAL.Timezone);
        assert.equal(tz.tzid, 'America/Los_Angeles');
      });
    });

    suite('with events', () => {
      setupProcess();

      test('parse result', () => {
        const component = new ICAL.Component(ICAL.parse(icsData));
        const list = component.getAllSubcomponents('vevent');

        const expectedEvents = [];

        list.forEach(item => {
          expectedEvents.push(new ICAL.Event(item));
        });

        assert.instanceOf(expectedEvents[0], ICAL.Event);

        eventEquals(events[0], expectedEvents[0]);
        eventEquals(events[1], expectedEvents[1]);
        eventEquals(events[2], expectedEvents[2]);
      });
    });

    suite('without parsing timezones', () => {
      setupProcess({ parseTimezone: false });

      test('parse result', () => {
        assert.lengthOf(timezones, 0);
        assert.lengthOf(events, 3);
      });
    });

    suite('alternate input', () => {
      test('parsing component from string', done => {
        subject = new ICAL.ComponentParser();
        subject.oncomplete = function () {
          assert.lengthOf(events, 3);
          done();
        };
        subject.process(icsData);
      });
      test('parsing component from component', done => {
        subject = new ICAL.ComponentParser();
        subject.oncomplete = function () {
          assert.lengthOf(events, 3);
          done();
        };
        const comp = new ICAL.Component(ICAL.parse(icsData));
        subject.process(comp);
      });
    });
  });
});
