import { NextRequest, NextResponse } from "next/server";

interface CompileRequestBody {
  language: string;
  code: string;
  stdin?: string;
  options?: string;
}

// Wandbox compiler IDs for all major programming languages
const LANGUAGE_COMPILERS: Record<string, { compiler: string; displayName: string; ext: string }> = {
  python: { compiler: "cpython-3.12.7", displayName: "Python 3.12", ext: "py" },
  javascript: { compiler: "nodejs-20.17.0", displayName: "JavaScript (Node 20)", ext: "js" },
  typescript: { compiler: "typescript-5.6.2", displayName: "TypeScript 5.6", ext: "ts" },
  cpp: { compiler: "gcc-head", displayName: "C++ (GCC 14 / C++23)", ext: "cpp" },
  c: { compiler: "gcc-head-c", displayName: "C (GCC 14)", ext: "c" },
  java: { compiler: "openjdk-jdk-22+36", displayName: "Java 22 (OpenJDK)", ext: "java" },
  rust: { compiler: "rust-1.82.0", displayName: "Rust 1.82", ext: "rs" },
  go: { compiler: "go-1.23.2", displayName: "Go 1.23", ext: "go" },
  csharp: { compiler: "mono-6.12.0.199", displayName: "C# (.NET / Mono)", ext: "cs" },
  php: { compiler: "php-8.3.12", displayName: "PHP 8.3", ext: "php" },
  ruby: { compiler: "ruby-3.4.9", displayName: "Ruby 3.4", ext: "rb" },
  swift: { compiler: "swift-6.0.1", displayName: "Swift 6.0", ext: "swift" },
  bash: { compiler: "bash", displayName: "Bash 5.2", ext: "sh" },
  lua: { compiler: "lua-5.4.7", displayName: "Lua 5.4", ext: "lua" },
  perl: { compiler: "perl-head", displayName: "Perl 5", ext: "pl" },
  haskell: { compiler: "ghc-head", displayName: "Haskell (GHC)", ext: "hs" },
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: CompileRequestBody = await req.json();
    const { language, code, stdin = "", options = "" } = body;

    if (!language) {
      return NextResponse.json(
        { error: "Language parameter is required" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Code content cannot be empty" },
        { status: 400 }
      );
    }

    const langConfig = LANGUAGE_COMPILERS[language.toLowerCase()];
    if (!langConfig) {
      return NextResponse.json(
        {
          error: `Unsupported language: '${language}'. Supported: ${Object.keys(LANGUAGE_COMPILERS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Java special handling: Wandbox compiles file as prog.java.
    // Changing 'public class' to 'class' prevents file-name mismatch compiler errors.
    let preparedCode = code;
    if (language.toLowerCase() === "java") {
      preparedCode = code.replace(/\bpublic\s+class\b/g, "class");
    }

    const payload: Record<string, any> = {
      compiler: langConfig.compiler,
      code: preparedCode,
      stdin: stdin || "",
    };

    if (options && typeof options === "string" && options.trim().length > 0) {
      payload["compiler-option-raw"] = options.trim();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s execution timeout

    const wandboxRes = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const executionTimeMs = Date.now() - startTime;

    if (!wandboxRes.ok) {
      const errText = await wandboxRes.text().catch(() => "Unknown error");
      return NextResponse.json(
        {
          success: false,
          status: wandboxRes.status,
          error: `Compiler service returned HTTP ${wandboxRes.status}: ${errText}`,
          output: "",
          executionTimeMs,
        },
        { status: 200 }
      );
    }

    const wandboxData = await wandboxRes.json();

    const stdout = (wandboxData.program_output || "").trimEnd();
    const stderr = (wandboxData.program_error || "").trimEnd();
    const compilerError = (wandboxData.compiler_error || "").trimEnd();
    const compilerOutput = (wandboxData.compiler_output || "").trimEnd();
    const exitStatus = typeof wandboxData.status === "number" ? wandboxData.status : 0;
    const signal = wandboxData.signal;

    const hasError = exitStatus !== 0 || !!compilerError || (stderr.length > 0 && stdout.length === 0);

    return NextResponse.json({
      success: !hasError,
      status: exitStatus,
      signal,
      output: stdout,
      error: compilerError || stderr,
      compiler_output: compilerOutput,
      executionTimeMs,
      language: langConfig.displayName,
    });
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    if (error.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          status: -1,
          error: "Execution Timed Out (limit 20 seconds). Check for infinite loops or long calculations.",
          output: "",
          executionTimeMs,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        status: 500,
        error: error.message || "Failed to execute compiler runner",
        output: "",
        executionTimeMs,
      },
      { status: 500 }
    );
  }
}
