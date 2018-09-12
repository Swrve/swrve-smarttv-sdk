// Samsung Smart TV AVInfo API declarations.
// See: https://developer.samsung.com/tv/develop/api-references/samsung-product-api-references/avinfo-api

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace webapis {
    namespace avinfo {
        namespace AvInfoDigitalCompMode {
            const DOLBY_DIGITAL_COMP_MODE_LINE: 0;
            const DOLBY_DIGITAL_COMP_MODE_RF: 1;
        }

        function getVersion(): string;

        function getDolbyDigitalCompMode(): AvInfoDigitalCompMode;

        function isHdrTvSupport(): boolean;
    }

    type AvInfoDigitalCompMode = typeof avinfo.AvInfoDigitalCompMode.DOLBY_DIGITAL_COMP_MODE_LINE
        | typeof avinfo.AvInfoDigitalCompMode.DOLBY_DIGITAL_COMP_MODE_RF;
}
