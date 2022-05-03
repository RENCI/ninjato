import { useContext } from 'react';
import { 
  UserContext, SET_DATA,
  ErrorContext, SET_ERROR 
} from 'contexts';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';

export const useLoadPracticeData = ()  => {
  const [, dataDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async () => {
    try {
      const data = await api.getPracticeData();

      const imageData = decodeTIFF(data.imageBuffer);
      const maskData = decodeTIFF(data.maskBuffer);

      dataDispatch({
        type: SET_DATA,
        imageData: imageData,
        maskData: maskData,
        label: 14
      });
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};