package github

import (
	"testing"

	"github.com/github/github-mcp-server/internal/toolsnaps"
	"github.com/github/github-mcp-server/pkg/translations"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func Test_ComposeUI(t *testing.T) {
	t.Parallel()

	serverTool := ComposeUI(translations.NullTranslationHelper)
	tool := serverTool.Tool

	// Test toolsnap
	require.NoError(t, toolsnaps.Test(tool.Name, tool))

	// Verify basic properties
	assert.Equal(t, "compose_ui", tool.Name)
	assert.True(t, tool.Annotations.ReadOnlyHint, "compose_ui tool should be read-only")

	// Verify UI metadata
	require.NotNil(t, tool.Meta)
	uiMeta, ok := tool.Meta["ui"].(map[string]any)
	require.True(t, ok, "tool should have ui metadata")
	assert.Equal(t, ComposeUIResourceURI, uiMeta["resourceUri"])
}
