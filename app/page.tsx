
"use client";

import { useState } from "react";

const examples = {
  "REST assertions": {
    language: "typescript",
    code: `// Example API test definition
const test = {
  name: "Retrieve customer profile",
  request: {
    method: "GET",
    path: "/v1/customers/{customerId}",
    headers: {
      Authorization: "Bearer {{API_TOKEN}}",
      Accept: "application/json"
    }
  },
  assertions: [
    { type: "status", expected: 200 },
    { type: "header", name: "content-type",
      contains: "application/json" },
    { type: "jsonpath", path: "$.id",
      exists: true },
    { type: "jsonpath", path: "$.email",
      type: "string" },
    { type: "responseTime", maxMs: 400 }
  ]
};`,
  },
  "OpenAPI contract": {
    language: "yaml",
    code: `openapi: 3.1.0
info:
  title: Customer API
  version: 1.4.0
paths:
  /v1/customers/{customerId}:
    get:
      operationId: getCustomer
      parameters:
        - name: customerId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Customer found
          content:
            application/json:
              schema:
                type: object
                required:
                  - id
                  - email
                properties:
                  id:
                    type: string
                  email:
                    type: string
                    format: email`,
  },
  "CI pipeline": {
    language: "yaml",
    code: `# Illustrative pipeline integration
name: API Quality Gate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  api-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install test CLI
        run: npm install -g @raavvi/cli
      - name: Run release checks
        env:
          RAAVVI_TOKEN: \${{ secrets.RAAVVI_TOKEN }}
        run: |
          raavvi run \\
            --project payments-api \\
            --environment staging \\
            --fail-on-critical`,
  },
};

const scenarios = [
  {
    name: "Customer profile",
    method: "GET",
    path: "/v1/customers/cus_8472",
    status: "200 OK",
    time: "142 ms",
    result: "PASS",
    detail: "Response matches the expected profile contract.",
    checks: [
      ["HTTP status", "Expected 200", "PASS"],
      ["Content-Type", "application/json", "PASS"],
      ["$.id", "Required string exists", "PASS"],
      ["$.email", "Valid string format", "PASS"],
      ["Response time", "Limit: 400 ms", "PASS"],
    ],
  },
  {
    name: "Create payment",
    method: "POST",
    path: "/v1/payments",
    status: "201 Created",
    time: "218 ms",
    result: "PASS",
    detail: "Payment creation returned the expected response.",
    checks: [
      ["HTTP status", "Expected 201", "PASS"],
      ["Content-Type", "application/json", "PASS"],
      ["$.paymentId", "Required field exists", "PASS"],
      ["$.currency", "Matches expected value", "PASS"],
      ["Response time", "Limit: 400 ms", "PASS"],
    ],
  },
  {
    name: "List invoices",
    method: "GET",
    path: "/v1/invoices",
    status: "200 OK",
    time: "503 ms",
    result: "FAIL",
    detail: "The example response exceeded the configured latency threshold.",
    checks: [
      ["HTTP status", "Expected 200", "PASS"],
      ["Content-Type", "application/json", "PASS"],
      ["$.items", "Expected array", "PASS"],
      ["$.nextCursor", "Unexpected null value", "FAIL"],
      ["Response time", "Limit: 400 ms", "FAIL"],
    ],
  },
  {
    name: "Update profile",
    method: "PATCH",
    path: "/v1/customers/cus_8472",
    status: "200 OK",
    time: "96 ms",
    result: "PASS",
    detail: "The example profile update satisfies its checks.",
    checks: [
      ["HTTP status", "Expected 200", "PASS"],
      ["Content-Type", "application/json", "PASS"],
      ["$.updatedAt", "Timestamp exists", "PASS"],
      ["Response time", "Limit: 400 ms", "PASS"],
    ],
  },
];

