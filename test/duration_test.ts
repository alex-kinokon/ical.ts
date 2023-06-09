import { suite, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, hasProperties } from './support/helper';

suite('ical/duration', () => {
  test('#clone', () => {
    const subject = ICAL.Duration.fromData({
      weeks: 1,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      isNegative: true
    });

    const expected = {
      weeks: 1,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      isNegative: true
    };

    const expected2 = {
      weeks: 6,
      days: 7,
      hours: 8,
      minutes: 9,
      seconds: 10,
      isNegative: true
    };

    const subject2 = subject.clone();
    hasProperties(subject, expected, 'base object unchanged');
    hasProperties(subject2, expected, 'cloned object unchanged');

    for (const k in expected2) {
      subject2[k] = expected2[k];
    }

    hasProperties(subject, expected, 'base object unchanged');
    hasProperties(subject2, expected2, 'cloned object changed');
  });

  test('#reset', () => {
    const expected = {
      weeks: 1,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      isNegative: true
    };
    const subject = new ICAL.Duration(expected);
    hasProperties(subject, expected);

    subject.reset();

    hasProperties(subject, {
      weeks: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isNegative: false
    });

    assert.equal(subject.toString(), 'PT0S');
  });

  suite('#normalize', () => {
    function verify(name, str, data) {
      test(name, () => {
        const subject = new ICAL.Duration();
        for (const k in data) {
          subject[k] = data[k];
        }
        subject.normalize();
        assert.equal(subject.toString(), str);
        assert.equal(subject.toICALString(), str);
      });
    }

    verify('weeks and day => days', 'P50D', {
      weeks: 7,
      days: 1
    });
    verify('days => week', 'P2W', {
      days: 14
    });
    verify('days and weeks => week', 'P4W', {
      weeks: 2,
      days: 14
    });
    verify('seconds => everything', 'P1DT1H1M1S', {
      seconds: 86400 + 3600 + 60 + 1
    });
  });

  suite('#compare', () => {
    function verify(str, a, b, cmp) {
      test(str, () => {
        const dur_a = ICAL.Duration.fromString(a);
        const dur_b = ICAL.Duration.fromString(b);
        assert.equal(dur_a.compare(dur_b), cmp);
      });
    }

    verify('a>b', 'PT3H', 'PT1S', 1);
    verify('a<b', 'PT2M', 'P1W', -1);
    verify('a=b', 'P1W', 'P7D', 0);
    verify('negative/positive', 'P2H', '-P2H', 1);
  });

  suite('#fromString', () => {
    const base = {
      weeks: 0,
      days: 0,
      minutes: 0,
      seconds: 0,
      isNegative: false
    };

    function verify(string, data, verifystring?) {
      const expected = {};
      let key;

      for (key in base) {
        expected[key] = base[key];
      }

      for (key in data) {
        expected[key] = data[key];
      }

      test('parse: "' + string + '"', () => {
        const subject = ICAL.Duration.fromString(string);
        hasProperties(subject, expected);
        assert.equal(subject.toString(), verifystring || string);
      });
    }

    function verifyFail(string, errorParam) {
      test('expected failure: ' + string, () => {
        assert.throws(() => {
          ICAL.Duration.fromString(string);
        }, errorParam);
      });
    }

    verify('P7W', {
      weeks: 7
    });

    verify(
      'PT1H0M0S',
      {
        hours: 1
      },
      'PT1H'
    );

    verify('PT15M', {
      minutes: 15
    });

    verify(
      'P15DT5H0M20S',
      {
        days: 15,
        hours: 5,
        seconds: 20
      },
      'P15DT5H20S'
    );

    verify(
      '-P0DT0H30M0S',
      {
        isNegative: true,
        weeks: 0,
        days: 0,
        minutes: 30,
        seconds: 0
      },
      '-PT30M'
    );

    verifyFail('PT1WH', /Missing number before "H"/);
    verifyFail('PT1WsomeH', /Invalid number "some" before "H"/);
  });
});
