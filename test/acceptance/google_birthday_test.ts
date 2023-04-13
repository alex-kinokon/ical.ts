import { suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, loadSample } from '../support/helper';

suite('google birthday events', () => {
  let icsData;

  suiteSetup(async () => {
    icsData = await loadSample('google_birthday.ics');
  });

  test('expanding malformatted recurring event', done => {
    // just verify it can parse forced types
    const parser = new ICAL.ComponentParser();
    let primary;
    const exceptions = [];

    const expectedDates = [
      new Date(2012, 11, 10),
      new Date(2013, 11, 10),
      new Date(2014, 11, 10)
    ];

    parser.onevent = function (event) {
      if (event.isRecurrenceException()) {
        exceptions.push(event);
      } else {
        primary = event;
      }
    };

    parser.oncomplete = function () {
      exceptions.forEach(item => {
        primary.relateException(item);
      });

      const iter = primary.iterator();
      let next;
      const dates = [];
      while ((next = iter.next())) {
        dates.push(next.toJSDate());
      }

      assert.deepEqual(dates, expectedDates);

      done();
    };

    parser.process(icsData);
  });
});
