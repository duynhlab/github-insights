import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type AuthorOption = { author: string; is_bot: boolean };

export function AuthorMultiSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: AuthorOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(author: string) {
    onChange(value.includes(author) ? value.filter((a) => a !== author) : [...value, author]);
  }

  return (
    <div className="flex w-full items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-h-10 flex-1 justify-between font-normal"
          >
            <span className="flex flex-wrap items-center gap-1 truncate">
              {value.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                value.map((a) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))
              )}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search authors…" />
            <CommandList>
              <CommandEmpty>No author found.</CommandEmpty>
              <CommandGroup>
                {options.map(({ author, is_bot }) => {
                  const selected = value.includes(author);
                  return (
                    <CommandItem key={author} value={author} onSelect={() => toggle(author)}>
                      <Check className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
                      <span className="flex-1">{author}</span>
                      {is_bot && <Badge variant="warning">bot</Badge>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear author selection"
          title="Clear author selection"
          onClick={() => onChange([])}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
