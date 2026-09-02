import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listCustomDomainTargets, type CustomDomainTargetType } from "@/lib/customDomains";

export interface DomainTargetOption {
  id: string;
  type: CustomDomainTargetType;
  name: string;
  slug?: string;
}

export function DomainTargetPicker({ value, type, disabled, onChange }: {
  value?: DomainTargetOption;
  type?: CustomDomainTargetType;
  disabled?: boolean;
  onChange: (value: DomainTargetOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<DomainTargetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    let canceled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await listCustomDomainTargets({ type, query, perPage: 30 });
        if (!canceled) {
          setOptions(result.items);
          setHasMore(result.has_more);
          setFailed(false);
        }
      } catch { if (!canceled) setFailed(true); }
      finally { if (!canceled) setLoading(false); }
    }, query ? 200 : 0);
    return () => { canceled = true; window.clearTimeout(timer); };
  }, [open, query, type]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-label={type ? `Choose ${type === "profile" ? "Public Profile" : "Link"}` : "Change domain destination"} aria-expanded={open} disabled={disabled}
          className="h-11 w-full min-w-0 justify-between gap-3 rounded-xl border-white/[0.09] bg-black/25 px-3.5 text-left font-normal hover:bg-white/[0.07] hover:text-white">
          <span className="min-w-0 truncate">{value?.name || `Choose a ${type === "link" ? "Link" : type === "profile" ? "Public Profile" : "destination"}`}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={8} className="w-[var(--radix-popover-trigger-width)] min-w-[240px] max-w-[calc(100vw-32px)] rounded-xl border-white/10 bg-[#07110d] p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <Input aria-label="Search Links and Public Profiles" placeholder="Search by name or slug" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 border-white/10 bg-black/20 pl-9" />
        </div>
        <div role="listbox" aria-label="Destinations" className="max-h-64 overflow-y-auto">
          {loading ? <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div> :
            failed ? <p role="alert" className="p-3 text-xs text-muted-foreground">Could not load destinations. Close this list and try again.</p> :
            !options.length ? <p className="p-3 text-xs text-muted-foreground">No matching active destinations. Create a Link or Public Profile first.</p> :
            options.map((option) => (
              <button type="button" role="option" aria-selected={value?.id === option.id && value.type === option.type} key={`${option.type}:${option.id}`}
                onClick={() => { onChange(option); setOpen(false); }}
                className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white/85">{option.name}</span><span className="block truncate text-[11px] text-white/40">{option.type === "profile" ? "Profile" : "Link"} · /{option.slug}</span></span>
                {value?.id === option.id && value.type === option.type && <Check className="h-4 w-4 shrink-0 text-accent" />}
              </button>
            ))}
        </div>
        {!loading && hasMore && <p className="border-t border-white/5 px-3 pt-2 text-[11px] text-white/35">Type a name to find more destinations.</p>}
      </PopoverContent>
    </Popover>
  );
}
