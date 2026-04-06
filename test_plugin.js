#!/usr/bin/env node
// ============================================================================
//  noctalia-calculator — Rigorous Plugin Test Suite
//  Tests: AdvancedMath.js, Main.qml logic, i18n, manifest, QML structure
// ============================================================================

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

// ── tiny test harness ───────────────────────────────────────────────────────
let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];
const sectionStats = {};
let currentSection = "";

function section(name) {
  currentSection = name;
  sectionStats[name] = { total: 0, passed: 0, failed: 0 };
  console.log(`\n━━━ ${name} ━━━`);
}

function assert(description, condition) {
  totalTests++;
  sectionStats[currentSection].total++;
  if (condition) {
    passed++;
    sectionStats[currentSection].passed++;
    console.log(`  ✓ ${description}`);
  } else {
    failed++;
    sectionStats[currentSection].failed++;
    failures.push(`[${currentSection}] ${description}`);
    console.log(`  ✗ ${description}`);
  }
}

function assertApprox(description, actual, expected, epsilon = 1e-9) {
  assert(`${description} (got ${actual}, expected ≈${expected})`,
    Math.abs(actual - expected) < epsilon);
}

function assertThrows(description, fn) {
  totalTests++;
  sectionStats[currentSection].total++;
  try {
    fn();
    failed++;
    sectionStats[currentSection].failed++;
    failures.push(`[${currentSection}] ${description} — did NOT throw`);
    console.log(`  ✗ ${description} — expected throw`);
  } catch {
    passed++;
    sectionStats[currentSection].passed++;
    console.log(`  ✓ ${description}`);
  }
}

// ── load AdvancedMath.js ────────────────────────────────────────────────────
const amSrc = fs.readFileSync(path.join(ROOT, "AdvancedMath.js"), "utf8");
const amModule = {};
new Function("module", "exports",
  amSrc.replace(/^function /gm, "exports.$& = ").length ? amSrc : amSrc
).call(amModule);
// Since AdvancedMath.js defines top-level functions, wrap them:
const sandbox = {};
new Function(
  amSrc + "\n" +
  "this.evaluate = evaluate;\n" +
  "this.formatResult = formatResult;\n" +
  "this.getAvailableFunctions = getAvailableFunctions;\n" +
  "this.toRadians = toRadians;\n" +
  "this.toDegrees = toDegrees;\n" +
  "this.constants = constants;\n"
).call(sandbox);

const { evaluate, formatResult, getAvailableFunctions, toRadians, toDegrees, constants } = sandbox;

// ═══════════════════════════════════════════════════════════════════════════
//  1. AdvancedMath.js — Core evaluate()
// ═══════════════════════════════════════════════════════════════════════════

section("AdvancedMath — Basic Arithmetic");
assertApprox("2 + 3 = 5", evaluate("2 + 3"), 5);
assertApprox("10 - 4 = 6", evaluate("10 - 4"), 6);
assertApprox("6 * 7 = 42", evaluate("6 * 7"), 42);
assertApprox("20 / 4 = 5", evaluate("20 / 4"), 5);
assertApprox("2 + 3 * 4 = 14 (precedence)", evaluate("2 + 3 * 4"), 14);
assertApprox("(2 + 3) * 4 = 20 (parens)", evaluate("(2 + 3) * 4"), 20);
assertApprox("100 / 10 / 2 = 5", evaluate("100 / 10 / 2"), 5);
assertApprox("-5 + 3 = -2 (negative)", evaluate("-5 + 3"), -2);
assertApprox("0.1 + 0.2 close to 0.3", evaluate("0.1 + 0.2"), 0.30000000000000004);
assertApprox("999999999 * 999999999", evaluate("999999999 * 999999999"), 999999998000000001);

section("AdvancedMath — Division by Zero / Infinity");
assertThrows("1 / 0 throws (Infinity)", () => evaluate("1 / 0"));
assertThrows("0 / 0 throws (NaN)", () => evaluate("0 / 0"));
assertThrows("-1 / 0 throws (-Infinity)", () => evaluate("-1 / 0"));

section("AdvancedMath — Exponentiation (^)");
assertApprox("2^10 = 1024", evaluate("2^10"), 1024);
assertApprox("3^0 = 1", evaluate("3^0"), 1);
assertApprox("10^3 = 1000", evaluate("10^3"), 1000);

section("AdvancedMath — Trigonometric (radians)");
assertApprox("sin(0) = 0", evaluate("sin(0)"), 0);
assertApprox("cos(0) = 1", evaluate("cos(0)"), 1);
assertApprox("tan(0) = 0", evaluate("tan(0)"), 0);
assertApprox("sin(pi/2) ≈ 1", evaluate("sin(pi/2)"), 1, 1e-6);
assertApprox("cos(pi) ≈ -1", evaluate("cos(pi)"), -1, 1e-6);
assertApprox("asin(1) ≈ pi/2", evaluate("asin(1)"), Math.PI / 2, 1e-9);
assertApprox("acos(0) ≈ pi/2", evaluate("acos(0)"), Math.PI / 2, 1e-9);
assertApprox("atan(1) ≈ pi/4", evaluate("atan(1)"), Math.PI / 4, 1e-9);

