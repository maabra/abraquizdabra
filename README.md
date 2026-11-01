# AbraQuizDabra

AbraQuizDabra is a programming quiz website with a Windows XP-inspired interface. It provides theory questions, code exercises, explanations, saved questions, and progress tracking.

## Question bank

The bank contains **6,600 question records across 33 topics**. Each topic has 200 questions, divided into 50 Easy, 50 Medium, 50 Hard, and 50 Very hard records.

Topics include:

- **Languages:** Python, JavaScript, Java, C, C++, C#, PHP, SQL, Haskell, HTML, and CSS.
- **Frameworks and tools:** React, Vue, Node.js, FastAPI, .NET, Git, Docker, Docker Compose, REST API, OpenCV, NumPy, and SQLAlchemy.
- **Data and analysis:** MySQL, DynamoDB, MATLAB, Simulink, Wireshark, and OpenSSL.
- **Design and hardware:** CAD, Autodesk Inventor, Autodesk CFD, and Arduino.

Questions use parameterized variants of 132 topic/difficulty families. Related exercises repeat concepts with different inputs or formats; the total does not represent 6,600 distinct concepts. Difficulty bands describe progression within a family and are not a calibrated measure of professional proficiency.

## How quizzes work

Search or filter the topic library, then select a topic, difficulty level (or all levels), question format, and session length. Practice sets can include all questions, unanswered questions, questions needing practice, or bookmarks. The setup shows the actual number available and prevents empty sessions. Questions can appear in their original order or be shuffled. After submitting an answer, the quiz displays the correct answer or model solution with an explanation.

| Format | Task | Grading |
| --- | --- | --- |
| Theory | Select the correct answer from four choices. | Automatic |
| Logic | Compare two complete snippets and select the numeric difference between their results. | Automatic |
| Predict output | Enter the numeric result of a snippet or the requested rendered value. | Automatic |
| Complete code | Fill a marked blank with the missing code. | Lexical token comparison, with self-assessment for equivalent alternatives. |
| Write code | Write a solution, then compare it with a model and checklist. | Self-assessment |

Every question includes an explanation. Question notes and saved status remain accessible during practice. Multiple-choice questions also explain incorrect choices. Session results separate automatically graded answers, self-reviewed solutions, and skipped questions. Incorrect and skipped questions can be retried.

## Answer review

Answer review is a searchable notebook of your latest retained attempt for each practiced question. Filter by topic, format, correct or incorrect results, skipped work, self-review, or scheduled review. Search includes question text, theory definitions, concepts, and personal notes. Open explanations and edit notes without recording another answer, retry one question, or start a shuffled set of up to ten matching questions in a selected topic. Practice sets respect all filters and retain the existing unfinished-session guard. Results are paginated in groups of twenty.

Skipped attempts are recovered from the active session, parked quizzes, and retained history. Deleting or aging out those sessions can remove skips; your latest submitted answers remain in progress. Review scheduling uses the newest retained attempt, while progress statistics continue to use submitted answers and keep self-assessment separate. Fully explored topics without due reviews are omitted from recommendations.

## Personalized study plan

My progress recommends up to three topics, prioritizing questions ready for review and then topics already started. Scheduled review includes incorrect or skipped results and correct answers last practiced at least seven days ago, including self-reviewed answers. Missing dates do not trigger age-based reviews. Suggestions open quiz setup with all difficulty levels and the recommended practice set selected. Scheduled review is also available in any topic?s practice-set menu. This simple reminder uses your latest results; it does not estimate mastery or retain a spaced-repetition history.

## Code answers

Submitted code is never executed by the website. Output questions compare numeric values, while completion questions compare the submitted text with a canonical answer, comparing lexical tokens while preserving quoted text, identifier boundaries, and compound operators. SQL keywords are compared without case sensitivity. Other valid implementations may need self-assessment. Code blocks include a copy control with a selection fallback when clipboard access is unavailable.

Code creation tasks provide a model solution and a review checklist. Self-assessed answers do not count toward automatic accuracy statistics.

HTML and CSS questions ask about document structure or layout values. CAD, CFD, and Simulink exercises identify educational pseudocode and simplified mathematical models; they do not run vendor applications or validate real engineering simulations.

## Saved questions and progress

Questions can be bookmarked for later practice and given personal notes of up to 1,000 characters. Saved questions support search, status filters, pagination, and practice sessions. Search also includes notes. Matching bookmarks can be exported as a separate set or removed together; removing bookmarks retains answers and notes. The progress page shows the latest result for each question, per-topic completion, automatic accuracy, self-reviewed work, and breakdowns by difficulty and format.

Answers, bookmarks, notes, preferences, and session drafts are stored in the current browser using localStorage. Previous-question controls and a question selector let you revisit reachable questions without losing drafts. Revealed code models also survive reloads. Starting another quiz asks before parking unfinished work. The session list retains up to eight parked quizzes and twenty completed sessions. Completed results can be reopened or deleted.

Progress exports include local work as JSON. Import shows a preview before applying changes and recalculates automatic grades. Merge combines bookmarks and session history, keeps newer answers, and preserves local notes and the active quiz. Replacing progress requires an explicit checkbox. Files larger than 25 MiB are rejected. Saved-set exports contain their bookmarks and notes rather than the entire progress history.

A recovery snapshot is created before destructive changes, imports, and conflict resolution. Recovery uses the same preview, so opening it does not change progress. If another tab changes saved progress, this tab pauses writes and offers merge, use stored copy, or keep this tab. Divergent unfinished drafts are preserved separately when merged. Storage failures keep current work in memory and provide export and retry controls. Browser storage is finite; clearing it also removes local progress and recovery data.

The website uses local fonts and assets. It does not require an account or send submitted answers to a remote grading service.

## Interface and controls

The interface uses blue title bars, beveled buttons, folder-style topic cards, and an application menu. The quiz window can be maximized or restored to its original size. The layout also supports mobile screens. Larger text and code wrapping are persistent preferences. Topic favorites, category and progress filters, and sorting help narrow the library; library filter URLs can be shared. Each topic has a details view listing its core theory concepts and documentation source.

Keyboard controls include **1–4** for multiple-choice selection, **Ctrl/Command + Enter** to submit or continue, and **Tab** to indent inside a code editor. **Shift + Tab** moves focus out of the editor.

## Question verification

Each question has an entry in the [question audit](data/question-audit.json). Theory answers and distractors are checked against a reviewed glossary. A separate Python checker reads stored questions without importing their generator and independently calculates numerical answers, logic differences, and model results. Completion checks confirm that filling the blank reconstructs the reviewed solution.

The browser validates every loaded question bank and checks its reviewed SHA-256 content fingerprints when Web Crypto is available. A changed fingerprint prevents that bank from starting a quiz; unavailable browser verification is disclosed. These hashes detect changes against the included review record, rather than authenticating an external publisher.

The current audit covers all 6,600 records. Reference execution or browser-rendering evidence additionally covers 2,880 records, using 660 unique snippets. Other records use calculation and source/code review without full native execution. These methods are distinguished in the audit rather than treating an unavailable runtime as a successful execution.

The review is AI-assisted source and reasoning review, not certification by an independent human reviewer. It checks the reference questions and solutions, not arbitrary learner-written programs.

See the [audit summary](data/audit-summary.json), [native execution results](data/native-execution.json), and [review methods and limitations](CONTENT_REVIEW.md) for details.
