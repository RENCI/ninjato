export const RegionInfo = ({ region }) => {

  console.log(region);

  return !region ? null : (
    <>
      <div>{ region.label }</div>
      { region.info &&
        <>
          <div>{ region.info.status }</div>
        </>
      }
    </>
  );
};
