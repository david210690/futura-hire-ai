import { Building2, Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

export const OrgSwitcher = () => {
  const { orgs, currentOrg, switchOrg } = useCurrentOrg();
  const [open, setOpen] = useState(false);

  if (orgs.length <= 1) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <Building2 className="mr-2 h-4 w-4" />
          {currentOrg ? currentOrg.name : "Select org..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search organization..." />
          <CommandEmpty>No organization found.</CommandEmpty>
          <CommandGroup>
            {orgs.map((org) => (
              <CommandItem
                key={org.id}
                value={org.name}
                onSelect={() => {
                  switchOrg(org.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentOrg?.id === org.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {org.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
