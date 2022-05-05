import styles from './styles.module.css';

export const ControlLabel = ({ children }) => {
  return (
    <span className={ styles.controlLabel }>
      { children }
    </span>
  );
};