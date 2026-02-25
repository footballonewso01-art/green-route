import { useState, useEffect, useRef } from "react";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Camera, Palette, Smartphone, User, Check, Upload, Globe, Plus, GripVertical, Eye, EyeOff, Edit, Trash2, ExternalLink, X, Save } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const THEMES = [
  { id: "minimal-dark", name: "Minimal Dark", colors: "bg-background border-border" },
  { id: "sunset", name: "Sunset", colors: "bg-gradient-to-br from-orange-500/20 to-pink-500/20 border-pink-500/30 text-white" },
  { id: "ocean", name: "Ocean", colors: "bg-gradient-to-br from-blue-600/20 to-cyan-400/20 border-blue-500/30 text-white" },
  { id: "emerald", name: "Emerald", colors: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-white" },
  { id: "glass", name: "Glassmorphism", colors: "bg-white/5 backdrop-blur-xl border-white/10 text-white" },
];

// LinkItem Interface
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

export default function DashboardProfile() {
  const { user } = useAuth();

  // Profile State
  const [profileLoading, setProfileLoading] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState("minimal-dark");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Links State
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);

  // Inline Create State
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createUrl, setCreateUrl] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Load user profile
      setName(user.name || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setTheme(user.theme || "minimal-dark");
      if (user.avatar) {
        setAvatarPreview(pb.files.getUrl(user, user.avatar));
      }
      // Load links
      fetchLinks();
    }
  }, [user]);

  const fetchLinks = async () => {
    if (!user) return;
    try {
      const records = await pb.collection('links').getFullList<LinkItem>({
        filter: `user_id="${user.id}" && show_on_profile=true`,
        sort: 'order,-created',
      });
      setLinks(records);
    } catch (error: any) {
      toast.error("Failed to load links");
    } finally {
      setLinksLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("username", username);
    formData.append("bio", bio);
    formData.append("theme", theme);
    if (fileInputRef.current?.files?.[0]) {
      formData.append("avatar", fileInputRef.current.files[0]);
    }
    try {
      await pb.collection("users").update(user.id, formData);
      toast.success("Profile saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // --- LINK MANAGEMENT ---

  const handleCreateLink = async () => {
    if (!user || !createUrl) return toast.error("URL is required");
    setCreateLoading(true);

    // Generate a random slug for inline creation
    const randomSlug = Math.random().toString(36).substring(2, 8);
    const highestOrder = links.length > 0 ? Math.max(...links.map(l => l.order || 0)) : 0;

    try {
      const newRecord = await pb.collection('links').create<LinkItem>({
        user_id: user.id,
        title: createTitle,
        destination_url: createUrl,
        slug: randomSlug,
        show_on_profile: true,
        order: highestOrder + 1,
        active: true,
        mode: "redirect"
      });

      setLinks([...links, newRecord]);
      // Reset form
      setCreateTitle("");
      setCreateUrl("");
      setShowCreate(false);
      toast.success("Link added");
    } catch (error: any) {
      toast.error(error.message || "Failed to create link");
    } finally {
      setCreateLoading(false);
    }
  };

  const startEditing = (link: LinkItem) => {
    setEditingId(link.id);
    setEditTitle(link.title || "");
    setEditUrl(link.destination_url || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editUrl) return toast.error("URL is required");
    setEditLoading(true);
    try {
      await pb.collection('links').update(id, {
        title: editTitle,
        destination_url: editUrl,
      });
      setLinks(links.map(l => l.id === id ? { ...l, title: editTitle, destination_url: editUrl } : l));
      setEditingId(null);
      toast.success("Link updated");
    } catch (error: any) {
      toast.error("Failed to update link");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    try {
      await pb.collection('links').delete(id);
      setLinks(links.filter(l => l.id !== id));
      toast.success("Link deleted");
    } catch (error) {
      toast.error("Failed to delete link");
    }
  };

  const toggleProfileVisibility = async (id: string, currentStatus: boolean) => {
    try {
      await pb.collection('links').update(id, { show_on_profile: !currentStatus });
      setLinks(links.map((l) => (l.id === id ? { ...l, show_on_profile: !currentStatus } : l)));
    } catch (error: any) {
      toast.error("Failed to update visibility");
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    const newLinks = Array.from(links);
    const [reorderedItem] = newLinks.splice(sourceIndex, 1);
    newLinks.splice(destinationIndex, 0, reorderedItem);

    const reorderedWithOrder = newLinks.map((link, index) => ({ ...link, order: index }));
    setLinks(reorderedWithOrder);

    try {
      const promises = reorderedWithOrder.map((link) =>
        pb.collection('links').update(link.id, { order: link.order })
      );
      await Promise.all(promises);
    } catch (error) {
      toast.error("Failed to save new order");
      fetchLinks();
    }
  };

  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const profileLinks = links.filter(l => l.active && l.show_on_profile !== false);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Link-in-Bio Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your identity and links in one place</p>
        </div>
        <a
          href={`/u/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-accent hover:underline px-4 py-2 bg-accent/5 rounded-lg border border-accent/20 transition-all font-medium"
        >
          <Globe className="w-4 h-4" /> View Public Profile
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Editor */}
        <div className="lg:col-span-7 space-y-6">

          {/* Visuals Section */}
          <div className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Camera className="w-5 h-5 text-accent" /> Visuals
            </h2>

            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute -inset-1 bg-gradient-to-tr from-accent to-accent/50 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative w-24 h-24 rounded-full bg-surface border-2 border-border overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">Profile Picture</p>
                <button onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors mt-2">
                  Upload New Image
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium flex items-center gap-2 text-white">
                <Palette className="w-4 h-4 text-accent" /> Profile Theme
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`relative p-3 rounded-xl border text-left transition-all ${theme === t.id ? "border-accent bg-accent/5 ring-1 ring-accent/50" : "border-border bg-surface hover:border-accent/30"}`}
                  >
                    <div className={`w-full h-12 rounded-lg mb-2 ${t.colors} border`} />
                    <span className="text-xs font-medium block text-white">{t.name}</span>
                    {theme === t.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Identity Section */}
          <div className="glass-card p-6 space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-accent" /> Identity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Display Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short bio..." rows={2} className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors resize-none" />
            </div>
          </div>

          {/* Links Section */}
          <div className="bg-card/60 border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                <Globe className="w-5 h-5 text-accent" /> Links
              </h2>
              {!showCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Link
                </button>
              )}
            </div>

            {/* Inline Create Form */}
            {showCreate && (
              <div className="bg-surface p-4 rounded-xl border border-accent/30 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-medium text-white">New Link</h3>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div>
                  <input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Title (e.g. My Website)" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm mb-2" />
                  <input value={createUrl} onChange={(e) => setCreateUrl(e.target.value)} placeholder="URL (https://...)" type="url" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/5 px-2 py-1 rounded-md border border-accent/10">
                    <Check className="w-3 h-3 text-accent" />
                    Automatically added to profile
                  </div>
                  <button
                    onClick={handleCreateLink}
                    disabled={createLoading || !createUrl}
                    className="btn-primary-glow !py-1.5 !px-4 text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Link"}
                  </button>
                </div>
              </div>
            )}

            {/* Links List */}
            {linksLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
            ) : links.length === 0 && !showCreate ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No links added yet.</div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="profile-links" isDropDisabled={links.length <= 1}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {links.map((link, index) => (
                        <Draggable key={link.id} draggableId={link.id} index={index} isDragDisabled={links.length <= 1}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                // Prevent the item from snapping to 0,0 or disappearing when dragged outside
                              }}
                              className={`group bg-surface border border-border rounded-xl p-3 flex gap-3 transition-colors ${snapshot.isDragging ? 'shadow-xl border-accent/50 z-50 ring-2 ring-accent shadow-accent/20' : 'hover:border-accent/30'}`}
                            >
                              <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-white cursor-grab active:cursor-grabbing self-center p-1">
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                {editingId === link.id ? (
                                  <div className="space-y-2">
                                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="w-full px-2 py-1 rounded bg-background border border-accent/50 text-sm focus:outline-none" />
                                    <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="w-full px-2 py-1 rounded bg-background border border-accent/50 text-sm focus:outline-none" />
                                    <div className="flex gap-2 justify-end">
                                      <button onClick={cancelEditing} className="text-xs text-muted-foreground hover:text-white">Cancel</button>
                                      <button onClick={() => handleSaveEdit(link.id)} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">
                                        {editLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-white truncate">{link.title || "Untitled"}</p>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditing(link)} className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white">
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDeleteLink(link.id)} className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      {link.destination_url}
                                    </div>
                                  </>
                                )}
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

          <button
            onClick={handleSaveProfile}
            disabled={profileLoading}
            className="btn-primary-glow w-full flex items-center justify-center gap-2 py-3 mt-4 text-base font-bold shadow-lg shadow-accent/20"
          >
            {profileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Entire Profile"}
          </button>
        </div>

        {/* Right Col: Live Preview */}
        <div className="lg:col-span-5 relative hidden md:block">
          <div className="sticky top-24 flex flex-col items-center">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="w-4 h-4" /> Live Mobile Preview
            </div>

            {/* Phone Frame */}
            <div className="relative w-[320px] h-[640px] rounded-[52px] border-[10px] border-surface p-1 shadow-2xl overflow-hidden shadow-accent/20 bg-background/50">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-surface rounded-b-2xl z-20" />

              {/* Profile Inner Content (Dynamic Mockup) */}
              <div className={`w-full h-full ${activeTheme.colors} transition-colors duration-500 relative flex flex-col no-scrollbar rounded-[40px] overflow-hidden`}>
                <div className="p-6 pt-16 flex flex-col items-center flex-1 overflow-y-auto no-scrollbar pb-10">
                  {/* Dynamic Avatar */}
                  <div className="w-20 h-20 rounded-full bg-surface border-2 border-white/10 flex items-center justify-center overflow-hidden mb-4 shadow-xl shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold opacity-30 text-white">{name.charAt(0) || "?"}</span>
                    )}
                  </div>
                  {/* Dynamic Metadata */}
                  <h4 className="text-lg font-bold text-white mb-1">@{username || "username"}</h4>
                  <p className="text-sm text-white/70 text-center px-2">{bio || "Your bio will appear here..."}</p>

                  {/* Dynamic Links */}
                  <div className="w-full mt-8 space-y-3">
                    {profileLinks.length === 0 ? (
                      <div className="text-center text-white/40 text-sm italic mt-10">No visible links yet.</div>
                    ) : (
                      profileLinks.map(link => (
                        <div key={link.id} className="w-full py-3.5 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center group cursor-pointer shadow-lg shadow-black/5 flex items-center justify-center">
                          <span className="text-sm font-semibold text-white group-hover:scale-105 transition-transform">{link.title || "Untitled Link"}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-auto pt-10 pb-2 opacity-40 flex flex-col items-center gap-1 text-white shrink-0">
                    <Globe className="w-4 h-4" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">GreenRoute</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
