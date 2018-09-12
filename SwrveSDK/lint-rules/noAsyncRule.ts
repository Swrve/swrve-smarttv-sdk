import * as ts from "typescript";
import * as lint from "tslint";

export class Rule extends lint.Rules.AbstractRule {
    public apply(sourceFile: ts.SourceFile): lint.RuleFailure[] {
        return this.applyWithWalker(new NoAsyncWalker(sourceFile, this.getOptions()));
    }
}

class NoAsyncWalker extends lint.RuleWalker {
    protected visitFunctionDeclaration(node: ts.FunctionDeclaration): void {
        if (node.modifiers == null) {
            return;
        }

        if (node.modifiers.findIndex(modifier =>
                modifier.kind === ts.SyntaxKind.AsyncKeyword) >= 0) {
            this.addFailureAtNode(node, "Do not declare functions async. Use Promises instead.");
        }
    }
}