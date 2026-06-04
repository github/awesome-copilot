---
name: credit-risk-model
description: End-to-end credit risk modeling workflow for application, behavior, collection, and anti-fraud risk models. Use when building, validating, comparing, or documenting scorecards, logistic regression, LightGBM, XGBoost/CatBoost/random forest, or other machine-learning credit models; when computing IV/WOE, KS, AUC, PSI, lift, score bands, OOT validation, feature importance, scorecard points, reject/approval strategies, or model development validation reports.
---

# Credit Risk Model

## Modeling Intake

Hard gate: the first response after this skill is triggered must clarify the modeling request before any modeling, feature selection, tuning, or report generation. Do not skip this intake because the user gave a broad modeling task. Start with a concise question block covering every item below; if the user already specified an item, restate it as a confirmation and ask only for correction. Do not train or finalize assumptions until the user answers, unless the user explicitly says to proceed with defaults after seeing the intake block.

1. Modeling goal:
   - Reject or rank bad customers / high-risk applicants.
   - Select good customers / high-quality applicants.
   - Price risk, set credit line, collection priority, fraud review, or another objective.
   - Define the model output: probability, score, grade, cutoff, ranking, or policy strategy.
2. Model family:
   - Scorecard / WOE logistic regression.
   - LightGBM.
   - XGBoost.
   - Linear/logistic regression without scorecard.
   - CatBoost, random forest, neural network, survival/vintage model, or another model.
   - Multiple models for champion/challenger comparison.
3. Y value:
   - If the user gives a clear target, use it.
   - If not, suggest choices based on business goal, available labels, vintage, overdue roll rate, MOB window, and reject/exclusion logic.
   - Confirm target value direction: `1 = bad/risk event` unless the user says otherwise.
4. Sample split:
   - If a usable time/observation field exists, OOT defaults to the nearest/latest complete period, monthly when possible.
   - Validation can be a nearby period or a stratified random split from non-OOT data.
   - If no usable time field exists, default to a stratified random split of training `75%`, validation `15%`, and OOT/holdout proxy `10%`.
   - Confirm whether training excludes validation and OOT/holdout.
   - If an institution/channel field exists, ask whether an institution/channel OOS sample is needed in addition to time OOT.
5. Parameter tuning:
   - Ask whether to run a default baseline only, light tuning, or deeper hyperparameter search.
   - For scorecards, default to at most 15 model features, at most 7 bins per feature, `base_score = 600`, `odds = 0.05`, `pdo = 60`.
   - For LightGBM/XGBoost, use common starting hyperparameters and tune only after the first-pass diagnostic.
6. Derived features:
   - Ask whether to add derived features.
   - If yes, ask whether WOE combinations and decision-tree combination features are acceptable, or whether only raw deployable formulas are allowed.
7. Report and constraints:
   - Ask whether the user has a report template. If yes, match it; if no, use the default credit-risk validation report.
   - Ask only if ambiguous: final report language should follow the user's language. Chinese user requests get Chinese reports and sheet names; English user requests get English reports and sheet names.
   - For scorecard models, confirm that the model validation report should use the exact scorecard model development validation report template format unless the user explicitly requests another template.
   - Ask for any mandatory variables, forbidden variables, policy constraints, monotonicity constraints, score bands, approval-rate targets, or deployment limitations.
8. Post-modeling strategy:
   - After model validation is complete, ask whether the user needs strategy suggestions, cutoff tables, or policy rules.
   - If yes, produce strategy candidates from score bands, model risk ranking, and high-lift derived-feature rules.

## Core Workflow

