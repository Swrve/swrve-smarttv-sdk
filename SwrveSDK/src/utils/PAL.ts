import Base from "./platforms/base";
import Tizen from "./platforms/tizen";
import WebOS from "./platforms/webos";
import {IPlatform} from "./platforms/IPlatform";

export default class PAL {
    private static platform: IPlatform;

    /**
     * determine the platform and returns Platform object
     * @param {string} [explicitPlatform] - force platform name
     */
    public static getPlatform(explicitPlatform?: string): IPlatform {
        if (PAL.platform !== undefined) {
            return PAL.platform;
        }

        const agent = (navigator !== undefined && navigator !== null) ? navigator.userAgent : "Base";
        if (
            agent.search(/Tizen/) > -1 ||
            (explicitPlatform !== undefined
            && explicitPlatform !== null
            && explicitPlatform.toLowerCase() === "samsung-tizen")
        ) {
            PAL.platform =  new Tizen();
        } else if (
            agent.search(/web0s/i) > -1 ||
            (explicitPlatform !== undefined
            && explicitPlatform !== null
            && explicitPlatform.toLowerCase() === "webos")
        ) {
            PAL.platform = new WebOS();
        } else {
            PAL.platform = new Base();
        }

        return PAL.platform;
    }
}

export {default as Navigation} from "./platforms/navigation";
