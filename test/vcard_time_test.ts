import { suite, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, useTimezones } from './support/helper';

suite('vcard time', () => {
  // Lots of things are also covered in the design test

  suite('initialization', () => {
    test('default icaltype', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString('2015-01-01');
      assert.equal(subject.icaltype, 'date-and-or-time');
    });

    test('clone', () => {
      const orig = ICAL.VCardTime.fromDateAndOrTimeString(
        '2015-01-02T03:04:05-08:00',
        'date-time'
      );
      const subject = orig.clone();

      orig.day++;
      orig.month++;
      orig.year++;
      orig.hour++;
      orig.minute++;
      orig.second++;
      orig.zone = ICAL.Timezone.utcTimezone;

      assert.equal(orig.toString(), '2016-02-03T04:05:06Z');
      assert.equal(subject.toString(), '2015-01-02T03:04:05-08:00');
      assert.equal(subject.icaltype, 'date-time');
      assert.equal(subject.zone.toString(), '-08:00');
    });
  });

  suite('#utcOffset', () => {
    useTimezones('America/New_York');

    test('floating and utc', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString(
        '2015-01-02T03:04:05',
        'date-time'
      );
      subject.zone = ICAL.Timezone.utcTimezone;
      assert.equal(subject.utcOffset(), 0);

      subject.zone = ICAL.Timezone.localTimezone;
      assert.equal(subject.utcOffset(), 0);
    });
    test('ICAL.UtcOffset', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString(
        '2015-01-02T03:04:05-08:00',
        'date-time'
      );
      assert.equal(subject.utcOffset(), -28800);
    });
    test('Olson timezone', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString(
        '2015-01-02T03:04:05'
      );
      subject.zone = ICAL.TimezoneService.get('America/New_York');
      assert.equal(subject.utcOffset(), -18000);
    });
  });

  suite('#toString', () => {
    useTimezones('America/New_York');

    test('invalid icaltype', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString(
        '2015-01-01',
        'ballparkfigure' as any
      );
      assert.isUndefined(subject.toString());
    });
    test('invalid timezone', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString(
        '2015-01-01T01:01:01'
      );
      subject.zone = null!;
      assert.equal(subject.toString(), '2015-01-01T01:01:01');
    });
    test('Olson timezone', () => {
      const subject = ICAL.VCardTime.fromDateAndOrTimeString(
        '2015-01-02T03:04:05'
      );
      subject.zone = ICAL.TimezoneService.get('America/New_York');
      assert.equal(subject.toString(), '2015-01-02T03:04:05-05:00');
    });
  });
});
