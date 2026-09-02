import { useCallback, useEffect, useState } from "react";
import { Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateProfileDialog } from "@/components/profile/CreateProfileDialog";
import {
  ProfileLibraryCard,
  ProfileLibraryCardData,
} from "@/components/profile/ProfileLibraryCard";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { PLANS, PlanType } from "@/lib/plans";
import { getAvailableDomains } from "@/lib/siteConfig";
import { maskError } from "@/lib/utils";
import { isReservedPublicSlug } from "@/lib/systemRoutes";
import { isPublicSlugAvailable } from "@/lib/publicAssets";
import {
  DashboardEmptyState,
  DashboardPage,
  DashboardPageHeader,
} from "@/components/dashboard/DashboardPrimitives";

interface ProfileRecord {
  id: string;
  user_id: string;
  slug: string;
  domain: string;
  name?: string;
  bio?: string;
  profile_template?: string;
  link_card_style?: string;
  social_link_style?: string;
  card_color?: string;
  avatar?: string;
  profile_background_mode?: string;
  profile_background_image?: string;
  online_counter?: boolean;
}

const availableDomains = getAvailableDomains(import.meta.env.VITE_AVAILABLE_DOMAINS);

export default function ProfileHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileCountMap, setProfileCountMap] = useState<Record<string, number>>({});
  const [copiedProfileId, setCopiedProfileId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileSlug, setNewProfileSlug] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDomain, setNewProfileDomain] = useState(availableDomains[0]);
  const [actionLoading, setActionLoading] = useState(false);
  const [profilePendingDelete, setProfilePendingDelete] = useState<ProfileRecord | null>(null);

  const userPlan = (user as { plan?: string })?.plan || "creator";
  const planDetails = PLANS[userPlan as PlanType] || PLANS.creator;
  const maxProfiles = planDetails.limits.public_profiles;
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    feature: string;
    description: string;
    planNeeded?: "pro" | "agency";
  }>({
    open: false,
    feature: "",
    description: "",
  });

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const records = (await pb.collection("public_profiles").getFullList({
        filter: `user_id = "${user.id}"`,
        sort: "-updated",
        requestKey: null,
      })) as unknown as ProfileRecord[];

      setProfiles(records);

      const assignments = await pb.collection("profile_links").getFullList({
        filter: `user_id = "${user.id}" && visible = true`,
        requestKey: null,
      });

      const counts: Record<string, number> = {};
      assignments.forEach((assignment) => {
        if (assignment.profile_id) {
          counts[assignment.profile_id] = (counts[assignment.profile_id] || 0) + 1;
        }
      });
      setProfileCountMap(counts);
    } catch (error) {
      console.error("Failed to load profiles:", error);
      toast.error("Failed to load public profiles");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void fetchProfiles();
  }, [fetchProfiles, user]);

  const getProfileFullUrl = (profile: Pick<ProfileRecord, "domain" | "slug">) => {
    const cleanDomain = profile.domain || availableDomains[0];
    const protocol = cleanDomain.startsWith("localhost") || cleanDomain.startsWith("127.0.0.1")
      ? "http"
      : "https";
    return `${protocol}://${cleanDomain}/${profile.slug}`;
  };

  const handleCopyLink = async (profile: ProfileRecord) => {
    try {
      await navigator.clipboard.writeText(getProfileFullUrl(profile));
      setCopiedProfileId(profile.id);
      toast.success("Profile URL copied");
      window.setTimeout(() => setCopiedProfileId(null), 2000);
    } catch {
      toast.error("Could not copy the profile URL");
    }
  };

  const openUpgradeForProfiles = () => {
    setUpgradeModal({
      open: true,
      feature: "Multiple Public Profiles",
      description: `Your ${planDetails.name} plan includes ${maxProfiles} public profile${maxProfiles === 1 ? "" : "s"}. Upgrade to create more pages.`,
      planNeeded: maxProfiles < 3 ? "pro" : "agency",
    });
  };

  const requestCreateProfile = () => {
    if (maxProfiles !== -1 && profiles.length >= maxProfiles) {
      openUpgradeForProfiles();
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateProfile = async () => {
    const cleanSlug = newProfileSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSlug) {
      toast.error("Enter a public profile URL");
      return;
    }
    if (cleanSlug.length > 64) {
      toast.error("Public profile URL must be 64 characters or fewer");
      return;
    }
    if (isReservedPublicSlug(cleanSlug)) {
      toast.error("This address is reserved by Linktery. Please choose another slug.");
      return;
    }

    if (maxProfiles !== -1 && profiles.length >= maxProfiles) {
      setShowCreateModal(false);
      openUpgradeForProfiles();
      return;
    }

    setActionLoading(true);
    try {
      const available = await isPublicSlugAvailable(cleanSlug);
      if (!available) {
        toast.error("This public URL is already in use");
        return;
      }

      const created = await pb.collection("public_profiles").create({
        user_id: user?.id,
        slug: cleanSlug,
        domain: newProfileDomain,
        name: newProfileName.trim() || cleanSlug,
        username: cleanSlug,
        theme: "sunset",
        profile_template: "classic",
        link_card_style: "solid",
        social_link_style: "icons",
        card_color: "#000000",
        profile_background_mode: "color",
        profile_background_position: "center",
        profile_background_overlay: "balanced",
      });

      toast.success("Public Profile created");
      setShowCreateModal(false);
      setNewProfileSlug("");
      setNewProfileName("");
      navigate(`/dashboard/profile/${created.id}`);
    } catch (error: unknown) {
      toast.error(maskError(error, "We couldn't create this Public Profile. Check the public URL and try again."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profilePendingDelete || !user) return;
    const profileId = profilePendingDelete.id;
    setActionLoading(true);

    try {
      await pb.collection("public_profiles").delete(profileId, { requestKey: null });

      toast.success("Profile deleted. Its links are still available in Links.");
      setProfilePendingDelete(null);
      await fetchProfiles();
    } catch (error: unknown) {
      console.error("Failed to delete profile:", error);
      toast.error(maskError(error, "We couldn't delete this Public Profile. Please try again."));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardPage className="overflow-visible pb-10">
      <DashboardPageHeader
        eyebrow="Profile library"
        title="Public Profiles"
        description="Create, customize, and share your link-in-bio pages from one place."
        actions={(
        <button
          type="button"
          onClick={requestCreateProfile}
          className="btn-primary-glow flex shrink-0 items-center justify-center gap-1.5 self-start text-sm font-semibold !px-5 !py-2.5 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Profile
        </button>
        )}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Loading profiles">
          {[0, 1, 2].map((item) => (
            <div key={item} className="overflow-hidden rounded-[26px] border border-border/60 bg-surface/50">
              <div className="h-[104px] animate-pulse bg-white/[0.035]" />
              <div className="space-y-3 px-4 pb-4 pt-9">
                <div className="h-4 w-2/5 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-white/[0.04]" />
                <div className="mt-4 h-8 animate-pulse rounded-xl bg-white/[0.035]" />
              </div>
            </div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <DashboardEmptyState
            icon={<Layers className="h-5 w-5" />}
            title="Create your first Public Profile"
            description="Publish a shareable link-in-bio page, then shape it with your own template, cards, and social links."
            action={<button
              type="button"
              onClick={requestCreateProfile}
              className="btn-primary-glow inline-flex items-center gap-2 text-sm !px-6 !py-2.5"
            >
              <Plus className="h-4 w-4" />
              Create Public Profile
            </button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {profiles.map((profile) => {
            const cardData: ProfileLibraryCardData = {
              id: profile.id,
              slug: profile.slug,
              name: profile.name,
              profileTemplate: profile.profile_template,
              cardColor: profile.card_color,
              avatarUrl: profile.avatar ? pb.files.getUrl(profile, profile.avatar) : null,
              profileBackgroundMode: profile.profile_background_mode,
              profileBackgroundUrl: profile.profile_background_image
                ? pb.files.getUrl(profile, profile.profile_background_image, { thumb: "640x0" })
                : null,
              onlineCounter: profile.online_counter,
              linkCount: profileCountMap[profile.id] || 0,
              fullUrl: getProfileFullUrl(profile),
            };

            return (
              <ProfileLibraryCard
                key={profile.id}
                profile={cardData}
                copied={copiedProfileId === profile.id}
                deleteDisabled={actionLoading}
                onEdit={() => navigate(`/dashboard/profile/${profile.id}`)}
                onCopy={() => void handleCopyLink(profile)}
                onAnalytics={() => navigate(`/dashboard/analytics?profile=${profile.id}`)}
                onDelete={() => setProfilePendingDelete(profile)}
              />
            );
          })}
        </div>
      )}

      <CreateProfileDialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!actionLoading) setShowCreateModal(open);
        }}
        domains={availableDomains}
        domain={newProfileDomain}
        onDomainChange={setNewProfileDomain}
        slug={newProfileSlug}
        onSlugChange={setNewProfileSlug}
        name={newProfileName}
        onNameChange={setNewProfileName}
        currentProfiles={profiles.length}
        profileLimit={maxProfiles === -1 ? profiles.length + 1 : maxProfiles}
        planName={planDetails.name}
        loading={actionLoading}
        onSubmit={() => void handleCreateProfile()}
      />

      <AlertDialog
        open={Boolean(profilePendingDelete)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setProfilePendingDelete(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-[24px] border-border/80 bg-surface p-6 text-foreground shadow-[0_28px_90px_rgba(0,0,0,0.62)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-[-0.025em]">
              Delete {profilePendingDelete?.name || profilePendingDelete?.slug}?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              The public profile and its visual settings will be permanently deleted. Links assigned to it will be unlinked, but they will remain available in your Links section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel
              disabled={actionLoading}
              className="h-11 rounded-xl border-border/80 bg-transparent px-5 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteProfile();
              }}
              className="h-11 rounded-xl bg-red-500 px-5 font-semibold text-white hover:bg-red-500/90 focus-visible:ring-red-400"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete profile"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal((previous) => ({ ...previous, open: false }))}
        featureName={upgradeModal.feature}
        description={upgradeModal.description}
        planNeeded={upgradeModal.planNeeded}
      />
    </DashboardPage>
  );
}
