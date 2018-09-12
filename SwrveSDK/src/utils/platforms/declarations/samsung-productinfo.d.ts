// Samsung Smart TV Product Info API declarations.
// See: https://developer.samsung.com/tv/develop/api-references/samsung-product-api-references/productinfo-api

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace webapis {
    namespace productinfo {
        namespace ProductInfoConfigKey {
            const CONFIG_KEY_DATA_SERVICE: 0;
            const CONFIG_KEY_SERVICE_COUNTRY: 1;
        }

        namespace ProductInfoNoGlass3dSupport {
            const NO_GLASS_3D_NOT_SUPPORTED: 0;
            const NO_GLASS_3D_SUPPORTED: 1;
        }

        namespace ProductInfoSiServerType {
            const SI_TYPE_OPERATIING_SERVER: 0; // [sic]
            const SI_TYPE_DEVELOPMENT_SERVER: 1;
            const SI_TYPE_DEVELOPING_SERVER: 2;
        }

        function getVersion(): string;

        function getFirmware(): string;

        function getDuid(): string;

        function getModelCode(): string;

        function getModel(): string;

        function getSmartTVServerType(): ProductInfoSiServerType;

        function getSmartTVServerVersion(): string;

        function getTunerEpop(): string;

        function isSoccerModeEnabled(): boolean;

        function isTtvSupported(): boolean;

        function isUdPanelSupported(): boolean;

        function getRealModel(): string;

        function getNoGlass3dSupport(): ProductInfoNoGlass3dSupport;

        function getLocalSet(): string;

        function getSystemConfig(key: ProductInfoConfigKey): string;

        function setSystemConfig(key: ProductInfoConfigKey, value: string,
                                 onsuccess?: SuccessCallback | null,
                                 onerror?: ErrorCallback | null): void;

        function addSystemConfigChangeListener(key: ProductInfoConfigKey, listener: ProductInfoConfigChangeCallback): number;

        function removeSystemConfigChangeListener(listenerId: number): void;

        function isUHDAModel(): boolean;
    }

    type ProductInfoConfigChangeCallback = (key: ProductInfoConfigKey) => void;

    type ProductInfoConfigKey = typeof productinfo.ProductInfoConfigKey.CONFIG_KEY_DATA_SERVICE
        | typeof productinfo.ProductInfoConfigKey.CONFIG_KEY_SERVICE_COUNTRY;

    type ProductInfoNoGlass3dSupport = typeof productinfo.ProductInfoNoGlass3dSupport.NO_GLASS_3D_NOT_SUPPORTED
        | typeof productinfo.ProductInfoNoGlass3dSupport.NO_GLASS_3D_SUPPORTED;

    type ProductInfoSiServerType = typeof productinfo.ProductInfoSiServerType.SI_TYPE_OPERATIING_SERVER
        | typeof productinfo.ProductInfoSiServerType.SI_TYPE_DEVELOPMENT_SERVER
        | typeof productinfo.ProductInfoSiServerType.SI_TYPE_DEVELOPING_SERVER;
}
