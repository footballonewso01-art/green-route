import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { Search, ChevronLeft, ChevronRight, Ban, Check, ExternalLink, BarChart3, SortDesc, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

type LinkRecord = {
    id: string;
    destination_url: string;
    slug: string;
    active: boolean;
    clicks_count: number;
    user_id: string;
    created: string;
    expand?: {
        user_id?: {
            email: string;
        }
    }
};

export default function AdminLinks() {
    const navigate = useNavigate();
    const [links, setLinks] = useState<LinkRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [sortClicks, setSortClicks] = useState(false);

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const sortQuery = sortClicks ? "-clicks_count,-created" : "-created";
            let filterQuery = "";

            if (search) {
                filterQuery = `destination_url ~ "${search}" || slug ~ "${search}"`;
            }

            const result = await pb.collection("links").getList(page, 20, {
                sort: sortQuery,
                filter: filterQuery,
                expand: 'user_id',
                requestKey: null
            });
            setLinks(result.items as any[]);
            setTotalPages(result.totalPages);
        } catch (err) {
            console.error("Failed to fetch links", err);
            toast.error("Failed to load links");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, [page, search, sortClicks]);

    const toggleLinkStatus = async (linkId: string, currentStatus: boolean) => {
        try {
            await pb.collection("links").update(linkId, { active: !currentStatus });
            toast.success(currentStatus ? "Link deactivated" : "Link activated");
            setLinks(links.map(l => l.id === linkId ? { ...l, active: !currentStatus } : l));
        } catch (err) {
            console.error("Failed to toggle link status", err);
            toast.error("Could not update link status");
        }
    };

    return (
        <div className="space-y-6 pt-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Links Oversight</h1>
                        <p className="text-sm text-muted-foreground mt-1">Monitor and moderate all short links</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                        onClick={() => { setSortClicks(!sortClicks); setPage(1); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${sortClicks ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <SortDesc className="w-4 h-4" />
                        Most Clicks
                    </button>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search URL or slug..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-accent/50 transition-all placeholder:text-muted-foreground"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-sidebar-accent/30 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <th className="px-6 py-4">Link Details</th>
                                <th className="px-6 py-4">Owner</th>
                                <th className="px-6 py-4 text-right">Clicks</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : links.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No links found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                links.map((link) => {
                                    const shortUrl = `${window.location.host}/${link.slug}`;
                                    return (
                                        <tr key={link.id} className="hover:bg-surface-hover transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col max-w-[250px] sm:max-w-xs md:max-w-sm">
                                                    <a href={`http://${shortUrl}`} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline flex items-center gap-1.5 truncate">
                                                        {shortUrl}
                                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                                    </a>
                                                    <span className="text-xs text-muted-foreground truncate mt-1" title={link.destination_url}>
                                                        {link.destination_url}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/70 mt-1">
                                                        {new Date(link.created).toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs font-mono bg-background border border-border px-1.5 py-0.5 rounded text-foreground">
                                                        {link.user_id}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(link.user_id);
                                                            toast.success("User ID copied to clipboard");
                                                        }}
                                                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                                        title="Copy User ID"
                                                    >
                                                        <Share2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center justify-end gap-1.5 px-2 py-1 rounded bg-background border border-border min-w-[60px]">
                                                    <BarChart3 className="w-3.5 h-3.5 text-accent" />
                                                    <span className="text-sm font-medium">{link.clicks_count || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${!link.active ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'
                                                    }`}>
                                                    {!link.active ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                    {!link.active ? 'Disabled' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <button className={`p-2 rounded-lg transition-colors ${link.active
                                                                ? 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
                                                                : 'text-muted-foreground hover:bg-accent/10 hover:text-accent'
                                                                }`}>
                                                                {link.active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                            </button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-surface border-border">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-foreground">
                                                                    {link.active ? 'Deactivate Link?' : 'Activate Link?'}
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription className="text-muted-foreground">
                                                                    {link.active
                                                                        ? "This will cause the link to show an error or interstitial page instead of redirecting the user. Use this for spam or abuse."
                                                                        : "This will restore functionality to the link and allow it to redirect users normally."}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className={link.active ? "bg-red-500 hover:bg-red-600 text-white" : "bg-accent hover:bg-accent/90 text-white"}
                                                                    onClick={() => toggleLinkStatus(link.id, link.active)}
                                                                >
                                                                    {link.active ? "Yes, Deactivate" : "Yes, Activate"}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="p-2 border border-border rounded-lg disabled:opacity-50 text-foreground hover:bg-surface-hover transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="p-2 border border-border rounded-lg disabled:opacity-50 text-foreground hover:bg-surface-hover transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
