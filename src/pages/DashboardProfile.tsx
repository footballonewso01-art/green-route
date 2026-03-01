import { useState, useEffect, useRef } from "react";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Camera, Palette, Smartphone, User, Check, Upload, Globe, Plus, GripVertical, Eye, EyeOff, Edit, Trash2, ExternalLink, X, Save, Lock } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { IconPicker } from '@/components/icons/IconPicker';
import { IconRenderer } from '@/components/icons/IconRenderer';
import { detectIconFromUrl } from '@/components/icons/detector';
import { checkPlan, canUseResource } from '@/lib/plans';
import { UpgradeModal } from "@/components/UpgradeModal";
import Cropper, { Area, Point } from 'react-easy-crop';
import { Link as RouterLink } from "react-router-dom";
import { getCroppedImg } from '@/lib/cropImage';

const THEMES = [
  { id: "minimal-dark", name: "Minimal Dark", colors: "bg-background border-border" },
  { id: "sunset", name: "Sunset", colors: "bg-gradient-to-br from-orange-500/20 to-pink-500/20 border-pink-500/30 text-white" },
  { id: "ocean", name: "Ocean", colors: "bg-gradient-to-br from-blue-600/20 to-cyan-400/20 border-blue-500/30 text-white" },
  { id: "emerald", name: "Emerald", colors: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-white" },
  { id: "glass", name: "Glassmorphism", colors: "bg-white/5 backdrop-blur-xl border-white/10 text-white" },
  { id: "custom", name: "Custom Background", colors: "bg-surface border-border border-dashed text-white" },
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
  icon_type?: "preset" | "emoji" | "custom" | "none";
  icon_value?: string;
  size?: "regular" | "large";
}

interface SocialLink {
  id: string;
  url: string;
  icon_type: "preset" | "emoji" | "custom" | "none";
  icon_value: string;
  label?: string;
}

export default function DashboardProfile() {
  const { user } = useAuth();

  const [profileLoading, setProfileLoading] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState(user?.theme || "minimal-dark");
  const userPlan = (user as any)?.plan || "creator";
  const canCustomize = checkPlan(userPlan, "profile_customization");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // Actual file to upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Theme Background State
  const [customBgPreview, setCustomBgPreview] = useState<string | null>(null);
  const [customBgFile, setCustomBgFile] = useState<File | null>(null);
  const customBgInputRef = useRef<HTMLInputElement>(null);

  // Avatar Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Links State
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Inline Create State
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createUrl, setCreateUrl] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createIconType, setCreateIconType] = useState<"preset" | "emoji" | "custom" | "none">("none");
  const [createIconValue, setCreateIconValue] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [createSize, setCreateSize] = useState<"regular" | "large">("regular");
  const [refreshing, setRefreshing] = useState(false); // Added from user's snippet

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editIconType, setEditIconType] = useState<"preset" | "emoji" | "custom" | "none">("none");
  const [editIconValue, setEditIconValue] = useState("");
  const [editSize, setEditSize] = useState<"regular" | "large">("regular");
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Load user profile
      setName(user.name || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      // theme is initialized directly in useState to prevent flashing
      if (user.avatar && user.collectionId) {
        setAvatarPreview(pb.files.getUrl(user as any, user.avatar));
      }
      if (user.custom_theme_bg && user.collectionId) {
        setCustomBgPreview(pb.files.getUrl(user as any, user.custom_theme_bg));
      }
      if (user.social_links) {
        setSocialLinks(Array.isArray(user.social_links) ? user.social_links : []);
      }
      // Load links
      fetchLinks();
    }
  }, [user]);

  // Auto-detect icon based on URL input
  useEffect(() => {
    if (createUrl && createIconType === "none") {
      const detected = detectIconFromUrl(createUrl);
      if (detected) {
        setCreateIconType("preset");
        setCreateIconValue(detected);
      }
    }
  }, [createUrl, createIconType]); // Added createIconType to dependencies to re-evaluate if type changes

  const fetchLinks = async () => {
    if (!user) return;
    try {
      const records = await pb.collection('links').getFullList<LinkItem>({
        filter: `user_id = "${user.id}" && show_on_profile=true`,
        sort: 'order,-created',
        requestKey: null,
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
      reader.onloadend = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
    // Clear input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleApplyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (croppedImage) {
        setAvatarFile(croppedImage);
        setAvatarPreview(URL.createObjectURL(croppedImage)); // Show local preview
        setImageToCrop(null); // Close modal
      }
    } catch (e) {
      toast.error("Failed to crop image");
    }
  };

  const handleCancelCrop = () => {
    setImageToCrop(null);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileLoading(true);

    try {
      // Step 0: Handle username change restriction notice
      if (username !== user.username && isUsernameLocked) {
        toast.error("You cannot change your username yet. Please wait for the 21-day period to pass.");
        setProfileLoading(false);
        return;
      }

      // Step 1: Update text fields + social_links via JSON
      const updateData: Record<string, any> = {
        name,
        username,
        bio,
        theme,
        social_links: socialLinks,
      };

      console.log("[handleSaveProfile] Updating user metadata...", updateData);
      await pb.collection("users").update(user.id, updateData, { requestKey: null });

      // Step 2: Upload files separately
      if (avatarFile || customBgFile) {
        const fileData = new FormData();
        if (avatarFile) fileData.append("avatar", avatarFile);
        if (customBgFile) fileData.append("custom_theme_bg", customBgFile);
        await pb.collection("users").update(user.id, fileData, { requestKey: null });
      }

      // Step 3: Synchronize Regular Links
      console.log("[handleSaveProfile] Syncing regular links...");
      // Fetch currently persisted links for this user to compare
      const dbLinks = await pb.collection('links').getFullList<LinkItem>({
        filter: `user_id = "${user.id}"`,
        requestKey: null,
      });

      // A. Identify links to DELETE (in DB but not in our current state 'links')
      const linksToDelete = dbLinks.filter(dbl => !links.find(l => l.id === dbl.id));
      for (const link of linksToDelete) {
        await pb.collection('links').delete(link.id, { requestKey: null });
      }

      // B. Identify links to CREATE or UPDATE
      for (const link of links) {
        const isNew = link.id.startsWith('temp-');

        const payload = {
          user_id: user.id,
          title: link.title,
          destination_url: link.destination_url,
          slug: link.slug,
          order: link.order,
          active: link.active,
          show_on_profile: link.show_on_profile,
          icon_type: link.icon_type,
          icon_value: link.icon_value,
          mode: link.mode || "redirect",
          size: link.size || "regular",
        };

        if (isNew) {
          await pb.collection('links').create(payload, { requestKey: null });
        } else {
          // Check if changed
          const original = dbLinks.find(dbl => dbl.id === link.id);
          if (original) {
            // Check if any visible field changed
            const fieldsToCompare = ['title', 'destination_url', 'slug', 'order', 'active', 'show_on_profile', 'icon_type', 'icon_value', 'mode', 'size'];
            const hasChanged = fieldsToCompare.some(key => (payload as any)[key] !== (original as any)[key]);
            if (hasChanged) {
              await pb.collection('links').update(link.id, payload, { requestKey: null });
            }
          }
        }
      }

      setAvatarFile(null);
      setCustomBgFile(null);

      // Step 4: Refresh Auth Store to guarantee local context perfectly matches DB
      try {
        await pb.collection("users").authRefresh();
      } catch (e) {
        console.warn("Failed to refresh auth store after update", e);
      }

      toast.success("Profile saved successfully");
    } catch (error: any) {
      console.error("[handleSaveProfile] Error:", error);
      const detailedError = error?.response?.data ? JSON.stringify(error.response.data) : (error.message || "Unknown error");
      toast.error(`Error saving profile: ${detailedError}`);
    } finally {
      setProfileLoading(false);
    }
  };


  // --- LINK MANAGEMENT ---

  const handleCreateLink = async () => {
    if (!user || !createUrl.trim() || !createTitle.trim()) { // Added trim() and title check
      toast.error("Title and URL are required");
      return;
    }

    const userPlan = (user as any)?.plan || "creator";
    if (!canUseResource(userPlan, "links", links.length)) {
      toast.error("Link limit reached. Please upgrade your plan.");
      return;
    }

    // Local only change
    const newLinks = [...links];
    const highestOrder = links.length > 0 ? Math.max(...links.map(l => l.order || 0)) : 0;
    const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`;

    const newLink: LinkItem = {
      id: tempId,
      slug: Math.random().toString(36).substring(2, 8),
      destination_url: createUrl,
      title: createTitle,
      show_on_profile: true,
      order: highestOrder + 1,
      active: true,
      clicks_count: 0,
      created: new Date().toISOString(),
      icon_type: createIconType,
      icon_value: createIconValue,
      size: createSize,
    };

    setLinks([...links, newLink]);

    // Reset form
    setCreateTitle("");
    setCreateUrl("");
    setCreateIconType("none");
    setCreateIconValue("");
    setCreateSize("regular");
    setShowCreate(false);
    toast.info("Link added to list (unsaved)");
  };

  const startEditing = (link: LinkItem) => {
    setEditingId(link.id);
    setEditTitle(link.title || "");
    setEditUrl(link.destination_url || "");
    setEditIconType(link.icon_type || "none");
    setEditIconValue(link.icon_value || "");
    setEditSize(link.size || "regular");
    setShowEditIconPicker(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
    setEditIconType("none");
    setEditIconValue("");
    setEditSize("regular");
    setShowEditIconPicker(false);
  };

  const handleSaveEdit = (id: string) => {
    if (!editUrl) return toast.error("URL is required");

    setLinks(links.map(l => l.id === id ? {
      ...l,
      title: editTitle,
      destination_url: editUrl,
      icon_type: editIconType,
      icon_value: editIconValue,
      size: editSize,
    } : l));

    setEditingId(null);
    toast.info("Link updated in list (unsaved)");
  };

  const handleDeleteLink = (id: string) => {
    if (!confirm("Remove this link?")) return;
    setLinks(links.filter(l => l.id !== id));
    toast.info("Link removed from list (unsaved)");
  };

  const toggleProfileVisibility = (id: string, currentStatus: boolean) => {
    setLinks(links.map((l) => (l.id === id ? { ...l, show_on_profile: !currentStatus } : l)));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    const newLinks = Array.from(links);
    const [reorderedItem] = newLinks.splice(sourceIndex, 1);
    newLinks.splice(destinationIndex, 0, reorderedItem);

    const reorderedWithOrder = newLinks.map((link, index) => ({ ...link, order: index }));
    setLinks(reorderedWithOrder);
  };

  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const profileLinks = links.filter(l => l.active && l.show_on_profile !== false);

  const lastUsernameChange = user?.username_last_changed;
  const isUsernameLocked = lastUsernameChange
    ? (new Date().getTime() - new Date(lastUsernameChange).getTime()) < 21 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="space-y-8 pb-10 overflow-visible">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Link-in-Bio Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your identity and links in one place</p>
        </div>
        {username ? (
          <a
            href={`/${username}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 text-sm text-accent hover:underline px-4 py-2 bg-accent/5 rounded-lg border border-accent/20 transition-all font-medium"
          >
            <Globe className="w-4 h-4" /> View Public Profile
          </a>
        ) : (
          <button
            disabled
            className="inline-flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-surface rounded-lg border border-border cursor-not-allowed font-medium"
            title="Please set a username to view your public profile"
          >
            <Globe className="w-4 h-4 opacity-50" /> Set username first
          </button>
        )}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Editor */}
        <div className="lg:col-span-7 space-y-6">

          <div className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Camera className="w-5 h-5 text-accent" /> Visuals
            </h2>

            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute -inset-1 bg-gradient-to-tr from-accent to-accent/50 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative w-24 h-24 rounded-2xl bg-surface border-2 border-border overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover object-top" />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" disabled={!canCustomize} />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">Profile Picture</p>
                {canCustomize && (
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors mt-2">
                    Upload New Image
                  </button>
                )}
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
                    onClick={() => canCustomize && setTheme(t.id)}
                    disabled={!canCustomize}
                    className={`relative p-3 rounded-xl border text-left transition-all ${theme === t.id ? "border-accent bg-accent/5 ring-1 ring-accent/50" : "border-border bg-surface hover:border-accent/30"} ${!canCustomize ? "opacity-50 cursor-not-allowed" : ""}`}
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

              {theme === "custom" && (
                <div className="mt-4 p-4 border border-border border-dashed rounded-xl bg-background/50 flex flex-col items-center justify-center space-y-3">
                  {customBgPreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden group">
                      <img src={customBgPreview} alt="Custom Background" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => customBgInputRef.current?.click()} className="btn-primary-glow text-xs py-1.5 px-3">
                          Change Background
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-accent" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-white mb-1">Upload Custom Background</p>
                        <p className="text-xs text-muted-foreground">Recommended: 1080x1920 JPG or PNG</p>
                      </div>
                      <button type="button" onClick={() => customBgInputRef.current?.click()} className="btn-primary-glow text-xs py-1.5 px-3">
                        Choose File
                      </button>
                    </>
                  )}
                  <input
                    type="file"
                    ref={customBgInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCustomBgFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setCustomBgPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              )}
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
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canCustomize} placeholder="Your Name" className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors disabled:opacity-50" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Username</label>
                <div className="space-y-1.5">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    disabled={!canCustomize || isUsernameLocked}
                    placeholder="username"
                    className={`w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors disabled:opacity-50 ${isUsernameLocked ? 'cursor-not-allowed grayscale-[0.5]' : ''}`}
                  />
                  {isUsernameLocked && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-medium px-1">
                      <Lock className="w-3 h-3" />
                      Username can be changed once every 21 days
                    </div>
                  )}
                  {!isUsernameLocked && (
                    <p className="text-[10px] text-muted-foreground px-1">You can change your username once every 21 days.</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} disabled={!canCustomize} placeholder="Write a short bio..." rows={2} className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors resize-none disabled:opacity-50" />
            </div>
          </div>

          {/* Social Links Section */}
          <div className="glass-card p-6 space-y-5 overflow-visible">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                <Globe className="w-5 h-5 text-accent" /> Social Links
              </h2>
              <button
                onClick={() => setSocialLinks([...socialLinks, { id: Math.random().toString(36).substring(2, 9), url: "", icon_type: "none", icon_value: "" }])}
                className="px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Social
              </button>
            </div>

            <div className="space-y-3">
              {socialLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 italic">No social links added yet.</p>
              ) : (
                socialLinks.map((link, idx) => (
                  <div key={link.id} className="flex flex-col gap-3 p-4 bg-surface/50 border border-border rounded-xl group animate-fade-in relative">
                    <button
                      onClick={() => setSocialLinks(socialLinks.filter(l => l.id !== link.id))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex gap-3">
                      <div className="relative">
                        <button
                          id={`social-icon-btn-${link.id}`}
                          type="button"
                          onClick={() => {
                            setEditingId(editingId === `social-${link.id}` ? null : `social-${link.id}`);
                          }}
                          className="h-[42px] w-[42px] bg-background border border-border rounded-xl flex items-center justify-center hover:bg-surface-hover transition-colors overflow-hidden"
                        >
                          <IconRenderer type={link.icon_type} value={link.icon_value} className="w-5 h-5 text-accent" />
                        </button>

                        {editingId === `social-${link.id}` && (
                          <IconPicker
                            currentType={link.icon_type}
                            currentValue={link.icon_value}
                            anchorRef={{ current: document.getElementById(`social-icon-btn-${link.id}`) } as React.RefObject<HTMLElement>}
                            onChange={(type, value) => {
                              const newLinks = [...socialLinks];
                              newLinks[idx] = { ...newLinks[idx], icon_type: type, icon_value: value };
                              setSocialLinks(newLinks);
                              setEditingId(null);
                            }}
                            onClose={() => setEditingId(null)}
                          />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <input
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...socialLinks];
                            const url = e.target.value;
                            let icon_type = link.icon_type;
                            let icon_value = link.icon_value;

                            // Auto-detect icon if none is selected
                            if (link.icon_type === "none" || !link.icon_value) {
                              const detected = detectIconFromUrl(url);
                              if (detected) {
                                icon_type = "preset";
                                icon_value = detected;
                              }
                            }

                            newLinks[idx] = { ...newLinks[idx], url, icon_type, icon_value };
                            setSocialLinks(newLinks);
                          }}
                          placeholder="Social URL (e.g. instagram.com/user)"
                          className="w-full px-4 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-accent/50"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
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
              <div className="bg-surface p-4 rounded-xl border border-accent/30 space-y-3 animate-fade-in text-white">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-medium text-white">New Link</h3>
                  <button onClick={() => {
                    setShowCreate(false);
                    setCreateSize("regular");
                  }} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div>
                  <input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Title (e.g. My Website)" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm mb-2 text-white" />
                  <div className="flex gap-2 mb-2">
                    <div className="relative">
                      <button
                        id="create-link-icon-btn"
                        type="button"
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className="h-[38px] px-3 bg-background border border-border rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors"
                      >
                        <IconRenderer type={createIconType} value={createIconValue} className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {showIconPicker && (
                        <IconPicker
                          currentType={createIconType}
                          currentValue={createIconValue}
                          anchorRef={{ current: document.getElementById("create-link-icon-btn") } as React.RefObject<HTMLElement>}
                          onChange={(type, value) => {
                            setCreateIconType(type);
                            setCreateIconValue(value);
                            setShowIconPicker(false);
                          }}
                          onClose={() => setShowIconPicker(false)}
                        />
                      )}
                    </div>
                    <input value={createUrl} onChange={(e) => setCreateUrl(e.target.value)} placeholder="URL (https://...)" type="url" className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-white" />
                  </div>

                  {/* Size Selection */}
                  <div className="space-y-2 mt-3">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Display Size</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCreateSize("regular")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${createSize === "regular" ? "bg-accent/10 border-accent/50 text-accent" : "bg-background border-border text-muted-foreground hover:border-accent/30"}`}
                      >
                        Regular
                      </button>
                      <button
                        onClick={() => setCreateSize("large")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${createSize === "large" ? "bg-accent/10 border-accent/50 text-accent" : "bg-background border-border text-muted-foreground hover:border-accent/30"}`}
                      >
                        Large
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/5 px-2 py-1 rounded-md border border-accent/10">
                    <Check className="w-3 h-3 text-accent" />
                    Automatically added to profile
                  </div>
                  <button
                    onClick={handleCreateLink}
                    disabled={createLoading || !createUrl || !createTitle}
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

                              <div className="flex-1 min-w-0 flex items-center gap-3">
                                <div className="relative">
                                  {editingId === link.id ? (
                                    <button
                                      id={`edit-link-icon-btn-${link.id}`}
                                      onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                                      className="w-10 h-10 bg-background border border-accent/50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden hover:bg-surface-hover transition-colors group/edit-icon"
                                    >
                                      <IconRenderer type={editIconType} value={editIconValue} className="w-7 h-7 text-accent group-hover/edit-icon:scale-110 transition-transform" />
                                    </button>
                                  ) : (
                                    <div className="w-10 h-10 bg-background border border-border rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                                      <IconRenderer type={link.icon_type} value={link.icon_value} url={link.destination_url} className="w-7 h-7 text-accent" />
                                    </div>
                                  )}

                                  {editingId === link.id && showEditIconPicker && (
                                    <IconPicker
                                      currentType={editIconType}
                                      currentValue={editIconValue}
                                      anchorRef={{ current: document.getElementById(`edit-link-icon-btn-${link.id}`) } as React.RefObject<HTMLElement>}
                                      onChange={(type, value) => {
                                        setEditIconType(type);
                                        setEditIconValue(value);
                                      }}
                                      onClose={() => setShowEditIconPicker(false)}
                                    />
                                  )}
                                </div>
                                {editingId === link.id ? (
                                  <div className="space-y-3 flex-1">
                                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="w-full px-2 py-1 rounded bg-background border border-accent/50 text-sm focus:outline-none text-white" />
                                    <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="w-full px-2 py-1 rounded bg-background border border-accent/50 text-sm focus:outline-none text-white" />

                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setEditSize("regular")}
                                        className={`flex-1 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${editSize === "regular" ? "bg-accent/10 border-accent/50 text-accent" : "bg-background border-border text-muted-foreground"}`}
                                      >
                                        Regular
                                      </button>
                                      <button
                                        onClick={() => setEditSize("large")}
                                        className={`flex-1 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${editSize === "large" ? "bg-accent/10 border-accent/50 text-accent" : "bg-background border-border text-muted-foreground"}`}
                                      >
                                        Large
                                      </button>
                                    </div>

                                    <div className="flex gap-2 justify-end pt-1">
                                      <button onClick={cancelEditing} className="text-xs text-muted-foreground hover:text-white">Cancel</button>
                                      <button onClick={() => handleSaveEdit(link.id)} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">
                                        {editLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1 min-w-0"> {/* Wrapped content in a div to manage flex-1 */}
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
                                  </div>
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
            className="btn-primary-glow w-full flex items-center justify-center gap-2 py-3 mt-4 text-base font-bold shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div
                className="w-full h-full bg-black relative flex flex-col no-scrollbar rounded-[40px] overflow-hidden"
              >
                <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar relative z-10 pb-10">
                  {/* Top Header with Avatar and Fade */}
                  <div className="relative aspect-[10/9] w-full overflow-hidden shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center">
                        <span className="text-5xl font-bold bg-gradient-to-br from-white to-white/30 bg-clip-text text-transparent">{name.charAt(0) || "?"}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent transition-all duration-700" />
                  </div>

                  {/* Profile Content */}
                  <div className="px-5 -mt-10 relative">
                    <div className="text-center space-y-1">
                      <h4 className="text-2xl font-black tracking-tight text-white drop-shadow-lg">{name || "Your Name"}</h4>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide">@{username || "username"}</p>
                    </div>

                    {/* Social Icons Preview */}
                    {socialLinks.length > 0 && (
                      <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                        {socialLinks.map(link => (
                          <div key={link.id} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <IconRenderer type={link.icon_type} value={link.icon_value} className="w-4 h-4 text-white/80" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bio */}
                    <div className="mt-2 text-center">
                      <p className="text-white text-xs leading-relaxed max-w-[240px] mx-auto">{bio || "Your bio will appear here..."}</p>
                    </div>

                    {/* Dynamic Links */}
                    <div className="w-full mt-5 space-y-3">
                      {profileLinks.length === 0 ? (
                        <div className="text-center text-white/40 text-sm italic mt-10">No visible links yet.</div>
                      ) : (
                        profileLinks.map((link) => {
                          const bgImageUrl = (link.size === 'large' && (link as any).bg_image)
                            ? pb.files.getUrl(link, (link as any).bg_image)
                            : null;

                          return (
                            <div key={link.id} className={`w-full rounded-2xl bg-[#111] border border-white/5 hover:bg-[#161616] hover:border-white/20 transition-all group cursor-pointer shadow-lg shadow-black/5 relative overflow-hidden flex ${link.size === 'large' ? 'flex-col p-3 aspect-[10/5.4]' : 'h-[40px] items-center justify-center'}`}>

                              {/* Large Size Background Map */}
                              {bgImageUrl && (
                                <>
                                  <div
                                    className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 group-hover:scale-105"
                                    style={{ backgroundImage: `url('${bgImageUrl}')` }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 z-0" />
                                </>
                              )}

                              <div className={`relative z-10 flex w-full ${link.size === 'large' ? 'h-full flex-col justify-between items-start' : 'items-center justify-center'}`}>
                                <div className={`${link.size === 'large' ? 'shrink-0 self-start' : 'absolute left-0 shrink-0 ml-0'}`}>
                                  <div className={`${link.size === 'large' ? 'w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md overflow-hidden shadow-lg' : 'w-11 h-11 rounded-xl overflow-hidden'} flex items-center justify-center`}>
                                    <IconRenderer type={link.icon_type} value={link.icon_value} url={link.destination_url} className={`${link.size === 'large' ? 'w-4 h-4' : 'w-5 h-5'} text-white/90 drop-shadow-md`} />
                                  </div>
                                </div>
                                <div className={`${link.size === 'large' ? 'mt-auto text-left w-full' : 'text-center px-10'}`}>
                                  <span className={`font-bold text-white group-hover:scale-[1.02] transition-transform block uppercase tracking-wider ${link.size === 'large' ? 'text-sm drop-shadow-lg' : 'text-xs'}`}>{link.title || "Untitled Link"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {!checkPlan(userPlan, "remove_branding") && (
                      <div className="mt-auto pt-10 pb-2 flex flex-col items-center shrink-0">
                        <img src="/logo.png" alt="Linktery" className="h-6 w-auto grayscale mix-blend-screen opacity-50" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Cropping Modal */}
      {
        imageToCrop && (
          <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center">
              <h3 className="text-lg font-bold text-foreground mb-4">Crop Avatar</h3>

              <div className="relative w-full h-64 bg-black/20 rounded-xl overflow-hidden mb-6">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="w-full flex items-center gap-4 mb-6">
                <span className="text-muted-foreground text-sm">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleCancelCrop}
                  className="flex-1 py-2 rounded-xl text-muted-foreground font-medium hover:bg-surface-hover transition-colors"
                  disabled={profileLoading} // Reuse creating status optionally if busy
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCrop}
                  className="flex-1 py-2 btn-primary-glow font-medium"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