section("AdvancedMath — Trigonometric (degrees)");
assertApprox("sind(90) ≈ 1", evaluate("sind(90)"), 1, 1e-9);
assertApprox("cosd(0) = 1", evaluate("cosd(0)"), 1, 1e-9);
assertApprox("cosd(180) ≈ -1", evaluate("cosd(180)"), -1, 1e-9);
assertApprox("tand(45) ≈ 1", evaluate("tand(45)"), 1, 1e-9);
assertApprox("sind(0) = 0", evaluate("sind(0)"), 0, 1e-9);
assertApprox("sind(30) ≈ 0.5", evaluate("sind(30)"), 0.5, 1e-9);

section("AdvancedMath — Hyperbolic");
assertApprox("sinh(0) = 0", evaluate("sinh(0)"), 0);
assertApprox("cosh(0) = 1", evaluate("cosh(0)"), 1);
assertApprox("tanh(0) = 0", evaluate("tanh(0)"), 0);
assertApprox("asinh(0) = 0", evaluate("asinh(0)"), 0);
assertApprox("acosh(1) = 0", evaluate("acosh(1)"), 0);
assertApprox("atanh(0) = 0", evaluate("atanh(0)"), 0);

section("AdvancedMath — Logarithmic & Exponential");
assertApprox("log(100) = 2", evaluate("log(100)"), 2, 1e-9);
assertApprox("log(1) = 0", evaluate("log(1)"), 0);
assertApprox("log(10) = 1", evaluate("log(10)"), 1, 1e-9);
assertApprox("ln(1) = 0", evaluate("ln(1)"), 0);
assertApprox("ln(e) ≈ 1", evaluate("ln(e)"), 1, 1e-9);
assertApprox("exp(0) = 1", evaluate("exp(0)"), 1);
assertApprox("exp(1) ≈ e", evaluate("exp(1)"), Math.E, 1e-9);
assertApprox("pow(2, 8) = 256", evaluate("pow(2,8)"), 256);

section("AdvancedMath — Roots");
assertApprox("sqrt(144) = 12", evaluate("sqrt(144)"), 12);
assertApprox("sqrt(2) ≈ 1.4142", evaluate("sqrt(2)"), Math.SQRT2, 1e-9);
assertApprox("cbrt(27) = 3", evaluate("cbrt(27)"), 3);
assertApprox("cbrt(-8) = -2", evaluate("cbrt(-8)"), -2);

section("AdvancedMath — Rounding & Absolute");
assertApprox("abs(-42) = 42", evaluate("abs(-42)"), 42);
assertApprox("abs(7) = 7", evaluate("abs(7)"), 7);
assertApprox("floor(3.9) = 3", evaluate("floor(3.9)"), 3);
assertApprox("ceil(3.1) = 4", evaluate("ceil(3.1)"), 4);
assertApprox("round(3.5) = 4", evaluate("round(3.5)"), 4);
assertApprox("round(3.4) = 3", evaluate("round(3.4)"), 3);
assertApprox("trunc(3.9) = 3", evaluate("trunc(3.9)"), 3);
assertApprox("trunc(-3.9) = -3", evaluate("trunc(-3.9)"), -3);

section("AdvancedMath — Min / Max");
assertApprox("min(3,1,2) = 1", evaluate("min(3,1,2)"), 1);
assertApprox("max(3,1,2) = 3", evaluate("max(3,1,2)"), 3);
assertApprox("min(-5,5) = -5", evaluate("min(-5,5)"), -5);
assertApprox("max(-5,5) = 5", evaluate("max(-5,5)"), 5);

section("AdvancedMath — Constants");
assertApprox("pi ≈ 3.14159", evaluate("pi"), Math.PI, 1e-9);
assertApprox("e ≈ 2.71828", evaluate("e"), Math.E, 1e-9);
assertApprox("pi + e", evaluate("pi + e"), Math.PI + Math.E, 1e-9);
assert("constants.PI === Math.PI", constants.PI === Math.PI);
assert("constants.E === Math.E", constants.E === Math.E);
assert("constants.SQRT2 === Math.SQRT2", constants.SQRT2 === Math.SQRT2);

