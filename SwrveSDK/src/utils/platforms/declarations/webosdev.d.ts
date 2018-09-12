// https://webostv.developer.lge.com/api/webostvjs/webosdev/

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace webOSDev {
    interface WebOSLaunchEvent {
        detail: any;
    }

    interface WebOSErrorResponse {
        errorCode: string;
        errorText: string;
    }

    interface WebOSLaunchParameters {
        id: string;
        params?: object;
        onSuccess: () => void;
        onFailure: (error: WebOSErrorResponse) => void;
    }

    interface WebOSConnectionStatusResponse {
        isInternetConnectionAvailable: boolean;
    }

    interface WebOSConnectionParameters {
        onSuccess: (response: WebOSConnectionStatusResponse) => void;
        onFailure: (error: WebOSErrorResponse) => void;
        subscribe?: boolean;
    }

    interface WebOSSubscriptionHandle {
        cancel: () => void;
    }

    const APP: {
        BROWSER: string,
    };

    function launch(parameters: WebOSLaunchParameters): void;

    namespace connection {
        function getStatus(parameters: WebOSConnectionParameters): WebOSSubscriptionHandle;
    }
}
