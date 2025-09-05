import { registerDetectProject } from "./detectProject.js";
import { registerListComponents } from "./listComponents.js";
import { registerGenerateSwaggerDocs } from "./generateSwaggerDocs.js";
import { registerAddPHPXUIComponent } from "./addPHPXUIComponent.js";
import { registerGetConfig } from "./getConfig.js";
import { registerDescribeConfig } from "./describeConfig.js";
import { registerUpdateFilterFiles } from "./updateFilterFiles.js";
import { registerUpdateProject } from "./updateProject.js";
import { registerPrismaGenerate } from "./prismaGenerate.js";
import { registerRunNpmScript } from "./runNpmScript.js";
import { registerListRoutes } from "./listRoutes.js";
import { registerAddPPIconComponent } from "./addPPIconComponent.js";
import { registerPrismaPrepare } from "./prismaPrepare.js";
import { registerCrudReadGuide } from "./crudReadGuide.js";
import { registerCrudDeleteGuide } from "./crudDeleteGuide.js";
import { registerCrudCreateGuide } from "./crudCreateGuide.js";
import { registerCrudUpdateGuide } from "./crudUpdateGuide.js";
import { registerScaffoldDashboard } from "./scaffoldDashboard.js";
export function registerTools(server, ctx) {
    registerAddPHPXUIComponent(server, ctx);
    registerAddPPIconComponent(server, ctx);
    registerCrudCreateGuide(server, ctx);
    registerCrudDeleteGuide(server, ctx);
    registerCrudReadGuide(server, ctx);
    registerCrudUpdateGuide(server, ctx);
    registerDescribeConfig(server, ctx);
    registerDetectProject(server, ctx);
    registerGenerateSwaggerDocs(server, ctx);
    registerGetConfig(server, ctx);
    registerListRoutes(server, ctx);
    registerListComponents(server, ctx);
    registerPrismaGenerate(server, ctx);
    registerPrismaPrepare(server, ctx);
    registerRunNpmScript(server, ctx);
    registerScaffoldDashboard(server, ctx);
    registerUpdateFilterFiles(server, ctx);
    registerUpdateProject(server, ctx);
}
//# sourceMappingURL=index.js.map