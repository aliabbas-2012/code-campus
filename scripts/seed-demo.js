/**
 * Wipes existing project/assignment data and reseeds ~50 students, ~50
 * instructors, roster links between them, and 10 real coding assignments with
 * associated student projects/submissions spread across every status — for
 * demoing and manually testing the whole app with real, varied data.
 *
 * Does NOT touch existing user accounts beyond upserting the demo ones, and
 * does NOT touch the InstructorStudents roster table beyond adding new links.
 *
 * Run with: npm run seed:demo
 */
const { PrismaClient } = require('@prisma/client');
const { hashSync } = require('bcryptjs');
const { randomUUID } = require('crypto');

const db = new PrismaClient();
const PASSWORD = 'password';

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery',
  'Cameron', 'Drew', 'Elliot', 'Harper', 'Kai', 'Logan', 'Micah', 'Noor',
  'Parker', 'Quinn', 'Reese', 'Sam',
];
const LAST_NAMES = [
  'Reed', 'Bailey', 'Chen', 'Diaz', 'Evans', 'Foster', 'Gupta', 'Hayes',
  'Iqbal', 'Jenkins', 'Khan', 'Lopez', 'Mitchell', 'Nguyen', 'Owens',
  'Patel', 'Quintero', 'Ramirez', 'Silva', 'Torres',
];

