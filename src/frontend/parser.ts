import { TokenType, Token } from "../types/tokens.js";
import type {
    Program,
    FunctionDeclaration,
    BlockStatement,
    Statement,
    Declaration,
    ReturnStatement,
    Identifier,
    BinaryExpression,
    Expression,
    BinaryOperator,
    SimpleLiteral,
    AssignmentExpression
} from "../types/nodes.js";

export class Parser {
    idx: number;

    constructor(readonly tokens: Token[]) {
        this.idx = 0;
    }

    static parse = (input: Token[]) => new Parser(input).parse();

    parse(): Program {
        const program: Program = {
            type: "Program",
            body: []
        };

        // only functions can be top level right now
        $: while (this.idx < this.tokens.length) {
            switch (this.tokens[this.idx].type) {
                case TokenType.FN:
                    this.idx++;
                    const node = this.parseFunction();
                    program.body.push(node);
                    break;
                default:
                    break $;
            }
        }

        this.expectToken(TokenType.EOF);

        return program;
    }

    private expectToken(type: TokenType) {
        if (this.tokens[this.idx].type !== type) {
            throw new Error(`Expected token of type ${type}, got ${this.tokens[this.idx].value}`);
        }
    }

    /*
    fn identifier(variable: type): type {
        // body
        return 
    }
    */
    private parseFunction(): FunctionDeclaration {
        this.expectToken(TokenType.IDENTIFIER);

        const name = this.tokens[this.idx++].value;

        this.expectToken(TokenType.LEFT_PAREN);
        this.idx++;
        // todo: parse params
        this.expectToken(TokenType.RIGHT_PAREN);
        this.idx++;
        this.expectToken(TokenType.COLON);
        this.idx++;

        this.expectToken(TokenType.IDENTIFIER);
        const return_type = this.tokens[this.idx].value;
        this.idx++;

        const body = this.parseBlock();

        return {
            type: "FunctionDeclaration",
            id: {
                type: "Identifier",
                name
            },
            params: [],
            returnType: {
                type: "Identifier",
                name: return_type
            },
            body
        };
    }

    private parseBlock(): BlockStatement {
        this.expectToken(TokenType.LEFT_BRACE);
        this.idx++;

        const expression: BlockStatement = {
            type: "BlockStatement",
            body: []
        };

        while (this.tokens[this.idx].type !== TokenType.RIGHT_BRACE) {
            const node = this.parseStatement();
            expression.body.push(node);
        }

        this.expectToken(TokenType.RIGHT_BRACE);
        this.idx++;

        return expression;
    }

    private parseStatement(): Statement {
        let statement: Statement;

        if (this.tokens[this.idx].type === TokenType.RETURN) {
            this.idx++;
            const expression = this.parseExpression();
            statement = {
                type: "ReturnStatement",
                argument: expression
            } as ReturnStatement;
        } else if (
            this.tokens[this.idx].type === TokenType.IDENTIFIER &&
            this.tokens[this.idx + 1].type === TokenType.IDENTIFIER &&
            this.tokens[this.idx + 2].type === TokenType.ASSIGNMENT
        ) {
            statement = this.parseVariableDeclarationOrAssignment("declaration");
        } else {
            statement = {
                type: "ExpressionStatement",
                expression: this.parseExpression()
            } as ExpressionStatement;
        }

        // statements end with a semicolon
        this.expectToken(TokenType.SEMICOLON);
        this.idx++;

        return statement;
    }

        if (type === "declaration") {
            const variable_type = this.tokens[this.idx++].value,
                variable_name = this.tokens[this.idx++].value;

            variable = {
                type: "VariableDeclaration",
                declarations: [
                    {
                        type: "VariableDeclarator",
                        id: {
                            type: "Identifier",
                            name: variable_name
                        },
                        typeAnnotation: {
                            type: "Identifier",
                            name: variable_type
                        },
                        init: null
                    }
                ]
            };

            if (this.tokens[this.idx].type === TokenType.ASSIGNMENT) {
                this.idx++;
                variable.declarations[0].init = this.parseExpression();
            }
        } else if (type === "assignment") {
            const variable_name = this.tokens[this.idx++].value;

            variable = {
                type: "AssignmentExpression",
                operator: "=",
                left: {
                    type: "Identifier",
                    name: variable_name
                },
                right: this.parseExpression()
            };
        } else {
            throw new Error("Unknown variable operation");
        }

        return variable;
    }

    private parseExpression(): Expression {
        // only binary expressions and literals are supported right now
        let left: Identifier | SimpleLiteral;

        if (this.tokens[this.idx].type === TokenType.IDENTIFIER) {
            left = {
                type: "Identifier",
                name: this.tokens[this.idx].value
            };
            this.idx++;
        } else if (this.tokens[this.idx].type === TokenType.NUMBER) {
            left = {
                type: "Literal",
                value: this.tokens[this.idx].value
            };
            this.idx++;
        } else {
            throw new Error("Expected an identifier or a number");
        }

        if (this.tokens[this.idx].value === ";") {
            this.idx++;
            return left;
        }

        if (this.tokens[this.idx].value !== "+" && this.tokens[this.idx].value !== "-") {
            throw new Error("Expected a plus or minus, got " + this.tokens[this.idx].value);
        }
        const operator: BinaryOperator = this.tokens[this.idx].value as unknown as BinaryOperator;
        this.idx++;

        let right: Identifier | SimpleLiteral;

        if (this.tokens[this.idx].type === TokenType.IDENTIFIER) {
            right = {
                type: "Identifier",
                name: this.tokens[this.idx].value
            };
            this.idx++;
        } else if (this.tokens[this.idx].type === TokenType.NUMBER) {
            right = {
                type: "Literal",
                value: this.tokens[this.idx].value
            };
            this.idx++;
        } else {
            throw new Error("Expected an identifier or a number");
        }

        const binary_expression: BinaryExpression = {
            type: "BinaryExpression",
            operator,
            left,
            right
        };

        this.expectToken(TokenType.SEMICOLON);
        this.idx++;

        return binary_expression;
    }
}
