import { suite, suiteSetup, test } from 'mocha';
import { ICAL, loadSample } from '../support/helper';

suite('ics - blank description', () => {
  let icsData;

  suiteSetup(async () => {
    icsData = await loadSample('blank_description.ics');
  });

  test('summary', () => {
    // just verify it can parse blank lines
    ICAL.parse(icsData);
  });
});
