import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, ExternalLink, BarChart3, ToggleLeft, ToggleRight, Copy, Trash2, Edit, Loader2, GripVertical, Eye, EyeOff, Globe, QrCode, Download, X, Link2, LayoutGrid, List, Lock } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { QRCodeCanvas } from 'qrcode.react';
import { IconRenderer } from '@/components/icons/IconRenderer';
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { PLANS, PlanType } from '@/lib/plans';

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
  profile_id?: string;
  mode?: string;
  icon_type?: "preset" | "emoji" | "custom" | "none";
  icon_value?: string;
  size?: "regular" | "large";
  bg_image?: string;
  domain?: string;
}

interface ProfileItem {
  id: string;
  name?: string;
  slug: string;
}

export default function LinksManager() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [selectedProfileFilter, setSelectedProfileFilter] = useState("all");
  const [profileSelectorLinkId, setProfileSelectorLinkId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ slug: string; title: string; domain?: string } | null>(null);
  const [viewMode, setViewMode] = useState<"bento" | "list">(() => {
    return (localStorage.getItem("links_view_mode") as "bento" | "list") || "bento";
  });
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const qrRef = useRef<HTMLDivElement>(null);

  const fetchSparklines = async (linksList: LinkItem[]) => {
    if (linksList.length === 0) return;
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const filter = `link_id.user_id="${userId}" && created >= "${sevenDaysAgo.toISOString()}"`;

      // Paginate to collect ALL clicks (not capped at 5000)
      const allItems: { link_id: string; created: string }[] = [];
      let page = 1;
      const perPage = 500;
      let hasMore = true;
      while (hasMore) {
        const res = await pb.collection('clicks').getList(page, perPage, {
          filter,
          fields: 'link_id,created',
          sort: 'created',
          requestKey: null,
        });
        allItems.push(...(res.items as unknown as { link_id: string; created: string }[]));
        hasMore = res.totalPages > page;
        page++;
      }

      const sparks: Record<string, number[]> = {};
      linksList.forEach(link => { sparks[link.id] = [0,0,0,0,0,0,0]; });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      allItems.forEach(row => {
        if (sparks[row.link_id]) {
          const rowDate = new Date(row.created);
          rowDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - rowDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays >= 0 && diffDays <= 6) {
            sparks[row.link_id][6 - diffDays]++;
          }
        }
      });
      setSparklines(sparks);
    } catch (e) {
      console.error("Failed to fetch clicks for sparkline", e);
    }
  };

  const fetchLinks = async () => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;

      const [linksRecords, profilesRecords] = await Promise.all([
        pb.collection('links').getList<LinkItem>(1, 100, {
          filter: `user_id="${userId}"`,
          sort: 'order,-created',
        }),
        pb.collection('public_profiles').getFullList({
          filter: `user_id="${userId}"`,
          sort: 'created',
        })
      ]);

      setLinks(linksRecords.items);
      setProfiles(profilesRecords);

      // Load sparklines asynchronously without blocking the main UI
      fetchSparklines(linksRecords.items);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to fetch links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("links_view_mode", viewMode);
  }, [viewMode]);

  const userPlan = pb.authStore.model?.plan || "creator";
  const limit = PLANS[userPlan as PlanType]?.limits?.links ?? 3;
  const activeLinks = [...links]
    .filter(l => l.active)
    .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

  const filtered = links.filter((l) => {
    const matchesSearch = l.slug.includes(search) || l.destination_url.includes(search);
    if (!matchesSearch) return false;

    if (selectedProfileFilter === "all") return true;
    if (selectedProfileFilter === "none") return !l.profile_id || l.show_on_profile === false;
    return l.profile_id === selectedProfileFilter && l.show_on_profile !== false;
  });

  const toggleLink = async (id: string, currentActive: boolean) => {
    try {
      await pb.collection('links').update(id, { active: !currentActive });
      setLinks(links.map((l) => (l.id === id ? { ...l, active: !currentActive } : l)));
      toast.success("Link status updated");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to update link");
    }
  };

  const toggleProfileVisibility = async (id: string, currentStatus: boolean, profileId?: string) => {
    try {
      if (!currentStatus && profiles.length === 0) {
        toast.error("You must create a public profile first to show links on it");
        return;
      }

      const payload: { show_on_profile: boolean; profile_id?: string } = { show_on_profile: !currentStatus };
      if (!currentStatus) {
        if (profileId) {
          payload.profile_id = profileId;
        } else if (profiles.length === 1) {
          payload.profile_id = profiles[0].id;
        } else if (profiles.length > 1) {
          setProfileSelectorLinkId(id);
          return;
        }
      } else {
        payload.profile_id = "";
      }

      await pb.collection('links').update(id, payload);
      setLinks(links.map((l) => (l.id === id ? { ...l, show_on_profile: !currentStatus, profile_id: payload.profile_id } : l)));
      setProfileSelectorLinkId(null);
      toast.success(!currentStatus ? "Link will show on profile" : "Link hidden from profile");
    } catch (error: unknown) {
      toast.error((error as { message?: string }).message || "Failed to update visibility");
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    try {
      await pb.collection('links').delete(id);
      setLinks(links.filter((l) => l.id !== id));
      toast.success("Link deleted");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to delete link");
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

  const copyToClipboard = (slug: string, domain?: string) => {
    const baseUrl = domain ? `https://${domain}` : window.location.origin;
    const url = `${baseUrl}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const downloadQR = () => {
    if (!qrRef.current || !qrModal) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `linktery-${qrModal.slug}.png`;
    a.click();
    toast.success('QR code downloaded!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-surface rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-surface rounded animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-surface rounded-xl animate-pulse" />
        </div>
        <div className="h-11 w-full bg-surface rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="w-5 h-8 bg-surface rounded animate-pulse" />
              <div className="w-10 h-10 bg-surface rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-surface rounded animate-pulse" />
                <div className="h-3 w-48 bg-surface rounded animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-surface rounded animate-pulse" />
            </div>
          ))}
        </div>
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
        <div className="flex items-center gap-3">
          {/* View Toggle - Hidden on Mobile, only Desktop/Tablet can switch */}
          <div className="hidden sm:flex items-center bg-surface border border-border p-1 rounded-xl">
            <button 
              onClick={() => setViewMode("bento")} 
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "bento" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
              title="Bento View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")} 
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Link to="/dashboard/links/create" className="btn-primary-glow text-sm !py-2 !px-4 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Link
          </Link>
        </div>
      </div>

      {/* Profile Filters */}
      {profiles.length >= 1 && (
        <div className="flex flex-wrap items-center gap-2 bg-surface/30 border border-border/80 p-1.5 rounded-xl">
          <button
            onClick={() => setSelectedProfileFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedProfileFilter === "all" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            All Links
          </button>
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProfileFilter(p.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedProfileFilter === p.id ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p.name || `@${p.slug}`}
            </button>
          ))}
          <button
            onClick={() => setSelectedProfileFilter("none")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedProfileFilter === "none" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            Outside Profiles
          </button>
        </div>
      )}

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
          <div className="text-center py-16 glass-card space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-accent/5 border border-accent/10 flex items-center justify-center">
              <Link2 className="w-9 h-9 text-accent/40" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{search ? 'No results found' : 'No links yet'}</h3>
              <p className="text-sm text-muted-foreground mt-1">{search ? 'Try a different search term' : 'Create your first smart link to get started'}</p>
            </div>
            {!search && (
              <Link to="/dashboard/links/create" className="btn-primary-glow text-sm !py-2 !px-6 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create First Link
              </Link>
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="links-list" isDropDisabled={filtered.length <= 1}>
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef} 
                  className={viewMode === "bento" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-3"}
                >
                  {filtered.map((link, index) => {
                    // Force List View for mobile devices regardless of state
                    const effectiveViewMode = (typeof window !== 'undefined' && window.innerWidth < 640) ? 'list' : viewMode;
                    const activeIndex = link.active ? activeLinks.findIndex(al => al.id === link.id) : -1;
                    const isFrozen = link.active && limit !== -1 && activeIndex >= limit;
                    
                    return (
                    <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={search.length > 0 || filtered.length <= 1}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            ...provided.draggableProps.style,
                          }}
                          className={effectiveViewMode === "bento" 
                            ? `bento-card p-5 flex flex-col justify-between gap-4 transition-all duration-300 min-h-[160px] ${isFrozen ? '!border-amber-500/25 !bg-amber-500/[0.01]' : ''} ${snapshot.isDragging ? 'shadow-2xl border-accent ring-2 ring-accent shadow-accent/20 z-[9999]' : 'hover:shadow-glow'}`
                            : `glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-200 ${isFrozen ? '!border-amber-500/25 !bg-amber-500/[0.01]' : ''} ${snapshot.isDragging ? 'shadow-2xl border-accent ring-2 ring-accent shadow-accent/20 z-[9999]' : 'hover:border-accent/20'}`}
                        >
                          <div className={`flex items-start justify-between gap-3 ${effectiveViewMode === 'list' ? 'flex-1 min-w-0' : ''}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div {...provided.dragHandleProps} className="text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing p-1 -ml-2 -mt-2">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className={`w-12 h-12 bg-background border border-border rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${link.size === 'large' ? 'ring-2 ring-accent/30 shadow-lg shadow-accent/5' : ''}`}>
                                <IconRenderer type={link.icon_type} value={link.icon_value} url={link.destination_url} className="w-7 h-7 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-semibold text-accent ${effectiveViewMode === 'list' ? 'truncate max-w-[200px]' : 'break-all'}`}>
                                      {effectiveViewMode === 'bento' 
                                        ? (`${link.domain ? link.domain.replace('https://', '') : window.location.host}/${link.slug}`.length > 35 
                                            ? `${link.domain ? link.domain.replace('https://', '') : window.location.host}/${link.slug}`.substring(0, 35) + "..." 
                                            : `${link.domain ? link.domain.replace('https://', '') : window.location.host}/${link.slug}`)
                                        : `${link.domain ? link.domain.replace('https://', '') : window.location.host}/${link.slug}`
                                      }
                                    </span>
                                {link.title && <span className="text-xs font-medium px-2 py-0.5 rounded bg-surface border border-border">{link.title}</span>}
                                <button onClick={() => copyToClipboard(link.slug, link.domain)} className="text-muted-foreground hover:text-foreground transition-colors mr-1">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {isFrozen && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 uppercase tracking-wider shrink-0" title="This link is frozen because your plan limits are exceeded.">
                                    <Lock className="w-2.5 h-2.5" /> Frozen
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs text-muted-foreground flex items-center gap-1 ${effectiveViewMode === 'list' ? 'truncate max-w-[200px]' : 'break-all'}`}>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  {effectiveViewMode === 'bento'
                                    ? (link.destination_url.length > 35 ? link.destination_url.substring(0, 35) + "..." : link.destination_url)
                                    : link.destination_url
                                  }
                                </span>
                              </div>
                              </div>
                            </div>
                            
                            {effectiveViewMode === "bento" && (
                              <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="relative">
                                  {profileSelectorLinkId === link.id ? (
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          toggleProfileVisibility(link.id, false, e.target.value);
                                        } else {
                                          setProfileSelectorLinkId(null);
                                        }
                                      }}
                                      onBlur={() => setProfileSelectorLinkId(null)}
                                      autoFocus
                                      className="px-2 py-1 bg-surface border border-accent/40 rounded text-[10px] text-white focus:outline-none max-w-[100px]"
                                    >
                                      <option value="">Profile...</option>
                                      {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name || `@${p.slug}`}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <button
                                      onClick={() => toggleProfileVisibility(link.id, !!link.show_on_profile)}
                                      className={`p-2 rounded-xl transition-colors ${link.show_on_profile ? 'text-accent bg-accent/10 hover:bg-accent/20' : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'}`}
                                      title={link.show_on_profile ? "Visible on profile" : "Hidden from profile"}
                                    >
                                      {link.show_on_profile ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                  )}
                                </div>
                                <button onClick={() => setQrModal({ slug: link.slug, title: link.title || link.slug, domain: link.domain })} className="p-2 rounded-xl hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors" title="QR Code">
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <Link to={`/dashboard/links/edit/${link.id}`} className="p-2 rounded-xl hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors" title="Edit Full Settings">
                                  <Edit className="w-4 h-4" />
                                </Link>
                                <button onClick={() => deleteLink(link.id)} className="p-2 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
 
                          {effectiveViewMode === "bento" ? (
                            /* Bento Grid Bottom Section */
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                              <div className="flex items-center gap-6 ml-2">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="text-lg font-bold text-foreground">{(link.clicks_count || 0).toLocaleString()}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Clicks</div>
                                  </div>
                                  <div className="w-14 h-8 flex items-end gap-0.5 opacity-50" title="Clicks over last 7 days">
                                    {(sparklines[link.id] || [0,0,0,0,0,0,0]).map((val, i) => {
                                      const maxVal = Math.max(...(sparklines[link.id] || [0,0,0,0,0,0,0]), 1);
                                      return (
                                        <div key={i} className="w-1 bg-accent/50 rounded-t-sm transition-all" style={{ height: `${(val / maxVal) * 100}%`, minHeight: '2px' }} />
                                      );
                                    })}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="text-lg font-bold text-foreground">{((sparklines[link.id] || []).reduce((a,b)=>a+b,0)/7).toFixed(1)}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Avg.Daily</div>
                                  </div>
                                </div>
                              </div>
  
                              <div className="flex items-center gap-2">
                                <button onClick={() => toggleLink(link.id, link.active)} className="transition-colors scale-90" title="Toggle active status">
                                  {isFrozen ? (
                                    <ToggleRight className="w-8 h-8 text-amber-500" />
                                  ) : link.active ? (
                                    <ToggleRight className="w-8 h-8 text-accent" />
                                  ) : (
                                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                                  )}
                                </button>
                                
                                <Link to={`/dashboard/analytics?link=${link.id}`} className="p-2.5 rounded-xl bg-surface border border-border hover:border-accent/50 text-foreground transition-all tactile-btn" title="View Analytics">
                                  <BarChart3 className="w-4 h-4 text-accent" />
                                </Link>
                              </div>
                            </div>
                          ) : (
                            /* List View Right Side Actions */
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <div className="text-lg font-bold text-foreground">{(link.clicks_count || 0).toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">clicks</div>
                              </div>
  
                              <div className="relative">
                                {profileSelectorLinkId === link.id ? (
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        toggleProfileVisibility(link.id, false, e.target.value);
                                      } else {
                                        setProfileSelectorLinkId(null);
                                      }
                                    }}
                                    onBlur={() => setProfileSelectorLinkId(null)}
                                    autoFocus
                                    className="px-2 py-1 bg-surface border border-accent/40 rounded text-xs text-white focus:outline-none"
                                  >
                                    <option value="">Select Profile...</option>
                                    {profiles.map(p => (
                                      <option key={p.id} value={p.id}>{p.name || `@${p.slug}`}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <button
                                    onClick={() => toggleProfileVisibility(link.id, !!link.show_on_profile)}
                                    className={`p-2 rounded-lg transition-colors ${link.show_on_profile ? 'text-accent bg-accent/10 hover:bg-accent/20' : 'text-muted-foreground bg-surface hover:bg-surface-hover'}`}
                                    title={link.show_on_profile ? "Visible on profile" : "Hidden from profile"}
                                  >
                                    {link.show_on_profile ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
  
                              <button onClick={() => toggleLink(link.id, link.active)} className="transition-colors" title="Toggle active status">
                                {isFrozen ? (
                                  <ToggleRight className="w-8 h-8 text-amber-500" />
                                ) : link.active ? (
                                  <ToggleRight className="w-8 h-8 text-accent" />
                                ) : (
                                  <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                                )}
                              </button>
 
                              <div className="flex items-center gap-1">
                                <button onClick={() => setQrModal({ slug: link.slug, title: link.title || link.slug, domain: link.domain })} className="p-2 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors" title="QR Code">
                                  <QrCode className="w-4 h-4" />
                                </button>
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
                          )}
                        </div>
                      )}
                    </Draggable>
                  )})}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">QR Code</h3>
              <button onClick={() => setQrModal(null)} className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div ref={qrRef} className="bg-white rounded-2xl p-6 inline-block mx-auto">
              <QRCodeCanvas
                value={qrModal.domain ? `https://${qrModal.domain}/${qrModal.slug}` : `${window.location.origin}/${qrModal.slug}`}
                size={200}
                bgColor="#ffffff"
                fgColor="#0a0a0a"
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-sm text-muted-foreground font-medium truncate">{qrModal.title}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const baseUrl = qrModal.domain ? `https://${qrModal.domain}` : window.location.origin;
                  navigator.clipboard.writeText(`${baseUrl}/${qrModal.slug}`);
                  toast.success('Link copied!');
                }}
                className="flex-1 py-2.5 rounded-xl bg-surface border border-border text-foreground font-medium hover:bg-surface-hover transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Copy className="w-4 h-4" /> Copy Link
              </button>
              <button
                onClick={downloadQR}
                className="flex-1 py-2.5 rounded-xl btn-primary-glow font-medium flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