1. Complete the mandatory modeling intake and document the chosen assumptions. If the first user request is underspecified, ask the intake questions first; do not jump directly into code, data exploration, or model training.
2. Define the target and observation point explicitly: application date, performance window, bad definition, exclusions, sample source, and deduplication key. Never infer a target from column names without checking the available data dictionary, labels, or user instructions.
3. If the user provides a prior model report, scorecard sheet, development-flow diagram, or report template, use it as reference for naming, score bands, and report format. For scorecard model validation reports, the scorecard model development validation report template is the default required format when available; match it exactly. If not provided, use the default credit-risk development workflow and report structure for non-scorecard reports or draft scorecard outputs only.
4. Split samples before feature selection:
   - Use the user-specified OOT month or time window exactly.
   - If the user does not specify OOT and a usable time field exists, use the nearest/latest complete period as OOT.
   - If no usable time field exists, create a stratified random split of training `75%`, validation `15%`, and OOT/holdout proxy `10%`.
   - Draw validation from the remaining non-OOT sample, stratified by target when random validation is requested.
   - Fit bins, encoders, scalers, feature selection, and model parameters on training only.
   - Keep OOT untouched for final validation, not model choice.
5. Build a baseline that matches the selected model family. If the user says “based on the original scorecard,” parse the original scorecard variables and refit or score them as a locked baseline before adding features.
6. Train the first model version with conservative/default parameters, then diagnose whether it is overfitting, underfitting, unstable over time, poorly calibrated, missing signal, or constrained by data quality.
7. Optimize based on the diagnosis. Compare every accepted change against the baseline and current model using validation KS first, then OOT stability, AUC, PSI, coefficient direction, correlation/VIF, calibration, and deployability.
8. If performance is unusually strong, investigate data leakage before optimizing or finalizing.
9. Generate a final report in the same structure as the prior report when one exists. Report both model development and validation, not just a notebook-style metric dump.
10. Ask whether a strategy layer is needed after model validation. Do not assume the model report alone is the final business deliverable.

## Output Language

- Match the user's language in final documents, workbooks, sheet names, chart labels, and narrative summaries unless they explicitly request another language.
- If the user writes in Chinese, produce Chinese report text and Chinese sheet names. If the user writes in English, produce English report text and English sheet names.
- Keep technical identifiers such as raw variable names, file names, SQL expressions, model names, and metric abbreviations unchanged when translating them would reduce traceability.

## Data And Split Discipline

- Treat time leakage as the main failure mode. Any feature computed after the application/observation point must be excluded or shifted.
- For monthly OOT, default to the nearest/latest available complete month unless the user specifies another time window. Use exact calendar months such as `2025-09`, not relative labels, in outputs.
- If no usable time field exists, use a stratified random `75% / 15% / 10%` train/validation/OOT split. Label the final 10% as an OOT/holdout proxy in reports so reviewers understand it is not a true time-out sample.
- Validation can be either a nearby month/time window or a stratified random sample from the non-OOT data. Prefer the user’s requested validation mode; otherwise choose the mode that best matches sample size and time stability needs, and state the choice.
- Before final splitting, mark abnormal months with too few total samples or too few bad samples. Report them and their reason; do not automatically filter them unless the user explicitly approves.
- If an institution/channel field exists, support institution/channel OOS in addition to time OOT. Clearly separate time OOT, institution/channel OOS, validation, and training in reports.
- Report train, validation, and OOT sample counts, bad counts, bad rates, AUC, KS, PSI, and score distribution.
- If validation is stratified random, compute it after removing OOT.
- Keep row-level scores with `row_id`, date, split, target, probability, logit, and score so every report table can be reproduced.

## Optional Cleaning Pipeline

Run a lightweight data-cleaning and variable-screening pipeline before modeling when raw data quality is uncertain, when the user asks for preprocessing, or when a scorecard/logistic model needs cleaner candidate variables. For gradient-boosted tree models, this pipeline can be skipped or softened because trees can tolerate missingness, nonlinearities, and correlated variables better; still run leakage, sample, and stability checks.

