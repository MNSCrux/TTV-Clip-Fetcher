import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  extractClipSlug,
  generateExternalId,
  isRestrictedStreamer,
  normalizeHandle,
  parseDuration,
  parseViewCount,
} from './provider-utils';

describe('provider utils', () => {
  it('normalizes handles', () => {
    assert.equal(normalizeHandle(' @Zizaran '), 'zizaran');
  });

  it('extracts clip slugs', () => {
    assert.equal(
      extractClipSlug('https://www.twitch.tv/zizaran/clip/FastSlug'),
      'FastSlug'
    );
    assert.equal(extractClipSlug('https://clips.twitch.tv/OtherSlug'), 'OtherSlug');
  });

  it('parses view counts', () => {
    assert.equal(parseViewCount('1.2K views'), 1200);
    assert.equal(parseViewCount('3K views'), 3000);
    assert.equal(parseViewCount('540 views'), 540);
  });

  it('parses durations', () => {
    assert.equal(parseDuration('0:32'), 32);
    assert.equal(parseDuration('1:05'), 65);
    assert.equal(parseDuration('12:34'), 754);
  });

  it('uses slug or stable hash for external id', () => {
    assert.equal(
      generateExternalId({
        url: 'https://www.twitch.tv/zizaran/clip/FastSlug',
        streamerHandle: 'zizaran',
      }),
      'FastSlug'
    );
    assert.equal(
      generateExternalId({
        url: 'https://example.com/no-slug',
        title: 'x',
        streamerHandle: 'zizaran',
      }),
      generateExternalId({
        url: 'https://example.com/no-slug',
        title: 'x',
        streamerHandle: 'zizaran',
      })
    );
  });

  it('skips restricted streamers', () => {
    assert.equal(
      isRestrictedStreamer({
        active: true,
        restriction_status: 'approved_or_unrestricted',
      }),
      false
    );
    assert.equal(
      isRestrictedStreamer({ active: false, restriction_status: 'approved' }),
      true
    );
    assert.equal(
      isRestrictedStreamer({ active: true, restriction_status: 'banned' }),
      true
    );
  });
});
