import { setup, suite, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, load } from './support/helper';

suite('ICAL.stringify', () => {
  suite('round trip tests', () => {
    const root = 'samples/';
    const list = [
      'minimal',
      'blank_line_end',
      'forced_types',
      'parserv2',
      'utc_negative_zero'
    ];

    list.forEach(path => {
      suite(path.replace('_', ' '), () => {
        let input;

        // fetch ical
        setup(async () => {
          input = await load(root + path + '.ics');
        });

        function jsonEqual(actual, expected) {
          assert.deepEqual(
            actual,
            expected,
            'hint use: ' +
              'http://tlrobinson.net/projects/javascript-fun/jsondiff/\n\n' +
              '\nexpected:\n\n' +
              JSON.stringify(actual, null, 2) +
              '\n\n to equal:\n\n ' +
              JSON.stringify(expected, null, 2) +
              '\n\n'
          );
        }

        test('round-trip', () => {
          const parsed = ICAL.parse(input);
          const ical = ICAL.stringify(parsed);

          // NOTE: this is not an absolute test that serialization
          //       works as our parser should be error tolerant and
          //       it is remotely possible that we consistently produce
          //       ICAL that only we can parse.
          jsonEqual(ICAL.parse(ical), parsed);
        });
      });
    });
  });

  suite('stringify property', () => {
    test('no explicit default set', () => {
      const subject = new ICAL.Property('tz', new ICAL.Component('vcard'));
      subject.setValue(ICAL.UtcOffset.fromString('+0500'));

      const ical = ICAL.stringify.property(subject.toJSON());
      assert.equal(ical, 'TZ;VALUE=UTC-OFFSET:+0500');
    });
    test('custom property with no default type', () => {
      ICAL.design.defaultSet.property.custom = {};
      const subject = new ICAL.Property('custom');
      subject.setValue('unescaped, right?');
      assert.equal(subject.toICALString(), 'CUSTOM:unescaped, right?');

      subject.resetType('integer');
      subject.setValue(123);
      assert.equal(subject.toICALString(), 'CUSTOM;VALUE=INTEGER:123');

      delete ICAL.design.defaultSet.property.custom;
    });

    test('custom property not using default type', () => {
      ICAL.design.defaultSet.property.custom = { defaultType: 'text' };
      const subject = new ICAL.Property('custom');
      subject.resetType('integer');
      subject.setValue(123);
      assert.equal(subject.toICALString(), 'CUSTOM;VALUE=INTEGER:123');
      delete ICAL.design.defaultSet.property.custom;
    });

    test('rfc6868 roundtrip', () => {
      const subject = new ICAL.Property('attendee');
      const input = 'caret ^ dquote " newline \n end';
      const expected =
        "ATTENDEE;CN=caret ^^ dquote ^' newline ^n end:mailto:id";
      subject.setParameter('cn', input);
      subject.setValue('mailto:id');
      assert.equal(subject.toICALString(), expected);
      assert.equal(ICAL.parse.property(expected)[1].cn, input);
    });

    test('folding', () => {
      const oldLength = ICAL.config.foldLength;
      const subject = new ICAL.Property('description');
      const N = ICAL.config.newLineChar + ' ';
      subject.setValue('foobar');

      ICAL.config.foldLength = 19;
      assert.equal(subject.toICALString(), 'DESCRIPTION:foobar');
      assert.equal(
        ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, false),
        'DESCRIPTION:foobar'
      );
      assert.equal(
        ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, true),
        'DESCRIPTION:foobar'
      );

      ICAL.config.foldLength = 15;
      assert.equal(subject.toICALString(), 'DESCRIPTION:foobar');
      assert.equal(
        ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, false),
        'DESCRIPTION:foo' + N + 'bar'
      );
      assert.equal(
        ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, true),
        'DESCRIPTION:foobar'
      );

      const utf16_muscle = '\uD83D\uDCAA'; // in UTF-8 this is F0 DF 92 AA.  If space/new line is inserted between the surrogates, then the JS Engine substitutes each stand-alone surrogate with REPLACEMENT CHARACTER 0xEF 0xBF 0xBD
      subject.setValue(utf16_muscle);
      assert.equal(
        ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, false),
        'DESCRIPTION:' + N + utf16_muscle
      ); // verify new line is after ':', as otherwise the whole line is longer than ICAL.config.foldLength
      subject.setValue(
        'aa' + utf16_muscle + utf16_muscle + 'a' + utf16_muscle + utf16_muscle
      );
      assert.equal(
        ICAL.stringify.property(subject.toJSON(), ICAL.design.icalendar, false),
        'DESCRIPTION:aa' +
          N +
          utf16_muscle +
          utf16_muscle +
          'a' +
          utf16_muscle +
          N +
          utf16_muscle
      ); // verify that the utf16_muscle is moved as whole to a new line as it is 4 UTF-8 bytes

      ICAL.config.foldLength = oldLength;
    });

    test('property groups', () => {
      // Make sure the GROUP param is stripped
      const subject = ['fn', { group: 'bff' }, 'text', 'coffee'];
      assert.equal(
        ICAL.stringify.property(subject, ICAL.design.vcard, false),
        'BFF.FN:coffee'
      );
    });
  });

  suite('stringify component', () => {
    test('minimal jcal', () => {
      const subject = [
        'vcalendar',
        [['version', {}, 'text', '2.0']],
        [['vevent', [], []]]
      ];
      const expected =
        'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nEND:VCALENDAR';

      assert.equal(ICAL.stringify.component(subject), expected);
    });

    test('minimal jcard', () => {
      // related to issue #266
      const subject = ['vcard', [['version', {}, 'text', '4.0']]];
      const expected = 'BEGIN:VCARD\r\nVERSION:4.0\r\nEND:VCARD';

      assert.equal(ICAL.stringify.component(subject), expected);
    });

    test('minimal jcard with empty subcomponent', () => {
      const subject = ['vcard', [['version', {}, 'text', '4.0']], []];
      const expected = 'BEGIN:VCARD\r\nVERSION:4.0\r\nEND:VCARD';

      assert.equal(ICAL.stringify.component(subject), expected);
    });

    test('structured values', () => {
      const subject = [
        'vcard',
        [
          [
            'adr',
            {},
            'text',
            [
              'one',
              'two',
              'three\n\n',
              'four\nfour\n',
              ['five', 'five\n\n', 'five\nfive\n'],
              'six',
              'seven'
            ]
          ]
        ]
      ];
      const expected =
        'BEGIN:VCARD\r\nADR:one;two;three\\n\\n;four\\nfour\\n;five,five\\n\\n,five\\nfive\\n;six;seven\r\nEND:VCARD';

      assert.equal(ICAL.stringify.component(subject), expected);
    });
  });
});
