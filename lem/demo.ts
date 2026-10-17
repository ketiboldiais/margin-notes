/** A self-contained Pratt expression parser in TypeScript. */
export type Expression =
    | NumberExpression
    | IdentifierExpression
    | UnaryExpression
    | BinaryExpression
    | CallExpression;

export interface NumberExpression {
    kind: "Number";
    value: number;
}

export interface IdentifierExpression {
    kind: "Identifier";
    name: string;
}

export interface UnaryExpression {
    kind: "Unary";
    operator: string;
    operand: Expression;
}

export interface BinaryExpression {
    kind: "Binary";
    operator: string;
    left: Expression;
    right: Expression;
}

export interface CallExpression {
    kind: "Call";
    callee: Expression;
    arguments: Expression[];
}

export type TokenType =
    | "Number"
    | "Identifier"
    | "Operator"
    | "LeftParen"
    | "RightParen"
    | "Comma"
    | "EOF";

export interface Token {
    type: TokenType;
    value: string;
    position: number;
}

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let position = 0;

    while (position < source.length) {
        const remaining = source.slice(position);

        if (/^\s/.test(remaining)) {
            position++;
            continue;
        }

        const start = position;
        const number = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(remaining);
        if (number) {
            tokens.push({ type: "Number", value: number[0], position: start });
            position += number[0].length;
            continue;
        }

        const identifier = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(remaining);
        if (identifier) {
            tokens.push({ type: "Identifier", value: identifier[0], position: start });
            position += identifier[0].length;
            continue;
        }

        const operator = /^(?:==|!=|<=|>=|[+\-*/^!<>])/.exec(remaining);
        if (operator) {
            tokens.push({ type: "Operator", value: operator[0], position: start });
            position += operator[0].length;
            continue;
        }

        const punctuation: Record<string, TokenType> = {
            "(": "LeftParen",
            ")": "RightParen",
            ",": "Comma",
        };
        const character = source[position];
        if (Object.prototype.hasOwnProperty.call(punctuation, character)) {
            tokens.push({ type: punctuation[character], value: character, position });
            position++;
            continue;
        }

        throw new SyntaxError(`Unexpected character '${character}' at position ${position}`);
    }

    tokens.push({ type: "EOF", value: "", position });
    return tokens;
}

export class Parser {
    private position = 0;

    constructor(private readonly tokens: Token[]) {}

    private peek(): Token {
        return this.tokens[this.position];
    }

    private advance(): Token {
        return this.tokens[this.position++];
    }

    private expect(type: TokenType): Token {
        const token = this.peek();
        if (token.type !== type) {
            throw new SyntaxError(
                `Expected ${type}, found '${token.value}' at position ${token.position}`
            );
        }
        return this.advance();
    }

    private bindingPower(operator: string): [number, number] | null {
        switch (operator) {
            case "==":
            case "!=":
                return [10, 11];
            case "<":
            case ">":
            case "<=":
            case ">=":
                return [20, 21];
            case "+":
            case "-":
                return [30, 31];
            case "*":
            case "/":
                return [40, 41];
            case "^":
                return [60, 60];
            default:
                return null;
        }
    }

    public parse(): Expression {
        const expression = this.parseExpression(0);
        this.expect("EOF");
        return expression;
    }

    private parseExpression(minimumBindingPower: number): Expression {
        let left = this.parsePrefix();

        while (true) {
            const token = this.peek();

            if (token.type === "LeftParen") {
                const leftBP = 80;
                if (leftBP < minimumBindingPower) break;
                left = this.parseCall(left);
                continue;
            }

            if (token.type !== "Operator") break;
            const powers = this.bindingPower(token.value);
            if (powers === null) break;
            const [leftBP, rightBP] = powers;
            if (leftBP < minimumBindingPower) break;

            this.advance();
            const right = this.parseExpression(rightBP);
            left = { kind: "Binary", operator: token.value, left, right };
        }

        return left;
    }

    private parsePrefix(): Expression {
        const token = this.advance();
        switch (token.type) {
            case "Number":
                return { kind: "Number", value: Number(token.value) };
            case "Identifier":
                return { kind: "Identifier", name: token.value };
            case "Operator":
                if (["-", "+", "!"].includes(token.value)) {
                    return {
                        kind: "Unary",
                        operator: token.value,
                        operand: this.parseExpression(50),
                    };
                }
                break;
            case "LeftParen": {
                const expression = this.parseExpression(0);
                this.expect("RightParen");
                return expression;
            }
        }
        throw new SyntaxError(
            `Unexpected token '${token.value}' at position ${token.position}`
        );
    }

    private parseCall(callee: Expression): Expression {
        this.expect("LeftParen");
        const args: Expression[] = [];
        if (this.peek().type !== "RightParen") {
            while (true) {
                args.push(this.parseExpression(0));
                if (this.peek().type !== "Comma") break;
                this.advance();
            }
        }
        this.expect("RightParen");
        return { kind: "Call", callee, arguments: args };
    }
}

export function parse(source: string): Expression {
    return new Parser(tokenize(source)).parse();
}

// Example usage: uncomment to run a set of sample expressions.
// const examples = [
//     "1 + 2 * 3",
//     "(1 + 2) * 3",
//     "10 - 5 - 2",
//     "2 ^ 3 ^ 4",
//     "-2 ^ 2",
//     "a + b * c",
//     "f(x, y + 2)",
//     "f(x)(y)",
//     "!(x == 10)",
//     "a < b + c * 2",
// ];
// for (const source of examples) {
//     console.log(`\nExpression: ${source}`);
//     console.dir(parse(source), { depth: null });
// }
