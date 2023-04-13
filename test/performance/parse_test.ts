import { suite, suiteSetup } from 'mocha';
import { loadSample } from '../support/helper';
import { ICAL, perfTest } from '../support/helper';

suite('ICAL parse/stringify', () => {
  let icsData;
  let parsed;
  suiteSetup(async () => {
    icsData = await loadSample('parserv2.ics');
    parsed = ICAL.parse(icsData);
  });

  perfTest('#parse', () => {
    ICAL.parse(icsData);
  });

  perfTest('#stringify', () => {
    ICAL.stringify(parsed);
  });
});
