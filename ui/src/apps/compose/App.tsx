// Compose UI main application
// Renders dynamic UI from JSON component specifications

import { useState, useCallback, useEffect, useMemo } from "react";
import { Box, Text, Button, Spinner, Flash } from "@primer/react";
import type { CallToolResult } from "@modelcontextprotocol/ext-apps";
import { useMcpApp } from "../../hooks/useMcpApp";
import { resolveBindings, hasBindings, getUnresolvedBindings } from "./bindings";
import type {
  ComposeUISpec,
  ComponentDefinition,
  StageDefinition,
  SubmitComponent,
  SectionComponent,
} from "./types";
import {
  TextInputComponent,
  TextareaInputComponent,
  SelectInputComponent,
  CheckboxInputComponent,
  InfoDisplayComponent,
  SectionLayoutComponent,
  DividerLayoutComponent,
} from "./components/CoreComponents";
import {
  RepoPickerInput,
  IssuePickerInput,
  PullRequestPickerInput,
  UserPickerInput,
  LabelPickerInput,
  MilestonePickerInput,
  ProjectPickerInput,
  BranchPickerInput,
  TagPickerInput,
  ReleasePickerInput,
  DiscussionPickerInput,
  WorkflowPickerInput,
  IssueTypePickerInput,
  TeamPickerInput,
  OrgPickerInput,
} from "./components/PickerComponents";

