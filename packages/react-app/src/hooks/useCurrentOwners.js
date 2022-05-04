export const useCurrentOwners = ({ ownerEvents }) => {
  const events = ownerEvents.sort((a, b) => a.blockNumber - b.blockNumber);
  return Object.keys(
    events.reduce((owners, e) => {
      if (e.added) {
        owners[e.owner] = e;
      } else {
        delete owners[e.owner];
      }
      return owners;
    }, {}),
  );
};
