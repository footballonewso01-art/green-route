import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Camera, Palette, Smartphone, User, Check, Upload, Globe, Plus, Eye, EyeOff, Edit, Trash2, X, Save, Lock, Copy, ChevronDown, Sparkles, Layers3, Share2, Search, ExternalLink } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { IconPicker } from '@/components/icons/IconPicker';
import { IconRenderer } from '@/components/icons/IconRenderer';
import { detectIconFromUrl } from '@/components/icons/detector';
import { checkPlan, PLANS, PlanType } from '@/lib/plans';
import { UpgradeModal } from "@/components/UpgradeModal";
import Cropper, { Area, Point } from 'react-easy-crop';
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import { getCroppedImg } from '@/lib/cropImage';
import { ProfileLinkEditorCard } from "@/components/profile/ProfileLinkEditorCard";
import { ProfileCanvas } from "@/components/profile/ProfileCanvas";
import { getAvailableDomains } from "@/lib/siteConfig";
import { maskError } from "@/lib/utils";
import { isReservedPublicSlug } from "@/lib/systemRoutes";
import { buildProfileLinkUpdateFormData } from "@/lib/profileLinkPersistence";
import { CoreLinkRecord, getProfileLinkTitle, ProfileLinkItem, ProfileLinkRecord } from "@/lib/profileLinks";
import {
  isLightProfileColor,
  normalizeProfileTemplate,
  PROFILE_TEMPLATES,
  ProfileTemplateId,
} from "@/lib/profileTemplates";
import {
  LINK_CARD_STYLES,
  LinkCardStyleId,
  normalizeLinkCardStyle,
  normalizeSocialLinkStyle,
  SOCIAL_LINK_STYLES,
  SocialLinkStyleId,
} from "@/lib/profileAppearance";

