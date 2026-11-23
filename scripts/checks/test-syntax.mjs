import { createRequire } from "node:module";

const require = createRequire(new URL("../../package.json", import.meta.url));
const ts = require("typescript");

const taskNames = new Set(["it", "test"]);
const testNames = new Set([...taskNames, "describe", "suite"]);
const skipOptions = new Set(["skip", "only", "todo"]);
const skipMethods = new Set([...skipOptions, "skipIf", "runIf"]);
const testFactories = new Set(["each", "for", "skipIf", "runIf", "extend"]);
const assertionMethods = new Set(["soft", "assertions"]);

function isTestFactory(expression, names = testNames) {
	return ts.isPropertyAccessExpression(expression) &&
		testFactories.has(expression.name.text) &&
		isTestExpression(expression.expression, names);
}

function isTestExpression(expression, names = testNames) {
	if (ts.isIdentifier(expression)) return names.has(expression.text);
	if (ts.isPropertyAccessExpression(expression)) return isTestExpression(expression.expression, names);
	if (ts.isCallExpression(expression)) return isTestFactory(expression.expression, names);
	return ts.isTaggedTemplateExpression(expression) && isTestFactory(expression.tag, names);
}

function localChecker(source) {
	const options = { noLib: true, noResolve: true };
	const host = ts.createCompilerHost(options);
	host.getSourceFile = path => path === source.fileName ? source : undefined;
	return ts.createProgram([source.fileName], options, host).getTypeChecker();
}

function contextSkipBindings(parameter) {
	if (ts.isIdentifier(parameter)) return [parameter];
	if (!ts.isObjectBindingPattern(parameter)) return [];
	return parameter.elements
		.filter(({ propertyName, name }) => {
			const property = propertyName ?? name;
			return (ts.isIdentifier(property) || ts.isStringLiteral(property)) && property.text === "skip";
		})
		.map(({ name }) => name)
		.filter(ts.isIdentifier);
}

function isAssertion(expression) {
	if (ts.isPropertyAccessExpression(expression)) {
		if (!assertionMethods.has(expression.name.text)) return false;
		expression = expression.expression;
	}
	return ts.isIdentifier(expression) && expression.text === "expect";
}

function assertionExpression(call) {
	let expression = call;
	for (let parent = expression.parent; parent; parent = expression.parent) {
		if (!(ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent) ||
			ts.isCallExpression(parent)) || parent.expression !== expression) break;
		expression = parent;
	}
	return expression;
}

function assertionTokens(expression, source) {
	const tokens = [];
	function visit(node) {
		const children = node.getChildren(source);
		if (children.length) children.forEach(visit);
		else tokens.push(node.getText(source));
	}
	visit(expression);
	return JSON.stringify(tokens);
}

export function readTestSyntax(path, content) {
	const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
	const lineAt = position => source.getLineAndCharacterOfPosition(position).line + 1;
	const skipped = [];
	const assertions = [];
	const recordSkip = (start, end = start) => skipped.push({ first: lineAt(start), last: lineAt(end) });
	let declarations = 0;
	let checker;

	function recordSkipOptions(call) {
		for (const argument of call.arguments) {
			if (!ts.isObjectLiteralExpression(argument)) continue;
			for (const property of argument.properties) {
				if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue;
				const { name } = property;
				if ((ts.isIdentifier(name) || ts.isStringLiteral(name)) && skipOptions.has(name.text)) {
					recordSkip(name.getStart(source), property.end);
				}
			}
		}
	}

	function recordContextSkips(call) {
		const callback = call.arguments.find(argument => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));
		const parameter = callback?.parameters[0]?.name;
		if (!parameter) return;
		const bindings = contextSkipBindings(parameter);
		if (!bindings.length) return;
		const memberCall = ts.isIdentifier(parameter);

		function inspect(node) {
			if (ts.isCallExpression(node)) {
				const { expression } = node;
				const target = memberCall
					? ts.isPropertyAccessExpression(expression) && expression.name.text === "skip" && expression.expression
					: expression;
				if (target && ts.isIdentifier(target)) {
					const binding = bindings.find(name => name.text === target.text);
					if (binding) {
						checker ??= localChecker(source);
						if (checker.getSymbolAtLocation(target)?.valueDeclaration === binding.parent) {
							recordSkip(node.getStart(source), expression.end);
						}
					}
				}
			}
			ts.forEachChild(node, inspect);
		}

		inspect(callback.body);
	}

	function visit(node) {
		if (ts.isPropertyAccessExpression(node) && skipMethods.has(node.name.text) &&
			isTestExpression(node.expression)) {
			recordSkip(node.name.getStart(source));
		}
		if (ts.isCallExpression(node)) {
			const { expression } = node;
			if (isTestExpression(expression) && !isTestFactory(expression)) {
				declarations++;
				recordSkipOptions(node);
				if (isTestExpression(expression, taskNames)) recordContextSkips(node);
			}
			if (isAssertion(expression)) {
				assertions.push({
					first: lineAt(node.getStart(source)),
					text: assertionTokens(assertionExpression(node), source),
				});
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(source);
	return { declarations, skipped, assertions };
}
