package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"regexp"
	"strings"

	copilot "github.com/github/copilot-sdk/go"
)

// ============================================================================
// Git & GitHub Detection
// ============================================================================

func isGitRepo() bool {
	cmd := exec.Command("git", "rev-parse", "--git-dir")
	return cmd.Run() == nil
}

func getGitHubRemote() string {
	cmd := exec.Command("git", "remote", "get-url", "origin")
	output, err := cmd.Output()
	if err != nil {
		return ""
	}

	remoteURL := strings.TrimSpace(string(output))

	// Handle SSH: git@github.com:owner/repo.git
	sshRe := regexp.MustCompile(`git@github\.com:(.+/.+?)(?:\.git)?$`)
	if matches := sshRe.FindStringSubmatch(remoteURL); matches != nil {
		return matches[1]
	}

	// Handle HTTPS: https://github.com/owner/repo.git
	httpsRe := regexp.MustCompile(`https://github\.com/(.+/.+?)(?:\.git)?$`)
	if matches := httpsRe.FindStringSubmatch(remoteURL); matches != nil {
		return matches[1]
	}

	return ""
}

func promptForRepo() string {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Enter GitHub repo (owner/repo): ")
	repo, _ := reader.ReadString('\n')
	return strings.TrimSpace(repo)
}

// ============================================================================
// Main Application
// ============================================================================

func main() {
	ctx := context.Background()
	repoFlag := flag.String("repo", "", "GitHub repository (owner/repo)")
	flag.Parse()

	fmt.Println("🔍 PR Age Chart Generator\n")

	// Determine the repository
	var repo string

	if *repoFlag != "" {
		repo = *repoFlag
		fmt.Printf("📦 Using specified repo: %s\n", repo)
	} else if isGitRepo() {
		detected := getGitHubRemote()
		if detected != "" {
			repo = detected
			fmt.Printf("📦 Detected GitHub repo: %s\n", repo)
		} else {
			fmt.Println("⚠️  Git repo found but no GitHub remote detected.")
			repo = promptForRepo()
		}
	} else {
		fmt.Println("📁 Not in a git repository.")
		repo = promptForRepo()
	}

	if repo == "" || !strings.Contains(repo, "/") {
		log.Fatal("❌ Invalid repo format. Expected: owner/repo")
	}

	parts := strings.SplitN(repo, "/", 2)
	owner, repoName := parts[0], parts[1]

	// Create Copilot client
	client := copilot.NewClient(nil)

	if err := client.Start(ctx); err != nil {
		log.Fatal(err)
	}
	defer client.Stop()

	cwd, _ := os.Getwd()
	session, err := client.CreateSession(ctx, &copilot.SessionConfig{
		Model: "gpt-5",
		SystemMessage: &copilot.SystemMessageConfig{
			Content: fmt.Sprintf(`
<context>
You are analyzing pull requests for the GitHub repository: %s/%s
The current working directory is: %s
</context>

<instructions>
- Use the GitHub MCP Server tools to fetch PR data
- Use your file and code execution tools to generate charts
- Save any generated images to the current working directory
- Be concise in your responses
</instructions>
`, owner, repoName, cwd),
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	defer session.Destroy()

	// Set up event handling
	session.On(func(event copilot.SessionEvent) {
		switch event.Type {
		case "assistant.message":
			if event.Data.Content != nil {
				fmt.Printf("\n🤖 %s\n\n", *event.Data.Content)
			}
		case "tool.execution_start":
			if event.Data.ToolName != nil {
				fmt.Printf("  ⚙️  %s\n", *event.Data.ToolName)
			}
		}
	})

	// Initial prompt - let Copilot figure out the details
	fmt.Println("\n📊 Starting analysis...\n")

	prompt := fmt.Sprintf(`
      Fetch the open pull requests for %s/%s from the last week.
      Calculate the age of each PR in days.
      Then generate a bar chart image showing the distribution of PR ages
      (group them into sensible buckets like <1 day, 1-3 days, etc.).
      Save the chart as "pr-age-chart.png" in the current directory.
      Finally, summarize the PR health - average age, oldest PR, and how many might be considered stale.
    `, owner, repoName)

	if _, err := session.SendAndWait(ctx, copilot.MessageOptions{Prompt: prompt}); err != nil {
		log.Fatal(err)
	}

	// Interactive loop
	fmt.Println("\n💡 Ask follow-up questions or type \"exit\" to quit.\n")
	fmt.Println("Examples:")
	fmt.Println("  - \"Expand to the last month\"")
	fmt.Println("  - \"Show me the 5 oldest PRs\"")
	fmt.Println("  - \"Generate a pie chart instead\"")
	fmt.Println("  - \"Group by author instead of age\"")
	fmt.Println()

	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("You: ")
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		if input == "" {
			continue
		}
		if strings.ToLower(input) == "exit" || strings.ToLower(input) == "quit" {
			fmt.Println("👋 Goodbye!")
			break
		}

		if _, err := session.SendAndWait(ctx, copilot.MessageOptions{Prompt: input}); err != nil {
			log.Printf("Error: %v", err)
		}
	}
}