- Load and format data without modifying the original file.
- Mark abnormal months by total sample count and bad sample count, but do not drop them by default.
- Calculate missing/value rates overall; if an institution/channel field exists, also calculate them by institution/channel.
- Remove high-missing variables only when the threshold is agreed or clearly harmful.
- Calculate IV overall; if an institution/channel field exists, also calculate IV by institution/channel and flag variables that are weak in too many institutions/channels.
- Calculate PSI by month; if an institution/channel field exists, also calculate monthly PSI by institution/channel and flag concentrated instability.
- Optionally run Null Importance denoising to identify noise variables by comparing real LightGBM gain against label-permutation gain.
- Remove high-correlation variables using the existing “keep the best variable in the correlated group” principle.
- Record every round of variable removal with threshold, removed variable, and removal reason.

## Feature Engineering

- Start with original raw features plus required business variables such as enterprise age / company establishment duration when the user asks for them.
- Screen basic data quality:
  - Remove features where one value dominates 95%+ unless explicitly required by business.
  - Remove unusable, unstable, post-outcome, duplicate, or logically invalid variables.
  - Preserve forced baseline variables when reproducing an existing scorecard, even if they violate generic filters; disclose this lock.
- Compute both raw/univariate IV when useful and binned scorecard IV after training-set binning. Label them separately; do not call raw unbinned IV the scorecard IV.
- Rank important features with a weighted composite of LightGBM importance, IV, and binned IV. If the user does not specify weights, normalize ranks or percentile scores and use a balanced default such as LightGBM gain `0.4`, IV `0.3`, binned IV `0.3`; keep LightGBM split count as a secondary diagnostic.
- Use Null Importance as an optional denoising step for large candidate pools: train a real LightGBM importance model, train one or more label-permuted/null models, and flag variables whose real gain is not sufficiently above null gain.
- Keep original feature name, Chinese/business label, formula, parent features, missing rate, IV, binned IV, single-feature AUC/KS, LightGBM gain/split, screening status, and screening reason.

## Derived Variables

- When the user says to use defaults, treat derived variables as enabled. Generate a broad library of derived variables where data and deployment constraints allow:
  - Raw arithmetic: difference, ratio, reverse ratio, share, relative difference, mean, sum, min/max, absolute difference.
  - Window and trend features: short-window / long-window ratio, monthly average, monthly acceleration, recent-vs-history gap.
  - Transformations: log, clipping/winsorization, percentile rank, missing/special-value indicators.
  - WOE combinations: WOE sum, WOE difference, WOE product, WOE min/max, WOE absolute gap.
  - Tree combinations: 2-to-3-level decision-tree leaf features or compact rule buckets built from 2-3 strong variables.
  - Group interactions: same-family credit, query, utilization, overdue, balance, and enterprise-age combinations.
- Track deployability for every derived variable. Prefer simpler raw formulas when several candidates have similar validation/OOT performance, but do not exclude WOE combinations or tree combinations by default.
- Let derived variables participate in screening and model selection by default. Require a derived variable in the final model only when it improves validation/OOT performance, stability, or materially improves interpretability; otherwise report that derived variables were generated and rejected.
- Record derived formulas in a deployment-ready form using source features, not only generated display names.
- Add a derived-variable audit table or sheet to the final deliverable whenever derived variables are generated, including formula, parent variables, deployability, screening status, IV, and final-selection status.

## Default Parameters

Use these defaults unless the user provides alternatives.

- Scorecard:
  - Feature cap: 15 or fewer final variables.
  - Binning cap: 7 or fewer bins per feature, including missing/special bins where possible.
  - Score scale: `base_score = 600`, `odds = 0.05`, `pdo = 60`.
  - Feature screening: remove variables with 95%+ same value unless mandatory; remove binned IV below 0.05 unless mandatory; inspect WOE trend and business logic.
  - Correlation threshold: flag absolute correlation above 0.5.
  - Multicollinearity: use stepwise logistic regression, coefficient sign checks, and VIF.
- LightGBM baseline:
  - Objective: binary classification unless the user chose regression/ranking.
  - Typical starting parameters: `learning_rate` 0.03-0.08, `num_leaves` 15-63, `max_depth` 3-7 or unconstrained with small leaves, `min_data_in_leaf` 100-1000 depending on sample size, `feature_fraction` 0.7-0.9, `bagging_fraction` 0.7-0.9, `bagging_freq` 1, `lambda_l1` 0-5, `lambda_l2` 0-20, early stopping on validation.
