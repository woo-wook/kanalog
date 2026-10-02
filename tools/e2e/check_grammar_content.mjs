#!/usr/bin/env node
// Node's native TypeScript support executes the same display parser as the app.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import {
  grammarLines,
  structureGrammarAnswer,
} from "../../frontend/src/grammar-content.ts";

const path = process.argv[2];
if (!path)
  throw new Error(
    "Usage: node --experimental-strip-types tools/e2e/check_grammar_content.mjs <private notes.jsonl>",
  );
let checked = 0;
for await (const line of createInterface({
  input: createReadStream(path),
  crlfDelay: Infinity,
})) {
  const note = JSON.parse(line);
  if (note.kind !== "grammar") continue;
  const content = structureGrammarAnswer(note.answer, note.front);
  if (!content)
    throw new Error(`Unsupported grammar layout at item ${checked + 1}`);
  const restored = [
    content.example,
    content.translation,
    content.expression,
    ...content.topics.flatMap((topic) => [topic.title, ...topic.paragraphs]),
  ];
  if (JSON.stringify(restored) !== JSON.stringify(grammarLines(note.answer)))
    throw new Error(`Grammar content mismatch at item ${checked + 1}`);
  const focus = note.grammarFocus;
  if (!focus || focus.segments.map((part) => part.text).join("") !== note.front ||
      focus.segments.filter((part) => part.highlighted).map((part) => part.text.trim()).filter(Boolean).join(" … ") !== focus.title)
    throw new Error(`Original grammar highlight mismatch at item ${checked + 1}`);
  checked++;
}
if (!checked) throw new Error("No grammar content found");
console.log(
  JSON.stringify({
    grammarItems: checked,
    structured: true,
    contentPreserved: true,
    originalHighlights: checked,
  }),
);
