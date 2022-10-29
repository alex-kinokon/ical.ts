import { suite, suiteSetup } from 'mocha';
import { loadSample } from '../support/helper';
import { perfTest, ICAL } from '../support/helper';

suite('ICAL parse/stringify', function () {
  let icsData;
  let parsed;
  suiteSetup(async function () {
    icsData = await loadSample('parserv2.ics');
    parsed = ICAL.parse(icsData);
  });

  perfTest('#parse', function () {
    ICAL.parse(icsData);
  });

  perfTest('#stringify', function () {
    ICAL.stringify(parsed);
  });
});
