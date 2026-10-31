export type PollInput = { yes: number; no: number; quorum: number };

export function decidePoll(input: PollInput): "release" | "hold" {
  const total = input.yes + input.no;
  return total >= input.quorum && input.yes > input.no ? "release" : "hold";
}
