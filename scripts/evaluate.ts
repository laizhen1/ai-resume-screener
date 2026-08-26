import { runEvaluation } from "../lib/evaluation";

console.log(JSON.stringify(runEvaluation(Number(process.argv[2] ?? 120)), null, 2));
