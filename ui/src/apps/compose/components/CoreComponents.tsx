// Core form components using Primer React

import {
  FormControl,
  TextInput,
  Textarea,
  Checkbox,
  ActionMenu,
  ActionList,
  Flash,
  Box,
  Text,
} from "@primer/react";
import type { TextComponent, TextareaComponent, SelectComponent, CheckboxComponent, InfoComponent as InfoComponentType, SectionComponent, ComponentDefinition } from "../types";

interface CoreComponentProps<T> {
  component: T;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function TextInputComponent({
  component,
  value,
  onChange,
  disabled,
}: CoreComponentProps<TextComponent>) {
  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <TextInput
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={component.placeholder}
        block
      />
    </FormControl>
  );
}

export function TextareaInputComponent({
  component,
  value,
  onChange,
  disabled,
}: CoreComponentProps<TextareaComponent>) {
  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <Textarea
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={component.placeholder}
        rows={component.rows || 4}
        block
      />
    </FormControl>
  );
}

export function SelectInputComponent({
  component,
  value,
  onChange,
  disabled,
}: CoreComponentProps<SelectComponent>) {
  const selectedOption = component.options.find((opt) => opt.value === value);

  return (
    <FormControl required={component.required} disabled={disabled || component.disabled}>
      {component.label && <FormControl.Label>{component.label}</FormControl.Label>}
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
      <ActionMenu>
        <ActionMenu.Button sx={{ width: "100%" }} disabled={disabled || component.disabled}>
          {selectedOption?.label || "Select..."}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          <ActionList selectionVariant="single">
            {component.options.map((option) => (
              <ActionList.Item
                key={option.value}
                selected={option.value === value}
                onSelect={() => onChange(option.value)}
              >
                {option.label}
              </ActionList.Item>
            ))}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </FormControl>
  );
}

export function CheckboxInputComponent({
  component,
  value,
  onChange,
  disabled,
}: CoreComponentProps<CheckboxComponent>) {
  return (
    <FormControl disabled={disabled || component.disabled}>
      <Checkbox
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
      <FormControl.Label>{component.label}</FormControl.Label>
      {component.description && <FormControl.Caption>{component.description}</FormControl.Caption>}
    </FormControl>
  );
}

export function InfoDisplayComponent({ component }: { component: InfoComponentType }) {
  const variantMap = {
    default: undefined,
    warning: "warning" as const,
    danger: "danger" as const,
    success: "success" as const,
  };

  return (
    <Flash variant={variantMap[component.variant || "default"]}>
      {component.message}
    </Flash>
  );
}

interface SectionComponentProps {
  component: SectionComponent;
  values: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
  renderComponent: (comp: ComponentDefinition, values: Record<string, unknown>, onChange: (id: string, value: unknown) => void, index: number) => React.ReactNode;
}

export function SectionLayoutComponent({
  component,
  values,
  onChange,
  renderComponent,
}: SectionComponentProps) {
  return (
    <Box
      borderWidth={1}
      borderStyle="solid"
      borderColor="border.default"
      borderRadius={2}
      p={3}
    >
      <Text as="h3" sx={{ fontSize: 1, fontWeight: "bold", mb: 3 }}>
        {component.title}
      </Text>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {component.components.map((child, idx) =>
          renderComponent(child, values, onChange, idx)
        )}
      </Box>
    </Box>
  );
}

export function DividerLayoutComponent() {
  return (
    <Box
      sx={{
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: "border.default",
        my: 2,
      }}
    />
  );
}