section("AdvancedMath — Complex Expressions");
assertApprox("sqrt(pow(3,2) + pow(4,2)) = 5 (Pythagoras)", evaluate("sqrt(pow(3,2) + pow(4,2))"), 5, 1e-9);
assertApprox("sin(pi/6) ≈ 0.5", evaluate("sin(pi/6)"), 0.5, 1e-9);
assertApprox("log(pow(10,5)) = 5", evaluate("log(pow(10,5))"), 5, 1e-9);
assertApprox("abs(-3) + sqrt(16) = 7", evaluate("abs(-3) + sqrt(16)"), 7, 1e-9);
assertApprox("(2+3)*(4-1)/5 = 3", evaluate("(2+3)*(4-1)/5"), 3, 1e-9);

section("AdvancedMath — Security / Injection Prevention");
assertThrows("Rejects alert('x')", () => evaluate("alert('hello')"));
assertThrows("Rejects process.exit", () => evaluate("process.exit(1)"));
assertThrows("Rejects require", () => evaluate("require('fs')"));
assertThrows("Rejects eval()", () => evaluate("eval('1+1')"));
assertThrows("Rejects constructor", () => evaluate("constructor"));
assertThrows("Rejects __proto__", () => evaluate("__proto__"));
assertThrows("Rejects semicolons", () => evaluate("1;2"));
assertThrows("Rejects backticks", () => evaluate("`hello`"));
assertThrows("Rejects assignments", () => evaluate("x=5"));
assertThrows("Rejects while loop", () => evaluate("while(true){}"));
assertThrows("Rejects array access", () => evaluate("[].constructor"));
assertThrows("Rejects string literal", () => evaluate("'hello'"));
assertThrows("Rejects empty expression", () => evaluate(""));

section("AdvancedMath — Edge Cases");
assertApprox("0 * 1000000 = 0", evaluate("0 * 1000000"), 0);
assertApprox("1 + 0 = 1", evaluate("1 + 0"), 1);
assertApprox("0 + 0 = 0", evaluate("0 + 0"), 0);
assertThrows("sqrt(-1) throws (NaN)", () => evaluate("sqrt(-1)"));
assertThrows("ln(-1) throws (NaN)", () => evaluate("ln(-1)"));
assertThrows("asin(2) throws (NaN)", () => evaluate("asin(2)"));
assertThrows("acos(2) throws (NaN)", () => evaluate("acos(2)"));

section("AdvancedMath — Helper Functions");
assertApprox("toRadians(180) ≈ pi", toRadians(180), Math.PI, 1e-9);
assertApprox("toRadians(90) ≈ pi/2", toRadians(90), Math.PI / 2, 1e-9);
assertApprox("toRadians(0) = 0", toRadians(0), 0);
assertApprox("toDegrees(pi) ≈ 180", toDegrees(Math.PI), 180, 1e-9);
assertApprox("toDegrees(0) = 0", toDegrees(0), 0);

section("AdvancedMath — formatResult()");
assert("Integer stays integer: 42 → '42'", formatResult(42) === "42");
assert("Integer 0 → '0'", formatResult(0) === "0");
assert("Negative integer: -7 → '-7'", formatResult(-7) === "-7");
assert("Small decimal trimmed", formatResult(3.14) === "3.14");
assert("Large integer → plain string (no exponential)", !(/e/i).test(formatResult(1e16)));
assert("Tiny number → exponential", /e/.test(formatResult(1e-7)));
assert("getAvailableFunctions() returns array", Array.isArray(getAvailableFunctions()));
assert("getAvailableFunctions() has entries", getAvailableFunctions().length > 10);

// ═══════════════════════════════════════════════════════════════════════════
//  2. Main.qml — Calculator State Machine (simulated via JS extraction)
// ═══════════════════════════════════════════════════════════════════════════

