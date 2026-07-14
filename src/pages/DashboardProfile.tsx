import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Camera, Palette, Smartphone, User, Check, Upload, Globe, Plus, GripVertical, Eye, EyeOff, Edit, Trash2, ExternalLink, X, Save, Lock, Copy, ChevronDown, Sparkles } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { IconPicker } from '@/components/icons/IconPicker';
import { IconRenderer } from '@/components/icons/IconRenderer';
import { detectIconFromUrl } from '@/components/icons/detector';
import { checkPlan, canUseResource, PLANS, PlanType } from '@/lib/plans';
import { UpgradeModal } from "@/components/UpgradeModal";
import Cropper, { Area, Point } from 'react-easy-crop';
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import { getCroppedImg } from '@/lib/cropImage';
import { LinkItemCard } from "@/components/LinkItemCard";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { urlSchema } from "@/lib/validations";
import { getAvailableDomains } from "@/lib/siteConfig";
import {
  isLightProfileColor,
  normalizeProfileTemplate,
  PROFILE_TEMPLATES,
  ProfileTemplateId,
} from "@/lib/profileTemplates";

const THEMES = [
  { id: "minimal-dark", name: "Minimal Dark", colors: "bg-background border-border" },
  { id: "sunset", name: "Sunset", colors: "bg-gradient-to-br from-orange-500/20 to-pink-500/20 border-pink-500/30 text-white" },
  { id: "ocean", name: "Ocean", colors: "bg-gradient-to-br from-blue-600/20 to-cyan-400/20 border-blue-500/30 text-white" },
  { id: "emerald", name: "Emerald", colors: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-white" },
  { id: "glass", name: "Glassmorphism", colors: "bg-white/5 backdrop-blur-xl border-white/10 text-white" },
  { id: "custom", name: "Custom Background", colors: "bg-surface border-border border-dashed text-white" },
];

function TemplateThumbnail({ template }: { template: ProfileTemplateId }) {
  const linkRows = (
    <div className="space-y-1.5 px-2 pb-2">
      <div className="h-2.5 rounded-full bg-white/15" />
      <div className="h-2.5 rounded-full bg-white/10" />
    </div>
  );

  if (template === "compact") {
    return (
      <div className="h-28 rounded-lg bg-neutral-950 border border-white/10 pt-3 overflow-hidden">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/80 to-white/20 mx-auto border border-white/20" />
        <div className="w-12 h-1.5 rounded-full bg-white/70 mx-auto mt-2" />
        <div className="w-20 h-1 rounded-full bg-white/20 mx-auto mt-1" />
        <div className="mt-3">{linkRows}</div>
      </div>
    );
  }

  if (template === "banner") {
    return (
      <div className="h-28 rounded-lg bg-neutral-950 border border-white/10 overflow-hidden">
        <div className="h-9 bg-gradient-to-r from-accent/50 via-cyan-500/30 to-purple-500/40" />
        <div className="w-8 h-8 -mt-4 rounded-full bg-neutral-700 mx-auto border-2 border-neutral-950" />
        <div className="w-14 h-1.5 rounded-full bg-white/70 mx-auto mt-1.5" />
        <div className="mt-2">{linkRows}</div>
      </div>
    );
  }

  if (template === "hero") {
    return (
      <div className="h-28 rounded-lg border border-white/10 overflow-hidden relative bg-gradient-to-br from-neutral-600 via-neutral-800 to-black">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute inset-x-2 bottom-2 space-y-1">
          <div className="w-16 h-2 rounded-full bg-white/80" />
          <div className="w-10 h-1 rounded-full bg-white/35" />
          <div className="w-full h-2 rounded-full bg-white/15 mt-2" />
        </div>
      </div>
    );
  }

  if (template === "cutout") {
    return (
      <div className="h-28 rounded-lg bg-stone-100 border border-white/10 overflow-hidden relative">
        <div className="absolute w-11 h-14 rounded-[45%_45%_20%_20%] bg-neutral-400 right-2 top-2 rotate-3" />
        <div className="absolute left-2 top-12">
          <div className="w-14 h-2.5 rounded-sm bg-neutral-900" />
          <div className="w-10 h-2.5 rounded-sm bg-neutral-900 mt-0.5" />
        </div>
        <div className="absolute inset-x-2 bottom-2 space-y-1">
          <div className="h-px bg-neutral-900/30" />
          <div className="h-px bg-neutral-900/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-28 rounded-lg bg-neutral-950 border border-white/10 overflow-hidden">
      <div className="h-14 bg-gradient-to-b from-neutral-600 to-neutral-950" />
      <div className="w-14 h-2 rounded-full bg-white/75 mx-auto -mt-2 relative" />
      <div className="w-9 h-1 rounded-full bg-white/25 mx-auto mt-1.5" />
      <div className="mt-3">{linkRows}</div>
    </div>
  );
}

// LinkItem Interface
export interface LinkItem {
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
  bg_image?: string;
}

interface SocialLink {
  id: string;
  url: string;
  icon_type: "preset" | "emoji" | "custom" | "none";
  icon_value: string;
  label?: string;
}

interface ProfileRecord {
  id: string;
  user_id: string;
  slug: string;
  domain: string;
  name?: string;
  bio?: string;
  theme: string;
  profile_template?: string;
  card_color?: string;
  avatar?: string;
  online_counter?: boolean;
  custom_theme_bg?: string;
  social_links?: SocialLink[];
}

type VisualSectionId = "template" | "background" | "card";
type VisualSectionState = Record<VisualSectionId, boolean>;

const VISUAL_SECTIONS_STORAGE_KEY = "linktery:profile-editor:visual-sections";
const DEFAULT_VISUAL_SECTIONS: VisualSectionState = {
  template: true,
  background: true,
  card: true,
};

function readVisualSectionState(): VisualSectionState {
  if (typeof window === "undefined") return DEFAULT_VISUAL_SECTIONS;

  try {
    const stored = JSON.parse(window.localStorage.getItem(VISUAL_SECTIONS_STORAGE_KEY) || "null") as Partial<VisualSectionState> | null;
    return {
      template: typeof stored?.template === "boolean" ? stored.template : true,
      background: typeof stored?.background === "boolean" ? stored.background : true,
      card: typeof stored?.card === "boolean" ? stored.card : true,
    };
  } catch {
    return DEFAULT_VISUAL_SECTIONS;
  }
}

export default function DashboardProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyLink = () => {
    if (!username) return;
    const fullUrl = `https://${window.location.hostname === 'localhost' ? 'localhost:5173' : (domain || window.location.hostname)}/${username}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Profile link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const [profileLoading, setProfileLoading] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState(user?.theme || "minimal-dark");
  const [profileTemplate, setProfileTemplate] = useState<ProfileTemplateId>("classic");
  const [cardColor, setCardColor] = useState(user?.card_color || "#000000");
  const [onlineCounter, setOnlineCounter] = useState(!!user?.online_counter);
  const [openVisualSections, setOpenVisualSections] = useState<VisualSectionState>(readVisualSectionState);
  const userPlan = (user as { plan?: string })?.plan || "creator";
  const canCustomize = checkPlan(userPlan, "profile_customization");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // Actual file to upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Theme Background State
  const [customBgPreview, setCustomBgPreview] = useState<string | null>(null);
  const [customBgFile, setCustomBgFile] = useState<File | null>(null);
  const customBgInputRef = useRef<HTMLInputElement>(null);

  const toggleVisualSection = (section: VisualSectionId) => {
    setOpenVisualSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(VISUAL_SECTIONS_STORAGE_KEY, JSON.stringify(openVisualSections));
    } catch {
      // The editor still works when browser storage is unavailable.
    }
  }, [openVisualSections]);

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
  const [socialEditingId, setSocialEditingId] = useState<string | null>(null);

  // Pending bg_image uploads/removals for when handleSaveProfile runs
  const [pendingBgImages, setPendingBgImages] = useState<Record<string, { file: File | null; remove: boolean }>>({});


  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const availableDomains = getAvailableDomains(import.meta.env.VITE_AVAILABLE_DOMAINS);
  
  // Create Profile Modal State
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [newProfileSlug, setNewProfileSlug] = useState("");
  const [newProfileDomain, setNewProfileDomain] = useState(availableDomains[0]);
  const [newProfileName, setNewProfileName] = useState("");

  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; description: string; planNeeded?: "pro" | "agency" }>({
    open: false,
    feature: "",
    description: "",
  });

  const fetchProfiles = async (selectProfileId?: string) => {
    if (!user || !profileId) return;
    try {
      const records = await pb.collection('public_profiles').getFullList<ProfileRecord>({
        filter: `user_id = "${user.id}"`,
        sort: 'created',
        requestKey: null,
      });

      setProfiles(records);

      // Select active profile based on the URL parameter
      const targetId = selectProfileId || profileId;
      const active = records.find(r => r.id === targetId);
      
      if (!active) {
        toast.error("Profile not found");
        navigate("/dashboard/profile");
        return;
      }
      
      setActiveProfileId(active.id);
      setName(active.name || "");
      setUsername(active.slug || "");
      setDomain(active.domain || availableDomains[0]);
      setBio(active.bio || "");
      setTheme(active.theme || "minimal-dark");
      setProfileTemplate(normalizeProfileTemplate(active.profile_template));
      setCardColor(active.card_color || "#000000");
      setOnlineCounter(!!active.online_counter);
      
      if (active.avatar) {
        setAvatarPreview(pb.files.getUrl(active, active.avatar));
      } else {
        setAvatarPreview(null);
      }
      
      if (active.custom_theme_bg) {
        setCustomBgPreview(pb.files.getUrl(active, active.custom_theme_bg));
      } else {
        setCustomBgPreview(null);
      }
      
      setSocialLinks(Array.isArray(active.social_links) ? active.social_links : []);
    } catch (e) {
      console.error("Failed to load profiles:", e);
      toast.error("Failed to load profiles");
      navigate("/dashboard/profile");
    }
  };

  useEffect(() => {
    if (user && profileId) {
      fetchProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profileId]);

  const handleSwitchProfile = (profileId: string) => {
    const p = profiles.find(pr => pr.id === profileId);
    if (!p) return;
    
    // Clear pending changes state
    setAvatarFile(null);
    setCustomBgFile(null);
    setPendingBgImages({});
    
    setActiveProfileId(profileId);
    setName(p.name || "");
    setUsername(p.slug || "");
    setDomain(p.domain || availableDomains[0]);
    setBio(p.bio || "");
    setTheme(p.theme || "minimal-dark");
    setProfileTemplate(normalizeProfileTemplate(p.profile_template));
    setCardColor(p.card_color || "#000000");
    setOnlineCounter(!!p.online_counter);
    
    if (p.avatar) {
      setAvatarPreview(pb.files.getUrl(p, p.avatar));
    } else {
      setAvatarPreview(null);
    }
    
    if (p.custom_theme_bg) {
      setCustomBgPreview(pb.files.getUrl(p, p.custom_theme_bg));
    } else {
      setCustomBgPreview(null);
    }
    
    setSocialLinks(Array.isArray(p.social_links) ? p.social_links : []);
    setLinksLoading(true);
  };

  const handleCreateProfile = async () => {
    if (!newProfileSlug.trim()) {
      toast.error("Profile slug is required");
      return;
    }

    const cleanSlug = newProfileSlug.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanSlug) {
      toast.error("Slug must contain only alphanumeric characters, underscores or dashes");
      return;
    }

    // Check plan limits
    const maxProfiles = PLANS[userPlan as PlanType]?.limits?.public_profiles || 1;
    if (profiles.length >= maxProfiles) {
      setUpgradeModal({
        open: true,
        feature: "Multiple Biolink Profiles",
        description: `Your plan limits profile creation to ${maxProfiles} profile(s). Upgrade to create more pages.`,
        planNeeded: maxProfiles < 3 ? "pro" : "agency"
      });
      return;
    }

    setProfileLoading(true);
    try {
      // Validate uniqueness globally across all profiles and links
      const [existingProfiles, existingLinks] = await Promise.all([
        pb.collection('public_profiles').getList(1, 1, { filter: `slug="${cleanSlug}"` }),
        pb.collection('links').getList(1, 1, { filter: `slug="${cleanSlug}"` })
      ]);

      if (existingProfiles.totalItems > 0) {
        toast.error("This handle is already in use by another public profile.");
        setProfileLoading(false);
        return;
      }
      if (existingLinks.totalItems > 0) {
        toast.error("This handle is already in use by a short link.");
        setProfileLoading(false);
        return;
      }

      const created = await pb.collection('public_profiles').create({
        user_id: user?.id,
        slug: cleanSlug,
        domain: newProfileDomain,
        name: newProfileName || cleanSlug,
        theme: "minimal-dark",
        profile_template: "classic",
        card_color: "#000000",
      });

      toast.success("Profile created successfully!");
      setShowCreateProfileModal(false);
      setNewProfileSlug("");
      setNewProfileName("");
      
      await fetchProfiles(created.id);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to create profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profileId || !user) return;

    if (!confirm(`Are you absolutely sure you want to delete profile @${username}? All visual customizations, links, and styling inside it will be permanently deleted.`)) {
      return;
    }

    setProfileLoading(true);
    try {
      // 1. Fetch links belonging to this profile
      const linksToUnlink = await pb.collection('links').getFullList({
        filter: `user_id = "${user.id}" && profile_id = "${profileId}"`,
        requestKey: null
      });

      // 2. Safely unlink associated links instead of deleting them
      for (const link of linksToUnlink) {
        await pb.collection('links').update(link.id, {
          profile_id: "",
          show_on_profile: false
        }, { requestKey: null });
      }

      // 3. Delete profile
      await pb.collection('public_profiles').delete(profileId, { requestKey: null });

      toast.success("Profile deleted successfully. Associated links were unlinked.");
      navigate("/dashboard/profile");
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("Failed to delete profile:", e);
      toast.error("Failed to delete profile: " + (err.message || "Unknown error"));
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (activeProfileId) {
      fetchLinks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId]);

  // Auto-detect icon based on URL input
  useEffect(() => {
    if (createUrl && createIconType === "none") {
      const detected = detectIconFromUrl(createUrl);
      if (detected) {
        setCreateIconType("preset");
        setCreateIconValue(detected);
      }
    }
  }, [createUrl, createIconType]);

  const fetchLinks = async () => {
    if (!activeProfileId || !user) return;
    try {
      const records = await pb.collection('links').getList<LinkItem>(1, 100, {
        filter: `user_id = "${user.id}" && profile_id = "${activeProfileId}" && show_on_profile=true`,
        sort: 'order,-created',
        requestKey: null,
      });
      setLinks(records.items);
    } catch (error: unknown) {
      toast.error("Failed to load links");
    } finally {
      setLinksLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Avatar image must be less than 5MB");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
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
    if (!user || !activeProfileId) return;
    setProfileLoading(true);

    try {
      const cleanSlug = username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!cleanSlug) {
        toast.error("Profile slug is required");
        setProfileLoading(false);
        return;
      }

      // Check unique constraints if slug or domain changed
      // Check unique constraints if slug changed
      const currentProfile = profiles.find(p => p.id === activeProfileId);
      if (cleanSlug !== currentProfile?.slug) {
        const [existingProfiles, existingLinks] = await Promise.all([
          pb.collection('public_profiles').getList(1, 1, { filter: `slug="${cleanSlug}" && id != "${activeProfileId}"` }),
          pb.collection('links').getList(1, 1, { filter: `slug="${cleanSlug}"` })
        ]);

        if (existingProfiles.totalItems > 0) {
          toast.error("This handle is already in use by another public profile.");
          setProfileLoading(false);
          return;
        }
        if (existingLinks.totalItems > 0) {
          toast.error("This handle is already in use by a short link.");
          setProfileLoading(false);
          return;
        }
      }

      // Step 1: Update profile metadata
      const updateData = {
        name,
        slug: cleanSlug,
        domain,
        bio,
        theme,
        profile_template: profileTemplate,
        card_color: cardColor,
        online_counter: onlineCounter,
        social_links: socialLinks,
      };

      console.log("[handleSaveProfile] Updating profile metadata...", updateData);
      await pb.collection("public_profiles").update(activeProfileId, updateData, { requestKey: null });

      // Step 2: Upload files
      if (avatarFile || customBgFile) {
        const fileData = new FormData();
        if (avatarFile) fileData.append("avatar", avatarFile);
        if (customBgFile) fileData.append("custom_theme_bg", customBgFile);
        await pb.collection("public_profiles").update(activeProfileId, fileData, { requestKey: null });
      }

      // Step 3: Synchronize Regular Links for this profile
      console.log("[handleSaveProfile] Syncing profile links for active profile...");
      const dbLinksResult = await pb.collection('links').getList<LinkItem>(1, 100, {
        filter: `user_id = "${user.id}" && profile_id = "${activeProfileId}" && show_on_profile=true`,
        requestKey: null,
      });
      const dbLinks = dbLinksResult.items;

      // A. Identify links to DELETE
      const linksToDelete = dbLinks.filter(dbl => !links.find(l => l.id === dbl.id));
      for (const link of linksToDelete) {
        await pb.collection('links').delete(link.id, { requestKey: null });
      }

      // B. Identify links to CREATE or UPDATE
      for (const link of links) {
        const isNew = link.id.startsWith('temp-');

        const payload = {
          user_id: user.id,
          profile_id: activeProfileId,
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
          const original = dbLinks.find(dbl => dbl.id === link.id);
          if (original) {
            const fieldsToCompare: (keyof typeof payload)[] = ['title', 'destination_url', 'slug', 'order', 'active', 'show_on_profile', 'icon_type', 'icon_value', 'mode', 'size'];
            const originalValues = original as unknown as Partial<typeof payload>;
            const hasChanged = fieldsToCompare.some(key => payload[key] !== originalValues[key]);
            if (hasChanged) {
              await pb.collection('links').update(link.id, payload, { requestKey: null });
            }
          }

          const pendingBg = pendingBgImages[link.id];
          if (pendingBg) {
            const bgFormData = new FormData();
            if (pendingBg.remove) {
              bgFormData.append('bg_image', '');
            } else if (pendingBg.file) {
              bgFormData.append('bg_image', pendingBg.file);
            }
            await pb.collection('links').update(link.id, bgFormData, { requestKey: null });
          }
        }
      }
      setPendingBgImages({});
      setAvatarFile(null);
      setCustomBgFile(null);

      // Step 4: Refresh profiles state
      await fetchProfiles(activeProfileId);
      toast.success("Profile saved successfully");
    } catch (err: unknown) {
      const error = err as { message?: string; response?: { data?: Record<string, unknown> } };
      console.error("[handleSaveProfile] Error:", error);
      
      let detailedError = error?.message || "Unknown error";
      const responseData = error?.response?.data;
      
      if (typeof responseData === 'object' && responseData !== null) {
          if (responseData.data && typeof responseData.data === 'object' && Object.keys(responseData.data).length > 0) {
              const firstKey = Object.keys(responseData.data)[0];
              if (firstKey && responseData.data[firstKey].message) {
                  detailedError = responseData.data[firstKey].message;
              } else {
                  detailedError = (responseData.message as string) || JSON.stringify(responseData.data);
              }
          } else {
              detailedError = (responseData.message as string) || JSON.stringify(responseData);
          }
      }

      toast.error(detailedError);
    } finally {
      setProfileLoading(false);
    }
  };


  // --- LINK MANAGEMENT ---

  const handleCreateLink = async () => {
    if (!user || !createTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    const urlValidation = urlSchema.safeParse(createUrl);
    if (!urlValidation.success) {
      toast.error(urlValidation.error.errors[0].message);
      return;
    }
    const validatedUrl = urlValidation.data;

    const userPlan = (user as { plan?: string })?.plan || "creator";
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
      destination_url: validatedUrl,
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

  const handleUpdateLink = (id: string, updatedLink: LinkItem, bgImageFile: File | null, bgImageRemoved: boolean) => {
    setLinks(links.map(l => l.id === id ? updatedLink : l));
    if (bgImageFile || bgImageRemoved) {
      setPendingBgImages(prev => ({ ...prev, [id]: { file: bgImageFile, remove: bgImageRemoved } }));
    }
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
  const isUsernameLocked = (lastUsernameChange && lastUsernameChange.trim() !== "")
    ? (new Date().getTime() - new Date(lastUsernameChange).getTime()) < 21 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="space-y-8 pb-10 overflow-visible">
      <div>
        <RouterLink
          to="/dashboard/profile"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-widest hover:text-accent/80 transition-colors"
        >
          ← Back to Profiles
        </RouterLink>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Edit: {name || username || "Biolink Profile"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Customize visual themes, links, and profile details</p>
          </div>
          {username && (
            <div className="md:border-l md:border-border/60 md:pl-6 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Public Link:</span>
              <div className="inline-flex items-center gap-2 bg-surface/50 border border-border/80 px-3 py-1.5 rounded-xl min-w-0 max-w-full">
                <span className="min-w-0 truncate text-xs font-sans font-semibold tracking-normal text-accent">
                  {domain}/{username}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-all focus:outline-none shrink-0"
                  title="Copy Link"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDeleteProfile}
            disabled={profileLoading}
            className="flex items-center gap-1.5 text-sm font-semibold text-red-500/80 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Delete this profile"
          >
            <Trash2 className="w-4 h-4" /> Delete Profile
          </button>
        </div>
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

            <div className="space-y-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleVisualSection("template")}
                aria-expanded={openVisualSections.template}
                aria-controls="profile-template-options"
                className="group flex w-full items-start justify-between gap-4 text-left"
              >
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 text-white">
                    <Smartphone className="w-4 h-4 text-accent" /> Profile Template
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Change the profile composition without changing its content or links.
                  </p>
                </div>
                <ChevronDown
                  className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-white ${openVisualSections.template ? "rotate-180" : ""}`}
                />
              </button>
              {openVisualSections.template && (
                <div id="profile-template-options" className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 gap-3">
                  {PROFILE_TEMPLATES.map((templateOption) => (
                    <button
                      key={templateOption.id}
                      type="button"
                      onClick={() => canCustomize && setProfileTemplate(templateOption.id)}
                      disabled={!canCustomize}
                      aria-pressed={profileTemplate === templateOption.id}
                      className={`relative p-2.5 rounded-xl border text-left transition-all ${
                        profileTemplate === templateOption.id
                          ? "border-accent bg-accent/5 ring-1 ring-accent/50"
                          : "border-border bg-surface hover:border-accent/30"
                      } ${!canCustomize ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <TemplateThumbnail template={templateOption.id} />
                      <span className="text-xs font-semibold block text-white mt-2">
                        {templateOption.name}
                      </span>
                      <span className="text-[10px] leading-snug text-muted-foreground block mt-1">
                        {templateOption.description}
                      </span>
                      {profileTemplate === templateOption.id && (
                        <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-lg">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleVisualSection("background")}
                aria-expanded={openVisualSections.background}
                aria-controls="background-theme-options"
                className="group flex w-full items-start justify-between gap-4 text-left"
              >
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 text-white">
                    <Palette className="w-4 h-4 text-accent" /> Background Theme
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose the background behind your public profile card.
                  </p>
                </div>
                <ChevronDown
                  className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-white ${openVisualSections.background ? "rotate-180" : ""}`}
                />
              </button>
              {openVisualSections.background && (
                <div id="background-theme-options" className="space-y-4">
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
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
                    <div className="p-4 border border-border border-dashed rounded-xl bg-background/50 flex flex-col items-center justify-center space-y-3">
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
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("Background image must be less than 5MB");
                              return;
                            }
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
              )}
            </div>

            {/* Card Color Theme */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleVisualSection("card")}
                aria-expanded={openVisualSections.card}
                aria-controls="card-theme-options"
                className="group flex w-full items-start justify-between gap-4 text-left"
              >
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 text-white">
                    <Palette className="w-4 h-4 text-accent" /> Card Theme
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose the base color for your profile card and gradient.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className="h-5 w-5 rounded-md border border-white/15 shadow-inner"
                    style={{ backgroundColor: cardColor }}
                    aria-hidden="true"
                  />
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform group-hover:text-white ${openVisualSections.card ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {openVisualSections.card && (
                <div id="card-theme-options" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {cardColor.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="relative group/picker">
                        <input
                          type="color"
                          value={cardColor}
                          onChange={(e) => canCustomize && setCardColor(e.target.value)}
                          disabled={!canCustomize}
                          className={`w-10 h-10 rounded-xl cursor-pointer bg-surface border-2 border-border p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none ${!canCustomize ? "opacity-50 cursor-not-allowed" : "hover:border-accent/40"}`}
                          title="Card Color"
                        />
                      </div>
                      {cardColor !== "#000000" && (
                        <button
                          type="button"
                          onClick={() => canCustomize && setCardColor("#000000")}
                          disabled={!canCustomize}
                          className="text-xs text-muted-foreground hover:text-white transition-colors underline underline-offset-2"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    className="w-full h-12 rounded-xl shadow-inner transition-colors"
                    style={{ backgroundColor: cardColor }}
                  />
                </div>
              )}
            </div>

            {/* Online Counter Toggle */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 text-white">
                    <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                    Online Counter
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show a live viewer count on your public profile (fake).
                  </p>
                </div>
                <button
                  onClick={() => setOnlineCounter(!onlineCounter)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${onlineCounter ? 'bg-accent' : 'bg-border'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${onlineCounter ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Identity Section */}
          <div className="glass-card p-6 space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-accent" /> Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Display Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canCustomize} placeholder="Your Name" className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors disabled:opacity-50 text-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Choose Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={!canCustomize}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-white focus:outline-none focus:border-accent/50 cursor-pointer disabled:opacity-50"
                >
                  {availableDomains.map((d: string) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Profile Slug</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  disabled={!canCustomize}
                  placeholder="username"
                  className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors disabled:opacity-50 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Bio</label>
              <textarea value={bio} onChange={(e) => { const v = e.target.value; const lines = v.split('\n'); if (lines.length > 3) return; setBio(v); }} onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} disabled={!canCustomize} placeholder="Write a short bio..." rows={1} className="w-full px-4 py-2 rounded-xl bg-surface border border-border focus:outline-none input-glow focus:border-accent/50 transition-colors resize-none disabled:opacity-50 overflow-hidden" />
            </div>
          </div>

          {/* Social Links Section */}
          <div className="glass-card p-6 space-y-5 overflow-visible">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                <Globe className="w-5 h-5 text-accent" /> Social Links
                <span className="text-xs font-normal text-muted-foreground ml-1">(max 3)</span>
              </h2>
              <button
                onClick={() => {
                  if (socialLinks.length >= 3) {
                    toast.error("Maximum 3 social links allowed.");
                    return;
                  }
                  setSocialLinks([...socialLinks, { id: Math.random().toString(36).substring(2, 9), url: "", icon_type: "none", icon_value: "" }]);
                }}
                disabled={socialLinks.length >= 3}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${socialLinks.length >= 3 ? "bg-white/5 border border-white/10 text-muted-foreground cursor-not-allowed" : "bg-accent/10 hover:bg-accent/20 text-accent"}`}
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
                            setSocialEditingId(socialEditingId === `social-${link.id}` ? null : `social-${link.id}`);
                          }}
                          className="h-[42px] w-[42px] bg-background border border-border rounded-xl flex items-center justify-center hover:bg-surface-hover transition-colors overflow-hidden"
                        >
                          <IconRenderer type={link.icon_type} value={link.icon_value} className="w-5 h-5 text-accent" />
                        </button>

                        {socialEditingId === `social-${link.id}` && (
                          <IconPicker
                            currentType={link.icon_type}
                            currentValue={link.icon_value}
                            anchorRef={{ current: document.getElementById(`social-icon-btn-${link.id}`) } as React.RefObject<HTMLElement>}
                            onChange={(type, value) => {
                              const newLinks = [...socialLinks];
                              newLinks[idx] = { ...newLinks[idx], icon_type: type, icon_value: value };
                              setSocialLinks(newLinks);
                              setSocialEditingId(null);
                            }}
                            onClose={() => setSocialEditingId(null)}
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
                        className="w-[38px] h-[38px] bg-background border border-border rounded-lg flex items-center justify-center shrink-0 overflow-hidden hover:bg-surface-hover transition-colors"
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
                            <LinkItemCard
                              link={link}
                              provided={provided}
                              snapshot={snapshot}
                              onUpdate={handleUpdateLink}
                              onDelete={handleDeleteLink}
                            />
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
                className="w-full h-full relative flex flex-col no-scrollbar rounded-[40px] overflow-hidden"
                style={{ backgroundColor: cardColor }}
              >
                <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar relative z-10 pb-10">
                  <ProfileIdentity
                    preview
                    template={profileTemplate}
                    name={name || "Your Name"}
                    username={username || "username"}
                    bio={bio}
                    avatarUrl={avatarPreview}
                    avatarFallback={name.charAt(0).toUpperCase() || "?"}
                    cardColor={cardColor}
                    socialLinks={socialLinks}
                    onlineCounter={onlineCounter ? (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="text-[10px] font-medium tracking-wide text-white/50">
                          <span className="font-bold text-white/70">342</span> people are currently watching this
                        </span>
                      </div>
                    ) : undefined}
                  />

                  {/* Profile content shared by all template previews. */}
                  <div className="px-4 relative">

                    {/* Dynamic Links */}
                    <div className="w-full mt-5 space-y-3">
                      {profileLinks.length === 0 ? (
                        <div className="text-center text-white/40 text-sm italic mt-10">No visible links yet.</div>
                      ) : (
                        profileLinks.map((link) => {
                          const bgImageUrl = link.bg_image
                            ? pb.files.getUrl(link, link.bg_image)
                            : null;
                          const editorialLink = profileTemplate === "cutout" && link.size !== "large";

                          return (
                            <div key={link.id} className={`w-full transition-all group cursor-pointer relative overflow-hidden flex ${
                              editorialLink
                                ? `rounded-none border-b h-[44px] items-center px-1 ${isLightProfileColor(cardColor) ? "border-black/15" : "border-white/15"}`
                                : `rounded-2xl bg-[#111] border border-white/5 shadow-lg shadow-black/5 ${link.size === 'large' ? 'flex-col p-3 aspect-[10/6] sm:aspect-[10/5.4]' : 'h-[40px] items-center justify-center px-1'}`
                            }`}>

                              {/* Custom Background */}
                              {bgImageUrl && (
                                <>
                                  <img
                                    src={bgImageUrl}
                                    alt="Background"
                                    className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 group-hover:scale-105"
                                  />
                                  <div className={`absolute inset-0 z-0 ${link.size === 'large' ? 'bg-gradient-to-t from-black/90 via-black/40 to-black/20' : 'bg-black/50'}`} />
                                </>
                              )}

                              <div className={`relative z-10 flex w-full ${link.size === 'large' ? 'h-full flex-col justify-between items-start' : editorialLink ? 'items-center' : 'items-center justify-center'}`}>
                                <div className={`${link.size === 'large' ? 'shrink-0 self-start' : editorialLink ? 'relative shrink-0 mr-2' : 'absolute left-0 shrink-0 ml-0'}`}>
                                  <div className={`${link.size === 'large' ? 'w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md overflow-hidden shadow-lg' : editorialLink ? 'w-9 h-9 rounded-lg bg-white/5' : 'w-11 h-11 rounded-xl overflow-hidden'} flex items-center justify-center`}>
                                    <IconRenderer type={link.icon_type} value={link.icon_value} url={link.destination_url} className={`${link.size === 'large' ? 'w-4 h-4' : 'w-5 h-5'} text-white/90 drop-shadow-md`} />
                                  </div>
                                </div>
                                <div className={`${link.size === 'large' ? 'mt-auto text-center w-full px-10' : editorialLink ? 'text-left flex-1' : 'text-center px-10'}`}>
                                  <span className={`font-bold group-hover:scale-[1.02] transition-transform block uppercase tracking-wider ${editorialLink && isLightProfileColor(cardColor) ? 'text-black' : 'text-white'} ${link.size === 'large' ? 'text-sm drop-shadow-lg' : 'text-xs'}`}>{link.title || "Untitled Link"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {!checkPlan(userPlan, "remove_branding") && (
                      <div className="mt-auto pt-10 pb-2 flex flex-col items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 grayscale mix-blend-screen opacity-50">
                          <img src="/logo.webp" alt="Linktery" className="h-7 w-auto" />
                          <span className="text-[9px] font-bold tracking-widest uppercase text-white translate-y-[0.5px]">Linktery</span>
                        </div>
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
        )}
      {/* Create Profile Modal */}
      {showCreateProfileModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            className="relative overflow-hidden w-full max-w-md rounded-[24px] border border-white/[0.08] backdrop-blur-2xl p-7 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6"
            style={{
              background: 'linear-gradient(135deg, rgba(25, 45, 35, 0.4) 0%, rgba(10, 20, 15, 0.95) 100%)',
              borderTop: '3px solid #22C55E'
            }}
          >
            {/* Ambient background glow orb */}
            <div className="absolute -right-20 -top-20 w-44 h-44 rounded-full bg-accent/10 blur-[50px] pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <h3 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent animate-pulse" /> Create Biolink Profile
              </h3>
              <button 
                onClick={() => setShowCreateProfileModal(false)} 
                className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative z-10 space-y-5">
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Domain</label>
                <div className="relative">
                  <select
                    value={newProfileDomain}
                    onChange={(e) => setNewProfileDomain(e.target.value)}
                    className="w-full appearance-none px-4 py-3 rounded-xl bg-black/40 border border-border text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all pr-10"
                  >
                    {availableDomains.map((d: string) => (
                      <option key={d} value={d} className="bg-neutral-900">{d}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Profile Slug / Username</label>
                <input
                  type="text"
                  value={newProfileSlug}
                  onChange={(e) => setNewProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="e.g. business-card"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-border text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-white/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Display Name (optional)</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. John Doe / Brand"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-border text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-white/20"
                />
              </div>
            </div>

            <div className="relative z-10 flex gap-3 w-full pt-2">
              <button
                onClick={() => setShowCreateProfileModal(false)}
                className="flex-1 py-3 rounded-xl text-sm text-white/60 font-semibold bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all duration-300 active:scale-95"
                disabled={profileLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProfile}
                disabled={profileLoading || !newProfileSlug}
                className="flex-1 py-3 btn-primary-glow text-sm font-bold flex items-center justify-center gap-2 active:scale-95"
              >
                {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Profile
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Upgrade Plan Modal */}
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
        featureName={upgradeModal.feature}
        description={upgradeModal.description}
        planNeeded={upgradeModal.planNeeded}
      />
    </div >
  );
}
