# ical.ts - TypeScript parser for iCalendar, jCal, vCard, jCard.

A fork of https://github.com/kewisch/ical.js. Based on [#3553349](https://github.com/kewisch/ical.js/commit/35533497954b2c6e20a902789fe11e95740c3cf6).

[📖 Documentations](https://alex-kinokon.github.io/ical.ts/modules.html)

[![CI](https://github.com/alex-kinokon/ical.ts/actions/workflows/ci.yml/badge.svg)](https://github.com/alex-kinokon/ical.ts/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/alex-kinokon/ical.ts/badge.svg?branch=main)](https://coveralls.io/github/alex-kinokon/ical.ts?branch=main)

This is a library to parse the formats defined in the following rfcs and their extensions:

- [rfc 5545](http://tools.ietf.org/html/rfc5545) (iCalendar)
- [rfc7265](http://tools.ietf.org/html/rfc7265) (jCal)
- [rfc6350](http://tools.ietf.org/html/rfc6350) (vCard)
- [rfc7095](http://tools.ietf.org/html/rfc7095) (jCard)

## npm

```
yarn add ical.ts
```

### Register timezones

```ts
import { TimezoneService } from 'ical.ts';
import tzdata from 'ical.ts/timezones.json';
TimezoneService.registerTimezones(tzdata);
```

## License

ical.js is licensed under the
[Mozilla Public License](https://www.mozilla.org/MPL/2.0/), version 2.0.
