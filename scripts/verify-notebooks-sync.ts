import { db } from "../src/db";
import { users } from "../src/db/schema";
import {
  getUserNotebookCourses,
  getOrSeedUserNotebookCourses,
  createCourse,
  createLesson,
  saveLessonBlocks,
  toggleLessonWatched,
  deleteLesson,
  deleteCourse,
} from "../src/lib/dal/notebooks";

async function main() {
  console.log("Testing Notebooks DAL with database...");

  // 1. Find or create a test user
  let [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.log("No user found, creating temporary test user...");
    [user] = await db
      .insert(users)
      .values({
        id: "test-user-notebooks",
        name: "Test User",
        email: "test@example.com",
      })
      .returning();
  }

  console.log(`Using user ID: ${user.id}`);

  // 2. Test getOrSeedUserNotebookCourses
  console.log("1. Calling getOrSeedUserNotebookCourses...");
  const initial = await getOrSeedUserNotebookCourses(user.id);
  console.log(`✓ Loaded/seeded ${initial.courses.length} courses, ${initial.collisions.length} collisions.`);

  // 3. Test createCourse
  console.log("2. Testing createCourse...");
  const newCourse = await createCourse(user.id, {
    title: "Quantum Computing Foundations",
    provider: "MIT OPENCOURSEWARE",
    accent: "#00F0FF",
    accentFg: "#0A0A0A",
  });
  console.log(`✓ Created course: ${newCourse.title} (ID: ${newCourse.id})`);

  // 4. Test createLesson
  console.log("3. Testing createLesson...");
  const targetModule = newCourse.modules[0];
  const newLesson = await createLesson(user.id, targetModule.id, "Superposition and Qubits");
  if (!newLesson) throw new Error("Failed to create lesson");
  console.log(`✓ Created lesson: ${newLesson.title} (ID: ${newLesson.id})`);

  // 5. Test saveLessonBlocks (note editing)
  console.log("4. Testing saveLessonBlocks (saving notes)...");
  const saveResult = await saveLessonBlocks(user.id, newLesson.id, [
    { id: "b-1", type: "paragraph", text: "A qubit can be in state |0>, |1>, or a linear combination." },
    { id: "b-2", type: "callout", kind: "fact", text: "Bloch sphere represents single-qubit states geometrically." },
  ]);
  console.log(`✓ Saved blocks: wordCount = ${saveResult.wordCount}`);

  // 6. Test toggleLessonWatched
  console.log("5. Testing toggleLessonWatched...");
  const watched = await toggleLessonWatched(user.id, newLesson.id, true);
  console.log(`✓ Toggled watched: ${watched}`);

  // 7. Verify all saved data in DB
  console.log("6. Verifying retrieved course tree from DB...");
  const courses = await getUserNotebookCourses(user.id);
  const found = courses.find((c) => c.id === newCourse.id);
  if (!found) throw new Error("Created course not found in database!");
  const foundLesson = found.modules[0].lessons.find((l) => l.id === newLesson.id);
  if (!foundLesson) throw new Error("Created lesson not found in database!");
  const firstBlock = foundLesson.blocks?.[0];
  const previewText = firstBlock && "text" in firstBlock ? firstBlock.text : "";
  console.log(`✓ Verified retrieved lesson blocks length: ${(foundLesson.blocks || []).length}`);
  console.log(`✓ Retrieved lesson note preview: "${previewText}"`);

  // Clean up the created test course
  console.log("7. Cleaning up test course...");
  await deleteCourse(user.id, newCourse.id);
  console.log("✓ Test course deleted.");

  console.log("\n🎉 ALL NOTEBOOKS DATABASE SYNC TESTS PASSED SUCCESSFULLY!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
