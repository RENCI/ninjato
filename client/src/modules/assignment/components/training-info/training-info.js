import { useContext } from 'react';
import { UserContext } from 'contexts';
import styles from './styles.module.css';

export const TrainingInfo = () => {
  const [{ assignment }] = useContext(UserContext);

  const info = assignment.trainingInfo;

  if (!info) return null;

  const message = info.merge ? `merge region with ${ info.merge.length } neighboring region ${ info.merge.length > 1 ? 's' : '' }` :
    info.split ? 'split region into two regions' :
    'refine region boundary'; 

  return (
    <>
      { !assignment.trainingInfo ? null :
        <div className={ styles.trainingInfo }>
          <span className={ styles.emphasize }>Training assignment: </span>
          { message }
        </div> 
      }
    </>
  );
};
