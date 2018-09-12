declare module "worker-loader\?*" {
    class WebpackWorker extends Worker {
        constructor();
    }

    export = WebpackWorker;
}

declare module "*/package.json" {
    const version: string;
 }
