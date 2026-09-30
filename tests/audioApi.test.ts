import test from "node:test";
import assert from "node:assert/strict";
import {
  startAudioSession,
  analyzeAudio,
  getAnswerSummary,
  getSessionSummary,
  endAudioSession,
} from "../src/api/audio";
import { apiUrl, ApiError } from "../src/api/client";

test("all audio endpoints use the configured server, encode session paths and allow empty cleanup responses", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: { origin: "http://frontend.example" },
  } as Window & typeof globalThis;
  const calls: { url: URL; options: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    calls.push({ url, options: options! });
    if (url.pathname.endsWith("end-session"))
      return new Response(null, { status: 204 });
    return Response.json({ volume_db: -20 });
  };
  try {
    const sessionId = "session /&?123";
    await startAudioSession(sessionId);
    await analyzeAudio(sessionId, new File(["audio"], "answer.webm"));
    await getAnswerSummary(sessionId);
    await getSessionSummary(sessionId);
    assert.equal(await endAudioSession(sessionId), null);
    assert.deepEqual(
      calls.map((c) => c.options.method),
      ["POST", "POST", "GET", "GET", "POST"],
    );
    assert.ok(calls.every((c) => c.url.origin === "https://backend.example"));
    assert.equal(
      calls[2].url.pathname,
      `/audio/answer-summary/${encodeURIComponent(sessionId)}`,
    );
    assert.equal(
      calls[3].url.pathname,
      `/audio/session-summary/${encodeURIComponent(sessionId)}`,
    );
    assert.equal(
      (calls[4].options.body as FormData).get("session_id"),
      sessionId,
    );
    assert.ok((calls[1].options.body as FormData).get("file") instanceof Blob);
    assert.equal(
      (calls[0].options.body as FormData).get("baseline_syllables_per_minute"),
      "300",
    );
    assert.equal(
      apiUrl("/audio/end-session", undefined, "https://separate-audio.example"),
      "https://separate-audio.example/audio/end-session",
    );
    globalThis.fetch = async () => new Response(null, { status: 204 });
    await assert.rejects(getSessionSummary(sessionId), /비어 있습니다/);
    globalThis.fetch = async () =>
      Response.json({ reason: "session_not_found" }, { status: 404 });
    await assert.rejects(
      endAudioSession(sessionId),
      (error) => error instanceof ApiError && error.status === 404,
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});