// Simulate the calculator state machine from Main.qml
function createCalculator(precision = 8) {
  const _maxInputLength = 18;

  const state = {
    tokens: [],
    currentInput: "0",
    shouldResetInput: false,
    justEvaluated: false,
    errorState: false,
    lastExpression: "",
    precision,
    showBarValue: true,
  };

  function _isOperator(t) { return t === "+" || t === "-" || t === "*" || t === "/"; }
  function _normalizeOperator(op) {
    if (op === "x" || op === "X") return "*";
    if (_isOperator(op)) return op;
    return "";
  }
  function _sanitizeCurrentInput() {
    if (state.currentInput === "" || state.currentInput === "-") return "0";
    if (state.currentInput.endsWith(".")) return state.currentInput + "0";
    return state.currentInput;
  }
  function _numberToString(value) {
    if (!Number.isFinite(value)) return null;
    let rounded = value;
    if (state.precision >= 0) rounded = Number(value.toFixed(state.precision));
    if (Object.is(rounded, -0)) rounded = 0;
    let text = rounded.toString();
    if (text.indexOf("e") >= 0 || text.indexOf("E") >= 0) return text.replace("e+", "e");
    if (text.length > 16 && rounded !== 0) {
      text = rounded.toExponential(Math.max(0, Math.min(state.precision, 6))).replace("e+", "e");
    }
    return text;
  }

  function hasExpression() {
    return state.tokens.length > 0 || state.currentInput !== "0" || state.justEvaluated;
  }

  function clearAll() {
    state.tokens = [];
    state.currentInput = "0";
    state.shouldResetInput = false;
    state.justEvaluated = false;
    state.errorState = false;
    state.lastExpression = "";
  }

  function _setError() {
    state.tokens = [];
    state.currentInput = "0";
    state.shouldResetInput = false;
    state.justEvaluated = false;
    state.errorState = true;
    state.lastExpression = "";
  }

  function appendDigit(digit) {
    if (state.errorState) clearAll();
    if (state.justEvaluated && state.tokens.length === 0 && !state.shouldResetInput) clearAll();
    if (state.shouldResetInput) {
      state.currentInput = digit;
      state.shouldResetInput = false;
      state.justEvaluated = false;
      state.errorState = false;
      return;
    }
    if (state.currentInput === "0") state.currentInput = digit;
    else if (state.currentInput === "-0") state.currentInput = "-" + digit;
    else if (state.currentInput.length < _maxInputLength) state.currentInput += digit;
    state.justEvaluated = false;
    state.errorState = false;
  }

  function appendDecimal() {
    if (state.errorState) clearAll();
    if (state.justEvaluated && state.tokens.length === 0 && !state.shouldResetInput) clearAll();
    if (state.shouldResetInput) {
      state.currentInput = "0.";
      state.shouldResetInput = false;
      state.justEvaluated = false;
      return;
    }
    if (state.currentInput.indexOf(".") === -1) state.currentInput += ".";
    state.justEvaluated = false;
  }

  function deleteLastChar() {
    if (state.errorState) { clearAll(); return; }
    if (state.justEvaluated) { clearAll(); return; }
    if (state.shouldResetInput) { state.currentInput = "0"; state.shouldResetInput = false; return; }
    if (state.currentInput.length <= 1 || (state.currentInput.length === 2 && state.currentInput.startsWith("-"))) {
      state.currentInput = "0"; return;
    }
    state.currentInput = state.currentInput.slice(0, state.currentInput.length - 1);
  }

  function toggleSign() {
    if (state.errorState) return;
    if (state.shouldResetInput) { state.currentInput = "0"; state.shouldResetInput = false; }
    if (state.currentInput.startsWith("-")) state.currentInput = state.currentInput.slice(1);
    else state.currentInput = "-" + state.currentInput;
    if (state.currentInput === "-0") { state.justEvaluated = false; return; }
    state.justEvaluated = false;
  }

  function applyPercent() {
    if (state.errorState) return;
    const numeric = Number(_sanitizeCurrentInput());
    if (Number.isNaN(numeric)) { _setError(); return; }
    const formatted = _numberToString(numeric / 100);
    if (formatted === null) { _setError(); return; }
    state.currentInput = formatted;
    state.shouldResetInput = false;
    state.justEvaluated = false;
  }

  function applyOperator(op) {
    if (state.errorState) return;
    const operator = _normalizeOperator(op);
    if (!operator) return;
    if (state.justEvaluated && state.tokens.length === 0) {
      state.tokens = [state.currentInput, operator];
      state.shouldResetInput = true;
      state.justEvaluated = false;
      state.lastExpression = "";
      return;
    }
    if (state.shouldResetInput) {
      if (state.tokens.length > 0 && _isOperator(state.tokens[state.tokens.length - 1])) {
        const updated = state.tokens.slice(0, state.tokens.length - 1);
        updated.push(operator);
        state.tokens = updated;
      } else {
        state.tokens = state.tokens.concat([operator]);
      }
      state.lastExpression = "";
      return;
    }
    state.tokens = state.tokens.concat([_sanitizeCurrentInput(), operator]);
    state.shouldResetInput = true;
    state.justEvaluated = false;
    state.lastExpression = "";
  }

  function _buildEvaluationTokens() {
    const built = Array.from(state.tokens);
    if (!state.shouldResetInput || built.length === 0 || !_isOperator(built[built.length - 1])) {
      built.push(_sanitizeCurrentInput());
    }
    while (built.length > 0 && _isOperator(built[built.length - 1])) built.pop();
    return built;
  }

  function doEvaluate() {
    if (state.errorState) return;
    const evaluationTokens = _buildEvaluationTokens();
    if (evaluationTokens.length === 0) return;
    const parts = [];
    for (const t of evaluationTokens) {
      if (t === "*") parts.push("x"); else parts.push(String(t));
    }
    const expression = parts.join(" ");
    const expressionStr = evaluationTokens.join(" ");
    let result;
    try { result = evaluate(expressionStr); } catch { _setError(); return; }
    if (result === null) { _setError(); return; }
    const formatted = _numberToString(result);
    if (formatted === null) { _setError(); return; }
    state.currentInput = formatted;
    state.tokens = [];
    state.shouldResetInput = false;
    state.justEvaluated = true;
    state.errorState = false;
    state.lastExpression = expression;
  }

  function pressButton(action) {
    if (action >= "0" && action <= "9") { appendDigit(action); return; }
    if (action === "decimal") appendDecimal();
    else if (action === "add") applyOperator("+");
    else if (action === "subtract") applyOperator("-");
    else if (action === "multiply") applyOperator("*");
    else if (action === "divide") applyOperator("/");
    else if (action === "equals") doEvaluate();
    else if (action === "percent") applyPercent();
    else if (action === "sign") toggleSign();
    else if (action === "clear") clearAll();
    else if (action === "delete") deleteLastChar();
  }

  function compactDisplay(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    const numeric = Number(text);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      const exp = numeric.toExponential(Math.max(0, Math.min(state.precision, 3))).replace("e+", "e");
      if (exp.length <= maxLength) return exp;
    }
    return text.slice(0, Math.max(1, maxLength - 1)) + "~";
  }

  return { state, clearAll, appendDigit, appendDecimal, deleteLastChar, toggleSign,
    applyPercent, applyOperator, doEvaluate, pressButton, hasExpression, compactDisplay };
}

