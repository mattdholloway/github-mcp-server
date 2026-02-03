// GitHub picker components using Primer React SelectPanel

import { useState, useEffect, useCallback } from "react";
import {
  FormControl,
  ActionMenu,
  ActionList,
  Spinner,
  TextInput,
  Box,
  Text,
  Avatar,
  Token,
} from "@primer/react";
import {
  RepoIcon,
  LockIcon,
  IssueOpenedIcon,
  GitPullRequestIcon,
  PersonIcon,
  TagIcon,
  MilestoneIcon,
  ProjectIcon,
  GitBranchIcon,
  CommentDiscussionIcon,
  WorkflowIcon,
  IssueTrackedByIcon,
  PeopleIcon,
  OrganizationIcon,
  RocketIcon,
  TriangleDownIcon,
} from "@primer/octicons-react";
import type { CallToolResult } from "@modelcontextprotocol/ext-apps";
import type {
  RepoPickerComponent,
  IssuePickerComponent,
  PullRequestPickerComponent,
  UserPickerComponent,
  LabelPickerComponent,
  MilestonePickerComponent,
  ProjectPickerComponent,
  BranchPickerComponent,
  TagPickerComponent,
  ReleasePickerComponent,
  DiscussionPickerComponent,
  WorkflowPickerComponent,
  IssueTypePickerComponent,
  TeamPickerComponent,
  OrgPickerComponent,
  RepoItem,
  IssueItem,
  PullRequestItem,
  UserItem,
  LabelItem,
  MilestoneItem,
  ProjectItem,
  BranchItem,
  TagItem,
  ReleaseItem,
  DiscussionItem,
  WorkflowItem,
  IssueTypeItem,
  TeamItem,
  OrgItem,
} from "../types";

interface PickerProps<T, V> {
  component: T;
  value: V | V[] | null;
  onChange: (value: V | V[] | null) => void;
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
  disabled?: boolean;
}

