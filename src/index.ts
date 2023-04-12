import { HazardRateRunService } from "./services/HazardRateRunService";

async function run() {
    try {
        const runService = new HazardRateRunService(
            "dsfdevsql.database.windows.net",
            "cyte-dev-poc",
            "cytesa",
            "glY*3WGiH!$F"
        );
        await runService.calculate("924D3B17-67BE-ED11-A8E0-00224865EF83");
    } catch (error) {
        console.log(error);
    }
}

run();
