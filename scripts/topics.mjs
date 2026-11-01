// Original teaching definitions. Documentation links are references, not a claim
// that every generated exercise has been independently reviewed.
const raw = [
['python','Python','Languages','Py','https://docs.python.org/3/tutorial/',`
list|An ordered mutable sequence|Lists allow replacing elements and preserve position.
tuple|An immutable sequence whose explicitly stored elements may have different types|A tuple cannot have its element references replaced after creation.
dictionary|A mapping from hashable keys to values|Keys identify values rather than numeric positions.
set|A collection of distinct hashable elements|Duplicate insertions do not create extra elements.
range|An integer progression with an excluded stop|range(2,5) visits 2, 3, and 4.
generator|An iterator that produces values lazily|yield suspends a function and retains its state.
context manager|An object defining managed entry and exit|with invokes the context management protocol for cleanup.
list comprehension|An expression constructing a list from iteration|Its expression is evaluated for each accepted item.
is|An operator testing object identity|Identity asks whether two references denote the same object.
exception|A signal that changes normal control flow|A matching except clause can handle a raised exception.
`],
['javascript','JavaScript','Languages','JS','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference',`
const|A declaration preventing reassignment of a binding|An object held by a const binding can still be mutated.
let|A block scoped variable declaration|The binding belongs to the enclosing block.
strict equality|A comparison without coercing operand types|The === operator differs from coercive ==.
map|An array operation producing one result per visited element|The callback return values populate a new array.
filter|An array operation keeping elements passing a predicate|Only elements with truthy predicate results are retained.
reduce|An array operation accumulating a result|An explicit initial accumulator makes empty input well defined.
Promise|An object representing an eventual completion or failure|Handlers observe fulfillment or rejection.
closure|A function together with access to its lexical environment|The environment can survive the outer function call.
nullish coalescing|A fallback operator for null or undefined|Unlike || it preserves 0 and the empty string.
event loop|A mechanism coordinating queued work with execution|Callbacks cannot interrupt a currently running synchronous task.
`],
['typescript','TypeScript','Languages','TS','https://www.typescriptlang.org/docs/handbook/',`
type annotation|An explicit type written on a variable, parameter, or return value|An annotation such as : number lets the compiler check compatible uses; it does not validate runtime input.
type inference|The compiler determining a type without an explicit annotation|An initializer or surrounding context can supply type information.
union type|A type accepting values from any of its member types|A number or string value fits number | string; operations must be valid for the narrowed type.
narrowing|Refining a value to a more specific type through control flow checks|A typeof check can narrow number | string to number in one branch.
interface|A named object shape declared with the interface keyword|Compatible values must provide its required properties; an interface does not create runtime objects.
type alias|A name introduced with type for an existing type expression|An alias can name an object, union, tuple, or other type; it does not create a distinct runtime value.
generic type parameter|A type placeholder relating inputs and outputs across uses of a declaration|In function identity<T>(value: T): T the result preserves the argument type rather than discarding it as any.
readonly property|A property that the type checker prevents assigning through that typed reference|readonly is a compile-time restriction and does not freeze an object or recursively make nested values immutable.
unknown|A top type that requires checking before type-specific operations|Any value can be assigned to unknown, but it must be narrowed or asserted before using it as a number.
never|A type representing values that cannot occur|Exhaustive narrowing can leave a variable with type never; a function that always throws can return never.
`],
['java','Java','Languages','Jv','https://docs.oracle.com/javase/tutorial/',`
class|A reference-type declaration that can define constructors and instance fields|Instances share the behavior declared by their class.
interface|A type specifying a contract that classes can implement|Implementations supply behavior for abstract interface methods.
static|A modifier associating a member with the class|A static method does not have an instance this reference.
final variable|A variable whose assignment cannot be changed once initialized|A referenced mutable object may still change internally.
equals|A method for logical equality as defined by a class|Reference == instead compares identity.
ArrayList|A resizable ordered list implementation|It supports indexed access and permits duplicate elements.
HashMap|A hash based key value mapping|Equal keys address the same mapping entry.
try with resources|A statement automatically closing declared resources|Resources implement AutoCloseable.
checked exception|An exception type subject to compile time handling rules|It must be caught or declared when the rules require it.
generics|A facility parameterizing types and methods with types|Type parameters help the compiler reject incompatible uses.
`],
['c','C','Languages','C','https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf',`
pointer|A value that can designate an object or function|Dereferencing an invalid pointer has undefined behavior.
array|A contiguous sequence of elements of one type|Array indexing counts from zero.
sizeof|An operator yielding an object or type size in bytes|Its result has type size_t.
malloc|A function allocating uninitialized dynamic storage|The caller must check failure and eventually release storage.
free|A function releasing dynamically allocated storage|Using the released allocation afterward is invalid.
struct|A type grouping named members|Members may have different types.
header|A file commonly used for shared declarations|Including declarations lets translation units agree on interfaces.
undefined behavior|Behavior for which the standard imposes no requirements|A program cannot rely on a predictable result afterward.
null terminator|A zero character ending a C string|String operations need accessible terminating storage.
static storage duration|A lifetime extending over the entire program execution|A function local static retains its stored value between calls.
`],
['cpp','C++','Languages','C+','https://eel.is/c++draft/',`
RAII|Resource ownership tied to object lifetime|Destructors release resources when owning objects are destroyed.
vector|A dynamically sized sequence container|Ordinary vector<T> stores elements contiguously; vector<bool> is a specialized exception.
reference|An alias bound to an existing object or function|An ordinary reference cannot be reseated like a pointer.
unique_ptr|A smart pointer representing exclusive ownership|It transfers ownership by moving and cannot be copied.
shared_ptr|A smart pointer using shared ownership|The managed object is destroyed when the last owner releases it.
virtual function|A member supporting dynamic dispatch|An override can be selected through a base pointer or reference.
template|A declaration parameterized by types or compile time values|Instantiation produces a concrete specialization.
const member function|A member function whose this object is const qualified|It cannot directly modify ordinary nonmutable data members.
move semantics|Operations permitting transfer from expiring objects|A move may transfer resources without copying their contents.
iterator|An abstraction for traversing a sequence|Past the end iterators are sentinels rather than dereferenceable elements.
`],
['csharp','C#','Languages','C#','https://learn.microsoft.com/en-us/dotnet/csharp/',`
class|A reference-type declaration that can define constructors and instance fields|Two references may denote the same instance.
struct|A declaration of a value type|Assignment copies the value including any references it contains.
property|A member exposing access through get or set accessors|It can encapsulate validation around stored state.
interface|A contract implemented by compatible types|Consumers can depend on the contract rather than a concrete class.
LINQ|Query operators for working with sequences and other sources|Many sequence operators use deferred execution.
async|A modifier enabling await in a method|It does not by itself start a new thread.
Task|A representation of an asynchronous operation|Await observes its completion and propagates failures.
using statement|A construct ensuring disposal of a resource|It calls Dispose when control leaves the scope.
nullable value type|A value type augmented with a null state|The T? form can represent a missing value.
delegate|A type representing a callable method reference|A delegate has a specified parameter and return signature.
`],
['php','PHP','Languages','PHP','https://www.php.net/manual/en/',`
variable|A named value binding written with a dollar prefix|PHP variable names begin with $.
array|An ordered map supporting integer and string keys|PHP arrays are not limited to contiguous integer indexes.
strict equality|A comparison requiring matching type and value|=== avoids the coercions of ==.
echo|A language construct writing output|It emits values rather than returning a formatted string.
foreach|A construct iterating keys or values of an iterable|It can expose both the current key and value.
prepared statement|A query whose parameter data is bound separately|Binding avoids treating values as executable SQL syntax.
session|A mechanism associating server side state with a session identifier|The identifier is commonly carried in a browser cookie.
namespace|A scope qualifying symbol names|It reduces naming conflicts between libraries.
require|A construct loading another PHP file with failure treated as an error|A missing required dependency prevents normal continuation.
null coalescing|A fallback operation when a value is missing or null|The ?? operator preserves other falsey values.
`],
['sql','SQL','Languages','SQL','https://www.postgresql.org/docs/current/sql.html',`
SELECT|A statement retrieving expressions or rows|It describes the result to produce.
WHERE|A clause filtering input rows before grouping|Rows failing its predicate do not enter aggregation.
HAVING|A clause filtering groups after grouping|It can reference aggregate results.
INNER JOIN|A join returning matching row combinations|Unmatched input rows are excluded.
LEFT JOIN|A join retaining unmatched rows from the left input|Missing right hand values are represented by NULL.
COUNT(*)|An aggregate counting input rows|Unlike COUNT(column) it does not discard rows with NULL in that column.
NULL|A marker for missing or unknown information|Testing it uses IS NULL rather than = NULL.
ORDER BY|A clause defining result ordering|Without it row ordering is not guaranteed.
transaction|A unit of work committed or rolled back together|Its isolation level determines allowed concurrent observations.
primary key|A constraint uniquely identifying each table row|Its columns cannot be NULL.
`],
['haskell','Haskell','Languages','Hs','https://www.haskell.org/documentation/',`
pure function|A function whose result depends on its inputs without observable side effects|Referential transparency permits substitution of equal expressions.
lazy evaluation|Evaluation delaying an expression until its value is required|An unused expression may never be evaluated.
list|A homogeneous sequence built from empty and cons constructors|Elements in one list have the same type.
map|A function applying another function to each list element|It preserves the list shape for finite lists.
foldl|A left associative fold over a structure|The accumulator combines elements from the left.
Maybe|A type representing Nothing or Just a value|It explicitly models a possible absence.
pattern matching|Selecting structure by matching constructors|Patterns can bind the fields of a constructor.
type class|A collection of operations constrained by a type parameter|Instances provide implementations for specific types.
IO|A type describing an input output action|An IO value describes an action rather than a pure extracted result.
currying|Representing multiple arguments as successive single arguments|Partial application yields another function.
`],
['html','HTML','Languages','<>','https://html.spec.whatwg.org/multipage/',`
semantic element|The category name for HTML tags chosen for document meaning rather than presentation|Meaningful structure helps accessibility and document interpretation.
alt attribute|Text providing an image alternative|Informative images need alternatives expressing their purpose.
label|The HTML element associating descriptive text with a separate form control using for or containment|Its for attribute associates it with a matching control id.
button|An interactive element for an action|Inside a form an explicit type avoids unintended submission.
anchor|An element creating a hyperlink with href|A link navigates to a resource or document fragment.
id|An identifier expected to be unique in its document|References can target a specific element by its id.
class|A space separated set of reusable element tokens|Many elements may share the same class token.
required|A boolean attribute enabling a mandatory form value constraint|Its presence activates the constraint even if written required="false".
head|The element containing document metadata|Metadata includes title and style or resource links.
ordered list|A list represented by ol with li children|Sequence is meaningful for ordered items.
`],
['css','CSS','Languages','{ }','https://developer.mozilla.org/en-US/docs/Web/CSS',`
selector|A pattern identifying elements a rule matches|Matching determines which elements receive declarations.
specificity|A weight comparing competing selectors within cascade conditions|It matters after origin importance and cascade layer ordering.
box sizing|A property controlling how declared dimensions are measured|border-box includes padding and borders in the specified width.
margin|Space outside an element border|It differs from padding inside the border.
padding|Space between content and border|It contributes to outer size under content-box sizing.
flexbox|A layout system primarily arranging items along one axis|The flex direction determines the main axis.
grid|A layout system organizing rows and columns|Tracks let items align in two dimensions.
custom property|An author defined property whose name starts with two hyphens|var() substitutes its value in a declaration.
media query|A condition applying styles according to media features|Viewport width is one possible feature.
inheritance|Propagation of certain computed property values to descendants|Not every property inherits by default.
`],
['react','React','Frameworks & tools','Re','https://react.dev/learn',`
component|A reusable unit describing part of a user interface|A function component returns renderable content.
props|Read only inputs passed from a parent component|A child should not mutate its received props.
state|Component memory whose updates request rendering|A setter schedules an update rather than mutating the current render snapshot.
Hook|A function connecting components to React features|Hooks must follow the rules of Hooks.
key|An identity hint for a child within a sibling list|Stable keys let React track items across reorderings.
effect|A mechanism synchronizing a component with an external system|Cleanup should undo the preceding setup when needed.
controlled input|An input whose displayed value is driven by React state|An onChange handler updates the controlling state.
fragment|A grouping construct without an extra DOM wrapper|It can return siblings as one renderable group.
functional state update|A setter callback deriving next state from pending state|It avoids relying on a stale captured value when queuing updates.
lifting state|Moving shared state to a common ancestor|Children then share one source of truth through props.
`],
['vue','Vue','Frameworks & tools','Vu','https://vuejs.org/guide/introduction.html',`
ref|A reactive wrapper exposing a value property in JavaScript|Templates normally unwrap refs automatically.
computed|A cached reactive value derived from dependencies|Its getter reruns when tracked dependencies change.
v-if|A directive conditionally creating or removing content|It differs from merely hiding an existing element.
v-show|A directive toggling display through CSS|The element remains mounted when hidden.
v-for|A directive rendering a list from data|Stable keys preserve identity during updates.
v-model|A directive connecting value binding and update events|It supports two way form value synchronization.
prop|A parent supplied component input|A child should emit an update rather than directly mutate a prop.
emit|A mechanism notifying a parent through a component event|The parent decides how to react to the event.
watch|A mechanism running a callback when a source changes|It suits side effects rather than cached derivation.
slot|A placeholder for content supplied by a component consumer|Slots enable composition of reusable layouts.
`],
['node','Node.js','Frameworks & tools','N','https://nodejs.org/api/',`
event loop|A mechanism coordinating asynchronous callbacks|Long synchronous work delays other callbacks.
Buffer|A representation of a sequence of bytes|It is suited to binary data rather than only text.
stream|An interface processing data incrementally|It can avoid loading an entire input into memory.
backpressure|A signal to slow a producer when a consumer cannot keep up|Respecting it prevents uncontrolled buffering.
process.env|An object exposing process environment variables|Values generally arrive as strings and require validation.
CommonJS|A module system using require and module.exports|It differs from ES module import and export syntax.
ES module|A module using standard import and export declarations|Node chooses interpretation using extension and package configuration.
fs promises|Promise returning filesystem operations|Await can sequence filesystem tasks without synchronous blocking calls.
EventEmitter|An object dispatching events to registered listeners|Listeners respond to named emitted events.
worker thread|A separate JavaScript execution thread in the same process|It can move CPU intensive JavaScript off the main event loop.
`],
['fastapi','FastAPI','Frameworks & tools','Fa','https://fastapi.tiangolo.com/tutorial/',`
path operation|A handler associated with an HTTP path and method|Decorators register a handler for incoming requests.
path parameter|A value extracted from a variable URL path segment|Type annotations can validate its conversion.
query parameter|A value supplied in the URL query string|It differs from a segment embedded in the path.
request body|Structured data sent as request content|A Pydantic model can validate its expected schema.
dependency|A reusable callable resolved through Depends|It can provide shared validation resources or authentication inputs.
response model|A declared schema for response validation and filtering|It helps prevent returning undeclared fields.
HTTPException|An exception specifying an HTTP error response|Raising it interrupts the handler with the selected status.
async handler|A coroutine path operation supporting await|Blocking work still blocks its event loop if called directly.
OpenAPI|A machine readable API description generated from declarations|It powers interactive API documentation.
TestClient|A client for exercising an ASGI app in tests|Tests can assert status codes and response data.
`],
['dotnet','.NET','Frameworks & tools','.N','https://learn.microsoft.com/en-us/dotnet/',`
CLR|The managed execution runtime for .NET|It provides services such as managed execution and garbage collection.
garbage collection|Automatic reclamation of unreachable managed memory|It does not replace deterministic disposal of external resources.
assembly|A deployable unit containing .NET code and metadata|Assemblies describe their contained types and references.
NuGet|The .NET package management ecosystem|Packages supply reusable libraries and related assets.
dependency injection|Supplying dependencies rather than constructing them internally|The container resolves services based on registrations.
singleton lifetime|A service lifetime shared by resolutions from a container|A singleton must handle its actual concurrency requirements.
scoped lifetime|A service lifetime shared within a dependency scope|An ASP.NET Core request normally creates a scope.
transient lifetime|A service lifetime creating a new instance for each resolution|Repeated resolutions need not return the same object.
middleware|A component in an HTTP request processing pipeline|Order determines how requests and responses flow through it.
configuration|A system combining application settings from providers|Later providers may override earlier values for the same key.
`],
['git','Git','Frameworks & tools','Gt','https://git-scm.com/docs',`
commit|A snapshot with metadata and parent references|A commit records repository state rather than only a textual diff.
branch|A movable reference commonly pointing to the latest branch commit|New commits advance the checked out branch reference.
index|The staging area defining content for the next commit|Staged content may differ from both HEAD and the working tree.
HEAD|A reference identifying the current checkout|It usually points symbolically to the current branch.
merge|An operation integrating histories|Divergent histories may produce a commit with multiple parents.
rebase|An operation replaying commits onto another base|Replayed commits generally receive new identities.
fetch|An operation retrieving remote objects and updating remote tracking refs|It does not itself merge changes into the current branch.
pull|An operation fetching then integrating remote changes|Integration depends on configured merge or rebase behavior.
revert|An operation recording a new commit that undoes a change|It preserves earlier history rather than erasing the original commit.
.gitignore|Patterns excluding matching untracked paths from routine tracking|Ignoring a path does not remove an already tracked file.
`],
['docker','Docker','Frameworks & tools','Dk','https://docs.docker.com/reference/',`
image|A template of filesystem layers and execution configuration|A container is created from an image.
container|An isolated process environment instantiated from an image|It normally shares the host kernel rather than booting its own.
Dockerfile|Instructions for building a container image|Build steps produce a reusable image.
volume|Docker managed persistent storage mounted into containers|Its lifetime can outlast an individual container.
bind mount|A mount exposing a host path inside a container|Host path permissions and content affect what the container sees.
port publishing|Mapping a host network port to a container port|EXPOSE alone does not publish a host port.
build context|Files made available to an image build|COPY sources normally come from the context or a build stage.
layer cache|Reuse of matching previously built image layers|Changes to earlier inputs can invalidate downstream build steps.
multi stage build|A build using multiple FROM stages|Artifacts can be copied into a smaller final runtime stage.
.dockerignore|Patterns excluding paths from the build context|It reduces unnecessary context and helps avoid copying secrets.
`],
['compose','Docker Compose','Frameworks & tools','Dc','https://docs.docker.com/reference/compose-file/',`
service|A definition describing how to run application containers|A service can be instantiated as one or more containers.
compose.yaml|A YAML file declaring a multi container application|It describes services networks and volumes together.
depends_on|A declaration expressing dependencies between services|Short syntax orders startup but does not prove application readiness.
healthcheck|A command based check of container health|service_healthy dependencies wait for its successful health state.
named volume|A reusable volume declared for persistent application data|Removing a container does not inherently delete the volume.
default network|A network connecting services in one Compose project|Services can commonly resolve each other by service name.
ports|Host to container port mappings|The first number in a simple HOST:CONTAINER mapping is the host port.
environment|Values injected into a container process environment|They are distinct from build time arguments.
profile|A way of conditionally enabling selected services|It can keep optional tools out of the default application set.
up|A command creating and starting project services|It reconciles the declared configuration with existing containers.
`],
['rest','REST API','Frameworks & tools','API','https://www.rfc-editor.org/rfc/rfc9110.html',`
resource|An identifiable conceptual target addressed by a URI|A representation describes resource state.
GET|An HTTP method requesting a selected representation|Its defined semantics are safe and idempotent.
POST|An HTTP method asking a resource to process request content|It is not inherently idempotent.
PUT|An HTTP method creating or replacing target resource state|Its defined intent is idempotent.
DELETE|An HTTP method requesting removal of a target association|Repeated deletion has idempotent intent even if responses differ.
201 Created|A success status indicating creation of one or more resources|A Location header can identify the primary created resource.
204 No Content|A success status with no response content|A client must not expect a JSON response body.
404 Not Found|A status indicating no current representation was found or disclosed|It does not establish whether a resource ever existed.
statelessness|A constraint requiring requests to carry needed interaction context|It does not prohibit databases or stored resource state.
content negotiation|Selecting a representation using request preferences and server capabilities|Accept can express preferred response media types.
`],
['opencv','OpenCV','Frameworks & tools','Cv','https://docs.opencv.org/4.x/',`
BGR|The usual channel order of images read by cv2.imread|It differs from the RGB convention used by many display tools.
grayscale|An image with one intensity channel|Removing color channels changes array shape and available information.
threshold|A pixelwise operation comparing intensity to a cutoff|Binary thresholding maps each pixel to one of two values.
resize|An operation changing image dimensions|cv2.resize uses an explicit size in width height order.
Gaussian blur|A smoothing operation using Gaussian weighted neighborhoods|Smoothing can reduce high frequency noise.
Canny|An edge detector using gradients and hysteresis|Its two thresholds distinguish strong and connected weak edges.
contour|A curve describing a boundary in a binary image|findContours extracts boundary point sequences.
ROI|A region of interest selected from an image|NumPy slicing usually yields a view rather than an independent copy.
cvtColor|A function converting between color representations|The conversion code specifies source and destination conventions.
shape|An array attribute describing dimensions|A color image commonly has height width and channels dimensions.
`],
['numpy','NumPy','Frameworks & tools','Np','https://numpy.org/doc/stable/',`
ndarray|A multidimensional homogeneous array|A single dtype governs the array elements.
shape|A tuple of dimension lengths|The product of its entries gives the number of elements.
dtype|A description of array element representation|It determines numeric range and storage characteristics.
broadcasting|Rules aligning compatible dimensions for elementwise operations|Trailing dimensions must match or have length one.
axis|A dimension selected for an operation|Reducing an axis combines values along that dimension.
view|An array sharing an underlying data buffer|Changes through a writable view can affect its base.
copy|An array with independently copied element storage|Changing its numeric elements does not change the source.
reshape|An operation changing shape without changing element count|It can return a view when the layout permits.
boolean indexing|Selection by a boolean mask|Selected elements satisfy the mask rather than a contiguous slice rule.
vectorization|Expressing array operations through compiled array primitives|It often avoids a Python loop over individual elements.
`],
['sqlalchemy','SQLAlchemy','Frameworks & tools','Sa','https://docs.sqlalchemy.org/en/20/',`
Engine|A factory and pool interface for database connectivity|It is normally shared rather than created for every query.
Session|An ORM unit of work tracking object and transaction state|It coordinates persistence of mapped objects.
mapped class|A Python class associated with table metadata|ORM instances represent database related object state.
select|A construct describing a SELECT statement|Execution happens separately through a connection or session.
flush|An operation sending pending state changes into the current transaction|Flushing does not itself commit the transaction.
commit|An operation completing the current database transaction|It makes transactional changes durable subject to database guarantees.
rollback|An operation abandoning current transactional changes|It is needed to recover a session after many transaction errors.
identity map|A session mapping database identities to object instances|It avoids separate live instances for the same identity within a session.
lazy loading|Fetching relationship data when it is first accessed|Repeated access across many parents can cause an N plus one query pattern.
bound parameter|A value passed separately from SQL statement syntax|It avoids SQL injection through value interpolation.
`],
['mysql','MySQL','Data & engineering','My','https://dev.mysql.com/doc/refman/8.4/en/',`
InnoDB|A transactional MySQL storage engine|It supports transactions and foreign key enforcement.
AUTO_INCREMENT|A facility generating numeric identity values|Generated identifiers are not guaranteed to be gap free.
EXPLAIN|A statement describing a query execution plan|It helps inspect access paths and join strategy.
index|A data structure supporting selected access patterns|It can accelerate reads while adding write and storage costs.
foreign key|A constraint requiring references to valid related keys|Its actions govern allowed parent updates and deletes.
utf8mb4|A MySQL character set supporting full Unicode code points|It can represent characters requiring four UTF-8 bytes.
LIMIT|A clause bounding the number of returned rows|Predictable pagination also needs an appropriate ORDER BY.
GROUP BY|A clause collecting rows for grouped results|Aggregate functions summarize each group.
isolation level|Rules controlling visibility between concurrent transactions|Different levels permit different concurrency phenomena.
prepared statement|A statement separating SQL syntax from parameter values|It avoids constructing queries by concatenating untrusted data.
`],
['dynamodb','DynamoDB','Data & engineering','Dy','https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/',`
partition key|The primary key component determining item partition distribution|A simple primary key consists only of this component.
sort key|The second component of a composite primary key|It orders related items within one partition key value.
Query|An operation selecting items by one partition key value|It can add a sort key condition but is not a whole table scan.
Scan|An operation examining items across a table or index|It can consume capacity even when a filter discards results.
GSI|An index with its own partition key and optional sort key|Global secondary index reads are eventually consistent.
conditional write|A write applied only if a condition expression holds|It can enforce optimistic concurrency checks.
TTL|An expiry attribute supporting asynchronous item deletion|Expired items may remain visible until background deletion occurs.
item|A collection of named attributes representing one record|A table can store items with differing nonkey attributes.
FilterExpression|A predicate applied after items are read|It does not reduce the read capacity consumed by those examined items.
pagination|Continuing a read using its returned continuation key|LastEvaluatedKey indicates where the next request can resume.
`],
['matlab','MATLAB','Data & engineering','Mt','https://www.mathworks.com/help/matlab/',`
one based indexing|An indexing convention whose first ordinary index is one|A(1) accesses the first element.
matrix multiplication|The linear algebra product written with *|Inner dimensions must agree.
elementwise multiplication|Pairwise multiplication written with .*|Compatible arrays multiply corresponding elements.
colon operator|An operator constructing ranges or selecting dimensions|1:3 produces the values 1 2 3.
semicolon|A statement terminator suppressing command window display|It does not prevent the computation itself.
anonymous function|A function handle defined with @ and an expression|It can capture workspace values at creation.
preallocation|Reserving output array storage before iterative filling|It avoids repeatedly growing an array in a loop.
logical indexing|Selecting array elements using a logical mask|Only entries corresponding to true mask values are selected.
column major order|A storage and linear indexing order traversing columns first|A(:) lists entries down each column in turn.
size|A function returning array dimension lengths|It differs from numel which counts all elements.
`],
['simulink','Simulink','Data & engineering','Sl','https://www.mathworks.com/help/simulink/',`
block|A unit defining a computation or model behavior|Connected blocks form a signal processing or dynamic system model.
signal|A value carried between model blocks|Its type dimensions and sample timing affect compatibility.
Gain block|A block multiplying an input by a specified gain|Its multiplication mode determines scalar or matrix behavior.
Sum block|A block adding or subtracting configured input signals|The sign list determines each input contribution.
Unit Delay|A discrete block delaying a signal by one sample step|An initial condition defines its first output.
Integrator|A block integrating a continuous input over time|Its initial condition establishes the initial state.
sample time|The timing specification for a block execution or signal update|Mixed rates require deliberate rate handling.
solver|A numerical method advancing a model simulation|Its selection depends on continuous and discrete model behavior.
subsystem|A grouping of blocks with an external interface|It organizes model hierarchy and reusable behavior.
algebraic loop|A closed dependency of direct feedthrough computations|It can require solving simultaneous equations at a simulation step.
`],
['wireshark','Wireshark','Data & engineering','Ws','https://www.wireshark.org/docs/wsug_html_chunked/',`
capture filter|A filter limiting which packets are captured|Its syntax differs from display filter syntax.
display filter|A filter choosing which captured packets are shown|Hidden packets remain in the capture file.
tcp.port|A display field matching a TCP source or destination port|tcp.port == 443 can match either endpoint port.
ip.addr|A display field matching an IPv4 source or destination address|It can select traffic involving a given host.
Follow TCP Stream|A feature reconstructing bytes of a TCP conversation|Encrypted application bytes are not automatically plaintext.
DNS|A protocol commonly mapping names to address information|Its queries and responses can be inspected when visible in a capture.
TLS|A protocol protecting application traffic using encryption and authentication|A capture alone normally does not reveal protected plaintext.
pcapng|A capture file format supporting metadata and multiple interfaces|It stores captured packets for later analysis.
TCP retransmission|A sender transmitting previously sent sequence space again|It can follow loss or reordering and is not proof of an attack.
promiscuous mode|An interface mode accepting more link layer frames for capture|It does not guarantee visibility of all traffic on a switched network.
`],
['openssl','OpenSSL','Data & engineering','Os','https://docs.openssl.org/3.0/man1/',`
digest|An output of a cryptographic hash function|Fixed-output hashes have a specified digest length; extendable-output functions such as SHAKE are an exception. Hashing is not reversible encryption.
private key|Secret key material used in asymmetric cryptographic operations|It must be protected from disclosure.
public key|Key material that can be shared to verify signatures or encrypt in suitable schemes|It does not allow deriving the private key in secure schemes.
certificate|A signed binding of identity information to a public key|Trust depends on validation rather than merely possessing a certificate.
CSR|A signed request containing a public key and requested identity information|A certificate authority can use it when issuing a certificate.
PEM|A textual encoding wrapping base64 data in labeled boundaries|The label identifies the encoded object type.
DER|A binary encoding form used for ASN.1 structures|It differs from the textual PEM wrapper.
s_client|A diagnostic command establishing a TLS client connection|Its output can help inspect server certificates and handshake details.
certificate chain|A sequence linking a leaf certificate toward a trusted issuer|Validation also considers names validity and relevant constraints.
random bytes|Unpredictable data produced by a suitable random generator|Security tokens need cryptographic randomness rather than predictable counters.
`],
['cad','CAD','Design & hardware','Cd','https://help.autodesk.com/view/INVNTOR/2025/ENU/',`
parametric modeling|Defining geometry through parameters and relationships|Changing a parameter can regenerate dependent geometry.
geometric constraint|A relation such as coincidence parallelism or tangency|It limits allowed geometric configurations.
dimensional constraint|A relation fixing a geometric measurement|A driving dimension changes geometry when edited.
degree of freedom|An independent permitted motion or geometric variation|Sufficient independent constraints remove unwanted freedom.
extrude|A feature extending a profile along a direction|A valid profile and extent define the resulting shape.
revolve|A feature sweeping a profile around an axis|The angle controls how far the sweep turns.
fillet|A feature rounding an edge or corner|Its radius must be feasible for the surrounding geometry.
chamfer|A feature replacing an edge with a beveled face|It differs from a curved fillet.
assembly|A model combining positioned component instances|Relationships constrain how those components fit or move.
STEP|A neutral format commonly used to exchange product geometry|Exchanging geometry need not preserve the full native feature history.
`],
['inventor','Autodesk Inventor','Design & hardware','Ai','https://help.autodesk.com/view/INVNTOR/2025/ENU/',`
part document|A document defining an individual modeled component|Native Inventor part files commonly use the ipt extension.
assembly document|A document organizing component occurrences and relationships|Native assembly files commonly use the iam extension.
sketch|A planar or spatial profile defined with geometry and constraints|A fully constrained sketch has no intended remaining freedom.
feature|A parametric modeling operation in the part history|Later features can depend on geometry made by earlier features.
user parameter|A named value available to model expressions|Changing it can drive multiple dependent dimensions.
iLogic|A rule system automating Inventor model behavior|Rules can drive parameters and configuration logic.
occurrence|An instance of a component placed in an assembly|Several occurrences may reference one source document.
joint|An assembly relation specifying connection and allowed motion|Its type determines the remaining motion freedoms.
BOM|A structured bill of materials for an assembly|It organizes component quantities and relevant properties.
adaptive geometry|Geometry that can respond to related assembly context|Dependencies must be managed to keep updates predictable.
`],
['cfd','Autodesk CFD','Design & hardware','Cf','https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/How-to-validate-convergence-in-Simulation-CFD.html',`
mesh|A discretization of a fluid or solid domain into computational elements|Resolution influences numerical accuracy and computational cost.
boundary condition|A prescribed behavior at a domain boundary|Inlet outlet and wall choices define the simulated problem.
no slip wall|A boundary condition matching fluid velocity to wall velocity|A stationary no slip wall has zero fluid velocity at the wall.
continuity|Conservation of mass in a flow model|Steady incompressible volume flow balances across boundaries.
pressure drop|A pressure difference between selected locations|It must be interpreted with specified reference and measurement locations.
turbulence model|An approximation representing effects of unresolved turbulent motion|Its assumptions affect which flows it represents well.
residual|A measure of imbalance in the discretized equations|Small residuals alone do not prove an accurate physical solution.
mesh independence|A check of result sensitivity to further mesh refinement|Stable quantities of interest support a discretization assessment.
transient simulation|A simulation resolving time dependent evolution|Time step sensitivity matters alongside spatial mesh sensitivity.
convergence|Approach toward a stable numerical solution under chosen criteria|Mass balance and engineering outputs should be checked as well as residuals.
`],
['arduino','Arduino','Design & hardware','Ar','https://docs.arduino.cc/language-reference/',`
setup|A function run once after board startup or reset|It normally configures pins and initializes peripherals.
loop|A function called repeatedly after setup finishes|It contains ongoing program behavior.
pinMode|A function selecting a digital pin input or output mode|A pin must be configured appropriately for its use.
digitalWrite|A function setting a digital output level|It selects HIGH or LOW rather than an arbitrary analog voltage.
digitalRead|A function reading a digital logic level|It returns HIGH or LOW according to the input threshold behavior.
analogRead|A function sampling an analog input through the ADC|The numeric range depends on board and resolution settings.
analogWrite|A function commonly producing PWM on supported pins|It is not a universal guarantee of a true analog voltage output.
millis|A function reporting elapsed milliseconds as an unsigned value|Unsigned subtraction supports rollover safe interval checks.
delay|A function pausing ordinary sketch execution for a duration|It makes simple timing easy but prevents other ordinary loop work meanwhile.
Serial|An interface for serial communication|begin configures the communication rate where applicable.
`]
];
export const topics = raw.map(([id,name,category,icon,source,text]) => ({id,name,category,icon,source,concepts:text.trim().split('\n').map(line=>{const [term,definition,...explanation]=line.split('|');return {term,definition,why:explanation.join('|')};})}));
export const levels=['Easy','Medium','Hard','Very hard'];
export const types=['theory','logic','output','complete','create'];