section("Calculator — Basic Input Sequences");
{
  const c = createCalculator();
  c.pressButton("1"); c.pressButton("2"); c.pressButton("3");
  assert("Digits 1-2-3 → '123'", c.state.currentInput === "123");
}
{
  const c = createCalculator();
  c.pressButton("0"); c.pressButton("0"); c.pressButton("5");
  assert("Leading zeros handled: 005 → '5'", c.state.currentInput === "5");
}
{
  const c = createCalculator();
  c.pressButton("decimal"); c.pressButton("5");
  assert("Decimal first → '0.5'", c.state.currentInput === "0.5");
}
{
  const c = createCalculator();
  c.pressButton("1"); c.pressButton("decimal"); c.pressButton("decimal");
  assert("Double decimal prevented → '1.'", c.state.currentInput === "1.");
}

section("Calculator — Arithmetic Operations");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("add"); c.pressButton("3"); c.pressButton("equals");
  assert("5 + 3 = 8", c.state.currentInput === "8");
}
{
  const c = createCalculator();
  c.pressButton("9"); c.pressButton("subtract"); c.pressButton("4"); c.pressButton("equals");
  assert("9 - 4 = 5", c.state.currentInput === "5");
}
{
  const c = createCalculator();
  c.pressButton("6"); c.pressButton("multiply"); c.pressButton("7"); c.pressButton("equals");
  assert("6 × 7 = 42", c.state.currentInput === "42");
}
{
  const c = createCalculator();
  c.pressButton("8"); c.pressButton("divide"); c.pressButton("2"); c.pressButton("equals");
  assert("8 ÷ 2 = 4", c.state.currentInput === "4");
}
{
  const c = createCalculator();
  c.pressButton("2"); c.pressButton("add"); c.pressButton("3"); c.pressButton("multiply");
  c.pressButton("4"); c.pressButton("equals");
  // expression: 2 + 3 * 4 — evaluate processes left-to-right via AdvancedMath
  assert("2 + 3 * 4 = 14 (precedence)", c.state.currentInput === "14");
}

section("Calculator — Chained Operations");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("add"); c.pressButton("3"); c.pressButton("equals");
  c.pressButton("add"); c.pressButton("2"); c.pressButton("equals");
  assert("5 + 3 = 8, then + 2 = 10 (chain after eval)", c.state.currentInput === "10");
}
{
  const c = createCalculator();
  c.pressButton("1"); c.pressButton("0"); c.pressButton("multiply");
  c.pressButton("2"); c.pressButton("multiply");
  c.pressButton("3"); c.pressButton("equals");
  assert("10 × 2 × 3 = 60 (triple chain)", c.state.currentInput === "60");
}

section("Calculator — Clear (AC)");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("add"); c.pressButton("3");
  c.pressButton("clear");
  assert("AC resets currentInput to '0'", c.state.currentInput === "0");
  assert("AC clears tokens", c.state.tokens.length === 0);
  assert("AC clears errorState", c.state.errorState === false);
  assert("AC clears justEvaluated", c.state.justEvaluated === false);
}

section("Calculator — Delete (Backspace)");
{
  const c = createCalculator();
  c.pressButton("1"); c.pressButton("2"); c.pressButton("3");
  c.pressButton("delete");
  assert("Delete 123 → '12'", c.state.currentInput === "12");
  c.pressButton("delete");
  assert("Delete 12 → '1'", c.state.currentInput === "1");
  c.pressButton("delete");
  assert("Delete single digit → '0'", c.state.currentInput === "0");
}
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("add"); c.pressButton("3"); c.pressButton("equals");
  c.pressButton("delete");
  assert("Delete after eval → clears all", c.state.currentInput === "0");
  assert("Delete after eval → tokens empty", c.state.tokens.length === 0);
}

