import styles from './styles.module.css';

export const ButtonWrapper = ({ disabled, children, onClick }) => { 
  const classes = [styles.wrapper];
  if (disabled) classes.push(styles.disabled);

  return (      
    <div
      className={ classes.join(' ') }
      role='button'
      tabIndex={ 0 }
      onClick={ disabled ? null : onClick }
    >
      { children }
    </div>
  );
};
