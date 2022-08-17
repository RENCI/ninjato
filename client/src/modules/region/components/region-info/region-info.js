import { useContext } from 'react';
import { Select } from 'semantic-ui-react';
import { UserContext, AnnotateContext, ANNOTATE_SET_ACTIVE_REGION } from 'contexts';
import { RegionIcon } from 'modules/region/components/region-icon';

export const RegionInfo = () => {
  const [{ assignment }] = useContext(UserContext);
  const [{ activeRegion }, refineContext] = useContext(AnnotateContext);

  return (
    <>region info goes here</>
  );
};