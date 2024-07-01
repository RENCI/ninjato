import styles from './styles.module.css';

export const ControlBar = ({ children }) => {
  return (
    <div className={ styles.controlBar }>
      { children }
    </div>
  );
};
