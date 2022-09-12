import { useContext} from 'react';
import { UserContext } from 'contexts';
import styles from './styles.module.css'; 

export const SliceLabel = ({ slice }) => {
  const [{ assignment }] = useContext(UserContext);

  const { z_min } = assignment.location;

  return (
    <div className={ styles.label }>z slice: { z_min + slice }</div>
  );
};