- XGBoost baseline:
  - Typical starting parameters: `eta` 0.03-0.08, `max_depth` 3-6, `min_child_weight` 20-200, `subsample` 0.7-0.9, `colsample_bytree` 0.7-0.9, `gamma` 0-5, `reg_alpha` 0-5, `reg_lambda` 1-20, early stopping on validation.
- Linear/logistic regression:
  - Standardize or WOE-transform features as appropriate.
  - Tune regularization strength and penalty after checking coefficient stability and validation performance.

## Binning And WOE

- Fit WOE bins on training only. Apply the same bin edges and missing bin to validation and OOT.
- Use decision-tree, quantile, and manual/business binning as candidates, then inspect monotonicity, sample size, and bad-rate trend.
- Retain special values such as missing, no-record, denominator-zero, and no-account as distinct bins when business meaning differs.
- For scorecards, inspect per-bin count, bad count, bad rate, WOE, IV contribution, coefficient, and points.
- Reject bins with tiny counts or unstable bad rates unless they are business-mandated and documented.

## Model Selection

- For logistic regression scorecards:
  - Follow the scorecard development flow: model design, variable design/extraction, variable statistics, binning, correlation filtering, multicollinearity/stepwise logistic regression, final logistic regression, model validation, variable scoring, score distribution, and strategy suggestion.
  - In variable statistics, remove 95%+ same-value variables unless mandatory.
  - In binning, remove variables with binned IV below 0.05 unless mandatory; remove or revise variables whose WOE trend conflicts with business logic.
  - In correlation filtering, flag and remove one variable from pairs with absolute correlation above 0.5 unless locked by baseline/business.
  - In multicollinearity and stepwise logistic regression, select the best variable count, remove variables with inconsistent coefficient direction, and check VIF.
  - Use WOE-transformed variables and fit the logistic model on training only.
  - Validate KS/AUC stability, PSI, and variable/bin PSI on validation and OOT.
  - Convert coefficients and WOE values into scorecard points using the selected score scale.
  - Summarize score distribution and produce strategy suggestions by score band and bad rate.
- For LightGBM / XGBoost / CatBoost / random forest / other ML:
  - Follow tree-model practice rather than scorecard-only practice: data leakage checks, missing/special-value handling, categorical handling, train/validation/OOT split, baseline model, early stopping, feature importance/SHAP, calibration if probabilities feed policy, and cutoff/strategy analysis.
  - Use time-aware validation, class imbalance handling, monotonic constraints where business requires them, and calibrated probability checks when decisions depend on probability levels.
  - Compare against the scorecard on KS/AUC, lift, PSI, calibration, interpretability, stability, speed, and operational complexity.
  - Provide gain/split importance and SHAP or equivalent explanations, but do not confuse tree-model importance with scorecard coefficients.
- Select final model by validation lift/KS and OOT stability, not validation KS alone. If OOT degrades materially, prefer the simpler or more stable model.

## First-Pass Diagnosis And Optimization

After the first model version is trained, actively diagnose the model before finalizing.

- Overfitting signals:
  - Training KS/AUC materially higher than validation/OOT.
  - Validation good but OOT materially worse.
  - High PSI, unstable top features, or sharp lift decay out of sample.
  - For scorecards: too many variables, too many bins, non-monotonic bins, high correlation/VIF, unstable special-value bins.
  - For tree models: deep trees, large leaf count, small leaf samples, high feature/subsample fractions, weak regularization.
- Underfitting signals:
  - Train, validation, and OOT all weak.
  - Low feature IV/importance, simple model cannot separate risk, or score bands have flat bad rates.
  - Excessive regularization, too few features, too shallow trees, overly coarse bins, or missing key derived variables.