const capabilities = [
  {
    group: "HTTP protocol",
    items: [
      ["Request methods", "GET, POST, PUT, PATCH, DELETE and other HTTP methods"],
      ["Headers", "Expected, required, absent, and value-based header checks"],
      ["Status codes", "Exact status expectations and error-response validation"],
      ["Request configuration", "Parameters, headers, payloads, and environment variables"],
    ],
  },
  {
    group: "Response validation",
    items: [
      ["JSONPath assertions", "Existence, equality, type, and value checks"],
      ["Required properties", "Detect missing fields and unexpected response structures"],
      ["Schema validation", "Validate payloads against supported JSON Schema rules"],
      ["Content negotiation", "Check content types and expected response formats"],
    ],
  },
  {
    group: "Quality engineering",
    items: [
      ["Latency thresholds", "Flag responses that exceed configured time budgets"],
      ["Regression comparison", "Compare test outcomes with a previous reference run"],
      ["Release policies", "Apply severity-aware criteria to release readiness"],
      ["Run diagnostics", "Separate assertion failures from transport and execution errors"],
    ],
  },
];

const faqs = [
  {
    category: "Testing",
    q: "How is an API test defined?",
    a: "A test combines an HTTP request definition with explicit assertions. Assertions can cover status codes, headers, response content, JSONPath expressions, schema requirements, and latency limits. The exact supported definition format and execution behavior must match the shipped test engine.",
  },
  {
    category: "Testing",
    q: "What is the difference between an assertion failure and a transport error?",
    a: "An assertion failure means the request returned a response but one or more expectations were not satisfied. A transport error means the request could not complete normally, for example because of a connection timeout or DNS failure. A robust release policy should report these separately.",
  },
  {
    category: "Contracts",
    q: "How does contract validation help?",
    a: "An OpenAPI contract documents expected operations, parameters, request bodies, response codes, and response schemas. Comparing observed responses against that contract can identify missing required properties, incompatible types, and other structural differences.",
  },
  {
    category: "Contracts",
    q: "Does schema validation replace functional testing?",
    a: "No. Schema validation checks structure and data constraints. It cannot establish that a payment was calculated correctly, that authorization rules are correct, or that a business workflow behaves as intended. Those require explicit behavioral assertions and appropriate test data.",
  },
  {
    category: "CI/CD",
    q: "How should a release quality gate behave?",
    a: "A gate evaluates a completed run against explicit policy. Teams can decide which failures block promotion, which are warnings, and how incomplete or inconclusive runs are handled. A failed run should remain distinguishable from a run that could not be completed.",
  },
  {
    category: "CI/CD",
    q: "Can API tests run on pull requests?",
    a: "A CI integration can execute selected suites against an appropriate test environment and use the runner's exit status to determine whether a workflow proceeds. The CLI, authentication method, flags, and supported pipeline providers must be verified against the actual release of Raavvi.",
  },
  {
    category: "Security",
    q: "How should API secrets be managed?",
    a: "Production deployments should use a managed secret store or an equivalent secure mechanism, apply least-privilege access, redact sensitive values from logs, and scope credentials to the intended environment. Never commit live API tokens to a repository or embed them in frontend code.",
  },
  {
    category: "Security",
    q: "How can an API testing service reduce SSRF risk?",
    a: "A hosted runner must treat target URLs as untrusted input. Defenses should include blocking loopback, private, link-local, and cloud metadata destinations; resolving and revalidating DNS; controlling redirects; and enforcing outbound network restrictions at the infrastructure layer.",
  },
  {
    category: "Architecture",
    q: "What happens when a test run is queued?",
    a: "In an asynchronous architecture, the API records a run request, places work on a queue, and a worker executes the suite. Run state and structured results are persisted for the UI and report generator. Retries, cancellation, timeouts, and idempotency require explicit design.",
  },
  {
    category: "Architecture",
    q: "How should results be made auditable?",
    a: "Store the run identifier, suite and environment references, policy version, execution timestamps, individual assertion outcomes, and relevant response metadata. Redact secrets and sensitive payloads. Reports should distinguish actual observations from derived comparisons.",
  },
];

