// Tizen Base API declarations.
// See: https://developer.tizen.org/dev-guide/4.0.0/org.tizen.web.apireference/html/device_api/tv/tizen/tizen.html

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace tizen {
    type FilterMatchFlag = "EXACTLY" | "FULLSTRING" | "CONTAINS" | "STARTSWITH" | "ENDSWITH" | "EXISTS";

    type SortModeOrder = "ASC" | "DESC";

    type CompositeFilterType = "UNION" | "INTERSECTION";

    type AbstractFilter = AttributeFilter | AttributeRangeFilter | CompositeFilter;

    class AttributeFilter {
        public attributeName: string;
        public readonly matchFlag: FilterMatchFlag;
        public matchValue: any;

        constructor(attributeName: string, matchFlag?: FilterMatchFlag | null, matchValue?: any);
    }

    class AttributeRangeFilter {
        public attributeName: string;
        public initialValue: any;
        public endValue: any;

        constructor(attributeName: string, initialValue?: any, endValue?: any);
    }

    class CompositeFilter {
        public type: CompositeFilterType;
        public filters: AbstractFilter[];

        constructor(type: CompositeFilterType, filters?: AbstractFilter[] | null);
    }

    class SortMode {
        public attributeName: string;
        public readonly order: SortModeOrder;

        constructor(attributeName: string, order?: SortModeOrder | null);
    }

    class SimpleCoordinates {
        public readonly latitude: number;
        public readonly longitude: number;

        constructor(latitude: number, longitude: number);
    }

    interface WebAPIException {
        readonly code: number;
        readonly name: string;
        readonly message: string;
    }

    interface WebAPIError {
        readonly code: number;
        readonly name: string;
        readonly message: string;
    }

    type SuccessCallback = () => void;

    type ErrorCallback = (error: WebAPIError) => void;
}
