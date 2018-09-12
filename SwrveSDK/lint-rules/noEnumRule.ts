import * as ts from "typescript";
import * as lint from "tslint";

export class Rule extends lint.Rules.AbstractRule {
    public apply(sourceFile: ts.SourceFile): lint.RuleFailure[] {
        return this.applyWithWalker(new NoEnumWalker(sourceFile, this.getOptions()));
    }
}

function escapeString(text: string): string {
    return '"' + text.replace(/"/g, '\\"') + '"';
}

class NoEnumWalker extends lint.RuleWalker {
    protected visitEnumDeclaration(node: ts.EnumDeclaration): void {
        const name = node.name.text;
        const members = node.members.map(member => member.name)
            .filter(memberName => memberName.kind === ts.SyntaxKind.Identifier
                || memberName.kind === ts.SyntaxKind.StringLiteral
                || memberName.kind === ts.SyntaxKind.NumericLiteral)
            .map(memberName => (memberName as ts.Identifier | ts.StringLiteral | ts.NumericLiteral)
                .text);

        const fix = (name && members.length >= 2)
            ? new lint.Replacement(node.getStart(), node.getWidth(),
                "type " + name + " = " + members.map(escapeString).join(" | ") + ";")
            : undefined;

        this.addFailureAtNode(node, "Do not use enums. Use a union of string literal types instead.", fix);
    }
}
