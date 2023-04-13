import { suite, suiteSetup, test } from 'mocha';
import { assert } from 'chai';
import { ICAL, loadSample } from '../support/helper';

suite('ics - negative zero', () => {
  let icsData;

  suiteSetup(async () => {
    icsData = await loadSample('utc_negative_zero.ics');
  });

  test('summary', () => {
    const result = ICAL.parse(icsData);
    const component = new ICAL.Component(result);
    const vtimezone = component.getFirstSubcomponent('vtimezone');

    const standard = vtimezone.getFirstSubcomponent('standard');

    const props = standard.getAllProperties();
    const offset = props[1].getFirstValue();

    assert.equal(offset.factor, -1, 'offset');
  });
});