- Instability/leakage signals:
  - Model results are “too good to be true”: extremely high KS/AUC, near-perfect lift, or validation/OOT performance far above historical/business expectations.
  - Extremely high validation/OOT metric for a suspicious feature.
  - Feature availability after observation point.
  - OOT distribution shift or variable PSI concentration.

Optimize according to the diagnosis:

- If LightGBM/XGBoost overfits, increase `lambda_l1`/`lambda_l2` or `reg_alpha`/`reg_lambda`, reduce `max_depth`, reduce `num_leaves`, increase `min_data_in_leaf` / `min_child_weight`, reduce `feature_fraction` / `colsample_bytree`, reduce `bagging_fraction` / `subsample`, add `gamma` for XGBoost, lower learning rate with early stopping, simplify feature set, or remove unstable/leaky variables.
- If tree models underfit, add derived features, increase `num_leaves` or tree depth carefully, reduce excessive regularization, allow more boosting rounds with lower learning rate, improve categorical/special-value treatment, or add important feature groups.
- If scorecards overfit, reduce final variable count, reduce bins per feature, merge sparse bins, tighten correlation/VIF filtering, increase logistic regularization, remove unstable variables, or prefer simpler derived features.
- If scorecards underfit, broaden candidate variables, add derived variables, revisit binning granularity, include mandatory business variables, relax overly strict screening, or compare with LightGBM/XGBoost.
- If OOT instability dominates, prefer robust variables, use time-based validation, remove high-PSI variables, simplify model complexity, and report the stability tradeoff explicitly.
- If results are unusually good, stop and run a leakage audit before accepting the model: inspect feature generation time, post-approval/post-performance fields, label-derived variables, date leakage, duplicate keys, target-window overlap, future aggregation, data joins after outcome, and train/validation/OOT contamination.

## Scoring Rules

- Distinguish probability scoring from scorecard point scoring:
  - Probability/logit usually uses `intercept + sum(coef * woe)`.
  - Many scorecard templates use points as `A - B * sum(coef * woe)` and omit the LR intercept from displayed score points.
  - Always inspect the original scorecard formula before creating score bands or lift tables.
- Standard score constants often are:
  - `B = PDO / ln(2)`
  - `A = base_score + B * ln(base_bad_good_odds)`
  - `score_with_intercept = A - B * (intercept + sum(coef * woe))`
  - `scorecard_points = A - B * sum(coef * woe)`
- If preserving an original report, match its score formula exactly. A constant score shift does not change AUC/KS but can completely change fixed score-band lift.

## Validation Metrics

- Always compute at least:
  - AUC and KS for train, validation, and OOT.
  - Train-vs-validation and validation-vs-OOT gaps.
  - Score PSI and variable/bin PSI.
  - Lift by decile or by the report’s fixed score bands.
  - Score distribution and bad rate by band.
- For lift, state the denominator: `lift = band_bad_rate / overall_bad_rate` for that same sample.
- If the report asks for 10 bins, use 10 equal-count risk bins ordered by predicted bad probability or score from high risk to low risk.
- If the prior report uses fixed score bands, reproduce those bands exactly, including overflow bands such as `<200` and `>=520`.
- Include cumulative bad count, cumulative sample count, cumulative bad rate, cumulative lift, and KS where the template expects them.

## Report Deliverables

Create reproducible artifacts:

- `model_summary.json`: split, rules, selected model, metrics, score scale, recommended reason, features, plots.
- `model_comparison.csv`: baseline and candidate model metrics.
- `selected_features_*.csv`: final variables, formulas, IV, coefficients, screen metrics.
- `scorecard_bins_*.csv`: per-variable bins, WOE, IV, coefficient, points.
- `scores_*.csv`: row-level split, target, probability, logit, score.
- `feature_screening_audit.csv`: keep/remove decisions and reasons.
- `variable_removal_log.csv`: every removal round, threshold, removed variable, and reason.
- `lift` / performance tables for deciles or fixed bands.
- Final report workbook or document. Use the user-provided template when available; otherwise use the default credit-risk model development validation report structure.
- A model validation report sheet or workbook section. For scorecard models, the final model validation report must use the exact format of the scorecard model development validation report template when that template is available in the workspace. For tree models, include a lighter model validation report using the same style but only the sections that apply to tree-model development.

