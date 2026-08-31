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
            meta: "OPEN · EDITED 12 MIN AGO",
            gap: [
              { timestamp: "06:12", topic: "The distinction between self-critique and critique against a rubric" },
              { timestamp: "14:35", topic: "Why reflection helps writing tasks more than arithmetic" },
              { timestamp: "21:08", topic: "The failure mode where a correct answer gets revised into a wrong one" },
            ],
            transcript: {
              text: "Welcome to Reflection. In this lesson we examine why having a model inspect its own output can dramatically improve performance, but only when given outside evidence...",
              cues: [
                { t: "00:00", text: "Introduction to Reflection pattern" },
                { t: "06:12", text: "Rubric evaluation vs unguided self-critique" },
                { t: "14:35", text: "Domain sensitivity: code and prose vs math" },
                { t: "21:08", text: "Degradation loops and false correction traps" },
              ],
            },
            blocks: [
              {
                id: "b-a21-1",
                type: "paragraph",
                text: "The pattern is embarrassingly simple: **have the model look at its own output and revise it.** One generation pass, one critique pass, then a rewrite. Most of the gain shows up in the first revision.",
              },
              {
                id: "b-a21-2",
                type: "callout",
                kind: "gotcha",
                text: "Reflection on the *same* context is much weaker than reflection with fresh evidence. If the critic can only see what the generator saw, it mostly agrees with itself. Give the critic a test result, a linter, a retrieved doc — something the generator didn't have.",
              },
              {
                id: "b-a21-3",
                type: "heading",
                level: 2,
                text: "The loop, drawn",
              },
              {
                id: "b-a21-4",
                type: "image",
                url: "/loop-diagram.svg",
                caption: "FIG · SKETCHED DURING THE LECTURE — LOOP 1–2×, THEN STOP (NEEDS OUTSIDE EVIDENCE)",
              },
              {
                id: "b-a21-5",
                type: "toggle",
                summary: "Why more loops stop helping",
                body: "After the second pass the critique starts restating itself, and each extra round costs a full generation. Treat loop count as a budget, not a quality dial — the returns fall off steeply.",
              },
              {
                id: "b-a21-6",
                type: "heading",
                level: 3,
                text: "Minimal implementation",
              },
              {
                id: "b-a21-7",
                type: "code",
                lang: "PYTHON",
                note: "FROM THE LAB NOTEBOOK",
                code: `def reflect(task, rounds=2):
    draft = llm(f"Do this task: {task}")
    for _ in range(rounds):
        evidence = run_tests(draft)        # the outside voice
        critique = llm(f"Draft + test output:\\n{draft}\\n{evidence}\\n"
                       f"List only concrete defects.")
        if "no defects" in critique.lower(): break
        draft = llm(f"Revise using:\\n{critique}\\n{draft}")
    return draft`,
              },
              {
                id: "b-a21-8",
                type: "callout",
                kind: "question",
                text: 'Does the break-on-"no defects" check actually fire, or does the critic always find something? Measure it on the assignment.',
              },
              {
                id: "b-a21-9",
                type: "quote",
                text: "The critic and the generator being the same model isn't the problem. The critic and the generator having the same information is.",
                attribution: "Andrew Ng",
              },
              {
                id: "b-a21-10",
                type: "heading",
                level: 3,
                text: "Before the next lesson",
              },
              {
                id: "b-a21-11",
                type: "todo",
                items: [
                  { text: "Run the reflection lab with 1, 2 and 4 rounds", done: true },
                  { text: "Log token cost per round — is round 3 ever worth it?", done: false },
                  { text: "Try a critic with a linter attached vs a bare critic", done: false },
                ],
              },
              {
                id: "b-a21-12",
                type: "link",
                url: "https://learn.deeplearning.ai/agentic-reflection",
                title: "Reflection — lesson notebook and slides",
                site: "LEARN.DEEPLEARNING.AI",
              },
              {
                id: "b-a21-13",
                type: "mark",
                timestamp: "18:40",
                text: "Surprising result on Python coding benchmarks with AST verification",
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