const architecture = [
  ["01", "Web console", "Projects, suites, environments, run history, and reports."],
  ["02", "Control API", "Authentication, authorization, validation, and run orchestration."],
  ["03", "Queue", "Dispatch work with controlled concurrency and bounded retries."],
  ["04", "Isolated workers", "Execute requests with timeouts, egress controls, and resource limits."],
  ["05", "Data and artifacts", "Persist run metadata, assertion results, and generated reports."],
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 font-mono text-[10px] text-slate-400">
      {children}
    </span>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("REST assertions");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(0);

  const activeExample = examples[activeTab as keyof typeof examples];
  const run = scenarios[selectedScenario];
  const categories = ["All", ...Array.from(new Set(faqs.map((f) => f.category)))];
  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = faqCategory === "All" || faq.category === faqCategory;
    const query = faqSearch.toLowerCase();
    return matchesCategory && `${faq.q} ${faq.a} ${faq.category}`.toLowerCase().includes(query);
  });

  async function copyExample() {
    try {
      await navigator.clipboard.writeText(activeExample.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080b13] text-slate-100 selection:bg-cyan-300/30">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080b13]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8">
          <a href="#home" aria-label="Raavvi home" className="flex shrink-0 items-center gap-3">
            <img
              src="/raavvi-logo-header.png"
              alt="Raavvi — API quality engineering"
              className="h-10 w-[190px] object-contain object-left sm:h-11 sm:w-[210px]"
            />
            <span className="hidden border-l border-white/10 pl-3 text-[10px] uppercase tracking-widest text-slate-500 xl:block">API quality platform</span>
          </a>
          <nav className="hidden items-center gap-6 text-xs text-slate-400 lg:flex">
            <a href="#workbench" className="hover:text-white">Workbench</a>
            <a href="#capabilities" className="hover:text-white">Capabilities</a>
            <a href="#integrations" className="hover:text-white">Integrations</a>
            <a href="#architecture" className="hover:text-white">Architecture</a>
            <a href="#security" className="hover:text-white">Security</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <a href="#contact" className="hidden rounded-lg bg-cyan-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 sm:inline-flex">Technical evaluation ↗</a>
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-white/10 px-3 py-2 text-sm lg:hidden" aria-expanded={menuOpen}>{menuOpen ? "Close" : "Menu"}</button>
        </div>
        {menuOpen && <nav className="grid grid-cols-2 gap-4 border-t border-white/10 px-6 py-5 text-sm text-slate-300 lg:hidden">{[["Workbench", "#workbench"], ["Capabilities", "#capabilities"], ["Integrations", "#integrations"], ["Architecture", "#architecture"], ["Security", "#security"], ["FAQ", "#faq"], ["Contact", "#contact"]].map(([name, href]) => <a key={name} href={href} onClick={() => setMenuOpen(false)}>{name}</a>)}</nav>}
      </header>

      <div className="border-b border-white/[0.06] bg-[#0b101b]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 font-mono text-[10px] text-slate-500 sm:px-8">
          <span className="text-cyan-300">RAAVVI / PLATFORM</span>
          <span>API REGRESSION</span><span>CONTRACT VALIDATION</span><span>QUALITY GATES</span><span className="ml-auto">ENGINEERING OVERVIEW</span>
        </div>
      </div>

      <section id="home" className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-5 py-20 sm:px-8 md:grid-cols-[1fr_0.9fr] md:py-28">
        <div className="pointer-events-none absolute -left-48 top-0 h-96 w-96 rounded-full bg-cyan-500/[0.09] blur-[120px]" />
        <div className="relative">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.05] px-3 py-1.5 font-mono text-[10px] tracking-wide text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />API QUALITY ENGINEERING</div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.06em] sm:text-6xl lg:text-[76px]">Your API contract is a promise.<span className="mt-2 block bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-400 bg-clip-text text-transparent">Make every release prove it.</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">A rigorous approach to API regression testing, response validation, contract compliance, and release policy enforcement—designed for teams that need more than a basic uptime check.</p>
          <div className="mt-9 flex flex-wrap gap-3"><a href="#workbench" className="rounded-lg bg-cyan-300 px-5 py-3.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">Explore the test workbench ↘</a><a href="#integrations" className="rounded-lg border border-white/15 px-5 py-3.5 text-sm font-medium hover:border-white/30">Inspect integration examples</a></div>
          <div className="mt-9 flex flex-wrap gap-2"><Badge>HTTP assertions</Badge><Badge>JSON Schema</Badge><Badge>OpenAPI</Badge><Badge>Latency budgets</Badge><Badge>Release policies</Badge></div>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 rounded-3xl bg-gradient-to-br from-cyan-500/[0.12] to-violet-500/[0.12] blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1320] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300" /><span className="font-mono text-xs text-slate-300">release-evaluation / run #2841</span></div><Badge>SAMPLE DATA</Badge></div>
            <div className="grid grid-cols-3 gap-2 p-4 sm:gap-3 sm:p-5">
              {[["TESTS", "128", "suite total"], ["PASSED", "124", "example"], ["FAILED", "4", "example"]].map(([label, value, sub], i) => <div key={label} className={`rounded-lg border p-3 ${i === 1 ? "border-emerald-400/20 bg-emerald-400/[0.04]" : i === 2 ? "border-rose-400/20 bg-rose-400/[0.04]" : "border-white/[0.07] bg-white/[0.02]"}`}><p className="font-mono text-[9px] tracking-wider text-slate-500">{label}</p><p className={`mt-2 text-2xl font-semibold ${i === 1 ? "text-emerald-300" : i === 2 ? "text-rose-300" : "text-white"}`}>{value}</p><p className="mt-1 text-[10px] text-slate-600">{sub}</p></div>)}
            </div>
            <div className="px-4 pb-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium">Endpoint results</span><span className="font-mono text-[10px] text-slate-500">4 SELECTED</span></div>
              <div className="space-y-2">
                {scenarios.map((s, i) => (
                  <button
                    key={`${s.method}-${s.path}`}
                    onClick={() => setSelectedScenario(i)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedScenario === i
                        ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                        : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-cyan-300">{s.method}</span>
                      <span className="truncate font-mono text-xs text-slate-300">{s.path}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">{s.name}</span>
                      <span className="text-[10px] text-slate-400">{s.status}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-white/[0.07] bg-[#080c14] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-[10px] text-slate-400">SELECTED ASSERTIONS / {run.name.toUpperCase()}</span><span className={`font-mono text-[10px] ${run.result === "PASS" ? "text-emerald-300" : "text-rose-300"}`}>{run.status} · {run.time}</span></div>
                <p className="mt-3 text-xs leading-5 text-slate-400">{run.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">{run.checks.slice(0, 3).map(([label, , status]) => <Badge key={label}>{status === "PASS" ? "✓" : "×"} {label}</Badge>)}</div>
              </div>
            </div>
            <div className="border-t border-white/[0.07] px-5 py-3 font-mono text-[9px] text-slate-600">Illustrative console · No live API execution · Select an endpoint to inspect</div>
          </div>
        </div>
      </section>

      <section id="workbench" className="border-y border-white/[0.07] bg-[#0b101b]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-3xl"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">01 / Interactive workbench</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Inspect the test definition.<br />Understand the failure.</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400">Move beyond feature claims. Explore example assertions, a real OpenAPI-style contract, and a CI workflow. These snippets illustrate the intended integration model; verify syntax against the shipped product before using them.</p></div><Badge>CODE EXPLORER / SAMPLE</Badge></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#080c14]">
              <div className="flex flex-wrap gap-1 border-b border-white/[0.08] p-2">{Object.keys(examples).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-3 py-2 text-xs transition ${activeTab === tab ? "bg-cyan-300/10 text-cyan-200" : "text-slate-500 hover:text-white"}`}>{tab}</button>)}</div>
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-400" /><span className="font-mono text-[10px] text-slate-400">example.{activeExample.language === "yaml" ? "yaml" : "ts"}</span></div><button onClick={copyExample} className="rounded-md border border-white/10 px-3 py-1.5 text-[10px] text-slate-300 hover:bg-white/5">{copied ? "Copied ✓" : "Copy code"}</button></div>
              <pre className="max-h-[470px] overflow-auto p-5 text-[11px] leading-6 text-cyan-100 sm:text-xs"><code>{activeExample.code}</code></pre>
              <div className="border-t border-white/[0.06] px-4 py-3 text-[10px] leading-5 text-slate-600">Example configuration only. Secrets must be injected securely at runtime.</div>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0e1421]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><span className="text-xs font-semibold">Assertion inspector</span><Badge>{run.result === "PASS" ? "PASSING EXAMPLE" : "FAILING EXAMPLE"}</Badge></div>
              <div className="border-b border-white/[0.06] p-5"><p className="font-mono text-[10px] text-slate-500">REQUEST</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded bg-cyan-300/10 px-2 py-1 font-mono text-[10px] text-cyan-200">{run.method}</span><code className="break-all text-xs text-slate-200">{run.path}</code></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg border border-white/[0.06] p-3"><p className="text-[10px] text-slate-500">Observed status</p><p className="mt-1 font-mono text-sm">{run.status}</p></div><div className="rounded-lg border border-white/[0.06] p-3"><p className="text-[10px] text-slate-500">Observed duration</p><p className={`mt-1 font-mono text-sm ${run.result === "FAIL" ? "text-rose-300" : "text-emerald-300"}`}>{run.time}</p></div></div></div>
              <div className="p-5"><div className="mb-3 grid grid-cols-[1fr_auto] gap-3 text-[10px] uppercase tracking-wider text-slate-500"><span>Assertion / expectation</span><span>Result</span></div><div className="space-y-2">{run.checks.map(([label, expectation, status]) => <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-3"><div><p className="text-xs font-medium text-slate-200">{label}</p><p className="mt-1 text-[10px] text-slate-500">{expectation}</p></div><span className={`font-mono text-[10px] ${status === "PASS" ? "text-emerald-300" : "text-rose-300"}`}>{status === "PASS" ? "PASS ✓" : "FAIL ×"}</span></div>)}</div>{run.result === "FAIL" && <div className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.04] p-4"><p className="text-xs font-semibold text-rose-200">Failure diagnostics</p><p className="mt-2 text-xs leading-6 text-slate-400">Inspect the response body, confirm whether the cursor is contractually nullable, and investigate the latency budget. A missing value and a slow response are separate failure conditions.</p></div>}</div>
              <div className="border-t border-white/[0.06] px-5 py-3 text-[10px] text-slate-600">Sample observations are hardcoded for demonstration; no request was sent.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28">
        <div className="max-w-3xl"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">02 / Capability matrix</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">A quality model engineers can reason about.</h2><p className="mt-5 text-sm leading-7 text-slate-400">Organize API quality around explicit, testable expectations—not vague status indicators. The following matrix defines the intended capability scope for the product.</p></div>
        <div className="mt-10 space-y-5">{capabilities.map((group) => <div key={group.group} className="overflow-hidden rounded-xl border border-white/[0.08]"><div className="border-b border-white/[0.07] bg-white/[0.025] px-5 py-4"><h3 className="text-sm font-semibold">{group.group}</h3></div><div className="divide-y divide-white/[0.06]">{group.items.map(([title, detail], i) => <div key={title} className="grid gap-2 px-5 py-4 sm:grid-cols-[230px_1fr_auto] sm:items-center"><div className="flex items-center gap-3"><span className="font-mono text-[10px] text-slate-600">{String(i + 1).padStart(2, "0")}</span><span className="text-xs font-medium text-slate-200">{title}</span></div><p className="text-xs leading-6 text-slate-500">{detail}</p><span className="hidden font-mono text-[9px] text-cyan-300/70 sm:block">SPECIFIED SCOPE</span></div>)}</div></div>)}</div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">{[["Assertion semantics", "Define expected behavior, comparison rules, and failure messages."], ["Run semantics", "Represent success, failure, execution errors, and inconclusive outcomes distinctly."], ["Policy semantics", "Determine which completed results can pass a release gate."]].map(([title, text]) => <div key={title} className="rounded-xl border border-white/[0.08] bg-[#0c111c] p-5"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-3 text-xs leading-6 text-slate-500">{text}</p></div>)}</div>
      </section>

      <section id="integrations" className="border-y border-white/[0.07] bg-[#0b101b]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 md:grid-cols-2 md:py-28">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">03 / Delivery integration</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Move API validation into CI/CD.</h2><p className="mt-5 text-sm leading-7 text-slate-400">A test suite becomes part of engineering discipline when it can run consistently, report actionable failures, and inform an automated release decision.</p>
            <div className="mt-8 space-y-5">{[["Pull request validation", "Run a targeted suite against a disposable or shared test environment."], ["Promotion gates", "Evaluate policy before promoting an artifact or deployment."], ["Repeatable evidence", "Retain run identifiers, assertion outcomes, and relevant diagnostics."]].map(([title, text]) => <div key={title} className="flex gap-3"><span className="mt-0.5 text-violet-300">↗</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-6 text-slate-500">{text}</p></div></div>)}</div>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#080c14]"><div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><span className="font-mono text-xs text-slate-300">quality-gate.yml</span><Badge>ILLUSTRATIVE</Badge></div><pre className="overflow-auto p-5 text-xs leading-6 text-violet-100"><code>{`pull_request:
  branches: [main]

jobs:
  api-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Prepare API environment
        run: ./scripts/start-test-api.sh

      - name: Run API regression suite
        env:
          API_TOKEN: \${{ secrets.API_TOKEN }}
        run: npm run api:test

      - name: Publish test evidence
        if: always()
        run: npm run api:report`}</code></pre><div className="border-t border-white/[0.06] px-5 py-4"><p className="text-xs font-medium text-slate-300">Pipeline design considerations</p><div className="mt-3 flex flex-wrap gap-2"><Badge>Non-zero exit on blocking failure</Badge><Badge>Secret masking</Badge><Badge>Bounded timeout</Badge><Badge>Artifacts on failure</Badge></div><p className="mt-3 text-[10px] leading-5 text-slate-600">Generic CI example, not a verified Raavvi CLI invocation.</p></div></div>
        </div>
      </section>

      <section id="architecture" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28">
        <div className="max-w-3xl"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">04 / Reference architecture</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Separate control, execution, and evidence.</h2><p className="mt-5 text-sm leading-7 text-slate-400">An asynchronous architecture can isolate API test execution from the web experience, scale worker capacity independently, and preserve a durable history of test outcomes.</p></div>
        <div className="mt-12 grid gap-3 md:grid-cols-5">{architecture.map(([n, title, text], i) => <div key={title} className="relative rounded-xl border border-white/[0.09] bg-[#0c111c] p-5">{i < architecture.length - 1 && <span className="absolute -right-3 top-8 z-10 hidden text-cyan-300 md:block">→</span>}<span className="font-mono text-xs text-cyan-300">{n}</span><h3 className="mt-5 text-sm font-semibold">{title}</h3><p className="mt-3 text-xs leading-6 text-slate-500">{text}</p></div>)}</div>
        <div className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-white/[0.08] p-5"><p className="font-mono text-[10px] text-violet-300">CONTROL PLANE</p><p className="mt-3 text-sm font-semibold">Identity, tenancy, policy, orchestration</p><p className="mt-2 text-xs leading-6 text-slate-500">Authorization checks, project boundaries, run creation, policy versioning, audit events, and API rate limits.</p></div><div className="rounded-xl border border-white/[0.08] p-5"><p className="font-mono text-[10px] text-cyan-300">EXECUTION PLANE</p><p className="mt-3 text-sm font-semibold">Isolated workers and controlled egress</p><p className="mt-2 text-xs leading-6 text-slate-500">Request timeouts, concurrency limits, resource budgets, safe target validation, secret injection, and structured results.</p></div></div>
      </section>

      <section id="security" className="border-y border-white/[0.07] bg-[#0b101b]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28">
          <div className="max-w-3xl"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">05 / Security engineering</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Security must be part of the execution model.</h2><p className="mt-5 text-sm leading-7 text-slate-400">An API testing service can send authenticated requests to customer systems. That makes credential handling, tenant isolation, and outbound network controls fundamental design requirements.</p></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["Secret lifecycle", "Managed storage, restricted retrieval, rotation support, and redaction."], ["Tenant boundaries", "Server-side authorization and organization-scoped data access."], ["SSRF mitigation", "Private-address blocking, DNS revalidation, redirect checks, and egress restrictions."], ["Worker isolation", "Bounded runtime, CPU and memory limits, execution timeouts, and restricted permissions."], ["Data minimization", "Configurable payload retention, sensitive-field redaction, and careful report handling."], ["Auditability", "Traceable run IDs, policy versions, actor identity, and administrative events."]].map(([title, text]) => <div key={title} className="rounded-xl border border-white/[0.08] bg-[#0d1320] p-5"><div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-300">✓</div><h3 className="mt-5 text-sm font-semibold">{title}</h3><p className="mt-3 text-xs leading-6 text-slate-500">{text}</p></div>)}</div>
          <p className="mt-5 text-[10px] leading-5 text-slate-600">These are security requirements and design goals, not a claim of certification or verification. Production controls must be implemented and independently tested.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28">
        <div className="grid gap-10 lg:grid-cols-2">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">06 / Release semantics</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A failed test isn't the same as a failed execution.</h2><p className="mt-5 text-sm leading-7 text-slate-400">Quality gates should preserve the difference between what the API did and whether the test runner could obtain reliable evidence.</p></div>
          <div className="space-y-3">{[["PASS", "All blocking assertions satisfy the active policy.", "text-emerald-300"], ["FAIL", "At least one blocking assertion is not satisfied.", "text-rose-300"], ["ERROR", "Execution failed due to transport, setup, or runner problems.", "text-amber-300"], ["INCONCLUSIVE", "The available evidence is insufficient for a reliable decision.", "text-violet-300"]].map(([status, text, color]) => <div key={status} className="grid grid-cols-[110px_1fr] gap-4 rounded-lg border border-white/[0.07] p-4"><span className={`font-mono text-xs ${color}`}>{status}</span><p className="text-xs leading-6 text-slate-400">{text}</p></div>)}</div>
        </div>
      </section>

      <section id="faq" className="border-y border-white/[0.07] bg-[#0b101b]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 md:grid-cols-[0.75fr_1.25fr] md:py-28">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">07 / Technical FAQ</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Questions engineers actually ask.</h2><p className="mt-5 text-sm leading-7 text-slate-400">Explore testing semantics, API contracts, pipeline behavior, architecture, and security design.</p><div className="mt-7"><label htmlFor="faq-search" className="text-xs text-slate-400">Search documentation topics</label><input id="faq-search" value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)} placeholder="Try: schema, SSRF, pipeline..." className="mt-2 w-full rounded-lg border border-white/10 bg-[#080c14] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" /></div><div className="mt-4 flex flex-wrap gap-2">{categories.map((cat) => <button key={cat} onClick={() => { setFaqCategory(cat); setOpenFaq(null); }} className={`rounded-md border px-3 py-2 text-[10px] transition ${faqCategory === cat ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-500 hover:text-white"}`}>{cat}</button>)}</div><p className="mt-4 font-mono text-[10px] text-slate-600">{filteredFaqs.length} TOPICS</p></div>
          <div className="divide-y divide-white/[0.08]">{filteredFaqs.length === 0 && <p className="py-8 text-sm text-slate-500">No matching questions. Try another term or category.</p>}{filteredFaqs.map((faq) => { const index = faqs.indexOf(faq); const isOpen = openFaq === index; return <div key={faq.q} className="py-5"><button className="flex w-full items-start justify-between gap-5 text-left" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : index)}><span><span className="mb-2 block font-mono text-[9px] uppercase tracking-wider text-cyan-300/70">{faq.category}</span><span className="text-sm font-medium leading-6 sm:text-base">{faq.q}</span></span><span className="mt-1 shrink-0 text-lg text-cyan-300">{isOpen ? "−" : "+"}</span></button>{isOpen && <p className="max-w-2xl pr-8 pt-4 text-xs leading-7 text-slate-400 sm:text-sm">{faq.a}</p>}</div>; })}</div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.07] via-[#0d1320] to-violet-500/[0.08] p-7 sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-[90px]" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">08 / Next step</p><h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Bring your API quality requirements to the table.</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400">Discuss contract coverage, regression strategy, release criteria, CI integration, and the operational controls your team needs.</p></div><a href="mailto:hello@raavvi.com?subject=Raavvi%20technical%20evaluation" className="inline-flex w-fit items-center rounded-lg bg-cyan-300 px-5 py-3.5 text-sm font-bold text-slate-950 hover:bg-cyan-200">Contact the Raavvi team ↗</a></div>
        </div>
      </section>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between"><a href="#home" aria-label="Raavvi home" className="inline-flex items-center"><img src="/raavvi-logo-header.png" alt="Raavvi" className="h-9 w-[170px] object-contain object-left" /></a><p className="text-xs text-slate-500">API quality engineering for confident releases.</p><div className="flex flex-wrap gap-5 text-xs text-slate-500"><a href="#capabilities" className="hover:text-white">Capabilities</a><a href="#integrations" className="hover:text-white">Integrations</a><a href="#security" className="hover:text-white">Security</a><a href="#faq" className="hover:text-white">FAQ</a></div></div>
        <div className="border-t border-white/[0.05] px-5 py-4 text-center text-[10px] leading-5 text-slate-600">© 2026 Raavvi. All rights reserved. Code samples, endpoint results, and architecture are illustrative until verified against the production implementation.</div>
      </footer>
    </main>
  );
}
