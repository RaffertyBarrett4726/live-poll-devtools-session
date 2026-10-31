import { z } from "zod";
import { InfraiRealtime } from "./infrai_realtime.ts";
import { decidePoll } from "./poll_decision.ts";

const requestSchema = z.object({
  channel: z.string().min(1),
  account_id: z.string().min(1),
  quorum: z.number().int().positive(),
  yes: z.number().int().nonnegative(),
  no: z.number().int().nonnegative()
});

const input = requestSchema.parse({
  channel: process.env.POLL_CHANNEL ?? "devtools-cutover",
  account_id: process.env.INFRAI_ACCOUNT_ID ?? "developer-tools-session",
  quorum: Number(process.env.POLL_QUORUM ?? "3"),
  yes: Number(process.env.POLL_YES ?? "3"),
  no: Number(process.env.POLL_NO ?? "1")
});

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");

const infrai = new InfraiRealtime(key);
await infrai.createChannel({ channel: input.channel, type: "public", vendor: "pusher" });
const decision = decidePoll(input);
await infrai.publish({
  channel: input.channel,
  event: "cutover.poll.result",
  data: { yes: input.yes, no: input.no, quorum: input.quorum, decision },
  account_id: input.account_id
});
const presence = await infrai.presence(input.channel);
console.log(JSON.stringify({ channel: input.channel, decision, presence }));
