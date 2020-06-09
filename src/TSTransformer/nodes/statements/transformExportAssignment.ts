import ts from "byots";
import * as lua from "LuaAST";
import { diagnostics } from "Shared/diagnostics";
import { TransformState } from "TSTransformer";
import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import { isDefinedAsLet } from "TSTransformer/util/isDefinedAsLet";
import { isSymbolOfValue } from "TSTransformer/util/isSymbolOfValue";

function transformExportEquals(state: TransformState, node: ts.ExportAssignment) {
	const symbol = state.typeChecker.getSymbolAtLocation(node.expression);
	if (symbol && isDefinedAsLet(state, symbol)) {
		state.addDiagnostic(diagnostics.noExportAssignmentLet(node));
	}

	if (symbol && isSymbolOfValue(symbol)) {
		return lua.list.make<lua.Statement>();
	}

	state.hasExportEquals = true;

	const finalStatement = state.sourceFile.statements[state.sourceFile.statements.length - 1];
	if (finalStatement === node) {
		return lua.list.make<lua.Statement>(
			lua.create(lua.SyntaxKind.ReturnStatement, { expression: transformExpression(state, node.expression) }),
		);
	} else {
		return lua.list.make<lua.Statement>(
			lua.create(lua.SyntaxKind.VariableDeclaration, {
				left: state.getModuleIdFromNode(node),
				right: transformExpression(state, node.expression),
			}),
		);
	}
}

export function transformExportAssignment(state: TransformState, node: ts.ExportAssignment) {
	if (node.isExportEquals) {
		return transformExportEquals(state, node);
	}
	return lua.list.make<lua.Statement>();
}
