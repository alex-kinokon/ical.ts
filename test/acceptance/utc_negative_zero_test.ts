import { suite, test, suiteSetup } from 'mocha';
import { assert } from 'chai';
import { loadSample, ICAL } from '../support/helper';

suite('ics - negative zero', function () {
  let icsData;

  suiteSetup(async function () {
    icsData = await loadSample('utc_negative_zero.ics');
  });

  test('summary', function () {
    let result = ICAL.parse(icsData);
    let component = new ICAL.Component(result);
    let vtimezone = component.getFirstSubcomponent('vtimezone');

    let standard = vtimezone.getFirstSubcomponent('standard');

    let props = standard.getAllProperties();
    let offset = props[1].getFirstValue();

    assert.equal(offset.factor, -1, 'offset');
  });
});
