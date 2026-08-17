import assert from "node:assert/strict";
import test from "node:test";

import {
  entityKey,
  entityLabel,
  groupGithubEntities,
  parseGithubUrl,
} from "../lib/github.js";

const R = "sgl-project/sglang";

test("PR sub-pages all parse to the same entity", () => {
  const urls = [
    `https://github.com/${R}/pull/33907`,
    `https://github.com/${R}/pull/33907/files`,
    `https://github.com/${R}/pull/33907/commits`,
    `https://github.com/${R}/pull/33907/checks`,
    `https://github.com/${R}/pull/33907/commits/a1b2c3d`,
    `https://github.com/${R}/pull/33907/files#diff-abc`,
    `https://github.com/${R}/pull/33907?w=1`,
  ];
  const keys = new Set(urls.map((u) => entityKey(parseGithubUrl(u))));
  assert.equal(keys.size, 1);
  assert.equal([...keys][0], `${R}/pr/33907`);
});

test("different PRs and different repos stay apart", () => {
  const a = parseGithubUrl(`https://github.com/${R}/pull/33907`);
  const b = parseGithubUrl(`https://github.com/${R}/pull/35059`);
  const c = parseGithubUrl("https://github.com/other/repo/pull/33907");
  assert.notEqual(entityKey(a), entityKey(b));
  assert.notEqual(entityKey(a), entityKey(c));
});

test("PR number must not swallow a longer path segment", () => {
  assert.equal(parseGithubUrl(`https://github.com/${R}/pull/33907x`), null);
});

test("issues parse separately from PRs with the same number", () => {
  const pr = parseGithubUrl(`https://github.com/${R}/pull/42`);
  const issue = parseGithubUrl(`https://github.com/${R}/issues/42`);
  assert.equal(issue.kind, "issue");
  assert.notEqual(entityKey(pr), entityKey(issue));
});

test("workflow run and its job pages parse to one run", () => {
  const a = parseGithubUrl(`https://github.com/${R}/actions/runs/31682484964`);
  const b = parseGithubUrl(
    `https://github.com/${R}/actions/runs/31682484964/job/94400042688`,
  );
  assert.equal(a.kind, "run");
  assert.equal(entityKey(a), entityKey(b));
});

test("non-entity GitHub pages and other hosts are ignored", () => {
  for (const u of [
    `https://github.com/${R}`,
    `https://github.com/${R}/blob/main/README.md`,
    `https://github.com/${R}/actions`,
    "https://gitlab.com/a/b/pull/1",
    "https://example.com/x",
    "chrome://extensions",
    "not a url",
  ]) {
    assert.equal(parseGithubUrl(u), null, u);
  }
});

const tab = (id, url, over = {}) => ({
  id,
  url,
  index: id,
  windowId: 1,
  pinned: false,
  active: false,
  ...over,
});

test("a PR's sub-pages collapse to one group", () => {
  const tabs = [
    tab(1, `https://github.com/${R}/pull/33907`),
    tab(2, `https://github.com/${R}/pull/33907/files`),
    tab(3, `https://github.com/${R}/pull/33907/commits`),
    tab(4, `https://github.com/${R}/pull/35059`),
  ];
  const groups = groupGithubEntities(tabs);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, `${R}#33907`);
  assert.equal(groups[0].keeper.id, 1);
  assert.deepEqual(
    groups[0].doomed.map((t) => t.id),
    [2, 3],
  );
});

test("job pages collapse per run, never into a PR", () => {
  const tabs = [
    tab(1, `https://github.com/${R}/pull/33907`),
    tab(2, `https://github.com/${R}/actions/runs/316/job/944`),
    tab(3, `https://github.com/${R}/actions/runs/316/job/955`),
  ];
  const groups = groupGithubEntities(tabs);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, `${R} run 316`);
  assert.deepEqual(
    groups[0].doomed.map((t) => t.id),
    [3],
  );
});

test("two different runs stay apart", () => {
  const tabs = [
    tab(1, `https://github.com/${R}/actions/runs/316/job/944`),
    tab(2, `https://github.com/${R}/actions/runs/999/job/955`),
  ];
  assert.deepEqual(groupGithubEntities(tabs), []);
});

test("a lone tab is not a collapse group", () => {
  const tabs = [
    tab(1, `https://github.com/${R}/pull/33907`),
    tab(2, `https://github.com/${R}/pull/35059`),
  ];
  assert.deepEqual(groupGithubEntities(tabs), []);
});

test("pinned tabs are left out unless opted in", () => {
  const tabs = [
    tab(1, `https://github.com/${R}/pull/33907`, { pinned: true }),
    tab(2, `https://github.com/${R}/pull/33907/files`),
  ];
  assert.deepEqual(groupGithubEntities(tabs), []);
  assert.equal(groupGithubEntities(tabs, true)[0].keeper.id, 1);
});

test("labels read the way the site does", () => {
  assert.equal(
    entityLabel(parseGithubUrl(`https://github.com/${R}/pull/33907`)),
    `${R}#33907`,
  );
  assert.equal(
    entityLabel(parseGithubUrl(`https://github.com/${R}/actions/runs/316`)),
    `${R} run 316`,
  );
});
