import styles from './styles.module.css';

export const ButtonWrapper = ({ children, onClick }) => { 
  return (      
    <div
      className={ styles.wrapper }
      role='button'
      tabIndex={ 0 }
      onClick={ onClick }
    >
      { children }
    </div>
  );
};
