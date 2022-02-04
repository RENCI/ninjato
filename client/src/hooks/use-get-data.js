import { useContext } from 'react';
import { DataContext, SET_DATA } from 'contexts';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';

export const useGetData = ()  => {
  const [, dataDispatch] = useContext(DataContext);

  return async ({ imageId, maskId }) => {
    try {
      const data = await api.getData(imageId, maskId);

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
    }      
  };
};