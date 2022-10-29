import { suite, test, suiteSetup } from 'mocha';
import { assert } from 'chai';
import { loadSample, ICAL } from '../support/helper';

suite('ics test', function () {
  let icsData;

  suiteSetup(async function () {
    icsData = await loadSample('forced_types.ics');
  });

  test('force type', function () {
    // just verify it can parse forced types
    let result = ICAL.parse(icsData);
    let component = new ICAL.Component(result);
    let vevent = component.getFirstSubcomponent('vevent');

    let start = vevent.getFirstPropertyValue('dtstart');

    assert.isTrue(start.isDate, 'is date type');
  });
});