export function ComposeApp() {
  const [spec, setSpec] = useState<ComposeUISpec | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { app, error: appError, toolInput, callTool } = useMcpApp({
    appName: "github-mcp-server-compose",
  });

  // Parse spec from tool input
  useEffect(() => {
    if (!toolInput) return;

    try {
      const parsedSpec: ComposeUISpec = {
        title: toolInput.title as string,
        components: toolInput.components as ComponentDefinition[] | undefined,
        stages: toolInput.stages as StageDefinition[] | undefined,
      };
      setSpec(parsedSpec);
      console.log("Compose UI spec loaded:", parsedSpec);
    } catch (e) {
      console.error("Failed to parse compose spec:", e);
      setError("Failed to parse UI specification");
    }
  }, [toolInput]);

  // Get current components (from stages or direct components)
  const currentComponents = useMemo(() => {
    if (!spec) return [];
    if (spec.stages && spec.stages.length > 0) {
      return spec.stages[currentStageIndex]?.components || [];
    }
    return spec.components || [];
  }, [spec, currentStageIndex]);

  // Handle value changes
  const handleChange = useCallback((id: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setError(null);
  }, []);

  // Handle submit action
  const handleSubmit = useCallback(
    async (submitComp: SubmitComponent) => {
      setSubmitting(true);
      setError(null);

      try {
        // If there's a next stage, navigate to it
        if (submitComp.next && spec?.stages) {
          const nextIndex = spec.stages.findIndex((s) => s.id === submitComp.next);
          if (nextIndex >= 0) {
            setCurrentStageIndex(nextIndex);
            setSubmitting(false);
            return;
          }
        }

        // If there's an action, execute it
        if (submitComp.action) {
          // Resolve bindings in params
          const resolvedParams = submitComp.params
            ? resolveBindings(submitComp.params, values)
            : {};

          // Check for unresolved bindings
          const unresolved = getUnresolvedBindings(resolvedParams, values);
          if (unresolved.length > 0) {
            setError(`Missing required values: ${unresolved.join(", ")}`);
            setSubmitting(false);
            return;
          }

          console.log(`Executing action: ${submitComp.action}`, resolvedParams);
          const result = await callTool(submitComp.action, resolvedParams as Record<string, unknown>);

          if (result.isError) {
            const errorText = result.content?.find((c: { type: string }) => c.type === "text");
            setError((errorText as { text?: string })?.text || "Action failed");
          } else {
            setSuccess(`${submitComp.action} completed successfully`);
          }
        }
      } catch (e) {
        console.error("Submit failed:", e);
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setSubmitting(false);
      }
    },
    [spec, values, callTool]
  );

  // Render a single component - not memoized to ensure fresh values
  const renderComponent = (component: ComponentDefinition, currentValues: Record<string, unknown>, onChange: (id: string, value: unknown) => void, index: number): React.ReactNode => {
      // Use stable key: id if available, otherwise use index
      const key = component.id || `comp-${index}`;
      const componentValue = component.id ? currentValues[component.id] : undefined;

      // Resolve any bindings in component props
      const resolvedComponent = resolveBindings(component, currentValues) as ComponentDefinition;

      // Check if component should be hidden
      if (resolvedComponent.hidden) return null;

      // Check if component has unresolved bindings (disable it)
      const hasUnresolved = hasBindings(JSON.stringify(resolvedComponent));

      switch (resolvedComponent.type) {
        case "text":
          return (
            <TextInputComponent
              key={key}
              component={resolvedComponent}
              value={componentValue}
              onChange={(v) => onChange(component.id!, v)}
              disabled={hasUnresolved}
            />
          );

        case "textarea":
          return (
            <TextareaInputComponent
              key={key}
              component={resolvedComponent}
              value={componentValue}
              onChange={(v) => onChange(component.id!, v)}
              disabled={hasUnresolved}
            />
          );

        case "select":
          return (
            <SelectInputComponent
              key={key}
              component={resolvedComponent}
              value={componentValue}
              onChange={(v) => onChange(component.id!, v)}
              disabled={hasUnresolved}
            />
          );

        case "checkbox":
          return (
            <CheckboxInputComponent
              key={key}
              component={resolvedComponent}
              value={componentValue}
              onChange={(v) => onChange(component.id!, v)}
              disabled={hasUnresolved}
            />
          );

        case "repo_picker":
          return (
            <RepoPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "issue_picker":
          return (
            <IssuePickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "user_picker":
          return (
            <UserPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "label_picker":
          return (
            <LabelPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "milestone_picker":
          return (
            <MilestonePickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "project_picker":
          return (
            <ProjectPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "pr_picker":
          return (
            <PullRequestPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "branch_picker":
          return (
            <BranchPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "tag_picker":
          return (
            <TagPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "release_picker":
          return (
            <ReleasePickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "discussion_picker":
          return (
            <DiscussionPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "workflow_picker":
          return (
            <WorkflowPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "issue_type_picker":
          return (
            <IssueTypePickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "team_picker":
          return (
            <TeamPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "org_picker":
          return (
            <OrgPickerInput
              key={key}
              component={resolvedComponent}
              value={componentValue as any}
              onChange={(v) => onChange(component.id!, v)}
              callTool={callTool}
              disabled={hasUnresolved}
            />
          );

        case "section":
          return (
            <SectionLayoutComponent
              key={key}
              component={resolvedComponent as SectionComponent}
              values={currentValues}
              onChange={onChange}
              renderComponent={renderComponent}
            />
          );

        case "info":
          return <InfoDisplayComponent key={key} component={resolvedComponent} />;

        case "divider":
          return <DividerLayoutComponent key={key} />;

        case "submit":
          return (
            <Button
              key={key}
              variant={resolvedComponent.variant || "primary"}
              onClick={() => handleSubmit(resolvedComponent)}
              disabled={submitting || hasUnresolved}
              sx={{ mt: 2 }}
            >
              {submitting ? <Spinner size="small" /> : resolvedComponent.label}
            </Button>
          );

        default:
          console.warn("Unknown component type:", (resolvedComponent as any).type);
          return null;
      }
    };

  // Loading state
  if (!app) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <Spinner size="large" />
      </Box>
    );
  }

  // Error state
  if (appError) {
    return (
      <Flash variant="danger">
        Failed to connect: {appError.message}
      </Flash>
    );
  }

  // Waiting for spec
  if (!spec) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <Spinner size="medium" />
        <Text sx={{ ml: 2 }}>Loading UI...</Text>
      </Box>
    );
  }

  // Current stage info
  const currentStage = spec.stages?.[currentStageIndex];
  const stageTitle = currentStage?.title || spec.title;
  const showBackButton = spec.stages && currentStageIndex > 0;

  return (
    <Box sx={{ maxWidth: 600 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Text as="h2" sx={{ fontSize: 3, fontWeight: "bold" }}>
          {stageTitle}
        </Text>
        {spec.stages && (
          <Text color="fg.muted" fontSize={1}>
            Step {currentStageIndex + 1} of {spec.stages.length}
          </Text>
        )}
      </Box>

      {/* Error message */}
      {error && (
        <Flash variant="danger" sx={{ mb: 3 }}>
          {error}
        </Flash>
      )}

      {/* Success message */}
      {success && (
        <Flash variant="success" sx={{ mb: 3 }}>
          {success}
        </Flash>
      )}

      {/* Components */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {currentComponents.map((comp, index) => renderComponent(comp, values, handleChange, index))}
      </Box>

      {/* Back button for multi-stage */}
      {showBackButton && (
        <Button
          variant="invisible"
          onClick={() => setCurrentStageIndex((i) => i - 1)}
          sx={{ mt: 2 }}
        >
          ← Back
        </Button>
      )}
    </Box>
  );
}
