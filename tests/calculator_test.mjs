// =============================================================================
// Full integration test: Calculator (Main.qml) + AdvancedMath.js
// Simulates the QML environment in pure JS
// =============================================================================

// --- Load AdvancedMath from plugin directory ---
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const advMathCode = readFileSync(
  join(__dirname, '..', 'AdvancedMath.js'),
  'utf-8'
);
// AdvancedMath.js uses top-level function declarations, extract them
const evalFn = new Function(advMathCode + '\nreturn { evaluate, formatResult, getAvailableFunctions };');
const mathLib = evalFn();

// --- Mock pluginApi ---
const pluginApi = {
  pluginSettings: { showBarValue: true, precision: 8 },
  manifest: { metadata: { defaultSettings: { showBarValue: true, precision: 8 } } },
  tr: (key) => key === "state.error" ? "Error" : key,
};

// --- Calculator state (simulates QML Item properties) ---
function createCalculator(api) {
  const calc = {
    pluginApi: api,
    _maxInputLength: 18,
    tokens: [],
    currentInput: "0",
    shouldResetInput: false,
    justEvaluated: false,
    errorState: false,
    lastExpression: "",
  };

  // Computed
  Object.defineProperty(calc, 'precision', {
    get() {
      const s = calc.pluginApi?.pluginSettings ?? {};
      const d = calc.pluginApi?.manifest?.metadata?.defaultSettings ?? {};
      return Math.max(0, Math.min(s.precision ?? d.precision ?? 8, 10));
    }
  });
  Object.defineProperty(calc, 'showBarValue', {
    get() {
      const s = calc.pluginApi?.pluginSettings ?? {};
      const d = calc.pluginApi?.manifest?.metadata?.defaultSettings ?? {};
      return s.showBarValue ?? d.showBarValue ?? true;
    }
  });
  Object.defineProperty(calc, 'hasExpression', {
    get() { return calc.tokens.length > 0 || calc.currentInput !== "0" || calc.justEvaluated; }
  });
  Object.defineProperty(calc, 'displayText', {
    get() { return calc.errorState ? calc.pluginApi?.tr("state.error") : calc.currentInput; }
  });
  Object.defineProperty(calc, 'badgeText', {
    get() { return !calc.showBarValue ? "" : calc.compactDisplay(calc.displayText, 9); }
  });

  // --- Functions (ported 1:1 from Main.qml) ---
  calc._isOperator = (token) => token === "+" || token === "-" || token === "*" || token === "/";

  calc._normalizeOperator = (op) => {
    if (op === "x" || op === "X") return "*";
    if (calc._isOperator(op)) return op;
    return "";
  };

  calc._sanitizeCurrentInput = () => {
    if (calc.currentInput === "" || calc.currentInput === "-") return "0";
    if (calc.currentInput.endsWith(".")) return calc.currentInput + "0";
    return calc.currentInput;
  };

  calc._numberToString = (value) => {
    if (!Number.isFinite(value)) return null;
    let rounded = value;
    if (calc.precision >= 0) {
      rounded = Number(value.toFixed(calc.precision));
    }
    if (Object.is(rounded, -0)) rounded = 0;
    let text = rounded.toString();
    if (text.indexOf("e") >= 0 || text.indexOf("E") >= 0) {
      return text.replace("e+", "e");
    }
    if (text.length > 16 && rounded !== 0) {
      text = rounded.toExponential(Math.max(0, Math.min(calc.precision, 6))).replace("e+", "e");
    }
    return text;
  };

  calc.compactDisplay = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    const numeric = Number(text);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      const exp = numeric.toExponential(Math.max(0, Math.min(calc.precision, 3))).replace("e+", "e");
      if (exp.length <= maxLength) return exp;
    }
    return text.slice(0, Math.max(1, maxLength - 1)) + "~";
  };

  calc.clearAll = () => {
    calc.tokens = [];
    calc.currentInput = "0";
    calc.shouldResetInput = false;
    calc.justEvaluated = false;
    calc.errorState = false;
    calc.lastExpression = "";
  };

  calc._setError = () => {
    calc.tokens = [];
    calc.currentInput = "0";
    calc.shouldResetInput = false;
    calc.justEvaluated = false;
    calc.errorState = true;
    calc.lastExpression = "";
  };

  calc.appendDigit = (digit) => {
    if (calc.errorState) calc.clearAll();
    if (calc.justEvaluated && calc.tokens.length === 0 && !calc.shouldResetInput) {
      calc.clearAll();
    }
    if (calc.shouldResetInput) {
      calc.currentInput = digit;
      calc.shouldResetInput = false;
      calc.justEvaluated = false;
      calc.errorState = false;
      return;
    }
    if (calc.currentInput === "0") {
      calc.currentInput = digit;
    } else if (calc.currentInput === "-0") {
      calc.currentInput = "-" + digit;
    } else if (calc.currentInput.length < calc._maxInputLength) {
      calc.currentInput += digit;
    }
    calc.justEvaluated = false;
    calc.errorState = false;
  };

  calc.appendDecimal = () => {
    if (calc.errorState) calc.clearAll();
    if (calc.justEvaluated && calc.tokens.length === 0 && !calc.shouldResetInput) {
      calc.clearAll();
    }
    if (calc.shouldResetInput) {
      calc.currentInput = "0.";
      calc.shouldResetInput = false;
      calc.justEvaluated = false;
      return;
    }
    if (calc.currentInput.indexOf(".") === -1) {
      calc.currentInput += ".";
    }
    calc.justEvaluated = false;
  };

  calc.deleteLastChar = () => {
    if (calc.errorState) { calc.clearAll(); return; }
    if (calc.justEvaluated) { calc.clearAll(); return; }
    if (calc.shouldResetInput) { calc.currentInput = "0"; calc.shouldResetInput = false; return; }
    if (calc.currentInput.length <= 1 || (calc.currentInput.length === 2 && calc.currentInput.startsWith("-"))) {
      calc.currentInput = "0";
      return;
    }
    calc.currentInput = calc.currentInput.slice(0, calc.currentInput.length - 1);
  };

  calc.toggleSign = () => {
    if (calc.errorState) return;
    if (calc.shouldResetInput) { calc.currentInput = "0"; calc.shouldResetInput = false; }
    if (calc.currentInput.startsWith("-")) {
      calc.currentInput = calc.currentInput.slice(1);
    } else {
      calc.currentInput = "-" + calc.currentInput;
    }
    if (calc.currentInput === "-0") { calc.justEvaluated = false; return; }
    calc.justEvaluated = false;
  };

  calc.applyPercent = () => {
    if (calc.errorState) return;
    const numeric = Number(calc._sanitizeCurrentInput());
    if (Number.isNaN(numeric)) { calc._setError(); return; }
    const formatted = calc._numberToString(numeric / 100);
    if (formatted === null) { calc._setError(); return; }
    calc.currentInput = formatted;
    calc.shouldResetInput = false;
    calc.justEvaluated = false;
  };

  calc.applyOperator = (op) => {
    if (calc.errorState) return;
    const operator = calc._normalizeOperator(op);
    if (!operator) return;
    if (calc.justEvaluated && calc.tokens.length === 0) {
      calc.tokens = [calc.currentInput, operator];
      calc.shouldResetInput = true;
      calc.justEvaluated = false;
      calc.lastExpression = "";
      return;
    }
    if (calc.shouldResetInput) {
      if (calc.tokens.length > 0 && calc._isOperator(calc.tokens[calc.tokens.length - 1])) {
        const updated = calc.tokens.slice(0, calc.tokens.length - 1);
        updated.push(operator);
        calc.tokens = updated;
      } else {
        calc.tokens = calc.tokens.concat([operator]);
      }
      calc.lastExpression = "";
      return;
    }
    calc.tokens = calc.tokens.concat([calc._sanitizeCurrentInput(), operator]);
    calc.shouldResetInput = true;
    calc.justEvaluated = false;
    calc.lastExpression = "";
  };

  calc._buildEvaluationTokens = () => {
    const built = Array.from(calc.tokens);
    if (!calc.shouldResetInput || built.length === 0 || !calc._isOperator(built[built.length - 1])) {
      built.push(calc._sanitizeCurrentInput());
    }
    while (built.length > 0 && calc._isOperator(built[built.length - 1])) {
      built.pop();
    }
    return built;
  };

  calc._buildDisplayTokens = () => {
    const built = Array.from(calc.tokens);
    if (!calc.shouldResetInput || built.length === 0 || !calc._isOperator(built[built.length - 1])) {
      built.push(calc._sanitizeCurrentInput());
    }
    return built;
  };

  calc._evaluateExpression = (expressionStr) => {
    try {
      return mathLib.evaluate(expressionStr);
    } catch (e) {
      return null;
    }
  };

  calc._formatExpression = (tokensToFormat) => {
    const parts = [];
    for (let i = 0; i < tokensToFormat.length; i++) {
      const token = tokensToFormat[i];
      if (token === "*") parts.push("x");
      else parts.push(String(token));
    }
    return parts.join(" ");
  };

  calc.expressionPreview = () => {
    if (calc.errorState) return calc.lastExpression || "";
    if (calc.justEvaluated && calc.lastExpression) return calc.lastExpression;
    const built = calc._buildDisplayTokens();
    if (built.length === 0 || (built.length === 1 && built[0] === "0" && !calc.hasExpression)) {
      return "";
    }
    return calc._formatExpression(built);
  };

  calc.evaluate = () => {
    if (calc.errorState) return;
    const evaluationTokens = calc._buildEvaluationTokens();
    if (evaluationTokens.length === 0) return;
    const expression = calc._formatExpression(evaluationTokens);
    const expressionStr = evaluationTokens.join(" ");
    const result = calc._evaluateExpression(expressionStr);
    if (result === null) { calc._setError(); return; }
    const formatted = calc._numberToString(result);
    if (formatted === null) { calc._setError(); return; }
    calc.currentInput = formatted;
    calc.tokens = [];
    calc.shouldResetInput = false;
    calc.justEvaluated = true;
    calc.errorState = false;
    calc.lastExpression = expression;
  };

  calc.pressButton = (action) => {
    if (action >= "0" && action <= "9") { calc.appendDigit(action); return; }
    if (action === "decimal") calc.appendDecimal();
    else if (action === "add") calc.applyOperator("+");
    else if (action === "subtract") calc.applyOperator("-");
    else if (action === "multiply") calc.applyOperator("*");
    else if (action === "divide") calc.applyOperator("/");
    else if (action === "equals") calc.evaluate();
    else if (action === "percent") calc.applyPercent();
    else if (action === "sign") calc.toggleSign();
    else if (action === "clear") calc.clearAll();
    else if (action === "delete") calc.deleteLastChar();
  };

  return calc;
}

