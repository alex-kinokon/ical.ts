import { setup, suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, load, loadSample, useTimezones } from './support/helper';

suite('parserv2', () => {
  let subject: typeof ICAL.parse;

  setup(() => {
    subject = ICAL.parse;
  });

  /**
   * Full parser tests fetch two resources
   * (one to parse, one is expected
   */
  suite('full parser tests', () => {
    const root = 'test/parser/';
    const list = [
      // icalendar tests
      'rfc.ics',
      'single_empty_vcalendar.ics',
      'property_params.ics',
      'newline_junk.ics',
      'unfold_properties.ics',
      'quoted_params.ics',
      'multivalue.ics',
      'values.ics',
      'recur.ics',
      'base64.ics',
      'dates.ics',
      'time.ics',
      'boolean.ics',
      'float.ics',
      'integer.ics',
      'period.ics',
      'utc_offset.ics',
      'component.ics',
      'tzid_with_gmt.ics',
      'multiple_root_components.ics',
      'grouped.ics',

      // vcard tests
      'vcard.vcf',
      'vcard_author.vcf',
      'vcard3.vcf',
      'vcard_grouped.vcf',
      'escape_semicolon.vcf'
    ];

    list.forEach(path => {
      suite(path.replace('_', ' '), () => {
        let input;
        let expected;

        // fetch ical
        setup(async () => {
          input = await load(root + path);
        });

        // fetch json
        setup(async () => {
          const data = await load(root + path.replace(/vcf|ics$/, 'json'));
          try {
            expected = JSON.parse(data.trim());
          } catch (e) {
            throw new Error('expect json is invalid: \n\n' + data);
          }
        });

        function jsonEqual(jsonActual, jsonExpected) {
          assert.deepEqual(
            jsonActual,
            jsonExpected,
            'hint use: ' +
              'http://tlrobinson.net/projects/javascript-fun/jsondiff/\n\n' +
              '\nexpected:\n\n' +
              JSON.stringify(jsonActual, null, 2) +
              '\n\n to equal:\n\n ' +
              JSON.stringify(jsonExpected, null, 2) +
              '\n\n'
          );
        }

        test('round-trip', () => {
          const parsed = subject(input);
          const ical = ICAL.stringify(parsed);

          // NOTE: this is not an absolute test that serialization
          //       works as our parser should be error tolerant and
          //       it is remotely possible that we consistently produce
          //       ICAL that only we can parse.
          jsonEqual(subject(ical), expected);
        });

        test('compare', () => {
          const actual = subject(input);
          jsonEqual(actual, expected);
        });
      });
    });
  });

  suite('invalid ical', () => {
    test('invalid property', () => {
      let ical = 'BEGIN:VCALENDAR\n';
      // no param or value token
      ical += 'DTSTART\n';
      ical += 'DESCRIPTION:1\n';
      ical += 'END:VCALENDAR';

      assert.throws(() => {
        subject(ical);
      }, /invalid line/);
    });

    test('invalid quoted params', () => {
      let ical = 'BEGIN:VCALENDAR\n';
      ical += 'X-FOO;BAR="quoted\n';
      // an invalid newline inside quoted parameter
      ical += 'params";FOO=baz:realvalue\n';
      ical += 'END:VCALENDAR';

      assert.throws(() => {
        subject(ical);
      }, /invalid line/);
    });

    test('missing value with param delimiter', () => {
      const ical = 'BEGIN:VCALENDAR\n' + 'X-FOO;\n';
      assert.throws(() => {
        subject(ical);
      }, 'Invalid parameters in');
    });

    test('missing param name ', () => {
      const ical = 'BEGIN:VCALENDAR\n' + 'X-FOO;=\n';
      assert.throws(() => {
        subject(ical);
      }, 'Empty parameter name in');
    });

    test('missing param value', () => {
      const ical = 'BEGIN:VCALENDAR\n' + 'X-FOO;BAR=\n';
      assert.throws(() => {
        subject(ical);
      }, 'Missing parameter value in');
    });

    test('missing component end', () => {
      let ical = 'BEGIN:VCALENDAR\n';
      ical += 'BEGIN:VEVENT\n';
      ical += 'BEGIN:VALARM\n';
      ical += 'DESCRIPTION: foo\n';
      ical += 'END:VALARM';
      // ended calendar before event
      ical += 'END:VCALENDAR';

      assert.throws(() => {
        subject(ical);
      }, /invalid/);
    });
  });

  suite('#_parseParameters', () => {
    test('with processed text', () => {
      const input = ';FOO=x\\na';
      const expected = {
        foo: 'x\na'
      };

      assert.deepEqual(
        subject._parseParameters(input, 0, ICAL.design.defaultSet)[0],
        expected
      );
    });

    test('with multiple vCard TYPE parameters', () => {
      const input = ';TYPE=work;TYPE=voice';
      const expected = {
        type: ['work', 'voice']
      };

      assert.deepEqual(
        subject._parseParameters(input, 0, ICAL.design.components.vcard)[0],
        expected
      );
    });

    test('with multiple iCalendar MEMBER parameters', () => {
      const input = ';MEMBER="urn:one","urn:two";MEMBER="urn:three"';
      const expected = {
        member: ['urn:one', 'urn:two', 'urn:three']
      };

      assert.deepEqual(
        subject._parseParameters(input, 0, ICAL.design.components.vevent)[0],
        expected
      );
    });

    test('with comma in singleValue parameter', () => {
      const input = ';LABEL="A, B"';
      const expected = {
        label: 'A, B'
      };

      assert.deepEqual(
        subject._parseParameters(input, 0, ICAL.design.components.vcard)[0],
        expected
      );
    });

    test('with comma in singleValue parameter after multiValue parameter', () => {
      // TYPE allows multiple values, whereas LABEL doesn't.
      const input = ';TYPE=home;LABEL="A, B"';
      const expected = {
        type: 'home',
        label: 'A, B'
      };

      assert.deepEqual(
        subject._parseParameters(input, 0, ICAL.design.components.vcard)[0],
        expected
      );
    });
  });

  test('#_parseMultiValue', () => {
    const values = 'woot\\, category,foo,bar,baz';
    const result = [];
    assert.deepEqual(
      subject._parseMultiValue(
        values,
        ',',
        'text',
        result,
        null,
        ICAL.design.defaultSet
      ),
      ['woot, category', 'foo', 'bar', 'baz']
    );
  });

  suite('#_parseValue', () => {
    test('text', () => {
      const value = 'start \\n next';
      const expected = 'start \n next';

      assert.equal(
        subject._parseValue(value, 'text', ICAL.design.defaultSet),
        expected
      );
    });
  });

  suite('#_eachLine', () => {
    function unfold(input) {
      const result = [];

      subject._eachLine(input, (err, line) => {
        result.push(line);
      });

      return result;
    }

    test('unfold single with \\r\\n', () => {
      const input = 'foo\r\n bar';
      const expected = ['foobar'];

      assert.deepEqual(unfold(input), expected);
    });

    test('with \\n', () => {
      const input = 'foo\nbar\n  baz';
      const expected = ['foo', 'bar baz'];

      assert.deepEqual(unfold(input), expected);
    });
  });

  suite('embedded timezones', () => {
    let icsDataEmbeddedTimezones: string;
    suiteSetup(async () => {
      icsDataEmbeddedTimezones = await loadSample('timezone_from_file.ics');
    });

    test('used in event date', () => {
      const parsed = ICAL.parse(icsDataEmbeddedTimezones);
      const component = new ICAL.Component(parsed);

      const event = new ICAL.Event(component.getFirstSubcomponent('vevent'));
      const startDate = event.startDate.toJSDate();
      const endDate = event.endDate.toJSDate();

      assert.equal(startDate.getUTCDate(), 6);
      assert.equal(startDate.getUTCHours(), 21);
      assert.equal(startDate.getUTCMinutes(), 23);

      assert.equal(endDate.getUTCDate(), 6);
      assert.equal(endDate.getUTCHours(), 22);
      assert.equal(endDate.getUTCMinutes(), 23);
    });
  });
});
