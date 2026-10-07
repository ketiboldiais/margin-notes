enum TOKENTYPE {
  // Structure
  NEWLINE = "NEWLINE",
  INDENT = "INDENT",
  DEDENT = "DEDENT",
  EOF = "EOF",

  // Literals
  IDENTIFIER = "IDENTIFIER",
  NUMBER = "NUMBER",
  STRING = "STRING",

  // Keywords
  IF = "IF",
  ELSE = "ELSE",
  WHILE = "WHILE",
  RETURN = "RETURN",
  LET = "LET",
  TRUE = "TRUE",
  FALSE = "FALSE",

  // Operators
  PLUS = "PLUS",
  MINUS = "MINUS",
  STAR = "STAR",
  SLASH = "SLASH",
  EQUAL = "EQUAL",
  EQUAL_EQUAL = "EQUAL_EQUAL",
  BANG_EQUAL = "BANG_EQUAL",
  LESS = "LESS",
  LESS_EQUAL = "LESS_EQUAL",
  GREATER = "GREATER",
  GREATER_EQUAL = "GREATER_EQUAL",

  // Punctuation
  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",
  COMMA = "COMMA",
  COLON = "COLON",
}

interface Token {
  type: TOKENTYPE;
  lexeme: string;
  line: number;
  column: number;
}

class TokenizerError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(`${message} at ${line}:${column}`);
    this.name = "TokenizerError";
  }
}

class Tokenizer {
  private readonly tokens: Token[] = [];

  /*
   * Stack of indentation levels.
   *
   * The base level is always 0.
   *
   * Example:
   *
   * [
   *   0,
   *   1,
   *   2
   * ]
   *
   * means we are currently nested two blocks deep.
   */
  private readonly indentStack: number[] = [0];

  private readonly keywords: Record<string, TOKENTYPE> = {
    if: TOKENTYPE.IF,
    else: TOKENTYPE.ELSE,
    while: TOKENTYPE.WHILE,
    return: TOKENTYPE.RETURN,
    let: TOKENTYPE.LET,
    true: TOKENTYPE.TRUE,
    false: TOKENTYPE.FALSE,
  };

  tokenize(source: string): Token[] {
    this.tokens.length = 0;
    this.indentStack.length = 1;
    this.indentStack[0] = 0;

    // Normalize line endings.
    const lines = source.replace(/\r\n?/g, "\n").split("\n");

    for (let i = 0; i < lines.length; i++) {
      this.tokenizeLine(lines[i], i + 1);
    }

    // Close any blocks still open at EOF.
    while (this.indentStack.length > 1) {
      this.indentStack.pop();

      this.tokens.push({
        type: TOKENTYPE.DEDENT,
        lexeme: "",
        line: lines.length,
        column: 1,
      });
    }

    this.tokens.push({
      type: TOKENTYPE.EOF,
      lexeme: "",
      line: lines.length,
      column: 1,
    });

    return this.tokens;
  }

  private tokenizeLine(line: string, lineNumber: number): void {
    /*
     * Ignore blank lines and comment-only lines for purposes
     * of indentation.
     */
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      return;
    }

    const indent = this.countIndentation(line, lineNumber);

    this.handleIndentation(indent, lineNumber);

    let current = indent;

    while (current < line.length) {
      const char = line[current];

      // Spaces are fine after indentation.
      if (char === " ") {
        current++;
        continue;
      }

      // Tabs are not allowed in the middle of a line.
      if (char === "\t") {
        throw new TokenizerError(
          "Unexpected tab",
          lineNumber,
          current + 1,
        );
      }

      // Comment: ignore the rest of the line.
      if (char === "#") {
        break;
      }

      if (this.isDigit(char)) {
        current = this.scanNumber(line, current, lineNumber);
        continue;
      }

      if (this.isIdentifierStart(char)) {
        current = this.scanIdentifier(line, current, lineNumber);
        continue;
      }

      if (char === '"' || char === "'") {
        current = this.scanString(line, current, lineNumber);
        continue;
      }

      current = this.scanOperator(line, current, lineNumber);
    }