For final Excel deliverables, consolidate all report tables and Excel-like outputs into one workbook with clearly named sheets, such as summary, sample split, model comparison, validation metrics, selected features, bins, lift, PSI, row scores, feature screening, removal log, and strategy. Keep standalone CSV files only as reproducible intermediate artifacts or machine-readable exports unless the user explicitly asks for separate Excel files.

For unified Excel reports, make the first sheet a polished workbook landing page, not a dense model-detail dump. The first sheet should act as a directory and reading guide with:

- A concise title, model purpose, target definition, model family, selected cutoff, and key validation metrics.
- A table of contents listing every worksheet, what it contains, and what the reader should check there.
- A short reading order or executive note for business/model-validation reviewers.
- Professional visual hierarchy: title band, summary cards or compact KPI rows, section headers, restrained fills, readable column widths, wrapping, borders, and no visually awkward blank bands.

Move detailed validation content from the first sheet into the corresponding downstream sheets. If a detail shown on the landing page has no natural downstream sheet, create or update a named sheet for it before finalizing. Common required downstream sheets include sample data introduction, feature data set, derived-variable audit, feature screening, selected scorecard variables, correlation screening, binning, scorecard points, model score/validation, lift, score distribution, PSI/CV, row-level scores, variable removal log, stress testing, and submission/output tables.

When writing an Excel report from a provided template, preserve existing sheet order, drawings, images, and labels where possible. When no template is provided, create a default report covering sample definition, feature screening, binning, model comparison, validation, score distribution, lift, PSI, and strategy suggestions. Include a data-cleaning and variable-screening appendix when the optional cleaning pipeline is run: summary, abnormal-month marks, missing/value-rate details, IV details, PSI details, Null Importance results, high-correlation removals, and the variable removal log. Verify by reopening the workbook/document and checking key sections, row counts, formulas/headers, and images.

Scorecard validation report template lock:

- Treat the scorecard model development validation report template as the required scorecard report template, not merely an example.
- Use the template workbook as the starting file whenever possible. Preserve sheet names, sheet order, section order, titles, merged cells, row/column layout, column widths, fonts, borders, fills, formulas, drawings/images, fixed score bands, table headers, and terminology.
- Fill the existing sections and tables with the new model results. Do not reorder, rename, or redesign the scorecard validation report unless the user explicitly approves a format change.
- If additional audit tables are useful but do not exist in the template, put them in clearly named appendix sheets or machine-readable artifacts without changing the required template structure.
- If the template is not available in the workspace, ask the user to provide it or confirm that a non-template draft is acceptable before producing the final scorecard model validation report.

Default scorecard validation report sections, following the exact scorecard model development validation report template structure when the template is available:

- Development flow / model development process.
- Sample data introduction: product/sample source, observation point, performance window, Y definition, exclusions, split, train/validation/OOT sample counts and bad rates.
- Feature data set: data source, feature name, business label, feature type, formula/remarks.
- Feature screening: LightGBM or other first-pass importance, IV, binned IV, composite rank, keep/remove reason.
- Correlation screening and multicollinearity checks.
- Decision-tree binning candidates and manual binning final choices.
- Scorecard: base score, odds, PDO, A/B constants, variable bins, WOE, coefficient, points, formula/deployment rule.
- Model score and validation: train/validation/OOT AUC, KS, PSI, gaps, calibration where relevant, variable/bin PSI.
- Full-sample and OOT score distribution/lift tables, including cumulative good/bad counts, cumulative rate, cumulative lift, and KS where applicable.
- Stress testing when feasible: define stress scenarios, feature perturbation logic, score/KS/approval-rate impact, and conclusion.

