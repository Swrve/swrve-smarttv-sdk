// Samsung Smart TV Base API declarations.
// See: https://developer.samsung.com/tv/develop/api-references/samsung-product-api-references/webapi-api

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace webapis {
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
