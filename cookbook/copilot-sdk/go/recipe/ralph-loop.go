package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	copilot "github.com/github/copilot-sdk/go"
)

// Ralph loop: autonomous AI task loop with fresh context per iteration.
//
// Two modes:
//   - "plan": reads PROMPT_plan.md, generates/updates IMPLEMENTATION_PLAN.md
//   - "build": reads PROMPT_build.md, implements tasks, runs tests, commits
//
// Each iteration creates a fresh session so the agent always operates in
// the "smart zone" of its context window. State is shared between
// iterations via files on disk (IMPLEMENTATION_PLAN.md, AGENTS.md, specs/*).
//
// Usage:
//   go run ralph-loop.go              # build mode, 50 iterations
//   go run ralph-loop.go plan         # planning mode
//   go run ralph-loop.go 20           # build mode, 20 iterations
//   go run ralph-loop.go plan 5       # planning mode, 5 iterations

func ralphLoop(ctx context.Context, mode string, maxIterations int) error {
	promptFile := "PROMPT_build.md"
	if mode == "plan" {
		promptFile = "PROMPT_plan.md"
	}

	client := copilot.NewClient(nil)
	if err := client.Start(ctx); err != nil {
		return fmt.Errorf("failed to start client: %w", err)
	}
	defer client.Stop()

	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get working directory: %w", err)
	}

	fmt.Println(strings.Repeat("━", 40))
	fmt.Printf("Mode:   %s\n", mode)
	fmt.Printf("Prompt: %s\n", promptFile)
	fmt.Printf("Max:    %d iterations\n", maxIterations)
	fmt.Println(strings.Repeat("━", 40))

	prompt, err := os.ReadFile(promptFile)
	if err != nil {
		return fmt.Errorf("failed to read %s: %w", promptFile, err)
	}

	for i := 1; i <= maxIterations; i++ {
		fmt.Printf("\n=== Iteration %d/%d ===\n", i, maxIterations)

		session, err := client.CreateSession(ctx, &copilot.SessionConfig{
			Model:            "gpt-5.1-codex-mini",
			WorkingDirectory: cwd,
			OnPermissionRequest: func(_ copilot.PermissionRequest, _ map[string]string) copilot.PermissionRequestResult {
				return copilot.PermissionRequestResult{Kind: "approved"}
			},
		})
		if err != nil {
			return fmt.Errorf("failed to create session: %w", err)
		}

		// Log tool usage for visibility
		session.On(func(event copilot.Event) {
			if toolExecution, ok := event.(copilot.ToolExecutionStartEvent); ok {
				fmt.Printf("  ⚙ %s\n", toolExecution.Data.ToolName)
			}
		})

		_, err = session.SendAndWait(ctx, copilot.MessageOptions{
			Prompt: string(prompt),
		})
		if destroyErr := session.Destroy(); destroyErr != nil {
			log.Printf("failed to destroy session on iteration %d: %v", i, destroyErr)
		}
		if err != nil {
			return fmt.Errorf("send failed on iteration %d: %w", i, err)
		}

		fmt.Printf("\nIteration %d complete.\n", i)
	}

	fmt.Printf("\nReached max iterations: %d\n", maxIterations)
	return nil
}

func main() {
	mode := "build"
	maxIterations := 50

	for _, arg := range os.Args[1:] {
		if arg == "plan" {
			mode = "plan"
		} else if n, err := strconv.Atoi(arg); err == nil {
			maxIterations = n
		}
	}

	if err := ralphLoop(context.Background(), mode, maxIterations); err != nil {
		log.Fatal(err)
	}
}