    this.tokens.push({
      type: TOKENTYPE.NEWLINE,
      lexeme: "\n",
      line: lineNumber,
      column: line.length + 1,
    });
  }

  // ------------------------------------------------------------
  // Indentation
  // ------------------------------------------------------------

  private countIndentation(line: string, lineNumber: number): number {
    let tabs = 0;

    while (tabs < line.length && line[tabs] === "\t") {
      tabs++;
    }

    /*
     * A space before the first real token means someone tried
     * to indent using spaces.
     */
    if (tabs < line.length && line[tabs] === " ") {
      throw new TokenizerError(
        "Blocks must be indented with tabs, not spaces",
        lineNumber,
        tabs + 1,
      );
    }

    return tabs;
  }

  private handleIndentation(
    indentation: number,
    lineNumber: number,
  ): void {
    const currentIndent =
      this.indentStack[this.indentStack.length - 1];

    if (indentation > currentIndent) {
      this.indentStack.push(indentation);

      this.tokens.push({
        type: TOKENTYPE.INDENT,
        lexeme: "",
        line: lineNumber,
        column: 1,
      });

      return;
    }

    if (indentation < currentIndent) {
      while (
        this.indentStack.length > 1 &&
        indentation <
          this.indentStack[this.indentStack.length - 1]
      ) {
        this.indentStack.pop();

        this.tokens.push({
          type: TOKENTYPE.DEDENT,
          lexeme: "",
          line: lineNumber,
          column: 1,
        });
      }

      /*
       * The new indentation must correspond to a previous
       * indentation level.
       */
      const expected =
        this.indentStack[this.indentStack.length - 1];

      if (indentation !== expected) {
        throw new TokenizerError(
          `Invalid dedent: indentation level ${indentation} does not match an outer block`,
          lineNumber,
          1,
        );
      }
    }
  }

  // ------------------------------------------------------------
  // Identifiers / keywords
  // ------------------------------------------------------------

  private scanIdentifier(
    line: string,
    start: number,
    lineNumber: number,
  ): number {
    let current = start + 1;

    while (
      current < line.length &&
      this.isIdentifierPart(line[current])
    ) {
      current++;
    }

    const lexeme = line.slice(start, current);

    const type =
      this.keywords[lexeme] ?? TOKENTYPE.IDENTIFIER;

    this.tokens.push({
      type,
      lexeme,
      line: lineNumber,
      column: start + 1,
    });

    return current;
  }

  // ------------------------------------------------------------
  // Numbers
  // ------------------------------------------------------------

  private scanNumber(
    line: string,
    start: number,
    lineNumber: number,
  ): number {
    let current = start;

    while (
      current < line.length &&
      this.isDigit(line[current])
    ) {
      current++;
    }

    // Decimal number
    if (
      current < line.length - 1 &&
      line[current] === "." &&
      this.isDigit(line[current + 1])
    ) {
      current++;

      while (
        current < line.length &&
        this.isDigit(line[current])
      ) {
        current++;
      }
    }

    const lexeme = line.slice(start, current);

    this.tokens.push({
      type: TOKENTYPE.NUMBER,
      lexeme,
      line: lineNumber,
      column: start + 1,
    });

    return current;
  }

  // ------------------------------------------------------------
  // Strings
  // ------------------------------------------------------------

  private scanString(
    line: string,
    start: number,
    lineNumber: number,
  ): number {
    const quote = line[start];

    let current = start + 1;

    while (current < line.length) {
      if (line[current] === "\\") {
        // Skip escaped character.
        current += 2;
        continue;
      }

      if (line[current] === quote) {
        current++;

        const lexeme = line.slice(start, current);

        this.tokens.push({
          type: TOKENTYPE.STRING,
          lexeme,
          line: lineNumber,
          column: start + 1,
        });

        return current;
      }

      current++;
    }

    throw new TokenizerError(
      "Unterminated string",
      lineNumber,
      start + 1,
    );
  }

  // ------------------------------------------------------------
  // Operators / punctuation
  // ------------------------------------------------------------

  private scanOperator(
    line: string,
    current: number,
    lineNumber: number,
  ): number {
    const char = line[current];
    const next = line[current + 1];

    const add = (
      type: TOKENTYPE,
      length = 1,
    ): number => {
      this.tokens.push({
        type,
        lexeme: line.slice(current, current + length),
        line: lineNumber,
        column: current + 1,
      });

      return current + length;
    };

    switch (char) {
      case "+":
        return add(TOKENTYPE.PLUS);

      case "-":
        return add(TOKENTYPE.MINUS);

      case "*":
        return add(TOKENTYPE.STAR);

      case "/":
        return add(TOKENTYPE.SLASH);

      case "(":
        return add(TOKENTYPE.LEFT_PAREN);

      case ")":
        return add(TOKENTYPE.RIGHT_PAREN);

      case ",":
        return add(TOKENTYPE.COMMA);

      case ":":
        return add(TOKENTYPE.COLON);

      case "=":
        if (next === "=") {
          return add(TOKENTYPE.EQUAL_EQUAL, 2);
        }

        return add(TOKENTYPE.EQUAL);

      case "!":
        if (next === "=") {
          return add(TOKENTYPE.BANG_EQUAL, 2);
        }

        break;

      case "<":
        if (next === "=") {
          return add(TOKENTYPE.LESS_EQUAL, 2);
        }

        return add(TOKENTYPE.LESS);

      case ">":
        if (next === "=") {
          return add(TOKENTYPE.GREATER_EQUAL, 2);
        }

        return add(TOKENTYPE.GREATER);
    }

    throw new TokenizerError(
      `Unexpected character '${char}'`,
      lineNumber,
      current + 1,
    );
  }

  // ------------------------------------------------------------
  // Character classes
  // ------------------------------------------------------------

  private isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  private isIdentifierStart(char: string): boolean {
    return (
      (char >= "a" && char <= "z") ||
      (char >= "A" && char <= "Z") ||
      char === "_"
    );
  }

  private isIdentifierPart(char: string): boolean {
    return (
      this.isIdentifierStart(char) ||
      this.isDigit(char)
    );
  }
}