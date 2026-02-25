import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, ExternalLink, BarChart3, ToggleLeft, ToggleRight, Copy, Trash2, Edit, Loader2, GripVertical, Eye, EyeOff } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";

interface LinkItem {
  id: string;
  slug: string;
  destination_url: string;
  clicks_count: number;
  active: boolean;
  created: string;
  title?: string;
  order?: number;
  show_on_profile?: boolean;
  mode?: string;
}

export default function LinksManager() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLinks = async () => {
    try {
      const userId = pb.authStore.model?.id;
      const records = await pb.collection('links').getFullList<LinkItem>({
        filter: `user_id="${userId}"`,
        sort: 'order,-created',
      });
      setLinks(records);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const filtered = links.filter((l) => l.slug.includes(search) || l.destination_url.includes(search));

  const toggleLink = async (id: string, currentActive: boolean) => {
    try {
      await pb.collection('links').update(id, { active: !currentActive });
      setLinks(links.map((l) => (l.id === id ? { ...l, active: !currentActive } : l)));
      toast.success("Link status updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update link");
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    try {
      await pb.collection('links').delete(id);
      setLinks(links.filter((l) => l.id !== id));
      toast.success("Link deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete link");
    }
  };

  const toggleProfileVisibility = async (id: string, currentStatus: boolean) => {
    try {
      await pb.collection('links').update(id, { show_on_profile: !currentStatus });
      setLinks(links.map((l) => (l.id === id ? { ...l, show_on_profile: !currentStatus } : l)));
      toast.success(!currentStatus ? "Link will show on profile" : "Link hidden from profile");
    } catch (error: any) {
      toast.error(error.message || "Failed to update visibility");
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newLinks = Array.from(filtered);
    const [reorderedItem] = newLinks.splice(sourceIndex, 1);
    newLinks.splice(destinationIndex, 0, reorderedItem);

    // Update local state immediately for snappy UI
    // If there is an active search, we only reorder the filtered items. 
    // It's safer to block DND if search is active, but we'll allow it for simplicity within the filtered list.
    const updatedLinks = links.map(l => newLinks.find(nl => nl.id === l.id) || l);
    // Actually we need to recalculate the 'order' field for the visible items
    const reorderedWithOrder = newLinks.map((link, index) => ({ ...link, order: index }));

    // Update main links array with new orders
    const finalLinks = links.map(l => {
      const found = reorderedWithOrder.find(r => r.id === l.id);
      return found ? { ...l, order: found.order } : l;
    });

    setLinks(finalLinks.sort((a, b) => (a.order || 0) - (b.order || 0)));

    // Sync to backend
    try {
      // Create an array of update promises
      const promises = reorderedWithOrder.map((link) =>
        pb.collection('links').update(link.id, { order: link.order })
      );
      await Promise.all(promises);
    } catch (error) {
      toast.error("Failed to save new order");
      fetchLinks(); // revert on failure
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Links</h1>
          <p className="text-muted-foreground text-sm mt-1">{links.length} total links</p>
        </div>
        <Link to="/dashboard/links/create" className="btn-primary-glow text-sm !py-2 !px-4 inline-flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" /> New Link
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search links..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none input-glow focus:border-accent/50 transition-colors"
        />
      </div>

      {/* Links list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <p className="text-muted-foreground">No links found</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="links-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {filtered.map((link, index) => (
                    <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={search.length > 0}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-200 ${snapshot.isDragging ? 'shadow-xl border-accent shadow-accent/10 z-50' : 'hover:border-accent/20'}`}
                        >
                          <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1">
                            <GripVertical className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-accent">/{link.slug}</span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-surface border border-border">{link.title || "Untitled"}</span>
                              <button onClick={() => copyToClipboard(link.slug)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground truncate max-w-[200px] flex items-center gap-1">
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                {link.destination_url}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${link.mode === 'smart' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                  link.mode === 'landing' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                    'bg-accent/10 text-accent border border-accent/20'
                                }`}>
                                {link.mode || 'redirect'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-lg font-bold text-foreground">{(link.clicks_count || 0).toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">clicks</div>
                            </div>

                            {/* Profile Toggle */}
                            <button
                              onClick={() => toggleProfileVisibility(link.id, !!link.show_on_profile)}
                              className={`p-2 rounded-lg transition-colors ${link.show_on_profile !== false ? 'text-accent bg-accent/10 hover:bg-accent/20' : 'text-muted-foreground bg-surface hover:bg-surface-hover'}`}
                              title={link.show_on_profile !== false ? "Visible on profile" : "Hidden from profile"}
                            >
                              {link.show_on_profile !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>

                            <button onClick={() => toggleLink(link.id, link.active)} className="transition-colors" title="Toggle active status">
                              {link.active ? (
                                <ToggleRight className="w-8 h-8 text-accent" />
                              ) : (
                                <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                              )}
                            </button>

                            <div className="flex items-center gap-1">
                              <Link to={`/dashboard/analytics?link=${link.id}`} className="p-2 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors">
                                <BarChart3 className="w-4 h-4" />
                              </Link>
                              <Link to={`/dashboard/links/edit/${link.id}`} className="p-2 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors">
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button onClick={() => deleteLink(link.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
