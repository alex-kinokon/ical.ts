import { suite, suiteSetup, suiteTeardown, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, loadSample } from './support/helper';

suite('ICAL.helpers', () => {
  suite('#clone', () => {
    const subject = ICAL.helpers.clone;
    test('some primatives', () => {
      assert.equal(subject(null, false), null);
      assert.equal(subject(123, false), 123);
      assert.equal(subject(null, true), null);
      assert.equal(subject(123, true), 123);
    });

    test('a date', () => {
      const date = new Date(2015, 1, 1);
      const time = date.getTime();
      const copy = subject(date, false);

      copy.setYear(2016);
      assert.notEqual(time, copy.getTime());
    });

    test('clonable', () => {
      const obj = {
        clone() {
          return 'test';
        }
      };
      assert.equal(subject(obj, false), 'test');
    });

    test('shallow array', () => {
      const obj = { v: 2 };
      const arr = [obj, 2, 3];

      const result = subject(arr, false);
      assert.deepEqual(result, [{ v: 2 }, 2, 3]);
      obj.v = 3;
      assert.deepEqual(result, [{ v: 3 }, 2, 3]);
    });

    test('deep array', () => {
      const obj = { v: 2 };
      const arr = [obj, 2, 3];

      const result = subject(arr, true);
      assert.deepEqual(result, [{ v: 2 }, 2, 3]);
      obj.v = 3;
      assert.deepEqual(result, [{ v: 2 }, 2, 3]);
    });

    test('shallow object', () => {
      const deepobj = { v: 2 };
      const obj = { a: deepobj, b: 2 };

      const result = subject(obj, false);
      assert.deepEqual(result, { a: { v: 2 }, b: 2 });
      deepobj.v = 3;
      assert.deepEqual(result, { a: { v: 3 }, b: 2 });
    });

    test('deep object', () => {
      const deepobj = { v: 2 };
      const obj = { a: deepobj, b: 2 };

      const result = subject(obj, true);
      assert.deepEqual(result, { a: { v: 2 }, b: 2 });
      deepobj.v = 3;
      assert.deepEqual(result, { a: { v: 2 }, b: 2 });
    });
  });

  suite('#pad2', () => {
    const subject = ICAL.helpers.pad2;

    test('with string', () => {
      assert.equal(subject(''), '00');
      assert.equal(subject('1'), '01');
      assert.equal(subject('12'), '12');
      assert.equal(subject('123'), '123');
    });

    test('with number', () => {
      assert.equal(subject(0), '00');
      assert.equal(subject(1), '01');
      assert.equal(subject(12), '12');
      assert.equal(subject(123), '123');
    });

    test('with boolean', () => {
      assert.equal(subject(true), 'true');
    });
  });

  suite('#foldline', () => {
    const subject = ICAL.helpers.foldline;

    test('empty values', () => {
      assert.strictEqual(subject(null), '');
      assert.strictEqual(subject(''), '');
    });

    // Most other cases are covered by other tests
  });

  suite('#updateTimezones', () => {
    const subject = ICAL.helpers.updateTimezones;
    let cal;

    suiteSetup(async () => {
      let data = await loadSample('minimal.ics');
      cal = new ICAL.Component(ICAL.parse(data));

      data = await loadSample('timezones/America/Atikokan.ics');
      ICAL.TimezoneService.register(
        new ICAL.Component(ICAL.parse(data)).getFirstSubcomponent('vtimezone')
      );
    });

    suiteTeardown(() => {
      ICAL.TimezoneService.reset();
    });

    test('timezones already correct', () => {
      const vtimezones = cal.getAllSubcomponents('vtimezone');
      assert.strictEqual(vtimezones.length, 1);
      assert.strictEqual(
        vtimezones[0].getFirstProperty('tzid').getFirstValue(),
        'America/Los_Angeles'
      );
    });

    test('remove extra timezones', () => {
      let vtimezones;
      cal.addSubcomponent(
        ICAL.TimezoneService.get('America/Atikokan').component
      );
      vtimezones = cal.getAllSubcomponents('vtimezone');
      assert.strictEqual(vtimezones.length, 2);

      vtimezones = subject(cal).getAllSubcomponents('vtimezone');
      assert.strictEqual(vtimezones.length, 1);
      assert.strictEqual(
        vtimezones[0].getFirstProperty('tzid').getFirstValue(),
        'America/Los_Angeles'
      );
    });

    test('add missing timezones', () => {
      let vtimezones;
      cal
        .getFirstSubcomponent('vevent')
        .getFirstProperty('dtend')
        .setParameter('tzid', 'America/Atikokan');
      vtimezones = cal.getAllSubcomponents('vtimezone');
      assert(vtimezones.length, 1);

      vtimezones = subject(cal).getAllSubcomponents('vtimezone');
      assert.strictEqual(vtimezones.length, 2);
    });

    test('return non-vcalendar components unchanged', () => {
      const vevent = cal.getFirstSubcomponent('vevent');
      assert.deepEqual(subject(vevent), vevent);
    });
  });
});
