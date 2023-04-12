import { Scenario } from "src/interfaces/Scenario";
import { HazardRateRunAbsorbingState } from "./../interfaces/AbsorbingState";
import { CategoryData } from "./../interfaces/CategoryData";
import { HazardRateAgedTransaction } from "./../interfaces/HazardRateAgedTransaction";
import { HazardRateCategoryData } from "./../interfaces/HazardRateCategoryData";
import { HazardRateRun } from "./../interfaces/HazardRateRun";
import { HazardRateRunParameters } from "./../interfaces/HazardRateRunParameters";
import { HazardRateScoreBandItem } from "./../interfaces/HazardRateScoreBandItem";
import { DeepSet } from "./../utils/DeepSet";
import { TermStructureItem } from "src/interfaces/TermStructureItem";
import { WeightedTermStructure } from "src/interfaces/WeightedTermStructure";
import { HazardRateScenarioCohortMigrationList } from "src/interfaces/HazardRateScenarioCohortMigrationList";
import { HazardRateScenarioHazardMigrationList } from "src/interfaces/HazardRateScenarioHazardMigrationList";

const sql = require("mssql");
export class HazardRateRunDbService {
    private config: any;
    private connectionPool: any;

    constructor(server: string, database: string, username: string, passowrd: string) {
        this.config = {
            user: username,
            password: passowrd,
            server: server,
            database: database,
            connectionTimeout: 300000,
            requestTimeout: 300000,
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 300000,
            },
            options: {
                encrypt: true,
                trustServerCertificate: true,
            },
        };
    }

    async initializeConnectionPool() {
        try {
            this.connectionPool = await sql.connect(this.config);
            console.log(new Date() + " Global Connection Pool Created Successfully");
        } catch (err) {
            console.error("Error Creating Global Connection Pool:", err);
        }
    }

    closeConnectionPool() {
        this.connectionPool.close();
    }

    async updateHazardRateRunStatus(runId: string, status: string): Promise<void> {
        try {
            await this.connectionPool
                .request()
                .input("runId", sql.NVarChar, runId)
                .input("status", sql.NVarChar, status).query(`
            UPDATE [dbo].[hazard_rate_run]
            SET [status] = @status
            WHERE [id] = @runId`);
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async fetchHazardRateRun(id: string): Promise<HazardRateRun> {
        try {
            const result = await this.connectionPool.request().input("id", sql.NVarChar, id).query(`
            SELECT [id]
                ,[title]
                ,[runDate]
                ,[contactEmail]
                ,[description]
                ,[userId]
                ,[organisationId]
                ,[status]
            FROM [dbo].[hazard_rate_run]
            WHERE [id] = @id`);
            const run: HazardRateRun = result.recordset[0];

            return run;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async fetchHazardRateRunParameters(runId: string): Promise<HazardRateRunParameters> {
        try {
            const result = await this.connectionPool.request().input("runId", sql.NVarChar, runId).query(`
            SELECT [id]
                  ,[category1]
                  ,[category2]
                  ,[category3]
                  ,[lgdRunDate]
                  ,[lgdMinDate]
                  ,[lgdMaxDate]
                  ,[lgdInterestRate]
                  ,[hazardPDRunDate]
                  ,[hazardPDMinDate]
                  ,[hazardPDMaxDate]
                  ,[cohortPDRunDate]
                  ,[cohortPDMinDate]
                  ,[cohortPDMaxDate]
                  ,[cohortPDOutcomePeriod]
                  ,[hazardRateRunId]
                  ,[lgdApproach]
                  ,[eadCalculationApproach]
            FROM [dbo].[hazard_rate_run_parameters]
            WHERE [hazardRateRunId] = @runId`);
            const params: HazardRateRunParameters = result.recordset[0];

            return params;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async fetchHazardRateScoreBandItems(runId: string): Promise<HazardRateScoreBandItem[]> {
        try {
            const result = await this.connectionPool.request().input("runId", sql.NVarChar, runId).query(`
            SELECT [id]
                  ,[type]
                  ,[value]
                  ,[hazardRateRunId]
                  ,[position]
            FROM [dbo].[hazard_rate_score_band_item]
            WHERE [hazardRateRunId] = @runId`);
            const params: HazardRateScoreBandItem[] = result.recordset;

            return params;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async fetchCategoryData(runId: string): Promise<CategoryData[]> {
        try {
            const result = await this.connectionPool.request().input("runId", sql.NVarChar, runId).query(`
            SELECT DISTINCT [category1]
                  ,[category2]
                  ,[category3]
            FROM [dbo].[hazard_rate_aged_transaction]
            WHERE [hazardRateRunId] = @runId`);
            const data: CategoryData[] = result.recordset;

            return data;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async fetchHarzardCategoryData(runId: string): Promise<HazardRateCategoryData> {
        const response = await this.fetchCategoryData(runId);
        const category1set: Set<string> = new DeepSet();
        const category2set: Set<{ parent: string; value: string }> = new DeepSet();
        const category3set: Set<{ parent: string; value: string }> = new DeepSet();

        for (const { category1, category2, category3 } of response) {
            category1set.add(category1);
            if (category2) {
                category2set.add({ parent: category1, value: category2 });
                if (category3) category3set.add({ parent: category2, value: category3 });
            }
        }

        const categories: HazardRateCategoryData = {
            category1: [...category1set],
            category2: [...category2set],
            category3: [...category3set],
        };

        return categories;
    }

    async fetchAbsorbingStates(runId: string): Promise<HazardRateRunAbsorbingState> {
        try {
            const result = await this.connectionPool.request().input("runId", sql.NVarChar, runId).query(`
            SELECT [id]
                  ,[daysAbsorbingState]
                  ,[statusAbsorbingState]
                  ,[internalScoreAbsorbingState]
                  ,[hazardRateRunId]
            FROM [dbo].[hazard_rate_run_absorbing_states]
            WHERE [hazardRateRunId] = @runId`);
            const state: HazardRateRunAbsorbingState = result.recordset[0];

            return state;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async fetchHazardRateAgedTransaction(
        runId: string,
        runParams: HazardRateRunParameters
    ): Promise<HazardRateAgedTransaction[]> {
        try {
            const minDate: Date = new Date(
                Math.min(new Date(runParams.hazardPDMinDate).getTime(), new Date(runParams.lgdMinDate).getTime())
            );
            const maxDate: Date = new Date(
                Math.max(new Date(runParams.hazardPDMaxDate).getTime(), new Date(runParams.lgdMaxDate).getTime())
            );

            const result = await this.connectionPool
                .request()
                .input("runId", sql.NVarChar, runId)
                .input("minDate", sql.DateTime, minDate)
                .input("maxDate", sql.DateTime, maxDate).query(`
                SELECT [id]
                      ,[transactionNumber]
                      ,[type]
                      ,[date]
                      ,[amount]
                      ,[balance]
                      ,[ageing]
                      ,[status]
                      ,[score]
                      ,[limit]
                FROM [dbo].[hazard_rate_aged_transaction]
                WHERE [hazardRateRunId] = @runId
                AND [date] BETWEEN @minDate AND @maxDate`);
            const transaction: HazardRateAgedTransaction[] = result.recordset;

            return transaction;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async deleteOldHazardRateRunResults(runId: string): Promise<void> {
        try {
            await this.connectionPool
                .request()
                .input("runId", sql.UniqueIdentifier, runId)
                .execute("[dbo].[DeleteOldHazardRateRunResults]");
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async createHazardRateRunScenario(scenario: Scenario): Promise<Scenario> {
        try {
            const result = await this.connectionPool.request().query(`
            INSERT INTO [dbo].[hazard_rate_scenario] (
              [scoringType]
              ,[category1]
              ,[category2]
              ,[category3]
              ,[lgdApproach]
              ,[error]
              ,[hazardRateRunId])
            OUTPUT INSERTED.* VALUES (
              '${scenario.scoringType}',
              '${scenario.category1 ? scenario.category1 : null}',
              '${scenario.category2 ? scenario.category2 : null}',
              '${scenario.category3 ? scenario.category3 : null}',
               ${scenario.lgdApproach},
              '${scenario.error}',
              '${scenario.hazardRateRunId}'
            )`);
            const res: Scenario = result.recordset[0];

            return res;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async fetchScenarioById(scenarioId: string): Promise<Scenario> {
        try {
            const result = await this.connectionPool.request().input("scenarioId", sql.NVarChar, scenarioId).query(`
            SELECT [id]
                  ,[scoringType]
                  ,[category1]
                  ,[category2]
                  ,[category3]
                  ,[lgdApproach]
                  ,[error]
                  ,[hazardRateRunId]
            FROM [dbo].[hazard_rate_scenario]
            WHERE [id] = @scenarioId`);
            const scenario: Scenario = result.recordset[0];

            return scenario;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async bulkInsertTermStructures(termStructures: TermStructureItem[], scenarioId: string): Promise<void> {
        if (termStructures.length === 0) return;
        try {
            const table = new sql.Table("[dbo].[hazard_rate_scenario_term_structure]");

            table.columns.add("term", sql.Int, { nullable: false });
            table.columns.add("value", sql.Float, { nullable: false });
            table.columns.add("hazardRateScenarioId", sql.UniqueIdentifier, { nullable: true });

            for (const structure of termStructures) table.rows.add(structure.term, structure.value, scenarioId);

            await this.connectionPool.request().bulk(table, (err: any, results: any) => {
                if (err) {
                    console.error(err);
                    return;
                }
            });
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async bulkInsertWeightedTermStructures(
        weightedTermStructures: WeightedTermStructure[],
        scenarioId: string
    ): Promise<void> {
        if (weightedTermStructures.length === 0) return;
        try {
            const table = new sql.Table("[dbo].[hazard_rate_scenario_weighted_term_structure]");

            table.columns.add("term", sql.Int, { nullable: false });
            table.columns.add("value", sql.Float, { nullable: false });
            table.columns.add("hazardRateScenarioId", sql.UniqueIdentifier, { nullable: true });

            for (const structure of weightedTermStructures) table.rows.add(structure.term, structure.value, scenarioId);

            await this.connectionPool.request().bulk(table, (err: any, results: any) => {
                if (err) {
                    console.error(err);
                    return;
                }
            });
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async insertCohortMigrationListItem(
        item: HazardRateScenarioCohortMigrationList,
        scenarioId: string
    ): Promise<void> {
        try {
            await this.connectionPool
                .request()
                .input("scenarioId", sql.UniqueIdentifier, scenarioId)
                .input("index", sql.Int, item.index)
                .input("values", sql.NVarChar, item.value.map((i) => i.value).join(";"))
                .execute("[dbo].[AddHazardRateScenarioCohortMigrationListItem]");
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    async insertHazardMigrationListItem(
        item: HazardRateScenarioHazardMigrationList,
        scenarioId: string
    ): Promise<void> {
        try {
            await this.connectionPool
                .request()
                .input("scenarioId", sql.UniqueIdentifier, scenarioId)
                .input("index", sql.Int, item.index)
                .input("values", sql.NVarChar, item.value.map((i) => i.value).join(";"))
                .execute("[dbo].[AddHazardRateScenarioHazardMigrationListItem]");
        } catch (err) {
            console.error(err);
            throw err;
        }
    }
}
