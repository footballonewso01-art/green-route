import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { featureGroups, featurePresentation } from "./featurePresentation";
import styles from "./FeatureMarketing.module.css";

export default function FeatureNavigation({ currentPath }: { currentPath: string }) {
  const links = featureGroups.map((group) => <div key={group.id} className={styles.directoryGroup}>
    <p>{group.label}</p>
    {Object.entries(featurePresentation).filter(([, feature]) => feature.group === group.id).map(([path, feature]) => <Link key={path} to={path} aria-current={path === currentPath ? "page" : undefined}>{feature.label}</Link>)}
  </div>);

  return <aside className={styles.directory}>
    <nav className={styles.desktopDirectory} aria-label="Feature directory"><Link to="/features" className={styles.directoryHome}>All features</Link>{links}</nav>
    <details key={currentPath} className={styles.mobileDirectory}>
      <summary>Browse features<ChevronDown size={18} aria-hidden="true" /></summary>
      <nav aria-label="Feature directory"><Link to="/features" className={styles.directoryHome}>All features</Link>{links}</nav>
    </details>
  </aside>;
}
