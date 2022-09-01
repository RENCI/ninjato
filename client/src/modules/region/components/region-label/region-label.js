export const RegionLabel = ({ region }) => {
  return (
    <b style={{ color: region?.color }}>
      { region?.label }
    </b>
  );
};