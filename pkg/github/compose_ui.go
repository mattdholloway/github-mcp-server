package github

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/github/github-mcp-server/pkg/inventory"
	"github.com/github/github-mcp-server/pkg/translations"
	"github.com/github/github-mcp-server/pkg/utils"
	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// ComposeUIResourceURI is the URI for the compose_ui tool's MCP App resource.
const ComposeUIResourceURI = "ui://github-mcp-server/compose"

// ComposeUI creates a tool that allows the agent to compose dynamic UI from primitives.
func ComposeUI(t translations.TranslationHelperFunc) inventory.ServerTool {
	return NewTool(
		ToolsetMetadataContext,
		mcp.Tool{
			Name:        "compose_ui",
			Description: t("TOOL_COMPOSE_UI_DESCRIPTION", composeUIDescription),
			Annotations: &mcp.ToolAnnotations{
				Title:        t("TOOL_COMPOSE_UI_USER_TITLE", "Compose Dynamic UI"),
				ReadOnlyHint: true,
			},
			Meta: mcp.Meta{
				"ui": map[string]any{
					"resourceUri": ComposeUIResourceURI,
					"visibility":  []string{"model", "app"},
				},
			},
			InputSchema: &jsonschema.Schema{
				Type:     "object",
				Required: []string{"title"},
				Properties: map[string]*jsonschema.Schema{
					"title": {
						Type:        "string",
						Description: "Title displayed at the top of the UI",
					},
					"components": {
						Type:        "array",
						Description: "Array of component definitions for a single-stage UI",
						Items:       &jsonschema.Schema{Type: "object"},
					},
					"stages": {
						Type:        "array",
						Description: "Array of stage definitions for multi-stage flows",
						Items:       &jsonschema.Schema{Type: "object"},
					},
				},
			},
		},
		nil,
		func(_ context.Context, _ ToolDependencies, request *mcp.CallToolRequest, _ map[string]any) (*mcp.CallToolResult, any, error) {
			var params struct {
				Title      string           `json:"title"`
				Components []map[string]any `json:"components,omitempty"`
				Stages     []map[string]any `json:"stages,omitempty"`
			}

			if err := json.Unmarshal(request.Params.Arguments, &params); err != nil {
				return utils.NewToolResultError(fmt.Sprintf("failed to parse arguments: %v", err)), nil, nil
			}

			if params.Title == "" {
				return utils.NewToolResultError("title is required"), nil, nil
			}

			hasComponents := len(params.Components) > 0
			hasStages := len(params.Stages) > 0

			if !hasComponents && !hasStages {
				return utils.NewToolResultError("either 'components' or 'stages' must be provided"), nil, nil
			}

			if hasComponents && hasStages {
				return utils.NewToolResultError("cannot specify both 'components' and 'stages'; use 'stages' for multi-stage flows"), nil, nil
			}

			return utils.NewToolResultText(fmt.Sprintf("Compose UI '%s' ready for display", params.Title)), nil, nil
		},
	)
}

// composeUIDescription provides detailed guidance for the agent on how to use compose_ui.
const composeUIDescription = `Compose a dynamic UI from primitives. Use this to create custom forms 
that combine multiple GitHub entities (issues, PRs, projects, repos, users, etc.).

## Component Types

### Form Inputs
- text: Single-line text input (id, label, placeholder, defaultValue, required)
- textarea: Multi-line text input (id, label, placeholder, rows, required)
- select: Single-select dropdown (id, label, options: [{value, label}], defaultValue)
- checkbox: Boolean toggle (id, label, defaultChecked)

### GitHub Pickers (all require id, label)
- repo_picker: Repository search and selection
- issue_picker: Issue search (owner, repo required)
- pr_picker: Pull request selection (owner, repo, state: open/closed/all)
- user_picker: User/assignee search (owner, repo for scoped search)
- label_picker: Label multi-select (owner, repo required)
- milestone_picker: Milestone selection (owner, repo required)
- project_picker: Project selection (owner required)
- branch_picker: Branch selection (owner, repo required)
- tag_picker: Tag selection (owner, repo required)
- release_picker: Release selection (owner, repo required)
- discussion_picker: Discussion selection (owner, repo required)
- workflow_picker: GitHub Actions workflow selection (owner, repo required)
- issue_type_picker: Issue type selection (owner/org required)
- team_picker: Team selection (owner/org required)
- org_picker: Organization search

### Layout
- section: Group components with a title (title, components[])
- info: Display banner (message, variant: default/warning/danger/success)
- divider: Visual separator

### Actions
- submit: Button that executes an action (label, action, params, or next for multi-stage)

## Bindings
Use {{variable.property}} to reference values from previous components.
Common bindings: {{repo.owner}}, {{repo.name}}, {{issue.number}}, {{user.login}}

## Example: Add Issue to Project
{
  "title": "Add Issue to Project",
  "components": [
    {"type": "repo_picker", "id": "repo", "label": "Repository"},
    {"type": "issue_picker", "id": "issue", "label": "Issue", "owner": "{{repo.owner}}", "repo": "{{repo.name}}"},
    {"type": "project_picker", "id": "project", "label": "Project", "owner": "{{repo.owner}}"},
    {"type": "submit", "label": "Add to Project", "action": "add_project_item", "params": {"project_id": "{{project.id}}", "content_id": "{{issue.id}}"}}
  ]
}

## Example: Create Release
{
  "title": "Create Release",
  "components": [
    {"type": "repo_picker", "id": "repo", "label": "Repository"},
    {"type": "branch_picker", "id": "branch", "label": "Target Branch", "owner": "{{repo.owner}}", "repo": "{{repo.name}}"},
    {"type": "text", "id": "tag", "label": "Tag Name", "placeholder": "v1.0.0"},
    {"type": "text", "id": "name", "label": "Release Name"},
    {"type": "textarea", "id": "body", "label": "Release Notes", "rows": 6},
    {"type": "submit", "label": "Create Release", "action": "create_release", "params": {"owner": "{{repo.owner}}", "repo": "{{repo.name}}", "tag_name": "{{tag}}", "name": "{{name}}", "body": "{{body}}", "target_commitish": "{{branch.name}}"}}
  ]
}

## Multi-Stage Flows
Use "next" on submit to proceed to the next stage:
{
  "title": "Multi-Stage Example",
  "stages": [
    {
      "id": "step1",
      "components": [
        {"type": "repo_picker", "id": "repo", "label": "Select Repository"},
        {"type": "submit", "label": "Next", "next": "step2"}
      ]
    },
    {
      "id": "step2", 
      "components": [
        {"type": "issue_picker", "id": "issue", "label": "Select Issue", "owner": "{{repo.owner}}", "repo": "{{repo.name}}"},
        {"type": "submit", "label": "Create", "action": "issue_write", "params": {...}}
      ]
    }
  ]
}`
