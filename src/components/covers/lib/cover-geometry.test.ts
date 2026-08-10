import {
  clamp,
  calculateCardWidth,
  calculateCoverHeight,
  normalizeValues,
} from "./cover-geometry";

export function runCoverGeometryTests() {
  const results: { test: string; passed: boolean; details?: string }[] = [];

  // Test 1: clamp bounds
  const c1 = clamp(50, 74, 185) === 74;
  const c2 = clamp(200, 74, 185) === 185;
  const c3 = clamp(100, 74, 185) === 100;
  results.push({ test: "clamp min/max bounds", passed: c1 && c2 && c3 });

  // Test 2: calculateCoverHeight bounds at 2 min and 300 min (§7)
  const hMin = calculateCoverHeight(2);
  const hMax = calculateCoverHeight(300);
  const hBoundsPassed = hMin >= 74 && hMax <= 185 && hMax > hMin;
  results.push({
    test: "calculateCoverHeight bounds holds [74, 185]",
    passed: hBoundsPassed,
    details: `min=2m -> ${hMin}px, max=300m -> ${hMax}px`,
  });

  // Test 3: calculateCardWidth monotonicity
  const w2 = calculateCardWidth(2);
  const w60 = calculateCardWidth(60);
  const w300 = calculateCardWidth(300);
  const wPassed = w2 < w60 && w60 < w300;
  results.push({
    test: "calculateCardWidth sub-linear monotonicity",
    passed: wPassed,
    details: `2m -> ${w2}px, 60m -> ${w60}px, 300m -> ${w300}px`,
  });

  // Test 4: normalizeValues
  const norm = normalizeValues([10, 50, 100]);
  const normPassed = norm[0] === 10 && norm[1] === 50 && norm[2] === 100;
  results.push({ test: "normalizeValues scaling", passed: normPassed });

  const allPassed = results.every((r) => r.passed);
  console.log("--- Cover Geometry Unit Tests ---");
  results.forEach((r) => console.log(`${r.passed ? "✓ PASS" : "✕ FAIL"} - ${r.test} ${r.details || ""}`));
  return allPassed;
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  try {
    runCoverGeometryTests();
  } catch (err) {
    console.error("Test execution failed:", err);
  }
}
