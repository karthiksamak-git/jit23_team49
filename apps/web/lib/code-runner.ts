/* ═══════════════════════════════════════════
   CODE RUNNER — real execution, no AI
   • JavaScript runs instantly in the browser
     (sandboxed console capture).
   • Every other language is proxied through
     /api/execute to a self-hosted Piston
     engine (docker compose service) — no API
     keys, 60+ languages available.
   ═══════════════════════════════════════════ */

export interface CodeLanguage {
  /** Stable id used in UI state */
  id: string;
  label: string;
  /** File name shown in the editor tab */
  fileName: string;
  /** Starter code for the editor */
  template: string;
  /** true → runs in the browser, no engine needed */
  local: boolean;
  /** Piston language/version ("*" = latest installed) */
  piston: { language: string; version: string };
}

export const CODE_LANGUAGES: CodeLanguage[] = [
  {
    id: "javascript",
    label: "JavaScript",
    fileName: "main.js",
    local: true,
    piston: { language: "javascript", version: "*" },
    template: `// Runs instantly in your browser — no engine needed.
console.log("Hello, CareerVerse!");

let sum = 0;
for (let i = 1; i <= 10; i++) sum += i;
console.log("Sum 1..10 =", sum);
`,
  },
  {
    id: "python",
    label: "Python",
    fileName: "main.py",
    local: false,
    piston: { language: "python", version: "*" },
    template: `print("Hello, CareerVerse!")

total = sum(range(1, 11))
print("Sum 1..10 =", total)
`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    fileName: "main.ts",
    local: false,
    piston: { language: "typescript", version: "*" },
    template: `const greet = (name: string): string => \`Hello, \${name}!\`;
console.log(greet("CareerVerse"));
`,
  },
  {
    id: "java",
    label: "Java",
    fileName: "Main.java",
    local: false,
    piston: { language: "java", version: "*" },
    template: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CareerVerse!");
        int sum = 0;
        for (int i = 1; i <= 10; i++) sum += i;
        System.out.println("Sum 1..10 = " + sum);
    }
}
`,
  },
  {
    id: "c",
    label: "C",
    fileName: "main.c",
    local: false,
    piston: { language: "c", version: "*" },
    template: `#include <stdio.h>

int main(void) {
    printf("Hello, CareerVerse!\\n");
    int sum = 0;
    for (int i = 1; i <= 10; i++) sum += i;
    printf("Sum 1..10 = %d\\n", sum);
    return 0;
}
`,
  },
  {
    id: "cpp",
    label: "C++",
    fileName: "main.cpp",
    local: false,
    piston: { language: "cpp", version: "*" },
    template: `#include <iostream>

int main() {
    std::cout << "Hello, CareerVerse!" << std::endl;
    int sum = 0;
    for (int i = 1; i <= 10; i++) sum += i;
    std::cout << "Sum 1..10 = " << sum << std::endl;
    return 0;
}
`,
  },
  {
    id: "csharp",
    label: "C#",
    fileName: "Main.cs",
    local: false,
    piston: { language: "csharp", version: "*" },
    template: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, CareerVerse!");
        int sum = 0;
        for (int i = 1; i <= 10; i++) sum += i;
        Console.WriteLine($"Sum 1..10 = {sum}");
    }
}
`,
  },
  {
    id: "go",
    label: "Go",
    fileName: "main.go",
    local: false,
    piston: { language: "go", version: "*" },
    template: `package main

import "fmt"

func main() {
	fmt.Println("Hello, CareerVerse!")
	sum := 0
	for i := 1; i <= 10; i++ {
		sum += i
	}
	fmt.Println("Sum 1..10 =", sum)
}
`,
  },
  {
    id: "rust",
    label: "Rust",
    fileName: "main.rs",
    local: false,
    piston: { language: "rust", version: "*" },
    template: `fn main() {
    println!("Hello, CareerVerse!");
    let sum: i32 = (1..=10).sum();
    println!("Sum 1..10 = {}", sum);
}
`,
  },
  {
    id: "php",
    label: "PHP",
    fileName: "main.php",
    local: false,
    piston: { language: "php", version: "*" },
    template: `<?php
echo "Hello, CareerVerse!\\n";
$sum = 0;
for ($i = 1; $i <= 10; $i++) $sum += $i;
echo "Sum 1..10 = $sum\\n";
`,
  },
  {
    id: "ruby",
    label: "Ruby",
    fileName: "main.rb",
    local: false,
    piston: { language: "ruby", version: "*" },
    template: `puts "Hello, CareerVerse!"
sum = (1..10).sum
puts "Sum 1..10 = #{sum}"
`,
  },
  {
    id: "kotlin",
    label: "Kotlin",
    fileName: "Main.kt",
    local: false,
    piston: { language: "kotlin", version: "*" },
    template: `fun main() {
    println("Hello, CareerVerse!")
    val sum = (1..10).sum()
    println("Sum 1..10 = \\$sum")
}
`,
  },
  {
    id: "swift",
    label: "Swift",
    fileName: "main.swift",
    local: false,
    piston: { language: "swift", version: "*" },
    template: `print("Hello, CareerVerse!")
let sum = (1...10).reduce(0, +)
print("Sum 1..10 = \\(sum)")
`,
  },
  {
    id: "bash",
    label: "Bash",
    fileName: "script.sh",
    local: false,
    piston: { language: "bash", version: "*" },
    template: `echo "Hello, CareerVerse!"
sum=0
for i in $(seq 1 10); do sum=$((sum + i)); done
echo "Sum 1..10 = $sum"
`,
  },
  {
    id: "lua",
    label: "Lua",
    fileName: "main.lua",
    local: false,
    piston: { language: "lua", version: "*" },
    template: `print("Hello, CareerVerse!")
local sum = 0
for i = 1, 10 do sum = sum + i end
print("Sum 1..10 = " .. sum)
`,
  },
  {
    id: "r",
    label: "R",
    fileName: "main.r",
    local: false,
    piston: { language: "r", version: "*" },
    template: `cat("Hello, CareerVerse!\\n")
sum <- sum(1:10)
cat("Sum 1..10 =", sum, "\\n")
`,
  },
  {
    id: "dart",
    label: "Dart",
    fileName: "main.dart",
    local: false,
    piston: { language: "dart", version: "*" },
    template: `void main() {
  print('Hello, CareerVerse!');
  int sum = 0;
  for (int i = 1; i <= 10; i++) sum += i;
  print('Sum 1..10 = \\$sum');
}
`,
  },
  {
    id: "perl",
    label: "Perl",
    fileName: "main.pl",
    local: false,
    piston: { language: "perl", version: "*" },
    template: `print "Hello, CareerVerse!\\n";
my $sum = 0;
$sum += $_ for 1..10;
print "Sum 1..10 = $sum\\n";
`,
  },
];