section("Calculator — Toggle Sign (+/-)");
{
  const c = createCalculator();
  c.pressButton("5");
  c.pressButton("sign");
  assert("5 → -5", c.state.currentInput === "-5");
  c.pressButton("sign");
  assert("-5 → 5 (toggle back)", c.state.currentInput === "5");
}
{
  const c = createCalculator();
  c.pressButton("sign");
  assert("0 → -0", c.state.currentInput === "-0");
  c.pressButton("3");
  assert("-0 then 3 → -3", c.state.currentInput === "-3");
}

section("Calculator — Percent");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("0");
  c.pressButton("percent");
  assert("50% → 0.5", c.state.currentInput === "0.5");
}
{
  const c = createCalculator();
  c.pressButton("1"); c.pressButton("0"); c.pressButton("0");
  c.pressButton("percent");
  assert("100% → 1", c.state.currentInput === "1");
}
{
  const c = createCalculator();
  c.pressButton("2"); c.pressButton("5");
  c.pressButton("percent");
  assert("25% → 0.25", c.state.currentInput === "0.25");
}

section("Calculator — Operator Replacement");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("add"); c.pressButton("subtract");
  assert("Replace + with - (last token is -)", c.state.tokens[c.state.tokens.length - 1] === "-");
  c.pressButton("multiply");
  assert("Replace - with * (last token is *)", c.state.tokens[c.state.tokens.length - 1] === "*");
}

section("Calculator — Division by Zero → Error");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("divide"); c.pressButton("0"); c.pressButton("equals");
  assert("5 / 0 → errorState = true", c.state.errorState === true);
}

section("Calculator — Error Recovery");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("divide"); c.pressButton("0"); c.pressButton("equals");
  assert("Error state active", c.state.errorState === true);
  c.pressButton("3");
  assert("Digit after error clears and starts new: '3'", c.state.currentInput === "3");
  assert("Error cleared", c.state.errorState === false);
}
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("divide"); c.pressButton("0"); c.pressButton("equals");
  c.pressButton("clear");
  assert("AC after error → clean state", c.state.currentInput === "0");
  assert("AC after error → errorState false", c.state.errorState === false);
}

section("Calculator — Max Input Length (18 digits)");
{
  const c = createCalculator();
  for (let i = 0; i < 20; i++) c.pressButton("9");
  assert("Max 18 digits enforced", c.state.currentInput.length === 18);
  assert("All 9s", c.state.currentInput === "9".repeat(18));
}

section("Calculator — New Calculation After Eval");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("add"); c.pressButton("3"); c.pressButton("equals");
  assert("After eval: justEvaluated = true", c.state.justEvaluated === true);
  c.pressButton("9");
  assert("New digit after eval starts fresh: '9'", c.state.currentInput === "9");
  assert("justEvaluated cleared", c.state.justEvaluated === false);
}

section("Calculator — Decimal After Operator");
{
  const c = createCalculator();
  c.pressButton("5"); c.pressButton("add"); c.pressButton("decimal"); c.pressButton("5");
  c.pressButton("equals");
  assert("5 + .5 = 5.5", c.state.currentInput === "5.5");
}

section("Calculator — compactDisplay()");
{
  const c = createCalculator();
  assert("Short text passes through", c.compactDisplay("123", 9) === "123");
  assert("Empty text → empty", c.compactDisplay("", 9) === "");
  assert("Null → empty", c.compactDisplay(null, 9) === "");
  assert("Long text gets truncated", c.compactDisplay("123456789012", 9).length <= 9);
  assert("Long numeric → exponential or truncated",
    c.compactDisplay("99999999999", 9).length <= 9);
}

section("Calculator — Precision Setting");
{
  const c = createCalculator(2);
  c.pressButton("1"); c.pressButton("divide"); c.pressButton("3"); c.pressButton("equals");
  assert("1/3 with precision=2 → '0.33'", c.state.currentInput === "0.33");
}
{
  const c = createCalculator(0);
  c.pressButton("1"); c.pressButton("divide"); c.pressButton("3"); c.pressButton("equals");
  assert("1/3 with precision=0 → '0'", c.state.currentInput === "0");
}
{
  const c = createCalculator(10);
  c.pressButton("1"); c.pressButton("divide"); c.pressButton("3"); c.pressButton("equals");
  assert("1/3 with precision=10 → 12 chars", c.state.currentInput === "0.3333333333");
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. i18n — Language Files Validation
// ═══════════════════════════════════════════════════════════════════════════

section("i18n — Structure & Completeness");

const i18nDir = path.join(ROOT, "i18n");
const requiredLangs = ["en", "pt", "es", "fr", "de", "it", "ru", "zh", "ja", "ko"];
const enPath = path.join(i18nDir, "en.json");
const enData = JSON.parse(fs.readFileSync(enPath, "utf8"));
const enKeys = new Set();

function collectKeys(obj, prefix = "") {
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) collectKeys(v, full);
    else enKeys.add(full);
  }
}
collectKeys(enData);

