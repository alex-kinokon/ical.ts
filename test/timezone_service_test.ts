import { setup, suite, suiteSetup, teardown, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, loadSample } from './support/helper';

suite('timezone_service', () => {
  let icsData;
  suiteSetup(async () => {
    icsData = await loadSample('timezones/America/Los_Angeles.ics');
  });

  let subject;
  setup(() => {
    subject = ICAL.TimezoneService;
    subject.reset();
  });

  teardown(() => {
    subject.reset();
  });

  test('utc zones', () => {
    const zones = ['Z', 'UTC', 'GMT'];
    zones.forEach(tzid => {
      assert.ok(subject.has(tzid), tzid + ' should exist');
      assert.equal(subject.get(tzid), ICAL.Timezone.utcTimezone);
    });
  });

  test('#reset', () => {
    const name = 'ZFOO';
    subject.register(name, ICAL.Timezone.utcTimezone);
    assert.isTrue(subject.has(name), 'should have set ' + name);

    subject.reset();
    assert.isFalse(subject.has(name), 'removes ' + name + ' after reset');

    assert.equal(subject.count, 3);
  });

  suite('register zones', () => {
    test('when it does not exist', () => {
      const name = 'test';
      assert.isFalse(subject.has(name));

      assert.equal(subject.count, 3);
      subject.register(name, ICAL.Timezone.localTimezone);
      assert.equal(subject.count, 4);
      assert.isTrue(subject.has(name), 'is present after set');
      assert.equal(subject.get(name), ICAL.Timezone.localTimezone);

      subject.remove(name);
      assert.isFalse(subject.has(name), 'can remove zones');
    });

    test('with invalid type', () => {
      assert.throws(() => {
        subject.register('zzz', 'fff');
      }, 'timezone must be ICAL.Timezone');
    });
    test('with only invalid component', () => {
      assert.throws(() => {
        const comp = new ICAL.Component('vtoaster');
        subject.register(comp);
      }, 'timezone must be ICAL.Timezone');
    });

    test('override', () => {
      // don't do this but you can if you want to shoot
      // yourself in the foot.
      assert.equal(subject.count, 3);
      subject.register('Z', ICAL.Timezone.localTimezone);

      assert.equal(subject.get('Z'), ICAL.Timezone.localTimezone);
      assert.equal(subject.count, 3);
    });

    test('using a component', () => {
      const parsed = ICAL.parse(icsData);
      const comp = new ICAL.Component(parsed);
      const vtimezone = comp.getFirstSubcomponent('vtimezone');
      const tzid = vtimezone.getFirstPropertyValue('tzid');

      assert.equal(subject.count, 3);
      subject.register(vtimezone);
      assert.equal(subject.count, 4);

      assert.isTrue(subject.has(tzid), 'successfully registed with component');

      const zone = subject.get(tzid);

      assert.instanceOf(zone, ICAL.Timezone);
      assert.equal(zone.tzid, tzid);
    });
  });
});
