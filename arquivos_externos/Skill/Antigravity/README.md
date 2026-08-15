# 🚀 Claude-Code-Enhancements

Custom Skills for the Claude Code CLI Agent to stop it from "thinking out loud", prevent context window bloat, and force professional engineering logic.Reduce Claude token usage by 60–80% while getting faster, cleaner outputs .

## 🧠 Why these skills?
Standard AI agents act like chatty assistants. They guess when a request is ambiguous, dump thousands of tokens of redundant code into your terminal, and delete things without confirming. 

These custom `.skill` enhancements rectify that by introducing a structured, API-driven software development loop.

## 🛠️ The Protocols

### 1. Antigravity Protocol (V1 & V2.0)
The gold standard for daily coding. 
*   **Intent Rectification:** If your request is vague, it stops and asks options instead of guessing.
*   **Artifact-First Editing (V2.0):** It stops terminal "yapping" by writing plans and long blocks to local `.md` files instead of printing to your chat window.
*   **Persistent Memory:** Saves architectural notes to prevent "session amnesia."

### 2. Ultimate Protocol Simulator
For maximum token efficiency in automated pipelines.
*   **Zero-English Mode:** Shuts off all conversational output.
*   **JSON Only:** Communicates status via minified JSON blocks.
*   **Internal Sandbox:** Runs local tests silently before reporting success.

---

## 📊 Performance & Selection Guide

### Mode Selection Guide
| Skill | Speed | Readability | Best for |
| :--- | :--- | :--- | :--- |
| **No Skill (Standard)** | Slowest | Verbose | Nothing — actively harmful |
| **Antigravity V1** | Fast | Human-readable | Daily coding |
| **Antigravity 2.0** | Fast | Human-readable + artifacts | Large tasks + teams |
| **Ultimate Simulator**| Fastest | Machine-only | Pipelines, automation |

### Token Savings vs No Skill
| Skill | Tool calls saved | Lines saved | Correctness | Est. token saving |
| :--- | :--- | :--- | :--- | :--- |
| **Antigravity V1** | −5 | −79 | 5/5 | ~76% |
| **Antigravity 2.0** | −5 | −88 | 5/5 | ~81% |
| **Ultimate** | −8 | −97 | 5/5 | ~93% |

*(See `BENCHMARK.md` for the raw logs of our 5-task stress test).*

---
The screenshot after i run some tests :

![image alt ](https://github.com/KINGSTAR-OMEGA/claude-token-optimizer/blob/76a0425bdffd69f9b228bd0612d3082f5741082b/Screenshot%202026-04-12%20201250.png)

## 📥 Installation

1. Create a folder in your Claude skills directory:
   * **Windows:** `C:\Users\YourName\.claude\skills\antigravity`
   * **Mac/Linux:** `~/.claude/skills/antigravity`
2. Download the `SKILL.md` file from the relevant folder in this repository.
3. Place it in the folder created above.
4. Open Claude Code and say: *"Activate Antigravity Protocol"* or *"Use Ultimate Mode."*

## 📄 License
This project is open-source and available under the **MIT License**.
