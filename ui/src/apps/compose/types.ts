// Component types for compose_ui

export type ComponentType =
  // Form inputs
  | "text"
  | "textarea"
  | "select"
  | "checkbox"
  // GitHub pickers
  | "repo_picker"
  | "issue_picker"
  | "pr_picker"
  | "user_picker"
  | "label_picker"
  | "milestone_picker"
  | "project_picker"
  | "branch_picker"
  | "tag_picker"
  | "release_picker"
  | "discussion_picker"
  | "workflow_picker"
  | "issue_type_picker"
  | "team_picker"
  | "org_picker"
  // Layout
  | "section"
  | "info"
  | "divider"
  // Actions
  | "submit";

// Base component definition
export interface BaseComponent {
  type: ComponentType;
  id?: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

// Text input component
export interface TextComponent extends BaseComponent {
  type: "text";
  placeholder?: string;
  defaultValue?: string;
}

// Textarea component
export interface TextareaComponent extends BaseComponent {
  type: "textarea";
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
}

// Select component
export interface SelectComponent extends BaseComponent {
  type: "select";
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}

// Checkbox component
export interface CheckboxComponent extends BaseComponent {
  type: "checkbox";
  defaultChecked?: boolean;
}

// GitHub picker components
export interface RepoPickerComponent extends BaseComponent {
  type: "repo_picker";
  multiple?: boolean;
}

export interface IssuePickerComponent extends BaseComponent {
  type: "issue_picker";
  owner: string; // Can be binding: {{repo.owner}}
  repo: string; // Can be binding: {{repo.name}}
  multiple?: boolean;
}

export interface UserPickerComponent extends BaseComponent {
  type: "user_picker";
  owner?: string; // For scoping to repo assignees
  repo?: string;
  multiple?: boolean;
}

export interface LabelPickerComponent extends BaseComponent {
  type: "label_picker";
  owner: string;
  repo: string;
  multiple?: boolean;
}

export interface MilestonePickerComponent extends BaseComponent {
  type: "milestone_picker";
  owner: string;
  repo: string;
}

export interface ProjectPickerComponent extends BaseComponent {
  type: "project_picker";
  owner: string;
  multiple?: boolean;
}

export interface PullRequestPickerComponent extends BaseComponent {
  type: "pr_picker";
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  multiple?: boolean;
}

export interface BranchPickerComponent extends BaseComponent {
  type: "branch_picker";
  owner: string;
  repo: string;
}

export interface TagPickerComponent extends BaseComponent {
  type: "tag_picker";
  owner: string;
  repo: string;
}

export interface ReleasePickerComponent extends BaseComponent {
  type: "release_picker";
  owner: string;
  repo: string;
}

export interface DiscussionPickerComponent extends BaseComponent {
  type: "discussion_picker";
  owner: string;
  repo: string;
  multiple?: boolean;
}

export interface WorkflowPickerComponent extends BaseComponent {
  type: "workflow_picker";
  owner: string;
  repo: string;
}

export interface IssueTypePickerComponent extends BaseComponent {
  type: "issue_type_picker";
  owner: string; // Organization
}

export interface TeamPickerComponent extends BaseComponent {
  type: "team_picker";
  owner: string; // Organization
  multiple?: boolean;
}

export interface OrgPickerComponent extends BaseComponent {
  type: "org_picker";
}

// Layout components
export interface SectionComponent extends BaseComponent {
  type: "section";
  title: string;
  components: ComponentDefinition[];
}

export interface InfoComponent extends BaseComponent {
  type: "info";
  variant?: "default" | "warning" | "danger" | "success";
  message: string;
}

export interface DividerComponent extends BaseComponent {
  type: "divider";
}

// Submit component
export interface SubmitComponent extends BaseComponent {
  type: "submit";
  label: string;
  variant?: "primary" | "danger" | "invisible";
  action?: string; // Tool to call
  params?: Record<string, unknown>; // Params with bindings
  next?: string; // Next stage ID for multi-stage flows
}

// Union of all component types
export type ComponentDefinition =
  | TextComponent
  | TextareaComponent
  | SelectComponent
  | CheckboxComponent
  | RepoPickerComponent
  | IssuePickerComponent
  | PullRequestPickerComponent
  | UserPickerComponent
  | LabelPickerComponent
  | MilestonePickerComponent
  | ProjectPickerComponent
  | BranchPickerComponent
  | TagPickerComponent
  | ReleasePickerComponent
  | DiscussionPickerComponent
  | WorkflowPickerComponent
  | IssueTypePickerComponent
  | TeamPickerComponent
  | OrgPickerComponent
  | SectionComponent
  | InfoComponent
  | DividerComponent
  | SubmitComponent;

// Stage definition for multi-stage flows
export interface StageDefinition {
  id: string;
  title?: string;
  components: ComponentDefinition[];
}

// Complete compose UI specification
export interface ComposeUISpec {
  title: string;
  components?: ComponentDefinition[];
  stages?: StageDefinition[];
}

// Picker item types
export interface RepoItem {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
}

export interface IssueItem {
  id: string;
  number: number;
  title: string;
  state: string;
}

export interface UserItem {
  id: string;
  login: string;
  avatarUrl?: string;
}

export interface LabelItem {
  id: string;
  name: string;
  color: string;
}

export interface MilestoneItem {
  id: string;
  number: number;
  title: string;
}

export interface ProjectItem {
  id: string;
  number: number;
  title: string;
}

export interface PullRequestItem {
  id: string;
  number: number;
  title: string;
  state: string;
  draft: boolean;
}

export interface BranchItem {
  name: string;
  protected: boolean;
}

export interface TagItem {
  name: string;
  commitSha: string;
}

export interface ReleaseItem {
  id: string;
  tagName: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
}

export interface DiscussionItem {
  id: string;
  number: number;
  title: string;
  category: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  path: string;
  state: string;
}

export interface IssueTypeItem {
  id: string;
  name: string;
  description?: string;
}

export interface TeamItem {
  id: string;
  slug: string;
  name: string;
}

export interface OrgItem {
  id: string;
  login: string;
  avatarUrl?: string;
}
