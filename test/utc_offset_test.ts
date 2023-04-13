import { suite, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, hasProperties } from './support/helper';

suite('ICAL.UtcOffset', () => {
  test('#clone', () => {
    const subject = new ICAL.UtcOffset({ hours: 5, minutes: 6 });
    assert.equal(subject.toString(), '+05:06');

    const cloned = subject.clone();
    subject.hours = 6;

    assert.equal(cloned.toString(), '+05:06');
    assert.equal(subject.toString(), '+06:06');
  });

  test('#toICALString', () => {
    const subject = new ICAL.UtcOffset({ hours: 5, minutes: 6 });
    assert.equal(subject.toString(), '+05:06');
    assert.equal(subject.toICALString(), '+0506');
  });

  suite('#normalize', () => {
    test('minute overflow', () => {
      hasProperties(
        new ICAL.UtcOffset({
          minutes: 120
        }),
        {
          hours: 2,
          minutes: 0,
          factor: 1
        }
      );
    });
    test('minutes underflow', () => {
      hasProperties(
        new ICAL.UtcOffset({
          minutes: -120
        }),
        {
          hours: 2,
          minutes: 0,
          factor: -1
        }
      );
    });
    test('minutes underflow with hours', () => {
      hasProperties(
        new ICAL.UtcOffset({
          hours: 2,
          minutes: -120
        }),
        {
          hours: 0,
          minutes: 0,
          factor: 1
        }
      );
    });
    test('hours overflow', () => {
      hasProperties(
        new ICAL.UtcOffset({
          hours: 15,
          minutes: 30
        }),
        {
          hours: 11,
          minutes: 30,
          factor: -1
        }
      );
    });
    test('hours underflow', () => {
      hasProperties(
        new ICAL.UtcOffset({
          hours: 13,
          minutes: 30,
          factor: -1
        }),
        {
          hours: 13,
          minutes: 30,
          factor: 1
        }
      );
    });
    test('hours double underflow', () => {
      hasProperties(
        new ICAL.UtcOffset({
          hours: 40,
          minutes: 30,
          factor: -1
        }),
        {
          hours: 13,
          minutes: 30,
          factor: 1
        }
      );
    });
    test('negative zero utc offset', () => {
      hasProperties(
        new ICAL.UtcOffset({
          hours: 0,
          minutes: 0,
          factor: -1
        }),
        {
          hours: 0,
          minutes: 0,
          factor: -1
        }
      );
    });
  });

  suite('#compare', () => {
    test('greater', () => {
      const a = new ICAL.UtcOffset({ hours: 5, minutes: 1 });
      const b = new ICAL.UtcOffset({ hours: 5, minutes: 0 });
      assert.equal(a.compare(b), 1);
    });
    test('equal', () => {
      const a = new ICAL.UtcOffset({ hours: 15, minutes: 0 });
      const b = new ICAL.UtcOffset({ hours: -12, minutes: 0 });
      assert.equal(a.compare(b), 0);
    });
    test('equal zero', () => {
      const a = new ICAL.UtcOffset({ hours: 0, minutes: 0, factor: -1 });
      const b = new ICAL.UtcOffset({ hours: 0, minutes: 0 });
      assert.equal(a.compare(b), 0);
    });
    test('less than', () => {
      const a = new ICAL.UtcOffset({ hours: 5, minutes: 0 });
      const b = new ICAL.UtcOffset({ hours: 5, minutes: 1 });
      assert.equal(a.compare(b), -1);
    });
  });

  suite('from/toSeconds', () => {
    test('static', () => {
      const subject = ICAL.UtcOffset.fromSeconds(3661);
      assert.equal(subject.toString(), '+01:01');
      assert.equal(subject.toSeconds(), 3660);
    });
    test('instance', () => {
      const subject = ICAL.UtcOffset.fromSeconds(3661);
      subject.fromSeconds(-7321);
      assert.equal(subject.toString(), '-02:02');
      assert.equal(subject.toSeconds(), -7320);
    });
  });
});
