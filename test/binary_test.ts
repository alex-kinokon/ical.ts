import assert from 'assert/strict';
import { setup, suite, test } from 'mocha';
import { ICAL } from './support/helper';
import type { Binary } from '../lib/ical/';

suite('ICAL.Binary', () => {
  let subject: Binary;

  setup(() => {
    subject = new ICAL.Binary();
  });

  test('setEncodedValue', () => {
    subject.setEncodedValue('bananas');
    assert.equal(subject.decodeValue(), 'bananas');
    assert.equal(subject.value, 'YmFuYW5hcw==');

    subject.setEncodedValue('apples');
    assert.equal(subject.decodeValue(), 'apples');
    assert.equal(subject.value, 'YXBwbGVz');
  });

  test('null values', () => {
    subject.setEncodedValue(null);
    assert.equal(subject.decodeValue(), null);
    assert.equal(subject.value, null);
  });
});
