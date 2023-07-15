import { setup, suite, test } from 'mocha';
import { assert } from 'chai';
import { ICAL } from './support/helper';
import type { Component } from '../lib/ical';

suite('Component', () => {
  let subject: Component;
  let fixtures: {
    components: [string, any[], any[]];
  };

  setup(() => {
    fixtures = {
      components: [
        'vevent',
        [
          ['description', {}, 'text', 'xfoo'],
          ['description', {}, 'text', 'xfoo2'],
          ['xfoo', {}, 'text', 'xfoo3']
        ],
        [
          ['valarm', [], []],
          ['vtodo', [], []],
          ['valarm', [['description', {}, 'text', 'foo']], []]
        ]
      ]
    };

    subject = new ICAL.Component(fixtures.components);
  });

  suite('initialization', () => {
    test('initialize component', () => {
      const raw = ['description', {}, 'text', 'value'];
      subject = new ICAL.Component(raw);

      assert.equal(subject.jCal, raw, 'has jCal');
      assert.equal(subject.name, 'description');
    });

    test('new component without jCal', () => {
      const newComp = new ICAL.Component('vevent');

      assert.equal(newComp.jCal[0], 'vevent');

      assert.lengthOf(newComp.getAllSubcomponents(), 0);
      assert.lengthOf(newComp.getAllProperties(), 0);
    });

    test('#fromString', () => {
      const comp = ICAL.Component.fromString(
        'BEGIN:VCALENDAR\nX-CALPROP:value\nEND:VCALENDAR'
      );
      assert.equal(comp.name, 'vcalendar');
      const prop = comp.getFirstProperty();
      assert.equal(prop.name, 'x-calprop');
      assert.equal(prop.getFirstValue(), 'value');
    });
  });

  suite('parenting', () => {
    // Today we hear a tale about Tom, Marge, Bernhard and Claire.
    let tom: ICAL.Component;
    let bernhard: ICAL.Component;
    let claire: ICAL.Component;
    let marge: ICAL.Component;
    let relationship: ICAL.Component;
    let house: ICAL.Property;
    let otherhouse: ICAL.Property;

    setup(() => {
      tom = new ICAL.Component('tom');
      bernhard = new ICAL.Component('bernhard');
      claire = new ICAL.Component('claire');
      marge = new ICAL.Component('marge');
      relationship = new ICAL.Component('vrelationship');
      house = new ICAL.Property('house');
      otherhouse = new ICAL.Property('otherhouse');
    });

    test('basic', () => {
      // Tom and Bernhard are best friends. They are happy and single.
      assert.isNull(tom.parent);
      assert.isNull(bernhard.parent);

      // One day, they get to know Marge, who is also single.
      assert.isNull(marge.parent);

      // Tom and Bernhard play rock paper scissors on who gets a first shot at
      // Marge and Tom wins. After a few nice dates they get together.
      relationship.addSubcomponent(tom);
      relationship.addSubcomponent(marge);

      // Both are happy as can be and tell everyone about their love. Nothing
      // goes above their relationship!
      assert.isNull(relationship.parent);
      assert.equal(tom.parent, relationship);
      assert.equal(marge.parent, relationship);

      // Over the years, there are a few ups and downs.
      relationship.removeSubcomponent(tom);
      assert.isNull(relationship.parent);
      assert.isNull(tom.parent);
      assert.equal(marge.parent, relationship);
      relationship.removeAllSubcomponents();
      assert.isNull(marge.parent);

      // But in the end they stay together.
      relationship.addSubcomponent(tom);
      relationship.addSubcomponent(marge);
    });

    test('multiple children', () => {
      // After some happy years Tom and Marge get married. Tom is going to be father
      // of his beautiful daughter Claire.
      tom.addSubcomponent(claire);

      // He has no doubt he is the father
      assert.equal(claire.parent, tom);

      // One day, Tom catches his wife in bed with his best friend Bernhard.
      // Tom is very unhappy and requests a paternity test. It turns out that
      // Claire is actually Bernhard's daughter.
      bernhard.addSubcomponent(claire);

      // Bernhard is happy to hear about his daughter, while Tom goes about to
      // tell everyone he knows. Claire is devastated and would have rather
      // found out about this.
      assert.isFalse(tom.removeSubcomponent(claire));

      // Marge knew it all along. What a sad day. Claire is not Tom's daughter,
      // but instead Bernhard's. Tom has no children, and Bernhard is the happy
      // father of his daughter claire.
      assert.equal(claire.parent, bernhard);
      assert.isNull(tom.getFirstSubcomponent());
      assert.equal(bernhard.getFirstSubcomponent(), claire);

      // Feeling depressed, Tom tries to find happyness with a pet, but all he
      // got was scratches and sadness. That didn't go so well.
      assert.throws(() => {
        tom.addProperty('bird');
      }, 'must be instance of ICAL.Property');
    });

    test('properties', () => {
      // Marge lives on a property near the Hamptons, she thinks it belongs to
      // her.
      marge.addProperty(house);
      assert.equal(house.parent, marge);

      // It seems that Tom didn't always trust Marge, he had fooled her. The
      // house belongs to him.
      tom.addProperty(house);
      assert.equal(house.parent, tom);
      assert.isNull(marge.getFirstProperty());

      // Bernhard being an aggressive character, tries to throw Tom out of his
      // own house. A long visit in the hospital lets neighbors believe noone
      // lives there anymore.
      tom.removeProperty(house);
      assert.isNull(house.parent);

      // Marge spends a few nights there, but also lives in her other house.
      marge.addProperty(house);
      marge.addProperty(otherhouse);
      assert.equal(house.parent, marge);
      assert.equal(otherhouse.parent, marge);

      // Tom is back from the hospital and very mad. He throws marge out of his
      // house. Unfortunately marge can no longer pay the rent for her other
      // house either.
      marge.removeAllProperties();
      assert.isNull(house.parent);
      assert.isNull(otherhouse.parent);

      // What a mess. What do we learn from this testsuite? Infidelity is not a
      // good idea. Always be faithful!
    });
  });

  suite('#getFirstSubcomponent', () => {
    let jCal: typeof fixtures.components;

    setup(() => {
      jCal = fixtures.components;
      subject = new ICAL.Component(jCal);
    });

    test('without name', () => {
      const component = subject.getFirstSubcomponent()!;
      assert.equal(component.parent, subject);
      assert.equal(component.name, 'valarm');

      // first sub component
      const expected = jCal[2][0];

      assert.equal(component.jCal, expected);
    });

    test('with name (when not first)', () => {
      const component = subject.getFirstSubcomponent('vtodo')!;

      assert.equal(component.parent, subject);

      assert.equal(component.name, 'vtodo');
      assert.equal(component.jCal, jCal[2][1]);
    });

    test('with name (when there are two)', () => {
      const component = subject.getFirstSubcomponent('valarm')!;
      assert.equal(component.name, 'valarm');
      assert.equal(component.jCal, jCal[2][0]);
    });

    test('equality between calls', () => {
      assert.equal(
        subject.getFirstSubcomponent(),
        subject.getFirstSubcomponent()
      );
    });
  });

  suite('#getAllSubcomponents', () => {
    test('with components', () => {
      // 2 is the component array
      const comps = fixtures.components[2];

      subject = new ICAL.Component(fixtures.components);

      const result = subject.getAllSubcomponents();
      assert.lengthOf(result, comps.length);

      for (let i = 0; i < comps.length; i++) {
        assert.instanceOf(result[i], ICAL.Component);
        assert.equal(result[i].jCal, comps[i]);
      }
    });

    test('with name', () => {
      subject = new ICAL.Component(fixtures.components);

      const result = subject.getAllSubcomponents('valarm');
      assert.lengthOf(result, 2);

      result.forEach(item => {
        assert.equal(item.name, 'valarm');
      });
    });

    test('without components', () => {
      subject = new ICAL.Component(['foo', [], []]);
      assert.equal(subject.name, 'foo');
      assert.lengthOf(subject.getAllSubcomponents(), 0);
    });

    test('with name from end', () => {
      // We need our own subject for this test
      const oursubject = new ICAL.Component(fixtures.components);

      // Get one from the end first
      const comps = fixtures.components[2];
      oursubject.getAllSubcomponents(comps[comps.length - 1][0]);

      // Now get them all, they MUST be hydrated
      const results = oursubject.getAllSubcomponents();
      for (let i = 0; i < results.length; i++) {
        assert.isDefined(results[i]);
        assert.equal(results[i].jCal, subject.jCal[2][i]);
      }
    });
  });

  test('#addSubcomponent', () => {
    const newComp = new ICAL.Component('xnew');

    subject.addSubcomponent(newComp);
    const all = subject.getAllSubcomponents();

    assert.equal(all[all.length - 1], newComp, 'can reference component');

    assert.equal(
      all.length,
      subject.jCal[2].length,
      'has same number of items'
    );

    assert.equal(subject.jCal[2][all.length - 1], newComp.jCal, 'adds jCal');
  });

  suite('#removeSubcomponent', () => {
    test('by name', () => {
      subject.removeSubcomponent('vtodo');

      const all = subject.getAllSubcomponents();

      all.forEach(item => {
        assert.equal(item.name, 'valarm');
      });
    });

    test('by component', () => {
      const first = subject.getFirstSubcomponent()!;

      subject.removeSubcomponent(first);

      assert.notEqual(subject.getFirstSubcomponent(), first);

      assert.equal(subject.getFirstSubcomponent()!.name, 'vtodo');
    });

    test('remove non hydrated subcomponent should not shift hydrated property', () => {
      const component = new ICAL.Component([
        'vevent',
        [],
        [
          ['a', [], []],
          ['b', [], []],
          ['c', [], []]
        ]
      ]);
      component.getFirstSubcomponent('b');
      component.removeSubcomponent('a');
      const cValue = component.getFirstSubcomponent('c')!.name;
      assert.equal(cValue, 'c');
    });
  });

  suite('#removeAllSubcomponents', () => {
    test('with name', () => {
      subject.removeAllSubcomponents('valarm');
      assert.lengthOf(subject.jCal[2], 1);
      assert.equal(subject.jCal[2][0][0], 'vtodo');
      assert.lengthOf(subject.getAllSubcomponents(), 1);
    });

    test('all', () => {
      subject.removeAllSubcomponents();
      assert.lengthOf(subject.jCal[2], 0);
      assert.lengthOf(subject.getAllSubcomponents(), 0);
    });
  });

  test('#hasProperty', () => {
    subject = new ICAL.Component(fixtures.components);

    assert.ok(subject.hasProperty('description'));
    assert.ok(!subject.hasProperty('iknowitsnothere'));
  });

  suite('#getFirstProperty', () => {
    setup(() => {
      subject = new ICAL.Component(fixtures.components);
    });

    test('name missing', () => {
      assert.ok(!subject.getFirstProperty('x-foo'));
    });

    test('name has multiple', () => {
      const first = subject.getFirstProperty('description')!;
      assert.equal(first, subject.getFirstProperty());

      assert.equal(first.getFirstValue(), 'xfoo');
    });

    test('without name', () => {
      const first = subject.getFirstProperty()!;
      assert.equal(first.jCal, fixtures.components[1][0]);
    });

    test('without name empty', () => {
      subject = new ICAL.Component(['foo', [], []]);
      assert.ok(!subject.getFirstProperty());
    });
  });

  test('#getFirstPropertyValue', () => {
    subject = new ICAL.Component(fixtures.components);
    assert.equal(subject.getFirstPropertyValue(), 'xfoo');
  });

  suite('#getAllProperties', () => {
    setup(() => {
      subject = new ICAL.Component(fixtures.components);
    });

    test('with name', () => {
      const results = subject.getAllProperties('description');
      assert.lengthOf(results, 2);

      results.forEach((item, i) => {
        assert.equal(item.jCal, subject.jCal[1][i]);
      });
    });

    test('with name empty', () => {
      const results = subject.getAllProperties('wtfmissing');
      assert.deepEqual(results, []);
    });

    test('without name', () => {
      const results = subject.getAllProperties();
      results.forEach((item, i) => {
        assert.equal(item.jCal, subject.jCal[1][i]);
      });
    });

    test('with name from end', () => {
      // We need our own subject for this test
      const oursubject = new ICAL.Component(fixtures.components);

      // Get one from the end first
      const props = fixtures.components[1];
      oursubject.getAllProperties(props[props.length - 1][0]);

      // Now get them all, they MUST be hydrated
      const results = oursubject.getAllProperties();
      for (let i = 0; i < results.length; i++) {
        assert.isDefined(results[i]);
        assert.equal(results[i].jCal, subject.jCal[1][i]);
      }
    });
  });

  test('#addProperty', () => {
    const prop = new ICAL.Property('description');

    subject.addProperty(prop);
    assert.equal(subject.jCal[1][3], prop.jCal);

    const all = subject.getAllProperties();
    const lastProp = all[all.length - 1];

    assert.equal(lastProp, prop);
    assert.equal(lastProp.parent, subject);
  });

  test('#addPropertyWithValue', () => {
    subject = new ICAL.Component('vevent');

    subject.addPropertyWithValue('description', 'value');

    const all = subject.getAllProperties();

    assert.equal(all[0].name, 'description');
    assert.equal(all[0].getFirstValue(), 'value');
  });

  test('#updatePropertyWithValue', () => {
    subject = new ICAL.Component('vevent');
    subject.addPropertyWithValue('description', 'foo');
    assert.lengthOf(subject.getAllProperties(), 1);

    subject.updatePropertyWithValue('description', 'xxx');

    assert.equal(subject.getFirstPropertyValue('description'), 'xxx');
    subject.updatePropertyWithValue('x-foo', 'bar');

    const list = subject.getAllProperties();
    assert.sameDeepMembers(
      list.map(prop => [prop.name, prop.getValues()]),
      [
        ['x-foo', ['bar']],
        ['description', ['xxx']]
      ]
    );
    assert.equal(subject.getFirstPropertyValue('x-foo'), 'bar');
  });

  suite('#removeProperty', () => {
    setup(() => {
      subject = new ICAL.Component(fixtures.components);
    });

    test('try to remove non-existent', () => {
      const result = subject.removeProperty('wtfbbq');
      assert.isFalse(result);
    });

    test('remove by property', () => {
      const first = subject.getFirstProperty('description')!;

      const result = subject.removeProperty(first);
      assert.isTrue(result, 'removes property');

      assert.notEqual(subject.getFirstProperty('description'), first);

      assert.lengthOf(subject.jCal[1], 2);
    });

    test('remove by name', () => {
      // there are two descriptions
      const list = subject.getAllProperties();
      const first = subject.getFirstProperty('description');

      const result = subject.removeProperty('description');
      assert.isTrue(result);

      assert.notEqual(subject.getFirstProperty('description'), first);

      assert.lengthOf(list, 2);
    });

    test('remove non hydrated property should not shift hydrated property', () => {
      const component = new ICAL.Component([
        'vevent',
        [
          ['a', {}, 'text', 'a'],
          ['b', {}, 'text', 'b'],
          ['c', {}, 'text', 'c']
        ]
      ]);
      component.getFirstPropertyValue('b');
      component.removeProperty('a');
      const cValue = component.getFirstPropertyValue('c');
      assert.equal(cValue, 'c');
    });
  });

  suite('#removeAllProperties', () => {
    test('no name when empty', () => {
      subject = new ICAL.Component(fixtures.components);

      assert.lengthOf(subject.jCal[1], 3);

      subject.removeAllProperties();

      assert.lengthOf(subject.jCal[1], 0);
      assert.ok(!subject.getFirstProperty());
    });

    test('no name when not empty', () => {
      subject = new ICAL.Component(['vevent', [], []]);
      subject.removeAllProperties();
      subject.removeAllProperties('xfoo');
    });

    test('with name', () => {
      subject = new ICAL.Component(fixtures.components);

      subject.removeAllProperties('description');
      assert.lengthOf(subject.jCal[1], 1);

      const first = subject.getFirstProperty()!;

      assert.equal(first.name, 'xfoo');
      assert.equal(subject.jCal[1][0][0], 'xfoo');
    });
  });

  test('#toJSON', () => {
    const json = JSON.stringify(subject);
    const fromJSON = new ICAL.Component(JSON.parse(json));

    assert.deepEqual(fromJSON.jCal, subject.jCal);
  });

  test('#toString', () => {
    const ical = subject.toString();
    const parsed = ICAL.parse(ical);
    const fromICAL = new ICAL.Component(parsed);

    assert.deepEqual(subject.jCal, fromICAL.jCal);
  });
});