export interface RunResult {
  stdout: string;
  stderr: string;
  /** Process exit code (0 = success) */
  code: number;
  /** Where the code actually ran */
  engine: "browser" | "piston";
  /** Compile-stage exit code when the engine compiles first (undefined in browser). */
  compileCode?: number;
  /** Runtime version reported by the engine, when known */
  version?: string;
  /** True when the engine killed the program (timeout / memory) */
  killed?: boolean;
}

/** Format a console value the way Node would (roughly). */
function fmt(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value, null, 0) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Run JavaScript entirely in the browser with a captured console. */
function runLocalJavaScript(source: string, stdin: string): RunResult {
  const logs: string[] = [];
  const captured = {
    log: (...a: unknown[]) => logs.push(a.map(fmt).join(" ")),
    info: (...a: unknown[]) => logs.push(a.map(fmt).join(" ")),
    warn: (...a: unknown[]) => logs.push(a.map(fmt).join(" ")),
    error: (...a: unknown[]) => logs.push(a.map(fmt).join(" ")),
    debug: (...a: unknown[]) => logs.push(a.map(fmt).join(" ")),
    table: (...a: unknown[]) => logs.push(a.map(fmt).join(" ")),
  };

  try {
    // "stdin" is exposed so readline-style exercises still have data to read.
    const factory = new Function(
      "console",
      "stdin",
      `"use strict";\n${source}`
    );
    factory(captured, stdin);
    return { stdout: logs.join("\n"), stderr: "", code: 0, engine: "browser" };
  } catch (err) {
    return {
      stdout: logs.join("\n"),
      stderr:
        err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      code: 1,
      engine: "browser",
    };
  }
}

/**
 * Execute a program. JavaScript is sandboxed in the browser; every other
 * language goes through /api/execute → self-hosted Piston engine.
 */
export async function runProgram(
  lang: CodeLanguage,
  source: string,
  stdin: string
): Promise<RunResult> {
  if (lang.local) return runLocalJavaScript(source, stdin);

  const res = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: lang.piston.language,
      version: lang.piston.version,
      files: [{ name: lang.fileName, content: source }],
      stdin,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 503) {
    throw new Error(
      data?.error ||
        "Code engine is not running. Start it with: npm run engine:up"
    );
  }
  if (!res.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Engine returned HTTP ${res.status}`
    );
  }

  const run = data.run || {};
  const compile = data.compile || {};
  return {
    stdout: typeof run.stdout === "string" ? run.stdout : "",
    stderr:
      typeof compile.stderr === "string" && compile.stderr
        ? compile.stderr
        : typeof run.stderr === "string"
        ? run.stderr
        : "",
    code: typeof run.code === "number" ? run.code : -1,
    engine: "piston",
    compileCode:
      typeof compile.code === "number" ? compile.code : undefined,
    version: data.version || lang.piston.version,
    killed: !!run.killed,
  };
}
