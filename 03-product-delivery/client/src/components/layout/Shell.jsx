import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import styles from './Shell.module.css';

export default function Shell() {
  return (
    <div className={styles.shell}>
      <TopBar />
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
