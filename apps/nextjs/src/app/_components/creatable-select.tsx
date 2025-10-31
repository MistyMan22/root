"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, PlusIcon } from "@radix-ui/react-icons";

import { cn } from "@acme/ui";
import { Input } from "@acme/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

export interface CreatableSelectOption {
  value: string;
  label: string;
}

export interface CreatableSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: CreatableSelectOption[];
  /** Additional options provided by parent (e.g., staged/unsaved items) */
  extraOptions?: CreatableSelectOption[];
  /** Creation mode: staged (local only) or immediate (persist now) */
  mode?: "staged" | "immediate";
  /** For immediate mode: create on server and return new id */
  onCreateNew?: (name: string) => Promise<string>;
  /** For staged mode: notify parent of a newly staged item */
  onStagedCreate?: (temp: { id: string; label: string }) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Compact variant for header/toolbar placement */
  compact?: boolean;
}

export const CreatableSelect = ({
  value,
  onChange,
  options,
  extraOptions = [],
  mode = "staged",
  onCreateNew,
  onStagedCreate,
  placeholder = "Select or create...",
  label,
  disabled = false,
  className,
  compact = false,
}: CreatableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showCreateOption, setShowCreateOption] = useState(false);
  const [pendingLabelsByValue, setPendingLabelsByValue] = useState<
    Record<string, string>
  >({});
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase()),
  );

  // Show create option if search doesn't match any existing option and search is not empty
  const shouldShowCreate =
    searchValue.trim() !== "" &&
    !filteredOptions.some(
      (option) => option.label.toLowerCase() === searchValue.toLowerCase(),
    );

  // Debugging logs to trace behavior end-to-end
  // eslint-disable-next-line no-console
  console.log("🔥 [CreatableSelect] RENDER START", {
    value,
    mode,
    baseOptionsCount: options.length,
    extraOptionsCount: extraOptions.length,
    disabled,
    isOpen,
    searchValue: searchValue.trim(),
    shouldShowCreate,
    showCreateOption,
    isCreating,
    pendingLabelsCount: Object.keys(pendingLabelsByValue).length,
  });

  // Update showCreateOption when searchValue changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] useEffect shouldShowCreate START", {
      searchValue,
      filteredOptionsCount: filteredOptions.length,
      shouldShowCreate,
      currentShowCreateOption: showCreateOption,
      createLabelPreview: `Create "${searchValue.trim()}"`,
    });
    setShowCreateOption(shouldShowCreate);
    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] useEffect shouldShowCreate END", {
      shouldShowCreate,
      newShowCreateOption: shouldShowCreate,
    });
  }, [shouldShowCreate]);

  // Merge options: parent-provided extra options first (e.g., staged), then base options
  const allOptions = [...extraOptions, ...options];
  // Find the selected option or fall back to a pending label we created
  const selectedOption = allOptions.find((option) => option.value === value);
  const fallbackLabel =
    value !== undefined ? pendingLabelsByValue[value] : undefined;

  // Debug: Log selection state
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] selection state", {
      value,
      selectedOption: selectedOption
        ? { value: selectedOption.value, label: selectedOption.label }
        : null,
      allOptionsCount: allOptions.length,
      optionValues: allOptions.map((o) => o.value),
      matchFound: !!selectedOption,
    });
  }, [value, selectedOption, allOptions]);

  const handleSelect = async (selectedValue: string) => {
    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] handleSelect START", {
      selectedValue,
      mode,
      searchValue: searchValue.trim(),
      isCreating,
      hasOnStagedCreate: !!onStagedCreate,
      hasOnCreateNew: !!onCreateNew,
    });

    if (selectedValue === "__create_new__") {
      const name = searchValue.trim();
      // eslint-disable-next-line no-console
      console.log("🔥 [CreatableSelect] handleSelect CREATE_NEW", {
        name,
        nameLength: name.length,
        isCreating,
        mode,
      });

      if (!name || isCreating) {
        // eslint-disable-next-line no-console
        console.log("🔥 [CreatableSelect] handleSelect CREATE_NEW ABORT", {
          reason: !name ? "no name" : "is creating",
          name,
          isCreating,
        });
        return;
      }

      if (mode === "immediate") {
        // eslint-disable-next-line no-console
        console.log("🔥 [CreatableSelect] handleSelect IMMEDIATE MODE", {
          name,
        });
        // Persist now
        if (!onCreateNew) {
          // eslint-disable-next-line no-console
          console.log("🔥 [CreatableSelect] handleSelect IMMEDIATE ABORT", {
            reason: "no onCreateNew",
          });
          return;
        }
        try {
          // eslint-disable-next-line no-console
          console.log("🔥 [CreatableSelect] handleSelect IMMEDIATE START", {
            name,
          });
          setIsCreating(true);
          const createdValue = await onCreateNew(name);
          // eslint-disable-next-line no-console
          console.log("🔥 [CreatableSelect] handleSelect IMMEDIATE SUCCESS", {
            createdValue,
            name,
          });
          setPendingLabelsByValue((prev) => {
            const newState = { ...prev, [createdValue]: name };
            // eslint-disable-next-line no-console
            console.log(
              "🔥 [CreatableSelect] setPendingLabelsByValue IMMEDIATE",
              { prev, newState },
            );
            return newState;
          });
          // eslint-disable-next-line no-console
          console.log(
            "🔥 [CreatableSelect] handleSelect IMMEDIATE CALLING onChange",
            { createdValue },
          );
          onChange(createdValue);
          // eslint-disable-next-line no-console
          console.log(
            "🔥 [CreatableSelect] handleSelect IMMEDIATE CALLING setSearchValue",
            { searchValue: "" },
          );
          setSearchValue("");
          // Give the parent component a chance to update its state before closing
          setTimeout(() => {
            // eslint-disable-next-line no-console
            console.log(
              "🔥 [CreatableSelect] handleSelect IMMEDIATE CALLING setIsOpen",
              { open: false },
            );
            setIsOpen(false);
          }, 0);
        } finally {
          // eslint-disable-next-line no-console
          console.log("🔥 [CreatableSelect] handleSelect IMMEDIATE FINALLY", {
            isCreating: false,
          });
          setIsCreating(false);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("🔥 [CreatableSelect] handleSelect STAGED MODE", { name });
        // Staged: generate a temporary id and notify parent
        const tempId = `temp:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
        // eslint-disable-next-line no-console
        console.log("🔥 [CreatableSelect] handleSelect STAGED GENERATED ID", {
          tempId,
          name,
        });

        setPendingLabelsByValue((prev) => {
          const newState = { ...prev, [tempId]: name };
          // eslint-disable-next-line no-console
          console.log("🔥 [CreatableSelect] setPendingLabelsByValue STAGED", {
            prev,
            newState,
          });
          return newState;
        });

        // eslint-disable-next-line no-console
        console.log(
          "🔥 [CreatableSelect] handleSelect STAGED CALLING onStagedCreate",
          { tempId, name, hasOnStagedCreate: !!onStagedCreate },
        );
        onStagedCreate?.({ id: tempId, label: name });

        // eslint-disable-next-line no-console
        console.log(
          "🔥 [CreatableSelect] handleSelect STAGED CALLING onChange",
          { tempId },
        );
        onChange(tempId);

        // eslint-disable-next-line no-console
        console.log(
          "🔥 [CreatableSelect] handleSelect STAGED CALLING setSearchValue",
          { searchValue: "" },
        );
        setSearchValue("");

        // Give the parent component a chance to update its state before closing
        // eslint-disable-next-line no-console
        console.log("🔥 [CreatableSelect] handleSelect STAGED DELAYING CLOSE", {
          tempId,
        });
        setTimeout(() => {
          // eslint-disable-next-line no-console
          console.log(
            "🔥 [CreatableSelect] handleSelect STAGED CALLING setIsOpen",
            { open: false },
          );
          setIsOpen(false);
        }, 0);

        // eslint-disable-next-line no-console
        console.log("🔥 [CreatableSelect] handleSelect STAGED COMPLETE", {
          tempId,
          name,
        });
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("🔥 [CreatableSelect] handleSelect EXISTING OPTION", {
        selectedValue,
      });
      // Select existing option
      // eslint-disable-next-line no-console
      console.log(
        "🔥 [CreatableSelect] handleSelect EXISTING CALLING onChange",
        { selectedValue },
      );
      onChange(selectedValue);
      // eslint-disable-next-line no-console
      console.log(
        "🔥 [CreatableSelect] handleSelect EXISTING CALLING setSearchValue",
        { searchValue: "" },
      );
      setSearchValue("");
      // Give the parent component a chance to update its state before closing
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(
          "🔥 [CreatableSelect] handleSelect EXISTING CALLING setIsOpen",
          { open: false },
        );
        setIsOpen(false);
      }, 0);
    }

    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] handleSelect END", { selectedValue });
  };

  const handleOpenChange = (open: boolean) => {
    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] handleOpenChange START", {
      open,
      currentIsOpen: isOpen,
    });
    setIsOpen(open);
    if (open) {
      // eslint-disable-next-line no-console
      console.log("🔥 [CreatableSelect] handleOpenChange OPENING", {
        inputRef: !!inputRef.current,
      });
      // Focus input when opening
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log("🔥 [CreatableSelect] handleOpenChange FOCUS TIMEOUT", {
          inputRef: !!inputRef.current,
        });
        inputRef.current?.focus();
      }, 0);
    } else {
      // eslint-disable-next-line no-console
      console.log("🔥 [CreatableSelect] handleOpenChange CLOSING", {
        searchValue,
      });
      // Clear search when closing
      setSearchValue("");
      // eslint-disable-next-line no-console
      console.log("🔥 [CreatableSelect] handleOpenChange CLEARED SEARCH");
    }
    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] handleOpenChange END", { open });
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] handleKeyDown START", {
      key: e.key,
      shouldShowCreate,
      searchValue: searchValue.trim(),
      isEnter: e.key === "Enter",
    });

    if (e.key === "Enter" && shouldShowCreate) {
      // eslint-disable-next-line no-console
      console.log("🔥 [CreatableSelect] handleKeyDown ENTER CREATE", {
        searchValue: searchValue.trim(),
      });
      e.preventDefault();
      await handleSelect("__create_new__");
      // eslint-disable-next-line no-console
      console.log("🔥 [CreatableSelect] handleKeyDown ENTER CREATE COMPLETE");
    } else {
      // eslint-disable-next-line no-console
      console.log("🔥 [CreatableSelect] handleKeyDown NOT ENTER CREATE", {
        reason: e.key !== "Enter" ? "not enter" : "shouldShowCreate false",
        key: e.key,
        shouldShowCreate,
      });
    }

    // eslint-disable-next-line no-console
    console.log("🔥 [CreatableSelect] handleKeyDown END", {
      key: e.key,
      shouldShowCreate,
    });
  };

  return (
    <div className={cn(compact ? "" : "space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <Select
        value={value}
        open={isOpen}
        onOpenChange={handleOpenChange}
        disabled={disabled}
        // Controlled component - value prop ensures selection state is maintained
        onValueChange={async (v) => {
          // eslint-disable-next-line no-console
          console.log("🔥 [CreatableSelect] onValueChange START", {
            v,
            currentValue: value,
            isOpen,
            searchValue: searchValue.trim(),
          });
          await handleSelect(v);
          // eslint-disable-next-line no-console
          console.log("🔥 [CreatableSelect] onValueChange END", { v });
        }}
      >
        <div
          className={cn(
            compact &&
              value !== undefined &&
              "relative rounded-md bg-purple-600 p-[1.5px]",
          )}
        >
          <SelectTrigger
            className={cn(
              compact ? "h-8 px-2.5 py-1.5 text-xs" : "w-full",
              compact &&
                value !== undefined &&
                "border-0 bg-white shadow-sm hover:bg-gray-50",
              compact &&
                value === undefined &&
                "border-gray-300 bg-white shadow-sm hover:bg-gray-50",
            )}
          >
            <SelectValue placeholder={placeholder}>
              {selectedOption?.label ?? fallbackLabel ?? placeholder}
            </SelectValue>
          </SelectTrigger>
        </div>

        <SelectContent>
          {/* Search input */}
          <div className="border-b p-2">
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => {
                const newValue = e.target.value;
                // eslint-disable-next-line no-console
                console.log("🔥 [CreatableSelect] search onChange START", {
                  oldValue: searchValue,
                  newValue,
                  shouldShowCreate:
                    newValue.trim() !== "" &&
                    !filteredOptions.some(
                      (option) =>
                        option.label.toLowerCase() === newValue.toLowerCase(),
                    ),
                });
                setSearchValue(newValue);
                // eslint-disable-next-line no-console
                console.log("🔥 [CreatableSelect] search onChange END", {
                  newValue,
                });
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search or type to create..."
              className="h-8"
            />
          </div>

          {/* Filtered options */}
          {(() => {
            const items = [...extraOptions, ...filteredOptions];
            // eslint-disable-next-line no-console
            console.log("[CreatableSelect] options render", {
              itemCount: items.length,
              items,
            });
            return items;
          })().map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              onPointerDown={(e) => {
                // eslint-disable-next-line no-console
                console.log("🔥 [CreatableSelect] pointerDown OPTION START", {
                  option,
                  eventType: e.type,
                  currentValue: value,
                  isOpen,
                });
                // eslint-disable-next-line no-console
                console.log("🔥 [CreatableSelect] pointerDown OPTION END", {
                  option,
                });
              }}
            >
              <div className="flex items-center">
                <CheckIcon className="mr-2 h-4 w-4 opacity-0 group-data-[selected]:opacity-100" />
                {option.label}
              </div>
            </SelectItem>
          ))}

          {/* Create new option */}
          {showCreateOption && (
            <SelectItem
              value="__create_new__"
              className="text-blue-600"
              onPointerDown={async (e) => {
                // eslint-disable-next-line no-console
                console.log("🔥 [CreatableSelect] pointerDown CREATE START", {
                  name: searchValue.trim(),
                  mode,
                  eventType: e.type,
                  currentValue: value,
                  isOpen,
                  shouldShowCreate,
                });
                // Prevent default and manually trigger selection
                e.preventDefault();
                // eslint-disable-next-line no-console
                console.log(
                  "🔥 [CreatableSelect] pointerDown CREATE CALLING handleSelect",
                  { value: "__create_new__" },
                );
                await handleSelect("__create_new__");
                // eslint-disable-next-line no-console
                console.log("🔥 [CreatableSelect] pointerDown CREATE COMPLETE");
              }}
            >
              <div className="flex items-center">
                <PlusIcon className="mr-2 h-4 w-4" />
                Create "{searchValue.trim()}"
              </div>
            </SelectItem>
          )}

          {/* No options message */}
          {filteredOptions.length === 0 && !showCreateOption && searchValue && (
            <div className="px-2 py-1.5 text-sm text-gray-500">
              No options found
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

// AGENT NOTES: CreatableSelect
// - Controlled Radix select with support for inline creation (staged vs immediate modes) and extensive logging for tracing UX flows.
// - The Select component now receives a `value` prop to maintain controlled state, ensuring selection state persists across page refreshes.
// - When a value is provided, Radix Select is controlled and will automatically set `data-[selected]` on matching SelectItems.
// - SelectValue children override allows custom display text (for pending/staged items) while maintaining Radix's selection state tracking.
// - Updated 2025-10-31: Added `value` prop to Select component to fix selection state persistence on page refresh.
// - Tracks temporary labels for created items so the trigger can render stable labels even before upstream persistence completes.
// - Compact variant (compact prop) optimized for header/toolbar placement with reduced height, smaller text, and tighter padding.
// - Updated 2025-10-31: converted to arrow declaration per workspace standard, added compact variant for header use, and ensured instrumentation remains intact for triaging list-creation issues.

// AGENT NOTES: File - creatable-select.tsx
// - Shared client component wrapping Radix Select with creatable semantics; logs intentionally verbose for debugging add-to-list problems.
// - Compact variant added to support sleek header placement of filter controls.