function nameFor(index) {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

const ASSIGNMENTS = [
  {
    title: 'FizzBuzz',
    description:
      '<p>Print the numbers from 1 to 20. For multiples of 3, print <strong>Fizz</strong> instead; for multiples of 5, print <strong>Buzz</strong>; for multiples of both, print <strong>FizzBuzz</strong>.</p>',
    solution:
      'for i in range(1, 21):\n    if i % 15 == 0:\n        print("FizzBuzz")\n    elif i % 3 == 0:\n        print("Fizz")\n    elif i % 5 == 0:\n        print("Buzz")\n    else:\n        print(i)\n',
  },
  {
    title: 'Palindrome Checker',
    description:
      '<p>Write a function <code>is_palindrome(s)</code> that returns <code>True</code> if a string reads the same forwards and backwards, ignoring case and spaces.</p>',
    solution:
      'def is_palindrome(s):\n    s = s.lower().replace(" ", "")\n    return s == s[::-1]\n\nprint(is_palindrome("Racecar"))\nprint(is_palindrome("Hello"))\n',
  },
  {
    title: 'Fibonacci Sequence',
    description: '<p>Print the first 15 numbers of the Fibonacci sequence.</p><ul><li>Start with 0 and 1</li><li>Each following number is the sum of the previous two</li></ul>',
    solution:
      'a, b = 0, 1\nfor _ in range(15):\n    print(a)\n    a, b = b, a + b\n',
  },
  {
    title: 'Word Frequency Counter',
    description: '<p>Given a paragraph of text, count how many times each word appears and print the counts.</p>',
    solution:
      'text = "the quick brown fox jumps over the lazy dog the fox runs"\nwords = text.split()\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nfor word, count in sorted(counts.items()):\n    print(f"{word}: {count}")\n',
  },
  {
    title: 'Temperature Converter',
    description: '<p>Write functions to convert Celsius to Fahrenheit and back, then test them on a few values.</p>',
    solution:
      'def c_to_f(c):\n    return c * 9 / 5 + 32\n\ndef f_to_c(f):\n    return (f - 32) * 5 / 9\n\nfor c in [0, 20, 37, 100]:\n    print(f"{c}C = {c_to_f(c):.1f}F")\n',
  },
  {
    title: 'Prime Number Finder',
    description: '<p>Print all prime numbers between 2 and 50.</p>',
    solution:
      'def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\nprint([n for n in range(2, 51) if is_prime(n)])\n',
  },
  {
    title: 'List Sorting Algorithms',
    description: '<p>Implement bubble sort by hand (no using <code>sorted()</code> or <code>.sort()</code>) and use it to sort a list of numbers.</p>',
    solution:
      'def bubble_sort(items):\n    items = items.copy()\n    n = len(items)\n    for i in range(n):\n        for j in range(n - i - 1):\n            if items[j] > items[j + 1]:\n                items[j], items[j + 1] = items[j + 1], items[j]\n    return items\n\nprint(bubble_sort([5, 2, 9, 1, 5, 6]))\n',
  },
  {
    title: 'Simple Calculator',
    description: '<p>Write a function <code>calculate(a, op, b)</code> supporting <code>+</code>, <code>-</code>, <code>*</code>, and <code>/</code>.</p>',
    solution:
      'def calculate(a, op, b):\n    if op == "+":\n        return a + b\n    if op == "-":\n        return a - b\n    if op == "*":\n        return a * b\n    if op == "/":\n        return a / b\n    raise ValueError("Unknown operator")\n\nprint(calculate(4, "+", 5))\nprint(calculate(10, "/", 2))\n',
  },
  {
    title: 'String Reversal',
    description: '<p>Reverse a string three different ways: slicing, a loop, and <code>reversed()</code>.</p>',
    solution:
      's = "Code Campus"\nprint(s[::-1])\n\nresult = ""\nfor ch in s:\n    result = ch + result\nprint(result)\n\nprint("".join(reversed(s)))\n',
  },
  {
    title: 'Shapes and Areas (OOP)',
    description: '<p>Define a <code>Shape</code> base class and <code>Circle</code>/<code>Rectangle</code> subclasses, each with an <code>area()</code> method.</p>',
    solution:
      'import math\n\nclass Shape:\n    def area(self):\n        raise NotImplementedError\n\nclass Circle(Shape):\n    def __init__(self, radius):\n        self.radius = radius\n    def area(self):\n        return math.pi * self.radius ** 2\n\nclass Rectangle(Shape):\n    def __init__(self, w, h):\n        self.w, self.h = w, h\n    def area(self):\n        return self.w * self.h\n\nfor shape in [Circle(3), Rectangle(4, 5)]:\n    print(f"{type(shape).__name__}: {shape.area():.2f}")\n',
  },
];

async function main() {
  console.log('Deleting existing projects and assignments…');
  await db.project.deleteMany({});
  await db.assignment.deleteMany({});

  console.log('Seeding 50 instructors and 50 students…');
  const password_hash = hashSync(PASSWORD, 10);

  const instructors = [];
  for (let i = 0; i < 50; i++) {
    const email = `instructor${i + 1}@example.com`;
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name: nameFor(i), role: 'INSTRUCTOR', password_hash, status: 'ACTIVE' },
    });
    instructors.push(user);
  }

  const students = [];
  for (let i = 0; i < 50; i++) {
    const email = `student${i + 1}@example.com`;
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name: nameFor(i + 7), role: 'STUDENT', password_hash, status: 'ACTIVE' },
    });
    students.push(user);
    await db.workspace.upsert({
      where: { user_id: user.id },
      update: {},
      create: { user_id: user.id, storage_quota_bytes: BigInt(524288000) },
    });
  }

  console.log('Linking students to instructor rosters…');
  const rosterByInstructor = new Map();
  let cursor = 0;
  for (let i = 0; i < instructors.length; i++) {
    const count = (i % 3) + 1; // 1-3 students per instructor
    const assigned = [];
    for (let k = 0; k < count; k++) {
      const student = students[cursor % students.length];
      cursor++;
      assigned.push(student);
      await db.instructorStudents.upsert({
        where: { instructor_id_student_id: { instructor_id: instructors[i].id, student_id: student.id } },
        update: {},
        create: { instructor_id: instructors[i].id, student_id: student.id },
      });
    }
    rosterByInstructor.set(instructors[i].id, assigned);
  }

  console.log('Creating 10 assignments with student projects…');
  for (let i = 0; i < ASSIGNMENTS.length; i++) {
    const exercise = ASSIGNMENTS[i];
    const instructor = instructors[i * 5]; // spread across the instructor pool
    const roster = rosterByInstructor.get(instructor.id);
    if (!roster || roster.length === 0) continue;

    // Assign to up to 4 students: everyone on this instructor's roster, plus a
    // couple more borrowed from a nearby instructor's roster for variety.
    const assigneeMap = new Map(roster.map((s) => [s.id, s]));
    const nearby = rosterByInstructor.get(instructors[(i * 5 + 1) % instructors.length].id) ?? [];
    for (const s of nearby) {
      if (assigneeMap.size >= 4) break;
      assigneeMap.set(s.id, s);
    }
    const assigneeIds = Array.from(assigneeMap.keys());
    const assigneeUsers = Array.from(assigneeMap.values());

    const assignment = await db.assignment.create({
      data: {
        instructor_id: instructor.id,
        title: exercise.title,
        description: exercise.description,
        max_score: 100,
        pass_threshold: 60 + (i % 3) * 5,
        assigned_students: {
          createMany: { data: assigneeIds.map((student_id) => ({ student_id })) },
        },
      },
    });

    // First assignee: leave untouched (represents "not started").
    // Second assignee: IN_PROGRESS only.
    // Third assignee: cycles through SUBMITTED / REVISION_REQUESTED / GRADED.
    const makeProject = async (student, status) => {
      const project = await db.project.create({
        data: {
          workspace_id: (await db.workspace.findUniqueOrThrow({ where: { user_id: student.id } })).id,
          assignment_id: assignment.id,
          name: exercise.title,
        },
      });
      const content = exercise.solution;
      await db.projectFile.create({
        data: {
          project_id: project.id,
          name: 'solution.py',
          type: 'FILE',
          size_bytes: BigInt(Buffer.byteLength(content, 'utf-8')),
          storage_path: randomUUID(),
          mime_type: 'text/x-python',
          content,
        },
      });

      const submission = await db.submission.create({
        data: {
          project_id: project.id,
          assignment_id: assignment.id,
          student_id: student.id,
          status: 'IN_PROGRESS',
        },
      });

      if (status === 'IN_PROGRESS') return;

      await db.submission.update({ where: { id: submission.id }, data: { status: 'SUBMITTED', submitted_at: new Date() } });
      await db.submissionEvent.create({ data: { submission_id: submission.id, type: 'SUBMITTED', actor_id: student.id } });
      if (status === 'SUBMITTED') return;

      if (status === 'REVISION_REQUESTED') {
        await db.submission.update({ where: { id: submission.id }, data: { status: 'REVISION_REQUESTED' } });
        await db.submissionEvent.create({
          data: {
            submission_id: submission.id,
            type: 'REVISION_REQUESTED',
            actor_id: instructor.id,
            feedback: 'Good start — add a comment explaining your approach and try a couple more test cases.',
          },
        });
        return;
      }

      if (status === 'GRADED_PASS' || status === 'GRADED_FAIL') {
        const score = status === 'GRADED_PASS' ? 88 : 45;
        const passed = score >= assignment.pass_threshold;
        await db.submission.update({
          where: { id: submission.id },
          data: { status: 'GRADED', score, passed, graded_at: new Date(), graded_by_id: instructor.id },
        });
        await db.submissionEvent.create({
          data: { submission_id: submission.id, type: 'GRADED', actor_id: instructor.id, score },
        });
      }
    };

    if (assigneeUsers[1]) await makeProject(assigneeUsers[1], 'IN_PROGRESS');
    if (assigneeUsers[2]) await makeProject(assigneeUsers[2], i % 2 === 0 ? 'SUBMITTED' : 'REVISION_REQUESTED');
    if (assigneeUsers[3]) await makeProject(assigneeUsers[3], i % 2 === 0 ? 'GRADED_PASS' : 'GRADED_FAIL');

    console.log(`  Created "${exercise.title}" (instructor: ${instructor.email}, ${assigneeIds.length} assigned)`);
  }

  console.log('\nDone.');
  console.log('50 instructors: instructor1..50@example.com');
  console.log('50 students: student1..50@example.com');
  console.log(`All passwords: "${PASSWORD}"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
