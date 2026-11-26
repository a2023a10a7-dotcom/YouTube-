import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PROFILE = resolve(process.cwd(), "data/channel-profile.json");
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function extractYouTubeVideoId(input) {
  if (typeof input !== "string" || !input.trim()) throw new Error("A YouTube URL is required.");
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error(`Invalid URL: ${input}`); }
  if (url.protocol !== "https:" || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Only HTTPS links from youtube.com or youtu.be are accepted.");
  }
  let id = "";
  if (url.hostname.toLowerCase() === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v") ?? "";
  } else {
    const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/);
    id = match?.[1] ?? "";
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error("The link must point to one YouTube video (watch, youtu.be, shorts, embed, or live).");
  }
  return id;
}

export function normalizeReferenceUrls(urls) {
  if (!Array.isArray(urls) || ![3, 5].includes(urls.length)) {
    throw new Error("Provide exactly 3 or exactly 5 YouTube video links.");
  }
  const ids = urls.map(extractYouTubeVideoId);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate video links are not allowed.");
  return ids.map((videoId) => ({
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  }));
}

async function resolveMetadata(videoId, fetchImpl = fetch) {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
  try {
    const response = await fetchImpl(endpoint, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { status: "unavailable", reason: `oEmbed returned HTTP ${response.status}` };
    const data = await response.json();
    return {
      status: "metadata_available",
      title: typeof data.title === "string" ? data.title : null,
      channel: typeof data.author_name === "string" ? data.author_name : null,
      thumbnailUrl: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
    };
  } catch (error) {
    return {
      status: "metadata_unavailable",
      reason: error instanceof Error ? error.message : "Metadata request failed",
    };
  }
}

export async function saveReferenceProfile(urls, options = {}) {
  const profilePath = options.profilePath ?? DEFAULT_PROFILE;
  const normalized = normalizeReferenceUrls(urls);
  const references = await Promise.all(normalized.map(async (item) => ({
    ...item,
    metadata: await resolveMetadata(item.videoId, options.fetchImpl ?? fetch),
    analysis: {
      status: "not_analyzed",
      note: "oEmbed metadata is not visual or audio analysis. No footage or audio was downloaded.",
    },
  })));
  const attributes = [
    "editingRhythm", "transitions", "visualLanguage", "typography",
    "colorAndLighting", "audio", "storyStructure",
  ];
  const profile = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    referenceCount: references.length,
    references,
    styleAnalysis: {
      status: "awaiting_authorized_media_evidence",
      evidenceAvailable: ["public oEmbed metadata when returned"],
      unavailableEvidence: ["frame-by-frame visual analysis", "shot timing", "transitions", "typography", "color grading", "audio and sound mix"],
      attributes: Object.fromEntries(attributes.map((name) => [name, {
        status: "not_assessed",
        confidence: 0,
        evidence: [],
        limitations: ["Reference video frames/audio have not been inspected."],
      }])),
      note: "A style profile must not infer visual or audio attributes from metadata alone.",
    },
  };
  await mkdir(dirname(profilePath), { recursive: true });
  const temporaryPath = \`\${profilePath}.tmp\`;
  await writeFile(temporaryPath, \`\${JSON.stringify(profile, null, 2)}\n\`, "utf8");
  await rename(temporaryPath, profilePath);
  const outputDirectory = dirname(profilePath);
  const styleJsonPath = resolve(outputDirectory, "REFERENCE-STYLE-PROFILE.json");
  const styleMarkdownPath = resolve(outputDirectory, "REFERENCE-STYLE-PROFILE.md");
  const styleMarkdown = [
    "# Reference style profile",
    "",
    "**Status:** Awaiting authorized visual/audio evidence.",
    "",
    \`**References saved:** \${references.length}\`,
    "",
    "The available oEmbed metadata does not reveal editing rhythm, transitions, camera language, typography, grading, sound design, or story pacing. These attributes are intentionally unassessed (confidence 0) until evidence can be inspected.",
    "",
    "## Evidence limitations",
    "",
    ...profile.styleAnalysis.unavailableEvidence.map((item) => \`- \${item}\`),
    "",
    "Reference links are style references only. No reference footage or audio was downloaded or reused.",
    "",
  ].join("\n");
  await Promise.all([
    writeFile(styleJsonPath, \`\${JSON.stringify(profile.styleAnalysis, null, 2)}\n\`, "utf8"),
    writeFile(styleMarkdownPath, styleMarkdown, "utf8"),
  ]);
  return profile;
}

export async function readReferenceProfile(profilePath = DEFAULT_PROFILE) {
  try {
    return JSON.parse(await readFile(profilePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function printHelp() {
  console.log([
    "YouTube reference profile",
    "  node src/reference-videos.mjs save <3-or-5-YouTube-URLs>",
    "  node src/reference-videos.mjs list",
    "",
    "Saving validates and normalizes links, attempts public oEmbed metadata lookup,",
    "and stores data/channel-profile.json. It does not download or analyze reference media.",
  ].join("\n"));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "save") {
    const profile = await saveReferenceProfile(args);
    console.log(`Saved ${profile.referenceCount} reference links to data/channel-profile.json.`);
    console.log("Metadata lookup is best-effort; visual/audio style analysis remains pending.");
  } else if (command === "list") {
    const profile = await readReferenceProfile();
    if (!profile) {
      console.log("No reference profile saved yet.");
      return;
    }
    console.log(JSON.stringify(profile, null, 2));
  } else {
    printHelp();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
