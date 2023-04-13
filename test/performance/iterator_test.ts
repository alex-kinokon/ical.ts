import { suite, suiteSetup } from 'mocha';
import { loadSample } from '../support/helper';
import { ICAL, perfTest } from '../support/helper';

suite('iterator', () => {
  let icsData;

  suiteSetup(async () => {
    icsData = await loadSample('parserv2.ics');
  });

  let parsed;
  let comp;
  let tz;
  let std;
  let rrule;

  suiteSetup(() => {
    parsed = ICAL.parse(icsData);
    comp = new ICAL.Component(parsed);
    tz = comp.getFirstSubcomponent('vtimezone');
    std = tz.getFirstSubcomponent('standard');
    rrule = std.getFirstPropertyValue('rrule');
  });

  perfTest('timezone iterator & first iteration', () => {
    const iterator = rrule.iterator(std.getFirstPropertyValue('dtstart'));
    iterator.next();
  });
});
