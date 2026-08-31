import { Block } from "./blocks";

export interface SeedCourseLesson {
  id: string;
  title: string;
  watched: boolean;
  meta: string;
  blocks?: Block[];
  gap?: { timestamp: string; topic: string }[];
  transcript?: {
    text: string;
    cues: { t: string; text: string }[];
  };
}

export interface SeedCourseModule {
  id: string;
  title: string;
  lessons: SeedCourseLesson[];
}

export interface SeedCourse {
  id: string;
  title: string;
  provider: string;
  accent: string;
  accentFg: string;
  init: string;
  startedAt: string;
  modules: SeedCourseModule[];
}

export interface CourseCollision {
  id: string;
  title: string;
  description: string;
  sourceA: { course: string; lesson: string };
  sourceB: { course: string; lesson: string };
}

export const SEED_COURSES: SeedCourse[] = [
  {
    id: "agentic",
    title: "Agentic AI",
    provider: "DEEPLEARNING.AI",
    accent: "#7B5CF0",
    accentFg: "#FFFFFF",
    init: "A",
    startedAt: "2026-08-15T00:00:00Z",
    modules: [
      {
        id: "mod-a1",
        title: "MODULE 1 · FOUNDATIONS",
        lessons: [
          {
            id: "les-a1-1",
            title: "What makes a system agentic",
            watched: true,
            meta: "1,240 WORDS · 2 IMAGES",
            blocks: [
              {
                id: "b-a11-1",
                type: "paragraph",
                text: "Agentic systems operate on an iterative action-perception loop rather than static one-shot completion. Instead of producing an answer directly, the model decomposes goals, selects tools, inspects execution errors, and self-corrects.",
              },
              {
                id: "b-a11-2",
                type: "callout",
                kind: "fact",
                text: "The spectrum of autonomy ranges from Zero-shot prompting (Level 0) to autonomous goal-directed multi-step execution (Level 4).",
              },
            ],
          },
          {
            id: "les-a1-2",
            title: "The agentic loop",
            watched: true,
            meta: "860 WORDS · 1 DIAGRAM",
            blocks: [
              {
                id: "b-a12-1",
                type: "heading",
                level: 2,
                text: "The Core ReAct Loop",
              },
              {
                id: "b-a12-2",
                type: "paragraph",
                text: "Thought → Action → Observation. The model articulates a reasoning step, executes an environment action (tool call), and appends the observation back into context before taking the next turn.",
              },
            ],
          },
          {
            id: "les-a1-3",
            title: "Where agents fail",
            watched: true,
            meta: "1,510 WORDS",
            blocks: [
              {
                id: "b-a13-1",
                type: "callout",
                kind: "gotcha",
                text: "Infinite retry loops occur when tool error messages do not provide actionable corrective signals to the planner.",
              },
              {
                id: "b-a13-2",
                type: "paragraph",
                text: "Retries and exponential backoff are mandatory when interfacing with external APIs. Without exponential jitter, failed tool invocations cascade into model context degradation.",
              },
            ],
          },
          {
            id: "les-a1-4",
            title: "Evaluating agent output",
            watched: true,
            meta: "720 WORDS",
            blocks: [
              {
                id: "b-a14-1",
                type: "paragraph",
                text: "Trajectory evaluation measures whether the tool calls were optimal, whereas outcome evaluation tests whether the final state matches the success rubric.",
              },
            ],
          },
        ],
      },
      {
        id: "mod-a2",
        title: "MODULE 2 · DESIGN PATTERNS",
        lessons: [
          {
            id: "les-a2-1",
            title: "Reflection",
            watched: true,
            meta: "512 WORDS · FROM A 3:53 LECTURE · GENERATED, THEN EDITED",
            gap: [
              { timestamp: "2:35", topic: "The specific syntax-error walkthrough — he steps through the error log going back in" },
            ],
            transcript: {
              text: `0:03 The reflection design pattern is something I've used in many applications, and it's surprisingly easy to implement.
0:06 Let's take a look.
0:07 Just as humans will sometimes reflect their own output and find a way to improve it, so can OMs.
0:14 For example, I might write an email like this, and if I'm typing quickly, I might end up with a first draft that's not great.
0:21 And if I read over it, I might say, huh, next month isn't that clear for what dates Tommy might be free for dinner.
0:28 And there's such a typo that I had, and also forgot to sign my name.
0:32 And this would let me revise the draft to be more specific in saying, hey, Tommy, are you free for dinner on the 5th to the 7th?
0:39 A similar process lets OMs also improve their outputs.
0:43 You can prompt an OM to write the first draft in email, and given email version 1, email v1,
0:49 you can pass it to maybe the same model, the same large language model, but with a different prompt,
0:55 and tell it to reflect and write an improved second draft to then get you the final output, email v2.
1:01 Here, I have just hard-coded this workflow of prompting the OMs once and then prompting them again to reflect and improve, and that gives email v2.
1:11 It turns out that a similar process can be used to improve other types of outputs.
1:17 For example, if you are having an OM write code, you might prompt an OM to write code to do a certain task,
1:23 and it may give you v1 of the code, and then pass it to the same OM or maybe a different OM to ask it to check the bugs and write an improved second draft of the code.
1:35 Different OMs have different strengths, and so sometimes I would choose different models for writing the first draft and for reflecting and trying to improve it.
1:45 For example, it turns out reasoning models, sometimes also called thinking models, are pretty good at finding bugs,
1:52 and so I'll sometimes write the first draft of the code by direct generation, but then use a reasoning model to check for bugs.
1:59 Now, rather than just having an OM reflect on the code, it turns out that if you can get external feedback, meaning new information from outside the OM, reflection becomes much more powerful.
2:13 In the case of code, one thing you can do is just execute the code to see what the code does,
2:19 and by examining the output, including any error messages of the code, this is incredibly useful information for the OM to reflect and to find a way to improve his code.
2:29 So in this example, the OM generated the first draft of the code, but when I run it, it generates a syntax error.
2:35 When you pass this code output and error logs back into the OM and ask it to reflect on the feedback and write a new draft, this gives it a lot of very useful information to come up with a much better version 2 of the code.
2:49 So the reflection design pattern isn't magic. It does not make an OM always get everything right 100% of the time, but it can often give it maybe a modest bump in performance.
3:00 But one design consideration to keep in mind is reflection is much more powerful when there is new additional external information that you can ingest into the reflection process.
3:11 So in this example, if you can run the code and have that code output or error messages as an additional input to the reflection step,
3:19 that really lets the OM reflect much more deeply and figure out what may be going wrong, if anything, and results in a much better second version of the code than if there wasn't this external information that you can ingest.
3:31 So one thing to keep in mind, whenever reflection has an opportunity to get additional information, that makes it much more powerful.
3:40 Now with that, let's go on to the next video where I want to share with you a more systematic comparison of using reflection versus direct generation or something we sometimes call zero-shot prompting.
3:53 Let's go on to the next video.`,
              cues: [
                { t: "0:07", text: "The human analogy — rereading your own email" },
                { t: "0:43", text: "Two prompts, one model — email v1 → v2" },
                { t: "1:01", text: "The workflow is hard-coded" },
                { t: "1:17", text: "Generalising to code" },
                { t: "1:35", text: "Different models for drafting vs reflecting" },
                { t: "1:59", text: "External feedback — running the code" },
                { t: "2:49", text: "Not magic; a modest bump" },
                { t: "3:40", text: "Trailer for the systematic comparison" },
              ],
            },
            blocks: [
              // 1
              {
                id: "b-a21-1",
                type: "heading",
                level: 2,
                ts: "0:07",
                text: "Reread your own email",
              },
              {
                id: "b-a21-2",
                type: "paragraph",
                text: "The whole pattern comes from something you already do. You type an email fast, read it back, and see three things wrong with it: the date is vague, there's a typo, and you forgot to sign your name. So you rewrite it.",
              },
              {
                id: "b-a21-3",
                type: "example",
                title: "THE EXAMPLE HE USED",
                timestampRange: "0:14 → 0:32",
                v1Title: "DRAFT 1 · TYPED FAST",
                v1Text: "Hey Tommy — are you free for dinner next month? Let me know what wroks for you.",
                v1BadWords: ["next month", "wroks"],
                v2Title: "DRAFT 2 · AFTER REREADING",
                v2Text: "Hey Tommy — are you free for dinner on the 5th to the 7th? Let me know what works for you.\n— Andrew",
                v2FixWords: ["on the 5th to the 7th", "works", "— Andrew"],
                caughtLegend: "WHAT THE REREAD CAUGHT",
                fixedLegend: "WHAT THE REVISION FIXED",
                summaryPill: "VAGUE DATE · TYPO · NO SIGNATURE",
              },
              {
                id: "b-a21-4",
                type: "paragraph",
                text: "The model version is the same move with two prompts. Prompt once to get `email v1`. Then hand v1 **back to the same model with a different prompt** — reflect and improve — and take `email v2`.",
              },

              // 2
              {
                id: "b-a21-5",
                type: "heading",
                level: 2,
                ts: "1:01",
                text: "It's hard-coded, not agentic",
              },
              {
                id: "b-a21-6",
                type: "paragraph",
                text: "Worth being precise about what this is. He says outright he **hard-coded the workflow** — prompt, then prompt again. Nothing decides whether to reflect; the second call always happens. That's a pipeline, not an agent.",
              },
              {
                id: "b-a21-7",
                type: "image",
                url: "/loop-diagram.svg",
                caption: "the dashed loop is the version most people build. the pink box is what makes it work.",
              },

              // 3
              {
                id: "b-a21-8",
                type: "heading",
                level: 2,
                ts: "1:17",
                text: "Same move, applied to code",
              },
              {
                id: "b-a21-9",
                type: "paragraph",
                text: "Prompt for code, get v1, pass it back and ask it to check for bugs, get v2. Identical shape to the email.",
              },
              {
                id: "b-a21-10",
                type: "paragraph",
                text: "But he adds a wrinkle here: **the two roles don't have to be the same model.** Reasoning models — thinking models — are good at finding bugs, so he'll often write the first draft by direct generation and then use a reasoning model to critique it. Draft cheap, critique smart.",
              },

              // 4
              {
                id: "b-a21-11",
                type: "heading",
                level: 2,
                ts: "1:59",
                text: "External evidence is the thing that matters",
              },
              {
                id: "b-a21-12",
                type: "paragraph",
                text: "This is the part I'd keep if I could only keep one. Reflecting on code is fine. **Running the code and feeding back the output and error messages is a different tier.** His example: v1 has a syntax error, the error log goes back into the prompt, and v2 is much better than anything self-critique would have produced.",
              },
              {
                id: "b-a21-13",
                type: "code",
                lang: "PYTHON",
                note: "THE SHAPE · MY OWN, NOT FROM THE LECTURE",
                code: `draft = llm("write code for X")

evidence = run(draft)          # ← the outside voice
critique = llm(f"draft + its actual output:\\n{draft}\\n{evidence}\\n"
               f"what's wrong?")

final = llm(f"revise using:\\n{critique}\\n{draft}")`,
              },
              {
                id: "b-a21-14",
                type: "callout",
                kind: "gotcha",
                text: "A critic that sees exactly what the generator saw is mostly agreeing with itself. The gain doesn't come from the second pass — it comes from *new information arriving* at the second pass. If there's no way to get external evidence, expect very little.",
              },

              // 5
              {
                id: "b-a21-15",
                type: "heading",
                level: 2,
                ts: "2:49",
                text: "How big is the win, honestly",
              },
              {
                id: "b-a21-16",
                type: "paragraph",
                text: "He is careful here and it's worth not smoothing over. Reflection **\"isn't magic\"** and does not get things right 100% of the time. His words for the improvement: a *modest bump*. With external evidence it's much better than that — but he doesn't put a number on either.",
              },
              {
                id: "b-a21-17",
                type: "scale",
                title: "HIS WORDS, NOT MEASUREMENTS",
                items: [
                  { name: "DIRECT GENERATION", pct: 42, color: "shade" },
                  { name: "+ SELF-REFLECTION", pct: 54, color: "yellow" },
                  { name: "+ EXTERNAL EVIDENCE", pct: 84, color: "lime" },
                ],
                footer: "NO NUMBERS WERE GIVEN. THESE BARS ARE ORDERING ONLY — \"MODEST BUMP\" AND \"MUCH MORE POWERFUL\" DRAWN AS A RANKING, NOT A MEASUREMENT. THE NEXT LESSON IS THE SYSTEMATIC COMPARISON.",
              },
              {
                id: "b-a21-18",
                type: "callout",
                kind: "question",
                text: 'If the second pass only pays off when new information arrives, is "reflection" even the right name for it? It looks less like introspection and more like a second call with a better context. Check whether the next lesson\'s comparison isolates that.',
              },

              // 6
              {
                id: "b-a21-19",
                type: "heading",
                level: 2,
                ts: "3:40",
                text: "Before the next lesson",
              },
              {
                id: "b-a21-20",
                type: "todo",
                items: [
                  { text: "Run one task three ways: direct, self-reflect, reflect-with-execution-output", done: true },
                  { text: "Try a cheap model for the draft and a reasoning model for the critique — measure whether the split beats using the good model twice", done: false },
                  { text: 'Count how often the critique says "no issues" when there are issues', done: false },
                ],
              },

              // 7
              {
                id: "b-a21-21",
                type: "next",
                initial: "A",
                title: "Next · Reflection vs direct generation, compared systematically",
                meta: "ANNOUNCED AT 3:40 · NOT YET WATCHED",
              },

              // 8
              {
                id: "b-a21-22",
                type: "anchors",
                title: "THE LECTURE, INDEXED",
                duration: "3:53 · ALL COVERED",
                items: [
                  { timestamp: "0:07", label: "The human analogy — rereading your own email", sectionTag: "§1" },
                  { timestamp: "0:43", label: "Two prompts, one model — email v1 → v2", sectionTag: "§1" },
                  { timestamp: "1:01", label: "The workflow is hard-coded", sectionTag: "§2" },
                  { timestamp: "1:17", label: "Generalising to code", sectionTag: "§3" },
                  { timestamp: "1:35", label: "Different models for drafting vs reflecting", sectionTag: "§3" },
                  { timestamp: "1:59", label: "External feedback — running the code", sectionTag: "§4" },
                  { timestamp: "2:49", label: "Not magic; a modest bump", sectionTag: "§5" },
                  { timestamp: "3:40", label: "Trailer for the systematic comparison", sectionTag: "NEXT" },
                ],
              },
            ],
          },
          {
            id: "les-a2-2",
            title: "Tool use",
            watched: true,
            meta: "1,090 WORDS · 1 SNIPPET",
            blocks: [
              {
                id: "b-a22-1",
                type: "paragraph",
                text: "Tool calling converts an LLM from a closed text generator into an executor. The function signature and docstrings are serialised as JSON schemas which the model populates with arguments.",
              },
            ],
          },
          {
            id: "les-a2-3",
            title: "Planning",
            watched: true,
            meta: "STUB · 3 LINES",
            blocks: [
              {
                id: "b-a23-1",
                type: "paragraph",
                text: "Watched the lesson on Planning and Task Decomposition. Need to write notes on DAG execution vs linear ReAct planning.",
              },
              {
                id: "b-a23-2",
                type: "todo",
                items: [{ text: "Come back and write this properly after reviewing code examples", done: false }],
              },
              {
                id: "b-a23-3",
                type: "callout",
                kind: "question",
                text: "Notes this thin usually mean the lesson didn't land. Worth rewatching before writing.",
              },
            ],
          },
          {
            id: "les-a2-4",
            title: "Multi-agent collaboration",
            watched: false,
            meta: "NO NOTES YET",
            blocks: [],
          },
          {
            id: "les-a2-5",
            title: "Choosing a pattern",
            watched: false,
            meta: "NO NOTES YET",
            blocks: [],
          },
        ],
      },
      {
        id: "mod-a3",
        title: "MODULE 3 · IN PRACTICE",
        lessons: [
          {
            id: "les-a3-1",
            title: "Memory and state",
            watched: true,
            meta: "STUB · 1 LINE",
            blocks: [
              {
                id: "b-a31-1",
                type: "paragraph",
                text: "Short-term buffer vs vector recall vs key-value working scratchpad.",
              },
            ],
          },
          {
            id: "les-a3-2",
            title: "Orchestration",
            watched: false,
            meta: "NO NOTES YET",
            blocks: [],
          },
          {
            id: "les-a3-3",
            title: "Cost and latency",
            watched: false,
            meta: "NO NOTES YET",
            blocks: [],
          },
        ],
      },
    ],
  },
  {
    id: "python",
    title: "Python for AI",
    provider: "DEEPLEARNING.AI",
    accent: "#E07A1F",
    accentFg: "#0A0A0A",
    init: "P",
    startedAt: "2026-08-10T00:00:00Z",
    modules: [
      {
        id: "mod-p1",
        title: "MODULE 1 · THE LANGUAGE",
        lessons: [
          {
            id: "les-p1-1",
            title: "Variables and types",
            watched: true,
            meta: "640 WORDS",
            blocks: [
              {
                id: "b-p11-1",
                type: "paragraph",
                text: "Python 3.10+ type annotations are not enforced at runtime by default, but static linters and LLM schema parsers use them as first-class constraints.",
              },
            ],
          },
          {
            id: "les-p1-2",
            title: "Control flow",
            watched: true,
            meta: "520 WORDS",
            blocks: [
              {
                id: "b-p12-1",
                type: "paragraph",
                text: "Structural pattern matching with `match/case` provides clean dispatch for tool response envelopes.",
              },
            ],
          },
          {
            id: "les-p1-3",
            title: "Functions and signatures",
            watched: true,
            meta: "OPEN · 980 WORDS · 2 SNIPPETS",
            gap: [
              { timestamp: "09:20", topic: "Keyword-only arguments and why the bare * exists" },
              { timestamp: "17:44", topic: "Mutable default arguments — the classic trap" },
            ],
            transcript: {
              text: "In Python, a function signature is a contract. When building tools for AI models, type annotations and docstrings are parsed into JSON schema specifications...",
              cues: [
                { t: "00:00", text: "Function signatures as machine-readable contracts" },
                { t: "09:20", text: "Keyword-only arguments with bare asterisk" },
                { t: "17:44", text: "Default argument evaluation time and mutable traps" },
              ],
            },
            blocks: [
              {
                id: "b-p13-1",
                type: "paragraph",
                text: "A signature is a contract, and in AI work it is a **machine-readable** one. Type hints plus a docstring are exactly what gets serialised when a function is handed to a model as a tool.",
              },
              {
                id: "b-p13-2",
                type: "callout",
                kind: "connects",
                text: 'This is the same object the Agentic course calls a "tool schema". Two courses, opposite ends of the same thing.',
              },
              {
                id: "b-p13-3",
                type: "heading",
                level: 3,
                text: "The shape that serialises cleanly",
              },
              {
                id: "b-p13-4",
                type: "code",
                lang: "PYTHON",
                note: "LESSON 3 EXERCISE",
                code: `def get_weather(city: str, unit: str = "celsius") -> dict:
    """Return current weather for a city.

    Args:
        city: City name, e.g. "Santa Clara".
        unit: "celsius" or "fahrenheit".
    """
    ...`,
              },
              {
                id: "b-p13-5",
                type: "callout",
                kind: "gotcha",
                text: "Default arguments are evaluated *once*, at definition time. `def f(x, acc=[])` shares one list across every call. Use `None` and build inside the body.",
              },
              {
                id: "b-p13-6",
                type: "code",
                lang: "PYTHON",
                note: "THE FIX",
                code: `def collect(x, acc=None):
    if acc is None: acc = []   # fresh every call
    acc.append(x)
    return acc`,
              },
              {
                id: "b-p13-7",
                type: "callout",
                kind: "question",
                text: "Does the tool-schema generator read the docstring Args section, or only the type hints? Test with a badly formatted docstring.",
              },
              {
                id: "b-p13-8",
                type: "heading",
                level: 3,
                text: "To do",
              },
              {
                id: "b-p13-9",
                type: "todo",
                items: [
                  { text: "Rewrite the weather exercise with keyword-only args", done: true },
                  { text: "Feed a badly-typed function to the schema generator and see what breaks", done: false },
                ],
              },
              {
                id: "b-p13-10",
                type: "mark",
                timestamp: "22:10",
                text: "Pydantic V2 BaseModel serialisation speed vs inspect module",
              },
            ],
          },
          {
            id: "les-p1-4",
            title: "Lists, dicts and comprehensions",
            watched: true,
            meta: "1,120 WORDS",
            blocks: [
              {
                id: "b-p14-1",
                type: "paragraph",
                text: "Dictionary comprehensions provide succinct transformations from raw API payloads into typed schema shapes.",
              },
            ],
          },
        ],
      },
      {
        id: "mod-p2",
        title: "MODULE 2 · WORKING WITH DATA",
        lessons: [
          {
            id: "les-p2-1",
            title: "Files and I/O",
            watched: true,
            meta: "430 WORDS",
            blocks: [
              {
                id: "b-p21-1",
                type: "paragraph",
                text: "Using `pathlib.Path` and context managers ensures file descriptors are cleaned up even on unhandled exception branches.",
              },
            ],
          },
          {
            id: "les-p2-2",
            title: "NumPy arrays",
            watched: true,
            meta: "STUB · 4 LINES",
            blocks: [
              {
                id: "b-p22-1",
                type: "paragraph",
                text: "Ndarray memory layouts, vector dot products for embeddings cosine similarity calculation.",
              },
            ],
          },
          {
            id: "les-p2-3",
            title: "Pandas basics",
            watched: false,
            meta: "NO NOTES YET",
            blocks: [],
          },
        ],
      },
      {
        id: "mod-p3",
        title: "MODULE 3 · AI IN PRACTICE",
        lessons: [
          {
            id: "les-p3-1",
            title: "Calling an LLM API",
            watched: true,
            meta: "870 WORDS · 1 SNIPPET",
            blocks: [
              {
                id: "b-p31-1",
                type: "paragraph",
                text: "OpenAI client instance setup, handling streaming chunk generators, and token usage headers.",
              },
            ],
          },
          {
            id: "les-p3-2",
            title: "Structured outputs",
            watched: true,
            meta: "STUB · 2 LINES",
            blocks: [
              {
                id: "b-p32-1",
                type: "paragraph",
                text: "Using response_format: json_object vs strict Pydantic schemas with Instructor.",
              },
            ],
          },
          {
            id: "les-p3-3",
            title: "Error handling and retries",
            watched: false,
            meta: "NO NOTES YET",
            blocks: [],
          },
          {
            id: "les-p3-4",
            title: "Putting it together",
            watched: false,
            meta: "NO NOTES YET",
            blocks: [],
          },
        ],
      },
    ],
  },
];

