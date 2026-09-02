import { ArrowDown, ArrowRight, BarChart3, Check, Globe2, Link2, MousePointerClick, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { SolutionDetailDefinition } from "./solutionDetailContent";
import styles from "./SolutionDetails.module.css";

function SceneHeader({ title, label }: { title: string; label: string }) {
  return <div className={styles.sceneHeader}><span>{label}</span><span><i />Live structure</span><strong>{title}</strong></div>;
}

function ProfileScene({ solution }: { solution: SolutionDetailDefinition }) {
  return (
    <div className={styles.profileScene}>
      <div className={styles.profileIdentity}><span>{solution.label.slice(0, 1)}</span><div><strong>{solution.visualTitle}</strong><small>@yourname</small></div></div>
      <div className={styles.profileLinks}>{solution.destinations.map((destination, index) => <span key={destination}><i>{index + 1}</i>{destination}<ArrowRight size={13} /></span>)}</div>
      <div className={styles.profileFooter}><span><MousePointerClick size={13} />Views & clicks</span><span>Editable</span></div>
    </div>
  );
}

function FlowScene({ solution, mode }: { solution: SolutionDetailDefinition; mode: "commerce" | "handoff" | "campaign" }) {
  const icons = mode === "handoff" ? [Smartphone, Link2, Globe2] : mode === "commerce" ? [MousePointerClick, Link2, Check] : [MousePointerClick, Link2, BarChart3];
  return (
    <div className={styles.flowScene}>
      {solution.destinations.map((destination, index) => {
        const Icon = icons[index];
        return <div key={destination} className={styles.flowStep}><span><Icon size={17} /></span><div><small>{index === 0 ? "Visitor starts" : index === 1 ? "Linktery handles" : "Visitor continues"}</small><strong>{destination}</strong></div>{index < 2 && <ArrowDown className={styles.flowArrow} size={16} />}</div>;
      })}
    </div>
  );
}

function MediaScene({ solution }: { solution: SolutionDetailDefinition }) {
  return (
    <div className={styles.mediaScene}>
      <div className={styles.mediaRelease}><span>Now sharing</span><strong>{solution.visualTitle}</strong><small>One link · every destination</small></div>
      <div className={styles.mediaServices}>{solution.destinations.map((destination, index) => <span key={destination}><i>{index + 1}</i><strong>{destination}</strong><ArrowRight size={14} /></span>)}</div>
    </div>
  );
}

function RoutingScene({ solution }: { solution: SolutionDetailDefinition }) {
  return (
    <div className={styles.routingScene}>
      <div className={styles.routeUrl}><Link2 size={15} /><span>linktery.com/<b>campaign</b></span></div>
      <div className={styles.routeLine}><i /><span>Country first</span><i /></div>
      <div className={styles.routeDestinations}>{solution.destinations.map((destination, index) => <span key={destination} className={index === 0 ? styles.activeRoute : ""}><small>{index === 2 ? "Fallback" : `Rule ${index + 1}`}</small><strong>{destination}</strong></span>)}</div>
    </div>
  );
}

function RotationScene({ solution }: { solution: SolutionDetailDefinition }) {
  return (
    <div className={styles.rotationScene}>
      <div className={styles.rotationSource}><Link2 size={15} />campaign.link</div>
      <div className={styles.splitTrack}><i /><span>Even split</span><i /></div>
      <div className={styles.rotationCards}>{solution.destinations.slice(0, 2).map((destination) => <span key={destination}><strong>{destination}</strong><small>50% of visits</small></span>)}</div>
      <div className={styles.rotationReport}><BarChart3 size={15} /><span>{solution.destinations[2]}</span><small>Compare with destination data</small></div>
    </div>
  );
}

function PortfolioScene({ solution }: { solution: SolutionDetailDefinition }) {
  return (
    <div className={styles.portfolioScene}>
      <div className={styles.portfolioCanvas}><span /><span /><span /></div>
      <div className={styles.portfolioList}>{solution.destinations.map((destination, index) => <span key={destination}><i>{index + 1}</i><strong>{destination}</strong></span>)}</div>
    </div>
  );
}

function QrScene({ solution }: { solution: SolutionDetailDefinition }) {
  return (
    <div className={styles.qrDetailScene}>
      <div className={styles.qrPaper}><QRCodeSVG value="https://linktery.com/campaign" size={154} marginSize={2} fgColor="var(--landing-media)" bgColor="var(--landing-white)" /><span>SCAN TO CONTINUE</span></div>
      <div className={styles.qrRoute}>{solution.destinations.map((destination, index) => <span key={destination}><i>{index + 1}</i><strong>{destination}</strong>{index < 2 && <ArrowDown size={13} />}</span>)}</div>
    </div>
  );
}

export default function SolutionDetailVisual({ solution }: { solution: SolutionDetailDefinition }) {
  return (
    <div className={styles.scene} data-solution-visual={solution.visual}>
      <SceneHeader title={solution.visualTitle} label={solution.label} />
      {solution.visual === "profile" && <ProfileScene solution={solution} />}
      {solution.visual === "portfolio" && <PortfolioScene solution={solution} />}
      {solution.visual === "routing" && <RoutingScene solution={solution} />}
      {solution.visual === "rotation" && <RotationScene solution={solution} />}
      {solution.visual === "media" && <MediaScene solution={solution} />}
      {solution.visual === "qr" && <QrScene solution={solution} />}
      {(solution.visual === "commerce" || solution.visual === "handoff" || solution.visual === "campaign") && <FlowScene solution={solution} mode={solution.visual} />}
    </div>
  );
}
