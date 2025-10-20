"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "@radix-ui/react-icons";

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
  onCreateNew: (name: string) => Promise<string>;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function CreatableSelect({
  value,
  onChange,
  options,
  onCreateNew,
  placeholder = "Select or create...",
  label,
  disabled = false,
  className,
}: CreatableSelectProps) {
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

  // Update showCreateOption when searchValue changes
  useEffect(() => {
    setShowCreateOption(shouldShowCreate);
  }, [shouldShowCreate]);

  // Find the selected option or fall back to a pending label we created
  const selectedOption = options.find((option) => option.value === value);
  const fallbackLabel = (value && pendingLabelsByValue[value]) || undefined;

  const handleSelect = async (selectedValue: string) => {
    if (selectedValue === "__create_new__") {
      // Create new option and set selection once created
      const name = searchValue.trim();
      if (!name || isCreating) return;
      try {
        setIsCreating(true);
        const createdValue = await onCreateNew(name);
        setPendingLabelsByValue((prev) => ({ ...prev, [createdValue]: name }));
        onChange(createdValue);
      } finally {
        setIsCreating(false);
        setSearchValue("");
        setIsOpen(false);
      }
    } else {
      // Select existing option
      onChange(selectedValue);
      setSearchValue("");
      setIsOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Focus input when opening
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      // Clear search when closing
      setSearchValue("");
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && shouldShowCreate) {
      e.preventDefault();
      await handleSelect("__create_new__");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <Select open={isOpen} onOpenChange={handleOpenChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedOption?.label ?? fallbackLabel ?? placeholder}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {/* Search input */}
          <div className="border-b p-2">
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type to create..."
              className="h-8"
            />
          </div>

          {/* Filtered options */}
          {filteredOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              onSelect={() => handleSelect(option.value)}
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
              onSelect={() => handleSelect("__create_new__")}
              className="text-blue-600"
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
}
