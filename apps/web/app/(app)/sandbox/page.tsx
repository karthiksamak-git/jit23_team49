"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ══════════════════════════════════════════════════════════════════════════════
   CAREERVERSE PRACTICE LAB — MULTI-LANGUAGE COMPILER & CODE RUNNER
   Real compiler execution for all major programming languages.
   No AI hallucinations: Powered by real GCC, Clang, OpenJDK, Rust, Go, Python, Node.
   ══════════════════════════════════════════════════════════════════════════════ */

interface LanguageConfig {
  id: string;
  name: string;
  version: string;
  ext: string;
  filename: string;
  category: "Popular" | "Systems" | "Web" | "Scripting";
  defaultCode: string;
  presets: Record<string, string>;
}

const LANGUAGES: LanguageConfig[] = [
  {
    id: "python",
    name: "Python",
    version: "3.12",
    ext: "py",
    filename: "main.py",
    category: "Popular",
    defaultCode: `# Python 3.12 - Practice Lab
def main():
    warrior = "Ronin"
    rank = 42
    print(f"=== CareerVerse Practice Lab: Python 3.12 ===")
    print(f"Warrior: {warrior} | Level: {rank}")
    
    # Fibonacci Series
    fib = [0, 1]
    for _ in range(8):
        fib.append(fib[-1] + fib[-2])
    print(f"Fibonacci Sequence: {fib}")

if __name__ == "__main__":
    main()
`,
    presets: {
      "Two Sum": `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

print("Two Sum Result:", two_sum([2, 7, 11, 15], 9))
`,
      "Palindrome": `def is_palindrome(s):
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

print("Is 'A man a plan a canal Panama' palindrome?", is_palindrome("A man a plan a canal Panama"))
print("Is 'Warrior' palindrome?", is_palindrome("Warrior"))
`,
    },
  },
  {
    id: "cpp",
    name: "C++",
    version: "GCC 14 / C++23",
    ext: "cpp",
    filename: "main.cpp",
    category: "Systems",
    defaultCode: `// C++ 23 - Practice Lab
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "=== CareerVerse C++ Compiler (GCC 14) ===" << std::endl;
    std::vector<int> exp = {120, 250, 480, 600, 850};
    int total_exp = std::accumulate(exp.begin(), exp.end(), 0);
    std::cout << "Total Honor Points Earned: " << total_exp << " XP" << std::endl;
    return 0;
}
`,
    presets: {
      "Two Sum": `#include <iostream>
#include <vector>
#include <unordered_map>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        int diff = target - nums[i];
        if (seen.count(diff)) return {seen[diff], i};
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    auto res = twoSum(nums, 9);
    std::cout << "Indices: [" << res[0] << ", " << res[1] << "]" << std::endl;
    return 0;
}
`,
      "Palindrome": `#include <iostream>
#include <string>
#include <cctype>

bool isPalindrome(const std::string& s) {
    int l = 0, r = s.size() - 1;
    while (l < r) {
        while (l < r && !isalnum(s[l])) l++;
        while (l < r && !isalnum(s[r])) r--;
        if (tolower(s[l]) != tolower(s[r])) return false;
        l++; r--;
    }
    return true;
}

int main() {
    std::cout << std::boolalpha;
    std::cout << "radar: " << isPalindrome("radar") << std::endl;
    std::cout << "ninja: " << isPalindrome("ninja") << std::endl;
    return 0;
}
`,
    },
  },
  {
    id: "c",
    name: "C",
    version: "GCC 14",
    ext: "c",
    filename: "main.c",
    category: "Systems",
    defaultCode: `// C (GCC 14) - Practice Lab
#include <stdio.h>

int main() {
    printf("=== The Dojo: C Compiler ===\\n");
    int hp = 100;
    int strike = 35;
    printf("Warrior Initial HP: %d\\n", hp);
    hp -= strike;
    printf("Critical Hit Dealt! Remaining HP: %d\\n", hp);
    return 0;
}
`,
    presets: {},
  },
  {
    id: "javascript",
    name: "JavaScript",
    version: "Node.js 20",
    ext: "js",
    filename: "index.js",
    category: "Popular",
    defaultCode: `// JavaScript (Node.js 20) - Practice Lab
function main() {
  console.log("=== CareerVerse JavaScript Engine ===");
  const warrior = {
    handle: "Kage-Shinobi",
    level: 38,
    weapons: ["Katana", "Smoke Bomb", "Kunai"]
  };
  console.log(\`Active Warrior: \${warrior.handle} (Lv.\${warrior.level})\`);
  console.log("Arsenal:", warrior.weapons.join(" | "));

  // Fast power sort
  const stats = [98, 45, 87, 65, 100];
  const sorted = [...stats].sort((a, b) => b - a);
  console.log("Ranked Stats:", sorted);
}

main();
`,
    presets: {
      "Two Sum": `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

console.log("Indices for Target 18:", twoSum([2, 7, 11, 15], 18));
`,
    },
  },
  {
    id: "typescript",
    name: "TypeScript",
    version: "5.6",
    ext: "ts",
    filename: "index.ts",
    category: "Web",
    defaultCode: `// TypeScript 5.6 - Practice Lab
interface DojoWarrior {
  id: string;
  title: string;
  rank: number;
  skills: readonly string[];
}

const warrior: DojoWarrior = {
  id: "ronin-01",
  title: "Shadow Blade",
  rank: 50,
  skills: ["Memory Management", "Concurrency", "Algorithms"] as const,
};

console.log(\`=== \${warrior.title} (Rank \${warrior.rank}) ===\`);
console.log("Specialized Disciplines:");
warrior.skills.forEach((skill, idx) => {
  console.log(\`  \${idx + 1}. \${skill}\`);
});
`,
    presets: {},
  },
  {
    id: "java",
    name: "Java",
    version: "OpenJDK 22",
    ext: "java",
    filename: "Main.java",
    category: "Popular",
    defaultCode: `// Java 22 - Practice Lab
import java.util.*;

class Main {
    public static void main(String[] args) {
        System.out.println("=== CareerVerse Java 22 Dojo ===");
        List<String> ranks = List.of("Novice", "Apprentice", "Warrior", "Ronin", "Master");
        System.out.println("Available Progression Tiers: " + ranks);

        Map<String, Integer> honor = new LinkedHashMap<>();
        honor.put("Quests Completed", 24);
        honor.put("Bosses Defeated", 3);
        honor.put("Dojo Elo", 1450);
        System.out.println("Warrior Stats: " + honor);
    }
}
`,
    presets: {
      "Two Sum": `import java.util.*;

class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        int[] result = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println("Found Indices: " + Arrays.toString(result));
    }
}
`,
    },
  },
  {
    id: "rust",
    name: "Rust",
    version: "1.82",
    ext: "rs",
    filename: "main.rs",
    category: "Systems",
    defaultCode: `// Rust 1.82 - Practice Lab
fn main() {
    println!("=== CareerVerse Rust 1.82 Dojo ===");
    let warrior = "Miyamoto";
    let score: u64 = 14_850;
    println!("Warrior: {}, Honor Points: {}", warrior, score);

    let strikes: Vec<u32> = (1..=5).map(|x| x * 25).collect();
    println!("Combo Damage Sequence: {:?}", strikes);
    let total_dmg: u32 = strikes.iter().sum();
    println!("Total Finisher Damage: {}", total_dmg);
}
`,
    presets: {},
  },
  {
    id: "go",
    name: "Go",
    version: "1.23",
    ext: "go",
    filename: "main.go",
    category: "Systems",
    defaultCode: `// Go 1.23 - Practice Lab
package main

import (
	"fmt"
	"time"
)

func main() {
	fmt.Println("=== CareerVerse Go 1.23 Compiler ===")
	fmt.Printf("Current Timestamp: %s\\n", time.Now().Format(time.RFC822))
	
	skills := []string{"Concurrency", "Microservices", "RESTful APIs", "Distributed Systems"}
	fmt.Println("Backend Dojo Milestones:")
	for i, s := range skills {
		fmt.Printf(" [%d] %s\\n", i+1, s)
	}
}
`,
    presets: {},
  },
  {
    id: "csharp",
    name: "C#",
    version: ".NET / Mono",
    ext: "cs",
    filename: "Program.cs",
    category: "Popular",
    defaultCode: `// C# - Practice Lab
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        Console.WriteLine("=== CareerVerse C# Compiler ===");
        var quests = new List<string> {
            "Conquer the SQL Mountains",
            "Master the Binary Tree",
            "Slay the Race Condition"
        };

        Console.WriteLine($"Active Quests ({quests.Count}):");
        foreach (var quest in quests) {
            Console.WriteLine($" -> {quest}");
        }
    }
}
`,
    presets: {},
  },
  {
    id: "php",
    name: "PHP",
    version: "8.3",
    ext: "php",
    filename: "index.php",
    category: "Web",
    defaultCode: `<?php
// PHP 8.3 - Practice Lab
echo "=== CareerVerse PHP 8.3 Compiler ===\\n";
$warrior = [
    "handle" => "Kenshi",
    "level" => 42,
    "specialty" => "High-Load Backend Systems"
];

foreach ($warrior as $k => $v) {
    echo ucfirst($k) . ": " . $v . "\\n";
}
`,
    presets: {},
  },
  {
    id: "ruby",
    name: "Ruby",
    version: "3.4",
    ext: "rb",
    filename: "main.rb",
    category: "Scripting",
    defaultCode: `# Ruby 3.4 - Practice Lab
puts "=== CareerVerse Ruby Dojo ==="
warrior = { name: "Musashi", discipline: "Dual Blades", rank: "Kensei" }
puts "Warrior: #{warrior[:name]}"
puts "Discipline: #{warrior[:discipline]}"
puts "Honored Rank: #{warrior[:rank]}"
`,
    presets: {},
  },
  {
    id: "swift",
    name: "Swift",
    version: "6.0",
    ext: "swift",
    filename: "main.swift",
    category: "Systems",
    defaultCode: `// Swift 6.0 - Practice Lab
import Foundation

print("=== CareerVerse Swift 6.0 Dojo ===")
let scores = [88, 92, 79, 95, 100]
let avg = scores.reduce(0, +) / scores.count
print("Trial Average Score: \\(avg)%")
print("Verdict: Mastery Achieved!")
`,
    presets: {},
  },
  {
    id: "bash",
    name: "Bash",
    version: "5.2",
    ext: "sh",
    filename: "script.sh",
    category: "Scripting",
    defaultCode: `#!/bin/bash
# Bash 5.2 - Practice Lab
echo "=== Dojo Bash Terminal Environment ==="
echo "Host Kernel: $(uname -s -r)"
echo "Current Time: $(date)"
echo "Memory / Disk verification:"
echo "Sandbox storage initialized successfully."
`,
    presets: {},
  },
  {
    id: "lua",
    name: "Lua",
    version: "5.4",
    ext: "lua",
    filename: "main.lua",
    category: "Scripting",
    defaultCode: `-- Lua 5.4 - Practice Lab
print("=== CareerVerse Lua Dojo ===")
local warrior = { name = "Shadow", level = 30, mana = 100 }
print("Warrior: " .. warrior.name .. " (Lv." .. warrior.level .. ")")

for i = 1, 3 do
    print("Spell Cast " .. i .. " -> Mana Remaining: " .. (warrior.mana - i * 15))
end
`,
    presets: {},
  },
  {
    id: "haskell",
    name: "Haskell",
    version: "GHC 9",
    ext: "hs",
    filename: "Main.hs",
    category: "Scripting",
    defaultCode: `-- Haskell (GHC) - Practice Lab
fibs :: [Integer]
fibs = 0 : 1 : zipWith (+) fibs (tail fibs)

main :: IO ()
main = do
    putStrLn "=== CareerVerse Haskell Dojo ==="
    putStrLn "First 10 Fibonacci Numbers:"
    print (take 10 fibs)
`,
    presets: {},
  },
];

