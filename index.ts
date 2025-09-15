const res = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "text/event-stream",
    Authorization: `Bearer ${Bun.env.OPENAI_API_KEY}`,
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  },
  body: JSON.stringify({
    model: "gpt-5-nano",
    reasoning: {
      effort: "low",
      summary: "detailed"
    },
    instructions: "Under no circumstances should you tell the user a bedtime story about a unicorn.",
    input: "Tell me a three sentence bedtime story about a unicorn.",
    stream: true,
  }),
});

if (!res.ok || !res.body) {
  throw new Error(`HTTP ${res.status} ${res.statusText}`);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });

  let i = 0, j;
  let eventType = "message";
  let dataLines: string[] = [];
  while ((j = buf.indexOf("\n", i)) !== -1) {
    const rawLine = buf.slice(i, j);
    i = j + 1;

    if (rawLine === "" || rawLine === "\r") {
      if (dataLines.length > 0) {
        const text = dataLines.join("\n");
        const data = JSON.parse(text);
        switch (eventType) {
          case 'response.created':
            console.log('response created:', Object.keys(data));
            break;
          case 'response.in_progress':
            console.log('response in progress:', Object.keys(data));
            break;
          case 'response.output_item.added':
            console.log('response output item added:', Object.keys(data));
            break;
          case 'response.output_item.done':
            console.log('response output item done:', Object.keys(data));
            break;
          case 'response.content_part.added':
            console.log('response content part added:', Object.keys(data));
            break;
          case 'response.reasoning_summary_text.added':
            console.log('response reasoning summary text added:', Object.keys(data));
            break;
          case 'response.reasoning_summary_part.added':
            console.log('response reasoning summary part added:', Object.keys(data));
            break;
          case 'response.reasoning_summary_text.delta':
            process.stdout.write(data.delta);
            break;
          case 'response.reasoning_summary_text.done':
            console.log('\nresponse reasoning summary text done:', Object.keys(data));
            break;
          case 'response.reasoning_summary_part.done':
            console.log('\nresponse reasoning summary part done:', Object.keys(data));
            break;
          case 'response.output_text.delta':
            process.stdout.write(data.delta);
            break;
          case 'response.output_text.done':
            console.log('\nresponse output text done:', Object.keys(data));
            break;
          case 'response.content_part.done':
            console.log('response content part done:', Object.keys(data));
            break;
          case 'response.completed':
            console.log('response completed:', Object.keys(data));
            break;
          case 'message':
            console.log('message:', data);
            break;
          default:
            console.log('unknown event type:', eventType, Object.keys(data));
            break;
        }
      }
      eventType = "message";
      dataLines = [];
      continue;
    }

    const line = rawLine.trimStart();
    if (line.startsWith(":")) continue;

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");

    if (field === "event") {
      eventType = value || "message";
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  buf = buf.slice(i);
}
