import { setup, suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, hasProperties } from './support/helper';

suite('Property', () => {
  let fixtures;

  setup(() => {
    fixtures = {
      component: ['vevent', [], []],
      vcardComponent: ['vcard', [], []],

      noValue: ['x-foo', { prop: 'prop' }, 'text'],

      textProp: ['description', {}, 'text', 'foo'],

      withParams: [
        'x-foo',
        {
          rsvp: 'TRUE',
          meta: 'foo'
        },
        'date',
        '2012-10-01'
      ],

      decoratedMultiValue: ['rdate', {}, 'date', '2012-10-10', '2012-10-11'],

      mutliTextValue: ['categories', {}, 'text', 'one', 'two', 'three']
    };
  });

  suite('initialization', () => {
    test('undecorated', () => {
      const subject = new ICAL.Property(
        fixtures.textProp,
        new ICAL.Component(fixtures.component)
      );

      assert.equal(subject.jCal, fixtures.textProp);
      assert.equal(subject.name, 'description');
      assert.equal(subject.type, 'text');

      assert.isFalse(subject.isDecorated);
    });

    test('multi value', () => {
      let subject = new ICAL.Property('categories');
      assert.isTrue(subject.isMultiValue, 'is multiValue');

      subject = new ICAL.Property('url');
      assert.isFalse(subject.isMultiValue, 'is not multiValue');
    });

    test('structured value', () => {
      let subject = new ICAL.Property('request-status');
      assert.isTrue(subject.isStructuredValue, 'is structured value');

      subject = new ICAL.Property('url');
      assert.isFalse(subject.isStructuredValue, 'is not structured value');
    });

    test('decorated', () => {
      const subject = new ICAL.Property(
        fixtures.withParams,
        new ICAL.Component(fixtures.component)
      );

      assert.isTrue(subject.isDecorated);
    });

    test('new property by name with type', () => {
      const subject = new ICAL.Property('dtstart');
      assert.equal(subject.type, 'date-time');
      assert.equal(subject.jCal[2], 'date-time');
      assert.equal(subject._designSet, ICAL.design.icalendar);
    });

    test('new vcard property without parent (unknown type)', () => {
      const subject = new ICAL.Property('anniversary');
      assert.equal(subject.type, 'unknown');
      assert.equal(subject.jCal[2], 'unknown');
      assert.equal(subject._designSet, ICAL.design.icalendar);
    });

    test('new vcard property with vcard parent (known type)', () => {
      const parent = new ICAL.Component(fixtures.vcardComponent);
      const subject = new ICAL.Property('anniversary', parent);
      assert.equal(subject.type, 'date-and-or-time');
      assert.equal(subject.jCal[2], 'date-and-or-time');
      assert.equal(subject._designSet, ICAL.design.vcard);
    });

    test('custom design value without defaultType', () => {
      ICAL.design.defaultSet.property.custom = {};
      const subject = new ICAL.Property('custom');
      assert.equal(subject.type, ICAL.design.defaultType);
      assert.equal(subject.jCal[2], ICAL.design.defaultType);
      delete ICAL.design.defaultSet.property.custom;
    });

    test('new property by name (typeless)', () => {
      const subject = new ICAL.Property('description');

      assert.equal(subject.name, 'description');

      assert.equal(subject.type, 'text');
      assert.equal(subject.jCal[2], 'text');

      assert.ok(!subject.getFirstValue());
    });

    test('types change when changing design set', () => {
      const property = new ICAL.Property('fn');
      const component = new ICAL.Component('vcard');

      assert.equal(property._designSet, ICAL.design.defaultSet);
      assert.equal(property.type, 'unknown');

      component.addProperty(property);
      assert.equal(property._designSet, ICAL.design.vcard);
      assert.equal(property.type, 'text');
    });

    suite('#fromString', () => {
      test('x-prop with known type', () => {
        const prop = ICAL.Property.fromString('X-FOO;VALUE=BOOLEAN:TRUE');
        assert.equal(prop.name, 'x-foo');
        assert.equal(prop.type, 'boolean');
        assert.isTrue(prop.getFirstValue());
      });

      test('invalid prop', () => {
        assert.throws(() => {
          ICAL.Property.fromString('BWAHAHAHAHA');
        }, /invalid line/);
      });
    });
  });

  test('#getParameter', () => {
    const subject = new ICAL.Property(fixtures.withParams);

    assert.equal(subject.getParameter('rsvp'), 'TRUE');
    assert.equal(subject.getParameter('wtf'), undefined);
  });

  suite('#getFirstParameter', () => {
    test('with multivalue parameter', () => {
      const subject = new ICAL.Property('categories');

      subject.setParameter('categories', ['Home', 'Work']);

      assert.equal(subject.getFirstParameter('categories'), 'Home');
    });

    test('with string parameter', () => {
      const subject = new ICAL.Property(fixtures.withParams);

      assert.equal(subject.getFirstParameter('rsvp'), 'TRUE');
    });
  });

  test('#removeParameter', () => {
    const subject = new ICAL.Property(fixtures.withParams);

    subject.removeParameter('rsvp');
    assert.ok(!subject.getParameter('rsvp'));
  });

  test('#setParameter', () => {
    const subject = new ICAL.Property(fixtures.textProp);

    subject.setParameter('my-prop', 'woot?');

    assert.equal(subject.getParameter('my-prop'), 'woot?');

    assert.deepEqual(subject.jCal[1], { 'my-prop': 'woot?' });
  });

  test('#setMultiValueParameterByString', () => {
    const subject = new ICAL.Property(fixtures.withParams);

    subject.setParameter('member', 'mailto:users@example.net');

    assert.equal(subject.getParameter('member')[0], 'mailto:users@example.net');
  });

  test('#setMultiValueParameter', () => {
    const subject = new ICAL.Property(fixtures.withParams);

    subject.setParameter('member', ['mailto:users@example.net']);

    assert.equal(subject.getParameter('member')[0], 'mailto:users@example.net');
  });

  suite('getFirstValue', () => {
    test('with no value', () => {
      const subject = new ICAL.Property(fixtures.noValue);

      assert.ok(!subject.getFirstValue());
    });

    test('with decorated type', () => {
      const subject = new ICAL.Property(fixtures.withParams);

      const value = subject.getFirstValue();

      assert.instanceOf(value, ICAL.Time);
      // 2012-10-01
      hasProperties(
        value,
        { year: 2012, month: 10, day: 1, isDate: true },
        'property correctness'
      );

      assert.equal(
        subject.getFirstValue(),
        subject.getFirstValue(),
        'decorated equality'
      );
    });

    test('without decorated type', () => {
      const subject = new ICAL.Property(fixtures.textProp);
      const value = subject.getFirstValue();

      assert.equal(value, subject.jCal[3]);
    });
  });

  test('#resetType', () => {
    const subject = new ICAL.Property('dtstart');
    subject.setValue(new ICAL.Time({ year: 2012, hour: 10, minute: 1 }));

    assert.equal(subject.type, 'date-time');

    subject.resetType('date');
    assert.equal(subject.type, 'date');

    assert.ok(!subject.getFirstValue());
    subject.setValue(new ICAL.Time({ year: 2012 }));
  });

  suite('#getDefaultType', () => {
    test('known type', () => {
      const subject = new ICAL.Property('dtstart');
      subject.setValue(new ICAL.Time({ year: 2012, hour: 20 }));

      assert.equal(subject.type, 'date-time');
      assert.equal(subject.getDefaultType(), 'date-time');

      subject.setValue(new ICAL.Time({ year: 2012 }));

      assert.equal(subject.type, 'date');
      assert.equal(subject.getDefaultType(), 'date-time');
    });

    test('unknown type', () => {
      const subject = new ICAL.Property('x-unknown');
      subject.setValue(new ICAL.Time({ year: 2012, hour: 20 }));

      assert.equal(subject.getFirstValue().icaltype, 'date-time');
      assert.equal(subject.type, 'date-time');
      assert.equal(subject.getDefaultType(), 'unknown');
    });

    test('vcard type', () => {
      const parent = new ICAL.Component(fixtures.vcardComponent);
      const subject = new ICAL.Property('anniversary', parent);
      subject.resetType('text');

      assert.equal(subject.getDefaultType(), 'date-and-or-time');
    });
  });

  suite('#getFirstValue', () => {
    test('with value', () => {
      const subject = new ICAL.Property('description');
      subject.setValue('foo');

      assert.equal(subject.getFirstValue(), 'foo');
    });

    test('without value', () => {
      const subject = new ICAL.Property('dtstart');
      assert.ok(!subject.getFirstValue());
    });
  });

  suite('#getValues', () => {
    test('decorated', () => {
      const subject = new ICAL.Property(fixtures.decoratedMultiValue);

      const result = subject.getValues();
      assert.lengthOf(result, 2);

      // 2012-10-10
      hasProperties(result[0], {
        year: 2012,
        month: 10,
        day: 10,
        isDate: true
      });

      // 2012-10-11
      hasProperties(result[1], {
        year: 2012,
        month: 10,
        day: 11,
        isDate: true
      });
    });

    test('undecorated', () => {
      const subject = new ICAL.Property(fixtures.mutliTextValue);

      const result = subject.getValues();
      assert.lengthOf(result, 3);
      assert.deepEqual(result, ['one', 'two', 'three']);
    });

    test('single value', () => {
      const subject = new ICAL.Property(fixtures.textProp);
      assert.deepEqual(subject.getValues(), [subject.jCal[3]]);
    });

    test('no values', () => {
      const subject = new ICAL.Property(fixtures.noValue);
      assert.deepEqual(subject.getValues(), []);
      assert.equal(subject.toICALString(), 'X-FOO;PROP=prop:');
    });

    test('foldable value', () => {
      const subject = new ICAL.Property(fixtures.textProp);
      assert.deepEqual(subject.getValues(), ['foo']);
      assert.equal(subject.toICALString(), 'DESCRIPTION:foo');
      // Fold length should not fold the property here
      const oldLength = ICAL.config.foldLength;
      ICAL.config.foldLength = 1;
      assert.equal(subject.toICALString(), 'DESCRIPTION:foo');
      ICAL.config.foldLength = oldLength;
    });
  });

  suite('#setValues', () => {
    test('decorated value', () => {
      const subject = new ICAL.Property('rdate');
      const { undecorate } = ICAL.design.icalendar.value['date-time'];

      const values = [
        new ICAL.Time({ year: 2012, month: 1 }),
        new ICAL.Time({ year: 2012, month: 1 })
      ];

      subject.setValues(values);

      assert.deepEqual(subject.jCal.slice(3), [
        undecorate(values[0]),
        undecorate(values[1])
      ]);

      assert.equal(subject.getFirstValue(), values[0]);
    });

    test('text', () => {
      const subject = new ICAL.Property('categories');

      subject.setValues(['a', 'b', 'c']);

      assert.deepEqual(subject.getValues(), ['a', 'b', 'c']);

      subject.setValues(['a']);
      assert.deepEqual(subject.getValues(), ['a']);
    });
  });

  suite('#setValue', () => {
    test('decorated value as string', () => {
      const subject = new ICAL.Property('dtstart');

      subject.setValue('2012-09-01T13:00:00');
      const value = subject.getFirstValue();

      assert.equal(subject.type, 'date-time');
      assert.instanceOf(value, ICAL.Time);

      hasProperties(value, {
        year: 2012,
        month: 9,
        day: 1,
        hour: 13
      });
    });

    test('decorated value as object', () => {
      const subject = new ICAL.Property('dtstart');

      const time = new ICAL.Time({
        year: 2012,
        month: 1,
        day: 5
      });

      subject.setValue(time);
      assert.equal(subject.type, 'date');

      assert.equal(
        subject.jCal[3],
        ICAL.design.icalendar.value.date.undecorate(time)
      );

      assert.equal(subject.getFirstValue(), time);
    });

    test('text', () => {
      const subject = new ICAL.Property('description');
      assert.ok(!subject.getFirstValue());
      subject.setValue('xxx');
      assert.equal(subject.getFirstValue(), 'xxx');
    });

    test('multivalue property', () => {
      const subject = new ICAL.Property('categories');
      subject.setValues(['work', 'play']);
      subject.setValue('home');
      assert.deepEqual(subject.getValues(), ['home']);
      assert.equal(subject.getFirstValue(), 'home');
    });

    test('single-value property setting multiple values', () => {
      const subject = new ICAL.Property('location');
      assert.throws(() => {
        subject.setValues(['foo', 'bar']);
      }, 'does not not support mulitValue');
    });
  });

  test('#toJSON', () => {
    const subject = new ICAL.Property(['description', {}, 'text', 'foo']);

    assert.deepEqual(subject.toJSON(), subject.jCal);

    const fromJSON = new ICAL.Property(JSON.parse(JSON.stringify(subject)));

    assert.deepEqual(fromJSON.jCal, subject.jCal);
  });
});