Default tree-model validation report sections:

- Development flow / model development process.
- Sample data introduction: Y definition, observation point, split, exclusions, train/validation/OOT sample counts and bad rates.
- Feature data set and preprocessing: raw features, categorical handling, missing/special-value handling, derived features, target encoding or leakage controls.
- Feature screening and model selection: baseline, tuned tree models, ensemble comparison, validation/OOT AUC, KS, lift, calibration, and selected reason.
- Tree-model explanation: gain/split importance and SHAP or equivalent explanation when available; do not include scorecard WOE coefficient/points sections unless a scorecard challenger is also built.
- Model score and validation: probability distribution, score/decile lift, PSI, validation-vs-OOT stability, overfit/leakage audit.
- OOT / OOS sample performance and key subgroup performance when time/channel/institution fields exist.
- Stress testing or sensitivity checks when feasible: perturb important raw features or score distributions, and report metric/approval-rate impact.

## Strategy And Policy Output

- After modeling completes, ask the user whether to produce strategy output. If the user says yes, build strategy suggestions from both model score bands and interpretable feature/rule candidates.
- Translate score bands into action only after model validation:
  - high-risk decline/review bands,
  - manual review gray zone,
  - low-risk pass bands,
  - suggested cutoffs with approval rate, bad capture, and lift.
- Show tradeoffs as approval rate vs bad rate / KS / lift. Avoid recommending a cutoff without sample counts.
- During feature derivation and rule mining, record simple strategy rules where recall/capture rate is greater than 1% and lift is greater than 3. Examples can come from raw-feature thresholds, binned WOE rules, decision-tree leaves, WOE/tree combinations, or derived-variable bands.
- For each candidate strategy rule, report rule expression, sample count, sample share/recall, bad count, bad rate, lift, affected split, and whether it is stable on validation/OOT. Clearly label these as strategy candidates, not automatic production rules.
- Keep policy suggestions separate from model metrics so business stakeholders can adjust thresholds.

## Quality Gates

Before finalizing, check:

- OOT is the requested time window and was not used for tuning.
- Validation rate and stratification match the user’s instruction.
- Feature ranking combines LightGBM importance, IV, and binned IV unless the user requests a different ranking rule.
- If an institution/channel field exists, institution/channel sample counts, bad rates, missing rates, IV, and PSI are checked or explicitly skipped.
- Abnormal months are marked and reported; they are not silently removed.
- Null Importance denoising is considered for large noisy feature pools, especially before tree-model feature ranking or broad scorecard screening.
- If model performance is unusually high, leakage checks are completed and documented before final recommendation.
- Original scorecard baseline is locked when requested.
- Added features improve validation KS versus the baseline/current model.
- Derived variables include a broad search space and have clear formulas/rules; note any WOE or tree-derived features that require extra deployment handling.
- High-lift feature-derived strategy candidates with recall >1% and lift >3 are listed when strategy output is requested.
- Score formula matches the template, especially intercept handling.
- Sample performance uses the requested 10-bin or fixed-band mode.
- For unified Excel reports, the first sheet is a polished landing page with workbook directory, key summary, and reading guide; it is not a long-form validation-detail sheet.
- Every detailed item referenced on the landing page has a corresponding downstream worksheet or section. Add missing sheets such as selected variables, derived-variable audit, model validation metrics, PSI/CV, or submission output instead of leaving details only on the landing page.
- Render the first sheet visually before final delivery. Fix obvious layout issues such as cramped text, clipped headers, awkward blank color bands, unreadable fills, or table headers extending beyond the intended directory area.
- Workbook/report opens cleanly and key tables contain the expected rows.

## Communication Style

- State the split, baseline, final model, lift in KS/AUC, OOT result, and selected features plainly.
- Call out any rule exceptions, such as locked variables exceeding correlation thresholds.
- When a metric drops on OOT, say so directly and explain the tradeoff.
- Keep the final answer concise, with links to the report and the most important numbers.
