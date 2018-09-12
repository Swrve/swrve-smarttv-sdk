// Samsung Smart TV Network API declarations.
// See: https://developer.samsung.com/tv/develop/api-references/samsung-product-api-references/network-api/

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace webapis {
    namespace network {
        namespace NetworkActiveConnectionType {
            const DISCONNECTED: 0;
            const WIFI: 1;
            const CELLULAR: 2;
            const ETHERNET: 3;
        }

        namespace NetworkState {
            const LAN_CABLE_ATTACHED: 1;
            const LAN_CABLE_DETACHED: 2;
            const LAN_CABLE_STATE_UNKNOWN: 3;
            const GATEWAY_CONNECTED: 4;
            const GATEWAY_DISCONNECTED: 5;
            const WIFI_MODULE_STATE_ATTACHED: 6;
            const WIFI_MODULE_STATE_DETACHED: 7;
            const WIFI_MODULE_STATE_UNKNOWN: 8;
        }

        function addNetworkStateChangeListener(callback: NetworkStateChangedCallback): number;
        function removeNetworkStateChangeListener(listenerId: number): void;
        function getActiveConnectionType(): NetworkActiveConnectionType;
    }

    type NetworkStateChangedCallback = (state: NetworkState) => void;

    type NetworkActiveConnectionType =
        | typeof network.NetworkActiveConnectionType.DISCONNECTED
        | typeof network.NetworkActiveConnectionType.WIFI
        | typeof network.NetworkActiveConnectionType.CELLULAR
        | typeof network.NetworkActiveConnectionType.ETHERNET;

    type NetworkState =
        | typeof network.NetworkState.LAN_CABLE_ATTACHED
        | typeof network.NetworkState.LAN_CABLE_DETACHED
        | typeof network.NetworkState.LAN_CABLE_STATE_UNKNOWN
        | typeof network.NetworkState.GATEWAY_CONNECTED
        | typeof network.NetworkState.GATEWAY_DISCONNECTED
        | typeof network.NetworkState.WIFI_MODULE_STATE_ATTACHED
        | typeof network.NetworkState.WIFI_MODULE_STATE_DETACHED
        | typeof network.NetworkState.WIFI_MODULE_STATE_UNKNOWN;
}
