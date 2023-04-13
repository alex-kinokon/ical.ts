import { setup, suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, hasProperties } from './support/helper';
import type Time from '../lib/ical/time';
import type Duration from '../lib/ical/duration';

suite('ical/period', () => {
  let start: Time;
  let end: Time;
  let duration: Duration;

  setup(() => {
    start = ICAL.Time.fromString('1970-01-02T03:04:05Z');
    end = ICAL.Time.fromString('1970-01-02T03:04:05Z');
    duration = ICAL.Duration.fromString('PT3H2M1S');
  });

  suite('#fromString', () => {
    function verify(string, icalstring, data) {
      test('parse: "' + string + '"', () => {
        const subject = ICAL.Period.fromString(string);

        assert.equal(subject.toICALString(), icalstring);
        assert.equal(subject.toString(), string);

        if ('start' in data) {
          assert.instanceOf(subject.start, ICAL.Time);
          hasProperties(subject.start, data.start, 'start property');
        }

        if ('end' in data) {
          if (data.end) {
            assert.instanceOf(subject.end, ICAL.Time);
            hasProperties(subject.end, data.end, 'end property');
          } else {
            assert.isUndefined(subject.end);
          }
        }

        if ('duration' in data) {
          if (data.duration) {
            assert.instanceOf(subject.duration, ICAL.Duration);
            hasProperties(subject.duration, data.duration, 'duration property');
          } else {
            assert.isUndefined(subject.duration);
          }
        }

        if ('calculatedDuration' in data) {
          const dur = subject.getDuration();

          if ('duration' in data && data.duration) {
            hasProperties(dur, data.duration, 'duration matches calculated');
          }
          hasProperties(dur, data.calculatedDuration);
        }
        if ('calculatedEnd' in data) {
          const subjectEnd = subject.getEnd();

          if ('end' in data && data.end) {
            hasProperties(subjectEnd, data.end, 'duration matches calculated');
          }
          hasProperties(subjectEnd, data.calculatedEnd);
        }
      });
    }

    function verifyFail(testname, string, errorParam) {
      test('invalid input "' + string + '"', () => {
        assert.throws(() => {
          ICAL.Period.fromString(string);
        }, errorParam);
      });
    }

    verifyFail(
      'missing slash',
      '1997-01-01T18:30:20Z1997-01-02T07:00:00Z',
      /Invalid string value/
    );
    verifyFail(
      'invalid start date',
      'some time before/1997-01-02T07:00:00Z',
      /invalid date-time value/
    );
    verifyFail(
      'invalid end param',
      '1997-01-02T07:00:00Z/some time after',
      /invalid date-time value/
    );
    verifyFail(
      'invalid end param that might be a duration',
      '1997-01-02T07:00:00Z/Psome time after',
      /invalid duration value/
    );

    verify(
      '1997-01-01T18:30:20Z/1997-01-02T07:00:00Z',
      '19970101T183020Z/19970102T070000Z',
      {
        start: {
          year: 1997,
          month: 1,
          day: 1,
          hour: 18,
          minute: 30,
          second: 20
        },

        end: {
          year: 1997,
          month: 1,
          day: 2,
          hour: 7
        },

        duration: null,
        calculatedDuration: {
          isNegative: false,
          hours: 12,
          minutes: 29,
          seconds: 40
        },
        calculatedEnd: {
          year: 1997,
          month: 1,
          day: 2,
          hour: 7
        }
      }
    );

    verify('1997-01-01T18:00:00Z/PT5H30M', '19970101T180000Z/PT5H30M', {
      start: {
        year: 1997,
        month: 1,
        day: 1,
        hour: 18
      },
      duration: {
        isNegative: false,
        hours: 5,
        minutes: 30
      },
      end: null,
      calculatedDuration: {
        isNegative: false,
        hours: 5,
        minutes: 30
      },
      calculatedEnd: {
        year: 1997,
        month: 1,
        day: 1,
        hour: 23,
        minute: 30
      }
    });
  });

  suite('#fromData', () => {
    test('valid start,end', () => {
      const subject = ICAL.Period.fromData({
        start,
        end
      });

      hasProperties(subject.start, start, 'start date');
      hasProperties(subject.end, end, 'end date');
      assert.isUndefined(subject.duration);
    });
    test('valid start,duration', () => {
      const subject = ICAL.Period.fromData({
        start,
        duration
      });

      hasProperties(subject.start, start, 'start date');
      assert.isUndefined(subject.end);
      hasProperties(subject.duration, duration, 'duration');
    });

    test('end value exists but is null', () => {
      const subject = ICAL.Period.fromData({
        start,
        end: null
      });
      hasProperties(subject.start, start, 'start date');
      assert.isUndefined(subject.end);
      assert.isUndefined(subject.duration);
    });

    test('start value exists but is null', () => {
      const subject = ICAL.Period.fromData({
        start: null,
        duration
      });
      assert.isUndefined(subject.start);
      assert.isUndefined(subject.end);
      hasProperties(subject.duration, duration, 'duration');
    });

    test('duration value exists but is null', () => {
      const subject = ICAL.Period.fromData({
        start,
        duration: null
      });
      hasProperties(subject.start, start, 'start date');
      assert.isUndefined(subject.end);
      assert.isNull(subject.duration);
    });

    test('start,end and duration', () => {
      assert.throws(() => {
        ICAL.Period.fromData({
          start,
          end,
          duration
        });
      }, /cannot accept both end and duration/);
    });

    test('start,end and duration but one is null', () => {
      const subject = ICAL.Period.fromData({
        start,
        end: null,
        duration
      });
      hasProperties(subject.start, start, 'start date');
      assert.isUndefined(subject.end);
      hasProperties(subject.duration, duration, 'duration');
    });

    test('invalid start value', () => {
      assert.throws(() => {
        ICAL.Period.fromData({
          start: '1970-01-02T03:04:05Z',
          end
        });
      }, /start must be an instance/);
    });
    test('invalid end value', () => {
      assert.throws(() => {
        ICAL.Period.fromData({
          start,
          end: '1970-01-02T03:04:05Z'
        });
      }, /end must be an instance/);
    });
    test('invalid duration value', () => {
      assert.throws(() => {
        ICAL.Period.fromData({
          start,
          duration: 'PT1S'
        });
      }, /duration must be an instance/);
    });
  });

  suite('#toString', () => {
    test('start,end', () => {
      const subject = ICAL.Period.fromData({
        start,
        end
      });
      assert.equal(
        subject.toString(),
        '1970-01-02T03:04:05Z/1970-01-02T03:04:05Z'
      );
    });
    test('start,duration', () => {
      const subject = ICAL.Period.fromData({
        start,
        duration
      });
      assert.equal(subject.toString(), '1970-01-02T03:04:05Z/PT3H2M1S');
    });
  });

  suite('generating jCal', () => {
    test('jCal from parser', () => {
      const prop = ICAL.parse.property('FREEBUSY:20140401T010101/PT1H');
      const val = prop[3];
      assert.deepEqual(val, ['2014-04-01T01:01:01', 'PT1H']);
    });
    test('jCal from property', () => {
      const prop = ICAL.Property.fromString('FREEBUSY:20140401T010101/PT1H');
      const val = prop.getFirstValue().toJSON();
      assert.deepEqual(val, ['2014-04-01T01:01:01', 'PT1H']);
    });
  });

  suite('#clone', () => {
    test('cloned start/duration', () => {
      const subjectstart = start.clone();
      const subjectduration = duration.clone();
      const subject1 = ICAL.Period.fromData({
        start: subjectstart,
        duration: subjectduration
      });
      const subject2 = subject1.clone();
      subjectstart.hour++;
      subjectduration.hours++;

      assert.equal(subject1.start.hour, 4);
      assert.equal(subject2.start.hour, 3);

      assert.equal(subject1.duration.hours, 4);
      assert.equal(subject2.duration.hours, 3);
    });
    test('cloned start/end', () => {
      const subjectstart = start.clone();
      const subjectend = end.clone();
      const subject1 = ICAL.Period.fromData({
        start: subjectstart,
        end: subjectend
      });
      const subject2 = subject1.clone();
      subjectstart.hour++;
      subjectend.hour++;

      assert.equal(subject1.start.hour, 4);
      assert.equal(subject2.start.hour, 3);

      assert.equal(subject1.end.hour, 4);
      assert.equal(subject2.end.hour, 3);
    });
    test('cloned empty object', () => {
      // most importantly, this shouldn't throw.
      const subject1 = ICAL.Period.fromData();
      const subject2 = subject1.clone();

      assert.equal(subject1.start, subject2.start);
      assert.equal(subject1.end, subject2.end);
      assert.equal(subject1.duration, subject2.duration);
    });
  });
});
