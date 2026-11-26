import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractYouTubeVideoId, normalizeReferenceUrls, saveReferenceProfile, readReferenceProfile } from "./reference-videos.mjs";

const ids = ["abcdefghijk", "bcdefghijkl", "cdefghijklm", "defghijklmn", "efghijklmno"];
const links = ids.slice(0, 3).map((id) => `https://www.youtube.com/watch?v=${id}`);

test("accepts supported YouTube URL forms and canonicalizes them", () => {
  assert.equal(extractYouTubeVideoId("https://youtu.be/abcdefghijk?t=12"), "abcdefghijk");
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/shorts/abcdefghijk"), "abcdefghijk");
  assert.equal(extractYouTubeVideoId("https://youtube.com/embed/abcdefghijk"), "abcdefghijk");
  assert.equal(normalizeReferenceUrls(links)[0].url, "https://www.youtube.com/watch?v=abcdefghijk");
});

test("rejects non-YouTube hosts, non-HTTPS URLs, and malformed video IDs", () => {
  assert.throws(() => extractYouTubeVideoId("https://example.com/watch?v=abcdefghijk"));
  assert.throws(() => extractYouTubeVideoId("http://youtube.com/watch?v=abcdefghijk"));
  assert.throws(() => extractYouTubeVideoId("https://youtube.com/channel/abcdefghijk"));
});

test("requires exactly 3 or 5 unique videos", () => {
  assert.throws(() => normalizeReferenceUrls(links.slice(0, 2)), /exactly 3 or exactly 5/);
  assert.throws(() => normalizeReferenceUrls([links[0], links[1], links[0]]), /Duplicate/);
  assert.equal(normalizeReferenceUrls(ids.map((id) => `https://youtu.be/${id}`)).length, 5);
});

test("persists a profile and records metadata limitations honestly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "youtube-reference-test-"));
  const profilePath = join(directory, "channel-profile.json");
  try {
    const profile = await saveReferenceProfile(links, {
      profilePath,
      fetchImpl: async () => new Response(JSON.stringify({
        title: "Sample documentary", author_name: "Example Channel",
        thumbnail_url: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
      }), { status: 200, headers: { "content-type": "application/json" } }),
    });
    assert.equal(profile.referenceCount, 3);
    assert.equal(profile.references[0].metadata.title, "Sample documentary");
    assert.equal(profile.styleAnalysis.status, "pending");
    assert.equal(profile.references[0].analysis.status, "not_analyzed");
    assert.deepEqual(await readReferenceProfile(profilePath), profile);
    const raw = await readFile(profilePath, "utf8");
    assert.match(raw, /No footage or audio was downloaded/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("keeps unavailable/private video metadata as an explicit partial result", async () => {
  const directory = await mkdtemp(join(tmpdir(), "youtube-reference-test-"));
  try {
    const profile = await saveReferenceProfile(links, {
      profilePath: join(directory, "profile.json"),
      fetchImpl: async () => new Response("Not found", { status: 404 }),
    });
    assert.equal(profile.references[0].metadata.status, "unavailable");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
