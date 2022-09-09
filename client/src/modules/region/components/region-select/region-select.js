import { useContext } from 'react';
import { Select } from 'semantic-ui-react';
import { 
  UserContext, SET_ACTIVE_REGION,
  AnnotateContext 
} from 'contexts';
import { RegionIcon } from 'modules/region/components/region-icon';

export const RegionSelect = () => {
  const [{ assignment, activeRegion }] = useContext(UserContext);
  const [, refineContext] = useContext(AnnotateContext);

  const onChange = (evt, { value }) => {
    refineContext({ 
      type: SET_ACTIVE_REGION, 
      region: assignment.regions.find(({ label }) => label === value )
    });
  }

  return (
    <Select 
      placeholder='—'      
      value={ activeRegion?.label }      
      basic
      compact
      disabled={ !activeRegion }
      onChange={ onChange }
      options={ assignment.regions.map(region => (
        { 
          key: region.label,
          value: region.label,
          text: <RegionIcon region={ region } />
        }
      ))}
    />
  );
};