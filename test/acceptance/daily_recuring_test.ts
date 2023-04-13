import { suite, suiteSetup, test } from 'mocha';
import { ICAL, loadSample } from '../support/helper';

suite('ics - blank description', () => {
  let icsData;

  suiteSetup(async () => {
    icsData = await loadSample('daily_recur.ics');
  });

  test('summary', () => {
    // just verify it can parse blank lines
    const result = ICAL.parse(icsData);
    const component = new ICAL.Component(result);
    const vevent = component.getFirstSubcomponent('vevent');

    const recur = vevent.getFirstPropertyValue('rrule');

    const start = vevent.getFirstPropertyValue('dtstart');

    const iter = recur.iterator(start);
    let limit = 10;
    while (limit) {
      iter.next();
      limit--;
    }
  });
});