for (const lang of requiredLangs) {
  const filePath = path.join(i18nDir, `${lang}.json`);
  const exists = fs.existsSync(filePath);
  assert(`${lang}.json exists`, exists);
  if (!exists) continue;

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const langKeys = new Set();
  collectKeys(data, "", langKeys);
  // Re-collect for this lang
  const thisLangKeys = new Set();
  function collectLangKeys(obj, prefix = "") {
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "object" && v !== null) collectLangKeys(v, full);
      else thisLangKeys.add(full);
    }
  }
  collectLangKeys(data);

  for (const key of enKeys) {
    assert(`${lang}.json has key "${key}"`, thisLangKeys.has(key));
  }

  // Check no empty values
  function checkNoEmpty(obj, prefix = "") {
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") {
        assert(`${lang}.json "${full}" is not empty`, v.trim().length > 0);
      } else if (typeof v === "object" && v !== null) {
        checkNoEmpty(v, full);
      }
    }
  }
  checkNoEmpty(data);
}

section("i18n — Placeholder Consistency");
// Check that {value} and {version} placeholders match between en and other langs
function findPlaceholders(str) {
  const matches = str.match(/\{[^}]+\}/g);
  return matches ? matches.sort() : [];
}

function checkPlaceholders(enObj, langObj, lang, prefix = "") {
  for (const [k, v] of Object.entries(enObj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string" && langObj[k] && typeof langObj[k] === "string") {
      const enPh = findPlaceholders(v);
      const langPh = findPlaceholders(langObj[k]);
      if (enPh.length > 0) {
        assert(`${lang}.json "${full}" has same placeholders as en`, JSON.stringify(enPh) === JSON.stringify(langPh));
      }
    } else if (typeof v === "object" && v !== null && langObj[k]) {
      checkPlaceholders(v, langObj[k], lang, full);
    }
  }
}

