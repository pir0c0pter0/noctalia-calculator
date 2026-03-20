import QtQuick
import Quickshell

Item {
    id: root

    property var pluginApi: null

    readonly property var settings: pluginApi?.pluginSettings ?? ({})
    readonly property var defaults: pluginApi?.manifest?.metadata?.defaultSettings ?? ({})

    readonly property bool enabled: settings.enabled ?? defaults.enabled ?? true
    readonly property bool showBarValue: settings.showBarValue ?? defaults.showBarValue ?? true
    readonly property int precision: settings.precision ?? defaults.precision ?? 8
    readonly property int maxHistory: settings.maxHistory ?? defaults.maxHistory ?? 6
    readonly property string language: settings.language ?? defaults.language ?? "auto"

    property string _currentLang: ""
    property int translationVersion: 0
    property var _translations: _enStrings

    property var tokens: []
    property string currentInput: "0"
    property bool shouldResetInput: false
    property bool justEvaluated: false
    property bool errorState: false
    property string lastExpression: ""
    property var historyEntries: []

    readonly property bool hasExpression: tokens.length > 0 || currentInput !== "0" || justEvaluated
    readonly property string displayText: errorState ? t("state.error") : currentInput
    readonly property string expressionText: expressionPreview()
    readonly property var historyFeed: buildHistoryFeed()
    readonly property string badgeText: (!enabled || !showBarValue) ? "" : compactDisplay(displayText, 9)

    readonly property var _enStrings: ({
        "state": {
            "ready": "Ready",
            "disabled": "Disabled",
            "error": "Error"
        },
        "bar": {
            "enable": "Enable Calculator",
            "disable": "Disable Calculator",
            "clear": "Clear",
            "settings": "Settings",
            "tooltip-title": "Calculator",
            "tooltip-shortcuts": "Keyboard: numbers, + - * /, Enter, Backspace, Esc"
        },
        "panel": {
            "title": "Calculator",
            "subtitle": "Quick math in the bar",
            "keyboard-ready": "Keyboard ready",
            "keyboard-hint": "Enter = solve   Backspace = delete   Esc = clear",
            "mouse-hint": "Click any key below or type directly.",
            "history": "Recent results",
            "no-history": "No calculations yet.",
            "clear-history": "Clear history",
            "expression-idle": "Start typing or click a button",
            "disabled-note": "The calculator is disabled. Use the toggle to turn it back on.",
            "live-value": "Live value"
        },
        "settings": {
            "enabled": "Enable calculator",
            "enabled-desc": "Keep the calculator active in the bar and panel",
            "show-bar": "Show value in bar",
            "show-bar-desc": "Display the current value next to the calculator icon",
            "precision": "Decimal precision",
            "precision-desc": "Maximum decimals used when formatting results",
            "history": "Recent history size",
            "history-desc": "How many results are kept in the floating panel",
            "language": "Language",
            "language-desc": "Plugin display language",
            "lang-auto": "Auto",
            "lang-en": "English",
            "lang-pt": "Portuguese",
            "shortcuts": "Shortcuts",
            "shortcuts-desc": "Numbers, operators, Enter, Backspace, Esc/Delete, % and F9."
        }
    })

    readonly property var _ptStrings: ({
        "state": {
            "ready": "Pronta",
            "disabled": "Desativada",
            "error": "Erro"
        },
        "bar": {
            "enable": "Ativar calculadora",
            "disable": "Desativar calculadora",
            "clear": "Limpar",
            "settings": "Configuracoes",
            "tooltip-title": "Calculadora",
            "tooltip-shortcuts": "Teclado: numeros, + - * /, Enter, Backspace, Esc"
        },
        "panel": {
            "title": "Calculadora",
            "subtitle": "Conta rapida direto na barra",
            "keyboard-ready": "Teclado ativo",
            "keyboard-hint": "Enter = calcular   Backspace = apagar   Esc = limpar",
            "mouse-hint": "Clique nas teclas abaixo ou digite direto.",
            "history": "Resultados recentes",
            "no-history": "Ainda sem contas.",
            "clear-history": "Limpar historico",
            "expression-idle": "Comece digitando ou clique em um botao",
            "disabled-note": "A calculadora esta desativada. Use o toggle para ligar de novo.",
            "live-value": "Valor ao vivo"
        },
        "settings": {
            "enabled": "Ativar calculadora",
            "enabled-desc": "Mantem a calculadora ativa na barra e no painel",
            "show-bar": "Mostrar valor na barra",
            "show-bar-desc": "Exibe o valor atual ao lado do icone da calculadora",
            "precision": "Precisao decimal",
            "precision-desc": "Maximo de casas decimais ao formatar resultados",
            "history": "Tamanho do historico",
            "history-desc": "Quantos resultados ficam salvos no painel flutuante",
            "language": "Idioma",
            "language-desc": "Idioma de exibicao do plugin",
            "lang-auto": "Auto",
            "lang-en": "Ingles",
            "lang-pt": "Portugues",
            "shortcuts": "Atalhos",
            "shortcuts-desc": "Numeros, operadores, Enter, Backspace, Esc/Delete, % e F9."
        }
    })

    Component.onCompleted: _loadTranslations()

    onLanguageChanged: _loadTranslations()

    onMaxHistoryChanged: {
        const limit = Math.max(1, maxHistory);
        if (historyEntries.length > limit) {
            historyEntries = historyEntries.slice(0, limit);
        }
    }

    function _resolveLanguage() {
        if (language !== "auto") return language;
        const locale = Qt.locale().name;
        if (locale.startsWith("pt")) return "pt";
        return "en";
    }

    function _loadTranslations() {
        const lang = _resolveLanguage();
        if (lang === _currentLang) return;
        _translations = lang === "pt" ? _ptStrings : _enStrings;
        _currentLang = lang;
        translationVersion++;
    }

    function reloadLanguage(langCode) {
        let resolved = langCode;
        if (langCode === "auto") {
            const locale = Qt.locale().name;
            resolved = locale.startsWith("pt") ? "pt" : "en";
        }
        if (resolved === _currentLang) return;
        _translations = resolved === "pt" ? _ptStrings : _enStrings;
        _currentLang = resolved;
        translationVersion++;
    }

    function translate(key) {
        const parts = key.split(".");
        let current = _translations;
        for (let i = 0; i < parts.length; i++) {
            if (!current || typeof current !== "object" || !(parts[i] in current)) {
                return undefined;
            }
            current = current[parts[i]];
        }
        return typeof current === "string" ? current : undefined;
    }

    function t(key) {
        const version = translationVersion;
        if (version < 0) return key;
        return translate(key) ?? key;
    }

    function _isOperator(token) {
        return token === "+" || token === "-" || token === "*" || token === "/";
    }

    function _normalizeOperator(op) {
        if (op === "x" || op === "X") return "*";
        if (_isOperator(op)) return op;
        return "";
    }

    function _sanitizeCurrentInput() {
        if (currentInput === "" || currentInput === "-") return "0";
        if (currentInput.endsWith(".")) return currentInput + "0";
        if (currentInput === "-0") return "-0";
        return currentInput;
    }

    function _numberToString(value) {
        if (!Number.isFinite(value)) return null;

        let rounded = value;
        if (precision >= 0) {
            rounded = Number(value.toFixed(Math.max(0, Math.min(precision, 10))));
        }
        if (Object.is(rounded, -0)) rounded = 0;

        let text = rounded.toString();
        if (text.indexOf("e") >= 0 || text.indexOf("E") >= 0) {
            return text.replace("e+", "e");
        }

        if (text.length > 16 && rounded !== 0) {
            text = rounded.toExponential(Math.max(0, Math.min(precision, 6))).replace("e+", "e");
        }
        return text;
    }

    function compactDisplay(text, maxLength) {
        if (!text) return "";
        if (text.length <= maxLength) return text;
        const numeric = Number(text);
        if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
            const exp = numeric.toExponential(Math.max(0, Math.min(precision, 3))).replace("e+", "e");
            if (exp.length <= maxLength) return exp;
        }
        return text.slice(0, Math.max(1, maxLength - 1)) + "~";
    }

    function clearAll() {
        tokens = [];
        currentInput = "0";
        shouldResetInput = false;
        justEvaluated = false;
        errorState = false;
        lastExpression = "";
    }

    function clearHistory() {
        historyEntries = [];
    }

    function _resetAfterError() {
        clearAll();
    }

    function _setError() {
        tokens = [];
        currentInput = "0";
        shouldResetInput = false;
        justEvaluated = false;
        errorState = true;
        lastExpression = "";
    }

    function appendDigit(digit) {
        if (!enabled) return;
        if (errorState) _resetAfterError();

        if (justEvaluated && tokens.length === 0 && !shouldResetInput) {
            clearAll();
        }

        if (shouldResetInput) {
            currentInput = digit;
            shouldResetInput = false;
            justEvaluated = false;
            errorState = false;
            return;
        }

        if (currentInput === "0") {
            currentInput = digit;
        } else if (currentInput === "-0") {
            currentInput = "-" + digit;
        } else if (currentInput.length < 18) {
            currentInput += digit;
        }

        justEvaluated = false;
        errorState = false;
    }

    function appendDecimal() {
        if (!enabled) return;
        if (errorState) _resetAfterError();

        if (justEvaluated && tokens.length === 0 && !shouldResetInput) {
            clearAll();
        }

        if (shouldResetInput) {
            currentInput = "0.";
            shouldResetInput = false;
            justEvaluated = false;
            return;
        }

        if (currentInput.indexOf(".") === -1) {
            currentInput += ".";
        }
        justEvaluated = false;
    }

    function deleteLastChar() {
        if (!enabled) return;
        if (errorState) {
            clearAll();
            return;
        }
        if (justEvaluated) {
            clearAll();
            return;
        }
        if (shouldResetInput) {
            currentInput = "0";
            shouldResetInput = false;
            return;
        }

        if (currentInput.length <= 1 || (currentInput.length === 2 && currentInput.startsWith("-"))) {
            currentInput = "0";
            return;
        }

        currentInput = currentInput.slice(0, currentInput.length - 1);
    }

    function toggleSign() {
        if (!enabled || errorState) return;

        if (shouldResetInput) {
            currentInput = "0";
            shouldResetInput = false;
        }

        if (currentInput.startsWith("-")) {
            currentInput = currentInput.slice(1);
        } else {
            currentInput = "-" + currentInput;
        }

        if (currentInput === "-0") {
            justEvaluated = false;
            return;
        }

        justEvaluated = false;
    }

    function applyPercent() {
        if (!enabled || errorState) return;

        const numeric = Number(_sanitizeCurrentInput());
        if (Number.isNaN(numeric)) {
            _setError();
            return;
        }

        const formatted = _numberToString(numeric / 100);
        if (formatted === null) {
            _setError();
            return;
        }

        currentInput = formatted;
        shouldResetInput = false;
        justEvaluated = false;
    }

    function applyOperator(op) {
        if (!enabled || errorState) return;

        const operator = _normalizeOperator(op);
        if (!operator) return;

        if (justEvaluated && tokens.length === 0) {
            tokens = [currentInput, operator];
            shouldResetInput = true;
            justEvaluated = false;
            lastExpression = "";
            return;
        }

        if (shouldResetInput) {
            if (tokens.length > 0 && _isOperator(tokens[tokens.length - 1])) {
                const updated = tokens.slice(0, tokens.length - 1);
                updated.push(operator);
                tokens = updated;
            } else {
                tokens = tokens.concat([operator]);
            }
            lastExpression = "";
            return;
        }

        tokens = tokens.concat([_sanitizeCurrentInput(), operator]);
        shouldResetInput = true;
        justEvaluated = false;
        lastExpression = "";
    }

    function _buildEvaluationTokens() {
        const built = Array.from(tokens);
        if (!shouldResetInput || built.length === 0 || !_isOperator(built[built.length - 1])) {
            built.push(_sanitizeCurrentInput());
        }
        while (built.length > 0 && _isOperator(built[built.length - 1])) {
            built.pop();
        }
        return built;
    }

    function _buildDisplayTokens() {
        const built = Array.from(tokens);
        if (!shouldResetInput || built.length === 0 || !_isOperator(built[built.length - 1])) {
            built.push(_sanitizeCurrentInput());
        }
        return built;
    }

    function _applyTopOperator(values, operators) {
        if (values.length < 2 || operators.length < 1) return false;

        const operator = operators.pop();
        const right = values.pop();
        const left = values.pop();
        let result = 0;

        if (operator === "+") result = left + right;
        else if (operator === "-") result = left - right;
        else if (operator === "*") result = left * right;
        else if (operator === "/") {
            if (right === 0) return false;
            result = left / right;
        }

        if (!Number.isFinite(result)) return false;
        values.push(result);
        return true;
    }

    function _operatorPrecedence(operator) {
        if (operator === "+" || operator === "-") return 1;
        if (operator === "*" || operator === "/") return 2;
        return 0;
    }

    function _evaluateTokenArray(evaluationTokens) {
        const values = [];
        const operators = [];

        for (let i = 0; i < evaluationTokens.length; i++) {
            const token = evaluationTokens[i];
            if (_isOperator(token)) {
                while (operators.length > 0
                        && _operatorPrecedence(operators[operators.length - 1]) >= _operatorPrecedence(token)) {
                    if (!_applyTopOperator(values, operators)) return null;
                }
                operators.push(token);
                continue;
            }

            const numeric = Number(token);
            if (Number.isNaN(numeric)) return null;
            values.push(numeric);
        }

        while (operators.length > 0) {
            if (!_applyTopOperator(values, operators)) return null;
        }

        if (values.length !== 1 || !Number.isFinite(values[0])) return null;
        return values[0];
    }

    function _formatExpression(tokensToFormat) {
        const parts = [];
        for (let i = 0; i < tokensToFormat.length; i++) {
            const token = tokensToFormat[i];
            if (token === "*") parts.push("x");
            else parts.push(String(token));
        }
        return parts.join(" ");
    }

    function expressionPreview() {
        if (errorState) return lastExpression || "";
        if (justEvaluated && lastExpression) return lastExpression;

        const built = _buildDisplayTokens();
        if (built.length === 0 || (built.length === 1 && built[0] === "0" && !hasExpression)) {
            return "";
        }
        return _formatExpression(built);
    }

    function previewHistoryEntry() {
        if (errorState || justEvaluated || tokens.length === 0) return null;

        const expression = expressionPreview();
        if (expression === "") return null;

        let result = "";
        if (!shouldResetInput) {
            const evaluationTokens = _buildEvaluationTokens();
            if (evaluationTokens.length >= 3) {
                const numeric = _evaluateTokenArray(evaluationTokens);
                if (numeric !== null) {
                    const formatted = _numberToString(numeric);
                    if (formatted !== null) result = formatted;
                }
            }
        }

        return {
            "expression": expression,
            "result": result,
            "isPreview": true,
            "historyIndex": -1
        };
    }

    function buildHistoryFeed() {
        const preview = previewHistoryEntry();
        const savedEntries = historyEntries.map((entry, index) => ({
            "expression": entry.expression,
            "result": entry.result,
            "isPreview": false,
            "historyIndex": index
        }));
        if (preview) return [preview].concat(savedEntries);
        return savedEntries;
    }

    function evaluate() {
        if (!enabled || errorState) return;

        const evaluationTokens = _buildEvaluationTokens();
        if (evaluationTokens.length === 0) return;

        const expression = _formatExpression(evaluationTokens);
        const result = _evaluateTokenArray(evaluationTokens);
        if (result === null) {
            _setError();
            return;
        }

        const formatted = _numberToString(result);
        if (formatted === null) {
            _setError();
            return;
        }

        historyEntries = [{
            "expression": expression,
            "result": formatted
        }].concat(historyEntries).slice(0, Math.max(1, maxHistory));

        currentInput = formatted;
        tokens = [];
        shouldResetInput = false;
        justEvaluated = true;
        errorState = false;
        lastExpression = expression;
    }

    function pressButton(action) {
        if (!enabled && action !== "toggle-enabled") return;

        if (action >= "0" && action <= "9") {
            appendDigit(action);
            return;
        }

        if (action === "decimal") appendDecimal();
        else if (action === "add") applyOperator("+");
        else if (action === "subtract") applyOperator("-");
        else if (action === "multiply") applyOperator("*");
        else if (action === "divide") applyOperator("/");
        else if (action === "equals") evaluate();
        else if (action === "percent") applyPercent();
        else if (action === "sign") toggleSign();
        else if (action === "clear") clearAll();
        else if (action === "delete") deleteLastChar();
    }

    function actionForKeyEvent(event) {
        if ((event.modifiers & Qt.ControlModifier) || (event.modifiers & Qt.MetaModifier)) {
            return "";
        }

        const text = event.text ?? "";
        if (text >= "0" && text <= "9") {
            return text;
        }
        if (text === "." || text === ",") {
            return "decimal";
        }
        if (text === "+" || text === "-" || text === "*" || text === "/" || text === "x" || text === "X") {
            if (text === "+") return "add";
            if (text === "-") return "subtract";
            if (text === "/" ) return "divide";
            return "multiply";
        }
        if (text === "%") {
            return "percent";
        }
        if (text === "=") {
            return "equals";
        }

        if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
            return "equals";
        }
        if (event.key === Qt.Key_Backspace) {
            return "delete";
        }
        if (event.key === Qt.Key_Escape || event.key === Qt.Key_Delete) {
            return "clear";
        }
        if (event.key === Qt.Key_F9) {
            return "sign";
        }

        return "";
    }

    function handleKeyEvent(event) {
        if (!enabled) return false;

        const action = actionForKeyEvent(event);
        if (action === "") return false;

        pressButton(action);
        return true;
    }

    function tooltipText() {
        let text = t("bar.tooltip-title");
        if (!enabled) {
            return text + "\n" + t("state.disabled");
        }

        text += "\n" + expressionText;
        if (expressionText !== displayText) {
            text += "\n= " + displayText;
        }
        text += "\n" + t("bar.tooltip-shortcuts");
        return text;
    }

    function recallHistory(index) {
        const entry = historyEntries[index];
        if (!entry) return;
        tokens = [];
        currentInput = entry.result;
        shouldResetInput = false;
        justEvaluated = true;
        errorState = false;
        lastExpression = entry.expression;
    }
}