// =============================================================================
// TEST RUNNER
// =============================================================================
let passed = 0;
let failed = 0;
const failures = [];

function assert(testName, actual, expected) {
  const act = typeof actual === 'object' ? JSON.stringify(actual) : String(actual);
  const exp = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
  if (act === exp) {
    passed++;
  } else {
    failed++;
    failures.push({ testName, actual: act, expected: exp });
  }
}

function assertClose(testName, actual, expected, tolerance = 1e-6) {
  if (typeof actual === 'number' && typeof expected === 'number' && Math.abs(actual - expected) < tolerance) {
    passed++;
  } else {
    failed++;
    failures.push({ testName, actual: String(actual), expected: `~${expected}` });
  }
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

// Helper: press a sequence of buttons and return final state
function pressSeq(actions) {
  const c = createCalculator(pluginApi);
  for (const a of actions) c.pressButton(a);
  return c;
}

// =============================================================================
// 1. BASIC ARITHMETIC via AdvancedMath.evaluate
// =============================================================================
section("1. Basic Arithmetic (AdvancedMath integration)");

// 2 + 3 = 5
let c = pressSeq(["2", "add", "3", "equals"]);
assert("2 + 3 = 5", c.currentInput, "5");
assert("2 + 3 expression", c.lastExpression, "2 + 3");

// 10 - 4 = 6
c = pressSeq(["1", "0", "subtract", "4", "equals"]);
assert("10 - 4 = 6", c.currentInput, "6");

// 7 * 8 = 56
c = pressSeq(["7", "multiply", "8", "equals"]);
assert("7 * 8 = 56", c.currentInput, "56");

// 15 / 3 = 5
c = pressSeq(["1", "5", "divide", "3", "equals"]);
assert("15 / 3 = 5", c.currentInput, "5");

// 100 + 200 + 300 = 600
c = pressSeq(["1", "0", "0", "add", "2", "0", "0", "add", "3", "0", "0", "equals"]);
assert("100 + 200 + 300 = 600", c.currentInput, "600");

// 50 * 70 = 3500
c = pressSeq(["5", "0", "multiply", "7", "0", "equals"]);
assert("50 x 70 = 3500", c.currentInput, "3500");

// =============================================================================
// 2. DECIMAL ARITHMETIC
// =============================================================================
section("2. Decimal Arithmetic");

// 1.5 + 2.3 = 3.8
c = pressSeq(["1", "decimal", "5", "add", "2", "decimal", "3", "equals"]);
assert("1.5 + 2.3 = 3.8", c.currentInput, "3.8");

// 0.1 + 0.2 (floating point handled by precision)
c = pressSeq(["0", "decimal", "1", "add", "0", "decimal", "2", "equals"]);
assert("0.1 + 0.2 = 0.3", c.currentInput, "0.3");

// 9.99 * 3 = 29.97
c = pressSeq(["9", "decimal", "9", "9", "multiply", "3", "equals"]);
assert("9.99 * 3 = 29.97", c.currentInput, "29.97");

// =============================================================================
// 3. SIGN TOGGLE
// =============================================================================
section("3. Sign Toggle");

c = createCalculator(pluginApi);
c.pressButton("5");
c.pressButton("sign");
assert("5 toggle sign = -5", c.currentInput, "-5");

c.pressButton("sign");
assert("-5 toggle sign = 5", c.currentInput, "5");

// -5 + 3 = -2
c = pressSeq(["5", "sign", "add", "3", "equals"]);
assert("-5 + 3 = -2", c.currentInput, "-2");

// =============================================================================
// 4. PERCENT
// =============================================================================
section("4. Percent");

c = createCalculator(pluginApi);
c.pressButton("5");
c.pressButton("0");
c.pressButton("percent");
assert("50% = 0.5", c.currentInput, "0.5");

c = createCalculator(pluginApi);
c.pressButton("2");
c.pressButton("5");
c.pressButton("percent");
assert("25% = 0.25", c.currentInput, "0.25");

// =============================================================================
// 5. CLEAR & DELETE
// =============================================================================
section("5. Clear & Delete");

c = createCalculator(pluginApi);
c.pressButton("1"); c.pressButton("2"); c.pressButton("3");
assert("Input 123", c.currentInput, "123");
c.pressButton("delete");
assert("Delete -> 12", c.currentInput, "12");
c.pressButton("delete");
assert("Delete -> 1", c.currentInput, "1");
c.pressButton("delete");
assert("Delete -> 0", c.currentInput, "0");

c = pressSeq(["5", "add", "3"]);
c.pressButton("clear");
assert("Clear resets all", c.currentInput, "0");
assert("Clear resets tokens", c.tokens.length, 0);

// =============================================================================
// 6. OPERATOR CHAINING
// =============================================================================
section("6. Operator Chaining");

// 2 + 3 * 4 (AdvancedMath respects precedence: 2 + 12 = 14)
c = pressSeq(["2", "add", "3", "multiply", "4", "equals"]);
assert("2 + 3 * 4 = 14 (precedence)", c.currentInput, "14");

// Replace operator: 5 + then switch to -
c = createCalculator(pluginApi);
c.pressButton("5"); c.pressButton("add"); c.pressButton("subtract");
// tokens should now end with "-"
assert("Operator replace + -> -", c.tokens[c.tokens.length - 1], "-");

// =============================================================================
// 7. CHAINED EVALUATION (use result for next calc)
// =============================================================================
section("7. Chained Evaluation");

c = pressSeq(["5", "add", "5", "equals"]);
assert("5 + 5 = 10", c.currentInput, "10");
assert("justEvaluated", c.justEvaluated, true);

// Now press + 3 = (should be 10 + 3 = 13)
c.pressButton("add");
c.pressButton("3");
c.pressButton("equals");
assert("10 + 3 = 13 (chained)", c.currentInput, "13");

// =============================================================================
// 8. EDGE CASES
// =============================================================================
section("8. Edge Cases");

// Division by zero -> error (AdvancedMath throws on Infinity)
c = pressSeq(["5", "divide", "0", "equals"]);
assert("5 / 0 = error", c.errorState, true);

// Pressing equals with just "0"
c = createCalculator(pluginApi);
c.pressButton("equals");
assert("Equals on 0 -> 0", c.currentInput, "0");
assert("No error on bare equals", c.errorState, false);

// Multiple decimals ignored
c = createCalculator(pluginApi);
c.pressButton("1"); c.pressButton("decimal"); c.pressButton("2"); c.pressButton("decimal"); c.pressButton("3");
assert("Multiple decimal ignored: 1.23", c.currentInput, "1.23");

// Max input length
c = createCalculator(pluginApi);
for (let i = 0; i < 20; i++) c.pressButton("1");
assert("Max input length = 18", c.currentInput.length, 18);

// Delete from error state -> clear
c = pressSeq(["5", "divide", "0", "equals"]);
assert("Error state", c.errorState, true);
c.pressButton("delete");
assert("Delete from error -> clear", c.errorState, false);
assert("Delete from error -> 0", c.currentInput, "0");

// Digit after evaluation resets
c = pressSeq(["5", "add", "3", "equals"]);
assert("5+3=8", c.currentInput, "8");
c.pressButton("2");
assert("Digit after eval resets", c.currentInput, "2");

// =============================================================================
// 9. SANITIZE INPUT
// =============================================================================
section("9. _sanitizeCurrentInput");

c = createCalculator(pluginApi);
c.currentInput = "";
assert("Empty -> 0", c._sanitizeCurrentInput(), "0");

c.currentInput = "-";
assert("Dash -> 0", c._sanitizeCurrentInput(), "0");

c.currentInput = "3.";
assert("Trailing dot -> 3.0", c._sanitizeCurrentInput(), "3.0");

c.currentInput = "42";
assert("Normal -> 42", c._sanitizeCurrentInput(), "42");

// =============================================================================
// 10. NUMBER TO STRING
// =============================================================================
section("10. _numberToString");

c = createCalculator(pluginApi);
assert("0 -> '0'", c._numberToString(0), "0");
assert("42 -> '42'", c._numberToString(42), "42");
assert("3.14159265 -> precision 8", c._numberToString(3.14159265358979), "3.14159265");
assert("-0 -> '0'", c._numberToString(-0), "0");
assert("Infinity -> null", c._numberToString(Infinity), "null");
assert("NaN -> null", c._numberToString(NaN), "null");

// =============================================================================
// 11. COMPACT DISPLAY
// =============================================================================
section("11. compactDisplay");

c = createCalculator(pluginApi);
assert("Short text unchanged", c.compactDisplay("123", 9), "123");
assert("Long number -> exponential", c.compactDisplay("123456789012", 9).length <= 9, true);
assert("Empty -> empty", c.compactDisplay("", 9), "");

// =============================================================================
// 12. FORMAT EXPRESSION
// =============================================================================
section("12. _formatExpression");

c = createCalculator(pluginApi);
assert("Format [2, +, 3]", c._formatExpression(["2", "+", "3"]), "2 + 3");
assert("Format * -> x", c._formatExpression(["5", "*", "3"]), "5 x 3");

// =============================================================================
// 13. EXPRESSION PREVIEW
// =============================================================================
section("13. expressionPreview");

c = createCalculator(pluginApi);
c.pressButton("5"); c.pressButton("add");
assert("Preview during input: '5 + 5'", c.expressionPreview().startsWith("5 +"), true);

c.pressButton("3"); c.pressButton("equals");
assert("Preview after eval", c.lastExpression, "5 + 3");

// =============================================================================
// 14. ADVANCED MATH DIRECT (evaluate via AdvancedMath.js import)
// =============================================================================
section("14. AdvancedMath.evaluate (direct)");

const math = mathLib;
assert("mathLib loaded", math !== null, true);
assert("evaluate exists", typeof math.evaluate, "function");

assert("2 + 3", math.evaluate("2 + 3"), 5);
assert("10 - 4", math.evaluate("10 - 4"), 6);
assert("6 * 7", math.evaluate("6 * 7"), 42);
assert("20 / 4", math.evaluate("20 / 4"), 5);
assert("2 + 3 * 4 (precedence)", math.evaluate("2 + 3 * 4"), 14);
assert("(2 + 3) * 4", math.evaluate("(2 + 3) * 4"), 20);
assertClose("sqrt(16)", math.evaluate("sqrt(16)"), 4);
assertClose("cbrt(27)", math.evaluate("cbrt(27)"), 3);
assertClose("abs(-5)", math.evaluate("abs(-5)"), 5);
assertClose("floor(3.7)", math.evaluate("floor(3.7)"), 3);
assertClose("ceil(3.2)", math.evaluate("ceil(3.2)"), 4);
assertClose("round(3.5)", math.evaluate("round(3.5)"), 4);
assertClose("trunc(3.9)", math.evaluate("trunc(3.9)"), 3);
assertClose("sin(0)", math.evaluate("sin(0)"), 0);
assertClose("cos(0)", math.evaluate("cos(0)"), 1);
assertClose("tan(0)", math.evaluate("tan(0)"), 0);
assertClose("exp(1)", math.evaluate("exp(1)"), Math.E);
assertClose("ln(1)", math.evaluate("ln(1)"), 0);
assertClose("log(100)", math.evaluate("log(100)"), 2);
assertClose("pow(2,10)", math.evaluate("pow(2,10)"), 1024);
assertClose("min(3,1,2)", math.evaluate("min(3,1,2)"), 1);
assertClose("max(3,1,2)", math.evaluate("max(3,1,2)"), 3);

// Division by zero should throw
let divByZeroOk = false;
try { math.evaluate("1 / 0"); } catch { divByZeroOk = true; }
assert("1/0 throws", divByZeroOk, true);

// Invalid expression should throw
let invalidOk = false;
try { math.evaluate("eval('bad')"); } catch { invalidOk = true; }
assert("Invalid expr throws", invalidOk, true);

// =============================================================================
// 15. DISPLAY TEXT & BADGE
// =============================================================================
section("15. displayText & badgeText");

c = createCalculator(pluginApi);
assert("Initial displayText = '0'", c.displayText, "0");
c.pressButton("5"); c.pressButton("add"); c.pressButton("3"); c.pressButton("equals");
assert("After 5+3 displayText = '8'", c.displayText, "8");
assert("badgeText short value", c.badgeText, "8");

c._setError();
assert("Error displayText", c.displayText, "Error");

// =============================================================================
// 16. FULL WORKFLOW: complex multi-step calculation
// =============================================================================
section("16. Full Workflow");

// 123 + 456 = 579, then * 2 = 1158, then / 3 = 386
c = pressSeq(["1", "2", "3", "add", "4", "5", "6", "equals"]);
assert("123 + 456 = 579", c.currentInput, "579");
c.pressButton("multiply"); c.pressButton("2"); c.pressButton("equals");
assert("579 * 2 = 1158", c.currentInput, "1158");
c.pressButton("divide"); c.pressButton("3"); c.pressButton("equals");
assert("1158 / 3 = 386", c.currentInput, "386");

// Negative chaining: -10 + 25 = 15
c = pressSeq(["1", "0", "sign", "add", "2", "5", "equals"]);
assert("-10 + 25 = 15", c.currentInput, "15");

// Percent then continue: 200 -> 2 (percent) -> + 3 = 5
c = createCalculator(pluginApi);
c.pressButton("2"); c.pressButton("0"); c.pressButton("0"); c.pressButton("percent");
assert("200% = 2", c.currentInput, "2");
c.pressButton("add"); c.pressButton("3"); c.pressButton("equals");
assert("2 + 3 = 5", c.currentInput, "5");

// =============================================================================
// 17. pressButton routing
// =============================================================================
section("17. pressButton routing");

c = createCalculator(pluginApi);
c.pressButton("9");
assert("pressButton '9'", c.currentInput, "9");
c.pressButton("decimal");
assert("pressButton 'decimal'", c.currentInput, "9.");
c.pressButton("5");
c.pressButton("add");
assert("pressButton 'add' sets operator", c.tokens.length > 0, true);
c.pressButton("1");
c.pressButton("equals");
assert("9.5 + 1 = 10.5", c.currentInput, "10.5");

// =============================================================================
// RESULTS
// =============================================================================
console.log("\n" + "=".repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  for (const f of failures) {
    console.log(`  FAIL: ${f.testName}`);
    console.log(`    expected: ${f.expected}`);
    console.log(`    actual:   ${f.actual}`);
  }
}
console.log("=".repeat(60));
process.exit(failed > 0 ? 1 : 0);
