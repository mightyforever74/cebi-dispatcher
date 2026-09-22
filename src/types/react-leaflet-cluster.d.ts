declare module "react-leaflet-cluster" {
  import type { ReactNode } from "react";
  import type { DivIcon } from "leaflet";

  export interface MarkerClusterGroupProps {
    children?: ReactNode;
    chunkedLoading?: boolean;
    disableClusteringAtZoom?: number;
    showCoverageOnHover?: boolean;
    spiderfyOnMaxZoom?: boolean;
    maxClusterRadius?: number;
    iconCreateFunction?: (cluster: { getChildCount: () => number }) => DivIcon;
  }

  function MarkerClusterGroup(props: MarkerClusterGroupProps): JSX.Element;
  export default MarkerClusterGroup;
}