// Helper to parse tool result
function parseToolResult<T>(result: CallToolResult, ...keys: string[]): T[] {
  if (result.isError || !result.content) {
    return [];
  }
  const textContent = result.content.find((c: { type: string }) => c.type === "text");
  if (!textContent || !("text" in textContent)) {
    return [];
  }
  try {
    const data = JSON.parse(textContent.text as string);
    // Try each key in order, or return data if it's an array
    for (const key of keys) {
      if (data[key]) {
        return data[key];
      }
    }
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Calculate contrast color for labels
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

// Repository Picker
export function RepoPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<RepoPickerComponent, RepoItem>) {
  const [items, setItems] = useState<RepoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedRepo = value as RepoItem | null;

  useEffect(() => {
    if (!filter.trim()) {
      setItems([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const result = await callTool("search_repositories", { query: filter, perPage: 10 });
        const repos = parseToolResult<{ id?: number; owner?: { login?: string } | string; name?: string; full_name?: string; private?: boolean }>(result, "repositories", "items");
        const mappedRepos = repos.map((r) => {
          // Parse owner from full_name if owner field is missing
          let owner = "";
          if (typeof r.owner === "string") {
            owner = r.owner;
          } else if (r.owner?.login) {
            owner = r.owner.login;
          } else if (r.full_name) {
            // Extract owner from full_name like "owner/repo"
            owner = r.full_name.split("/")[0] || "";
          }
          return {
            id: String(r.id || r.full_name),
            owner,
            name: r.name || "",
            fullName: r.full_name || `${owner}/${r.name}`,
            isPrivate: r.private || false,
          };
        });
        setItems(mappedRepos);
      } catch (e) {
        console.error("Repo search failed:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [filter, callTool]);

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={RepoIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedRepo ? selectedRepo.fullName : "Select repository..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="large">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search repositories..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList>
            {items.map((repo) => (
              <ActionList.Item
                key={repo.id}
                onSelect={() => {
                  onChange(repo);
                  setFilter("");
                }}
              >
                <ActionList.LeadingVisual>
                  {repo.isPrivate ? <LockIcon /> : <RepoIcon />}
                </ActionList.LeadingVisual>
                {repo.fullName}
              </ActionList.Item>
            ))}
            {!loading && !filter && items.length === 0 && (
              <ActionList.Item disabled>Type to search repositories...</ActionList.Item>
            )}
            {!loading && filter && items.length === 0 && (
              <ActionList.Item disabled>No repositories found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Issue Picker
export function IssuePickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<IssuePickerComponent, IssueItem>) {
  const [items, setItems] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedIssue = value as IssueItem | null;
  const { owner, repo } = component;

  // Check if we have resolved owner/repo
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const query = filter.trim() ? `repo:${owner}/${repo} ${filter}` : `repo:${owner}/${repo}`;
        const result = await callTool("search_issues", { query, perPage: 15 });
        const issues = parseToolResult<{ id?: string; node_id?: string; number: number; title: string; state: string }>(result, "items");
        setItems(
          issues.map((i) => ({
            id: i.node_id || String(i.number),
            number: i.number,
            title: i.title,
            state: i.state,
          }))
        );
      } catch (e) {
        console.error("Issue search failed:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [filter, owner, repo, hasRepoContext, callTool]);

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={IssueOpenedIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedIssue ? `#${selectedIssue.number} ${selectedIssue.title}` : "Select issue..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="xlarge">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search issues..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList>
            {items.map((issue) => (
              <ActionList.Item
                key={issue.id}
                onSelect={() => {
                  onChange(issue);
                  setFilter("");
                }}
              >
                <ActionList.LeadingVisual>
                  <IssueOpenedIcon />
                </ActionList.LeadingVisual>
                <Box>
                  <Text fontWeight="bold">#{issue.number}</Text>{" "}
                  <Text>{issue.title}</Text>
                </Box>
              </ActionList.Item>
            ))}
            {!loading && items.length === 0 && (
              <ActionList.Item disabled>No issues found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// User Picker
export function UserPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<UserPickerComponent, UserItem>) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedUsers = component.multiple ? (value as UserItem[] || []) : null;
  const selectedUser = !component.multiple ? (value as UserItem | null) : null;

  const { owner, repo } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      try {
        if (hasRepoContext) {
          // Use list_assignees for repo-scoped search
          const result = await callTool("list_assignees", { owner, repo });
          const assignees = parseToolResult<{ login: string; avatar_url?: string }>(result, "assignees");
          const filtered = filter
            ? assignees.filter((a) => a.login.toLowerCase().includes(filter.toLowerCase()))
            : assignees;
          setItems(
            filtered.map((a) => ({
              id: a.login,
              login: a.login,
              avatarUrl: a.avatar_url,
            }))
          );
        } else if (filter.trim()) {
          // Use search_users for global search
          const result = await callTool("search_users", { query: filter, perPage: 10 });
          const users = parseToolResult<{ login: string; avatar_url?: string }>(result, "items");
          setItems(
            users.map((u) => ({
              id: u.login,
              login: u.login,
              avatarUrl: u.avatar_url,
            }))
          );
        } else {
          setItems([]);
        }
      } catch (e) {
        console.error("User search failed:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [filter, owner, repo, hasRepoContext, callTool]);

  const handleSelect = useCallback(
    (user: UserItem) => {
      if (component.multiple) {
        const current = selectedUsers || [];
        const exists = current.some((u) => u.id === user.id);
        if (exists) {
          onChange(current.filter((u) => u.id !== user.id));
        } else {
          onChange([...current, user]);
        }
      } else {
        onChange(user);
        setFilter("");
      }
    },
    [component.multiple, selectedUsers, onChange]
  );

  const displayValue = component.multiple
    ? selectedUsers?.map((u) => u.login).join(", ") || "Select users..."
    : selectedUser?.login || "Select user...";

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={PersonIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {displayValue}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search users..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList selectionVariant={component.multiple ? "multiple" : "single"}>
            {items.map((user) => (
              <ActionList.Item
                key={user.id}
                selected={
                  component.multiple
                    ? selectedUsers?.some((u) => u.id === user.id)
                    : selectedUser?.id === user.id
                }
                onSelect={() => handleSelect(user)}
              >
                <ActionList.LeadingVisual>
                  {user.avatarUrl ? (
                    <Avatar src={user.avatarUrl} size={20} />
                  ) : (
                    <PersonIcon />
                  )}
                </ActionList.LeadingVisual>
                {user.login}
              </ActionList.Item>
            ))}
            {!loading && items.length === 0 && (
              <ActionList.Item disabled>
                {hasRepoContext || filter ? "No users found" : "Type to search..."}
              </ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Label Picker
export function LabelPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<LabelPickerComponent, LabelItem>) {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedLabels = (value as LabelItem[] | null) || [];
  const { owner, repo } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_label", { owner, repo });
        const labels = parseToolResult<{ id?: string; name: string; color: string }>(result, "labels");
        setItems(
          labels.map((l) => ({
            id: l.id || l.name,
            name: l.name,
            color: l.color,
          }))
        );
      } catch (e) {
        console.error("Label load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, repo, hasRepoContext, callTool]);

  const handleSelect = useCallback(
    (label: LabelItem) => {
      const exists = selectedLabels.some((l) => l.id === label.id);
      if (exists) {
        onChange(selectedLabels.filter((l) => l.id !== label.id));
      } else {
        onChange([...selectedLabels, label]);
      }
    },
    [selectedLabels, onChange]
  );

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  const filteredItems = filter
    ? items.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={TagIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedLabels.length > 0 ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {selectedLabels.map((l) => (
                <Token
                  key={l.id}
                  text={l.name}
                  sx={{ backgroundColor: `#${l.color}`, color: getContrastColor(l.color) }}
                />
              ))}
            </Box>
          ) : (
            "Select labels..."
          )}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter labels..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList selectionVariant="multiple">
            {filteredItems.map((label) => (
              <ActionList.Item
                key={label.id}
                selected={selectedLabels.some((l) => l.id === label.id)}
                onSelect={() => handleSelect(label)}
              >
                <ActionList.LeadingVisual>
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: `#${label.color}`,
                    }}
                  />
                </ActionList.LeadingVisual>
                {label.name}
              </ActionList.Item>
            ))}
            {!loading && filteredItems.length === 0 && (
              <ActionList.Item disabled>No labels found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Milestone Picker
export function MilestonePickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<MilestonePickerComponent, MilestoneItem>) {
  const [items, setItems] = useState<MilestoneItem[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedMilestone = value as MilestoneItem | null;
  const { owner, repo } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_milestones", { owner, repo });
        const milestones = parseToolResult<{ number: number; title: string }>(result, "milestones");
        setItems(
          milestones.map((m) => ({
            id: String(m.number),
            number: m.number,
            title: m.title,
          }))
        );
      } catch (e) {
        console.error("Milestone load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, repo, hasRepoContext, callTool]);

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={MilestoneIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedMilestone ? selectedMilestone.title : "Select milestone..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          {loading ? (
            <Box p={3} sx={{ textAlign: "center" }}>
              <Spinner size="small" />
            </Box>
          ) : (
            <ActionList selectionVariant="single">
              <ActionList.Item
                selected={!selectedMilestone}
                onSelect={() => onChange(null)}
              >
                No milestone
              </ActionList.Item>
              {items.map((milestone) => (
                <ActionList.Item
                  key={milestone.id}
                  selected={selectedMilestone?.id === milestone.id}
                  onSelect={() => onChange(milestone)}
                >
                  <ActionList.LeadingVisual>
                    <MilestoneIcon />
                  </ActionList.LeadingVisual>
                  {milestone.title}
                </ActionList.Item>
              ))}
            </ActionList>
          )}
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Project Picker
export function ProjectPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<ProjectPickerComponent, ProjectItem>) {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedProject = value as ProjectItem | null;
  const { owner } = component;
  const hasContext = owner && !owner.includes("{{");

  useEffect(() => {
    if (!hasContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_projects", { owner });
        const projects = parseToolResult<{ id?: string; number: number; title: string }>(result, "projects");
        setItems(
          projects.map((p) => ({
            id: p.id || String(p.number),
            number: p.number,
            title: p.title,
          }))
        );
      } catch (e) {
        console.error("Project load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, hasContext, callTool]);

  if (!hasContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={ProjectIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedProject ? selectedProject.title : "Select project..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          {loading ? (
            <Box p={3} sx={{ textAlign: "center" }}>
              <Spinner size="small" />
            </Box>
          ) : (
            <ActionList selectionVariant="single">
              {items.map((project) => (
                <ActionList.Item
                  key={project.id}
                  selected={selectedProject?.id === project.id}
                  onSelect={() => onChange(project)}
                >
                  <ActionList.LeadingVisual>
                    <ProjectIcon />
                  </ActionList.LeadingVisual>
                  {project.title}
                </ActionList.Item>
              ))}
              {items.length === 0 && (
                <ActionList.Item disabled>No projects found</ActionList.Item>
              )}
            </ActionList>
          )}
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Pull Request Picker
export function PullRequestPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<PullRequestPickerComponent, PullRequestItem>) {
  const [items, setItems] = useState<PullRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedPR = value as PullRequestItem | null;
  const { owner, repo, state = "open" } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_pull_requests", { owner, repo, state, perPage: 20 });
        const prs = parseToolResult<{ id?: string; node_id?: string; number: number; title: string; state: string; draft?: boolean }>(result);
        setItems(
          prs.map((pr) => ({
            id: pr.node_id || String(pr.number),
            number: pr.number,
            title: pr.title,
            state: pr.state,
            draft: pr.draft || false,
          }))
        );
      } catch (e) {
        console.error("PR search failed:", e);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [owner, repo, state, hasRepoContext, callTool]);

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  const filteredItems = filter
    ? items.filter((pr) => pr.title.toLowerCase().includes(filter.toLowerCase()) || String(pr.number).includes(filter))
    : items;

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={GitPullRequestIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedPR ? `#${selectedPR.number} ${selectedPR.title}` : "Select pull request..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="xlarge">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter pull requests..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList selectionVariant="single">
            {filteredItems.map((pr) => (
              <ActionList.Item
                key={pr.id}
                selected={selectedPR?.id === pr.id}
                onSelect={() => {
                  onChange(pr);
                  setFilter("");
                }}
              >
                <ActionList.LeadingVisual>
                  <GitPullRequestIcon />
                </ActionList.LeadingVisual>
                <Box>
                  <Text fontWeight="bold">#{pr.number}</Text>{" "}
                  <Text>{pr.title}</Text>
                  {pr.draft && <Text color="fg.muted"> (draft)</Text>}
                </Box>
              </ActionList.Item>
            ))}
            {!loading && filteredItems.length === 0 && (
              <ActionList.Item disabled>No pull requests found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Branch Picker
export function BranchPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<BranchPickerComponent, BranchItem>) {
  const [items, setItems] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedBranch = value as BranchItem | null;
  const { owner, repo } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_branches", { owner, repo, perPage: 100 });
        const branches = parseToolResult<{ name: string; protected?: boolean }>(result, "branches");
        setItems(
          branches.map((b) => ({
            name: b.name,
            protected: b.protected || false,
          }))
        );
      } catch (e) {
        console.error("Branch load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, repo, hasRepoContext, callTool]);

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  const filteredItems = filter
    ? items.filter((b) => b.name.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={GitBranchIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedBranch ? selectedBranch.name : "Select branch..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter branches..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList selectionVariant="single">
            {filteredItems.map((branch) => (
              <ActionList.Item
                key={branch.name}
                selected={selectedBranch?.name === branch.name}
                onSelect={() => {
                  onChange(branch);
                  setFilter("");
                }}
              >
                <ActionList.LeadingVisual>
                  <GitBranchIcon />
                </ActionList.LeadingVisual>
                {branch.name}
                {branch.protected && <Text color="fg.muted"> (protected)</Text>}
              </ActionList.Item>
            ))}
            {!loading && filteredItems.length === 0 && (
              <ActionList.Item disabled>No branches found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Tag Picker
export function TagPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<TagPickerComponent, TagItem>) {
  const [items, setItems] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedTag = value as TagItem | null;
  const { owner, repo } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_tags", { owner, repo, perPage: 100 });
        const tags = parseToolResult<{ name: string; commit?: { sha: string } }>(result, "tags");
        setItems(
          tags.map((t) => ({
            name: t.name,
            commitSha: t.commit?.sha || "",
          }))
        );
      } catch (e) {
        console.error("Tag load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, repo, hasRepoContext, callTool]);

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  const filteredItems = filter
    ? items.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={TagIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedTag ? selectedTag.name : "Select tag..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tags..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList selectionVariant="single">
            {filteredItems.map((tag) => (
              <ActionList.Item
                key={tag.name}
                selected={selectedTag?.name === tag.name}
                onSelect={() => {
                  onChange(tag);
                  setFilter("");
                }}
              >
                <ActionList.LeadingVisual>
                  <TagIcon />
                </ActionList.LeadingVisual>
                {tag.name}
              </ActionList.Item>
            ))}
            {!loading && filteredItems.length === 0 && (
              <ActionList.Item disabled>No tags found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Release Picker
export function ReleasePickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<ReleasePickerComponent, ReleaseItem>) {
  const [items, setItems] = useState<ReleaseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedRelease = value as ReleaseItem | null;
  const { owner, repo } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_releases", { owner, repo, perPage: 30 });
        const releases = parseToolResult<{ id?: number; tag_name: string; name?: string; draft?: boolean; prerelease?: boolean }>(result, "releases");
        setItems(
          releases.map((r) => ({
            id: String(r.id),
            tagName: r.tag_name,
            name: r.name || r.tag_name,
            draft: r.draft || false,
            prerelease: r.prerelease || false,
          }))
        );
      } catch (e) {
        console.error("Release load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, repo, hasRepoContext, callTool]);

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={RocketIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedRelease ? selectedRelease.name : "Select release..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          {loading ? (
            <Box p={3} sx={{ textAlign: "center" }}>
              <Spinner size="small" />
            </Box>
          ) : (
            <ActionList selectionVariant="single">
              {items.map((release) => (
                <ActionList.Item
                  key={release.id}
                  selected={selectedRelease?.id === release.id}
                  onSelect={() => onChange(release)}
                >
                  <ActionList.LeadingVisual>
                    <RocketIcon />
                  </ActionList.LeadingVisual>
                  <Box>
                    <Text>{release.name}</Text>
                    {release.draft && <Text color="fg.muted"> (draft)</Text>}
                    {release.prerelease && <Text color="attention.fg"> (pre-release)</Text>}
                  </Box>
                </ActionList.Item>
              ))}
              {items.length === 0 && (
                <ActionList.Item disabled>No releases found</ActionList.Item>
              )}
            </ActionList>
          )}
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Discussion Picker
export function DiscussionPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<DiscussionPickerComponent, DiscussionItem>) {
  const [items, setItems] = useState<DiscussionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedDiscussion = value as DiscussionItem | null;
  const { owner, repo } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_discussions", { owner, repo, perPage: 30 });
        const discussions = parseToolResult<{ id?: string; number: number; title: string; category?: { name: string } }>(result, "discussions");
        setItems(
          discussions.map((d) => ({
            id: d.id || String(d.number),
            number: d.number,
            title: d.title,
            category: d.category?.name || "",
          }))
        );
      } catch (e) {
        console.error("Discussion load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, repo, hasRepoContext, callTool]);

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  const filteredItems = filter
    ? items.filter((d) => d.title.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={CommentDiscussionIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedDiscussion ? `#${selectedDiscussion.number} ${selectedDiscussion.title}` : "Select discussion..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="xlarge">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter discussions..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList selectionVariant="single">
            {filteredItems.map((discussion) => (
              <ActionList.Item
                key={discussion.id}
                selected={selectedDiscussion?.id === discussion.id}
                onSelect={() => {
                  onChange(discussion);
                  setFilter("");
                }}
              >
                <ActionList.LeadingVisual>
                  <CommentDiscussionIcon />
                </ActionList.LeadingVisual>
                <Box>
                  <Text fontWeight="bold">#{discussion.number}</Text>{" "}
                  <Text>{discussion.title}</Text>
                  {discussion.category && <Text color="fg.muted"> ({discussion.category})</Text>}
                </Box>
              </ActionList.Item>
            ))}
            {!loading && filteredItems.length === 0 && (
              <ActionList.Item disabled>No discussions found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Workflow Picker
export function WorkflowPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<WorkflowPickerComponent, WorkflowItem>) {
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedWorkflow = value as WorkflowItem | null;
  const { owner, repo } = component;
  const hasRepoContext = owner && repo && !owner.includes("{{") && !repo.includes("{{");

  useEffect(() => {
    if (!hasRepoContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_workflows", { owner, repo });
        const workflows = parseToolResult<{ id?: number; name: string; path: string; state?: string }>(result, "workflows");
        setItems(
          workflows.map((w) => ({
            id: String(w.id),
            name: w.name,
            path: w.path,
            state: w.state || "active",
          }))
        );
      } catch (e) {
        console.error("Workflow load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, repo, hasRepoContext, callTool]);

  if (!hasRepoContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={WorkflowIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedWorkflow ? selectedWorkflow.name : "Select workflow..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          {loading ? (
            <Box p={3} sx={{ textAlign: "center" }}>
              <Spinner size="small" />
            </Box>
          ) : (
            <ActionList selectionVariant="single">
              {items.map((workflow) => (
                <ActionList.Item
                  key={workflow.id}
                  selected={selectedWorkflow?.id === workflow.id}
                  onSelect={() => onChange(workflow)}
                >
                  <ActionList.LeadingVisual>
                    <WorkflowIcon />
                  </ActionList.LeadingVisual>
                  <Box>
                    <Text>{workflow.name}</Text>
                    <Text color="fg.muted" fontSize={0}> {workflow.path}</Text>
                  </Box>
                </ActionList.Item>
              ))}
              {items.length === 0 && (
                <ActionList.Item disabled>No workflows found</ActionList.Item>
              )}
            </ActionList>
          )}
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Issue Type Picker
export function IssueTypePickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<IssueTypePickerComponent, IssueTypeItem>) {
  const [items, setItems] = useState<IssueTypeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedType = value as IssueTypeItem | null;
  const { owner } = component;
  const hasContext = owner && !owner.includes("{{");

  useEffect(() => {
    if (!hasContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("list_issue_types", { owner });
        const rawTypes = parseToolResult<{ id?: number; name: string; description?: string }>(result, "issue_types", "types");
        setItems(
          rawTypes.map((t) => ({
            id: String(t.id || t.name),
            name: t.name,
            description: t.description,
          }))
        );
      } catch (e) {
        console.error("Issue type load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, hasContext, callTool]);

  if (!hasContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select a repository first</Text>
      </FormControl>
    );
  }

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={IssueTrackedByIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedType ? selectedType.name : "Select issue type..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          {loading ? (
            <Box p={3} sx={{ textAlign: "center" }}>
              <Spinner size="small" />
            </Box>
          ) : (
            <ActionList selectionVariant="single">
              <ActionList.Item
                selected={!selectedType}
                onSelect={() => onChange(null)}
              >
                No type
              </ActionList.Item>
              {items.map((issueType) => (
                <ActionList.Item
                  key={issueType.id}
                  selected={selectedType?.id === issueType.id}
                  onSelect={() => onChange(issueType)}
                >
                  <ActionList.LeadingVisual>
                    <IssueTrackedByIcon />
                  </ActionList.LeadingVisual>
                  {issueType.name}
                </ActionList.Item>
              ))}
              {items.length === 0 && (
                <ActionList.Item disabled>No issue types configured</ActionList.Item>
              )}
            </ActionList>
          )}
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Team Picker
export function TeamPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<TeamPickerComponent, TeamItem>) {
  const [items, setItems] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedTeams = component.multiple ? (value as TeamItem[] || []) : null;
  const selectedTeam = !component.multiple ? (value as TeamItem | null) : null;
  const { owner } = component;
  const hasContext = owner && !owner.includes("{{");

  useEffect(() => {
    if (!hasContext) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await callTool("get_teams", { org: owner });
        const teams = parseToolResult<{ id?: number; slug: string; name: string }>(result, "teams");
        setItems(
          teams.map((t) => ({
            id: String(t.id || t.slug),
            slug: t.slug,
            name: t.name,
          }))
        );
      } catch (e) {
        console.error("Team load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [owner, hasContext, callTool]);

  const handleSelect = useCallback(
    (team: TeamItem) => {
      if (component.multiple) {
        const current = selectedTeams || [];
        const exists = current.some((t) => t.id === team.id);
        if (exists) {
          onChange(current.filter((t) => t.id !== team.id));
        } else {
          onChange([...current, team]);
        }
      } else {
        onChange(team);
        setFilter("");
      }
    },
    [component.multiple, selectedTeams, onChange]
  );

  if (!hasContext) {
    return (
      <FormControl required={component.required} disabled>
        {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
        <Text color="fg.muted" fontSize={1}>Select an organization first</Text>
      </FormControl>
    );
  }

  const filteredItems = filter
    ? items.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()) || t.slug.toLowerCase().includes(filter.toLowerCase()))
    : items;

  const displayValue = component.multiple
    ? selectedTeams?.map((t) => t.name).join(", ") || "Select teams..."
    : selectedTeam?.name || "Select team...";

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={PeopleIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {displayValue}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter teams..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList selectionVariant={component.multiple ? "multiple" : "single"}>
            {filteredItems.map((team) => (
              <ActionList.Item
                key={team.id}
                selected={
                  component.multiple
                    ? selectedTeams?.some((t) => t.id === team.id)
                    : selectedTeam?.id === team.id
                }
                onSelect={() => handleSelect(team)}
              >
                <ActionList.LeadingVisual>
                  <PeopleIcon />
                </ActionList.LeadingVisual>
                {team.name}
              </ActionList.Item>
            ))}
            {!loading && filteredItems.length === 0 && (
              <ActionList.Item disabled>No teams found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

// Organization Picker
export function OrgPickerInput({
  component,
  value,
  onChange,
  callTool,
  disabled,
}: PickerProps<OrgPickerComponent, OrgItem>) {
  const [items, setItems] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedOrg = value as OrgItem | null;

  useEffect(() => {
    if (!filter.trim()) {
      setItems([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const result = await callTool("search_orgs", { query: filter, perPage: 10 });
        const orgs = parseToolResult<{ id?: number; login: string; avatar_url?: string }>(result, "items", "organizations");
        setItems(
          orgs.map((o) => ({
            id: String(o.id || o.login),
            login: o.login,
            avatarUrl: o.avatar_url,
          }))
        );
      } catch (e) {
        console.error("Org search failed:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [filter, callTool]);

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button leadingVisual={OrganizationIcon} trailingVisual={TriangleDownIcon} sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedOrg ? selectedOrg.login : "Select organization..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          <Box p={2}>
            <TextInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search organizations..."
              block
              leadingVisual={() => loading ? <Spinner size="small" /> : null}
            />
          </Box>
          <ActionList selectionVariant="single">
            {items.map((org) => (
              <ActionList.Item
                key={org.id}
                selected={selectedOrg?.id === org.id}
                onSelect={() => {
                  onChange(org);
                  setFilter("");
                }}
              >
                <ActionList.LeadingVisual>
                  {org.avatarUrl ? (
                    <Avatar src={org.avatarUrl} size={20} />
                  ) : (
                    <OrganizationIcon />
                  )}
                </ActionList.LeadingVisual>
                {org.login}
              </ActionList.Item>
            ))}
            {!loading && !filter && items.length === 0 && (
              <ActionList.Item disabled>Type to search organizations...</ActionList.Item>
            )}
            {!loading && filter && items.length === 0 && (
              <ActionList.Item disabled>No organizations found</ActionList.Item>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}
