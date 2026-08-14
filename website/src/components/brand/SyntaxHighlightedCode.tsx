import React from "react";

export type CodeLanguage = "bash" | "json" | "markup" | "tsx" | "yaml";

type TokenKind =
  | "attr-name"
  | "boolean"
  | "comment"
  | "function"
  | "keyword"
  | "number"
  | "operator"
  | "placeholder"
  | "property"
  | "punctuation"
  | "string"
  | "tag"
  | "variable";

type TokenRule = {
  kind: TokenKind;
  expression: RegExp;
};

type HighlightToken = {
  content: string;
  kind?: TokenKind;
};

const rules: Record<CodeLanguage, readonly TokenRule[]> = {
  bash: [
    { kind: "comment", expression: /#.*$/y },
    { kind: "string", expression: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
    { kind: "placeholder", expression: /<[\w.*-]+>/y },
    { kind: "variable", expression: /\$\{?[\w@#?-]+\}?/y },
    {
      kind: "variable",
      expression: /(?<=^|[\s|(])(?:--?|\/)[\w][\w:-]*(?:=[^\s\\]+)?/y,
    },
    {
      kind: "function",
      expression:
        /(?:dotnet|find|gh|git|grep|npm|npx|sed|sort|uniq|brew)\b/y,
    },
    { kind: "operator", expression: /(?:&&|\|\||[|;&])/y },
  ],
  json: [
    { kind: "property", expression: /"(?:\\.|[^"\\])*"(?=\s*:)/y },
    { kind: "string", expression: /"(?:\\.|[^"\\])*"/y },
    { kind: "boolean", expression: /\b(?:false|null|true)\b/y },
    { kind: "number", expression: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/iy },
    { kind: "punctuation", expression: /[{}[\],:]/y },
  ],
  markup: [
    { kind: "comment", expression: /<!--.*?-->/y },
    { kind: "tag", expression: /<\/?[A-Za-z][\w:-]*/y },
    { kind: "attr-name", expression: /[A-Za-z_:][\w:.-]*(?=\s*=)/y },
    { kind: "string", expression: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
    { kind: "punctuation", expression: /\/?>/y },
  ],
  tsx: [
    { kind: "comment", expression: /\/\/.*$|\/\*.*?\*\//y },
    { kind: "string", expression: /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
    { kind: "tag", expression: /<\/?[A-Za-z][\w.]*/y },
    {
      kind: "keyword",
      expression:
        /\b(?:as|async|await|const|else|export|extends|false|for|from|function|if|import|interface|let|new|null|return|true|type|undefined)\b/y,
    },
    { kind: "number", expression: /\b\d+(?:\.\d+)?\b/y },
    { kind: "variable", expression: /\b[A-Z][A-Za-z0-9_]*\b/y },
    { kind: "operator", expression: /=>|===?|!==?|[+*/%-]/y },
    { kind: "punctuation", expression: /[{}[\](),.;:<>]/y },
  ],
  yaml: [
    { kind: "comment", expression: /#.*$/y },
    { kind: "punctuation", expression: /(?:---|\.\.\.)/y },
    { kind: "property", expression: /[A-Za-z_][\w.-]*(?=\s*:)/y },
    { kind: "string", expression: /"(?:\\.|[^"\\])*"|'(?:''|[^'])*'/y },
    { kind: "placeholder", expression: /<[\w.*-]+>/y },
    { kind: "variable", expression: /\$\{\{.*?\}\}|\$\([\w.-]+\)/y },
    { kind: "boolean", expression: /\b(?:false|null|true|~)\b/iy },
    { kind: "number", expression: /-?\b\d+(?:\.\d+)?\b/y },
    { kind: "function", expression: /\bdotnet\b/y },
    { kind: "punctuation", expression: /[:,[\]{}]|-(?=\s)/y },
  ],
};

function matchRule(line: string, cursor: number, rule: TokenRule) {
  rule.expression.lastIndex = cursor;
  return rule.expression.exec(line);
}

function tokenizeLine(line: string, language: CodeLanguage): HighlightToken[] {
  const languageRules = rules[language];
  const tokens: HighlightToken[] = [];
  let cursor = 0;

  while (cursor < line.length) {
    const ruleMatch = languageRules
      .map((rule) => ({ match: matchRule(line, cursor, rule), rule }))
      .find(({ match }) => match?.index === cursor);

    if (ruleMatch?.match) {
      tokens.push({
        content: ruleMatch.match[0],
        kind: ruleMatch.rule.kind,
      });
      cursor += ruleMatch.match[0].length;
      continue;
    }

    let end = cursor + 1;
    while (
      end < line.length &&
      !languageRules.some((rule) => matchRule(line, end, rule)?.index === end)
    ) {
      end += 1;
    }
    tokens.push({ content: line.slice(cursor, end) });
    cursor = end;
  }

  return tokens;
}

export function detectCodeLanguage(code: string): CodeLanguage {
  const source = code.trimStart();
  if (source.startsWith("{") || source.startsWith("[")) return "json";
  if (
    source.startsWith("---") ||
    /^(?:- (?:task|uses)|description|model|name|tools|version):/m.test(source)
  ) {
    return "yaml";
  }
  if (/^(?:import|export|const|let|function|interface|type)\s/m.test(source)) {
    return "tsx";
  }
  if (/^<[/!?]?[a-z][^>]*>/i.test(source)) return "markup";
  return "bash";
}

export function SyntaxHighlightedCode({
  className,
  code,
  language = detectCodeLanguage(code),
  lineClassName,
}: {
  className: string;
  code: string;
  language?: CodeLanguage;
  lineClassName: string;
}) {
  return (
    <pre className={className} tabIndex={0}>
      <code>
        {code.split("\n").map((line, lineIndex) => (
          <span className={lineClassName} key={lineIndex}>
            {tokenizeLine(line, language).map((token, tokenIndex) =>
              token.kind ? (
                <span className={`token ${token.kind}`} key={tokenIndex}>
                  {token.content}
                </span>
              ) : (
                <React.Fragment key={tokenIndex}>
                  {token.content}
                </React.Fragment>
              ),
            )}
            {"\n"}
          </span>
        ))}
      </code>
    </pre>
  );
}
