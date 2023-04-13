import { suite } from 'mocha';
import { ICAL, perfTest } from '../support/helper';

suite('ICAL.Time', () => {
  perfTest('subtract date', () => {
    const time = new ICAL.Time({
      year: 2012,
      month: 1,
      day: 1,
      hour: 10,
      minute: 3
    });

    const time2 = new ICAL.Time({
      year: 2012,
      month: 10,
      day: 1,
      hour: 1,
      minute: 55
    });

    time.subtractDate(time2);
  });

  const dur = new ICAL.Duration({
    days: 3,
    hour: 3,
    minutes: 3
  });

  perfTest('add duration', () => {
    const time = new ICAL.Time({
      year: 2012,
      month: 1,
      day: 32,
      seconds: 1
    });

    time.addDuration(dur);

    // to trigger normalization
    time.year; // eslint-disable-line no-unused-expressions
  });

  perfTest('create and clone time', () => {
    const time = new ICAL.Time({
      year: 2012,
      month: 1,
      day: 32,
      seconds: 1
    });

    if (time.day !== 1) {
      throw new Error('test sanity fails for .day');
    }

    if (time.month !== 2) {
      throw new Error('test sanity fails for .month');
    }

    time.clone();
  });

  const _time = new ICAL.Time({
    year: 2012,
    month: 1,
    day: 32,
    seconds: 1
  });

  perfTest('toUnixTime', () => {
    _time.toUnixTime();
  });

  perfTest('fromUnixTime', () => {
    _time.fromUnixTime(1234567890);
  });

  perfTest('dayOfWeek', () => {
    _time.dayOfWeek();
  });

  perfTest('weekNumber', () => {
    _time.weekNumber();
  });
});
