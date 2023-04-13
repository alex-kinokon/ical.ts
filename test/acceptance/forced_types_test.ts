import { suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, loadSample } from '../support/helper';

suite('ics test', () => {
  let icsData;

  suiteSetup(async () => {
    icsData = await loadSample('forced_types.ics');
  });

  test('force type', () => {
    // just verify it can parse forced types
    const result = ICAL.parse(icsData);
    const component = new ICAL.Component(result);
    const vevent = component.getFirstSubcomponent('vevent');

    const start = vevent.getFirstPropertyValue('dtstart');

    assert.isTrue(start.isDate, 'is date type');
  });
});