function TemplateThumbnail({ template }: { template: ProfileTemplateId }) {
  const linkRows = (
    <div className="space-y-1.5 px-2 pb-2">
      {[0.16, 0.1].map((opacity) => (
        <div
          key={opacity}
          className="h-3.5 rounded-[4px] flex items-center gap-1 px-1.5"
          style={{ backgroundColor: `rgba(255,255,255,${opacity})` }}
        >
          <span className="h-2 w-2 rounded-[2px] bg-white/25" />
          <span className="h-0.5 w-10 rounded-full bg-white/55" />
          <span className="ml-auto h-1 w-1 rotate-45 border-r border-t border-white/30" />
        </div>
      ))}
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

function LinkCardStyleThumbnail({ style }: { style: LinkCardStyleId }) {
  const rowClass = style === "minimal"
    ? "rounded-none border-x-0 border-t-0 bg-transparent"
    : style === "outline"
      ? "rounded-md border-white/35 bg-transparent"
      : style === "solid"
        ? "rounded-md border-white/5 bg-white/20"
        : style === "glass"
          ? "rounded-md border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          : "rounded-md border-white/10 bg-white/10 p-1";

  return (
    <div className="flex h-16 flex-col justify-center gap-1.5 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 px-2">
      {[0, 1].map((row) => (
        <div key={row} className={`flex h-5 items-center gap-1.5 border px-1.5 ${rowClass}`}>
          <span className={style === "image-first"
            ? "h-3.5 w-5 rounded-[2px] bg-gradient-to-br from-accent/70 to-cyan-400/45"
            : "h-2.5 w-2.5 rounded-[3px] bg-white/25"}
          />
          <span className={`h-1 rounded-full bg-white/65 ${row === 0 ? "w-12" : "w-9"}`} />
          <span className="ml-auto h-1.5 w-1.5 rotate-45 border-r border-t border-white/35" />
        </div>
      ))}
    </div>
  );
}

function SocialStyleThumbnail({ style }: { style: SocialLinkStyleId }) {
  return (
    <div className="flex h-16 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-950 px-2">
      {style === "icons" && (
        <div className="flex gap-2">
          {["bg-pink-500", "bg-white/15", "bg-blue-500"].map((color) => (
            <span key={color} className={`h-7 w-7 rounded-full ${color}`} />
          ))}
        </div>
      )}
      {style === "branded-pills" && (
        <div className="flex flex-wrap justify-center gap-1.5">
          <span className="h-6 w-14 rounded-full bg-pink-600" />
          <span className="h-6 w-12 rounded-full bg-neutral-800" />
          <span className="h-6 w-14 rounded-full bg-blue-600" />
        </div>
      )}
    </div>
  );
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
  link_card_style?: string;
  social_link_style?: string;
  card_color?: string;
  avatar?: string;
  online_counter?: boolean;
  social_links?: SocialLink[];
}

type VisualSectionId = "template" | "card" | "linkCards" | "socialStyle";
type VisualSectionState = Record<VisualSectionId, boolean>;

const VISUAL_SECTIONS_STORAGE_KEY = "linktery:profile-editor:visual-sections";
const DEFAULT_VISUAL_SECTIONS: VisualSectionState = {
  template: true,
  card: true,
  linkCards: true,
  socialStyle: true,
};

function readVisualSectionState(): VisualSectionState {
  if (typeof window === "undefined") return DEFAULT_VISUAL_SECTIONS;

  try {
    const stored = JSON.parse(window.localStorage.getItem(VISUAL_SECTIONS_STORAGE_KEY) || "null") as Partial<VisualSectionState> | null;
    return {
      template: typeof stored?.template === "boolean" ? stored.template : true,
      card: typeof stored?.card === "boolean" ? stored.card : true,
      linkCards: typeof stored?.linkCards === "boolean" ? stored.linkCards : true,
      socialStyle: typeof stored?.socialStyle === "boolean" ? stored.socialStyle : true,
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
  const [profileTemplate, setProfileTemplate] = useState<ProfileTemplateId>("classic");
  const [linkCardStyle, setLinkCardStyle] = useState<LinkCardStyleId>("glass");
  const [socialLinkStyle, setSocialLinkStyle] = useState<SocialLinkStyleId>("icons");
  const [cardColor, setCardColor] = useState(user?.card_color || "#000000");
  const [onlineCounter, setOnlineCounter] = useState(!!user?.online_counter);
  const [openVisualSections, setOpenVisualSections] = useState<VisualSectionState>(readVisualSectionState);
  const userPlan = (user as { plan?: string })?.plan || "creator";
  const canCustomize = checkPlan(userPlan, "profile_customization");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // Actual file to upload
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Profile composition state. Redirect settings remain owned by `links`.
  const [profileLinkItems, setProfileLinkItems] = useState<ProfileLinkItem[]>([]);
  const [allLinks, setAllLinks] = useState<CoreLinkRecord[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkPickerSearch, setLinkPickerSearch] = useState("");
  const [linkAddingId, setLinkAddingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // Added from user's snippet
  const [socialEditingId, setSocialEditingId] = useState<string | null>(null);

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
      setProfileTemplate(normalizeProfileTemplate(active.profile_template));
      setLinkCardStyle(normalizeLinkCardStyle(active.link_card_style));
      setSocialLinkStyle(normalizeSocialLinkStyle(active.social_link_style));
      setCardColor(active.card_color || "#000000");
      setOnlineCounter(!!active.online_counter);
      
      if (active.avatar) {
        setAvatarPreview(pb.files.getUrl(active, active.avatar));
      } else {
        setAvatarPreview(null);
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
    setActiveProfileId(profileId);
    setName(p.name || "");
    setUsername(p.slug || "");
    setDomain(p.domain || availableDomains[0]);
    setBio(p.bio || "");
    setProfileTemplate(normalizeProfileTemplate(p.profile_template));
    setLinkCardStyle(normalizeLinkCardStyle(p.link_card_style));
    setSocialLinkStyle(normalizeSocialLinkStyle(p.social_link_style));
    setCardColor(p.card_color || "#000000");
    setOnlineCounter(!!p.online_counter);
    
    if (p.avatar) {
      setAvatarPreview(pb.files.getUrl(p, p.avatar));
    } else {
      setAvatarPreview(null);
    }
    
    setSocialLinks(Array.isArray(p.social_links) ? p.social_links : []);
    setLinksLoading(true);
  };

  const handleCreateProfile = async () => {
    if (!newProfileSlug.trim()) {
      toast.error("Profile slug is required");
      return;
    }

    const cleanSlug = newProfileSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSlug) {
      toast.error("Slug must contain only letters, numbers, or hyphens");
      return;
    }
    if (cleanSlug.length > 64) {
      toast.error("Profile slug must be 64 characters or fewer");
      return;
    }
    if (isReservedPublicSlug(cleanSlug)) {
      toast.error("This address is reserved by Linktery. Please choose another slug.");
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
        theme: "sunset",
        profile_template: "classic",
        link_card_style: "solid",
        social_link_style: "icons",
        card_color: "#000000",
      });

      toast.success("Profile created successfully!");
      setShowCreateProfileModal(false);
      setNewProfileSlug("");
      setNewProfileName("");
      
      await fetchProfiles(created.id);
    } catch (e: unknown) {
      toast.error(maskError(e, "We couldn't create this Public Profile. Check the public URL and try again."));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profileId || !user) return;

    if (!confirm(`Delete profile @${username}? Its layout and card customizations will be deleted. The underlying Links and their analytics will remain in your account.`)) {
      return;
    }

    setProfileLoading(true);
    try {
      await pb.collection('public_profiles').delete(profileId, { requestKey: null });

      toast.success("Profile deleted. Your Links and analytics were kept.");
      navigate("/dashboard/profile");
    } catch (e: unknown) {
      console.error("Failed to delete profile:", e);
      toast.error(maskError(e, "We couldn't delete this Public Profile. Please try again."));
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

  const fetchLinks = async () => {
    if (!activeProfileId || !user) return;
    try {
      const [assignments, coreLinks] = await Promise.all([
        pb.collection('profile_links').getFullList<ProfileLinkRecord>({
          filter: `user_id = "${user.id}" && profile_id = "${activeProfileId}"`,
          sort: 'order,created',
          expand: 'link_id',
          requestKey: null,
        }),
        pb.collection('links').getFullList<CoreLinkRecord>({
          filter: `user_id = "${user.id}"`,
          sort: '-created',
          requestKey: null,
        }),
      ]);

      const resolved = assignments.flatMap<ProfileLinkItem>((assignment) => {
        const link = assignment.expand?.link_id;
        if (!link) return [];
        return [{
          ...assignment,
          link,
          backgroundUrl: assignment.bg_image ? pb.files.getUrl(assignment, assignment.bg_image) : null,
        }];
      });

      setProfileLinkItems(resolved);
      setAllLinks(coreLinks);
    } catch (error: unknown) {
      console.error("Failed to load profile composition:", error);
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
      const cleanSlug = username.toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (!cleanSlug) {
        toast.error("Profile slug is required");
        setProfileLoading(false);
        return;
      }
      if (cleanSlug.length > 64) {
        toast.error("Profile slug must be 64 characters or fewer");
        setProfileLoading(false);
        return;
      }
      if (isReservedPublicSlug(cleanSlug)) {
        toast.error("This address is reserved by Linktery. Please choose another slug.");
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
        theme: "sunset",
        profile_template: profileTemplate,
        link_card_style: linkCardStyle,
        social_link_style: socialLinkStyle,
        card_color: cardColor,
        online_counter: onlineCounter,
        social_links: socialLinks,
      };

      console.log("[handleSaveProfile] Updating profile metadata...", updateData);
      await pb.collection("public_profiles").update(activeProfileId, updateData, { requestKey: null });

      // Step 2: Upload files
      if (avatarFile) {
        const fileData = new FormData();
        if (avatarFile) fileData.append("avatar", avatarFile);
        await pb.collection("public_profiles").update(activeProfileId, fileData, { requestKey: null });
      }

      setAvatarFile(null);

      // Link CRUD is persisted independently and immediately. Saving profile
      // settings must never create, delete or overwrite records in `links`.
      await fetchProfiles(activeProfileId);
      toast.success("Profile settings saved");
    } catch (err: unknown) {
      console.error("[handleSaveProfile] Error:", err);
      toast.error(maskError(err, "We couldn't save these profile settings. Check the fields and try again."));
    } finally {
      setProfileLoading(false);
    }
  };


  // --- LINK MANAGEMENT ---

  const handleAddLink = async (linkId: string) => {
    if (!user || !activeProfileId) return;
    setLinkAddingId(linkId);
    try {
      const highestOrder = profileLinkItems.length > 0
        ? Math.max(...profileLinkItems.map(item => Number(item.order) || 0))
        : -1;
      await pb.collection('profile_links').create({
        user_id: user.id,
        profile_id: activeProfileId,
        link_id: linkId,
        order: highestOrder + 1,
        visible: true,
        size: "regular",
      }, { requestKey: null });
      await fetchLinks();
      toast.success("Link added to this profile");
    } catch (error) {
      toast.error(maskError(error, "Failed to add link to profile"));
    } finally {
      setLinkAddingId(null);
    }
  };

  const handleUpdateProfileLink = async (
    id: string,
    presentation: { title_override: string; size: "regular" | "large" },
    bgImageFile: File | null,
    bgImageRemoved: boolean,
  ) => {
    const formData = buildProfileLinkUpdateFormData(presentation, bgImageFile, bgImageRemoved);

    try {
      await pb.collection('profile_links').update(id, formData, { requestKey: null });
      await fetchLinks();
      toast.success("Profile card saved");
      return true;
    } catch (error) {
      toast.error(maskError(error, "Failed to save profile card"));
      return false;
    }
  };

  const handleRemoveProfileLink = async (id: string) => {
    if (!confirm("Remove this card from the Public Profile? The Link, redirect and analytics will remain in Links.")) return;
    try {
      await pb.collection('profile_links').delete(id, { requestKey: null });
      setProfileLinkItems(current => current.filter(item => item.id !== id));
      toast.success("Link removed from this profile");
    } catch (error) {
      toast.error(maskError(error, "Failed to remove link from profile"));
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    const reordered = Array.from(profileLinkItems);
    const [reorderedItem] = reordered.splice(sourceIndex, 1);
    if (!reorderedItem) return;
    reordered.splice(destinationIndex, 0, reorderedItem);

    const reorderedWithOrder = reordered.map((item, index) => ({ ...item, order: index }));
    setProfileLinkItems(reorderedWithOrder);

    try {
      await Promise.all(reorderedWithOrder.map(item =>
        pb.collection('profile_links').update(item.id, { order: item.order }, { requestKey: null })
      ));
    } catch (error) {
      toast.error(maskError(error, "Failed to save link order"));
      await fetchLinks();
    }
  };

  const visibleProfileLinks = profileLinkItems.filter(item => item.visible && item.link.active);
  const assignedLinkIds = new Set(profileLinkItems.map(item => item.link_id));
  const normalizedLinkSearch = linkPickerSearch.trim().toLowerCase();
  const availableProfileLinks = allLinks.filter(link => {
    if (assignedLinkIds.has(link.id)) return false;
    if (!normalizedLinkSearch) return true;
    return [link.title, link.slug, link.destination_url]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(normalizedLinkSearch));
  });

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
            <p className="text-muted-foreground text-sm mt-1">Customize your profile, links, and presentation</p>
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

            <div className="space-y-4 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => toggleVisualSection("linkCards")}
                aria-expanded={openVisualSections.linkCards}
                aria-controls="link-card-style-options"
                className="group flex w-full items-start justify-between gap-4 text-left"
              >
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                    <Layers3 className="h-4 w-4 text-accent" /> Link Card Style
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Control how every destination is presented without changing its URL or tracking.
                  </p>
                </div>
                <ChevronDown
                  className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-white ${openVisualSections.linkCards ? "rotate-180" : ""}`}
                />
              </button>

              {openVisualSections.linkCards && (
                <div id="link-card-style-options" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
                  {LINK_CARD_STYLES.map((styleOption) => (
                    <button
                      key={styleOption.id}
                      type="button"
                      onClick={() => canCustomize && setLinkCardStyle(styleOption.id)}
                      disabled={!canCustomize}
                      aria-pressed={linkCardStyle === styleOption.id}
                      className={`relative rounded-xl border p-2.5 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 active:scale-[0.99] ${
                        linkCardStyle === styleOption.id
                          ? "border-accent bg-accent/5 ring-1 ring-accent/50"
                          : "border-border bg-surface hover:border-accent/30"
                      } ${!canCustomize ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <LinkCardStyleThumbnail style={styleOption.id} />
                      <span className="mt-2 block text-xs font-semibold text-white">
                        {styleOption.name}
                      </span>
                      <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">
                        {styleOption.description}
                      </span>
                      {linkCardStyle === styleOption.id && (
                        <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-accent shadow-lg">
                          <Check className="h-3 w-3 text-accent-foreground" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => toggleVisualSection("socialStyle")}
                aria-expanded={openVisualSections.socialStyle}
                aria-controls="social-link-style-options"
                className="group flex w-full items-start justify-between gap-4 text-left"
              >
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                    <Share2 className="h-4 w-4 text-accent" /> Social Links Style
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose compact icons or branded pills for social traffic.
                  </p>
                </div>
                <ChevronDown
                  className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-white ${openVisualSections.socialStyle ? "rotate-180" : ""}`}
                />
              </button>

              {openVisualSections.socialStyle && (
                <div id="social-link-style-options" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  {SOCIAL_LINK_STYLES.map((styleOption) => (
                    <button
                      key={styleOption.id}
                      type="button"
                      onClick={() => canCustomize && setSocialLinkStyle(styleOption.id)}
                      disabled={!canCustomize}
                      aria-pressed={socialLinkStyle === styleOption.id}
                      className={`relative rounded-xl border p-2.5 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 active:scale-[0.99] ${
                        socialLinkStyle === styleOption.id
                          ? "border-accent bg-accent/5 ring-1 ring-accent/50"
                          : "border-border bg-surface hover:border-accent/30"
                      } ${!canCustomize ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <SocialStyleThumbnail style={styleOption.id} />
                      <span className="mt-2 block text-xs font-semibold text-white">
                        {styleOption.name}
                      </span>
                      <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">
                        {styleOption.description}
                      </span>
                      {socialLinkStyle === styleOption.id && (
                        <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-accent shadow-lg">
                          <Check className="h-3 w-3 text-accent-foreground" />
                        </span>
                      )}
                    </button>
                  ))}
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
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  maxLength={64}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <Globe className="w-5 h-5 text-accent" /> Profile links
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Choose existing Links, then customize how each card looks on this profile.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkPicker(current => !current)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/15"
                aria-expanded={showLinkPicker}
              >
                {showLinkPicker ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showLinkPicker ? "Close" : "Add from Links"}
              </button>
            </div>

            {showLinkPicker && (
              <div className="animate-fade-in overflow-hidden rounded-2xl border border-accent/25 bg-surface/75">
                <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={linkPickerSearch}
                      onChange={event => setLinkPickerSearch(event.target.value)}
                      placeholder="Search your Links"
                      className="h-10 w-full rounded-xl border border-border bg-background/45 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent/45"
                    />
                  </div>
                  <RouterLink
                    to={`/dashboard/links/create?profile=${activeProfileId}`}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-foreground transition-colors hover:border-accent/35 hover:text-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Create in Links
                  </RouterLink>
                </div>
                <div className="max-h-72 space-y-1.5 overflow-y-auto p-2.5">
                  {availableProfileLinks.length > 0 ? availableProfileLinks.map(link => (
                    <div key={link.id} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.025]">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/45">
                        <IconRenderer type={link.icon_type} value={link.icon_value} url={link.destination_url} className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{link.title || `/${link.slug}`}</p>
                        <p className="truncate text-xs font-sans text-muted-foreground">{link.destination_url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAddLink(link.id)}
                        disabled={linkAddingId !== null}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 text-xs font-bold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                      >
                        {linkAddingId === link.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Add
                      </button>
                    </div>
                  )) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-medium text-foreground">{allLinks.length === 0 ? "You do not have any Links yet" : "All matching Links are already on this profile"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Create and manage redirect destinations in Links.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Links List */}
            {linksLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
            ) : profileLinkItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-9 text-center">
                <p className="text-sm font-semibold text-foreground">No Links on this profile yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Add an existing Link above. Its redirect and analytics stay managed in Links.</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="profile-links" isDropDisabled={profileLinkItems.length <= 1}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {profileLinkItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={profileLinkItems.length <= 1}>
                          {(provided, snapshot) => (
                            <ProfileLinkEditorCard
                              item={item}
                              provided={provided}
                              snapshot={snapshot}
                              onUpdate={handleUpdateProfileLink}
                              onRemove={handleRemoveProfileLink}
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
            {profileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Profile Settings"}
          </button>
        </div>

        {/* Right Col: Live Preview */}
        <div className="lg:col-span-5 relative hidden md:block">
          <div className="sticky top-24 flex flex-col items-center">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="w-4 h-4" /> Live Mobile Preview
            </div>

            {/* Phone Frame */}
            <div className="relative w-[320px] overflow-hidden rounded-[52px] border-[10px] border-surface bg-surface shadow-2xl shadow-accent/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-surface rounded-b-2xl z-20" />
              <div
                className="relative h-[625px] w-full overflow-hidden rounded-[41px] bg-black"
                data-profile-preview-viewport="390x812"
              >
                {/* One CSS pixel of horizontal bleed keeps fractional scaling from exposing the phone frame. */}
                <div
                  className="no-scrollbar absolute left-0 top-0 h-[812px] w-[391px] origin-top-left overflow-x-hidden overflow-y-auto overscroll-contain"
                  style={{ transform: "scale(0.7692307692)" }}
                >
                  <ProfileCanvas
                    preview
                    template={profileTemplate}
                    linkCardStyle={linkCardStyle}
                    socialLinkStyle={socialLinkStyle}
                    name={name || "Your Name"}
                    username={username || "username"}
                    bio={bio}
                    avatarUrl={avatarPreview}
                    avatarFallback={name.charAt(0).toUpperCase() || "?"}
                    cardColor={cardColor}
                    socialLinks={socialLinks}
                    plan={userPlan}
                    onlineCounter={onlineCounter ? (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                        <span className={`text-xs font-medium tracking-wide ${isLightProfileColor(cardColor) ? "text-black/50" : "text-white/50"}`}>
                          <span className={isLightProfileColor(cardColor) ? "font-bold text-black/70" : "font-bold text-white/70"}>342</span>{" "}
                          people are currently watching this
                        </span>
                      </div>
                    ) : undefined}
                    links={visibleProfileLinks.map((item) => ({
                      id: item.id,
                      title: getProfileLinkTitle(item),
                      destinationUrl: item.link.destination_url,
                      iconType: item.link.icon_type,
                      iconValue: item.link.icon_value,
                      size: item.size,
                      backgroundUrl: item.backgroundUrl,
                    }))}
                  />
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
                  onChange={(e) => setNewProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  maxLength={64}
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
