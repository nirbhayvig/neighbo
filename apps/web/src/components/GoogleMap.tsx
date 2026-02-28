import { APIProvider, Map } from '@vis.gl/react-google-maps';

export default function GoogleMap() {
  return (
    <APIProvider apiKey={""}>
      <Map
        initialViewState={{
          latitude: 44,
          longitude: 93,
          zoom: 12,
        }}
        style={{ width: '100%', height: '400px' }}
      />
    </APIProvider>
  );
}
