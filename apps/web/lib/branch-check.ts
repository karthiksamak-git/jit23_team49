/* Temporary verification: every career branch + structural rules of the 6-question tree */
import { getQuestion, opensCustomText, answerKeyForStep, TOTAL_QUESTIONS, RecordedAnswer } from "./onboarding-questions";

let failures = 0;
function check(cond: boolean, label: string) {
  if (!cond) { failures++; console.log("FAIL:", label); }
  else console.log("ok  :", label);
}

const mk = (answerKey: string, id: string, ids: string[], labels: string[]): RecordedAnswer =>
  ({ answerKey, questionId: id, questionText: id, selectedIds: ids, selectedLabels: labels });

const q1 = getQuestion(0, [], "Karthik");
check(q1.options.length === 3, "Q1 has exactly 3 options");
check(!q1.options.some((o) => /school|other/i.test(o.id) || /high school/i.test(o.label)), "Q1 has no High School / Others");
check(TOTAL_QUESTIONS === 6, "TOTAL_QUESTIONS === 6");

const q2 = getQuestion(1, [mk("educationStage", "education_stage", ["early_college"], ["Early College Student"])], "K");
check(q2.options.map((o) => o.id).join() === "beginner,basic,intermediate,advanced", "Q2 four fixed options");
check(q2.senseiDialogue.join(" ").includes("Early College Student"), "Q2 dialogue reacts to Q1 answer (branch-aware narration)");

const q3 = getQuestion(2, [mk("e","e",["x"],["x"]), mk("experienceLevel","experience_level",["advanced"],["Advanced"])], "K");
check(q3.options.length === 5, "Q3 five objective options");
check(q3.senseiDialogue.join(" ").toLowerCase().includes("depth"), "Q3 dialogue reacts to Q2=Advanced");

const q4 = getQuestion(3, [], "K");
check(q4.options.length === 7, "Q4 has 7 options (6 domains + Others)");
check(!q4.options.some((o) => /network/i.test(o.id)), "Q4 has no separate Networking card");

const objectives: [string, string][] = [
  ["first_job", "job readiness"],
  ["internship", "Internships reward"],
  ["choose_path", "compare paths honestly"],
  ["advance_skills", "prioritise depth"],
  ["build_product", "weight execution"],
];
for (const [objId, phrase] of objectives) {
  const prior = [
    mk("educationStage","e",["graduate"],["Graduate"]),
    mk("experienceLevel","experience_level",["basic"],["Basic Knowledge"]),
    mk("careerObjective","career_objective",[objId],[objId]),
  ];
  const qq = getQuestion(3, prior, "K");
  check(qq.senseiDialogue.join(" ").toLowerCase().includes(phrase.toLowerCase()), `Q4 dialogue reacts to objective=${objId}`);
}

const directions = ["software_dev", "data_ai", "cybersecurity", "cloud_devops", "uiux_frontend", "qa_testing"];
const q5Texts = new Set<string>();
for (const dir of directions) {
  const prior = [
    mk("educationStage","e",["final_year"],["Final-Year Student"]),
    mk("experienceLevel","experience_level",["intermediate"],["Intermediate"]),
    mk("careerObjective","career_objective",["first_job"],["Get My First IT Job"]),
    mk("careerDirection","career_direction",[dir],[dir]),
  ];
  const q5 = getQuestion(4, prior, "K");
  q5Texts.add(JSON.stringify(q5.options.map((o) => o.id)));
  check(q5.options.length === 5, `Q5 for ${dir}: 5 options`);
  check(q5.options.some((o) => o.id === "others"), `Q5 for ${dir}: includes Others`);
  check(q5.inputKind !== "text", `Q5 for ${dir}: card question, not text`);
  check(q5.senseiDialogue.join(" ").includes(dir), `Q5 dialogue names chosen direction ${dir}`);
  const q6 = getQuestion(5, [...prior, mk("careerRefinement","r",["x"],["x"])], "K");
  check(q6.options.map((o) => o.id).join() === "lt_1h,h_1_2,h_2_4,gt_4h", `Q6 for ${dir}: four fixed options`);
  check(!q6.options.some((o) => o.id === "others"), `Q6 for ${dir}: no Others`);
}
check(q5Texts.size === 6, "Q5 option list differs per direction (6 distinct sets)");

// Q4 Others → Q5 becomes the text field
const customPrior = [
  mk("educationStage","e",["graduate"],["Graduate"]),
  mk("experienceLevel","experience_level",["basic"],["Basic Knowledge"]),
  mk("careerObjective","career_objective",["build_product"],["Build My Own Product"]),
  mk("careerDirection","career_direction",["others"],["Others"]),
];
const q5custom = getQuestion(4, customPrior, "K");
check(q5custom.inputKind === "text", "Q4=Others → Q5 is the custom text field");
check(opensCustomText(4, "others") && !opensCustomText(3, "others"), "Others opens text only at step 5 (Q4 Others still advances)");

check(answerKeyForStep(0, ["early_college"], []) === "educationStage", "structured key educationStage");
check(answerKeyForStep(1, ["advanced"], []) === "experienceLevel", "structured key experienceLevel");
check(answerKeyForStep(2, ["first_job"], []) === "careerObjective", "structured key careerObjective");
check(answerKeyForStep(3, ["data_ai"], []) === "careerDirection", "structured key careerDirection");
const nonCustomDir = [...customPrior.slice(0, 3), mk("careerDirection","career_direction",["qa_testing"],["Quality Assurance & Testing"])];
check(answerKeyForStep(4, ["ml_models"], nonCustomDir) === "careerRefinement", "structured key careerRefinement (branch)");
check(answerKeyForStep(4, ["others"], customPrior) === "customCareerDescription", "structured key customCareerDescription (Q4 Others)");
check(answerKeyForStep(4, ["others"], nonCustomDir) === "customCareerDescription", "structured key customCareerDescription (branch Others)");
check(answerKeyForStep(5, ["h_2_4"], []) === "studyAvailability", "structured key studyAvailability");

// Changing Q4 must recalculate Q5 (prior slice respects step boundary)
const stale = [...customPrior, mk("careerRefinement","r",["stale"],["stale"])];
check(getQuestion(4, stale.slice(0, 4), "K").inputKind === "text", "Q5 recomputes from answers before it (stale answers ignored)");

console.log(failures === 0 ? "\nALL BRANCH CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