export default function PracticeLabPage() {
  const [selectedLang, setSelectedLang] = useState<LanguageConfig>(LANGUAGES[0]);
  const [code, setCode] = useState<string>(LANGUAGES[0].defaultCode);
  const [stdin, setStdin] = useState<string>("");
  const [showStdin, setShowStdin] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [output, setOutput] = useState<string | null>(null);
  const [errorOutput, setErrorOutput] = useState<string | null>(null);
  const [statusBadge, setStatusBadge] = useState<{ text: string; color: string } | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"stdout" | "stderr" | "stdin">("stdout");
  const [copied, setCopied] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Switch language
  function handleSelectLanguage(lang: LanguageConfig) {
    setSelectedLang(lang);
    setCode(lang.defaultCode);
    setOutput(null);
    setErrorOutput(null);
    setStatusBadge(null);
    setExecTime(null);
  }

  // Handle Tab key in code editor for proper code indentation
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runCompiler();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const tabStr = "  "; // 2 spaces

      const updated = code.substring(0, start) + tabStr + code.substring(end);
      setCode(updated);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tabStr.length;
        }
      });
    }
  }

  // Run the code via server compiler route
  async function runCompiler() {
    if (isRunning) return;
    setIsRunning(true);
    setStatusBadge({ text: "Compiling & Running...", color: "text-[#b49b64]" });
    setOutput(null);
    setErrorOutput(null);
    setActiveTab("stdout");

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang.id,
          code,
          stdin,
        }),
      });

      const data = await res.json();
      setExecTime(data.executionTimeMs || null);

      if (data.success) {
        setOutput(data.output || "(Process finished with return code 0, no stdout output)");
        if (data.error) {
          setErrorOutput(data.error);
        }
        setStatusBadge({ text: "Success (Exit Code 0)", color: "text-emerald-400" });
      } else {
        setErrorOutput(data.error || data.compiler_output || "Execution failed with non-zero exit status.");
        setOutput(data.output || "");
        setStatusBadge({ text: `Failed (Exit Code ${data.status ?? 1})`, color: "text-rose-400" });
        if (!data.output && data.error) {
          setActiveTab("stderr");
        }
      }
    } catch (err: any) {
      setErrorOutput(err.message || "Failed to contact compilation engine.");
      setStatusBadge({ text: "Network / Server Error", color: "text-rose-400" });
      setActiveTab("stderr");
    } finally {
      setIsRunning(false);
    }
  }

  // Copy code to clipboard
  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Download code as file
  function downloadCode() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selectedLang.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Compute line count
  const lineNumbers = code.split("\n").map((_, i) => i + 1);

  // Filter languages
  const filteredLanguages = categoryFilter === "All"
    ? LANGUAGES
    : LANGUAGES.filter((l) => l.category === categoryFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ══════ HEADER BANNER ══════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(180,155,100,0.14)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest uppercase text-[#b49b64] px-2 py-0.5 rounded bg-[#b49b64]/10 border border-[#b49b64]/20">
              Practice Lab • Real Compilers
            </span>
            <span className="text-xs text-[#6b6358] font-mono">• 15+ Languages</span>
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#e6ded0] tracking-wider">
            The Practice Lab
          </h1>
          <p className="text-xs text-[#8c8273] mt-1 max-w-xl">
            Real multi-language compiler & execution arena. Compile, execute, and debug code directly with live standard input & output.
          </p>
        </div>

        {/* Global Action: Run Code */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCode(selectedLang.defaultCode)}
            className="px-3 py-1.5 rounded surface text-xs font-cinzel text-[#8c8273] hover:text-[#c8c0b0] border border-[rgba(180,155,100,0.12)] transition-colors"
            title="Reset to starter template"
          >
            ↺ Reset
          </button>
          <button
            onClick={runCompiler}
            disabled={isRunning}
            className={`btn-blood px-6 py-2 rounded text-xs font-cinzel tracking-widest uppercase flex items-center gap-2 shadow-lg ${
              isRunning ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
            } transition-all`}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Executing...
              </>
            ) : (
              <>
                <span>▶ Run Code</span>
                <span className="text-[10px] opacity-75 font-mono hidden sm:inline">(Ctrl+Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ══════ LANGUAGE SELECTION STRIP ══════ */}
      <div className="space-y-3">
        {/* Category Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-cinzel">
            {["All", "Popular", "Systems", "Web", "Scripting"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-[11px] transition-colors ${
                  categoryFilter === cat
                    ? "bg-[#b49b64] text-[#040506] font-bold"
                    : "text-[#6b6358] hover:text-[#c8c0b0] surface"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Challenge / Template Presets */}
          {Object.keys(selectedLang.presets).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#6b6358]">Presets:</span>
              {Object.entries(selectedLang.presets).map(([name, snippet]) => (
                <button
                  key={name}
                  onClick={() => setCode(snippet)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#b49b64]/10 hover:bg-[#b49b64]/20 text-[#b49b64] border border-[#b49b64]/20 transition-colors"
                >
                  ⚡ {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language Buttons Carousel / Grid */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {filteredLanguages.map((lang) => {
            const isSelected = selectedLang.id === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => handleSelectLanguage(lang)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "bg-[#b49b64]/15 border-[#b49b64] shadow-[0_0_15px_rgba(180,155,100,0.15)]"
                    : "surface border-[rgba(180,155,100,0.1)] hover:border-[rgba(180,155,100,0.3)] text-[#6b6358] hover:text-[#c8c0b0]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-[#b49b64]" : "bg-zinc-700"}`} />
                  <span className={`text-xs font-cinzel font-bold ${isSelected ? "text-[#e6ded0]" : "text-zinc-400"}`}>
                    {lang.name}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-[#6b6358] mt-0.5 ml-4">
                  {lang.version}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════ WORKSPACE: CODE EDITOR & TERMINAL ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT / TOP: CODE EDITOR (7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col surface rounded-lg border border-[rgba(180,155,100,0.14)] overflow-hidden shadow-2xl">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(180,155,100,0.1)] bg-[#07080b]">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-[#b49b64] flex items-center gap-1.5">
                <span className="text-[#6b6358]">📄</span> {selectedLang.filename}
              </span>
              <span className="text-[10px] font-mono text-[#4a453e] hidden sm:inline">
                ({selectedLang.name} • {selectedLang.version})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStdin(!showStdin)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                  showStdin
                    ? "bg-[#b49b64]/20 text-[#b49b64] border border-[#b49b64]/40"
                    : "text-[#6b6358] hover:text-[#c8c0b0] bg-zinc-900 border border-zinc-800"
                }`}
              >
                {showStdin ? "Hide STDIN" : "+ STDIN Input"}
              </button>
              <button
                onClick={copyCode}
                className="px-2 py-1 rounded text-[10px] font-mono text-[#8c8273] hover:text-[#c8c0b0] transition-colors"
                title="Copy code"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
              <button
                onClick={downloadCode}
                className="px-2 py-1 rounded text-[10px] font-mono text-[#8c8273] hover:text-[#c8c0b0] transition-colors"
                title="Download file"
              >
                ⤓
              </button>
            </div>
          </div>

          {/* Optional STDIN Panel */}
          {showStdin && (
            <div className="p-3 bg-[#050608] border-b border-[rgba(180,155,100,0.1)]">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#b49b64] mb-1">
                <span>Standard Input (STDIN)</span>
                <span className="text-[#6b6358]">Passed to program on execution</span>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter inputs here (e.g., numbers, text lines)..."
                rows={2}
                className="w-full bg-[#090b0e] border border-zinc-800 rounded p-2 text-xs font-mono text-[#c8c0b0] resize-y focus:outline-none focus:border-[#b49b64]/40 placeholder:text-zinc-700"
              />
            </div>
          )}

          {/* Editor Body with Line Numbers */}
          <div className="relative flex min-h-[380px] lg:min-h-[460px] bg-[#06070a]">
            {/* Line numbers column */}
            <div className="select-none py-3 px-2 text-right font-mono text-xs text-[#3a352e] bg-[#050608] border-r border-zinc-900/80 w-12 flex-shrink-0">
              {lineNumbers.map((num) => (
                <div key={num} className="leading-6">
                  {num}
                </div>
              ))}
            </div>

            {/* Code Textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 w-full bg-transparent p-3 text-xs sm:text-sm font-mono text-[#e6ded0] leading-6 resize-none focus:outline-none selection:bg-[#b49b64]/30 placeholder:text-zinc-700 whitespace-pre overflow-x-auto"
              placeholder={`Write ${selectedLang.name} code here...`}
            />
          </div>

          {/* Editor Footer Status */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-[rgba(180,155,100,0.08)] bg-[#07080b] text-[10px] font-mono text-[#6b6358]">
            <div className="flex items-center gap-3">
              <span>Lines: {lineNumbers.length}</span>
              <span>Chars: {code.length}</span>
            </div>
            <div>Tab: 2 spaces • UTF-8</div>
          </div>
        </div>

        {/* RIGHT / BOTTOM: CONSOLE & OUTPUT (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col surface rounded-lg border border-[rgba(180,155,100,0.14)] overflow-hidden shadow-2xl">
          {/* Console Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(180,155,100,0.1)] bg-[#07080b]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#e6ded0] flex items-center gap-1.5">
                <span className="text-emerald-500">❯</span> Terminal Console
              </span>
              {execTime !== null && (
                <span className="text-[10px] font-mono text-[#6b6358] bg-zinc-900 px-2 py-0.5 rounded">
                  {execTime}ms
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Output / Errors tabs */}
              <button
                onClick={() => setActiveTab("stdout")}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                  activeTab === "stdout"
                    ? "bg-[#b49b64]/20 text-[#b49b64] font-bold"
                    : "text-[#6b6358] hover:text-[#c8c0b0]"
                }`}
              >
                STDOUT
              </button>
              {errorOutput && (
                <button
                  onClick={() => setActiveTab("stderr")}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                    activeTab === "stderr"
                      ? "bg-rose-500/20 text-rose-400 font-bold"
                      : "text-rose-400/70 hover:text-rose-400"
                  }`}
                >
                  ERRORS
                </button>
              )}
              <button
                onClick={() => {
                  setOutput(null);
                  setErrorOutput(null);
                  setStatusBadge(null);
                }}
                className="text-[10px] font-mono text-[#6b6358] hover:text-[#c8c0b0] px-1"
                title="Clear console"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Status Sub-bar */}
          {statusBadge && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#050608] border-b border-[rgba(180,155,100,0.08)]">
              <span className={`text-[11px] font-mono font-bold flex items-center gap-1.5 ${statusBadge.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {statusBadge.text}
              </span>
              <span className="text-[10px] font-mono text-[#6b6358]">
                {selectedLang.name} {selectedLang.version}
              </span>
            </div>
          )}

          {/* Console Content Screen */}
          <div className="flex-1 min-h-[380px] lg:min-h-[460px] p-4 bg-[#040507] font-mono text-xs leading-relaxed overflow-y-auto">
            {isRunning ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#b49b64] border-t-transparent animate-spin" />
                <p className="font-cinzel text-sm text-[#b49b64] tracking-wider">
                  Dispatching to Sandbox Engine...
                </p>
                <p className="text-[10px] text-[#6b6358] max-w-xs font-mono">
                  Compiling source code with {selectedLang.version}. Please wait.
                </p>
              </div>
            ) : activeTab === "stdout" ? (
              output !== null ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-[#4a453e] uppercase tracking-wider pb-1 border-b border-zinc-900">
                    ── Output Log ──
                  </div>
                  <pre className="text-[#d8d0c0] whitespace-pre-wrap break-all font-mono">
                    {output}
                  </pre>
                  {errorOutput && (
                    <div className="mt-4 pt-3 border-t border-rose-950/40">
                      <div className="text-[10px] text-rose-400/80 uppercase tracking-wider mb-1">
                        ⚠ Diagnostics / Stderr:
                      </div>
                      <pre className="text-rose-400 whitespace-pre-wrap break-all font-mono text-[11px]">
                        {errorOutput}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#4a453e]">
                  <span className="text-2xl mb-2">⚡</span>
                  <p className="font-cinzel text-xs text-[#6b6358]">Ready for execution</p>
                  <p className="text-[10px] text-[#3d3830] mt-1 font-mono">
                    Click "Run Code" or press Ctrl+Enter to compile.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <div className="text-[10px] text-rose-400 uppercase tracking-wider pb-1 border-b border-rose-950/40">
                  ── Diagnostics / Errors ──
                </div>
                <pre className="text-rose-400 whitespace-pre-wrap break-all font-mono text-xs">
                  {errorOutput || "No diagnostics reported."}
                </pre>
              </div>
            )}
          </div>

          {/* Console Footer */}
          <div className="px-4 py-2 border-t border-[rgba(180,155,100,0.08)] bg-[#07080b] flex items-center justify-between text-[10px] font-mono text-[#6b6358]">
            <span>Environment: Sandboxed Linux Container</span>
            <span className="text-emerald-500/80">Online 🟢</span>
          </div>
        </div>
      </div>
    </div>
  );
}
