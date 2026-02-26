import { useNavigate } from "react-router-dom";
import { Zap, X, Shield, BarChart3, Lock, CheckCircle2 } from "lucide-react";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName: string;
    description: string;
    planNeeded?: "pro" | "agency";
}

export function UpgradeModal({ isOpen, onClose, featureName, description, planNeeded = "pro" }: UpgradeModalProps) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleUpgrade = () => {
        navigate("/dashboard/pricing");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md glass-card p-8 rounded-3xl shadow-2xl border-accent/20 animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-xl h-10 w-10 flex items-center justify-center hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center space-y-6">
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 relative">
                        {featureName.toLowerCase().includes('analytics') ? (
                            <BarChart3 className="w-10 h-10 text-accent" />
                        ) : featureName.toLowerCase().includes('cloak') ? (
                            <Shield className="w-10 h-10 text-accent" />
                        ) : (
                            <Zap className="w-10 h-10 text-accent" />
                        )}
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg">
                            <Lock className="w-4 h-4 text-accent" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Upgrade Required</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {description || `Unlock ${featureName} and other professional tools with ${planNeeded === 'pro' ? 'Creator Pro' : 'Agency'}.`}
                        </p>
                    </div>

                    <div className="bg-surface/50 rounded-2xl p-4 border border-border text-left space-y-3">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">Unlock professional features instantly.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">Increase your resource limits.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">Priority support and advanced management.</p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleUpgrade}
                            className="btn-primary-glow w-full flex items-center justify-center gap-2 group"
                        >
                            <Zap className="w-4 h-4 fill-current group-hover:animate-pulse" />
                            Upgrade to {planNeeded === 'pro' ? 'Creator Pro' : 'Agency'}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
