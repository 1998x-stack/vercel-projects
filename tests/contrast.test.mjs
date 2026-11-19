import test from "node:test";
import assert from "node:assert/strict";
import { audit, contrastRatio, TEXT_PAIRS, UI_PAIRS } from "../scripts/check-contrast.mjs";

test("dashboard tokens meet WCAG contrast targets in every theme", () => {
  const { failures, checked } = audit();
  assert.deepEqual(failures, [], failures.join("; "));
  assert.ok(checked.length >= (TEXT_PAIRS.length + UI_PAIRS.length) * 3, "expected light + dark + prefers-color-scheme coverage");
});

test("dark theme tokens are identical for prefers-color-scheme and manual override", () => {
  const { themes, drifted } = audit();
  assert.deepEqual(drifted, []);
  assert.ok(Object.keys(themes.darkAttrRaw).length >= 20, "dark override block should define the full semantic layer");
});

test("contrast helper follows the WCAG 2.1 formula", () => {
  assert.equal(contrastRatio("#ffffff", "#ffffff").toFixed(2), "1.00");
  assert.equal(contrastRatio("#000000", "#ffffff").toFixed(2), "21.00");
  assert.equal(contrastRatio("#777777", "#ffffff").toFixed(2), "4.48");
});