export const SEED_COLLISIONS: CourseCollision[] = [
  {
    id: "col-1",
    title: "Tool calling is just a function signature",
    description:
      "Python's type hints and docstrings are literally what gets serialised into the tool schema. The two courses teach the same thing from opposite ends.",
    sourceA: { course: "AGENTIC", lesson: "TOOL USE" },
    sourceB: { course: "PYTHON", lesson: "FUNCTIONS" },
  },
  {
    id: "col-2",
    title: "Retries and backoff",
    description:
      "You wrote almost the same paragraph in both notebooks eleven days apart. Worth merging into one TIL claim.",
    sourceA: { course: "AGENTIC", lesson: "WHERE AGENTS FAIL" },
    sourceB: { course: "PYTHON", lesson: "ERROR HANDLING" },
  },
  {
    id: "col-3",
    title: "Structured output and JSON parsing",
    description:
      "The agentic course assumes the parsing works. The Python one covers what happens when it doesn't.",
    sourceA: { course: "AGENTIC", lesson: "REFLECTION" },
    sourceB: { course: "PYTHON", lesson: "STRUCTURED OUTPUTS" },
  },
  {
    id: "col-4",
    title: "Cost per call",
    description:
      "Flagged in both, measured in neither. Two open questions pointing at the same experiment.",
    sourceA: { course: "AGENTIC", lesson: "COST AND LATENCY" },
    sourceB: { course: "PYTHON", lesson: "CALLING AN LLM API" },
  },
];
