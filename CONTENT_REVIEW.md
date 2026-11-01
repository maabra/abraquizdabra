# Question review and verification

The per-question audit covers every stored record. It is an AI-assisted source and reasoning review with independent calculation checks, not certification by an independent human reviewer.

## Reports

- [Audit summary](data/audit-summary.json): coverage, failure counts, execution coverage, and corrections.
- [Question ledger](data/question-audit.json): one entry for every question ID, including methods, source links, rationale or numerical calculation, runtime evidence, and a content hash.
- [Native execution](data/native-execution.json): outcomes for unique stored snippets actually executed or rendered, with explicitly unexecuted cases.
- [Generator regression report](data/verification.json): structural and reference-family tests. This is separate from the independent audit.

## Methods

### Theory

The 340 concept definitions and explanations were read and reviewed for meaning and scope. [Concept rationales](audit/concept-rationales.json) state the semantic basis for each definition. A [frozen reviewed glossary](audit/reviewed-concepts.json) records the approved text.

The auditor reconstructs each question's ordered answer by looking up its displayed definitions in that glossary. It checks all four choices, rejects every incorrect mapping, and checks the full explanation. This covers all 1,360 theory records, including the combined-definition bands.

### Numerical, logic, completion, and creation records

[The independent Python oracle](scripts/audit_oracle.py) reads the stored JSON records without importing the question generator. It identifies inputs from the displayed or model code and calculates answers through separately implemented arithmetic, explicit state models, array operations, or contracts. Examples include combinatorial counting for the recurrence, graph traversal for Git ancestry, and independent packet enumeration for Wireshark filters.

All 5,440 non-theory records are checked individually. Logic questions check both complete snippets and B minus A. Completion questions must reconstruct the exact reviewed solution when filled. Creation questions are checked for a supplied problem context, coherent instructions, model behavior, and rubric result. This verifies the reference task and solution; it does not grade arbitrary code submitted by a learner.

The 136 snippet families were reviewed for syntax, boundaries, state update order, answer targets, and assumptions. [Snippet fingerprints](audit/reviewed-snippets.json) and [reviewed content fingerprints](audit/reviewed-content.json) detect later changes. A fingerprint alone does not establish correctness and must not be updated in place of a substantive review.

### Execution evidence

TypeScript references are checked with the pinned TypeScript 5.9.3 compiler in strict mode targeting ES2022, then the emitted JavaScript is executed in Node.js. All 44 unique TypeScript snippets (including comparison inputs) must compile and produce their independent expected result. Regression checks reject a type-invalid snippet and a deliberately wrong answer.

The native audit executes unmodified stored JavaScript and PHP, supported Python/library snippets, SQL through SQLite, and Git/OpenSSL commands. It compiles C# question bodies using an installed .NET SDK. React snippets run through the official React runtime after JSX compilation; Vue snippets run through the official SFC compiler and runtime. CSS uses browser layout measurements. HTML is parsed by the browser, with ordered-list numbering and table spans assessed using the applicable DOM attributes and numbering rules.

Identical code is executed once and linked by its SHA-256 hash to every question using it. Both sides of a logic question need execution evidence to count as covered. The report distinguishes unique snippets from question records.

The review environment did not execute every language or vendor host. C, C++, Java, Haskell, Arduino hardware, Inventor iLogic, native MATLAB/Simulink, Docker, DynamoDB, and Autodesk CFD have calculation and source/code review rather than full native execution. A SQLite result is not a MySQL server test. Educational CAD/CFD/Simulink pseudocode is not a native model or a simulation validation.

## Corrections made during review

The structured correction list is in [audit/review-notes.json](audit/review-notes.json). It includes:

- Preserving `||` in JavaScript explanations instead of truncating at the delimiter.
- Qualifying the `vector<bool>` storage exception and extendable-output hash behavior.
- Removing an unsupported constant-space requirement from a shared Haskell/SQL task.
- Moving completion blanks out of comments and checking exact reconstruction, including ten malformed Simulink completions.
- Giving each question format consistent answer instructions.
- Replacing invalid shared PHP generation with PHP-specific code and validating it with the official PHP CLI.
- Narrowing overlapping tuple, class, and HTML definitions to make the listed correct choice unambiguous.
- Showing the synthetic packet dataset in Wireshark creation tasks without revealing the filter answer.
- Giving TypeScript questions explicit type-checking conditions and independently verified reference solutions.
- Separating React doubling and reduction explanations so each describes the displayed code.

## Sources

Language and product documentation was consulted alongside the reasoning review. Per-question links are in the ledger. Relevant references include:

- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/), including unions, narrowing, generic parameters, readonly properties, unknown, and never.
- [Python data model](https://docs.python.org/3/reference/datamodel.html), [JavaScript guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide), [Java language tutorial](https://docs.oracle.com/javase/tutorial/java/), [C committee draft](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf), and [C++ working draft](https://eel.is/c++draft/).
- [C# documentation](https://learn.microsoft.com/en-us/dotnet/csharp/), [PHP language reference](https://www.php.net/manual/en/langref.php), [SQL tutorial](https://www.postgresql.org/docs/current/tutorial-sql.html), and [Haskell 2010 report](https://www.haskell.org/onlinereport/haskell2010/).
- [HTML list semantics](https://html.spec.whatwg.org/multipage/grouping-content.html), [CSS cascade layers](https://www.w3.org/TR/css-cascade-5/), [React update queues](https://react.dev/learn/queueing-a-series-of-state-updates), and [Vue reactivity](https://vuejs.org/guide/essentials/reactivity-fundamentals.html).
- [Node events](https://nodejs.org/api/events.html), [FastAPI dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/), [.NET dependency injection](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection), and [Git glossary](https://git-scm.com/docs/gitglossary).
- [Docker images](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/), [Compose services](https://docs.docker.com/reference/compose-file/services/), and [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html).
- [OpenCV thresholding](https://docs.opencv.org/4.x/d7/d4d/tutorial_py_thresholding.html), [NumPy indexing](https://numpy.org/doc/stable/user/basics.indexing.html), and [SQLAlchemy session behavior](https://docs.sqlalchemy.org/en/20/orm/session_basics.html).
- [MySQL recursive CTEs](https://dev.mysql.com/doc/refman/8.4/en/with.html), [DynamoDB read capacity](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html), [MATLAB indexing](https://www.mathworks.com/help/matlab/math/array-indexing.html), and [Simulink Unit Delay](https://www.mathworks.com/help/simulink/slref/unitdelay.html).
- [Wireshark display filters](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html), [OpenSSL encryption options](https://docs.openssl.org/3.0/man1/openssl-enc/), [Inventor iLogic syntax](https://help.autodesk.com/cloudhelp/2024/ENU/Inventor-iLogic/files/GUID-32B66838-22E4-4A0A-B5BB-862350C76B36.htm), [CFD convergence](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/How-to-validate-convergence-in-Simulation-CFD.html), and [Arduino PWM](https://support.arduino.cc/hc/en-us/articles/9350537961500-Use-PWM-output-with-Arduino).

Documentation links support review and further reading. They do not imply that a vendor certified a question or that an unavailable runtime was executed.

## Limits of the curriculum

The bank uses parameterized variants across five formats, not 6,800 separate concepts. Definition matching remains foundational even when more definitions are combined. Difficulty labels are not an independently calibrated measure of professional proficiency. Simplified engineering examples apply only under their stated assumptions.

After editing content, rerun the independent oracle, review the affected definitions, prompts and snippets, update the frozen review records only after that review, and regenerate the ledger. `npm test` rejects stale per-question review hashes.
