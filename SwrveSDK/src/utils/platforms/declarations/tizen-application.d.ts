// Tizen Application API declarations.
// See: https://developer.tizen.org/dev-guide/4.0.0/org.tizen.web.apireference/html/device_api/tv/tizen/application.html

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace tizen {
    type ApplicationId = string;

    type ApplicationContextId = string;

    type UserEventData = any;

    type EventData = SystemEventData | UserEventData;

    type ApplicationControlLaunchMode = "SINGLE" | "GROUP";

    type ApplicationUsageMode = "RECENTLY" | "FREQUENTLY";

    namespace application {
        function getCurrentApplication(): Application;

        function kill(contextId: ApplicationContextId, successCallback?: SuccessCallback | null,
                      errorCallback?: ErrorCallback | null): void;

        function launch(id: ApplicationId, successCallback?: SuccessCallback | null,
                        errorCallback?: ErrorCallback | null): void;

        function launchAppControl(appControl: ApplicationControl, id?: ApplicationId | null,
                                  successCallback?: SuccessCallback | null, errorCallback?: ErrorCallback | null,
                                  replyCallback?: ApplicationControlDataArrayReplyCallback | null): void;

        function findAppControl(appControl: ApplicationControl,
                                successCallback: FindAppControlSuccessCallback,
                                errorCallback?: ErrorCallback | null): void;

        function getAppsContext(successCallback: ApplicationContextArraySuccessCallback,
                                errorCallback?: ErrorCallback | null): void;

        function getAppContext(contextId?: ApplicationContextId): ApplicationContext;

        function getAppsInfo(successCallback: ApplicationInformationArraySuccessCallback, errorCallback?: ErrorCallback | null): void;

        function getAppInfo(id?: ApplicationId | null): ApplicationInformation;

        function getAppCerts(id?: ApplicationId | null): ApplicationCertificate[];

        function getAppSharedURI(id?: ApplicationId | null): string;

        function getAppMetadata(id?: ApplicationId | null): ApplicationMetaData[];

        function getBatteryUsageInfo(successCallback: BatteryUsageInfoArraySuccessCallback,
                                     errorCallback?: ErrorCallback | null,
                                     days?: number | null, limit?: number | null): void;

        function getAppsUsageInfo(successCallback: AppsUsageInfoArraySuccessCallback,
                                  errorCallback?: ErrorCallback | null,
                                  mode?: ApplicationUsageMode | null,
                                  filter?: ApplicationUsageFilter | null,
                                  limit?: number | null): void;

        function addAppStatusChangeListener(eventCallback: StatusEventCallback, appId?: ApplicationId | null): number;

        function removeAppStatusChangeListener(watchId: number): void;
    }

    interface ApplicationUsageFilter {
        timeSpan?: number | null;
        startTime?: Date | null;
        endTime?: Date | null;
    }

    interface Application {
        readonly appInfo: ApplicationInformation;
        readonly contextId: ApplicationContextId;

        exit(): void;

        hide(): void;

        getRequestedAppControl(): RequestedApplicationControl;

        addEventListener(event: EventInfo, callback: EventCallback): number;

        removeEventListener(watchId: number): void;

        broadcastEvent(event: EventInfo, data: UserEventData): void;

        broadcastTrustedEvent(event: EventInfo, data: UserEventData): void;
    }

    interface ApplicationInformation {
        readonly id: ApplicationId;
        readonly name: string;
        readonly iconPath: string;
        readonly version: string;
        readonly show: boolean;
        readonly categories: ReadonlyArray<string>;
        readonly installDate: Date;
        readonly size: number;
        readonly packageId: string; // PackageId
    }

    interface ApplicationContext {
        readonly id: ApplicationContextId;
        readonly appId: ApplicationId;
    }

    interface ApplicationBatteryUsage {
        readonly appId: ApplicationId;
        readonly batteryUsage: number;
    }

    interface ApplicationUsage {
        readonly appId: ApplicationId;
        readonly totalCount: number;
        readonly totalDuration: number;
        readonly lastTime: Date;
    }

    class ApplicationControlData {
        public readonly key: string;
        public readonly value: ReadonlyArray<string>;

        constructor(key: string,
                    value: ReadonlyArray<string>);
    }

    class ApplicationControl {
        public operation: string;
        public uri: string | null;
        public mime: string | null;
        public category: string | null;
        public data: ApplicationControlData[];
        public launchMode?: ApplicationControlLaunchMode;

        constructor(operation: string,
                    uri?: string | null,
                    mime?: string | null,
                    category?: string | null,
                    data?: ApplicationControlData[] | null,
                    launchMode?: ApplicationControlLaunchMode | null);
    }

    interface RequestedApplicationControl {
        readonly appControl: ApplicationControl;
        readonly callerAppId: ApplicationId;

        replyResult(data?: ApplicationControlData[]): void;

        replyFailure(): void;
    }

    interface ApplicationCertificate {
        readonly type: string;
        readonly value: string;
    }

    interface ApplicationMetaData {
        readonly key: string;
        readonly value: string;
    }

    type BatteryUsageInfoArraySuccessCallback = (batteryInfoArray: ReadonlyArray<ApplicationBatteryUsage>) => void;

    type AppsUsageInfoArraySuccessCallback = (appsInfoArray: ReadonlyArray<ApplicationUsage>) => void;

    type ApplicationInformationArraySuccessCallback = (informationArray: ReadonlyArray<ApplicationInformation>) => void;

    type FindAppControlSuccessCallback = (informationArray: ReadonlyArray<ApplicationInformation>, appControl: ApplicationControl) => void;

    type ApplicationContextArraySuccessCallback = (contexts: ReadonlyArray<ApplicationContext>) => void;

    type ApplicationControlDataArrayReplyCallback = (data?: ReadonlyArray<ApplicationControlData>) => void;

    interface SystemEventData {
        value: string;
        type: string;
    }

    type EventCallback = (event: EventInfo, data: EventData) => void;

    type StatusEventCallback = (appId: ApplicationId, isActive: boolean) => void;

    interface EventInfo {
        appId?: ApplicationId;
        name?: string;
    }
}
