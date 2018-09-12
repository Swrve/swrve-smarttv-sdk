// Tizen TVAudioControl API declarations.
// See: https://developer.samsung.com/tv/develop/api-references/tizen-web-device-api-references/tvaudiocontrol-api

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace tizen {
    namespace tvaudiocontrol {
        function setMute(mute: boolean): void;

        function isMute(): boolean;

        function setVolume(volume: number): void;

        function setVolumeUp(): void;

        function setVolumeDown(): void;

        function getVolume(): number;

        function setVolumeChangeListener(callback: VolumeChangeCallback): void;

        function unsetVolumeChangeListener(): void;

        function getOutputMode(): AudioOutputMode;

        function playSound(type: AudioBeepType): void;
    }

    type AudioOutputMode = "PCM" | "DOLBY" | "DTS" | "AAC";

    type AudioBeepType =
        | "UP"
        | "DOWN"
        | "LEFT"
        | "RIGHT"
        | "PAGE_LEFT"
        | "PAGE_RIGHT"
        | "BACK"
        | "SELECT"
        | "CANCEL"
        | "WARNING"
        | "KEYPAD"
        | "KEYPAD_ENTER"
        | "KEYPAD_DEL"
        | "MOVE"
        | "PREPARING";

    type VolumeChangeCallback = (volume: number) => void;
}
