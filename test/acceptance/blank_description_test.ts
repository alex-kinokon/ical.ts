import { suite, test, suiteSetup } from 'mocha';
import { loadSample, ICAL } from '../support/helper';

suite('ics - blank description', function () {
  let icsData;

  suiteSetup(async function () {
    icsData = await loadSample('blank_description.ics');
  });

  test('summary', function () {
    // just verify it can parse blank lines
    ICAL.parse(icsData);
  });
});
