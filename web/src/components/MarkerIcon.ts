import L from 'leaflet';

// Import local marker icons
import pendingIcon from '../assets/markers/pending.svg';
import approvedIcon from '../assets/markers/approved.svg';
import rejectedIcon from '../assets/markers/rejected.svg';
import defaultMarkerIcon from '../assets/markers/pending.svg';

// Import shadow image
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Custom marker icon for water samples
export const defaultIcon = L.icon({
  iconUrl: defaultMarkerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Icon for different statuses
export const statusIcons = {
  pending: L.icon({
    iconUrl: pendingIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  approved: L.icon({
    iconUrl: approvedIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  rejected: L.icon({
    iconUrl: rejectedIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
};

export function getStatusIcon(status: string) {
  return statusIcons[status as keyof typeof statusIcons] || defaultIcon;
}