for (const lang of requiredLangs.filter(l => l !== "en")) {
  const data = JSON.parse(fs.readFileSync(path.join(i18nDir, `${lang}.json`), "utf8"));
  checkPlaceholders(enData, data, lang);
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. manifest.json — Validation
// ═══════════════════════════════════════════════════════════════════════════

section("manifest.json — Structure");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

assert("id is 'noctalia-calculator'", manifest.id === "noctalia-calculator");
assert("name is 'Calculator'", manifest.name === "Calculator");
assert("version follows semver", /^\d+\.\d+\.\d+$/.test(manifest.version));
assert("minNoctaliaVersion present", typeof manifest.minNoctaliaVersion === "string");
assert("author present", typeof manifest.author === "string" && manifest.author.length > 0);
assert("license is MIT", manifest.license === "MIT");
assert("description present", typeof manifest.description === "string" && manifest.description.length > 10);
assert("tags is array", Array.isArray(manifest.tags));
assert("tags include 'Bar'", manifest.tags.includes("Bar"));
assert("tags include 'Panel'", manifest.tags.includes("Panel"));

assert("entryPoints.main → Main.qml", manifest.entryPoints.main === "Main.qml");
assert("entryPoints.barWidget → BarWidget.qml", manifest.entryPoints.barWidget === "BarWidget.qml");
assert("entryPoints.panel → Panel.qml", manifest.entryPoints.panel === "Panel.qml");
assert("entryPoints.settings → Settings.qml", manifest.entryPoints.settings === "Settings.qml");

// Verify all entry points exist on disk
for (const [key, filePath] of Object.entries(manifest.entryPoints)) {
  assert(`entryPoint "${key}" file exists: ${filePath}`, fs.existsSync(path.join(ROOT, filePath)));
}

assert("defaultSettings.showBarValue is boolean", typeof manifest.metadata.defaultSettings.showBarValue === "boolean");
assert("defaultSettings.precision is number", typeof manifest.metadata.defaultSettings.precision === "number");
assert("defaultSettings.precision in [0,10]",
  manifest.metadata.defaultSettings.precision >= 0 && manifest.metadata.defaultSettings.precision <= 10);

// ═══════════════════════════════════════════════════════════════════════════
//  5. QML Structure — Static Analysis
// ═══════════════════════════════════════════════════════════════════════════

section("QML Files — Static Checks");

const mainQml = fs.readFileSync(path.join(ROOT, "Main.qml"), "utf8");
const panelQml = fs.readFileSync(path.join(ROOT, "Panel.qml"), "utf8");
const barQml = fs.readFileSync(path.join(ROOT, "BarWidget.qml"), "utf8");
const settingsQml = fs.readFileSync(path.join(ROOT, "Settings.qml"), "utf8");

assert("Main.qml imports Quickshell", mainQml.includes("import Quickshell"));
assert("Main.qml imports Quickshell.Io (IPC)", mainQml.includes("import Quickshell.Io"));
assert("Main.qml imports AdvancedMath.js", mainQml.includes('import "AdvancedMath.js" as AdvancedMath'));
assert("Main.qml has IpcHandler block", mainQml.includes("IpcHandler"));
assert("Main.qml IpcHandler target correct", mainQml.includes('target: "plugin:noctalia-calculator"'));
assert("Main.qml IpcHandler has toggle()", mainQml.includes("function toggle()"));
assert("Main.qml has pluginApi property", mainQml.includes("property var pluginApi"));
assert("Main.qml has clearAll()", mainQml.includes("function clearAll()"));
assert("Main.qml has evaluate()", mainQml.includes("function evaluate()"));
assert("Main.qml has pressButton()", mainQml.includes("function pressButton("));
assert("Main.qml has handleKeyEvent()", mainQml.includes("function handleKeyEvent("));
assert("Main.qml has actionForKeyEvent()", mainQml.includes("function actionForKeyEvent("));
assert("Main.qml has precision property", mainQml.includes("property int precision"));
assert("Main.qml has showBarValue property", mainQml.includes("property bool showBarValue"));

assert("Panel.qml has 20 button entries in buttonModel", (panelQml.match(/"action"\s*:/g) || []).length === 20);
assert("Panel.qml has keyboard handler", panelQml.includes("Keys.onPressed"));
assert("Panel.qml has flash animation", panelQml.includes("flashedAction"));
assert("Panel.qml has focus management", panelQml.includes("forceActiveFocus"));

assert("BarWidget.qml has context menu", barQml.includes("NPopupContextMenu"));
assert("BarWidget.qml has tooltip", barQml.includes("TooltipService"));
assert("BarWidget.qml has badge display", barQml.includes("badge"));
assert("BarWidget.qml has left+right click", barQml.includes("Qt.LeftButton | Qt.RightButton"));

assert("Settings.qml has NToggle", settingsQml.includes("NToggle"));
assert("Settings.qml has NSlider", settingsQml.includes("NSlider"));
assert("Settings.qml has saveSettings()", settingsQml.includes("function saveSettings()"));
assert("Settings.qml slider range 0-10", settingsQml.includes("from: 0") && settingsQml.includes("to: 10"));

// ═══════════════════════════════════════════════════════════════════════════
//  6. File Integrity
// ═══════════════════════════════════════════════════════════════════════════

section("File Integrity");
const requiredFiles = [
  "Main.qml", "Panel.qml", "BarWidget.qml", "Settings.qml",
  "AdvancedMath.js", "manifest.json", "LICENSE", "README.md", "preview.png"
];
for (const f of requiredFiles) {
  assert(`${f} exists`, fs.existsSync(path.join(ROOT, f)));
}
assert("LICENSE contains MIT", fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8").includes("MIT"));
assert("README.md is non-empty", fs.readFileSync(path.join(ROOT, "README.md"), "utf8").length > 100);
assert("preview.png is non-empty", fs.statSync(path.join(ROOT, "preview.png")).size > 1000);

// ═══════════════════════════════════════════════════════════════════════════
//  REPORT
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n\n╔══════════════════════════════════════════════════════════════╗");
console.log("║                    TEST REPORT                               ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║  Total:  ${String(totalTests).padStart(4)}                                              ║`);
console.log(`║  Passed: ${String(passed).padStart(4)}  ✓                                            ║`);
console.log(`║  Failed: ${String(failed).padStart(4)}  ✗                                            ║`);
console.log(`║  Rate:   ${String((passed / totalTests * 100).toFixed(1)).padStart(5)}%                                          ║`);
console.log("╠══════════════════════════════════════════════════════════════╣");

for (const [sec, stats] of Object.entries(sectionStats)) {
  const icon = stats.failed === 0 ? "✓" : "✗";
  const rate = ((stats.passed / stats.total) * 100).toFixed(0);
  console.log(`║ ${icon} ${sec.padEnd(42)} ${String(stats.passed).padStart(3)}/${String(stats.total).padStart(3)} (${rate}%) ║`);
}

console.log("╚══════════════════════════════════════════════════════════════╝");

if (failures.length > 0) {
  console.log("\n❌ FAILURES:");
  for (const f of failures) console.log(`   • ${f}`);
}

process.exit(failed > 0 ? 1 : 0);
