import test from "node:test";
import assert from "node:assert/strict";
import { decidePoll } from "./poll_decision.ts";

test("releases only when the affirmative vote wins and quorum is met", () => {
  assert.equal(decidePoll({ yes: 3, no: 1, quorum: 4 }), "release");
  assert.equal(decidePoll({ yes: 2, no: 1, quorum: 4 }), "hold");
  assert.equal(decidePoll({ yes: 2, no: 2, quorum: 4 }), "hold");
});
